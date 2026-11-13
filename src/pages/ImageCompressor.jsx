
import { useEffect, useState } from "react";

function ImageCompressor({ onBack }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [quality, setQuality] = useState(70);
  const [format, setFormat] = useState("image/webp");
  const [compressed, setCompressed] = useState(null);
  const [estimatedSize, setEstimatedSize] = useState(null);
  const [estimating, setEstimating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Clean up original image preview URL
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  // Clean up compressed image URL
  useEffect(() => {
    return () => {
      if (compressed?.url) {
        URL.revokeObjectURL(compressed.url);
      }
    };
  }, [compressed?.url]);

  // Format file size
  const formatSize = (size) => {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(2)} KB`;
    }
    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Upload image
  const handleFile = (selectedFile) => {
    if (!selectedFile) return;

    setError("");

    if (!["image/jpeg", "image/png", "image/webp"].includes(selectedFile.type)) {
      setError("Please select a JPG, PNG or WebP image.");
      return;
    }

    if (selectedFile.size > 25 * 1024 * 1024) {
      setError("Please select an image smaller than 25 MB.");
      return;
    }

    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
    setCompressed(null);
    setEstimatedSize(null);
  };

  // Generate compressed image using canvas
  const generateImage = (image, selectedFormat, selectedQuality) => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas");

      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;

      const context = canvas.getContext("2d");

      if (!context) {
        reject(new Error("Unable to process this image."));
        return;
      }

      // JPG does not support transparency
      if (selectedFormat === "image/jpeg") {
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
      }

      context.drawImage(image, 0, 0);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Image compression failed."));
          }
        },
        selectedFormat,
        selectedQuality / 100
      );
    });
  };

  // Live compressed size estimation
  useEffect(() => {
    if (!preview) {
      setEstimatedSize(null);
      setEstimating(false);
      return;
    }

    let cancelled = false;

    setEstimating(true);
    setEstimatedSize(null);

    const timer = setTimeout(() => {
      const image = new Image();

      image.onload = async () => {
        try {
          const blob = await generateImage(image, format, quality);

          if (!cancelled) {
            setEstimatedSize(blob.size);
            setEstimating(false);
          }
        } catch {
          if (!cancelled) {
            setEstimatedSize(null);
            setEstimating(false);
          }
        }
      };

      image.onerror = () => {
        if (!cancelled) {
          setEstimatedSize(null);
          setEstimating(false);
        }
      };

      image.src = preview;
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [preview, quality, format]);

  // Compress image
  const compressImage = () => {
    if (!file || !preview) return;

    setLoading(true);
    setError("");

    const image = new Image();

    image.onload = async () => {
      try {
        const blob = await generateImage(image, format, quality);

        setCompressed({
          blob,
          url: URL.createObjectURL(blob),
          size: blob.size,
          name: file.name.replace(/\.[^/.]+$/, ""),
          type: blob.type,
        });
      } catch (err) {
        setError(err.message || "Unable to compress image.");
      } finally {
        setLoading(false);
      }
    };

    image.onerror = () => {
      setError("Unable to read this image.");
      setLoading(false);
    };

    image.src = preview;
  };

  // Download compressed image
  const downloadImage = () => {
    if (!compressed) return;

    const extension = compressed.type.split("/")[1].replace("jpeg", "jpg");

    const link = document.createElement("a");
    link.href = compressed.url;
    link.download = `${compressed.name}-compressed.${extension}`;

    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // Remove selected image
  const removeImage = () => {
    setFile(null);
    setPreview("");
    setCompressed(null);
    setEstimatedSize(null);
    setError("");
  };

  // Calculate actual size reduction
  const savedPercentage =
    compressed && file && file.size > 0
      ? ((file.size - compressed.size) / file.size) * 100
      : 0;

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        {/* Back Button */}
        <button style={styles.back} onClick={onBack}>
          ← Back to Image Tools
        </button>

        {/* Heading */}
        <div style={styles.heading}>
          <div style={styles.icon}>🖼️</div>

          <h1 style={styles.title}>Image Compressor</h1>

          <p style={styles.subtitle}>
            Reduce image file size without unnecessary quality loss.
          </p>
        </div>

        {/* Main Panel */}
        <div style={styles.panel}>

          {/* Upload Section */}
          {!file ? (
            <label style={styles.upload}>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hidden
                onChange={(e) => handleFile(e.target.files[0])}
              />

              <div style={styles.uploadIcon}>☁️</div>

              <h3>Upload your image</h3>

              <p>
                Click here or choose an image from your device.
              </p>

              <span style={styles.formats}>
                JPG • PNG • WEBP | Maximum 25 MB
              </span>

              <span style={styles.choose}>
                Choose Image
              </span>
            </label>
          ) : (

            /* Image Editor */
            <div style={styles.editor}>

              {/* Original Image */}
              <div style={styles.previewBox}>
                <h3>Original Image</h3>

                <img
                  src={preview}
                  alt="Original preview"
                  style={styles.image}
                />

                <p>
                  Original size: <strong>{formatSize(file.size)}</strong>
                </p>

                <button
                  style={styles.remove}
                  onClick={removeImage}
                >
                  Remove Image
                </button>
              </div>

              {/* Compression Settings */}
              <div style={styles.settings}>
                <h3>Compression Settings</h3>

                {/* Quality Slider */}
                <label style={styles.label}>
                  Image Quality: {quality}%
                </label>

                <input
                  type="range"
                  min="10"
                  max="100"
                  step="1"
                  value={quality}
                  onChange={(e) => {
                    setQuality(Number(e.target.value));
                    setCompressed(null);
                  }}
                  style={styles.slider}
                />

                <div style={styles.rangeLabels}>
                  <span>Smaller size</span>
                  <span>Better quality</span>
                </div>

                {/* Live Estimated Size */}
                <div style={styles.estimateBox}>
                  <p style={styles.estimateTitle}>
                    Estimated Compressed Size
                  </p>

                  <h2 style={styles.estimateValue}>
                    {estimating
                      ? "Calculating..."
                      : estimatedSize !== null
                        ? formatSize(estimatedSize)
                        : "Not available"}
                  </h2>

                  {estimatedSize !== null && (
                    <p style={styles.estimateInfo}>
                      {estimatedSize < file.size
                        ? `${((file.size - estimatedSize) / file.size * 100).toFixed(1)}% smaller than original`
                        : "Output may be larger than original"}
                    </p>
                  )}

                  <small style={styles.estimateNote}>
                    Updates automatically when quality changes.
                  </small>
                </div>

                {/* Output Format */}
                <label style={styles.label}>
                  Output Format
                </label>

                <select
                  value={format}
                  onChange={(e) => {
                    setFormat(e.target.value);
                    setCompressed(null);
                  }}
                  style={styles.select}
                >
                  <option value="image/webp">WebP</option>
                  <option value="image/jpeg">JPG</option>
                  <option value="image/png">PNG</option>
                </select>

                {/* Compress Button */}
                <button
                  style={{
                    ...styles.compressButton,
                    opacity: loading ? 0.7 : 1,
                  }}
                  onClick={compressImage}
                  disabled={loading}
                >
                  {loading ? "Compressing..." : "Compress Image"}
                </button>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div style={styles.error}>
              {error}
            </div>
          )}

          {/* Compression Result */}
          {compressed && (
            <div style={styles.result}>

              <h3>Compression Completed!</h3>

              <div style={styles.resultGrid}>

                <div style={styles.resultItem}>
                  <span>Original Size</span>
                  <strong>{formatSize(file.size)}</strong>
                </div>

                <div style={styles.resultItem}>
                  <span>Compressed Size</span>
                  <strong>{formatSize(compressed.size)}</strong>
                </div>

                <div style={styles.resultItem}>
                  <span>Size Reduction</span>
                  <strong
                    style={{
                      color: savedPercentage > 0 ? "#168a55" : "#d97706",
                    }}
                  >
                    {savedPercentage.toFixed(1)}%
                  </strong>
                </div>

              </div>

              {compressed.size >= file.size && (
                <p style={styles.warning}>
                  The compressed file is not smaller than the original.
                  Try another format or lower quality.
                </p>
              )}

              <h4>Compressed Image Preview</h4>

              <img
                src={compressed.url}
                alt="Compressed preview"
                style={styles.image}
              />

              <button
                style={styles.download}
                onClick={downloadImage}
              >
                ↓ Download Compressed Image
              </button>

            </div>
          )}
        </div>

        {/* Footer Note */}
        <p style={styles.note}>
          Your image is processed locally in your browser.
          It is not uploaded to a server.
        </p>

      </div>
    </div>
  );
}

// Styles
const styles = {
  page: {
    minHeight: "100vh",
    padding: "35px 20px",
    background: "#f7f9fc",
    fontFamily: "Arial, sans-serif",
    color: "#203653",
    boxSizing: "border-box",
  },

  container: {
    maxWidth: "1100px",
    margin: "auto",
  },

  back: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "9px",
    width: "fit-content",
    marginLeft: 0,
    marginRight: "auto",
    padding: "10px 15px",
    border: "1px solid #e1e7f4",
    borderRadius: "11px",
    background: "#fff",
    color: "#5263d9",
    fontSize: "13px",
    fontWeight: 700,
    transition: "transform 0.2s, background 0.2s",
  },

  heading: {
    textAlign: "center",
    margin: "35px 0",
  },

  icon: {
    fontSize: "42px",
  },

  title: {
    fontSize: "34px",
    margin: "12px 0",
  },

  subtitle: {
    color: "#718096",
    fontSize: "16px",
  },

  panel: {
    background: "#ffffff",
    padding: "30px",
    border: "1px solid #e5ebf3",
    borderRadius: "16px",
    boxSizing: "border-box",
  },

  upload: {
    minHeight: "300px",
    border: "2px dashed #b8cce8",
    borderRadius: "12px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    gap: "12px",
    cursor: "pointer",
    textAlign: "center",
    padding: "25px",
    boxSizing: "border-box",
  },

  uploadIcon: {
    fontSize: "45px",
  },

  formats: {
    color: "#8a96a6",
    fontSize: "12px",
  },

  choose: {
    background: "#2675e8",
    color: "#ffffff",
    padding: "12px 25px",
    borderRadius: "8px",
    marginTop: "8px",
  },

  editor: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "30px",
  },

  previewBox: {
    textAlign: "center",
    minWidth: 0,
  },

  image: {
    display: "block",
    width: "100%",
    maxHeight: "380px",
    objectFit: "contain",
    margin: "20px auto",
    borderRadius: "10px",
    background: "#f1f4f8",
  },

  settings: {
    padding: "10px 0",
    minWidth: 0,
  },

  label: {
    display: "block",
    fontWeight: "600",
    margin: "25px 0 12px",
  },

  slider: {
    width: "100%",
    accentColor: "#2675e8",
    cursor: "pointer",
  },

  rangeLabels: {
    display: "flex",
    justifyContent: "space-between",
    color: "#8a96a6",
    fontSize: "12px",
    gap: "10px",
  },

  estimateBox: {
    marginTop: "22px",
    padding: "18px",
    background: "#f0f6ff",
    border: "1px solid #e0ebff",
    borderRadius: "10px",
    textAlign: "center",
  },

  estimateTitle: {
    margin: "0 0 8px",
    color: "#718096",
    fontSize: "14px",
  },

  estimateValue: {
    margin: "0",
    color: "#2675e8",
    fontSize: "27px",
  },

  estimateInfo: {
    color: "#168a55",
    fontSize: "13px",
    margin: "8px 0",
    fontWeight: "600",
  },

  estimateNote: {
    display: "block",
    color: "#8793a3",
    marginTop: "8px",
    fontSize: "11px",
  },

  select: {
    width: "100%",
    padding: "13px",
    border: "1px solid #dce3ed",
    borderRadius: "8px",
    background: "#ffffff",
    boxSizing: "border-box",
  },

  compressButton: {
    width: "100%",
    marginTop: "30px",
    padding: "15px",
    border: "none",
    borderRadius: "8px",
    background: "#2675e8",
    color: "#ffffff",
    fontWeight: "600",
    fontSize: "16px",
    cursor: "pointer",
  },

  remove: {
    padding: "10px 17px",
    border: "1px solid #e5ebf3",
    borderRadius: "7px",
    background: "#ffffff",
    color: "#d14b4b",
    cursor: "pointer",
  },

  result: {
    marginTop: "30px",
    padding: "25px",
    background: "#f3f8ff",
    borderRadius: "12px",
    textAlign: "center",
  },

  resultGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
    gap: "15px",
    margin: "25px 0",
  },

  resultItem: {
    display: "flex",
    flexDirection: "column",
    gap: "9px",
    fontSize: "14px",
  },

  warning: {
    color: "#a66a00",
    margin: "15px 0",
    fontSize: "13px",
  },

  error: {
    color: "#d14b4b",
    background: "#fff1f1",
    padding: "13px",
    borderRadius: "8px",
    marginTop: "20px",
    textAlign: "center",
  },

  download: {
    width: "100%",
    padding: "15px",
    border: "none",
    borderRadius: "8px",
    background: "#168a55",
    color: "#ffffff",
    fontWeight: "600",
    fontSize: "16px",
    cursor: "pointer",
  },

  note: {
    textAlign: "center",
    color: "#8793a3",
    fontSize: "13px",
    marginTop: "25px",
  },
};

export default ImageCompressor;
