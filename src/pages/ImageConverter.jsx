
import { useEffect, useRef, useState } from "react";
import "./ImageConverter.css";

const formats = [
  { label: "JPG", value: "image/jpeg", extension: "jpg" },
  { label: "PNG", value: "image/png", extension: "png" },
  { label: "WebP", value: "image/webp", extension: "webp" },
];

function ImageConverter({ onBack }) {
  const [image, setImage] = useState(null);
  const [outputFormat, setOutputFormat] = useState("image/jpeg");
  const [quality, setQuality] = useState(85);
  const [converted, setConverted] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fileInputRef = useRef(null);
  const imageRef = useRef(null);
  const originalUrlRef = useRef(null);
  const convertedUrlRef = useRef(null);

  useEffect(() => {
    return () => {
      if (originalUrlRef.current) {
        URL.revokeObjectURL(originalUrlRef.current);
      }

      if (convertedUrlRef.current) {
        URL.revokeObjectURL(convertedUrlRef.current);
      }
    };
  }, []);

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(2)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleUpload = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      event.target.value = "";
      return;
    }

    setError("");
    setConverted(null);

    if (originalUrlRef.current) {
      URL.revokeObjectURL(originalUrlRef.current);
    }

    if (convertedUrlRef.current) {
      URL.revokeObjectURL(convertedUrlRef.current);
      convertedUrlRef.current = null;
    }

    const url = URL.createObjectURL(file);
    originalUrlRef.current = url;

    const img = new Image();

    img.onload = () => {
      imageRef.current = img;

      setImage({
        name: file.name.replace(/\.[^/.]+$/, "") || "image",
        originalName: file.name,
        type: file.type,
        size: file.size,
        width: img.naturalWidth,
        height: img.naturalHeight,
        url,
      });
    };

    img.onerror = () => {
      setError("Unable to open this image. Try another format.");
      URL.revokeObjectURL(url);
      originalUrlRef.current = null;
      setImage(null);
    };

    img.src = url;
    event.target.value = "";
  };

  const convertImage = () => {
    const img = imageRef.current;

    if (!img || !image) return;

    setLoading(true);
    setError("");

    try {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      const ctx = canvas.getContext("2d");

      if (!ctx) {
        throw new Error("Unable to create image canvas.");
      }

      // JPEG does not support transparency.
      // Use a white background for transparent source images.
      if (outputFormat === "image/jpeg") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.drawImage(img, 0, 0);

      const selectedFormat = formats.find(
        (format) => format.value === outputFormat
      );

      const mimeType = selectedFormat.value;
      const extension = selectedFormat.extension;

      const imageQuality = quality / 100;

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            setLoading(false);
            setError("Conversion failed. Please try again.");
            return;
          }

          if (convertedUrlRef.current) {
            URL.revokeObjectURL(convertedUrlRef.current);
          }

          const convertedUrl = URL.createObjectURL(blob);
          convertedUrlRef.current = convertedUrl;

          setConverted({
            url: convertedUrl,
            size: blob.size,
            type: mimeType,
            extension,
            width: canvas.width,
            height: canvas.height,
          });

          setLoading(false);
        },
        mimeType,
        outputFormat === "image/png" ? undefined : imageQuality
      );
    } catch (conversionError) {
      setLoading(false);
      setError(
        conversionError.message || "Something went wrong during conversion."
      );
    }
  };

  const downloadImage = () => {
    if (!converted || !image) return;

    const link = document.createElement("a");
    link.href = converted.url;
    link.download = `${image.name}.${converted.extension}`;
    link.click();
  };

  const removeImage = () => {
    if (originalUrlRef.current) {
      URL.revokeObjectURL(originalUrlRef.current);
      originalUrlRef.current = null;
    }

    if (convertedUrlRef.current) {
      URL.revokeObjectURL(convertedUrlRef.current);
      convertedUrlRef.current = null;
    }

    imageRef.current = null;
    setImage(null);
    setConverted(null);
    setError("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="image-converter-page">
      <header className="converter-header">
        <button className="converter-back-btn" onClick={onBack}>
          ← Back to Image Tools
        </button>

        <h1>Image Converter</h1>
        <p>
          Convert images into different formats quickly and easily.
        </p>
      </header>

      {!image ? (
        <div className="converter-upload-card">
          <div className="converter-upload-icon">🔄</div>

          <h2>Upload Your Image</h2>

          <p>
            Select an image to convert it into JPG, PNG or WebP.
          </p>

          <button
            className="converter-primary-btn"
            onClick={() => fileInputRef.current?.click()}
          >
            Choose Image
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={handleUpload}
          />

          <span>Supports browser-readable image formats.</span>
        </div>
      ) : (
        <div className="converter-workspace">

          <section className="converter-preview-card">
            <div className="converter-card-heading">
              <h3>Original Image</h3>

              <button
                className="converter-remove-btn"
                onClick={removeImage}
              >
                Remove
              </button>
            </div>

            <div className="converter-image-preview">
              <img src={image.url} alt="Original image" />
            </div>

            <div className="converter-image-details">
              <div>
                <span>File Name</span>
                <strong>{image.originalName}</strong>
              </div>

              <div>
                <span>Dimensions</span>
                <strong>
                  {image.width} × {image.height} px
                </strong>
              </div>

              <div>
                <span>Original Size</span>
                <strong>{formatSize(image.size)}</strong>
              </div>

              <div>
                <span>Original Format</span>
                <strong>{image.type || "Unknown"}</strong>
              </div>
            </div>
          </section>

          <section className="converter-settings-card">
            <div className="converter-card-heading">
              <h3>Conversion Settings</h3>
            </div>

            <label className="converter-label">
              Output Format
            </label>

            <div className="converter-format-options">
              {formats.map((format) => (
                <button
                  key={format.value}
                  className={
                    outputFormat === format.value ? "active" : ""
                  }
                  onClick={() => {
                    setOutputFormat(format.value);
                    setConverted(null);
                  }}
                >
                  {format.label}
                </button>
              ))}
            </div>

            {outputFormat !== "image/png" && (
              <div className="converter-quality-control">
                <div className="converter-quality-heading">
                  <label className="converter-label">
                    Image Quality
                  </label>

                  <strong>{quality}%</strong>
                </div>

                <input
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  value={quality}
                  onChange={(event) => {
                    setQuality(Number(event.target.value));
                    setConverted(null);
                  }}
                />

                <div className="converter-quality-labels">
                  <span>Smaller File</span>
                  <span>Better Quality</span>
                </div>
              </div>
            )}

            {outputFormat === "image/png" && (
              <p className="converter-format-note">
                PNG uses lossless compression. The quality slider
                does not apply to this format.
              </p>
            )}

            <button
              className="converter-primary-btn converter-convert-btn"
              onClick={convertImage}
              disabled={loading}
            >
              {loading ? "Converting..." : "Convert Image"}
            </button>

            {converted && (
              <div className="converter-result">
                <div className="converter-result-heading">
                  <span>✓</span>
                  <strong>Conversion Successful</strong>
                </div>

                <div className="converter-image-preview converted-preview">
                  <img
                    src={converted.url}
                    alt="Converted image"
                  />
                </div>

                <div className="converter-result-details">
                  <div>
                    <span>Output Format</span>
                    <strong>{converted.extension.toUpperCase()}</strong>
                  </div>

                  <div>
                    <span>Output Size</span>
                    <strong>{formatSize(converted.size)}</strong>
                  </div>

                  <div>
                    <span>Dimensions</span>
                    <strong>
                      {converted.width} × {converted.height} px
                    </strong>
                  </div>
                </div>

                <button
                  className="converter-download-btn"
                  onClick={downloadImage}
                >
                  ↓ Download Converted Image
                </button>
              </div>
            )}
          </section>
        </div>
      )}

      {error && (
        <div className="converter-error">
          {error}
        </div>
      )}

      <div className="converter-privacy-note">
        <strong>Privacy:</strong> Your images are converted locally
        in your browser. They are not uploaded to a server.
      </div>
    </div>
  );
}

export default ImageConverter;
