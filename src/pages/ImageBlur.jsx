import { useEffect, useRef, useState } from "react";
import "./ImageBlur.css";

function ImageBlur({ onBack }) {
  const [imageFile, setImageFile] = useState(null);
  const [imageUrl, setImageUrl] = useState("");
  const [mode, setMode] = useState("full");
  const [blur, setBlur] = useState(8);
  const [brushSize, setBrushSize] = useState(45);
  const [strokes, setStrokes] = useState([]);
  const [activeStroke, setActiveStroke] = useState(null);
  const [outputFormat, setOutputFormat] = useState("image/png");
  const [error, setError] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);

  const fileInputRef = useRef(null);
  const imageRef = useRef(null);
  const canvasRef = useRef(null);
  const activePointerRef = useRef(null);

  // Create and clean up the uploaded image URL.
  useEffect(() => {
    if (!imageFile) {
      setImageUrl("");
      return;
    }

    const url = URL.createObjectURL(imageFile);
    setImageUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  // Main image rendering function.
  const renderBlur = (
    canvas,
    image,
    currentMode,
    currentBlur,
    currentBrushSize,
    currentStrokes,
    currentActiveStroke = null,
    brushScale = null
  ) => {
    if (!canvas || !image || !image.naturalWidth) return;

    const width = image.naturalWidth;
    const height = image.naturalHeight;

    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;

    const context = canvas.getContext("2d");

    if (!context) return;

    context.clearRect(0, 0, width, height);
    context.filter = "none";

    // FULL IMAGE BLUR
    if (currentMode === "full") {
      const padding = Math.ceil(currentBlur * 2);

      context.filter = `blur(${currentBlur}px)`;

      context.drawImage(
        image,
        -padding,
        -padding,
        width + padding * 2,
        height + padding * 2
      );

      context.filter = "none";
      return;
    }

    // SPOT BLUR: Draw original image first.
    context.drawImage(image, 0, 0, width, height);

    const allStrokes = currentActiveStroke
      ? [...currentStrokes, currentActiveStroke]
      : currentStrokes;

    if (!allStrokes.length || currentBlur <= 0) return;

    // Create a separate blurred image.
    const blurredCanvas = document.createElement("canvas");

    blurredCanvas.width = width;
    blurredCanvas.height = height;

    const blurredContext = blurredCanvas.getContext("2d");

    if (!blurredContext) return;

    const padding = Math.ceil(currentBlur * 2);

    blurredContext.filter = `blur(${currentBlur}px)`;

    blurredContext.drawImage(
      image,
      -padding,
      -padding,
      width + padding * 2,
      height + padding * 2
    );

    blurredContext.filter = "none";

    // Create a mask for the painted areas.
    const maskCanvas = document.createElement("canvas");

    maskCanvas.width = width;
    maskCanvas.height = height;

    const maskContext = maskCanvas.getContext("2d");

    if (!maskContext) return;

    const previewRect = canvas.getBoundingClientRect();

    // Use the same brush scale for preview and export.
    const scale =
      brushScale ??
      (previewRect.width
        ? width / previewRect.width
        : 1);

    allStrokes.forEach((stroke) => {
      if (!stroke.points.length) return;

      const lineWidth = stroke.size * scale;

      maskContext.save();

      maskContext.strokeStyle = "#ffffff";
      maskContext.fillStyle = "#ffffff";
      maskContext.lineWidth = lineWidth;
      maskContext.lineCap = "round";
      maskContext.lineJoin = "round";

      // Soft edges for natural-looking blur.
      maskContext.filter =
        `blur(${Math.max(1, lineWidth * 0.10)}px)`;

      if (stroke.points.length === 1) {
        const point = stroke.points[0];

        maskContext.beginPath();

        maskContext.arc(
          point.x * width,
          point.y * height,
          lineWidth / 2,
          0,
          Math.PI * 2
        );

        maskContext.fill();
      } else {
        maskContext.beginPath();

        maskContext.moveTo(
          stroke.points[0].x * width,
          stroke.points[0].y * height
        );

        stroke.points.slice(1).forEach((point) => {
          maskContext.lineTo(
            point.x * width,
            point.y * height
          );
        });

        maskContext.stroke();
      }

      maskContext.restore();
    });

    // Apply the mask to the blurred image.
    blurredContext.globalCompositeOperation = "destination-in";

    blurredContext.drawImage(maskCanvas, 0, 0);

    blurredContext.globalCompositeOperation = "source-over";

    // Combine original and selectively blurred image.
    context.drawImage(blurredCanvas, 0, 0);
  };

  // Update the preview whenever settings or strokes change.
  useEffect(() => {
    const image = imageRef.current;
    const canvas = canvasRef.current;

    if (!image || !canvas || !image.complete || !image.naturalWidth) {
      return;
    }

    renderBlur(
      canvas,
      image,
      mode,
      blur,
      brushSize,
      strokes,
      activeStroke
    );
  }, [imageUrl, mode, blur, brushSize, strokes, activeStroke]);

  // Upload image.
  const handleFile = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Please select a JPG, PNG or WebP image.");
      event.target.value = "";
      return;
    }

    setError("");
    setImageFile(file);

    setBlur(8);
    setBrushSize(45);
    setStrokes([]);
    setActiveStroke(null);
    setMode("full");
  };

  const changeImage = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  // Convert pointer position into image-relative coordinates.
  const getPoint = (event) => {
    const canvas = canvasRef.current;

    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();

    return {
      x: Math.max(
        0,
        Math.min(1, (event.clientX - rect.left) / rect.width)
      ),
      y: Math.max(
        0,
        Math.min(1, (event.clientY - rect.top) / rect.height)
      )
    };
  };

  // Start brush stroke.
  const handlePointerDown = (event) => {
    if (mode !== "spot" || blur <= 0) return;

    event.preventDefault();

    const point = getPoint(event);

    if (!point) return;

    activePointerRef.current = event.pointerId;

    event.currentTarget.setPointerCapture(event.pointerId);

    setActiveStroke({
      size: brushSize,
      points: [point]
    });
  };

  // Continue brush stroke.
  const handlePointerMove = (event) => {
    if (
      mode !== "spot" ||
      activePointerRef.current !== event.pointerId ||
      !activeStroke
    ) {
      return;
    }

    event.preventDefault();

    const point = getPoint(event);

    if (!point) return;

    setActiveStroke((previous) => {
      if (!previous) return previous;

      return {
        ...previous,
        points: [...previous.points, point]
      };
    });
  };

  // Finish brush stroke.
  const finishStroke = (event) => {
    if (activePointerRef.current !== event.pointerId) return;

    activePointerRef.current = null;

    if (activeStroke?.points.length) {
      setStrokes((existing) => [
        ...existing,
        activeStroke
      ]);
    }

    setActiveStroke(null);
  };

  // Undo last completed stroke.
  const undoStroke = () => {
    setStrokes((previous) => previous.slice(0, -1));
  };

  // Clear all selected blur areas.
  const clearStrokes = () => {
    setStrokes([]);
    setActiveStroke(null);
  };

  // Reset settings.
  const resetSettings = () => {
    setBlur(8);
    setBrushSize(45);
    setStrokes([]);
    setActiveStroke(null);
  };

  // Download edited image.
  const downloadImage = () => {
    const image = imageRef.current;

    if (!image || !image.complete || !image.naturalWidth) {
      setError("Please wait for the image to finish loading.");
      return;
    }

    setIsDownloading(true);
    setError("");

    try {
      const canvas = document.createElement("canvas");

      // Match the preview brush scale when exporting.
      const previewWidth =
        canvasRef.current?.getBoundingClientRect().width ||
        image.naturalWidth;

      const exportBrushScale =
        image.naturalWidth / previewWidth;

      renderBlur(
        canvas,
        image,
        mode,
        blur,
        brushSize,
        strokes,
        activeStroke,
        exportBrushScale
      );

      const quality =
        outputFormat === "image/jpeg" ? 0.92 : undefined;

      canvas.toBlob((blob) => {
        setIsDownloading(false);

        if (!blob) {
          setError("Could not export the image. Please try again.");
          return;
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        const extension =
          outputFormat === "image/jpeg"
            ? "jpg"
            : outputFormat === "image/webp"
            ? "webp"
            : "png";

        const originalName =
          imageFile.name.replace(/\.[^.]+$/, "");

        link.href = url;
        link.download = `${originalName}-blurred.${extension}`;

        document.body.appendChild(link);

        link.click();

        link.remove();

        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }, outputFormat, quality);

    } catch (downloadError) {
      setIsDownloading(false);

      setError(
        downloadError.message || "Image export failed."
      );
    }
  };

  return (
    <main className="blur-page">
      <div className="blur-container">

        <button className="blur-back" onClick={onBack}>
          ← Back to Image Editor
        </button>

        <header className="blur-heading">
          <span className="blur-heading-icon">🌫️</span>

          <div>
            <p className="blur-eyebrow">IMAGE EDITOR</p>

            <h1>Blur Image</h1>

            <p>
              Blur the complete image or select specific areas
              with a brush.
            </p>
          </div>
        </header>

        {!imageFile ? (
          <section className="blur-upload-card">

            <div className="blur-upload-icon">🖼️</div>

            <h2>Upload an image</h2>

            <p>
              Choose an image to start applying blur effects.
            </p>

            <button
              className="blur-primary-button"
              onClick={changeImage}
            >
              ＋ Choose Image
            </button>

            <span className="blur-file-note">
              Supported formats: JPG, PNG and WebP
            </span>

          </section>
        ) : (
          <>
            {/* MODE SELECTOR */}

            <div className="blur-mode-selector">

              <button
                className={mode === "full" ? "active-mode" : ""}
                onClick={() => {
                  setMode("full");
                  setActiveStroke(null);
                }}
              >
                <span>🌫️</span>

                <span>
                  <strong>Full Image Blur</strong>
                  <small>Blur the entire image</small>
                </span>
              </button>

              <button
                className={mode === "spot" ? "active-mode" : ""}
                onClick={() => {
                  setMode("spot");
                  setActiveStroke(null);
                }}
              >
                <span>🖌️</span>

                <span>
                  <strong>Spot Blur</strong>
                  <small>Paint over selected areas</small>
                </span>
              </button>

            </div>

            {/* WORKSPACE */}

            <section className="blur-workspace">

              {/* IMAGE PREVIEW */}

              <div className="blur-preview-panel">

                <div className="blur-panel-heading">

                  <div>
                    <h2>
                      {mode === "spot"
                        ? "Paint Blur Areas"
                        : "Live Preview"}
                    </h2>

                    <p>
                      {mode === "spot"
                        ? "Press and drag your mouse or finger over the areas to blur."
                        : "See the blur effect in real time."}
                    </p>
                  </div>

                  <button
                    className="blur-secondary-button"
                    onClick={changeImage}
                  >
                    Change Image
                  </button>

                </div>

                <div
                  className={`blur-preview-stage ${
                    mode === "spot" ? "spot-stage" : ""
                  }`}
                >

                  <img
                    ref={imageRef}
                    src={imageUrl}
                    alt="Original image"
                    className="blur-source-image"
                    onLoad={() => setError("")}
                  />

                  <canvas
                    ref={canvasRef}
                    className={`blur-result-canvas ${
                      mode === "spot" ? "spot-canvas" : ""
                    }`}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={finishStroke}
                    onPointerCancel={finishStroke}
                    onLostPointerCapture={finishStroke}
                    style={{
                      cursor:
                        mode === "spot" ? "crosshair" : "default"
                    }}
                  />

                </div>

                <div className="blur-image-info">

                  <span>📄 {imageFile.name}</span>

                  <span>
                    {imageRef.current?.naturalWidth || "—"} ×{" "}
                    {imageRef.current?.naturalHeight || "—"} px
                  </span>

                </div>

                {mode === "spot" && (
                  <div className="blur-brush-tip">
                    <span>💡</span>

                    Paint over the image to select areas.
                    The selected areas will be blurred.
                  </div>
                )}

              </div>

              {/* CONTROLS */}

              <aside className="blur-controls">

                <div className="blur-controls-heading">

                  <div>
                    <h2>Blur Settings</h2>
                    <p>Customize your blur effect.</p>
                  </div>

                  <button
                    className="blur-reset-button"
                    onClick={resetSettings}
                  >
                    Reset
                  </button>

                </div>

                {/* BLUR INTENSITY */}

                <div className="blur-slider-group">

                  <div className="blur-slider-label">

                    <label htmlFor="blur-slider">
                      🌫️ Blur Intensity
                    </label>

                    <output>{blur}px</output>

                  </div>

                  <input
                    id="blur-slider"
                    type="range"
                    min="0"
                    max="30"
                    step="0.5"
                    value={blur}
                    onChange={(event) =>
                      setBlur(Number(event.target.value))
                    }
                    style={{
                      "--slider-progress": `${(blur / 30) * 100}%`
                    }}
                  />

                  <div className="blur-range-labels">
                    <span>Clear</span>
                    <span>Medium</span>
                    <span>Strong</span>
                  </div>

                </div>

                {/* SPOT BLUR BRUSH SETTINGS */}

                {mode === "spot" && (
                  <>
                    <div className="blur-slider-group">

                      <div className="blur-slider-label">

                        <label htmlFor="brush-size">
                          🖌️ Brush Size
                        </label>

                        <output>{brushSize}px</output>

                      </div>

                      <input
                        id="brush-size"
                        type="range"
                        min="10"
                        max="120"
                        step="5"
                        value={brushSize}
                        onChange={(event) =>
                          setBrushSize(Number(event.target.value))
                        }
                        style={{
                          "--slider-progress":
                            `${((brushSize - 10) / 110) * 100}%`
                        }}
                      />

                      <div className="blur-range-labels">
                        <span>Small</span>
                        <span>Medium</span>
                        <span>Large</span>
                      </div>

                    </div>

                    <div className="blur-spot-actions">

                      <div>
                        <strong>Selected strokes</strong>
                        <span>{strokes.length}</span>
                      </div>

                      <button
                        onClick={undoStroke}
                        disabled={!strokes.length}
                      >
                        ↶ Undo
                      </button>

                      <button
                        onClick={clearStrokes}
                        disabled={
                          !strokes.length && !activeStroke
                        }
                      >
                        Clear All
                      </button>

                    </div>
                  </>
                )}

                {/* FULL BLUR PRESETS */}

                {mode === "full" && (
                  <div className="blur-presets">

                    <p>Quick presets</p>

                    <div className="blur-preset-buttons">

                      {[0, 3, 7, 15].map((value) => (
                        <button
                          key={value}
                          className={
                            blur === value ? "active-preset" : ""
                          }
                          onClick={() => setBlur(value)}
                        >
                          {value === 0
                            ? "None"
                            : value === 3
                            ? "Light"
                            : value === 7
                            ? "Medium"
                            : "Strong"}
                        </button>
                      ))}

                    </div>

                  </div>
                )}

                {/* DOWNLOAD FORMAT */}

                <div className="blur-format-group">

                  <label htmlFor="blur-format">
                    Download format
                  </label>

                  <select
                    id="blur-format"
                    value={outputFormat}
                    onChange={(event) =>
                      setOutputFormat(event.target.value)
                    }
                  >
                    <option value="image/png">PNG</option>
                    <option value="image/jpeg">JPG</option>
                    <option value="image/webp">WebP</option>
                  </select>

                </div>

                <button
                  className="blur-primary-button blur-download-button"
                  onClick={downloadImage}
                  disabled={isDownloading}
                >
                  {isDownloading
                    ? "Preparing image..."
                    : "⬇ Download Edited Image"}
                </button>

                <button
                  className="blur-text-button"
                  onClick={resetSettings}
                >
                  Restore settings
                </button>

              </aside>

            </section>
          </>
        )}

        {error && (
          <p className="blur-error" role="alert">
            {error}
          </p>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="blur-hidden-input"
          onChange={handleFile}
        />

      </div>
    </main>
  );
}

export default ImageBlur;