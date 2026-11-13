
import { useRef, useState } from "react";
import "./ImageBase64.css";

function ImageBase64({ onBack }) {
  const [image, setImage] = useState(null);
  const [base64, setBase64] = useState("");
  const [format, setFormat] = useState("dataurl");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const fileInputRef = useRef(null);

  const handleUpload = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      event.target.value = "";
      return;
    }

    setError("");
    setCopied(false);

    const reader = new FileReader();

    reader.onload = () => {
      const dataUrl = reader.result;

      if (typeof dataUrl !== "string") {
        setError("Unable to convert this image.");
        return;
      }

      const commaIndex = dataUrl.indexOf(",");
      const encoded = commaIndex >= 0
        ? dataUrl.slice(commaIndex + 1)
        : dataUrl;

      setImage({
        name: file.name,
        type: file.type || "image/unknown",
        size: file.size,
        dataUrl,
        preview: dataUrl,
      });

      setBase64(encoded);
    };

    reader.onerror = () => {
      setError("Something went wrong while reading the image.");
    };

    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const getOutput = () => {
    if (!image || !base64) return "";

    return format === "dataurl"
      ? image.dataUrl
      : base64;
  };

  const copyResult = async () => {
    const output = getOutput();

    if (!output) return;

    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(
        "Clipboard access was blocked. You can select and copy the text manually."
      );
    }
  };

  const downloadResult = () => {
    const output = getOutput();

    if (!output) return;

    const blob = new Blob([output], {
      type: "text/plain;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${image.name.replace(/\.[^/.]+$/, "")}-base64.txt`;

    link.click();

    URL.revokeObjectURL(url);
  };

  const removeImage = () => {
    setImage(null);
    setBase64("");
    setCopied(false);
    setError("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(2)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="base64-page">
      <div className="base64-header">
        <button className="base64-back-btn" onClick={onBack}>
          ← Back to Image Editor
        </button>

        <h1>Image to Base64</h1>
        <p>Convert images into Base64 encoded text quickly.</p>
      </div>

      {!image ? (
        <div className="base64-upload-card">
          <div className="base64-upload-icon">💻</div>

          <h2>Upload Your Image</h2>

          <p>
            Choose an image to convert it into Base64 text.
          </p>

          <button
            className="base64-primary-btn"
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

          <span>Supports JPG, PNG, WebP and other browser-supported images.</span>
        </div>
      ) : (
        <div className="base64-workspace">
          <div className="base64-image-card">
            <div className="base64-card-heading">
              <h3>Image Preview</h3>

              <button
                className="base64-text-btn"
                onClick={removeImage}
              >
                Remove Image
              </button>
            </div>

            <div className="base64-preview">
              <img src={image.preview} alt="Uploaded preview" />
            </div>

            <div className="base64-image-details">
              <div>
                <span>File Name</span>
                <strong>{image.name}</strong>
              </div>

              <div>
                <span>Format</span>
                <strong>{image.type}</strong>
              </div>

              <div>
                <span>File Size</span>
                <strong>{formatSize(image.size)}</strong>
              </div>
            </div>
          </div>

          <div className="base64-result-card">
            <div className="base64-card-heading">
              <h3>Base64 Output</h3>

              <span className="base64-status">
                Conversion Complete
              </span>
            </div>

            <div className="base64-format-options">
              <button
                className={format === "dataurl" ? "active" : ""}
                onClick={() => {
                  setFormat("dataurl");
                  setCopied(false);
                }}
              >
                Data URL
              </button>

              <button
                className={format === "base64" ? "active" : ""}
                onClick={() => {
                  setFormat("base64");
                  setCopied(false);
                }}
              >
                Base64 Only
              </button>
            </div>

            <textarea
              className="base64-output"
              value={getOutput()}
              readOnly
              spellCheck="false"
            />

            <div className="base64-output-info">
              <span>
                {getOutput().length.toLocaleString()} characters
              </span>

              <span>
                {format === "dataurl"
                  ? "Includes image MIME type"
                  : "Encoded image data only"}
              </span>
            </div>

            <div className="base64-actions">
              <button
                className="base64-primary-btn"
                onClick={copyResult}
              >
                {copied ? "✓ Copied!" : "Copy Base64"}
              </button>

              <button
                className="base64-secondary-btn"
                onClick={downloadResult}
              >
                Download TXT
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="base64-error">
          {error}
        </div>
      )}

      <div className="base64-note">
        <strong>Privacy:</strong> Your image is converted locally
        in your browser. It is not uploaded to a server.
      </div>
    </div>
  );
}

export default ImageBase64;
