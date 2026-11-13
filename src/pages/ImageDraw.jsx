
import { useEffect, useRef, useState } from "react";
import "./ImageDraw.css";

function ImageDraw({ onBack }) {
  const imageRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const drawingRef = useRef(false);
  const strokesRef = useRef([]);

  const [imageUrl, setImageUrl] = useState("");
  const [imageLoaded, setImageLoaded] = useState(false);
  const [color, setColor] = useState("#ff0000");
  const [brushSize, setBrushSize] = useState(8);
  const [tool, setTool] = useState("brush");
  const [outputFormat, setOutputFormat] = useState("png");
  const [strokeCount, setStrokeCount] = useState(0);
  const [error, setError] = useState("");

  const drawCanvas = (strokes = strokesRef.current) => {
    const canvas = canvasRef.current;
    const image = imageRef.current;

    if (!canvas || !image || !imageLoaded) return;

    const ctx = canvas.getContext("2d");

    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    strokes.forEach((stroke) => {
      if (!stroke.points.length) return;

      ctx.save();
      ctx.beginPath();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = stroke.size;

      if (stroke.tool === "eraser") {
        ctx.globalCompositeOperation = "destination-out";
        ctx.strokeStyle = "#000000";
      } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = stroke.color;
      }

      const firstPoint = stroke.points[0];

      ctx.moveTo(firstPoint.x, firstPoint.y);

      if (stroke.points.length === 1) {
        ctx.lineTo(firstPoint.x + 0.01, firstPoint.y + 0.01);
      } else {
        stroke.points.slice(1).forEach((point) => {
          ctx.lineTo(point.x, point.y);
        });
      }

      ctx.stroke();

      if (stroke.points.length === 1) {
        ctx.beginPath();
        ctx.arc(
          firstPoint.x,
          firstPoint.y,
          stroke.size / 2,
          0,
          Math.PI * 2
        );
        ctx.fillStyle = stroke.tool === "eraser" ? "#000000" : stroke.color;
        ctx.fill();
      }

      ctx.restore();
    });
  };

  useEffect(() => {
    if (imageLoaded) {
      drawCanvas();
    }
  }, [imageLoaded, imageUrl]);

  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl]);

  const handleUpload = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image.");
      return;
    }

    if (imageUrl) URL.revokeObjectURL(imageUrl);

    setImageUrl(URL.createObjectURL(file));
    setImageLoaded(false);
    strokesRef.current = [];
    setStrokeCount(0);
    setError("");

    event.target.value = "";
  };

  const getPosition = (event) => {
    const canvas = canvasRef.current;

    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();

    if (!rect.width || !rect.height) return null;

    return {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const startDrawing = (event) => {
    if (!imageLoaded) return;

    const point = getPosition(event);
    if (!point) return;

    drawingRef.current = true;

    const newStroke = {
      tool,
      color,
      size: brushSize,
      points: [point],
    };

    strokesRef.current = [...strokesRef.current, newStroke];
    setStrokeCount(strokesRef.current.length);

    event.currentTarget.setPointerCapture(event.pointerId);

    drawCanvas();
  };

  const draw = (event) => {
    if (!drawingRef.current) return;

    const point = getPosition(event);
    if (!point) return;

    const strokes = [...strokesRef.current];
    const lastStroke = strokes[strokes.length - 1];

    if (!lastStroke) return;

    lastStroke.points.push(point);

    strokesRef.current = strokes;

    drawCanvas(strokes);
  };

  const stopDrawing = () => {
    drawingRef.current = false;
  };

  const undo = () => {
    if (!strokesRef.current.length) return;

    strokesRef.current = strokesRef.current.slice(0, -1);
    setStrokeCount(strokesRef.current.length);
    drawCanvas();
  };

  const clearDrawing = () => {
    strokesRef.current = [];
    setStrokeCount(0);
    drawCanvas([]);
  };

  const downloadImage = () => {
    const canvas = canvasRef.current;

    if (!canvas || !imageLoaded) return;

    try {
      const mimeType =
        outputFormat === "jpg"
          ? "image/jpeg"
          : `image/${outputFormat}`;

      const link = document.createElement("a");

      link.download = `drawn-image.${outputFormat}`;
      link.href = canvas.toDataURL(mimeType, 0.95);
      link.click();
    } catch {
      setError("Unable to download the image. Please try again.");
    }
  };

  return (
    <div className="image-draw-page">
      <div className="image-draw-container">

        <button className="image-draw-back" onClick={onBack}>
          ← Back to Image Editor
        </button>

        <div className="image-draw-heading">
          <h1>Draw on Image</h1>
          <p>Draw, sketch and add marks to your images.</p>
        </div>

        {!imageUrl ? (
          <div className="image-draw-upload">
            <div className="image-draw-upload-icon">✎</div>
            <h2>Upload an Image</h2>
            <p>Choose an image to start drawing.</p>

            <button
              className="image-draw-primary"
              onClick={() => fileInputRef.current?.click()}
            >
              Choose Image
            </button>

            <span>Supports JPG, PNG and WebP</span>
          </div>
        ) : (
          <>
            <div className="image-draw-toolbar">
              <button
                className="image-draw-secondary"
                onClick={() => fileInputRef.current?.click()}
              >
                Change Image
              </button>

              <button
                className="image-draw-secondary"
                onClick={undo}
                disabled={strokeCount === 0}
              >
                ↶ Undo
              </button>

              <button
                className="image-draw-secondary"
                onClick={clearDrawing}
                disabled={strokeCount === 0}
              >
                Clear Drawing
              </button>
            </div>

            <div className="image-draw-workspace">

              <div className="image-draw-preview-card">
                <div className="image-draw-preview-heading">
                  <h3>Image Preview</h3>
                  <span>Draw directly on your image</span>
                </div>

                <div className="image-draw-preview-stage">
                  <img
                    ref={imageRef}
                    src={imageUrl}
                    alt="Uploaded image"
                    className="image-draw-source"
                    onLoad={() => {
                      setImageLoaded(true);
                      setError("");
                    }}
                    onError={() => {
                      setError("Unable to load this image.");
                    }}
                  />

                  {imageLoaded && (
                    <canvas
                      ref={canvasRef}
                      className="image-draw-canvas"
                      onPointerDown={startDrawing}
                      onPointerMove={draw}
                      onPointerUp={stopDrawing}
                      onPointerCancel={stopDrawing}
                      onLostPointerCapture={stopDrawing}
                    />
                  )}

                  {!imageLoaded && (
                    <p>Loading image...</p>
                  )}
                </div>

                <p className="image-draw-note">
                  Use your mouse or finger to draw.
                </p>
              </div>

              <div className="image-draw-controls">

                <div className="image-draw-panel">
                  <h3>Drawing Tools</h3>

                  <label>Choose Tool</label>

                  <div className="image-draw-tool-buttons">
                    <button
                      className={tool === "brush" ? "active" : ""}
                      onClick={() => setTool("brush")}
                    >
                      ✎ Brush
                    </button>

                    <button
                      className={tool === "eraser" ? "active" : ""}
                      onClick={() => setTool("eraser")}
                    >
                      ⌫ Eraser
                    </button>
                  </div>

                  <label>Brush Size: {brushSize}px</label>

                  <input
                    type="range"
                    min="1"
                    max="60"
                    value={brushSize}
                    onChange={(event) =>
                      setBrushSize(Number(event.target.value))
                    }
                  />

                  {tool === "brush" && (
                    <>
                      <label>Brush Color</label>

                      <div className="image-draw-color-row">
                        <input
                          type="color"
                          value={color}
                          onChange={(event) =>
                            setColor(event.target.value)
                          }
                        />

                        <span>{color.toUpperCase()}</span>
                      </div>

                      <div className="image-draw-color-presets">
                        {[
                          "#000000",
                          "#ffffff",
                          "#ff0000",
                          "#2563eb",
                          "#16a34a",
                          "#facc15",
                          "#ff00ff",
                          "#ff8800",
                        ].map((preset) => (
                          <button
                            key={preset}
                            title={preset}
                            style={{ backgroundColor: preset }}
                            className={
                              color === preset ? "selected" : ""
                            }
                            onClick={() => setColor(preset)}
                          />
                        ))}
                      </div>
                    </>
                  )}

                  <div className="image-draw-stroke-count">
                    Drawing strokes: <strong>{strokeCount}</strong>
                  </div>
                </div>

                <div className="image-draw-panel">
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
                    className="image-draw-download"
                    onClick={downloadImage}
                    disabled={!imageLoaded}
                  >
                    Download Image
                  </button>
                </div>

              </div>
            </div>
          </>
        )}

        {error && (
          <p className="image-draw-error">{error}</p>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          hidden
          onChange={handleUpload}
        />
      </div>
    </div>
  );
}

export default ImageDraw;
