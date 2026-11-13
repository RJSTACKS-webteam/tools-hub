import { useEffect, useRef, useState } from "react";
import "./ImageFilters.css";

const filters = [
  { id: "original", name: "Original", icon: "🖼️", css: "none" },
  { id: "grayscale", name: "Grayscale", icon: "⚫", css: "grayscale(100%)" },
  { id: "sepia", name: "Sepia", icon: "🟤", css: "sepia(100%)" },
  { id: "vintage", name: "Vintage", icon: "📷", css: "sepia(35%) contrast(90%) saturate(80%)" },
  { id: "warm", name: "Warm", icon: "🌅", css: "sepia(20%) saturate(140%)" },
  { id: "cool", name: "Cool", icon: "❄️", css: "saturate(90%) hue-rotate(15deg)" },
  { id: "invert", name: "Invert", icon: "🔄", css: "invert(100%)" },
  { id: "dramatic", name: "Dramatic", icon: "🎭", css: "contrast(150%) saturate(120%)" },
];

function ImageFilters({ onBack }) {
  const [imageFile, setImageFile] = useState(null);
  const [imageUrl, setImageUrl] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("original");
  const [outputFormat, setOutputFormat] = useState("image/png");
  const [error, setError] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);

  const fileInputRef = useRef(null);
  const imageRef = useRef(null);

  useEffect(() => {
    if (!imageFile) {
      setImageUrl("");
      return;
    }

    const url = URL.createObjectURL(imageFile);
    setImageUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const activeFilter =
    filters.find((filter) => filter.id === selectedFilter) || filters[0];

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
    setSelectedFilter("original");
  };

  const changeImage = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const downloadImage = () => {
    const image = imageRef.current;

    if (!image || !image.complete || !image.naturalWidth) {
      setError("Please wait for the image to load.");
      return;
    }

    setIsDownloading(true);
    setError("");

    try {
      const canvas = document.createElement("canvas");

      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;

      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("Could not create the image canvas.");
      }

      context.filter = activeFilter.css;
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      const quality =
        outputFormat === "image/jpeg" ? 0.92 : undefined;

      canvas.toBlob((blob) => {
        setIsDownloading(false);

        if (!blob) {
          setError("Unable to export this image. Please try again.");
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
        link.download = `${originalName}-${selectedFilter}.${extension}`;

        document.body.appendChild(link);
        link.click();
        link.remove();

        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }, outputFormat, quality);
    } catch (downloadError) {
      setIsDownloading(false);
      setError(downloadError.message || "Image export failed.");
    }
  };

  return (
    <main className="filters-page">
      <div className="filters-container">

        <button className="filters-back" onClick={onBack}>
          ← Back to Image Editor
        </button>

        <header className="filters-heading">
          <span className="filters-heading-icon">🎨</span>

          <div>
            <p className="filters-eyebrow">IMAGE EDITOR</p>
            <h1>Filters &amp; Effects</h1>
            <p>
              Give your images a different look with creative filters.
            </p>
          </div>
        </header>

        {!imageFile ? (
          <section className="filters-upload-card">
            <div className="filters-upload-icon">🖼️</div>

            <h2>Upload an image</h2>

            <p>
              Choose an image to start applying filters and effects.
            </p>

            <button
              className="filters-primary-button"
              onClick={changeImage}
            >
              ＋ Choose Image
            </button>

            <span className="filters-file-note">
              Supported formats: JPG, PNG and WebP
            </span>
          </section>
        ) : (
          <section className="filters-workspace">

            <div className="filters-preview-panel">

              <div className="filters-panel-heading">
                <div>
                  <h2>Image Preview</h2>
                  <p>Preview your selected filter.</p>
                </div>

                <button
                  className="filters-secondary-button"
                  onClick={changeImage}
                >
                  Change Image
                </button>
              </div>

              <div className="filters-preview-stage">
                <img
                  ref={imageRef}
                  src={imageUrl}
                  alt="Filtered image preview"
                  style={{ filter: activeFilter.css }}
                />
              </div>

              <div className="filters-image-info">
                <span>📄 {imageFile.name}</span>

                <span>
                  {imageRef.current?.naturalWidth || "—"} ×{" "}
                  {imageRef.current?.naturalHeight || "—"} px
                </span>
              </div>

            </div>

            <div className="filters-options-panel">

              <div className="filters-options-heading">
                <div>
                  <h2>Choose a Filter</h2>
                  <p>Select an effect for your image.</p>
                </div>
              </div>

              <div className="filters-grid">
                {filters.map((filter) => (
                  <button
                    key={filter.id}
                    className={`filter-card ${
                      selectedFilter === filter.id
                        ? "active-filter"
                        : ""
                    }`}
                    onClick={() => setSelectedFilter(filter.id)}
                  >
                    <span className="filter-icon">
                      {filter.icon}
                    </span>

                    <span>{filter.name}</span>

                    {selectedFilter === filter.id && (
                      <span className="filter-check">✓</span>
                    )}
                  </button>
                ))}
              </div>

              <div className="filters-selected-info">
                <span>Selected effect</span>
                <strong>{activeFilter.name}</strong>
              </div>

              <div className="filters-format-group">
                <label htmlFor="filters-format">
                  Download format
                </label>

                <select
                  id="filters-format"
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
                className="filters-primary-button filters-download-button"
                onClick={downloadImage}
                disabled={isDownloading}
              >
                {isDownloading
                  ? "Preparing image..."
                  : "⬇ Download Filtered Image"}
              </button>

              <button
                className="filters-reset-button"
                onClick={() => setSelectedFilter("original")}
              >
                Reset to Original
              </button>

            </div>
          </section>
        )}

        {error && (
          <p className="filters-error" role="alert">
            {error}
          </p>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="filters-hidden-input"
          onChange={handleFile}
        />

      </div>
    </main>
  );
}

export default ImageFilters;