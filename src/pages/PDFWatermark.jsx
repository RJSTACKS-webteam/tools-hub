
import { useRef, useState } from "react";
import { PDFDocument, rgb, degrees, StandardFonts } from "pdf-lib";
import "./PDFWatermark.css";

function PDFWatermark({ onBack }) {
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [watermark, setWatermark] = useState("CONFIDENTIAL");
  const [fontSize, setFontSize] = useState(45);
  const [opacity, setOpacity] = useState(0.25);
  const [color, setColor] = useState("#777777");
  const [rotation, setRotation] = useState(-45);
  const [position, setPosition] = useState("center");
  const [pageOption, setPageOption] = useState("all");
  const [customPages, setCustomPages] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleFile = (selectedFile) => {
    setError("");
    setSuccess("");

    if (!selectedFile) return;

    if (
      selectedFile.type !== "application/pdf" &&
      !selectedFile.name.toLowerCase().endsWith(".pdf")
    ) {
      setError("Please select a valid PDF file.");
      return;
    }

    setFile(selectedFile);
  };

  const hexToRgb = (hex) => {
    const clean = hex.replace("#", "");
    return {
      r: parseInt(clean.substring(0, 2), 16) / 255,
      g: parseInt(clean.substring(2, 4), 16) / 255,
      b: parseInt(clean.substring(4, 6), 16) / 255,
    };
  };

  const getSelectedPages = (totalPages) => {
    if (pageOption === "all") {
      return Array.from({ length: totalPages }, (_, i) => i);
    }

    const selected = new Set();

    customPages.split(",").forEach((part) => {
      const value = part.trim();

      if (value.includes("-")) {
        const [start, end] = value.split("-").map(Number);

        if (
          Number.isInteger(start) &&
          Number.isInteger(end) &&
          start >= 1 &&
          end >= start &&
          end <= totalPages
        ) {
          for (let i = start; i <= end; i++) selected.add(i - 1);
        }
      } else {
        const page = Number(value);

        if (
          Number.isInteger(page) &&
          page >= 1 &&
          page <= totalPages
        ) {
          selected.add(page - 1);
        }
      }
    });

    return [...selected].sort((a, b) => a - b);
  };

  const addWatermark = async () => {
    if (!file) {
      setError("Please upload a PDF file first.");
      return;
    }

    if (!watermark.trim()) {
      setError("Please enter watermark text.");
      return;
    }

    if (pageOption === "custom" && !customPages.trim()) {
      setError("Please enter the page numbers.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const bytes = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(bytes);

      const pages = pdfDoc.getPages();
      const selectedPages = getSelectedPages(pages.length);

      if (selectedPages.length === 0) {
        throw new Error("No valid pages selected. Check your page numbers.");
      }

      const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const text = watermark.trim();
      const { r, g, b } = hexToRgb(color);

      selectedPages.forEach((pageIndex) => {
        const page = pages[pageIndex];
        const { width, height } = page.getSize();

        const textWidth = font.widthOfTextAtSize(text, fontSize);
        const textHeight = fontSize;

        let x = (width - textWidth) / 2;
        let y = (height - textHeight) / 2;

        if (position === "top") {
          y = height - textHeight - 45;
        } else if (position === "bottom") {
          y = 45;
        } else if (position === "top-left") {
          x = 35;
          y = height - textHeight - 35;
        } else if (position === "top-right") {
          x = Math.max(35, width - textWidth - 35);
          y = height - textHeight - 35;
        } else if (position === "bottom-left") {
          x = 35;
          y = 35;
        } else if (position === "bottom-right") {
          x = Math.max(35, width - textWidth - 35);
          y = 35;
        }

        page.drawText(text, {
          x,
          y,
          size: fontSize,
          font,
          color: rgb(r, g, b),
          opacity,
          rotate: degrees(rotation),
        });
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `${file.name.replace(/\.pdf$/i, "")}_watermarked.pdf`;
      link.click();

      URL.revokeObjectURL(url);
      setSuccess(`Watermark added to ${selectedPages.length} page(s). Your PDF has been downloaded.`);
    } catch (err) {
      console.error("PDF watermark error:", err);
      setError(err.message || "Unable to add watermark. Please try another PDF.");
    } finally {
      setLoading(false);
    }
  };

  const resetTool = () => {
    setFile(null);
    setError("");
    setSuccess("");
    setWatermark("CONFIDENTIAL");
    setFontSize(45);
    setOpacity(0.25);
    setColor("#777777");
    setRotation(-45);
    setPosition("center");
    setPageOption("all");
    setCustomPages("");

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="pdf-watermark-page">
      <div className="pdf-watermark-container">
        <button className="pdf-watermark-back" onClick={onBack}>
          ← Back to Document Tools
        </button>

        <div className="pdf-watermark-heading">
          <span className="pdf-watermark-icon">💧</span>
          <h1>PDF Watermark</h1>
          <p>Add a custom text watermark to your PDF documents.</p>
        </div>

        {!file ? (
          <label className="pdf-watermark-upload">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={(e) => handleFile(e.target.files[0])}
            />
            <span className="pdf-watermark-upload-icon">📄</span>
            <h3>Upload your PDF file</h3>
            <p>Choose a PDF document from your device</p>
            <span className="pdf-watermark-browse">Browse PDF</span>
            <small>PDF files only</small>
          </label>
        ) : (
          <div className="pdf-watermark-file">
            <span className="pdf-watermark-file-icon">📄</span>
            <div>
              <strong>{file.name}</strong>
              <small>{(file.size / 1024 / 1024).toFixed(2)} MB</small>
            </div>
            <button onClick={resetTool} disabled={loading}>✕</button>
          </div>
        )}

        {file && (
          <div className="pdf-watermark-workspace">
            <div className="pdf-watermark-settings">
              <h3>Watermark Settings</h3>

              <div className="pdf-watermark-field">
                <label>Watermark Text</label>
                <input
                  type="text"
                  value={watermark}
                  maxLength={100}
                  onChange={(e) => setWatermark(e.target.value)}
                  placeholder="Enter watermark text"
                />
              </div>

              <div className="pdf-watermark-field">
                <label>Font Size: {fontSize}px</label>
                <input
                  type="range"
                  min="12"
                  max="100"
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                />
              </div>

              <div className="pdf-watermark-field">
                <label>Opacity: {Math.round(opacity * 100)}%</label>
                <input
                  type="range"
                  min="0.05"
                  max="1"
                  step="0.05"
                  value={opacity}
                  onChange={(e) => setOpacity(Number(e.target.value))}
                />
              </div>

              <div className="pdf-watermark-field">
                <label>Watermark Color</label>
                <input
                  className="pdf-watermark-color"
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                />
              </div>

              <div className="pdf-watermark-field">
                <label>Rotation: {rotation}°</label>
                <input
                  type="range"
                  min="-90"
                  max="90"
                  value={rotation}
                  onChange={(e) => setRotation(Number(e.target.value))}
                />
              </div>

              <div className="pdf-watermark-field">
                <label>Position</label>
                <select
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                >
                  <option value="center">Center</option>
                  <option value="top">Top Center</option>
                  <option value="bottom">Bottom Center</option>
                  <option value="top-left">Top Left</option>
                  <option value="top-right">Top Right</option>
                  <option value="bottom-left">Bottom Left</option>
                  <option value="bottom-right">Bottom Right</option>
                </select>
              </div>

              <div className="pdf-watermark-field">
                <label>Apply Watermark To</label>
                <select
                  value={pageOption}
                  onChange={(e) => setPageOption(e.target.value)}
                >
                  <option value="all">All Pages</option>
                  <option value="custom">Selected Pages</option>
                </select>
              </div>

              {pageOption === "custom" && (
                <div className="pdf-watermark-field">
                  <label>Page Numbers</label>
                  <input
                    type="text"
                    value={customPages}
                    onChange={(e) => setCustomPages(e.target.value)}
                    placeholder="Example: 1, 3, 5-8"
                  />
                  <small>Separate pages with commas. Use a hyphen for ranges.</small>
                </div>
              )}

              <button
                className="pdf-watermark-apply"
                onClick={addWatermark}
                disabled={loading}
              >
                {loading ? "Processing PDF..." : "↓ Add Watermark & Download"}
              </button>
            </div>

            <div className="pdf-watermark-preview">
              <h3>Live Watermark Preview</h3>
              <p>Approximate preview of your selected watermark style.</p>
              <div className="pdf-watermark-paper">
                <span
                  style={{
                    color,
                    opacity,
                    fontSize: `${Math.min(fontSize, 52)}px`,
                    transform: `rotate(${rotation}deg)`,
                    justifySelf: position.includes("left")
                      ? "start"
                      : position.includes("right")
                      ? "end"
                      : "center",
                    alignSelf: position.startsWith("top")
                      ? "start"
                      : position.startsWith("bottom")
                      ? "end"
                      : "center",
                  }}
                >
                  {watermark || "WATERMARK"}
                </span>
              </div>
              <small>Preview is illustrative and may differ from the actual PDF page.</small>
            </div>
          </div>
        )}

        {error && <div className="pdf-watermark-error">⚠️ {error}</div>}
        {success && <div className="pdf-watermark-success">✓ {success}</div>}

        <div className="pdf-watermark-info">
          <h3>How it works</h3>
          <div className="pdf-watermark-steps">
            <div><span>1</span><p>Upload your PDF document.</p></div>
            <div><span>2</span><p>Customize your watermark settings.</p></div>
            <div><span>3</span><p>Apply and download your watermarked PDF.</p></div>
          </div>
        </div>

        <p className="pdf-watermark-privacy">
          🔒 Your PDF is processed locally in your browser. It is not uploaded to our server.
        </p>
      </div>
    </div>
  );
}

export default PDFWatermark;
