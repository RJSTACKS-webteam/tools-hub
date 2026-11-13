import React, { useEffect, useRef, useState } from "react";
import "./BackgroundRemover.css";

function BackgroundRemover({ onBack }) {
  const [imageSrc, setImageSrc] = useState(null);
  const [imageName, setImageName] = useState("image");
  const [loaded, setLoaded] = useState(false);
  const [brushMode, setBrushMode] = useState("erase");
  const [brushSize, setBrushSize] = useState(30);
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");

  const previewRef = useRef(null);
  const maskRef = useRef(null);
  const imageRef = useRef(null);

  const drawingRef = useRef(false);
  const lastPointRef = useRef(null);
  const undoStackRef = useRef([]);
  const redoStackRef = useRef([]);

  // Load the selected image and initialize the mask.
  useEffect(() => {
    if (!imageSrc) return;

    setLoaded(false);

    const image = new Image();

    image.onload = () => {
      imageRef.current = image;

      const preview = previewRef.current;
      const mask = maskRef.current;

      if (!preview || !mask) return;

      preview.width = image.naturalWidth;
      preview.height = image.naturalHeight;

      mask.width = image.naturalWidth;
      mask.height = image.naturalHeight;

      const maskCtx = mask.getContext("2d");
      maskCtx.clearRect(0, 0, mask.width, mask.height);
      maskCtx.fillStyle = "#ffffff";
      maskCtx.fillRect(0, 0, mask.width, mask.height);

      undoStackRef.current = [maskCtx.getImageData(
        0,
        0,
        mask.width,
        mask.height
      )];

      redoStackRef.current = [];

      renderPreview();
      setLoaded(true);
    };

    image.onerror = () => {
      alert("Unable to load this image. Please try another image.");
    };

    image.src = imageSrc;
  }, [imageSrc]);

  // Draw the image using the current transparency mask.
  const renderPreview = () => {
    const preview = previewRef.current;
    const mask = maskRef.current;
    const image = imageRef.current;

    if (!preview || !mask || !image) return;

    const ctx = preview.getContext("2d");

    ctx.clearRect(0, 0, preview.width, preview.height);
    ctx.globalCompositeOperation = "source-over";
    ctx.drawImage(image, 0, 0);

    ctx.globalCompositeOperation = "destination-in";
    ctx.drawImage(mask, 0, 0);

    ctx.globalCompositeOperation = "source-over";
  };

  const handleUpload = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image.");
      return;
    }

    if (imageSrc) {
      URL.revokeObjectURL(imageSrc);
    }

    setImageName(file.name.replace(/\.[^/.]+$/, "") || "image");
    setImageSrc(URL.createObjectURL(file));
    event.target.value = "";
  };

  // Convert pointer position to the original image coordinates.
  const getCanvasPoint = (event) => {
    const canvas = previewRef.current;
    const rect = canvas.getBoundingClientRect();

    return {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const startDrawing = (event) => {
    if (!loaded || !maskRef.current) return;

    event.preventDefault();

    const mask = maskRef.current;
    const ctx = mask.getContext("2d");

    // Save the current mask for undo.
    undoStackRef.current.push(
      ctx.getImageData(0, 0, mask.width, mask.height)
    );

    if (undoStackRef.current.length > 30) {
      undoStackRef.current.shift();
    }

    redoStackRef.current = [];

    drawingRef.current = true;
    lastPointRef.current = getCanvasPoint(event);

    event.currentTarget.setPointerCapture(event.pointerId);

    drawBrushPoint(lastPointRef.current, lastPointRef.current);
  };

  const drawBrushPoint = (from, to) => {
    const mask = maskRef.current;
    const canvas = previewRef.current;

    if (!mask || !canvas) return;

    const ctx = mask.getContext("2d");
    const rect = canvas.getBoundingClientRect();

    const scale = canvas.width / rect.width;
    const size = brushSize * scale;

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = size;

    if (brushMode === "erase") {
      ctx.globalCompositeOperation = "destination-out";
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = "#ffffff";
      ctx.fillStyle = "#ffffff";
    }

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();

    if (
      brushMode === "restore" &&
      from.x === to.x &&
      from.y === to.y
    ) {
      ctx.beginPath();
      ctx.arc(to.x, to.y, size / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    renderPreview();
  };

  const continueDrawing = (event) => {
    if (!drawingRef.current) return;

    event.preventDefault();

    const currentPoint = getCanvasPoint(event);
    drawBrushPoint(lastPointRef.current, currentPoint);
    lastPointRef.current = currentPoint;
  };

  const stopDrawing = () => {
    drawingRef.current = false;
    lastPointRef.current = null;
  };

  const undo = () => {
    const mask = maskRef.current;
    if (!mask || undoStackRef.current.length <= 1) return;

    const ctx = mask.getContext("2d");

    redoStackRef.current.push(
      ctx.getImageData(0, 0, mask.width, mask.height)
    );

    undoStackRef.current.pop();

    const previous =
      undoStackRef.current[undoStackRef.current.length - 1];

    ctx.putImageData(previous, 0, 0);
    renderPreview();
  };

  const redo = () => {
    const mask = maskRef.current;
    if (!mask || redoStackRef.current.length === 0) return;

    const ctx = mask.getContext("2d");

    const next = redoStackRef.current.pop();

    undoStackRef.current.push(
      ctx.getImageData(0, 0, mask.width, mask.height)
    );

    ctx.putImageData(next, 0, 0);
    renderPreview();
  };

  const resetImage = () => {
    const mask = maskRef.current;
    if (!mask) return;

    const ctx = mask.getContext("2d");

    ctx.clearRect(0, 0, mask.width, mask.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, mask.width, mask.height);

    const initial = ctx.getImageData(
      0,
      0,
      mask.width,
      mask.height
    );

    undoStackRef.current = [initial];
    redoStackRef.current = [];

    renderPreview();
  };

  // Export the edited image as transparent PNG or coloured JPG.
  const downloadImage = (format) => {
    const image = imageRef.current;
    const mask = maskRef.current;

    if (!image || !mask) return;

    const width = image.naturalWidth;
    const height = image.naturalHeight;

    const output = document.createElement("canvas");
    output.width = width;
    output.height = height;

    const ctx = output.getContext("2d");

    if (format === "jpg") {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, width, height);
    }

    const imageLayer = document.createElement("canvas");
    imageLayer.width = width;
    imageLayer.height = height;

    const layerCtx = imageLayer.getContext("2d");
    layerCtx.drawImage(image, 0, 0);
    layerCtx.globalCompositeOperation = "destination-in";
    layerCtx.drawImage(mask, 0, 0);

    ctx.drawImage(imageLayer, 0, 0);

    const mimeType =
      format === "jpg" ? "image/jpeg" : "image/png";

    const link = document.createElement("a");
    link.download = `${imageName}-edited.${format}`;
    link.href = output.toDataURL(mimeType, 0.95);
    link.click();
  };

  const removeImage = () => {
    if (imageSrc) URL.revokeObjectURL(imageSrc);

    setImageSrc(null);
    setLoaded(false);
    imageRef.current = null;
    undoStackRef.current = [];
    redoStackRef.current = [];
  };

  return (
    <div className="bg-remover-page">
      <div className="bg-remover-header">
        <button className="bg-back-btn" onClick={onBack}>
          ← Back to Image Editor
        </button>

        <div>
          <h1>Background Remover</h1>
          <p>Erase backgrounds manually with precision.</p>
        </div>
      </div>

      {!imageSrc ? (
        <div className="bg-upload-section">
          <div className="bg-upload-box">
            <div className="bg-upload-icon">＋</div>
            <h2>Upload an Image</h2>
            <p>
              Select an image and manually erase the unwanted
              background.
            </p>

            <label className="bg-primary-btn">
              Choose Image
              <input
                type="file"
                accept="image/*"
                onChange={handleUpload}
                hidden
              />
            </label>

            <span>Supports JPG, PNG and WebP</span>
          </div>
        </div>
      ) : (
        <div className="bg-editor">
          <div className="bg-toolbar">
            <div className="bg-tool-group">
              <span className="bg-control-label">Brush Mode</span>

              <div className="bg-mode-buttons">
                <button
                  className={
                    brushMode === "erase" ? "active" : ""
                  }
                  onClick={() => setBrushMode("erase")}
                >
                  <span>⌫</span> Erase
                </button>

                <button
                  className={
                    brushMode === "restore" ? "active" : ""
                  }
                  onClick={() => setBrushMode("restore")}
                >
                  <span>↶</span> Restore
                </button>
              </div>
            </div>

            <div className="bg-tool-group bg-brush-control">
              <label className="bg-control-label">
                Brush Size: {brushSize}px
              </label>

              <input
                type="range"
                min="5"
                max="100"
                value={brushSize}
                onChange={(event) =>
                  setBrushSize(Number(event.target.value))
                }
              />
            </div>

            <div className="bg-history-buttons">
              <button
                onClick={undo}
                disabled={undoStackRef.current.length <= 1}
              >
                ↶ Undo
              </button>

              <button
                onClick={redo}
                disabled={redoStackRef.current.length === 0}
              >
                ↷ Redo
              </button>

              <button onClick={resetImage}>Reset</button>
            </div>
          </div>

          <div className="bg-workspace">
            <div className="bg-canvas-heading">
              <strong>Editing Canvas</strong>
              <span>
                {loaded
                  ? "Paint over the areas you want to remove."
                  : "Loading image..."}
              </span>
            </div>

            <div className="bg-canvas-wrapper">
              <canvas
                ref={previewRef}
                onPointerDown={startDrawing}
                onPointerMove={continueDrawing}
                onPointerUp={stopDrawing}
                onPointerCancel={stopDrawing}
                onLostPointerCapture={stopDrawing}
                style={{
                  display: loaded ? "block" : "none",
                  touchAction: "none",
                }}
              />

              <canvas
                ref={maskRef}
                style={{ display: "none" }}
              />

              {!loaded && <p>Loading image...</p>}
            </div>

            <div className="bg-canvas-tip">
              <strong>Tip:</strong> Use Erase to remove areas and
              Restore to bring them back. A checkerboard pattern
              represents transparency.
            </div>
          </div>

          <div className="bg-download-panel">
            <div className="bg-download-info">
              <h3>Download Your Image</h3>
              <p>
                PNG keeps the transparent background. JPG uses
                the background colour selected below.
              </p>
            </div>

            <div className="bg-download-actions">
              <button
                className="bg-download-btn"
                onClick={() => downloadImage("png")}
                disabled={!loaded}
              >
                Download PNG
              </button>

              <div className="bg-jpg-control">
                <label htmlFor="bg-color">
                  JPG Background
                </label>

                <input
                  id="bg-color"
                  type="color"
                  value={backgroundColor}
                  onChange={(event) =>
                    setBackgroundColor(event.target.value)
                  }
                />

                <button
                  onClick={() => downloadImage("jpg")}
                  disabled={!loaded}
                >
                  Download JPG
                </button>
              </div>
            </div>
          </div>

          <div className="bg-bottom-actions">
            <button className="bg-secondary-btn" onClick={removeImage}>
              Choose Another Image
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default BackgroundRemover;