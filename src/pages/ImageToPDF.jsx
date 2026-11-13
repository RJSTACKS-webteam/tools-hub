
import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import "./ImageToPDF.css";

function ImageToPDF({ onBack }) {
  const [images, setImages] = useState([]);
  const [pageSize, setPageSize] = useState("a4");
  const [orientation, setOrientation] = useState("portrait");
  const [margin, setMargin] = useState("20");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const addImages = (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    event.target.value = "";

    const validFiles = selectedFiles.filter((file) =>
      ["image/jpeg", "image/png", "image/webp"].includes(file.type)
    );

    if (validFiles.length !== selectedFiles.length) {
      setError("Only JPG, PNG and WebP images are supported.");
    } else {
      setError("");
    }

    const newImages = validFiles.map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
      file,
      preview: URL.createObjectURL(file),
    }));

    setImages((previous) => [...previous, ...newImages]);
    setSuccess("");
  };

  const removeImage = (id) => {
    setImages((previous) => {
      const imageToRemove = previous.find((image) => image.id === id);

      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.preview);
      }

      return previous.filter((image) => image.id !== id);
    });

    setError("");
    setSuccess("");
  };

  const moveImage = (index, direction) => {
    const newIndex = index + direction;

    if (newIndex < 0 || newIndex >= images.length) return;

    setImages((previous) => {
      const updated = [...previous];

      [updated[index], updated[newIndex]] = [
        updated[newIndex],
        updated[index],
      ];

      return updated;
    });

    setSuccess("");
  };

  const clearImages = () => {
    setImages((previous) => {
      previous.forEach((image) => URL.revokeObjectURL(image.preview));
      return [];
    });

    setError("");
    setSuccess("");
    setProgress("");
  };

  const loadImage = (file) =>
    new Promise((resolve, reject) => {
      const image = new Image();
      const url = URL.createObjectURL(file);

      image.onload = () => {
        URL.revokeObjectURL(url);
        resolve(image);
      };

      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error(`Unable to read ${file.name}.`));
      };

      image.src = url;
    });

  const imageToJpeg = async (file) => {
    const image = await loadImage(file);

    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Your browser could not process an image.");
    }

    // White background preserves transparent PNG/WebP images.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0);

    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (result) resolve(result);
          else reject(new Error(`Could not convert ${file.name}.`));
        },
        "image/jpeg",
        0.92
      );
    });

    canvas.width = 0;
    canvas.height = 0;

    return {
      bytes: await blob.arrayBuffer(),
      width: image.naturalWidth,
      height: image.naturalHeight,
    };
  };

  const createPDF = async () => {
    if (images.length === 0) {
      setError("Please add at least one image.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const pdf = await PDFDocument.create();
      const marginPoints = Number(margin) * 0.75;

      for (let i = 0; i < images.length; i++) {
        setProgress(
          `Adding image ${i + 1} of ${images.length}...`
        );

        const imageData = await imageToJpeg(images[i].file);
        const embeddedImage = await pdf.embedJpg(imageData.bytes);

        let pageWidth;
        let pageHeight;

        if (pageSize === "a4") {
          pageWidth = 595.28;
          pageHeight = 841.89;

          if (orientation === "landscape") {
            [pageWidth, pageHeight] = [pageHeight, pageWidth];
          }
        } else {
          pageWidth = imageData.width * 0.75;
          pageHeight = imageData.height * 0.75;
        }

        const page = pdf.addPage([pageWidth, pageHeight]);

        const availableWidth = Math.max(
          1,
          pageWidth - marginPoints * 2
        );

        const availableHeight = Math.max(
          1,
          pageHeight - marginPoints * 2
        );

        const scale = Math.min(
          availableWidth / imageData.width / 0.75,
          availableHeight / imageData.height / 0.75
        );

        const drawWidth = imageData.width * 0.75 * scale;
        const drawHeight = imageData.height * 0.75 * scale;

        page.drawImage(embeddedImage, {
          x: (pageWidth - drawWidth) / 2,
          y: (pageHeight - drawHeight) / 2,
          width: drawWidth,
          height: drawHeight,
        });
      }

      setProgress("Preparing your PDF...");

      const pdfBytes = await pdf.save();

      const blob = new Blob([pdfBytes], {
        type: "application/pdf",
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = "images-to-pdf.pdf";

      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => URL.revokeObjectURL(url), 1000);

      setProgress("");
      setSuccess(
        `Successfully created a PDF with ${images.length} page(s).`
      );
    } catch (err) {
      console.error("Image to PDF error:", err);
      setProgress("");
      setError(
        err.message || "Unable to create the PDF. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="image-pdf-page">
      <div className="image-pdf-container">

        <button className="image-pdf-back" onClick={onBack}>
          ← Back to PDF Tools
        </button>

        <div className="image-pdf-heading">
          <div className="image-pdf-icon">🖼️</div>
          <h1>Image to PDF</h1>
          <p>
            Convert multiple images into one PDF document.
          </p>
        </div>

        <div className="image-pdf-upload">
          <div className="image-pdf-upload-icon">📁</div>
          <h2>Add Your Images</h2>
          <p>Select JPG, PNG or WebP images.</p>

          <label className="image-pdf-select-button">
            + Choose Images
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={addImages}
              disabled={loading}
              hidden
            />
          </label>

          <small>Multiple images supported</small>
        </div>

        {images.length > 0 && (
          <>
            <div className="image-pdf-list-section">
              <div className="image-pdf-list-header">
                <div>
                  <h2>Selected Images</h2>
                  <p>{images.length} image(s) selected</p>
                </div>

                <button
                  className="image-pdf-clear"
                  onClick={clearImages}
                  disabled={loading}
                >
                  Clear All
                </button>
              </div>

              <div className="image-pdf-grid">
                {images.map((image, index) => (
                  <div className="image-pdf-card" key={image.id}>
                    <div className="image-pdf-preview">
                      <img src={image.preview} alt={image.file.name} />
                      <span>Page {index + 1}</span>
                    </div>

                    <div className="image-pdf-card-info">
                      <strong>{image.file.name}</strong>
                      <small>{formatSize(image.file.size)}</small>
                    </div>

                    <div className="image-pdf-actions">
                      <button
                        title="Move up"
                        onClick={() => moveImage(index, -1)}
                        disabled={loading || index === 0}
                      >
                        ↑
                      </button>

                      <button
                        title="Move down"
                        onClick={() => moveImage(index, 1)}
                        disabled={
                          loading || index === images.length - 1
                        }
                      >
                        ↓
                      </button>

                      <button
                        title="Remove image"
                        className="image-pdf-remove"
                        onClick={() => removeImage(image.id)}
                        disabled={loading}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <p className="image-pdf-order-note">
                Each image becomes one PDF page. Use the arrows
                to change the page order.
              </p>
            </div>

            <div className="image-pdf-settings">
              <h2>PDF Settings</h2>

              <label htmlFor="image-pdf-size">Page Size</label>
              <select
                id="image-pdf-size"
                value={pageSize}
                onChange={(event) => setPageSize(event.target.value)}
                disabled={loading}
              >
                <option value="a4">A4</option>
                <option value="original">Original Image Size</option>
              </select>

              {pageSize === "a4" && (
                <>
                  <label htmlFor="image-pdf-orientation">
                    Page Orientation
                  </label>
                  <select
                    id="image-pdf-orientation"
                    value={orientation}
                    onChange={(event) =>
                      setOrientation(event.target.value)
                    }
                    disabled={loading}
                  >
                    <option value="portrait">Portrait</option>
                    <option value="landscape">Landscape</option>
                  </select>
                </>
              )}

              <label htmlFor="image-pdf-margin">
                Page Margin
              </label>
              <select
                id="image-pdf-margin"
                value={margin}
                onChange={(event) => setMargin(event.target.value)}
                disabled={loading}
              >
                <option value="0">No Margin</option>
                <option value="10">Small</option>
                <option value="20">Normal</option>
                <option value="35">Large</option>
              </select>

              <button
                className="image-pdf-create-button"
                onClick={createPDF}
                disabled={loading || images.length === 0}
              >
                {loading ? "Creating PDF..." : "Create PDF"}
              </button>
            </div>
          </>
        )}

        {loading && (
          <div className="image-pdf-progress">
            <div className="image-pdf-loader"></div>
            <span>{progress}</span>
          </div>
        )}

        {error && (
          <div className="image-pdf-message image-pdf-error">
            {error}
          </div>
        )}

        {success && (
          <div className="image-pdf-message image-pdf-success">
            ✓ {success}
          </div>
        )}

        <div className="image-pdf-privacy">
          🔒 Your images are processed directly in your browser.
          They are not uploaded to our server.
        </div>

      </div>
    </div>
  );
}

export default ImageToPDF;
