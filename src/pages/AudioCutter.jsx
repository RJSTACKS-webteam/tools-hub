
import { useEffect, useRef, useState } from "react";
import "./AudioCutter.css";

const MAX_FILE_SIZE = 500 * 1024 * 1024;

function formatTime(seconds, totalDuration = seconds) {
  if (!Number.isFinite(seconds)) seconds = 0;

  const value = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const secs = value % 60;

  if (totalDuration >= 3600) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function parseTime(value) {
  const parts = String(value).trim().split(":").map(Number);

  if (
    !parts.length ||
    parts.some((part) => !Number.isFinite(part) || part < 0)
  ) {
    return null;
  }

  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }

  return null;
}

function AudioVisualizer({ playing }) {
  return (
    <div
      className={`audio-cutter-visualizer ${playing ? "playing" : ""}`}
      aria-hidden="true"
    >
      {Array.from({ length: 20 }, (_, index) => (
        <span
          key={index}
          style={{ "--bar-index": index }}
        />
      ))}
    </div>
  );
}

function AudioCutter({ onBack }) {
  const audioRef = useRef(null);
  const audioContextRef = useRef(null);
  const waveformRef = useRef(null);
  const audioUrlRef = useRef("");
  const outputAudioRef = useRef(null);
  const outputUrlRef = useRef("");
  const draggingRef = useRef(null);

  const [file, setFile] = useState(null);
  const [audioUrl, setAudioUrl] = useState("");
  const [audioBuffer, setAudioBuffer] = useState(null);
  const [waveform, setWaveform] = useState([]);

  const [duration, setDuration] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const [startInput, setStartInput] = useState("00:00");
  const [endInput, setEndInput] = useState("00:00");

  const [originalPlaying, setOriginalPlaying] = useState(false);
  const [selectionPlaying, setSelectionPlaying] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  const [outputPlaying, setOutputPlaying] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [outputUrl, setOutputUrl] = useState("");

  const selectedDuration = Math.max(0, endTime - startTime);

  const startPosition = duration
    ? (startTime / duration) * 100
    : 0;

  const endPosition = duration
    ? (endTime / duration) * 100
    : 100;

  const selectionProgress = selectedDuration
    ? Math.max(
        0,
        Math.min(
          100,
          ((currentTime - startTime) / selectedDuration) * 100
        )
      )
    : 0;

  // Keep manual time fields synchronized with the selection.
  useEffect(() => {
    setStartInput(formatTime(startTime, duration));
    setEndInput(formatTime(endTime, duration));
  }, [startTime, endTime, duration]);

  // Clean up audio resources when leaving the tool.
  useEffect(() => {
    return () => {
      audioRef.current?.pause();

      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }

      if (outputUrlRef.current) {
        URL.revokeObjectURL(outputUrlRef.current);
      }

      audioContextRef.current?.close();
    };
  }, []);

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }

    setOriginalPlaying(false);
    setSelectionPlaying(false);
    setPreviewing(false);
  };

  const createWaveform = (buffer) => {
    const channel = buffer.getChannelData(0);
    const bars = 120;
    const samplesPerBar = Math.max(
      1,
      Math.floor(channel.length / bars)
    );

    const values = [];

    for (let i = 0; i < bars; i++) {
      let max = 0;
      const start = i * samplesPerBar;
      const end = Math.min(start + samplesPerBar, channel.length);

      for (let j = start; j < end; j++) {
        max = Math.max(max, Math.abs(channel[j]));
      }

      values.push(Math.max(0.04, max));
    }

    setWaveform(values);
  };

  const handleFileChange = async (selectedFile) => {
    if (!selectedFile) return;

    setError("");

    if (!selectedFile.type.startsWith("audio/")) {
      setError("Please select a valid audio file.");
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setError("Maximum file size is 500 MB.");
      return;
    }

    stopAudio();

    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }

    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = "";
    }

    if (outputUrlRef.current) {
      URL.revokeObjectURL(outputUrlRef.current);
      outputUrlRef.current = "";
    }

    setFile(null);
    setAudioBuffer(null);
    setAudioUrl("");
    setOutputUrl("");
    setOutputPlaying(false);
    setWaveform([]);
    setDuration(0);
    setStartTime(0);
    setEndTime(0);
    setCurrentTime(0);
    setStartInput("00:00");
    setEndInput("00:00");
    setLoading(true);

    try {
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

      if (audioContextRef.current.state === "suspended") {
        await audioContextRef.current.resume();
      }

      const arrayBuffer = await selectedFile.arrayBuffer();

      const decodedBuffer =
        await audioContextRef.current.decodeAudioData(arrayBuffer);

      const url = URL.createObjectURL(selectedFile);
      audioUrlRef.current = url;

      setFile(selectedFile);
      setAudioBuffer(decodedBuffer);
      setAudioUrl(url);
      setDuration(decodedBuffer.duration);
      setStartTime(0);
      setEndTime(decodedBuffer.duration);
      setCurrentTime(0);

      createWaveform(decodedBuffer);
    } catch (err) {
      setError(
        err.message || "Could not read this audio file."
      );
    } finally {
      setLoading(false);
    }
  };

  // Play the complete original audio.
  const toggleOriginalPlayback = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!audio.paused && !previewing) {
      audio.pause();
      return;
    }

    stopAudio();
    audio.currentTime = 0;
    setCurrentTime(0);

    try {
      await audio.play();
      setOriginalPlaying(true);
    } catch {
      setError("Could not play this audio file.");
    }
  };

  // Play only the selected audio section.
  const toggleSelectionPlayback = async () => {
    const audio = audioRef.current;

    if (!audio || selectedDuration <= 0) return;

    if (!audio.paused && previewing) {
      audio.pause();
      return;
    }

    stopAudio();

    if (
      audio.currentTime < startTime ||
      audio.currentTime >= endTime
    ) {
      audio.currentTime = startTime;
    }

    setCurrentTime(audio.currentTime);

    try {
      setPreviewing(true);
      await audio.play();
      setSelectionPlaying(true);
    } catch {
      setPreviewing(false);
      setSelectionPlaying(false);
      setError("Could not preview this selection.");
    }
  };

  const handleAudioTimeUpdate = (event) => {
    const audio = event.currentTarget;
    const time = audio.currentTime;

    setCurrentTime(time);

    if (previewing && time >= endTime) {
      audio.pause();
      audio.currentTime = endTime;
      setCurrentTime(endTime);
      setPreviewing(false);
      setSelectionPlaying(false);
    }
  };

  const handleAudioEnded = () => {
    setOriginalPlaying(false);
    setSelectionPlaying(false);
    setPreviewing(false);
  };

  const handleStartChange = (value) => {
    const next = Math.max(
      0,
      Math.min(Number(value) || 0, endTime - 0.1)
    );

    stopAudio();

    setStartTime(next);
    setCurrentTime(next);

    if (audioRef.current) {
      audioRef.current.currentTime = next;
    }
  };

  const handleEndChange = (value) => {
    const next = Math.min(
      duration,
      Math.max(startTime + 0.1, Number(value) || 0)
    );

    stopAudio();
    setEndTime(next);
  };

  const commitStartInput = () => {
    const parsed = parseTime(startInput);

    if (parsed === null || parsed >= endTime) {
      setStartInput(formatTime(startTime, duration));
      return;
    }

    handleStartChange(parsed);
  };

  const commitEndInput = () => {
    const parsed = parseTime(endInput);

    if (parsed === null || parsed <= startTime || parsed > duration) {
      setEndInput(formatTime(endTime, duration));
      return;
    }

    handleEndChange(parsed);
  };

  // Waveform marker dragging.
  const getPointerTime = (event) => {
    const element = waveformRef.current;

    if (!element || !duration) return 0;

    const rect = element.getBoundingClientRect();

    const position = Math.max(
      0,
      Math.min(1, (event.clientX - rect.left) / rect.width)
    );

    return position * duration;
  };

  const handleWaveformPointerDown = (event) => {
    if (!duration) return;

    event.preventDefault();

    const pointerTime = getPointerTime(event);

    const startDistance = Math.abs(pointerTime - startTime);
    const endDistance = Math.abs(pointerTime - endTime);

    const target =
      startDistance <= endDistance ? "start" : "end";

    draggingRef.current = target;

    event.currentTarget.setPointerCapture(event.pointerId);

    if (target === "start") {
      handleStartChange(pointerTime);
    } else {
      handleEndChange(pointerTime);
    }
  };

  const handleWaveformPointerMove = (event) => {
    if (!draggingRef.current) return;

    const pointerTime = getPointerTime(event);

    if (draggingRef.current === "start") {
      handleStartChange(pointerTime);
    } else {
      handleEndChange(pointerTime);
    }
  };

  const handleWaveformPointerUp = (event) => {
    draggingRef.current = null;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  // Generate a WAV file from the selected audio.
  const createWav = (buffer, start, end) => {
    const sampleRate = buffer.sampleRate;
    const channels = buffer.numberOfChannels;

    const startSample = Math.floor(start * sampleRate);
    const endSample = Math.floor(end * sampleRate);
    const frameCount = endSample - startSample;

    const bytesPerSample = 2;
    const blockAlign = channels * bytesPerSample;

    const wavBuffer = new ArrayBuffer(
      44 + frameCount * blockAlign
    );

    const view = new DataView(wavBuffer);

    const writeString = (offset, text) => {
      for (let i = 0; i < text.length; i++) {
        view.setUint8(offset + i, text.charCodeAt(i));
      }
    };

    writeString(0, "RIFF");
    view.setUint32(4, 36 + frameCount * blockAlign, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, channels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true);
    writeString(36, "data");
    view.setUint32(40, frameCount * blockAlign, true);

    let offset = 44;

    for (let i = startSample; i < endSample; i++) {
      for (let channel = 0; channel < channels; channel++) {
        const sample = buffer.getChannelData(channel)[i];
        const clamped = Math.max(-1, Math.min(1, sample));

        view.setInt16(
          offset,
          clamped < 0
            ? clamped * 32768
            : clamped * 32767,
          true
        );

        offset += 2;
      }
    }

    return new Blob([wavBuffer], {
      type: "audio/wav",
    });
  };

  const cutAudio = () => {
    if (!audioBuffer || selectedDuration <= 0) {
      setError("Please select a valid audio section.");
      return;
    }

    try {
      stopAudio();

      if (outputUrlRef.current) {
        URL.revokeObjectURL(outputUrlRef.current);
      }

      const blob = createWav(
        audioBuffer,
        startTime,
        endTime
      );

      const url = URL.createObjectURL(blob);

      outputUrlRef.current = url;
      setOutputUrl(url);
      setOutputPlaying(false);
      setError("");
    } catch {
      setError("Could not cut this audio. Please try again.");
    }
  };

  const downloadAudio = () => {
    if (!outputUrl) return;

    const link = document.createElement("a");
    link.href = outputUrl;
    link.download = "cut-audio.wav";
    link.click();
  };

  const formatSize = (bytes) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="audio-cutter-page">
      <div className="audio-cutter-header">
        <button className="back-button" onClick={onBack}>
          ← Back
        </button>

        <div>
          <h1>Audio Cutter</h1>
          <p>
            Choose a section, preview it and export your audio.
          </p>
        </div>
      </div>

      <div className="audio-cutter-card">
        {!file && (
          <div className="audio-cutter-upload">
            <input
              id="cutter-file"
              type="file"
              accept="audio/*"
              hidden
              onChange={(e) => handleFileChange(e.target.files[0])}
            />

            <label htmlFor="cutter-file">
              <span>♫</span>
              <h3>Choose an audio file</h3>
              <p>
                Drag and drop your audio here or browse your device
              </p>
              <small>Maximum file size: 500 MB</small>
            </label>
          </div>
        )}

        {file && audioUrl && (
          <>
            {/* Original audio track */}
            <div className="cutter-original-track">
              <div className="cutter-track-icon">♫</div>

              <div className="cutter-track-details">
                <strong title={file.name}>{file.name}</strong>
                <span>
                  {formatSize(file.size)} ·{" "}
                  {formatTime(duration, duration)}
                </span>
              </div>

              <AudioVisualizer playing={originalPlaying} />

              <button
                className="cutter-original-play"
                onClick={toggleOriginalPlayback}
                title={
                  originalPlaying
                    ? "Pause original audio"
                    : "Play original audio"
                }
              >
                {originalPlaying ? "❚❚" : "▶"}
              </button>

              <input
                id="cutter-file"
                type="file"
                accept="audio/*"
                hidden
                onChange={(e) => handleFileChange(e.target.files[0])}
              />

              <label
                className="cutter-change-file"
                htmlFor="cutter-file"
              >
                Change
              </label>
            </div>

            {/* Shared audio element for original and selection playback */}
            <audio
              ref={audioRef}
              src={audioUrl}
              preload="metadata"
              onTimeUpdate={handleAudioTimeUpdate}
              onEnded={handleAudioEnded}
              onPause={() => {
                setOriginalPlaying(false);
                setSelectionPlaying(false);
                setPreviewing(false);
              }}
              onPlay={() => {
                if (!previewing) {
                  setOriginalPlaying(true);
                }
              }}
              hidden
            />

            {/* Waveform editor */}
            <div className="cutter-waveform-section">
              <div className="cutter-section-heading">
                <div>
                  <h3>Waveform Editor</h3>
                  <p>
                    Drag the selection markers to trim your audio.
                  </p>
                </div>

                <span>
                  {formatTime(duration, duration)} total
                </span>
              </div>

              <div
                className="cutter-waveform"
                ref={waveformRef}
                onPointerDown={handleWaveformPointerDown}
                onPointerMove={handleWaveformPointerMove}
                onPointerUp={handleWaveformPointerUp}
                onPointerCancel={handleWaveformPointerUp}
              >
                {waveform.map((value, index) => {
                  const barTime =
                    (index / waveform.length) * duration;

                  const selected =
                    barTime >= startTime && barTime <= endTime;

                  return (
                    <span
                      key={index}
                      className={selected ? "selected" : ""}
                      style={{
                        height: `${Math.max(8, value * 100)}%`,
                        pointerEvents: "none",
                      }}
                    />
                  );
                })}

                <div
                  className="cutter-selection-overlay"
                  style={{
                    left: `${startPosition}%`,
                    width: `${Math.max(
                      0,
                      endPosition - startPosition
                    )}%`,
                  }}
                />

                <div
                  className="cutter-marker cutter-start-marker"
                  style={{ left: `${startPosition}%` }}
                />

                <div
                  className="cutter-marker cutter-end-marker"
                  style={{ left: `${endPosition}%` }}
                />
              </div>

              <div className="cutter-waveform-times">
                <span>{formatTime(0, duration)}</span>
                <span>{formatTime(duration, duration)}</span>
              </div>

              {/* Manual time controls */}
              <div className="cutter-selection-controls">
                <div>
                  <label htmlFor="cutter-start-time">
                    Start time
                  </label>

                  <input
                    id="cutter-start-time"
                    type="text"
                    inputMode="numeric"
                    value={startInput}
                    onChange={(e) => setStartInput(e.target.value)}
                    onBlur={commitStartInput}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.currentTarget.blur();
                      }
                    }}
                  />

                  <input
                    type="range"
                    min="0"
                    max={Math.max(0, endTime - 0.1)}
                    step="0.1"
                    value={startTime}
                    onChange={(e) =>
                      handleStartChange(e.target.value)
                    }
                  />
                </div>

                <div>
                  <label htmlFor="cutter-end-time">
                    End time
                  </label>

                  <input
                    id="cutter-end-time"
                    type="text"
                    inputMode="numeric"
                    value={endInput}
                    onChange={(e) => setEndInput(e.target.value)}
                    onBlur={commitEndInput}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.currentTarget.blur();
                      }
                    }}
                  />

                  <input
                    type="range"
                    min={Math.min(duration, startTime + 0.1)}
                    max={duration}
                    step="0.1"
                    value={endTime}
                    onChange={(e) =>
                      handleEndChange(e.target.value)
                    }
                  />
                </div>
              </div>

              {/* Selected duration */}
              <div className="cutter-duration">
                <span>Selected audio length</span>
                <strong>
                  {formatTime(selectedDuration, duration)}
                </strong>
              </div>
            </div>

            {/* Selection player */}
            <div className="cutter-selection-player">
              <div className="cutter-player-heading">
                <div>
                  <span className="cutter-player-eyebrow">
                    SELECTION PLAYER
                  </span>
                  <h3>Preview your trimmed audio</h3>
                </div>

                <span className="cutter-player-duration">
                  {formatTime(selectedDuration, duration)}
                </span>
              </div>

              <div className="cutter-player-controls">
                <AudioVisualizer playing={selectionPlaying} />

                <button
                  className="cutter-selection-play"
                  onClick={toggleSelectionPlayback}
                  disabled={selectedDuration <= 0}
                  aria-label={
                    selectionPlaying
                      ? "Pause selection"
                      : "Play selection"
                  }
                >
                  {selectionPlaying ? "❚❚" : "▶"}
                </button>

                <div className="cutter-player-timeline">
                  <div className="cutter-player-progress">
                    <div
                      className="cutter-player-progress-fill"
                      style={{
                        width: `${selectionProgress}%`,
                      }}
                    />
                  </div>

                  <div className="cutter-player-time">
                    <span>
                      {formatTime(
                        Math.max(
                          0,
                          Math.min(
                            selectedDuration,
                            currentTime - startTime
                          )
                        ),
                        duration
                      )}
                    </span>

                    <span>
                      {formatTime(selectedDuration, duration)}
                    </span>
                  </div>
                </div>
              </div>

              <p className="cutter-player-note">
                The preview follows your selected start and end points.
              </p>
            </div>

            {/* Main actions */}
            <div className="cutter-actions">
              <button
                className="cutter-preview-button"
                onClick={() => {
                  if (selectionPlaying) {
                    audioRef.current?.pause();
                  } else {
                    if (audioRef.current) {
                      audioRef.current.currentTime = startTime;
                    }

                    toggleSelectionPlayback();
                  }
                }}
                disabled={selectedDuration <= 0}
              >
                {selectionPlaying
                  ? "❚❚ Pause Preview"
                  : "▶ Preview Selection"}
              </button>

              <button
                className="cutter-cut-button"
                onClick={cutAudio}
                disabled={selectedDuration <= 0}
              >
                ✂ Cut Audio
              </button>
            </div>
          </>
        )}

        {loading && (
          <p className="cutter-loading">
            Loading and analysing audio...
          </p>
        )}

        {error && (
          <div className="cutter-error">{error}</div>
        )}

        {/* Exported WAV result */}
        {outputUrl && (
          <div className="cutter-result">
            <div className="cutter-success">✓</div>

            <span>YOUR AUDIO IS READY</span>

            <h3>Audio cut successfully!</h3>

            <p>
              {formatTime(selectedDuration, duration)} selected · WAV format
            </p>

            <div className="cutter-output-player">
              <AudioVisualizer playing={outputPlaying} />

              <audio
                ref={outputAudioRef}
                controls
                src={outputUrl}
                onPlay={() => setOutputPlaying(true)}
                onPause={() => setOutputPlaying(false)}
                onEnded={() => setOutputPlaying(false)}
              />
            </div>

            <button onClick={downloadAudio}>
              ↓ Download WAV
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default AudioCutter;
