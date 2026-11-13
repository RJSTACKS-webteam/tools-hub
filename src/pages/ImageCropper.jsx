
import React, { useEffect, useRef, useState } from "react";
import "./ImageCropper.css";

export default function ImageCropper({ onBack }) {
  const [file, setFile] = useState(null);
  const [imageUrl, setImageUrl] = useState("");
  const [crop, setCrop] = useState({
    x: 0,
    y: 0,
    width: 100,
    height: 100,
  });
  const [aspect, setAspect] = useState("free");
  const [zoom, setZoom] = useState(100);
  const [format, setFormat] = useState("image/jpeg");
  const [error, setError] = useState("");
  const [rotation, setRotation] = useState(0);

  const imageRef = useRef(null);
  const wrapperRef = useRef(null);
  const dragRef = useRef(null);
  const fileInputRef = useRef(null);

  const ratios = {
    free: null,
    "1:1": 1,
    "4:3": 4 / 3,
    "16:9": 16 / 9,
    "3:4": 3 / 4,
  };

  useEffect(() => {
    return () => {
      if (imageUrl.startsWith("blob:")) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [imageUrl]);

  const handleFile = (selectedFile) => {
    if (!selectedFile) return;

    if (!selectedFile.type.startsWith("image/")) {
      setError("Please select a valid image.");
      return;
    }

    const url = URL.createObjectURL(selectedFile);

    setFile(selectedFile);
    setImageUrl(url);
    setCrop({ x: 0, y: 0, width: 100, height: 100 });
    setAspect("free");
    setZoom(100);
    setRotation(0);
    setError("");
  };

  const changeAspect = (value) => {
    setAspect(value);

    if (value === "free") {
      setCrop({ x: 0, y: 0, width: 100, height: 100 });
      return;
    }

    const img = imageRef.current;
    if (!img || !ratios[value]) return;

    const target = ratios[value];
    const imageAspect = img.naturalWidth / img.naturalHeight;

    let width = 100;
    let height = 100;

    if (target > imageAspect) {
      height = (imageAspect / target) * 100;
    } else {
      width = (target / imageAspect) * 100;
    }

    setCrop({
      x: (100 - width) / 2,
      y: (100 - height) / 2,
      width,
      height,
    });
  };

  const rotateImage = async (degrees) => {
    const img = imageRef.current;

    if (!img || !img.complete) return;

    const nextRotation = (rotation + degrees + 360) % 360;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (nextRotation % 180 === 90) {
      canvas.width = img.naturalHeight;
      canvas.height = img.naturalWidth;
    } else {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
    }

    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((degrees * Math.PI) / 180);

    ctx.drawImage(
      img,
      -img.naturalWidth / 2,
      -img.naturalHeight / 2
    );

    canvas.toBlob((blob) => {
      if (!blob) {
        setError("Unable to rotate image.");
        return;
      }

      const newUrl = URL.createObjectURL(blob);

      setImageUrl(newUrl);
      setRotation(nextRotation);
      setCrop({ x: 0, y: 0, width: 100, height: 100 });
      setAspect("free");
      setZoom(100);
      setError("");
    }, "image/png");
  };

  // Start moving or resizing the crop selection
  const startDrag = (event, mode) => {
    event.preventDefault();
    event.stopPropagation();

    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    wrapper.setPointerCapture(event.pointerId);

    dragRef.current = {
      mode,
      startX: event.clientX,
      startY: event.clientY,
      initialCrop: { ...crop },
    };
  };

  // Adjust crop box based on pointer movement
  const moveCrop = (event) => {
    if (!dragRef.current || !wrapperRef.current) return;

    const rect = wrapperRef.current.getBoundingClientRect();

    if (!rect.width || !rect.height) return;

    const dx =
      ((event.clientX - dragRef.current.startX) / rect.width) * 100;

    const dy =
      ((event.clientY - dragRef.current.startY) / rect.height) * 100;

    const { mode, initialCrop } = dragRef.current;

    let { x, y, width, height } = initialCrop;

    if (mode === "move") {
      x = Math.max(0, Math.min(100 - width, x + dx));
      y = Math.max(0, Math.min(100 - height, y + dy));
    } else {
      if (mode.includes("left")) {
        const right = x + width;
        x = Math.max(0, Math.min(right - 2, x + dx));
        width = right - x;
      }

      if (mode.includes("right")) {
        width = Math.max(2, Math.min(100 - x, width + dx));
      }

      if (mode.includes("top")) {
        const bottom = y + height;
        y = Math.max(0, Math.min(bottom - 2, y + dy));
        height = bottom - y;
      }

      if (mode.includes("bottom")) {
        height = Math.max(2, Math.min(100 - y, height + dy));
      }
    }

    setCrop({ x, y, width, height });
  };

  const stopDrag = (event) => {
    if (
      wrapperRef.current?.hasPointerCapture(event.pointerId)
    ) {
      wrapperRef.current.releasePointerCapture(event.pointerId);
    }

    dragRef.current = null;
  };

  // Download cropped image
  const downloadImage = () => {
    const img = imageRef.current;

    if (!img || !img.complete || !img.naturalWidth) {
      setError("Please wait for the image to load.");
      return;
    }

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    const sx = (crop.x / 100) * img.naturalWidth;
    const sy = (crop.y / 100) * img.naturalHeight;
    const sw = (crop.width / 100) * img.naturalWidth;
    const sh = (crop.height / 100) * img.naturalHeight;

    canvas.width = Math.max(1, Math.round(sw));
    canvas.height = Math.max(1, Math.round(sh));

    ctx.drawImage(
      img,
      sx,
      sy,
      sw,
      sh,
      0,
      0,
      canvas.width,
      canvas.height
    );

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError("Unable to crop image. Please try again.");
          return;
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        const extension = {
          "image/jpeg": "jpg",
          "image/png": "png",
          "image/webp": "webp",
        }[format];

        link.href = url;
        link.download = `cropped-image.${extension}`;
        link.click();

        setTimeout(() => URL.revokeObjectURL(url), 1000);
        setError("");
      },
      format,
      0.95
    );
  };

  const removeImage = () => {
    setFile(null);
    setImageUrl("");
    setError("");
    setRotation(0);
    setZoom(100);
    setCrop({ x: 0, y: 0, width: 100, height: 100 });
    setAspect("free");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handles = [
    "top-left",
    "top",
    "top-right",
    "right",
    "bottom-right",
    "bottom",
    "bottom-left",
    "left",
  ];

  const handlePosition = (position) => {
    const positions = {
      "top-left": { left: 0, top: 0 },
      top: { left: "50%", top: 0 },
      "top-right": { right: 0, top: 0 },
      right: { right: 0, top: "50%" },
      "bottom-right": { right: 0, bottom: 0 },
      bottom: { left: "50%", bottom: 0 },
      "bottom-left": { left: 0, bottom: 0 },
      left: { left: 0, top: "50%" },
    };

    return positions[position];
  };

  const cropWidth = imageRef.current
    ? Math.round(imageRef.current.naturalWidth * crop.width / 100)
    : 0;

  const cropHeight = imageRef.current
    ? Math.round(imageRef.current.naturalHeight * crop.height / 100)
    : 0;

  return (
    <div className="cropper-page">

      <div className="cropper-container">

        <div className="cropper-topbar">
          {onBack && (
            <button className="crop-back" onClick={onBack}>
              <span aria-hidden="true">←</span>
              <span>Back to Image Editor</span>
            </button>
          )}
        </div>

        <div className="cropper-heading">
          <h1>✂️ Image Cropper</h1>
          <p>
            Crop, resize the selection, rotate and download images.
          </p>
        </div>

        {!imageUrl ? (
          <label className="cropper-upload">

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => handleFile(e.target.files[0])}
            />

            <span>🖼️</span>

            <h3>Upload Your Image</h3>

            <p>
              Click to browse or select an image from your device.
            </p>

            <small>JPG, PNG, WebP supported</small>

          </label>
        ) : (
          <>

            <div className="cropper-stage">

              <div
                className="cropper-image-wrapper"
                style={{ width: "fit-content", maxWidth: "100%", transform: `scale(${zoom / 100})` }}
                ref={wrapperRef}
                onPointerMove={moveCrop}
                onPointerUp={stopDrag}
                onPointerCancel={stopDrag}
              >

                <img
                  ref={imageRef}
                  src={imageUrl}
                  className="cropper-image"
                  alt="Image to crop"
                  draggable="false"
                />

                <div
                  className="crop-selection"
                  style={{
                    left: `${crop.x}%`,
                    top: `${crop.y}%`,
                    width: `${crop.width}%`,
                    height: `${crop.height}%`,
                  }}
                  onPointerDown={(e) => startDrag(e, "move")}
                >

                  <div className="crop-grid" />

                  {handles.map((handle) => (
                    <div
                      key={handle}
                      className="crop-handle"
                      data-position={handle}
                      style={handlePosition(handle)}
                      onPointerDown={(e) => startDrag(e, handle)}
                    />
                  ))}

                </div>

              </div>

            </div>

            <p className="crop-instruction">
              Drag the crop box or its corner and edge handles
              to adjust the selection.
            </p>

            <div className="crop-controls">

              {/* LEFT CONTROLS */}

              <div>

                <div className="control-section">

                  <h3>Zoom: {zoom}%</h3>

                  <input
                    className="crop-range"
                    type="range"
                    min="100"
                    max="200"
                    step="5"
                    value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                  />

                </div>

                <div className="control-section">

                  <h3>Aspect Ratio</h3>

                  <div className="crop-button-group">

                    {Object.keys(ratios).map((value) => (
                      <button
                        key={value}
                        className={`crop-button ${
                          aspect === value ? "active" : ""
                        }`}
                        onClick={() => changeAspect(value)}
                      >
                        {value === "free" ? "Free Size" : value}
                      </button>
                    ))}

                  </div>

                </div>

                <div className="control-section">

                  <h3>Rotate Image</h3>

                  <div className="crop-button-group">

                    <button
                      className="crop-button"
                      onClick={() => rotateImage(-90)}
                    >
                      ↶ Rotate Left
                    </button>

                    <button
                      className="crop-button"
                      onClick={() => rotateImage(90)}
                    >
                      ↷ Rotate Right
                    </button>

                  </div>

                </div>

              </div>

              {/* RIGHT CONTROLS */}

              <div>

                <div className="control-section">

                  <h3>Output Format</h3>

                  <select
                    className="crop-select"
                    value={format}
                    onChange={(e) => setFormat(e.target.value)}
                  >
                    <option value="image/jpeg">JPG</option>
                    <option value="image/png">PNG</option>
                    <option value="image/webp">WebP</option>
                  </select>

                </div>

                <div className="control-section crop-dimensions">

                  <h3>Crop Dimensions</h3>

                  <p>
                    {imageRef.current
                      ? `${cropWidth} × ${cropHeight} px`
                      : "Loading..."}
                  </p>

                </div>

                <button
                  className="crop-main-button"
                  onClick={downloadImage}
                >
                  ↓ Crop & Download Image
                </button>

                <button
                  className="crop-remove-button"
                  onClick={removeImage}
                >
                  Remove Image
                </button>

              </div>

            </div>

          </>
        )}

        {error && (
          <p className="crop-error">{error}</p>
        )}

      </div>
    </div>
  );
}
