
import { useEffect, useRef, useState } from "react";
import "./ImageText.css";

const fonts = [
  "Arial",
  "Georgia",
  "Times New Roman",
  "Verdana",
  "Courier New",
  "Impact",
  "Trebuchet MS",
];

function ImageText({ onBack }) {
  const imageRef = useRef(null);
  const previewRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const dragRef = useRef(null);

  const [imageUrl, setImageUrl] = useState("");
  const [imageLoaded, setImageLoaded] = useState(false);
  const [texts, setTexts] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [outputFormat, setOutputFormat] = useState("png");
  const [error, setError] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);

  const selectedText = texts.find((item) => item.id === selectedId);

  // Clean up uploaded image URL
  useEffect(() => {
    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [imageUrl]);

  // Draw image and text on preview and export canvases
  useEffect(() => {
    const image = imageRef.current;
    const previewCanvas = previewRef.current;
    const exportCanvas = canvasRef.current;

    if (
      !image ||
      !previewCanvas ||
      !exportCanvas ||
      !imageLoaded ||
      !image.naturalWidth
    ) {
      return;
    }

    const drawImageAndText = (targetCanvas) => {
      targetCanvas.width = image.naturalWidth;
      targetCanvas.height = image.naturalHeight;

      const ctx = targetCanvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);

      // Draw original image
      ctx.drawImage(
        image,
        0,
        0,
        targetCanvas.width,
        targetCanvas.height
      );

      // Draw all text layers
      texts.forEach((item) => {
        if (!item.text) return;

        const fontStyle = item.italic ? "italic " : "";
        const fontWeight = item.bold ? "bold " : "";

        ctx.font = `${fontStyle}${fontWeight}${item.fontSize}px "${item.fontFamily}"`;
        ctx.fillStyle = item.color;
        ctx.textAlign = item.align;
        ctx.textBaseline = "middle";

        ctx.shadowColor = item.shadow
          ? "rgba(0,0,0,0.7)"
          : "transparent";

        ctx.shadowBlur = item.shadow ? 4 : 0;
        ctx.shadowOffsetX = item.shadow ? 2 : 0;
        ctx.shadowOffsetY = item.shadow ? 2 : 0;

        ctx.fillText(item.text, item.x, item.y);
      });

      // Reset shadow
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    };

    drawImageAndText(previewCanvas);
    drawImageAndText(exportCanvas);
  }, [texts, imageLoaded, imageUrl]);

  // Upload image
  const handleUpload = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image.");
      return;
    }

    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);
    }

    const newUrl = URL.createObjectURL(file);

    setImageUrl(newUrl);
    setImageLoaded(false);
    setTexts([]);
    setSelectedId(null);
    setError("");

    // Allow selecting the same image again
    event.target.value = "";
  };

  // Add new text
  const addText = () => {
    const image = imageRef.current;

    if (!image || !imageLoaded) return;

    const newText = {
      id: Date.now() + Math.random(),
      text: "Your Text",
      x: image.naturalWidth / 2,
      y: image.naturalHeight / 2,
      fontSize: Math.max(
        24,
        Math.round(image.naturalWidth / 20)
      ),
      fontFamily: "Arial",
      color: "#ffffff",
      bold: true,
      italic: false,
      align: "center",
      shadow: true,
    };

    setTexts((previous) => [...previous, newText]);
    setSelectedId(newText.id);
  };

  // Update selected text
  const updateSelected = (changes) => {
    setTexts((previous) =>
      previous.map((item) =>
        item.id === selectedId
          ? { ...item, ...changes }
          : item
      )
    );
  };

  // Delete selected text
  const deleteSelected = () => {
    setTexts((previous) =>
      previous.filter((item) => item.id !== selectedId)
    );

    setSelectedId(null);
  };

  // Get pointer position relative to original image
  const getCanvasPoint = (event) => {
    const canvas = previewRef.current;

    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();

    if (!rect.width || !rect.height) return null;

    return {
      x:
        (event.clientX - rect.left) *
        (canvas.width / rect.width),

      y:
        (event.clientY - rect.top) *
        (canvas.height / rect.height),
    };
  };

  // Start dragging selected text
  const handlePointerDown = (event) => {
    if (!selectedText) return;

    const point = getCanvasPoint(event);

    if (!point) return;

    dragRef.current = {
      id: selectedText.id,
      offsetX: point.x - selectedText.x,
      offsetY: point.y - selectedText.y,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  };

  // Move selected text
  const handlePointerMove = (event) => {
    if (!dragRef.current) return;

    const point = getCanvasPoint(event);

    if (!point) return;

    const { id, offsetX, offsetY } = dragRef.current;

    setTexts((previous) =>
      previous.map((item) => {
        if (item.id !== id) return item;

        return {
          ...item,
          x: Math.max(
            0,
            Math.min(
              previewRef.current.width,
              point.x - offsetX
            )
          ),
          y: Math.max(
            0,
            Math.min(
              previewRef.current.height,
              point.y - offsetY
            )
          ),
        };
      })
    );
  };

  const handlePointerUp = () => {
    dragRef.current = null;
  };

  // Download edited image
  const downloadImage = () => {
    const canvas = canvasRef.current;

    if (!canvas || !imageLoaded) return;

    setIsDownloading(true);
    setError("");

    try {
      const mimeType =
        outputFormat === "jpg"
          ? "image/jpeg"
          : `image/${outputFormat}`;

      const link = document.createElement("a");

      link.download = `edited-image.${outputFormat}`;
      link.href = canvas.toDataURL(mimeType, 0.95);

      link.click();
    } catch {
      setError("Unable to download image. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  // Clear all text
  const resetEditor = () => {
    setTexts([]);
    setSelectedId(null);
  };

  return (
    <div className="image-text-page">
      <div className="image-text-container">

        <button
          className="image-text-back"
          onClick={onBack}
        >
          ← Back to Image Editor
        </button>

        <div className="image-text-heading">
          <h1>Add Text to Image</h1>
          <p>
            Add and customize text on your images with simple controls.
          </p>
        </div>

        {!imageUrl ? (
          <div className="image-text-upload">
            <div className="image-text-upload-icon">T</div>

            <h2>Upload an Image</h2>

            <p>Choose an image to start adding text.</p>

            <button
              className="image-text-primary"
              onClick={() => fileInputRef.current?.click()}
            >
              Choose Image
            </button>

            <span>Supports JPG, PNG and WebP</span>
          </div>
        ) : (
          <>
            <div className="image-text-toolbar">

              <button
                className="image-text-secondary"
                onClick={() => fileInputRef.current?.click()}
              >
                Change Image
              </button>

              <button
                className="image-text-secondary"
                onClick={resetEditor}
                disabled={texts.length === 0}
              >
                Clear Text
              </button>

              <button
                className="image-text-primary"
                onClick={addText}
                disabled={!imageLoaded}
              >
                + Add Text
              </button>

            </div>

            <div className="image-text-workspace">

              {/* Image Preview */}
              <div className="image-text-preview-card">

                <div className="image-text-preview-heading">
                  <h3>Image Preview</h3>
                  <span>
                    Drag the selected text to move it
                  </span>
                </div>

                <div className="image-text-preview-stage">

                  <img
                    ref={imageRef}
                    src={imageUrl}
                    alt="Uploaded image"
                    className="image-text-source"
                    onLoad={() => {
                      setImageLoaded(true);
                      setError("");
                    }}
                    onError={() => {
                      setError("Unable to load this image.");
                      setImageLoaded(false);
                    }}
                  />

                  {imageLoaded && (
                    <canvas
                      ref={previewRef}
                      className="image-text-preview-canvas"
                      onPointerDown={handlePointerDown}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      onPointerCancel={handlePointerUp}
                      onLostPointerCapture={handlePointerUp}
                    />
                  )}

                  {!imageLoaded && (
                    <p className="image-text-loading">
                      Loading image...
                    </p>
                  )}

                </div>

                <p className="image-text-preview-note">
                  Select a text layer before dragging it.
                </p>

              </div>

              {/* Editing Controls */}
              <div className="image-text-controls">

                {/* Text Layers */}
                <div className="image-text-panel">

                  <h3>Text Layers</h3>

                  {texts.length === 0 ? (
                    <p className="image-text-empty">
                      No text added yet. Click Add Text to begin.
                    </p>
                  ) : (
                    <div className="image-text-layer-list">

                      {texts.map((item, index) => (
                        <button
                          key={item.id}
                          className={`image-text-layer ${
                            selectedId === item.id
                              ? "active"
                              : ""
                          }`}
                          onClick={() => setSelectedId(item.id)}
                        >
                          <span>
                            {item.text || "Empty Text"}
                          </span>

                          <small>
                            Layer {index + 1}
                          </small>
                        </button>
                      ))}

                    </div>
                  )}

                </div>

                {/* Edit Selected Text */}
                {selectedText && (
                  <div className="image-text-panel">

                    <div className="image-text-panel-title">
                      <h3>Edit Text</h3>

                      <button
                        className="image-text-delete"
                        onClick={deleteSelected}
                      >
                        Delete
                      </button>
                    </div>

                    <label>Text Content</label>

                    <textarea
                      value={selectedText.text}
                      onChange={(event) =>
                        updateSelected({
                          text: event.target.value,
                        })
                      }
                      rows="3"
                      placeholder="Enter your text"
                    />

                    <label>Font Family</label>

                    <select
                      value={selectedText.fontFamily}
                      onChange={(event) =>
                        updateSelected({
                          fontFamily: event.target.value,
                        })
                      }
                    >
                      {fonts.map((font) => (
                        <option key={font} value={font}>
                          {font}
                        </option>
                      ))}
                    </select>

                    <div className="image-text-control-row">

                      <div>
                        <label>Font Size</label>

                        <input
                          type="number"
                          min="8"
                          max="300"
                          value={selectedText.fontSize}
                          onChange={(event) =>
                            updateSelected({
                              fontSize: Math.max(
                                8,
                                Math.min(
                                  300,
                                  Number(event.target.value) || 8
                                )
                              ),
                            })
                          }
                        />
                      </div>

                      <div>
                        <label>Text Color</label>

                        <input
                          type="color"
                          value={selectedText.color}
                          onChange={(event) =>
                            updateSelected({
                              color: event.target.value,
                            })
                          }
                        />
                      </div>

                    </div>

                    <label>Text Style</label>

                    <div className="image-text-style-buttons">

                      <button
                        className={
                          selectedText.bold ? "active" : ""
                        }
                        onClick={() =>
                          updateSelected({
                            bold: !selectedText.bold,
                          })
                        }
                      >
                        <b>B</b>
                      </button>

                      <button
                        className={
                          selectedText.italic ? "active" : ""
                        }
                        onClick={() =>
                          updateSelected({
                            italic: !selectedText.italic,
                          })
                        }
                      >
                        <i>I</i>
                      </button>

                      <button
                        className={
                          selectedText.shadow ? "active" : ""
                        }
                        onClick={() =>
                          updateSelected({
                            shadow: !selectedText.shadow,
                          })
                        }
                      >
                        Shadow
                      </button>

                    </div>

                    <label>Text Alignment</label>

                    <div className="image-text-align-buttons">

                      {["left", "center", "right"].map((align) => (
                        <button
                          key={align}
                          className={
                            selectedText.align === align
                              ? "active"
                              : ""
                          }
                          onClick={() =>
                            updateSelected({ align })
                          }
                        >
                          {align.charAt(0).toUpperCase() +
                            align.slice(1)}
                        </button>
                      ))}

                    </div>

                  </div>
                )}

                {/* Download */}
                <div className="image-text-panel">

                  <h3>Download Image</h3>

                  <label>Output Format</label>

                  <select
                    value={outputFormat}
                    onChange={(event) =>
                      setOutputFormat(event.target.value)
                    }
                  >
                    <option value="png">PNG</option>
                    <option value="jpg">JPG</option>
                    <option value="webp">WebP</option>
                  </select>

                  <button
                    className="image-text-download"
                    onClick={downloadImage}
                    disabled={!imageLoaded || isDownloading}
                  >
                    {isDownloading
                      ? "Preparing..."
                      : "Download Image"}
                  </button>

                </div>

              </div>

            </div>
          </>
        )}

        {error && (
          <p className="image-text-error">
            {error}
          </p>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          hidden
          onChange={handleUpload}
        />

        {/* Separate canvas used for exporting */}
        <canvas
          ref={canvasRef}
          className="image-text-export-canvas"
        />

      </div>
    </div>
  );
}

export default ImageText;
