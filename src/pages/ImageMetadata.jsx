
import { useRef, useState } from "react";
import ExifReader from "exifreader";
import "./ImageMetadata.css";

function ImageMetadata({ onBack }) {
  const [image, setImage] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const fileInputRef = useRef(null);

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} Bytes`;
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(2)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getTag = (tags, name) => {
    const value = tags?.[name];

    if (!value) return "Not available";

    return value.description ?? value.value ?? "Not available";
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "Not available";

    return new Date(timestamp).toLocaleString();
  };

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      event.target.value = "";
      return;
    }

    setLoading(true);
    setError("");
    setMetadata(null);

    const previewUrl = URL.createObjectURL(file);

    try {
      const imageElement = new Image();

      const dimensions = await new Promise((resolve, reject) => {
        imageElement.onload = () => {
          resolve({
            width: imageElement.naturalWidth,
            height: imageElement.naturalHeight,
          });
        };

        imageElement.onerror = () => {
          reject(new Error("Unable to read image dimensions."));
        };

        imageElement.src = previewUrl;
      });

      let exif = {};

      try {
        exif = await ExifReader.load(file);
      } catch {
        // Some image formats do not contain readable EXIF data.
        exif = {};
      }

      const width = dimensions.width;
      const height = dimensions.height;
      const divisor = (a, b) => {
        while (b) {
          [a, b] = [b, a % b];
        }
        return a;
      };

      const commonDivisor = divisor(width, height);

      const gpsLatitude = getTag(exif, "GPSLatitude");
      const gpsLongitude = getTag(exif, "GPSLongitude");

      setImage({
        name: file.name,
        type: file.type || "Unknown",
        size: file.size,
        lastModified: file.lastModified,
        preview: previewUrl,
      });

      setMetadata({
        width,
        height,
        aspectRatio: `${width / commonDivisor}:${height / commonDivisor}`,
        megapixels: ((width * height) / 1000000).toFixed(2),
        make: getTag(exif, "Make"),
        model: getTag(exif, "Model"),
        dateTaken: getTag(exif, "DateTimeOriginal"),
        software: getTag(exif, "Software"),
        orientation: getTag(exif, "Orientation"),
        iso: getTag(exif, "ISOSpeedRatings"),
        aperture: getTag(exif, "FNumber"),
        exposure: getTag(exif, "ExposureTime"),
        focalLength: getTag(exif, "FocalLength"),
        flash: getTag(exif, "Flash"),
        gpsLatitude,
        gpsLongitude,
        hasGps:
          gpsLatitude !== "Not available" ||
          gpsLongitude !== "Not available",
        exifAvailable: Object.keys(exif).length > 0,
      });
    } catch (uploadError) {
      URL.revokeObjectURL(previewUrl);
      setError(
        uploadError.message || "Unable to read this image."
      );
    } finally {
      setLoading(false);
      event.target.value = "";
    }
  };

  const removeImage = () => {
    if (image?.preview) {
      URL.revokeObjectURL(image.preview);
    }

    setImage(null);
    setMetadata(null);
    setError("");
  };

  const copyMetadata = async () => {
    if (!image || !metadata) return;

    const output = {
      fileName: image.name,
      fileType: image.type,
      fileSize: formatSize(image.size),
      width: metadata.width,
      height: metadata.height,
      aspectRatio: metadata.aspectRatio,
      megapixels: metadata.megapixels,
      cameraMake: metadata.make,
      cameraModel: metadata.model,
      dateTaken: metadata.dateTaken,
      software: metadata.software,
      orientation: metadata.orientation,
      ISO: metadata.iso,
      aperture: metadata.aperture,
      exposure: metadata.exposure,
      focalLength: metadata.focalLength,
      flash: metadata.flash,
      GPSLatitude: metadata.gpsLatitude,
      GPSLongitude: metadata.gpsLongitude,
    };

    try {
      await navigator.clipboard.writeText(
        JSON.stringify(output, null, 2)
      );
      alert("Metadata copied successfully!");
    } catch {
      setError("Unable to access clipboard. Please try again.");
    }
  };

  const downloadMetadata = () => {
    if (!image || !metadata) return;

    const output = {
      fileName: image.name,
      fileType: image.type,
      fileSize: formatSize(image.size),
      lastModified: formatDate(image.lastModified),
      ...metadata,
    };

    const blob = new Blob(
      [JSON.stringify(output, null, 2)],
      { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${image.name.replace(/\.[^/.]+$/, "")}-metadata.json`;
    link.click();

    URL.revokeObjectURL(url);
  };

  const renderDetail = (label, value) => (
    <div className="metadata-detail" key={label}>
      <span>{label}</span>
      <strong>{value || "Not available"}</strong>
    </div>
  );

  return (
    <div className="metadata-page">
      <header className="metadata-header">
        <button className="metadata-back-btn" onClick={onBack}>
          ← Back to Image Editor
        </button>

        <h1>Image Metadata Viewer</h1>
        <p>
          Explore image dimensions, file information and camera details.
        </p>
      </header>

      {!image && (
        <div className="metadata-upload-card">
          <div className="metadata-upload-icon">🔍</div>

          <h2>View Image Information</h2>

          <p>
            Upload an image to inspect its properties and available EXIF data.
          </p>

          <button
            className="metadata-primary-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
          >
            {loading ? "Reading Image..." : "Choose Image"}
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
      )}

      {loading && (
        <div className="metadata-loading">
          Reading image information...
        </div>
      )}

      {error && (
        <div className="metadata-error">
          {error}
        </div>
      )}

      {image && metadata && (
        <div className="metadata-workspace">
          <section className="metadata-preview-card">
            <div className="metadata-card-heading">
              <h3>Image Preview</h3>

              <button
                className="metadata-remove-btn"
                onClick={removeImage}
              >
                Remove
              </button>
            </div>

            <div className="metadata-image-preview">
              <img src={image.preview} alt="Uploaded image" />
            </div>

            <div className="metadata-file-name">
              <span>File Name</span>
              <strong>{image.name}</strong>
            </div>
          </section>

          <section className="metadata-info-card">
            <div className="metadata-card-heading">
              <h3>Image Properties</h3>
            </div>

            <div className="metadata-section">
              <h4>Basic Information</h4>

              <div className="metadata-grid">
                {renderDetail("File Type", image.type)}
                {renderDetail("File Size", formatSize(image.size))}
                {renderDetail("Width", `${metadata.width} px`)}
                {renderDetail("Height", `${metadata.height} px`)}
                {renderDetail("Aspect Ratio", metadata.aspectRatio)}
                {renderDetail("Megapixels", `${metadata.megapixels} MP`)}
                {renderDetail(
                  "Last Modified",
                  formatDate(image.lastModified)
                )}
              </div>
            </div>

            <div className="metadata-section">
              <h4>Camera Information (EXIF)</h4>

              <div className="metadata-grid">
                {renderDetail("Camera Make", metadata.make)}
                {renderDetail("Camera Model", metadata.model)}
                {renderDetail("Date Taken", metadata.dateTaken)}
                {renderDetail("Software", metadata.software)}
                {renderDetail("Orientation", metadata.orientation)}
                {renderDetail("ISO", metadata.iso)}
                {renderDetail("Aperture", metadata.aperture)}
                {renderDetail("Exposure Time", metadata.exposure)}
                {renderDetail("Focal Length", metadata.focalLength)}
                {renderDetail("Flash", metadata.flash)}
              </div>

              {!metadata.exifAvailable && (
                <p className="metadata-no-exif">
                  No readable EXIF information was found in this image.
                  This is common for screenshots and some edited images.
                </p>
              )}
            </div>

            <div className="metadata-section">
              <h4>GPS Information</h4>

              {metadata.hasGps ? (
                <div className="metadata-grid">
                  {renderDetail("GPS Latitude", metadata.gpsLatitude)}
                  {renderDetail("GPS Longitude", metadata.gpsLongitude)}
                </div>
              ) : (
                <p className="metadata-no-exif">
                  No GPS information is available in this image.
                </p>
              )}
            </div>

            <div className="metadata-actions">
              <button
                className="metadata-primary-btn"
                onClick={copyMetadata}
              >
                Copy Metadata
              </button>

              <button
                className="metadata-secondary-btn"
                onClick={downloadMetadata}
              >
                Download JSON
              </button>

              <button
                className="metadata-secondary-btn"
                onClick={() => fileInputRef.current?.click()}
              >
                Choose Another Image
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={handleUpload}
              />
            </div>
          </section>
        </div>
      )}

      <div className="metadata-privacy-note">
        <strong>Privacy:</strong> Image information is read locally in your
        browser. Images are not uploaded to a server. Be careful when sharing
        metadata because GPS information can reveal where a photo was taken.
      </div>
    </div>
  );
}

export default ImageMetadata;
