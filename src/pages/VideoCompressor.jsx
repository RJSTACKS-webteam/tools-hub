
import { useEffect, useRef, useState } from "react";
import "./VideoCompressor.css";
import { getFFmpeg, fetchFile } from "../utils/ffmpeg";

const compressionSettings = {
  low: {
    label: "Low",
    description: "Better quality",
    crf: "28",
  },
  medium: {
    label: "Medium",
    description: "Balanced",
    crf: "23",
  },
  high: {
    label: "High",
    description: "Smaller file",
    crf: "20",
  },
};

const resolutionOptions = {
  "1080": "1080p",
  "720": "720p",
  "480": "480p",
};

function VideoCompressor({ onBack }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [videoInfo, setVideoInfo] = useState(null);

  const [quality, setQuality] = useState("medium");
  const [resolution, setResolution] = useState("720");

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");

  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const previewRef = useRef("");
  const processingRef = useRef(false);

  useEffect(() => {
    return () => {
      if (previewRef.current) {
        URL.revokeObjectURL(previewRef.current);
      }
    };
  }, []);

  const formatSize = (bytes) => {
    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    if (bytes < 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }

    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const handleFile = (event) => {
    const selected = event.target.files?.[0];
    event.target.value = "";

    if (!selected) return;

    if (!selected.type.startsWith("video/")) {
      setError("Please select a valid video file.");
      return;
    }

    if (selected.size > 500 * 1024 * 1024) {
      setError("Video size must be less than 500 MB.");
      return;
    }

    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
    }

    const url = URL.createObjectURL(selected);

    previewRef.current = url;

    setFile(selected);
    setPreview(url);
    setVideoInfo(null);

    setError("");
    setResult(null);
    setStatus("");
    setProgress(0);
  };

  const handleVideoMetadata = (event) => {
    const video = event.currentTarget;

    setVideoInfo({
      width: video.videoWidth,
      height: video.videoHeight,
      duration: video.duration,
    });
  };

  const compressVideo = async () => {
    if (!file) {
      setError("Please select a video first.");
      return;
    }

    if (processingRef.current) return;

    processingRef.current = true;

    let ffmpeg = null;
    let inputName = "";
    const outputName = `compressed-output-${Date.now()}.mp4`;

    try {
      setLoading(true);
      setError("");
      setResult(null);
      setProgress(5);

      setStatus("Loading browser video engine...");

      // Load FFmpeg in the user's browser.
      ffmpeg = await getFFmpeg((percentage) => {
        const actualProgress = Math.max(
          10,
          Math.min(95, Math.round(percentage * 0.85 + 10))
        );

        setProgress(actualProgress);
        setStatus("Compressing video in your browser...");
      });

      setProgress(10);
      setStatus("Preparing video...");

      // Preserve the input file extension.
      const extension = file.name.match(/\.([a-z0-9]+)$/i)?.[1] || "mp4";

      inputName = `input-video-${Date.now()}.${extension}`;

      // Transfer the selected file into FFmpeg's virtual filesystem.
      const inputData = await fetchFile(file);

      await ffmpeg.writeFile(inputName, inputData);

      const settings = compressionSettings[quality];

      if (!settings) {
        throw new Error("Invalid compression quality selected.");
      }

      // Encode video locally using FFmpeg WebAssembly.
      const args = [
        "-i",
        inputName,

        "-map",
        "0:v:0",

        "-map",
        "0:a?",

        "-sn",
        "-dn",

        "-vf",
        `scale=w='min(${resolution},iw)':h='min(${resolution},ih)':force_original_aspect_ratio=decrease:force_divisible_by=2`,

        "-c:v",
        "libx264",

        "-preset",
        "veryfast",

        "-crf",
        settings.crf,

        "-threads",
        "1",

        "-c:a",
        "aac",

        "-b:a",
        "128k",

        "-movflags",
        "+faststart",

        "-pix_fmt",
        "yuv420p",

        outputName,
      ];

      setStatus("Compressing video locally...");
      setProgress(10);

      const exitCode = await ffmpeg.exec(args);

      if (exitCode !== 0) {
        throw new Error(
          `Video compression failed. FFmpeg exited with code ${exitCode}.`
        );
      }

      setProgress(95);
      setStatus("Preparing compressed video download...");

      // Read the completed video from FFmpeg's virtual filesystem.
      const outputData = await ffmpeg.readFile(outputName);

      if (!outputData || outputData.length === 0) {
        throw new Error("The compressed video is empty.");
      }

      const outputBlob = new Blob([outputData], {
        type: "video/mp4",
      });

      const downloadURL = URL.createObjectURL(outputBlob);

      const originalName = file.name.replace(/\.[^/.]+$/, "");

      const link = document.createElement("a");

      link.href = downloadURL;
      link.download = `${originalName}_compressed.mp4`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => {
        URL.revokeObjectURL(downloadURL);
      }, 30000);

      const reduction =
        ((file.size - outputBlob.size) / file.size) * 100;

      setResult({
        originalSize: file.size,
        compressedSize: outputBlob.size,
        reduction,
      });

      setProgress(100);
      setStatus("Compression completed successfully!");

    } catch (err) {
      console.error("Browser video compression error:", err);

      setError(
        err.message || "Unable to compress this video."
      );

      setStatus("");
      setProgress(0);

    } finally {
      // Remove temporary files from FFmpeg's virtual filesystem.
      if (ffmpeg) {
        if (inputName) {
          try {
            await ffmpeg.deleteFile(inputName);
          } catch {
            // Temporary input may already be deleted.
          }
        }

        try {
          await ffmpeg.deleteFile(outputName);
        } catch {
          // Temporary output may not exist.
        }
      }

      processingRef.current = false;
      setLoading(false);
    }
  };

  const removeVideo = () => {
    if (loading) return;

    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
      previewRef.current = "";
    }

    setFile(null);
    setPreview("");
    setVideoInfo(null);

    setResult(null);
    setError("");
    setStatus("");
    setProgress(0);
  };

  return (
    <div className="video-compressor-page">
      <div className="video-compressor-container">

        <button
          className="video-back-button"
          onClick={onBack}
          disabled={loading}
        >
          ← Back to Video Tools
        </button>

        <div className="video-heading">
          <div className="video-heading-icon">🎬</div>

          <h1>Video Compressor</h1>

          <p>
            Reduce video file size while maintaining good quality.
          </p>
        </div>

        {!file ? (
          <div className="video-upload-box">

            <div className="video-upload-icon">📁</div>

            <h2>Upload Your Video</h2>

            <p>Select a video file from your device.</p>

            <label className="video-select-button">
              Choose Video

              <input
                type="file"
                accept="video/*"
                onChange={handleFile}
                hidden
              />
            </label>

            <small>
              MP4, MOV, WebM and other supported formats
            </small>

            <small>Maximum file size: 500 MB</small>

          </div>
        ) : (
          <div className="video-workspace">

            <div className="video-preview-card">

              <video
                src={preview}
                controls
                onLoadedMetadata={handleVideoMetadata}
              />

              <div className="video-file-details">

                <div>
                  <strong>{file.name}</strong>
                  <span>{formatSize(file.size)}</span>
                </div>

                <button
                  className="video-remove-button"
                  onClick={removeVideo}
                  disabled={loading}
                >
                  Remove
                </button>

              </div>

              {videoInfo && (
                <div className="video-info-row">

                  <span>
                    Resolution: {videoInfo.width} × {videoInfo.height}
                  </span>

                  <span>
                    Duration:{" "}
                    {Math.floor(videoInfo.duration / 60)}:
                    {String(
                      Math.floor(videoInfo.duration % 60)
                    ).padStart(2, "0")}
                  </span>

                </div>
              )}

            </div>

            <div className="video-settings">

              <h2>Compression Settings</h2>

              <label>Compression Level</label>

              <div className="video-quality-options">

                {Object.entries(compressionSettings).map(
                  ([key, option]) => (
                    <button
                      key={key}
                      className={`video-quality-option ${
                        quality === key ? "active" : ""
                      }`}
                      onClick={() => setQuality(key)}
                      disabled={loading}
                    >
                      <strong>{option.label}</strong>
                      <span>{option.description}</span>
                    </button>
                  )
                )}

              </div>

              <label htmlFor="video-resolution">
                Output Resolution
              </label>

              <select
                id="video-resolution"
                value={resolution}
                onChange={(event) =>
                  setResolution(event.target.value)
                }
                disabled={loading}
              >
                {Object.entries(resolutionOptions).map(
                  ([value, label]) => (
                    <option value={value} key={value}>
                      {label}
                    </option>
                  )
                )}
              </select>

              <button
                className="video-compress-button"
                onClick={compressVideo}
                disabled={loading}
              >
                {loading ? "Processing Video..." : "Compress Video"}
              </button>

            </div>

          </div>
        )}

        {(loading || status) && (
          <div className="video-progress-card">

            <div className="video-progress-heading">
              <span>{status}</span>

              {loading && <span>{progress}%</span>}
            </div>

            <div className="video-progress-track">
              <div
                className="video-progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>

            {loading && (
              <small>
                Video is being processed locally on your device.
                Please keep this page open.
              </small>
            )}

          </div>
        )}

        {error && (
          <div className="video-message video-error">
            {error}
          </div>
        )}

        {result && (
          <div className="video-result">

            <h2>Compression Complete</h2>

            <div className="video-result-grid">

              <div>
                <span>Original Size</span>
                <strong>{formatSize(result.originalSize)}</strong>
              </div>

              <div>
                <span>Compressed Size</span>
                <strong>{formatSize(result.compressedSize)}</strong>
              </div>

              <div>
                <span>Size Change</span>
                <strong>
                  {result.reduction >= 0
                    ? `${result.reduction.toFixed(1)}% smaller`
                    : `${Math.abs(result.reduction).toFixed(1)}% larger`}
                </strong>
              </div>

            </div>

            {result.reduction <= 0 && (
              <p>
                The output is not smaller than the original.
                Try a higher compression level or lower resolution.
              </p>
            )}

          </div>
        )}

        <div className="video-privacy-note">
          🔒 Your video is processed locally in your browser.
          It is not uploaded to our video server.
        </div>

        <p className="video-disclaimer">
          Note: Compression time depends on video size, duration,
          device performance and browser compatibility.
          Output format is MP4 with H.264 video and AAC audio.
        </p>

      </div>
    </div>
  );
}

export default VideoCompressor;
