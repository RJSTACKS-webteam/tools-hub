
import { useEffect, useRef, useState } from "react";
import "./AudioMerger.css";

const MAX_FILE_SIZE = 100 * 1024 * 1024;

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

function AudioVisualizer({ playing }) {
  return (
    <div
      className={`merger-visualizer ${playing ? "playing" : ""}`}
      aria-hidden="true"
    >
      {Array.from({ length: 16 }, (_, index) => (
        <span
          key={index}
          style={{ "--bar-index": index }}
        />
      ))}
    </div>
  );
}

function AudioMerger({ onBack }) {
  const audioRef = useRef(null);
  const audioContextRef = useRef(null);
  const urlsRef = useRef([]);

  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const [error, setError] = useState("");

  const [playingId, setPlayingId] = useState(null);
  const [playing, setPlaying] = useState(false);

  const [outputUrl, setOutputUrl] = useState("");
  const [outputName, setOutputName] = useState("merged-audio.wav");
  const [outputCurrentTime, setOutputCurrentTime] = useState(0);
  const [outputDuration, setOutputDuration] = useState(0);

  const [merging, setMerging] = useState(false);

  const totalDuration = tracks.reduce(
    (total, track) => total + track.duration,
    0
  );

  useEffect(() => {
    return () => {
      audioRef.current?.pause();

      urlsRef.current.forEach((url) => {
        URL.revokeObjectURL(url);
      });

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

  const stopPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }

    setPlaying(false);
    setPlayingId(null);
  };

  const clearOutput = () => {
    if (outputUrl) {
      URL.revokeObjectURL(outputUrl);
    }

    setOutputUrl("");
    setOutputCurrentTime(0);
    setOutputDuration(0);
  };

  // Load multiple audio files.
  const handleFiles = async (event) => {
    const selectedFiles = Array.from(event.target.files || []);

    if (!selectedFiles.length) return;

    setError("");
    setLoading(true);
    stopPlayback();

    try {
      const context = getAudioContext();

      if (context.state === "suspended") {
        await context.resume();
      }

      const newTracks = [];

      for (let index = 0; index < selectedFiles.length; index++) {
        const file = selectedFiles[index];

        setLoadingText(
          `Reading audio ${index + 1} of ${selectedFiles.length}...`
        );

        if (!file.type.startsWith("audio/")) {
          throw new Error(
            `${file.name} is not a valid audio file.`
          );
        }

        if (file.size > MAX_FILE_SIZE) {
          throw new Error(
            `${file.name} is larger than the 100 MB per-file limit.`
          );
        }

        const arrayBuffer = await file.arrayBuffer();
        const audioBuffer = await context.decodeAudioData(arrayBuffer);
        const url = URL.createObjectURL(file);

        urlsRef.current.push(url);

        newTracks.push({
          id: `${Date.now()}-${index}-${Math.random()}`,
          file,
          buffer: audioBuffer,
          url,
          duration: audioBuffer.duration,
        });
      }

      setTracks((previous) => [...previous, ...newTracks]);

      clearOutput();
    } catch (err) {
      setError(
        err.message || "Could not load the selected audio files."
      );
    } finally {
      setLoading(false);
      setLoadingText("");
      event.target.value = "";
    }
  };

  // Play an individual track.
  const playTrack = async (track) => {
    const audio = audioRef.current;

    if (!audio) return;

    if (playingId === track.id && !audio.paused) {
      audio.pause();
      return;
    }

    stopPlayback();

    audio.src = track.url;
    audio.currentTime = 0;

    try {
      await audio.play();
      setPlayingId(track.id);
      setPlaying(true);
    } catch {
      setError(`Could not play ${track.file.name}.`);
    }
  };

  // Reorder tracks.
  const moveTrack = (index, direction) => {
    const newIndex = index + direction;

    if (newIndex < 0 || newIndex >= tracks.length) return;

    stopPlayback();

    setTracks((previous) => {
      const updated = [...previous];

      [updated[index], updated[newIndex]] = [
        updated[newIndex],
        updated[index],
      ];

      return updated;
    });

    clearOutput();
  };

  // Remove a track.
  const removeTrack = (id) => {
    const track = tracks.find((item) => item.id === id);

    if (!track) return;

    if (playingId === id) {
      stopPlayback();
    }

    URL.revokeObjectURL(track.url);

    urlsRef.current = urlsRef.current.filter(
      (url) => url !== track.url
    );

    setTracks((previous) =>
      previous.filter((item) => item.id !== id)
    );

    clearOutput();
  };

  // Create WAV from all tracks in the selected order.
  const createMergedWav = (audioTracks) => {
    const sampleRate = audioTracks[0].buffer.sampleRate;

    const channelCount = Math.max(
      ...audioTracks.map(
        (track) => track.buffer.numberOfChannels
      )
    );

    const totalFrames = audioTracks.reduce(
      (sum, track) =>
        sum + Math.floor(track.buffer.duration * sampleRate),
      0
    );

    const bytesPerSample = 2;
    const blockAlign = channelCount * bytesPerSample;
    const dataSize = totalFrames * blockAlign;

    if (dataSize > 0xffffffff - 36) {
      throw new Error(
        "The merged audio is too large to export as WAV."
      );
    }

    const wavBuffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(wavBuffer);

    const writeString = (offset, text) => {
      for (let i = 0; i < text.length; i++) {
        view.setUint8(offset + i, text.charCodeAt(i));
      }
    };

    writeString(0, "RIFF");
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, channelCount, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true);
    writeString(36, "data");
    view.setUint32(40, dataSize, true);

    let outputFrame = 0;

    for (const track of audioTracks) {
      const buffer = track.buffer;

      const frameCount = Math.floor(
        buffer.duration * sampleRate
      );

      const channels = Array.from(
        { length: buffer.numberOfChannels },
        (_, channel) => buffer.getChannelData(channel)
      );

      for (let frame = 0; frame < frameCount; frame++) {
        for (let channel = 0; channel < channelCount; channel++) {
          const sourceChannel =
            channels[Math.min(channel, channels.length - 1)];

          const sample = sourceChannel[frame] || 0;
          const clamped = Math.max(-1, Math.min(1, sample));

          view.setInt16(
            44 + (outputFrame * channelCount + channel) * 2,
            clamped < 0
              ? clamped * 32768
              : clamped * 32767,
            true
          );
        }

        outputFrame++;
      }
    }

    return new Blob([wavBuffer], {
      type: "audio/wav",
    });
  };

  // Merge all tracks.
  const mergeAudio = () => {
    if (tracks.length < 2) {
      setError("Please add at least two audio files to merge.");
      return;
    }

    setError("");
    setMerging(true);
    stopPlayback();

    try {
      const blob = createMergedWav(tracks);

      clearOutput();

      const url = URL.createObjectURL(blob);

      setOutputUrl(url);
      setOutputName("merged-audio.wav");
      setOutputCurrentTime(0);
      setOutputDuration(totalDuration);
    } catch (err) {
      setError(
        err.message || "Could not merge the audio files."
      );
    } finally {
      setMerging(false);
    }
  };

  // Play the merged audio.
  const playOutput = async () => {
    const audio = audioRef.current;

    if (!audio || !outputUrl) return;

    if (playingId === "output" && !audio.paused) {
      audio.pause();
      return;
    }

    stopPlayback();

    audio.src = outputUrl;
    audio.currentTime = outputCurrentTime;

    try {
      await audio.play();
      setPlayingId("output");
      setPlaying(true);
    } catch {
      setError("Could not play the merged audio.");
    }
  };

  // Update output playback progress.
  const handleOutputTimeUpdate = (event) => {
    if (playingId === "output") {
      setOutputCurrentTime(
        event.currentTarget.currentTime
      );
    }
  };

  // Seek in merged audio.
  const seekOutput = (value) => {
    const time = Number(value);

    if (!audioRef.current) return;

    audioRef.current.currentTime = time;
    setOutputCurrentTime(time);
  };

  // Download the merged WAV.
  const downloadOutput = () => {
    if (!outputUrl) return;

    const link = document.createElement("a");
    link.href = outputUrl;
    link.download = outputName;
    link.click();
  };

  const formatSize = (bytes) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="audio-merger-page">
      <div className="audio-merger-header">
        <button className="back-button" onClick={onBack}>
          ← Back
        </button>

        <div>
          <h1>Audio Merger</h1>
          <p>Combine multiple audio files into one track.</p>
        </div>
      </div>

      <div className="audio-merger-card">
        {/* Upload */}
        <div className="audio-merger-upload">
          <input
            id="merger-files"
            type="file"
            accept="audio/*"
            multiple
            hidden
            onChange={handleFiles}
          />

          <label htmlFor="merger-files">
            <span>♫</span>
            <h3>Add audio files</h3>
            <p>
              Select multiple audio files from your device
            </p>
            <small>
              Maximum 100 MB per file · Browser processing
            </small>
          </label>
        </div>

        {loading && (
          <p className="merger-loading">{loadingText}</p>
        )}

        {/* Track list */}
        {tracks.length > 0 && (
          <>
            <div className="merger-track-heading">
              <div>
                <h3>Your audio tracks</h3>
                <p>
                  Arrange the files in the order you want them merged.
                </p>
              </div>

              <span>{tracks.length} files</span>
            </div>

            <div className="merger-track-list">
              {tracks.map((track, index) => {
                const isTrackPlaying =
                  playingId === track.id && playing;

                return (
                  <div className="merger-track" key={track.id}>
                    <div className="merger-track-number">
                      {String(index + 1).padStart(2, "0")}
                    </div>

                    <div className="merger-track-icon">♫</div>

                    <div className="merger-track-details">
                      <strong title={track.file.name}>
                        {track.file.name}
                      </strong>

                      <span>
                        {formatTime(track.duration)} ·{" "}
                        {formatSize(track.file.size)}
                      </span>
                    </div>

                    <AudioVisualizer playing={isTrackPlaying} />

                    <button
                      className="merger-play-button"
                      onClick={() => playTrack(track)}
                      title={isTrackPlaying ? "Pause" : "Play"}
                    >
                      {isTrackPlaying ? "Ⅱ" : "▶"}
                    </button>

                    <div className="merger-track-actions">
                      <button
                        onClick={() => moveTrack(index, -1)}
                        disabled={index === 0}
                        title="Move up"
                      >
                        ↑
                      </button>

                      <button
                        onClick={() => moveTrack(index, 1)}
                        disabled={index === tracks.length - 1}
                        title="Move down"
                      >
                        ↓
                      </button>

                      <button
                        className="merger-remove-button"
                        onClick={() => removeTrack(track.id)}
                        title="Remove track"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summary */}
            <div className="merger-summary">
              <div>
                <span>Total tracks</span>
                <strong>{tracks.length}</strong>
              </div>

              <div>
                <span>Combined duration</span>
                <strong>{formatTime(totalDuration)}</strong>
              </div>
            </div>

            {/* Merge button */}
            <div className="merger-actions">
              <button
                className="merger-merge-button"
                onClick={mergeAudio}
                disabled={tracks.length < 2 || merging}
              >
                {merging
                  ? "Merging..."
                  : "＋ Merge Audio Files"}
              </button>
            </div>
          </>
        )}

        {error && (
          <div className="merger-error">{error}</div>
        )}

        {/* Merged audio result */}
        {outputUrl && (
          <div className="merger-result">
            <div className="merger-success">✓</div>

            <span>YOUR MERGED AUDIO IS READY</span>

            <h3>Audio merged successfully!</h3>

            <p>
              {tracks.length} tracks ·{" "}
              {formatTime(outputDuration || totalDuration)} · WAV format
            </p>

            <div className="merger-output-player">
              <AudioVisualizer
                playing={playingId === "output" && playing}
              />

              <button
                className="merger-play-button"
                onClick={playOutput}
                aria-label={
                  playingId === "output" && playing
                    ? "Pause merged audio"
                    : "Play merged audio"
                }
              >
                {playingId === "output" && playing
                  ? "Ⅱ"
                  : "▶"}
              </button>

              <div className="merger-output-timeline">
                <span className="merger-output-filename">
                  {outputName}
                </span>

                <input
                  type="range"
                  min="0"
                  max={outputDuration || totalDuration}
                  step="0.1"
                  value={Math.min(
                    outputCurrentTime,
                    outputDuration || totalDuration
                  )}
                  onChange={(event) =>
                    seekOutput(event.target.value)
                  }
                />

                <div className="merger-output-times">
                  <span>{formatTime(outputCurrentTime)}</span>
                  <span>
                    {formatTime(outputDuration || totalDuration)}
                  </span>
                </div>
              </div>
            </div>

            <button
              className="merger-download-button"
              onClick={downloadOutput}
            >
              ↓ Download Merged WAV
            </button>
          </div>
        )}
      </div>

      {/* Shared audio playback element */}
      <audio
        ref={audioRef}
        hidden
        onTimeUpdate={handleOutputTimeUpdate}
        onLoadedMetadata={(event) => {
          if (playingId === "output") {
            setOutputDuration(event.currentTarget.duration);
          }
        }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setPlayingId(null);
        }}
      />
    </div>
  );
}

export default AudioMerger;
