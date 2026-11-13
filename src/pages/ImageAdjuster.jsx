import { useEffect, useRef, useState } from "react";
import "./ImageAdjuster.css";

function ImageAdjuster({ onBack }) {
  const [imageFile, setImageFile] = useState(null);
  const [imageUrl, setImageUrl] = useState("");
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [outputFormat, setOutputFormat] = useState("image/png");
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);
  const imageRef = useRef(null);

  useEffect(() => {
    if (!imageFile) {
      setImageUrl("");
      return undefined;
    }

    const url = URL.createObjectURL(imageFile);
    setImageUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const filterValue = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;

  const handleFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Please choose a JPG, PNG or WebP image.");
      event.target.value = "";
      return;
    }

    setError("");
    setImageFile(file);
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
  };

  const resetAdjustments = () => {
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
  };

  const downloadImage = () => {
    const image = imageRef.current;
    if (!image || !image.complete || !image.naturalWidth) {
      setError("Please wait for the image preview to finish loading.");
      return;
    }

    setIsDownloading(true);
    setError("");

    try {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;

      const context = canvas.getContext("2d");
      if (!context) throw new Error("Your browser could not create the image.");

      context.filter = filterValue;
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      const mimeType = outputFormat;
      const quality = mimeType === "image/jpeg" ? 0.92 : undefined;

      canvas.toBlob((blob) => {
        setIsDownloading(false);

        if (!blob) {
          setError("Could not export this image. Please try another format.");
          return;
        }

        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        const extension =
          mimeType === "image/jpeg" ? "jpg" :
          mimeType === "image/webp" ? "webp" : "png";

        const originalName = imageFile?.name?.replace(/\.[^.]+$/, "") || "image";
        link.href = downloadUrl;
        link.download = `${originalName}-edited.${extension}`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(downloadUrl);
      }, mimeType, quality);
    } catch (downloadError) {
      setIsDownloading(false);
      setError(downloadError.message || "Something went wrong while exporting.");
    }
  };

  return (
    <main className="adjuster-page">
      <div className="adjuster-shell">
        <button className="adjuster-back" onClick={onBack}>
          <span>←</span> Back to Image Editor
        </button>

        <header className="adjuster-heading">
          <span className="adjuster-heading-icon">☀️</span>
          <div>
            <p className="adjuster-eyebrow">IMAGE EDITOR</p>
            <h1>Brightness &amp; Contrast</h1>
            <p className="adjuster-subtitle">
              Fine-tune your image with simple, real-time adjustments.
            </p>
          </div>
        </header>

        {!imageFile ? (
          <section className="adjuster-upload-card">
            <div className="adjuster-upload-icon">🖼️</div>
            <h2>Upload an image to get started</h2>
            <p>Choose a JPG, PNG or WebP image from your device.</p>
            <button
              className="adjuster-primary-button"
              onClick={() => fileInputRef.current?.click()}
            >
              <span>＋</span> Choose Image
            </button>
            <span className="adjuster-file-note">Supported formats: JPG, PNG, WebP</span>
          </section>
        ) : (
          <section className="adjuster-workspace">
            <div className="adjuster-preview-panel">
              <div className="adjuster-panel-heading">
                <div>
                  <h2>Live Preview</h2>
                  <p>Your changes appear here instantly.</p>
                </div>
                <button
                  className="adjuster-secondary-button"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Change Image
                </button>
              </div>

              <div className="adjuster-preview-stage">
                <img
                  ref={imageRef}
                  src={imageUrl}
                  alt="Image preview"
                  style={{ filter: filterValue }}
                  onLoad={() => setError("")}
                />
              </div>

              <div className="adjuster-image-info">
                <span>📄 {imageFile.name}</span>
                <span>{imageRef.current?.naturalWidth || "—"} × {imageRef.current?.naturalHeight || "—"} px</span>
              </div>
            </div>

            <aside className="adjuster-controls">
              <div className="adjuster-controls-heading">
                <div>
                  <h2>Adjustments</h2>
                  <p>Move the sliders to edit.</p>
                </div>
                <button className="adjuster-reset-button" onClick={resetAdjustments}>
                  Reset
                </button>
              </div>

              <div className="adjuster-slider-group">
                <div className="adjuster-slider-label">
                  <label htmlFor="brightness-slider">☀️ Brightness</label>
                  <output>{brightness}%</output>
                </div>
                <input
                  id="brightness-slider"
                  type="range"
                  min="0"
                  max="200"
                  value={brightness}
                  onChange={(event) => setBrightness(Number(event.target.value))}
                  style={{ "--slider-progress": `${brightness / 2}%` }}
                />
                <div className="adjuster-range-labels"><span>0%</span><span>100%</span><span>200%</span></div>
              </div>

              <div className="adjuster-slider-group">
                <div className="adjuster-slider-label">
                  <label htmlFor="contrast-slider">◐ Contrast</label>
                  <output>{contrast}%</output>
                </div>
                <input
                  id="contrast-slider"
                  type="range"
                  min="0"
                  max="200"
                  value={contrast}
                  onChange={(event) => setContrast(Number(event.target.value))}
                  style={{ "--slider-progress": `${contrast / 2}%` }}
                />
                <div className="adjuster-range-labels"><span>0%</span><span>100%</span><span>200%</span></div>
              </div>

              <div className="adjuster-slider-group">
                <div className="adjuster-slider-label">
                  <label htmlFor="saturation-slider">🎨 Saturation</label>
                  <output>{saturation}%</output>
                </div>
                <input
                  id="saturation-slider"
                  type="range"
                  min="0"
                  max="200"
                  value={saturation}
                  onChange={(event) => setSaturation(Number(event.target.value))}
                  style={{ "--slider-progress": `${saturation / 2}%` }}
                />
                <div className="adjuster-range-labels"><span>0%</span><span>100%</span><span>200%</span></div>
              </div>

              <div className="adjuster-format-group">
                <label htmlFor="adjuster-format">Download format</label>
                <select
                  id="adjuster-format"
                  value={outputFormat}
                  onChange={(event) => setOutputFormat(event.target.value)}
                >
                  <option value="image/png">PNG</option>
                  <option value="image/jpeg">JPG</option>
                  <option value="image/webp">WebP</option>
                </select>
              </div>

              <button
                className="adjuster-primary-button adjuster-download-button"
                onClick={downloadImage}
                disabled={isDownloading}
              >
                {isDownloading ? "Preparing image..." : "⬇ Download Edited Image"}
              </button>
              <button className="adjuster-text-button" onClick={resetAdjustments}>
                Restore original adjustments
              </button>
            </aside>
          </section>
        )}

        {error && <p className="adjuster-error" role="alert">{error}</p>}

        <input
          ref={fileInputRef}
          className="adjuster-hidden-input"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFile}
        />
      </div>
    </main>
  );
}

export default ImageAdjuster;
