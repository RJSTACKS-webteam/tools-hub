import { useEffect, useRef, useState } from "react";
import "./AudioConverter.css";

// Reusable audio player with animated waveform

function AudioPlayer({ src, title }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const formatTime = (seconds) => {
    if (!Number.isFinite(seconds)) return "0:00";

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
  };

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      try {
        await audio.play();
      } catch {
        setIsPlaying(false);
      }
    } else {
      audio.pause();
    }
  };

  const handleSeek = (value) => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = Number(value);
    setCurrentTime(Number(value));
  };

  return (
    <div className="audio-player">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onDurationChange={(e) => setDuration(e.currentTarget.duration)}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
      />

      <div className="audio-player-top">
        <div className="audio-player-icon">♫</div>

        <div className="audio-player-info">
          <strong>{title}</strong>
          <span>{isPlaying ? "Now playing" : "Ready to play"}</span>
        </div>

        <div className={`audio-waveform ${isPlaying ? "playing" : ""}`}>
          {Array.from({ length: 20 }, (_, index) => (
            <span key={index} style={{ "--bar-index": index }} />
          ))}
        </div>
      </div>

      <div className="audio-controls">
        <button
          type="button"
          className="audio-play-button"
          onClick={togglePlay}
          aria-label={isPlaying ? "Pause audio" : "Play audio"}
        >
          {isPlaying ? "❚❚" : "▶"}
        </button>

        <div className="audio-timeline">
          <input
            type="range"
            min="0"
            max={duration || 0.1}
            step="0.1"
            value={Math.min(currentTime, duration || 0)}
            onChange={(e) => handleSeek(e.target.value)}
            disabled={!duration}
            style={{
              "--audio-progress": `${
                duration ? (currentTime / duration) * 100 : 0
              }%`,
            }}
            aria-label="Seek audio"
          />

          <div className="audio-time-display">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const MAX_FILE_SIZE = 500 * 1024 * 1024;

const formats = [
  { value: "mp3", label: "MP3", description: "Compressed audio" },
  { value: "wav", label: "WAV", description: "Uncompressed audio" },
  { value: "ogg", label: "OGG", description: "Open audio format" },
  { value: "m4a", label: "AAC", description: "AAC audio (.m4a)" },
  { value: "flac", label: "FLAC", description: "Lossless audio" },
];

export default function AudioConverter({ onBack }) {
  const [file, setFile] = useState(null);
  const [originalUrl, setOriginalUrl] = useState("");
  const [format, setFormat] = useState("mp3");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [outputUrl, setOutputUrl] = useState("");
  const [outputName, setOutputName] = useState("");

  // Create and clean up the original audio preview URL.
  useEffect(() => {
    if (!file) {
      setOriginalUrl("");
      return;
    }

    const url = URL.createObjectURL(file);
    setOriginalUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Clean up the converted audio preview URL.
  useEffect(() => {
    return () => {
      if (outputUrl) {
        URL.revokeObjectURL(outputUrl);
      }
    };
  }, [outputUrl]);

  const handleFileChange = (selectedFile) => {
    setError("");
    setStatus("");
    setProgress(0);

    if (outputUrl) {
      URL.revokeObjectURL(outputUrl);
      setOutputUrl("");
    }

    setOutputName("");

    if (!selectedFile) {
      setFile(null);
      return;
    }

    if (!selectedFile.type.startsWith("audio/")) {
      setError("Please select a valid audio file.");
      setFile(null);
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setError("File size must not exceed 500 MB.");
      setFile(null);
      return;
    }

    setFile(selectedFile);
  };

  const convertAudio = () => {
    if (!file) {
      setError("Please select an audio file first.");
      return;
    }

    setLoading(true);
    setError("");
    setProgress(0);
    setStatus("Uploading audio...");

    const formData = new FormData();
    formData.append("audio", file);
    formData.append("format", format);

    const xhr = new XMLHttpRequest();

    xhr.open("POST", "/api/audio/convert");
    xhr.responseType = "blob";

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const uploadProgress = Math.round(
          (event.loaded / event.total) * 100
        );

        setProgress(Math.min(uploadProgress, 90));

        if (uploadProgress >= 100) {
          setStatus("Converting audio...");
        }
      }
    };

    xhr.onload = async () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const resultBlob = xhr.response;

        if (!resultBlob || resultBlob.size === 0) {
          setError("The server returned an empty audio file.");
          setLoading(false);
          setStatus("");
          return;
        }

        const url = URL.createObjectURL(resultBlob);

        setOutputUrl(url);
        setOutputName(`converted-audio.${format}`);
        setProgress(100);
        setStatus("Conversion completed successfully!");
        setLoading(false);
      } else {
        let message = "Audio conversion failed.";

        try {
          const responseText = await xhr.response.text();
          const responseData = JSON.parse(responseText);
          message = responseData.message || message;
        } catch {
          // Use the default error message.
        }

        setError(message);
        setLoading(false);
        setStatus("");
        setProgress(0);
      }
    };

    xhr.onerror = () => {
      setError("Could not connect to the server. Please try again.");
      setLoading(false);
      setStatus("");
      setProgress(0);
    };

    xhr.onabort = () => {
      setError("Conversion request was cancelled.");
      setLoading(false);
      setStatus("");
      setProgress(0);
    };

    xhr.send(formData);
  };

  const formatSize = (bytes) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="audio-converter-page">
      <div className="audio-converter-header">
        <button className="back-button" onClick={onBack}>
          ← Back
        </button>

        <div>
          <h1>Audio Converter</h1>
          <p>Convert audio files into different formats easily.</p>
        </div>
      </div>

      <div className="audio-converter-card">
        {/* Upload */}
        <div className="audio-upload-area">
          <input
            type="file"
            accept="audio/*"
            id="audio-file"
            hidden
            disabled={loading}
            onChange={(e) => handleFileChange(e.target.files[0])}
          />

          <label htmlFor="audio-file" className="audio-upload-label">
            <span className="upload-icon">🎵</span>
            <h3>Select Audio File</h3>
            <p>Click here to choose an audio file</p>
            <small>Maximum file size: 500 MB</small>
          </label>
        </div>

        {/* Original audio preview */}
        {file && originalUrl && (
          <div className="audio-original-section">
            <div className="audio-section-heading">
              <div>
                <span className="audio-section-tag">SOURCE AUDIO</span>
                <h3>Original File</h3>
              </div>

              <span className="audio-file-size">
                {formatSize(file.size)}
              </span>
            </div>

            <div className="audio-original-name">
              <span className="audio-file-symbol">♫</span>
              <strong>{file.name}</strong>
            </div>

            <AudioPlayer
              key={originalUrl}
              src={originalUrl}
              title="Original audio preview"
            />
          </div>
        )}

        {/* Output format */}
        <div className="audio-format-section">
          <h3>Choose Output Format</h3>

          <div className="audio-format-grid">
            {formats.map((item) => (
              <button
                key={item.value}
                type="button"
                className={`audio-format-option ${
                  format === item.value ? "active" : ""
                }`}
                onClick={() => setFormat(item.value)}
                disabled={loading}
              >
                <strong>{item.label}</strong>
                <span>{item.description}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Convert */}
        <button
          className="audio-convert-button"
          onClick={convertAudio}
          disabled={!file || loading}
        >
          {loading ? "Converting..." : "Convert Audio"}
        </button>

        {/* Progress */}
        {loading && (
          <div className="audio-progress-section">
            <p>{status}</p>

            <div className="audio-progress-bar">
              <div
                className="audio-progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>

            <span>{progress}%</span>

            <small>
              Conversion may take some time for large files.
            </small>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="audio-error">
            {error}
          </div>
        )}

        {/* Converted audio */}
        {outputUrl && (
          <div className="audio-download-section">
            <div className="audio-success-icon">✓</div>

            <span className="audio-section-tag">CONVERSION COMPLETE</span>

            <h3>Your audio is ready!</h3>

            <p>{outputName}</p>

            <AudioPlayer
              key={outputUrl}
              src={outputUrl}
              title="Converted audio preview"
            />

            <a
              href={outputUrl}
              download={outputName}
              className="audio-download-button"
            >
              ↓ Download {format.toUpperCase()}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
