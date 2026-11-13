
import { useEffect, useRef, useState } from "react";
import "./AudioConverter.css";
import { getFFmpeg, fetchFile } from "../utils/ffmpeg";

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

const audioMimeTypes = {
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  m4a: "audio/mp4",
  flac: "audio/flac",
};

export default function AudioConverter({ onBack }) {
  const processingRef = useRef(false);

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
    if (!outputUrl) return;

    return () => URL.revokeObjectURL(outputUrl);
  }, [outputUrl]);

  const handleFileChange = (selectedFile) => {
    setError("");
    setStatus("");
    setProgress(0);

    setOutputUrl("");
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

  // Build FFmpeg arguments for the selected audio format.
  const buildAudioArgs = (inputName, outputName) => {
    const args = [
      "-i",
      inputName,
      "-vn",
    ];

    // MP3
    if (format === "mp3") {
      args.push(
        "-c:a", "libmp3lame",
        "-b:a", "192k"
      );
    }

    // WAV
    else if (format === "wav") {
      args.push(
        "-c:a", "pcm_s16le"
      );
    }

    // OGG
    else if (format === "ogg") {
      args.push(
        "-c:a", "libvorbis",
        "-q:a", "5"
      );
    }

    // AAC in M4A container
    else if (format === "m4a") {
      args.push(
        "-c:a", "aac",
        "-b:a", "192k"
      );
    }

    // FLAC
    else if (format === "flac") {
      args.push(
        "-c:a", "flac"
      );
    }

    else {
      throw new Error("Unsupported audio output format.");
    }

    args.push(outputName);

    return args;
  };

  const convertAudio = async () => {
    if (!file) {
      setError("Please select an audio file first.");
      return;
    }

    if (processingRef.current) return;

    processingRef.current = true;

    let ffmpeg = null;
    let inputName = "";

    const outputName = `converted-audio-${Date.now()}.${format}`;

    setLoading(true);
    setError("");
    setProgress(3);
    setStatus("Loading browser audio engine...");

    setOutputUrl("");
    setOutputName("");

    try {
      // Load FFmpeg locally in the user's browser.
      ffmpeg = await getFFmpeg((percentage) => {
        const actualProgress = Math.max(
          8,
          Math.min(95, Math.round(percentage * 0.85 + 10))
        );

        setProgress(actualProgress);
        setStatus("Converting audio locally...");
      });

      setProgress(8);
      setStatus("Preparing audio...");

      // Preserve the original input extension.
      const extension =
        file.name.match(/\.([a-z0-9]{1,8})$/i)?.[1] || "audio";

      inputName = `input-audio-${Date.now()}.${extension}`;

      // Write audio file into FFmpeg's virtual filesystem.
      const inputData = await fetchFile(file);

      await ffmpeg.writeFile(inputName, inputData);

      setProgress(10);
      setStatus(`Converting audio to ${format.toUpperCase()}...`);

      // Execute audio conversion.
      const args = buildAudioArgs(inputName, outputName);

      const exitCode = await ffmpeg.exec(args);

      if (exitCode !== 0) {
        throw new Error(
          `Conversion to ${format.toUpperCase()} failed. The required audio encoder may not be available in this FFmpeg build.`
        );
      }

      setProgress(95);
      setStatus("Preparing converted audio...");

      // Read converted audio.
      const outputData = await ffmpeg.readFile(outputName);

      if (!outputData || outputData.length === 0) {
        throw new Error("The converted audio file is empty.");
      }

      const resultBlob = new Blob([outputData], {
        type: audioMimeTypes[format],
      });

      const url = URL.createObjectURL(resultBlob);

      setOutputUrl(url);
      setOutputName(`converted-audio.${format}`);

      setProgress(100);
      setStatus("Conversion completed successfully!");

    } catch (err) {
      console.error("Browser audio conversion error:", err);

      setError(
        err.message || "Unable to convert this audio file."
      );

      setStatus("");
      setProgress(0);

    } finally {
      // Clean temporary files from FFmpeg's virtual filesystem.
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

  const formatSize = (bytes) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="audio-converter-page">
      <div className="audio-converter-header">
        <button
          className="back-button"
          onClick={onBack}
          disabled={loading}
        >
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
            onChange={(e) => {
              handleFileChange(e.target.files?.[0]);
              e.target.value = "";
            }}
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
              Audio is processed locally on your device.
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
