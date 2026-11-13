
import { useEffect, useRef, useState } from "react";
import "./VideoConverter.css";
import { API_URL } from "../utils/api";

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
  const xhrRef = useRef(null);

  const [file, setFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState("");

  const [format, setFormat] = useState("mp4");
  const [quality, setQuality] = useState("medium");

  const [converting, setConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Clean up object URLs and active requests
  useEffect(() => {
    return () => {
      if (inputUrlRef.current) {
        URL.revokeObjectURL(inputUrlRef.current);
      }

      if (outputUrlRef.current) {
        URL.revokeObjectURL(outputUrlRef.current);
      }

      if (xhrRef.current) {
        xhrRef.current.abort();
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
    setUploadProgress(0);

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
    setUploadProgress(0);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Convert video using Node.js backend
  const startConversion = () => {
    if (!file || converting) return;

    setError("");
    setMessage("Uploading video...");
    setResult(null);
    setProgress(0);
    setUploadProgress(0);

    if (outputUrlRef.current) {
      URL.revokeObjectURL(outputUrlRef.current);
      outputUrlRef.current = null;
    }

    setConverting(true);

    const formData = new FormData();

    formData.append("video", file);
    formData.append("format", format);
    formData.append("quality", quality);

    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;

    xhr.open("POST", API_URL("/api/video/convert"));

    // Upload progress
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentage = Math.round(
          (event.loaded / event.total) * 100
        );

        setUploadProgress(percentage);

        if (percentage >= 100) {
          setMessage("Video uploaded. Conversion in progress...");
          setProgress(90);
        } else {
          setProgress(Math.round(percentage * 0.9));
        }
      }
    };

    xhr.onload = async () => {
      xhrRef.current = null;

      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const blob = xhr.response;

          if (!blob || blob.size === 0) {
            throw new Error("The server returned an empty video.");
          }

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
          setError(err.message || "Unable to process converted video.");
          setMessage("");
        }
      } else {
        let errorMessage = "Video conversion failed.";

        try {
          const response = JSON.parse(xhr.responseText);

          if (response.message) {
            errorMessage = response.message;
          }
        } catch {
          // Keep default error message
        }

        setError(errorMessage);
        setMessage("");
      }

      setConverting(false);
    };

    xhr.onerror = () => {
      xhrRef.current = null;
      setError("Network error. Please check your server connection.");
      setMessage("");
      setConverting(false);
    };

    xhr.onabort = () => {
      xhrRef.current = null;
      setError("Conversion request was cancelled.");
      setMessage("");
      setConverting(false);
    };

    xhr.responseType = "blob";
    xhr.send(formData);
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

            {converting && uploadProgress < 100 && (
              <p className="converter-message">
                Upload progress: {uploadProgress}%
              </p>
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
            Your video is temporarily uploaded to our server
            for conversion and deleted after processing.
          </p>
        </div>

        <p className="converter-disclaimer">
          Conversion time depends on video size, format and quality.
        </p>

      </div>
    </div>
  );
}

export default VideoConverter;
