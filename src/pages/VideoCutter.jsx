
import { useEffect, useRef, useState } from "react";
import "./VideoCutter.css";

function formatSize(bytes) {
  if (!bytes) return "0 MB";
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// Convert seconds to MM:SS
function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "00:00";

  const totalSeconds = Math.floor(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

// Convert MM:SS into seconds
function parseTime(value) {
  const match = String(value).trim().match(/^(\d+):([0-5]\d)$/);

  if (!match) return NaN;

  const minutes = Number(match[1]);
  const seconds = Number(match[2]);

  return minutes * 60 + seconds;
}

function getSupportedMimeType() {
  if (!window.MediaRecorder) return "";

  const types = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];

  return types.find((type) =>
    MediaRecorder.isTypeSupported(type)
  ) || "";
}

function VideoCutter({ onBack }) {
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const inputUrlRef = useRef(null);
  const outputUrlRef = useRef(null);
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const endTimeRef = useRef(0);
  const recordingRef = useRef(false);

  const [file, setFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [duration, setDuration] = useState(0);

  const [startTime, setStartTime] = useState("00:00");
  const [endTime, setEndTime] = useState("");

  const [cutting, setCutting] = useState(false);
  const [progress, setProgress] = useState(0);

  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    return () => {
      recordingRef.current = false;

      if (recorderRef.current?.state !== "inactive") {
        recorderRef.current?.stop();
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      if (inputUrlRef.current) {
        URL.revokeObjectURL(inputUrlRef.current);
      }

      if (outputUrlRef.current) {
        URL.revokeObjectURL(outputUrlRef.current);
      }
    };
  }, []);

  const clearResult = () => {
    if (outputUrlRef.current) {
      URL.revokeObjectURL(outputUrlRef.current);
      outputUrlRef.current = null;
    }

    setResult(null);
  };

  const handleFile = (selectedFile) => {
    if (!selectedFile) return;

    setError("");
    setMessage("");
    setProgress(0);
    clearResult();

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

    const url = URL.createObjectURL(selectedFile);

    inputUrlRef.current = url;

    setFile(selectedFile);
    setVideoUrl(url);
    setDuration(0);
    setStartTime("00:00");
    setEndTime("");
  };

  const handleMetadata = () => {
    const video = videoRef.current;

    if (!video || !Number.isFinite(video.duration)) return;

    setDuration(video.duration);
    setEndTime(formatTime(video.duration));
  };

  const previewTime = (value) => {
    const video = videoRef.current;
    const seconds = parseTime(value);

    if (!video || !Number.isFinite(seconds)) {
      setError("Enter a valid time in MM:SS format.");
      return;
    }

    setError("");
    video.currentTime = Math.max(0, Math.min(seconds, duration));
  };

  const removeVideo = () => {
    if (cutting) return;

    if (inputUrlRef.current) {
      URL.revokeObjectURL(inputUrlRef.current);
      inputUrlRef.current = null;
    }

    clearResult();

    setFile(null);
    setVideoUrl("");
    setDuration(0);
    setStartTime("00:00");
    setEndTime("");
    setProgress(0);
    setError("");
    setMessage("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const startCutting = async () => {
    const video = videoRef.current;

    if (!file || !video || cutting) return;

    const start = parseTime(startTime);
    const end = parseTime(endTime);

    if (
      !Number.isFinite(start) ||
      !Number.isFinite(end) ||
      start < 0 ||
      end <= start ||
      end > duration
    ) {
      setError("Please enter valid start and end times in MM:SS format.");
      return;
    }

    if (end - start < 0.5) {
      setError("Please select a clip of at least 0.5 seconds.");
      return;
    }

    if (
      !window.MediaRecorder ||
      typeof video.captureStream !== "function"
    ) {
      setError(
        "Your browser does not support browser-based video cutting. Please use the latest Chrome or Edge."
      );
      return;
    }

    const mimeType = getSupportedMimeType();

    if (!mimeType) {
      setError("Your browser does not support WebM recording.");
      return;
    }

    setError("");
    setMessage("Preparing video...");
    setProgress(0);
    clearResult();

    setCutting(true);
    recordingRef.current = false;
    endTimeRef.current = end;
    chunksRef.current = [];

    try {
      video.pause();

      if (video.readyState < 2) {
        await new Promise((resolve, reject) => {
          const onReady = () => {
            cleanup();
            resolve();
          };

          const onError = () => {
            cleanup();
            reject(new Error("Unable to load the video."));
          };

          const cleanup = () => {
            video.removeEventListener("loadeddata", onReady);
            video.removeEventListener("error", onError);
          };

          video.addEventListener("loadeddata", onReady, { once: true });
          video.addEventListener("error", onError, { once: true });
        });
      }

      video.currentTime = start;

      await new Promise((resolve, reject) => {
        const onSeeked = () => {
          cleanup();
          resolve();
        };

        const onError = () => {
          cleanup();
          reject(new Error("Unable to seek to the selected start time."));
        };

        const cleanup = () => {
          video.removeEventListener("seeked", onSeeked);
          video.removeEventListener("error", onError);
        };

        video.addEventListener("seeked", onSeeked, { once: true });
        video.addEventListener("error", onError, { once: true });
      });

      const stream = video.captureStream();
      streamRef.current = stream;

      if (!stream.getVideoTracks().length) {
        throw new Error("Unable to capture video from this file.");
      }

      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 5000000,
      });

      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        recordingRef.current = false;
        setError("An error occurred while recording the selected clip.");
        setMessage("");
        setCutting(false);
      };

      recorder.onstop = () => {
        recordingRef.current = false;

        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        const blob = new Blob(chunksRef.current, {
          type: mimeType,
        });

        if (!blob.size) {
          setError("No video data was recorded. Please try again.");
          setMessage("");
          setCutting(false);
          return;
        }

        const url = URL.createObjectURL(blob);
        outputUrlRef.current = url;

        setResult({
          url,
          name: "cut-video.webm",
          size: blob.size,
          duration: end - start,
        });

        setProgress(100);
        setMessage("Your video clip is ready!");
        setCutting(false);
      };

      recorder.start(250);
      recordingRef.current = true;

      setMessage("Recording selected video section...");

      await video.play();

      const checkProgress = () => {
        if (!recordingRef.current) return;

        const current = video.currentTime;

        const percentage = Math.min(
          99,
          Math.max(
            0,
            Math.round(
              ((current - start) / (end - start)) * 100
            )
          )
        );

        setProgress(percentage);

        if (current >= end || video.ended) {
          recordingRef.current = false;
          video.pause();

          if (recorder.state !== "inactive") {
            recorder.stop();
          }

          return;
        }

        requestAnimationFrame(checkProgress);
      };

      requestAnimationFrame(checkProgress);
    } catch (err) {
      console.error("Video cutter error:", err);

      recordingRef.current = false;

      if (recorderRef.current?.state !== "inactive") {
        recorderRef.current.stop();
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      setError(err.message || "Unable to cut this video.");
      setMessage("");
      setCutting(false);
    }
  };

  const downloadVideo = () => {
    if (!result) return;

    const link = document.createElement("a");

    link.href = result.url;
    link.download = result.name;

    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const selectedDuration = Math.max(
    0,
    parseTime(endTime) - parseTime(startTime)
  );

  return (
    <div className="video-cutter-page">
      <div className="video-cutter-container">

        <button
          className="cutter-back-button"
          onClick={onBack}
          disabled={cutting}
        >
          ← Back to Tools
        </button>

        <div className="cutter-heading">
          <div className="cutter-heading-icon">✂️</div>

          <div>
            <h1>Video Cutter</h1>
            <p>Trim and extract video clips directly in your browser.</p>
          </div>
        </div>

        {!file ? (
          <div className="cutter-upload-box">
            <div className="cutter-upload-icon">🎬</div>

            <h2>Upload your video</h2>
            <p>Select a video to start trimming.</p>

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
              className="cutter-select-button"
              onClick={() => fileInputRef.current?.click()}
            >
              Select Video
            </button>

            <small>Maximum file size: 500 MB</small>
          </div>
        ) : (
          <div className="cutter-workspace">

            <div className="cutter-preview-card">
              <div className="cutter-preview-video">
                <video
                  ref={videoRef}
                  src={videoUrl}
                  controls
                  playsInline
                  preload="auto"
                  onLoadedMetadata={handleMetadata}
                />
              </div>

              <div className="cutter-file-details">
                <div>
                  <strong>{file.name}</strong>
                  <p>{formatSize(file.size)}</p>
                </div>

                <button
                  className="cutter-remove-button"
                  onClick={removeVideo}
                  disabled={cutting}
                >
                  Remove
                </button>
              </div>

              <div className="cutter-duration">
                <span>Original Duration</span>
                <strong>{formatTime(duration)}</strong>
              </div>
            </div>

            <div className="cutter-settings">
              <h2>Trim Settings</h2>

              <p className="cutter-description">
                Select the start and end points of your video clip.
              </p>

              <div className="cutter-time-fields">
                <div>
                  <label htmlFor="cutter-start">
                    Start Time (MM:SS)
                  </label>

                  <input
                    id="cutter-start"
                    type="text"
                    inputMode="numeric"
                    placeholder="00:00"
                    value={startTime}
                    disabled={cutting}
                    onChange={(event) => {
                      setStartTime(event.target.value);
                      clearResult();
                      setError("");
                    }}
                  />

                  <button
                    className="cutter-preview-button"
                    onClick={() => previewTime(startTime)}
                    disabled={cutting}
                  >
                    Preview Start
                  </button>
                </div>

                <div>
                  <label htmlFor="cutter-end">
                    End Time (MM:SS)
                  </label>

                  <input
                    id="cutter-end"
                    type="text"
                    inputMode="numeric"
                    placeholder="00:00"
                    value={endTime}
                    disabled={cutting}
                    onChange={(event) => {
                      setEndTime(event.target.value);
                      clearResult();
                      setError("");
                    }}
                  />

                  <button
                    className="cutter-preview-button"
                    onClick={() => previewTime(endTime)}
                    disabled={cutting}
                  >
                    Preview End
                  </button>
                </div>
              </div>

              <p className="cutter-description">
                Enter time in minutes:seconds format, for example 01:10.
              </p>

              <div className="cutter-selected-duration">
                <span>Selected Clip Duration</span>

                <strong>
                  {Number.isFinite(selectedDuration)
                    ? formatTime(selectedDuration)
                    : "00:00"}
                </strong>
              </div>

              <button
                className="cutter-start-button"
                onClick={startCutting}
                disabled={cutting || !duration}
              >
                {cutting ? "Cutting Video..." : "Cut Video"}
              </button>
            </div>
          </div>
        )}

        {(cutting || result) && (
          <div className="cutter-progress-card">
            <div className="cutter-progress-heading">
              <strong>
                {result ? "Video Ready" : "Processing Video"}
              </strong>

              <span>{progress}%</span>
            </div>

            <div className="cutter-progress-track">
              <div
                className="cutter-progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>

            {message && (
              <p className="cutter-message">{message}</p>
            )}
          </div>
        )}

        {error && (
          <div className="cutter-message cutter-error">
            {error}
          </div>
        )}

        {result && (
          <div className="cutter-result">
            <h2>Your video clip is ready!</h2>

            <div className="cutter-result-grid">
              <div>
                <span>Original Size</span>
                <strong>{formatSize(file.size)}</strong>
              </div>

              <div>
                <span>Clip Size</span>
                <strong>{formatSize(result.size)}</strong>
              </div>

              <div>
                <span>Clip Duration</span>
                <strong>{formatTime(result.duration)}</strong>
              </div>
            </div>

            <button
              className="cutter-start-button"
              onClick={downloadVideo}
            >
              Download WebM Video
            </button>
          </div>
        )}

        <div className="cutter-privacy-note">
          <strong>🔒 Privacy</strong>

          <p>
            Your video is processed locally in your browser.
            It is not uploaded to our server.
          </p>
        </div>

        <p className="cutter-disclaimer">
          Output format: WebM. Cutting happens in real time,
          so processing takes approximately as long as the selected clip.
        </p>

      </div>
    </div>
  );
}

export default VideoCutter;
