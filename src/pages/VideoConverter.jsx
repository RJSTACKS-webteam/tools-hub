
import { useEffect, useRef, useState } from "react";
import "./VideoConverter.css";
import { getFFmpeg, fetchFile } from "../utils/ffmpeg";

const formats = [
  { value: "mp4", label: "MP4", description: "Widely supported" },
  { value: "webm", label: "WebM", description: "Web optimized" },
  { value: "mov", label: "MOV", description: "Apple devices" },
  { value: "avi", label: "AVI", description: "Classic video format" },
  { value: "mkv", label: "MKV", description: "Flexible container" },
];

const qualityOptions = [
  { value: "high", label: "High Quality" },
  { value: "medium", label: "Medium Quality" },
  { value: "low", label: "Low Quality" },
];

const qualitySettings = {
  high: {
    crf: "20",
    preset: "ultrafast",
  },
  medium: {
    crf: "26",
    preset: "ultrafast",
  },
  low: {
    crf: "32",
    preset: "ultrafast",
  },
};

const webmQuality = {
  high: "24",
  medium: "32",
  low: "40",
};

const aviQuality = {
  high: "2",
  medium: "5",
  low: "8",
};

const outputMimeTypes = {
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  avi: "video/x-msvideo",
  mkv: "video/x-matroska",
};

function formatSize(bytes) {
  if (!bytes) return "0 MB";

  const mb = bytes / (1024 * 1024);

  return mb >= 1024
    ? `${(mb / 1024).toFixed(2)} GB`
    : `${mb.toFixed(2)} MB`;
}

function VideoConverter({ onBack }) {
  const fileInputRef = useRef(null);
  const inputUrlRef = useRef(null);
  const outputUrlRef = useRef(null);
  const processingRef = useRef(false);

  const [file, setFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState("");

  const [format, setFormat] = useState("mp4");
  const [quality, setQuality] = useState("medium");

  const [converting, setConverting] = useState(false);
  const [progress, setProgress] = useState(0);

  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Clean up object URLs
  useEffect(() => {
    return () => {
      if (inputUrlRef.current) {
        URL.revokeObjectURL(inputUrlRef.current);
      }

      if (outputUrlRef.current) {
        URL.revokeObjectURL(outputUrlRef.current);
      }
    };
  }, []);

  // Select video
  const handleFile = (selectedFile) => {
    if (!selectedFile) return;

    setError("");
    setMessage("");
    setResult(null);
    setProgress(0);

    if (!selectedFile.type.startsWith("video/")) {
      setError("Please select a valid video file.");
      return;
    }

    if (selectedFile.size > 500 * 1024 * 1024) {
      setError("Video size must be below 500 MB.");
      return;
    }

    if (inputUrlRef.current) {
      URL.revokeObjectURL(inputUrlRef.current);
    }

    if (outputUrlRef.current) {
      URL.revokeObjectURL(outputUrlRef.current);
      outputUrlRef.current = null;
    }

    const url = URL.createObjectURL(selectedFile);
    inputUrlRef.current = url;

    setFile(selectedFile);
    setVideoUrl(url);
    setResult(null);
  };

  // Remove video
  const removeVideo = () => {
    if (converting) return;

    if (inputUrlRef.current) {
      URL.revokeObjectURL(inputUrlRef.current);
      inputUrlRef.current = null;
    }

    if (outputUrlRef.current) {
      URL.revokeObjectURL(outputUrlRef.current);
      outputUrlRef.current = null;
    }

    setFile(null);
    setVideoUrl("");
    setResult(null);
    setError("");
    setMessage("");
    setProgress(0);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Build FFmpeg arguments for the selected output format
  const buildConversionArgs = (inputName, outputName) => {
    const args = [
      "-i",
      inputName,

      "-map",
      "0:v:0",

      "-map",
      "0:a?",

      "-sn",
      "-dn",
    ];

    // MP4, MOV and MKV
    if (["mp4", "mov", "mkv"].includes(format)) {
      const settings = qualitySettings[quality];

      args.push(
        "-c:v",
        "libx264",

        "-preset",
        settings.preset,

        "-crf",
        settings.crf,

        "-pix_fmt",
        "yuv420p",

        "-threads",
        "1",

        "-c:a",
        "aac",

        "-b:a",
        "128k"
      );

      if (format === "mp4") {
        args.push("-movflags", "+faststart");
      }
    }

    // WebM
    else if (format === "webm") {
      args.push(
        "-c:v",
        "libvpx",

        "-crf",
        webmQuality[quality],

        "-b:v",
        "0",

        "-deadline",
        "realtime",

        "-cpu-used",
        "8",

        "-threads",
        "1",

        "-c:a",
        "libvorbis",

        "-q:a",
        "4"
      );
    }

    // AVI
    else if (format === "avi") {
      args.push(
        "-c:v",
        "mpeg4",

        "-q:v",
        aviQuality[quality],

        "-threads",
        "1",

        "-c:a",
        "libmp3lame",

        "-b:a",
        "128k"
      );
    }

    args.push(outputName);

    return args;
  };

  // Convert video using browser FFmpeg
  const startConversion = async () => {
    if (!file || processingRef.current) return;

    processingRef.current = true;

    let ffmpeg = null;
    let inputName = "";
    const outputName = `converted-output-${Date.now()}.${format}`;

    setError("");
    setMessage("Loading browser video engine...");
    setResult(null);
    setProgress(3);
    setConverting(true);

    if (outputUrlRef.current) {
      URL.revokeObjectURL(outputUrlRef.current);
      outputUrlRef.current = null;
    }

    try {
      // Load FFmpeg in the browser
      ffmpeg = await getFFmpeg((percentage) => {
        const actualProgress = Math.max(
          8,
          Math.min(95, Math.round(percentage * 0.85 + 10))
        );

        setProgress(actualProgress);
        setMessage("Converting video locally...");
      });

      setProgress(8);
      setMessage("Preparing video...");

      // Preserve the input extension
      const extension =
        file.name.match(/\.([a-z0-9]{1,8})$/i)?.[1] || "mp4";

      inputName = `input-video-${Date.now()}.${extension}`;

      // Write selected video to FFmpeg virtual filesystem
      const inputData = await fetchFile(file);

      await ffmpeg.writeFile(inputName, inputData);

      setProgress(10);
      setMessage(`Converting video to ${format.toUpperCase()}...`);

      // Execute conversion
      const args = buildConversionArgs(inputName, outputName);

      const exitCode = await ffmpeg.exec(args);

      if (exitCode !== 0) {
        throw new Error(
          "Conversion failed. The selected format or codec may not be supported by this browser FFmpeg build. Try MP4."
        );
      }

      setProgress(95);
      setMessage("Preparing converted video...");

      // Read converted output
      const outputData = await ffmpeg.readFile(outputName);

      if (!outputData || outputData.length === 0) {
        throw new Error("The converted video is empty.");
      }

      const blob = new Blob([outputData], {
        type: outputMimeTypes[format],
      });

      const downloadUrl = URL.createObjectURL(blob);
      outputUrlRef.current = downloadUrl;

      const convertedFile = {
        url: downloadUrl,
        name: `converted-video.${format}`,
        size: blob.size,
      };

      setResult(convertedFile);
      setProgress(100);
      setMessage("Video conversion completed successfully.");

    } catch (err) {
      console.error("Browser video conversion error:", err);

      setError(
        err.message || "Unable to convert this video."
      );

      setMessage("");
      setProgress(0);

    } finally {
      // Clean up FFmpeg temporary files
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
      setConverting(false);
    }
  };

  // Download converted video
  const downloadVideo = () => {
    if (!result) return;

    const link = document.createElement("a");
    link.href = result.url;
    link.download = result.name;

    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="video-converter-page">
      <div className="video-converter-container">

        <button
          className="converter-back-button"
          onClick={onBack}
          disabled={converting}
        >
          ← Back to Tools
        </button>

        <div className="converter-heading">
          <div className="converter-heading-icon">🎬</div>

          <div>
            <h1>Video Converter</h1>
            <p>
              Convert videos into different formats quickly and easily.
            </p>
          </div>
        </div>

        {!file ? (
          <div className="converter-upload-box">
            <div className="converter-upload-icon">📁</div>

            <h2>Upload your video</h2>

            <p>Select a video file to start converting.</p>

            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              hidden
              onChange={(event) =>
                handleFile(event.target.files?.[0])
              }
            />

            <button
              className="converter-select-button"
              onClick={() => fileInputRef.current?.click()}
            >
              Select Video
            </button>

            <small>Maximum file size: 500 MB</small>
          </div>
        ) : (
          <div className="converter-workspace">

            <div className="converter-preview-card">
              <div className="converter-preview-video">
                <video
                  src={videoUrl}
                  controls
                />
              </div>

              <div className="converter-file-details">
                <div>
                  <strong>{file.name}</strong>
                  <p>{formatSize(file.size)}</p>
                </div>

                <button
                  className="converter-remove-button"
                  onClick={removeVideo}
                  disabled={converting}
                >
                  Remove
                </button>
              </div>
            </div>

            <div className="converter-settings">
              <h2>Conversion Settings</h2>

              <label>Output Format</label>

              <div className="converter-format-grid">
                {formats.map((item) => (
                  <button
                    key={item.value}
                    className={`converter-format-option ${
                      format === item.value ? "active" : ""
                    }`}
                    onClick={() => {
                      setFormat(item.value);
                      setResult(null);
                    }}
                    disabled={converting}
                  >
                    <strong>{item.label}</strong>
                    <span>{item.description}</span>
                  </button>
                ))}
              </div>

              <label htmlFor="converter-quality">
                Output Quality
              </label>

              <select
                id="converter-quality"
                value={quality}
                onChange={(event) => setQuality(event.target.value)}
                disabled={converting}
              >
                {qualityOptions.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ))}
              </select>

              <button
                className="converter-start-button"
                onClick={startConversion}
                disabled={converting}
              >
                {converting ? "Converting..." : "Start Conversion"}
              </button>
            </div>
          </div>
        )}

        {(converting || result) && (
          <div className="converter-progress-card">
            <div className="converter-progress-heading">
              <strong>
                {result ? "Conversion Complete" : "Processing Video"}
              </strong>

              <span>{progress}%</span>
            </div>

            <div className="converter-progress-track">
              <div
                className="converter-progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>

            {message && (
              <p className="converter-message">{message}</p>
            )}
          </div>
        )}

        {error && (
          <div className="converter-message converter-error">
            {error}
          </div>
        )}

        {result && (
          <div className="converter-result">
            <h2>Your video is ready!</h2>

            <div className="converter-result-grid">
              <div>
                <span>Original Size</span>
                <strong>{formatSize(file.size)}</strong>
              </div>

              <div>
                <span>Converted Size</span>
                <strong>{formatSize(result.size)}</strong>
              </div>

              <div>
                <span>Output Format</span>
                <strong>{format.toUpperCase()}</strong>
              </div>
            </div>

            <button
              className="converter-start-button"
              onClick={downloadVideo}
            >
              Download Converted Video
            </button>
          </div>
        )}

        <div className="converter-privacy-note">
          <strong>🔒 Privacy</strong>

          <p>
            Your video is processed locally in your browser.
            It is not uploaded to our video server.
          </p>
        </div>

        <p className="converter-disclaimer">
          Conversion time depends on video size, format, quality
          and device performance.
        </p>

      </div>
    </div>
  );
}

export default VideoConverter;
