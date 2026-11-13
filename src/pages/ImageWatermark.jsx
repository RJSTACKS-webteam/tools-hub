
import { useEffect, useRef, useState } from "react";
import "./ImageWatermark.css";

function ImageWatermark({ onBack }) {
  const imageRef = useRef(null);
  const previewRef = useRef(null);
  const exportRef = useRef(null);
  const fileInputRef = useRef(null);
  const dragRef = useRef(null);

  const [imageUrl, setImageUrl] = useState("");
  const [imageLoaded, setImageLoaded] = useState(false);
  const [watermark, setWatermark] = useState("Your Watermark");
  const [fontFamily, setFontFamily] = useState("Arial");
  const [fontSize, setFontSize] = useState(40);
  const [color, setColor] = useState("#ffffff");
  const [opacity, setOpacity] = useState(60);
  const [rotation, setRotation] = useState(-25);
  const [tiled, setTiled] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [outputFormat, setOutputFormat] = useState("png");
  const [error, setError] = useState("");

  const fonts = [
    "Arial",
    "Georgia",
    "Times New Roman",
    "Verdana",
    "Courier New",
    "Impact",
    "Trebuchet MS",
  ];

  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl]);

  // Draw watermark on preview and export canvases
  useEffect(() => {
    const image = imageRef.current;
    const preview = previewRef.current;
    const exportCanvas = exportRef.current;

    if (!image || !preview || !exportCanvas || !imageLoaded) return;

    const drawWatermark = (canvas) => {
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

      if (!watermark.trim()) return;

      ctx.save();
      ctx.globalAlpha = opacity / 100;
      ctx.fillStyle = color;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `bold ${fontSize}px "${fontFamily}"`;

      if (tiled) {
        const textWidth = ctx.measureText(watermark).width;
        const horizontalGap = Math.max(textWidth + 100, 180);
        const verticalGap = Math.max(fontSize * 3, 100);

        for (
          let y = -canvas.height;
          y < canvas.height * 2;
          y += verticalGap
        ) {
          for (
            let x = -canvas.width;
            x < canvas.width * 2;
            x += horizontalGap
          ) {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate((rotation * Math.PI) / 180);
            ctx.fillText(watermark, 0, 0);
            ctx.restore();
          }
        }
      } else {
        ctx.translate(position.x, position.y);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.fillText(watermark, 0, 0);
      }

      ctx.restore();
    };

    drawWatermark(preview);
    drawWatermark(exportCanvas);
  }, [
    imageLoaded,
    imageUrl,
    watermark,
    fontFamily,
    fontSize,
    color,
    opacity,
    rotation,
    tiled,
    position,
  ]);

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
    setError("");
    setTiled(false);
    setWatermark("Your Watermark");
    setRotation(-25);
    setOpacity(60);

    event.target.value = "";
  };

  const handleImageLoad = () => {
    const image = imageRef.current;
    if (!image) return;

    setPosition({
      x: image.naturalWidth / 2,
      y: image.naturalHeight / 2,
    });

    setFontSize(
      Math.max(20, Math.round(image.naturalWidth / 20))
    );

    setImageLoaded(true);
  };

  const getCanvasPoint = (event) => {
    const canvas = previewRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();

    if (!rect.width || !rect.height) return null;

    return {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const handlePointerDown = (event) => {
    if (tiled || !watermark.trim()) return;

    const point = getCanvasPoint(event);
    if (!point) return;

    dragRef.current = {
      offsetX: point.x - position.x,
      offsetY: point.y - position.y,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event) => {
    if (!dragRef.current || tiled) return;

    const point = getCanvasPoint(event);
    if (!point) return;

    setPosition({
      x: Math.max(
        0,
        Math.min(
          previewRef.current.width,
          point.x - dragRef.current.offsetX
        )
      ),
      y: Math.max(
        0,
        Math.min(
          previewRef.current.height,
          point.y - dragRef.current.offsetY
        )
      ),
    });
  };

  const handlePointerUp = () => {
    dragRef.current = null;
  };

  const downloadImage = () => {
    const canvas = exportRef.current;
    if (!canvas || !imageLoaded) return;

    try {
      const mimeType =
        outputFormat === "jpg"
          ? "image/jpeg"
          : `image/${outputFormat}`;

      const link = document.createElement("a");
      link.download = `watermarked-image.${outputFormat}`;
      link.href = canvas.toDataURL(mimeType, 0.95);
      link.click();
    } catch {
      setError("Unable to download the image. Please try again.");
    }
  };

  return (
    <div className="watermark-page">
      <div className="watermark-container">

        <button className="watermark-back" onClick={onBack}>
          ← Back to Image Editor
        </button>

        <div className="watermark-heading">
          <h1>Add Watermark</h1>
          <p>Protect your images with a custom text watermark.</p>
        </div>

        {!imageUrl ? (
          <div className="watermark-upload">
            <div className="watermark-upload-icon">W</div>
            <h2>Upload an Image</h2>
            <p>Choose an image to add your watermark.</p>

            <button
              className="watermark-primary"
              onClick={() => fileInputRef.current?.click()}
            >
              Choose Image
            </button>

            <span>Supports JPG, PNG and WebP</span>
          </div>
        ) : (
          <>
            <div className="watermark-toolbar">
              <button
                className="watermark-secondary"
                onClick={() => fileInputRef.current?.click()}
              >
                Change Image
              </button>
            </div>

            <div className="watermark-workspace">

              <div className="watermark-preview-card">
                <div className="watermark-preview-heading">
                  <h3>Image Preview</h3>
                  <span>
                    {tiled
                      ? "Tiled watermark preview"
                      : "Drag watermark to reposition"}
                  </span>
                </div>

                <div className="watermark-preview-stage">
                  <img
                    ref={imageRef}
                    src={imageUrl}
                    alt="Uploaded image"
                    className="watermark-source"
                    onLoad={handleImageLoad}
                    onError={() => {
                      setError("Unable to load this image.");
                    }}
                  />

                  {imageLoaded && (
                    <canvas
                      ref={previewRef}
                      className={`watermark-canvas ${
                        tiled ? "watermark-tiled" : ""
                      }`}
                      onPointerDown={handlePointerDown}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      onPointerCancel={handlePointerUp}
                      onLostPointerCapture={handlePointerUp}
                    />
                  )}

                  {!imageLoaded && <p>Loading image...</p>}
                </div>

                <p className="watermark-note">
                  Your watermark is included in the downloaded image.
                </p>
              </div>

              <div className="watermark-controls">

                <div className="watermark-panel">
                  <h3>Watermark Text</h3>

                  <label>Text Content</label>
                  <textarea
                    rows="3"
                    value={watermark}
                    onChange={(event) =>
                      setWatermark(event.target.value)
                    }
                    placeholder="Enter watermark text"
                  />

                  <label>Font Family</label>
                  <select
                    value={fontFamily}
                    onChange={(event) =>
                      setFontFamily(event.target.value)
                    }
                  >
                    {fonts.map((font) => (
                      <option key={font} value={font}>
                        {font}
                      </option>
                    ))}
                  </select>

                  <div className="watermark-control-row">
                    <div>
                      <label>Font Size</label>
                      <input
                        type="number"
                        min="8"
                        max="300"
                        value={fontSize}
                        onChange={(event) =>
                          setFontSize(
                            Math.max(
                              8,
                              Math.min(
                                300,
                                Number(event.target.value) || 8
                              )
                            )
                          )
                        }
                      />
                    </div>

                    <div>
                      <label>Text Color</label>
                      <input
                        type="color"
                        value={color}
                        onChange={(event) =>
                          setColor(event.target.value)
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="watermark-panel">
                  <h3>Appearance</h3>

                  <label>Opacity: {opacity}%</label>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    value={opacity}
                    onChange={(event) =>
                      setOpacity(Number(event.target.value))
                    }
                  />

                  <label>Rotation: {rotation}°</label>
                  <input
                    type="range"
                    min="-90"
                    max="90"
                    value={rotation}
                    onChange={(event) =>
                      setRotation(Number(event.target.value))
                    }
                  />

                  <label className="watermark-checkbox">
                    <input
                      type="checkbox"
                      checked={tiled}
                      onChange={(event) =>
                        setTiled(event.target.checked)
                      }
                    />
                    Repeat watermark across image
                  </label>

                  {!tiled && (
                    <p className="watermark-hint">
                      Drag the watermark on the preview to change its position.
                    </p>
                  )}
                </div>

                <div className="watermark-panel">
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
                    className="watermark-download"
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
          <p className="watermark-error">{error}</p>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          hidden
          onChange={handleUpload}
        />

        <canvas
          ref={exportRef}
          className="watermark-export-canvas"
        />
      </div>
    </div>
  );
}

export default ImageWatermark;
