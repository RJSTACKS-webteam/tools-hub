
import { useEffect, useRef, useState } from "react";
import "./VideoMerger.css";

// ---------------- HELPERS ----------------

function formatSize(bytes) {
  if (!bytes) return "0 MB";
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "00:00";

  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);

  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
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

// Load a video and wait for metadata.
function loadVideo(video, url) {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      video.removeEventListener("loadedmetadata", onReady);
      video.removeEventListener("error", onError);
    };

    const onReady = () => {
      cleanup();
      resolve();
    };

    const onError = () => {
      cleanup();
      reject(new Error("Unable to load the selected video."));
    };

    video.addEventListener("loadedmetadata", onReady, { once: true });
    video.addEventListener("error", onError, { once: true });

    video.src = url;
    video.load();
  });
}

// Read duration, including WebM files with missing duration metadata.
function getVideoDuration(url) {
  return new Promise((resolve) => {
    const video = document.createElement("video");

    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    video.src = url;

    let finished = false;
    let lastTime = 0;
    let playbackStarted = false;
    let fallbackTimer;

    const cleanup = () => {
      clearTimeout(fallbackTimer);
      video.pause();
      video.removeAttribute("src");
      video.load();
    };

    const finish = (duration) => {
      if (finished) return;

      finished = true;

      cleanup();

      resolve(
        Number.isFinite(duration) && duration > 0
          ? duration
          : 0
      );
    };

    const startPlaybackFallback = () => {
      if (playbackStarted || finished) return;

      playbackStarted = true;

      video.onended = () => {
        finish(video.currentTime || lastTime);
      };

      video.ontimeupdate = () => {
        lastTime = video.currentTime;

        if (
          Number.isFinite(video.duration) &&
          video.duration > 0
        ) {
          finish(video.duration);
        }
      };

      video.play().catch(() => finish(0));
    };

    video.onloadedmetadata = () => {
      if (
        Number.isFinite(video.duration) &&
        video.duration > 0
      ) {
        finish(video.duration);
        return;
      }

      // Try seeking to the end to discover WebM duration.
      try {
        video.currentTime = 1e10;
      } catch {
        startPlaybackFallback();
      }

      video.onseeked = () => {
        if (
          Number.isFinite(video.duration) &&
          video.duration > 0
        ) {
          finish(video.duration);
        } else if (video.currentTime > 0) {
          finish(video.currentTime);
        } else {
          startPlaybackFallback();
        }
      };

      video.ondurationchange = () => {
        if (
          Number.isFinite(video.duration) &&
          video.duration > 0
        ) {
          finish(video.duration);
        }
      };

      // If seeking doesn't work, play the file to discover its duration.
      fallbackTimer = setTimeout(() => {
        startPlaybackFallback();
      }, 2000);
    };

    video.onerror = () => finish(0);
  });
}

// Wait for a video to finish playback.
function playVideoToEnd(video, onProgress) {
  return new Promise((resolve, reject) => {
    let animationId;

    const cleanup = () => {
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("error", onError);

      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };

    const onEnded = () => {
      cleanup();
      resolve();
    };

    const onError = () => {
      cleanup();
      reject(new Error("Video playback failed."));
    };

    const updateProgress = () => {
      onProgress(video.currentTime);

      if (!video.paused && !video.ended) {
        animationId = requestAnimationFrame(updateProgress);
      }
    };

    video.addEventListener("ended", onEnded, { once: true });
    video.addEventListener("error", onError, { once: true });

    video.play()
      .then(() => {
        updateProgress();
      })
      .catch((error) => {
        cleanup();
        reject(error);
      });
  });
}

// ---------------- MAIN COMPONENT ----------------

function VideoMerger({ onBack }) {
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const animationRef = useRef(null);
  const outputUrlRef = useRef(null);

  const recordingRef = useRef(false);
  const chunksRef = useRef([]);

  const videosRef = useRef([]);

  const [videos, setVideos] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);

  const [merging, setMerging] = useState(false);
  const [progress, setProgress] = useState(0);

  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const totalDuration = videos.reduce(
    (total, video) => total + video.duration,
    0
  );

  // Keep the latest video list available for cleanup.
  useEffect(() => {
    videosRef.current = videos;
  }, [videos]);

  // Cleanup when leaving the tool.
  useEffect(() => {
    return () => {
      recordingRef.current = false;

      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }

      if (recorderRef.current?.state !== "inactive") {
        recorderRef.current?.stop();
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      if (audioContextRef.current) {
        audioContextRef.current.close();
      }

      videosRef.current.forEach((video) => {
        URL.revokeObjectURL(video.url);
      });

      if (outputUrlRef.current) {
        URL.revokeObjectURL(outputUrlRef.current);
      }
    };
  }, []);

  // Remove previous result.
  const clearResult = () => {
    if (outputUrlRef.current) {
      URL.revokeObjectURL(outputUrlRef.current);
      outputUrlRef.current = null;
    }

    setResult(null);
  };

  // ---------------- ADD VIDEOS ----------------

  const addVideos = async (files) => {
    const selectedFiles = Array.from(files || []);

    if (!selectedFiles.length || loadingFiles || merging) return;

    setError("");
    setMessage("");
    setLoadingFiles(true);

    try {
      const newVideos = [];

      for (const file of selectedFiles) {
        if (!file.type.startsWith("video/")) {
          setError(`${file.name} is not a valid video file.`);
          continue;
        }

        if (file.size > 500 * 1024 * 1024) {
          setError(`${file.name} exceeds the 500 MB limit.`);
          continue;
        }

        const url = URL.createObjectURL(file);

        setMessage(`Reading duration: ${file.name}`);

        const duration = await getVideoDuration(url);

        if (!duration || !Number.isFinite(duration)) {
          URL.revokeObjectURL(url);

          setError(
            `Could not detect the duration of ${file.name}. Please try another video format.`
          );

          continue;
        }

        newVideos.push({
          id: `${Date.now()}-${Math.random()}`,
          file,
          url,
          duration,
        });
      }

      if (newVideos.length) {
        setVideos((previous) => [...previous, ...newVideos]);
        clearResult();
        setProgress(0);
        setMessage("");
      }
    } catch (err) {
      setError(err.message || "Unable to read selected videos.");
    } finally {
      setLoadingFiles(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // ---------------- REMOVE VIDEO ----------------

  const removeVideo = (id) => {
    if (merging || loadingFiles) return;

    const selected = videos.find((video) => video.id === id);

    if (selected) {
      URL.revokeObjectURL(selected.url);
    }

    setVideos((previous) =>
      previous.filter((video) => video.id !== id)
    );

    clearResult();
    setError("");
  };

  // ---------------- REORDER VIDEOS ----------------

  const moveVideo = (index, direction) => {
    if (merging || loadingFiles) return;

    setVideos((previous) => {
      const updated = [...previous];
      const newIndex = index + direction;

      if (newIndex < 0 || newIndex >= updated.length) {
        return previous;
      }

      [updated[index], updated[newIndex]] = [
        updated[newIndex],
        updated[index],
      ];

      return updated;
    });

    clearResult();
  };

  // ---------------- CLEANUP STREAMS ----------------

  const stopTracks = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const closeAudioContext = async () => {
    if (audioContextRef.current) {
      const context = audioContextRef.current;
      audioContextRef.current = null;

      if (context.state !== "closed") {
        await context.close();
      }
    }
  };

  // ---------------- FINISH RECORDING ----------------

  const finishRecording = () => {
    recordingRef.current = false;

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    const recorder = recorderRef.current;

    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
  };

  // ---------------- START MERGING ----------------

  const startMerging = async () => {
    if (videos.length < 2 || merging || loadingFiles) return;

    const mimeType = getSupportedMimeType();

    if (!mimeType) {
      setError(
        "Your browser does not support WebM recording. Please use the latest Chrome or Edge."
      );
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || typeof canvas.captureStream !== "function") {
      setError("Your browser does not support canvas video recording.");
      return;
    }

    if (videos.some((item) => !item.duration)) {
      setError("One or more videos have invalid durations.");
      return;
    }

    clearResult();

    setError("");
    setMessage("Preparing videos...");
    setProgress(0);
    setMerging(true);

    recordingRef.current = false;
    chunksRef.current = [];

    let recorder = null;
    let audioContext = null;

    try {
      const items = [...videos];

      const durationTotal = items.reduce(
        (total, item) => total + item.duration,
        0
      );

      // Canvas dimensions.
      const canvasWidth = 1280;
      const canvasHeight = 720;

      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("Unable to initialize the video canvas.");
      }

      context.fillStyle = "#000000";
      context.fillRect(0, 0, canvasWidth, canvasHeight);

      // Create audio processing.
      audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      await audioContext.resume();

      const audioDestination =
        audioContext.createMediaStreamDestination();

      const audioSource =
        audioContext.createMediaElementSource(video);

      audioSource.connect(audioDestination);

      // Capture canvas video and audio.
      const canvasStream = canvas.captureStream(30);

      const combinedStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...audioDestination.stream.getAudioTracks(),
      ]);

      streamRef.current = combinedStream;

      // Create recorder.
      recorder = new MediaRecorder(combinedStream, {
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

        stopTracks();
        closeAudioContext();

        setError("An error occurred while recording the merged video.");
        setMessage("");
        setMerging(false);
      };

      recorder.onstop = async () => {
        recordingRef.current = false;

        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = null;
        }

        stopTracks();
        await closeAudioContext();

        const blob = new Blob(chunksRef.current, {
          type: mimeType,
        });

        if (!blob.size) {
          setError("No output video was created. Please try again.");
          setMessage("");
          setMerging(false);
          return;
        }

        const url = URL.createObjectURL(blob);

        outputUrlRef.current = url;

        setResult({
          url,
          name: "merged-video.webm",
          size: blob.size,
          duration: durationTotal,
        });

        setProgress(100);
        setMessage("Your merged video is ready!");
        setMerging(false);
      };

      // Start recording before video playback.
      recorder.start(500);
      recordingRef.current = true;

      // Draw video frames to canvas.
      const drawFrame = () => {
        if (!recordingRef.current) return;

        context.fillStyle = "#000000";
        context.fillRect(0, 0, canvasWidth, canvasHeight);

        if (
          video.readyState >= 2 &&
          video.videoWidth &&
          video.videoHeight
        ) {
          const scale = Math.min(
            canvasWidth / video.videoWidth,
            canvasHeight / video.videoHeight
          );

          const width = video.videoWidth * scale;
          const height = video.videoHeight * scale;

          const x = (canvasWidth - width) / 2;
          const y = (canvasHeight - height) / 2;

          context.drawImage(video, x, y, width, height);
        }

        animationRef.current = requestAnimationFrame(drawFrame);
      };

      drawFrame();

      let completedDuration = 0;

      // Process videos one by one.
      for (let index = 0; index < items.length; index++) {
        if (!recordingRef.current) break;

        const item = items[index];

        setMessage(
          `Merging video ${index + 1} of ${items.length}...`
        );

        video.pause();

        video.removeAttribute("src");
        video.load();

        // Load next video.
        await loadVideo(video, item.url);

        // Wait until enough data is available.
        if (video.readyState < 3) {
          await new Promise((resolve, reject) => {
            const onReady = () => {
              cleanup();
              resolve();
            };

            const onError = () => {
              cleanup();
              reject(new Error(`Unable to prepare ${item.file.name}.`));
            };

            const cleanup = () => {
              video.removeEventListener("canplay", onReady);
              video.removeEventListener("error", onError);
            };

            video.addEventListener("canplay", onReady, { once: true });
            video.addEventListener("error", onError, { once: true });
          });
        }

        video.currentTime = 0;

        // Wait for playback to start and finish.
        await playVideoToEnd(video, (currentTime) => {
          const currentTotal = completedDuration + currentTime;

          const percentage = Math.min(
            99,
            Math.round((currentTotal / durationTotal) * 100)
          );

          setProgress(percentage);
        });

        completedDuration += item.duration;
      }

      // Stop recording after all videos finish.
      finishRecording();
    } catch (err) {
      console.error("Video merger error:", err);

      recordingRef.current = false;

      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }

      if (recorderRef.current?.state !== "inactive") {
        recorderRef.current.stop();
      }

      stopTracks();
      await closeAudioContext();

      setError(err.message || "Unable to merge the selected videos.");
      setMessage("");
      setMerging(false);
    }
  };

  // ---------------- DOWNLOAD ----------------

  const downloadVideo = () => {
    if (!result) return;

    const link = document.createElement("a");

    link.href = result.url;
    link.download = result.name;

    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // ---------------- UI ----------------

  return (
    <div className="video-merger-page">
      <div className="video-merger-container">

        <button
          className="merger-back-button"
          onClick={onBack}
          disabled={merging || loadingFiles}
        >
          ← Back to Tools
        </button>

        <div className="merger-heading">
          <div className="merger-heading-icon">🎬</div>

          <div>
            <h1>Video Merger</h1>
            <p>
              Combine multiple videos into one video directly in your browser.
            </p>
          </div>
        </div>

        {/* Upload */}

        <div className="merger-upload-box">
          <div className="merger-upload-icon">📁</div>

          <h2>Add Your Videos</h2>

          <p>Select two or more videos to combine.</p>

          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            multiple
            hidden
            onChange={(event) => addVideos(event.target.files)}
          />

          <button
            className="merger-select-button"
            onClick={() => fileInputRef.current?.click()}
            disabled={merging || loadingFiles}
          >
            {loadingFiles ? "Reading Videos..." : "+ Select Videos"}
          </button>

          <small>Maximum size: 500 MB per video</small>
        </div>

        {/* Selected videos */}

        {videos.length > 0 && (
          <div className="merger-video-list">

            <div className="merger-list-heading">
              <div>
                <h2>Selected Videos</h2>
                <p>{videos.length} video(s) added</p>
              </div>

              <strong>{formatTime(totalDuration)}</strong>
            </div>

            {videos.map((item, index) => (
              <div className="merger-video-item" key={item.id}>

                <div className="merger-video-number">
                  {index + 1}
                </div>

                <div className="merger-video-info">
                  <strong>{item.file.name}</strong>

                  <p>
                    {formatSize(item.file.size)} · {formatTime(item.duration)}
                  </p>
                </div>

                <div className="merger-video-actions">

                  <button
                    onClick={() => moveVideo(index, -1)}
                    disabled={merging || loadingFiles || index === 0}
                    title="Move up"
                  >
                    ↑
                  </button>

                  <button
                    onClick={() => moveVideo(index, 1)}
                    disabled={
                      merging ||
                      loadingFiles ||
                      index === videos.length - 1
                    }
                    title="Move down"
                  >
                    ↓
                  </button>

                  <button
                    onClick={() => removeVideo(item.id)}
                    disabled={merging || loadingFiles}
                    title="Remove video"
                  >
                    ✕
                  </button>

                </div>
              </div>
            ))}

            <button
              className="merger-start-button"
              onClick={startMerging}
              disabled={
                merging ||
                loadingFiles ||
                videos.length < 2
              }
            >
              {merging ? "Merging Videos..." : "Merge Videos"}
            </button>

            {videos.length < 2 && (
              <p className="merger-hint">
                Add at least two videos to start merging.
              </p>
            )}
          </div>
        )}

        {/* Progress */}

        {(merging || result) && (
          <div className="merger-progress-card">

            <div className="merger-progress-heading">
              <strong>
                {result ? "Merge Complete" : "Merging Videos"}
              </strong>

              <span>{progress}%</span>
            </div>

            <div className="merger-progress-track">
              <div
                className="merger-progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>

            {message && <p>{message}</p>}

          </div>
        )}

        {/* Error */}

        {error && (
          <div className="merger-error">
            {error}
          </div>
        )}

        {/* Result */}

        {result && (
          <div className="merger-result">

            <h2>Your merged video is ready!</h2>

            <div className="merger-result-details">

              <div>
                <span>Output Size</span>
                <strong>{formatSize(result.size)}</strong>
              </div>

              <div>
                <span>Duration</span>
                <strong>{formatTime(result.duration)}</strong>
              </div>

              <div>
                <span>Format</span>
                <strong>WebM</strong>
              </div>

            </div>

            <button
              className="merger-start-button"
              onClick={downloadVideo}
            >
              Download Merged Video
            </button>

          </div>
        )}

        {/* Hidden processing elements */}

        <video
          ref={videoRef}
          playsInline
          preload="auto"
          className="merger-hidden-video"
        />

        <canvas
          ref={canvasRef}
          className="merger-hidden-canvas"
        />

        {/* Privacy */}

        <div className="merger-privacy-note">
          <strong>🔒 Privacy</strong>

          <p>
            Videos are processed locally in your browser.
            They are not uploaded to our server.
          </p>
        </div>

        <p className="merger-disclaimer">
          Output format: WebM. Videos are merged in real time.
          Processing may take as long as the combined video duration.
        </p>

      </div>
    </div>
  );
}

export default VideoMerger;
