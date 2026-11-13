
import { useEffect, useRef, useState } from "react";
import "./VideoCompressor.css";
import { API_URL } from "../utils/api";

const compressionSettings = {
  low: {
    label: "Low",
    description: "Better quality",
  },
  medium: {
    label: "Medium",
    description: "Balanced",
  },
  high: {
    label: "High",
    description: "Smaller file",
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
    if (bytes < 1024) return `${bytes} B`;

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

    try {
      setLoading(true);
      setError("");
      setResult(null);
      setProgress(10);

      setStatus("Uploading video to server...");

      const formData = new FormData();

      formData.append("video", file);
      formData.append("level", quality);
      formData.append("resolution", resolution);

      setProgress(25);
      setStatus("Uploading and preparing video...");

      const response = await fetch(API_URL("/api/video/compress"), {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        let message = "Video compression failed.";

        try {
          const data = await response.json();
          message = data.message || message;
        } catch {
          // Keep the default error message.
        }

        throw new Error(message);
      }

      setProgress(90);
      setStatus("Preparing compressed video download...");

      const outputBlob = await response.blob();

      if (!outputBlob.size) {
        throw new Error("The compressed video is empty.");
      }

      const downloadURL = URL.createObjectURL(outputBlob);

      const link = document.createElement("a");

      const originalName = file.name.replace(/\.[^/.]+$/, "");

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
      console.error("Video compression error:", err);

      setError(
        err.message || "Unable to compress this video."
      );

      setStatus("");
      setProgress(0);

    } finally {
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
                Please keep this page open while processing.
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
          🔒 Your video is temporarily uploaded to our server
          for compression. Temporary files are deleted after processing.
        </div>

        <p className="video-disclaimer">
          Note: Compression time depends on video size, duration
          and server performance. Output format is MP4 with
          H.264 video and AAC audio.
        </p>

      </div>
    </div>
  );
}

export default VideoCompressor;
