
import { useEffect, useRef, useState } from "react";
import "./AudioCompressor.css";

const MAX_FILE_SIZE = 100 * 1024 * 1024;

const QUALITY_OPTIONS = [
  {
    id: "high",
    name: "High Quality",
    bitrate: 128000,
    description: "Better sound quality",
  },
  {
    id: "medium",
    name: "Balanced",
    bitrate: 96000,
    description: "Good quality with smaller size",
  },
  {
    id: "small",
    name: "Small Size",
    bitrate: 64000,
    description: "Maximum size reduction",
  },
];

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) seconds = 0;

  const value = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const secs = value % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function formatSize(bytes) {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function AudioVisualizer({ playing }) {
  return (
    <div
      className={`compressor-visualizer ${playing ? "playing" : ""}`}
      aria-hidden="true"
    >
      {Array.from({ length: 18 }, (_, index) => (
        <span
          key={index}
          style={{ "--bar-index": index }}
        />
      ))}
    </div>
  );
}

function AudioCompressor({ onBack }) {
  const audioContextRef = useRef(null);
  const originalAudioRef = useRef(null);
  const outputAudioRef = useRef(null);
  const originalUrlRef = useRef("");
  const outputUrlRef = useRef("");

  const [file, setFile] = useState(null);
  const [audioBuffer, setAudioBuffer] = useState(null);
  const [originalUrl, setOriginalUrl] = useState("");
  const [outputUrl, setOutputUrl] = useState("");

  const [quality, setQuality] = useState("medium");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  const [originalPlaying, setOriginalPlaying] = useState(false);
  const [outputPlaying, setOutputPlaying] = useState(false);

  const [currentTime, setCurrentTime] = useState(0);
  const [outputTime, setOutputTime] = useState(0);

  const [outputSize, setOutputSize] = useState(0);
  const [outputDuration, setOutputDuration] = useState(0);

  const totalDuration = audioBuffer?.duration || 0;

  const selectedQuality = QUALITY_OPTIONS.find(
    (option) => option.id === quality
  );

  const savings =
    file && outputSize > 0
      ? Math.max(0, ((file.size - outputSize) / file.size) * 100)
      : 0;

  useEffect(() => {
    return () => {
      originalAudioRef.current?.pause();
      outputAudioRef.current?.pause();

      if (originalUrlRef.current) {
        URL.revokeObjectURL(originalUrlRef.current);
      }

      if (outputUrlRef.current) {
        URL.revokeObjectURL(outputUrlRef.current);
      }

      audioContextRef.current?.close();
    };
  }, []);

  const getAudioContext = () => {
    const AudioContextClass =
      window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) {
      throw new Error(
        "Your browser does not support audio processing."
      );
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextClass();
    }

    return audioContextRef.current;
  };

  const stopPlayers = () => {
    originalAudioRef.current?.pause();
    outputAudioRef.current?.pause();

    setOriginalPlaying(false);
    setOutputPlaying(false);
  };

  const clearOutput = () => {
    if (outputUrlRef.current) {
      URL.revokeObjectURL(outputUrlRef.current);
      outputUrlRef.current = "";
    }

    setOutputUrl("");
    setOutputSize(0);
    setOutputDuration(0);
    setOutputTime(0);
  };

  const handleFileChange = async (event) => {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) return;

    setError("");
    clearOutput();
    stopPlayers();

    if (!selectedFile.type.startsWith("audio/")) {
      setError("Please select a valid audio file.");
      event.target.value = "";
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setError("The maximum supported file size is 100 MB.");
      event.target.value = "";
      return;
    }

    setLoading(true);

    try {
      const context = getAudioContext();
      const arrayBuffer = await selectedFile.arrayBuffer();
      const decodedAudio = await context.decodeAudioData(arrayBuffer);

      const url = URL.createObjectURL(selectedFile);

      if (originalUrlRef.current) {
        URL.revokeObjectURL(originalUrlRef.current);
      }

      originalUrlRef.current = url;

      setFile(selectedFile);
      setAudioBuffer(decodedAudio);
      setOriginalUrl(url);
      setCurrentTime(0);
    } catch (err) {
      setError(
        err.message || "Could not read this audio file."
      );
    } finally {
      setLoading(false);
      event.target.value = "";
    }
  };

  const compressAudio = async () => {
    if (!file || !audioBuffer) {
      setError("Please upload an audio file first.");
      return;
    }

    if (!window.MediaRecorder) {
      setError(
        "Your browser does not support browser-based audio compression."
      );
      return;
    }

    setError("");
    clearOutput();
    stopPlayers();

    setLoading(true);
    setProgress(0);

    let source = null;
    let recorder = null;
    let progressInterval = null;

    try {
      const context = getAudioContext();

      if (context.state === "suspended") {
        await context.resume();
      }

      const destination = context.createMediaStreamDestination();

      const mimeTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
      ];

      const mimeType = mimeTypes.find((type) =>
        MediaRecorder.isTypeSupported(type)
      );

      if (!mimeType) {
        throw new Error(
          "WebM audio compression is not supported by this browser."
        );
      }

      const chunks = [];

      recorder = new MediaRecorder(destination.stream, {
        mimeType,
        audioBitsPerSecond: selectedQuality.bitrate,
      });

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      const compressionPromise = new Promise((resolve, reject) => {
        recorder.onerror = () => {
          reject(new Error("Audio compression failed."));
        };

        recorder.onstop = () => {
          const blob = new Blob(chunks, {
            type: mimeType,
          });

          resolve(blob);
        };
      });

      source = context.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(destination);

      recorder.start(250);

      const startedAt = Date.now();

      progressInterval = setInterval(() => {
        const elapsed = (Date.now() - startedAt) / 1000;
        const percentage = Math.min(
          99,
          (elapsed / audioBuffer.duration) * 100
        );

        setProgress(percentage);
      }, 250);

      source.onended = () => {
        if (recorder.state !== "inactive") {
          recorder.stop();
        }
      };

      source.start(0);

      const blob = await compressionPromise;

      clearInterval(progressInterval);
      progressInterval = null;

      if (!blob.size) {
        throw new Error("The compressed audio file is empty.");
      }

      const url = URL.createObjectURL(blob);

      outputUrlRef.current = url;

      setOutputUrl(url);
      setOutputSize(blob.size);
      setOutputDuration(audioBuffer.duration);
      setOutputTime(0);
      setProgress(100);
    } catch (err) {
      if (recorder && recorder.state !== "inactive") {
        recorder.stop();
      }

      setError(
        err.message || "Could not compress this audio file."
      );
    } finally {
      if (progressInterval) {
        clearInterval(progressInterval);
      }

      source?.disconnect();
      setLoading(false);
    }
  };

  const downloadOutput = () => {
    if (!outputUrl) return;

    const link = document.createElement("a");
    link.href = outputUrl;
    link.download = `${file?.name.replace(/\.[^.]+$/, "") || "audio"}-compressed.webm`;
    link.click();
  };

  const handleOriginalPlay = () => {
    outputAudioRef.current?.pause();
    setOutputPlaying(false);
    setOriginalPlaying(true);
  };

  const handleOutputPlay = () => {
    originalAudioRef.current?.pause();
    setOriginalPlaying(false);
    setOutputPlaying(true);
  };

  return (
    <div className="audio-compressor-page">
      <div className="audio-compressor-header">
        <button className="back-button" onClick={onBack}>
          ← Back
        </button>

        <div>
          <h1>Audio Compressor</h1>
          <p>Reduce audio file size while keeping good sound quality.</p>
        </div>
      </div>

      <div className="audio-compressor-card">
        {!file && (
          <div className="compressor-upload">
            <input
              id="compressor-file"
              type="file"
              accept="audio/*"
              hidden
              onChange={handleFileChange}
            />

            <label htmlFor="compressor-file">
              <span>♫</span>
              <h3>Upload audio file</h3>
              <p>Choose an audio file from your device</p>
              <small>Maximum 100 MB · Browser processing</small>
            </label>
          </div>
        )}

        {loading && (
          <div className="compressor-progress">
            <p>
              {progress > 0
                ? "Compressing your audio..."
                : "Loading audio..."}
            </p>

            <div className="compressor-progress-track">
              <div
                className="compressor-progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>

            {progress > 0 && (
              <span>{Math.round(progress)}%</span>
            )}
          </div>
        )}

        {file && (
          <>
            <div className="compressor-file">
              <div className="compressor-file-icon">♫</div>

              <div className="compressor-file-details">
                <strong title={file.name}>{file.name}</strong>
                <span>
                  {formatSize(file.size)} · {formatTime(totalDuration)}
                </span>
              </div>

              <AudioVisualizer playing={originalPlaying} />

              <button
                className="compressor-play-button"
                onClick={() => {
                  const audio = originalAudioRef.current;

                  if (!audio) return;

                  if (audio.paused) {
                    audio.play().catch(() =>
                      setError("Could not play the original audio.")
                    );
                  } else {
                    audio.pause();
                  }
                }}
              >
                {originalPlaying ? "Ⅱ" : "▶"}
              </button>

              <label
                htmlFor="compressor-change-file"
                className="compressor-change-button"
              >
                Change
              </label>

              <input
                id="compressor-change-file"
                type="file"
                accept="audio/*"
                hidden
                onChange={handleFileChange}
              />
            </div>

            <audio
              ref={originalAudioRef}
              src={originalUrl}
              onTimeUpdate={(event) =>
                setCurrentTime(event.currentTarget.currentTime)
              }
              onPlay={handleOriginalPlay}
              onPause={() => setOriginalPlaying(false)}
              onEnded={() => setOriginalPlaying(false)}
              hidden
            />

            <div className="compressor-original-timeline">
              <div className="compressor-timeline-track">
                <div
                  className="compressor-timeline-fill"
                  style={{
                    width: `${
                      totalDuration
                        ? (currentTime / totalDuration) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>

              <div className="compressor-timeline-times">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(totalDuration)}</span>
              </div>
            </div>

            <div className="compressor-quality-section">
              <div className="compressor-section-heading">
                <h3>Compression settings</h3>
                <span>Choose your quality</span>
              </div>

              <div className="compressor-quality-options">
                {QUALITY_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    className={`compressor-quality-option ${
                      quality === option.id ? "active" : ""
                    }`}
                    onClick={() => setQuality(option.id)}
                    disabled={loading}
                  >
                    <strong>{option.name}</strong>
                    <span>{option.description}</span>
                    <small>
                      {option.bitrate / 1000} kbps
                    </small>
                  </button>
                ))}
              </div>

              <p className="compressor-format-note">
                Output format: WebM (Opus)
              </p>
            </div>

            <button
              className="compressor-start-button"
              onClick={compressAudio}
              disabled={loading}
            >
              {loading ? "Compressing..." : "Compress Audio"}
            </button>
          </>
        )}

        {error && (
          <div className="compressor-error">{error}</div>
        )}

        {outputUrl && (
          <div className="compressor-result">
            <div className="compressor-success">✓</div>

            <span>COMPRESSION COMPLETE</span>
            <h3>Your compressed audio is ready!</h3>

            <div className="compressor-size-comparison">
              <div>
                <span>Original size</span>
                <strong>{formatSize(file.size)}</strong>
              </div>

              <div>
                <span>Compressed size</span>
                <strong>{formatSize(outputSize)}</strong>
              </div>

              <div>
                <span>Size reduction</span>
                <strong>
                  {savings.toFixed(1)}%
                </strong>
              </div>
            </div>

            <div className="compressor-file">
              <div className="compressor-file-icon">♫</div>

              <div className="compressor-file-details">
                <strong>compressed-audio.webm</strong>
                <span>
                  {formatSize(outputSize)} ·{" "}
                  {formatTime(outputDuration)}
                </span>
              </div>

              <AudioVisualizer playing={outputPlaying} />

              <button
                className="compressor-play-button"
                onClick={() => {
                  const audio = outputAudioRef.current;

                  if (!audio) return;

                  if (audio.paused) {
                    audio.play().catch(() =>
                      setError("Could not play the compressed audio.")
                    );
                  } else {
                    audio.pause();
                  }
                }}
              >
                {outputPlaying ? "Ⅱ" : "▶"}
              </button>
            </div>

            <audio
              ref={outputAudioRef}
              src={outputUrl}
              onTimeUpdate={(event) =>
                setOutputTime(event.currentTarget.currentTime)
              }
              onPlay={handleOutputPlay}
              onPause={() => setOutputPlaying(false)}
              onEnded={() => setOutputPlaying(false)}
              hidden
            />

            <div className="compressor-original-timeline">
              <div className="compressor-timeline-track">
                <div
                  className="compressor-timeline-fill"
                  style={{
                    width: `${
                      outputDuration
                        ? (outputTime / outputDuration) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>

              <div className="compressor-timeline-times">
                <span>{formatTime(outputTime)}</span>
                <span>{formatTime(outputDuration)}</span>
              </div>
            </div>

            <button
              className="compressor-download-button"
              onClick={downloadOutput}
            >
              ↓ Download Compressed Audio
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default AudioCompressor;
