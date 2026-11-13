
import { useRef, useState } from "react";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import "./PDFPageNumbers.css";

function PDFPageNumbers({ onBack }) {
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [position, setPosition] = useState("bottom-center");
  const [fontSize, setFontSize] = useState(12);
  const [color, setColor] = useState("#333333");
  const [startNumber, setStartNumber] = useState(1);
  const [skipFirstPage, setSkipFirstPage] = useState(false);

  const [pageOption, setPageOption] = useState("all");
  const [customPages, setCustomPages] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Upload PDF
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

  // Convert HEX color to RGB
  const hexToRgb = (hex) => {
    const clean = hex.replace("#", "");

    return {
      r: parseInt(clean.slice(0, 2), 16) / 255,
      g: parseInt(clean.slice(2, 4), 16) / 255,
      b: parseInt(clean.slice(4, 6), 16) / 255,
    };
  };

  // Get selected PDF pages
  const getSelectedPages = (totalPages) => {
    if (pageOption === "all") {
      return Array.from({ length: totalPages }, (_, i) => i);
    }

    if (!customPages.trim()) {
      throw new Error("Please enter the page numbers.");
    }

    const selected = new Set();
    const parts = customPages.split(",");

    for (const part of parts) {
      const value = part.trim();

      if (!value) {
        throw new Error("Please check your custom page selection.");
      }

      // Page range: 2-5
      if (/^\d+-\d+$/.test(value)) {
        const [start, end] = value.split("-").map(Number);

        if (start < 1 || end < start || end > totalPages) {
          throw new Error(
            `Invalid page range: ${value}. Your PDF has ${totalPages} pages.`
          );
        }

        for (let page = start; page <= end; page++) {
          selected.add(page - 1);
        }
      }

      // Individual page: 3
      else if (/^\d+$/.test(value)) {
        const page = Number(value);

        if (page < 1 || page > totalPages) {
          throw new Error(
            `Invalid page number: ${page}. Your PDF has ${totalPages} pages.`
          );
        }

        selected.add(page - 1);
      }

      // Invalid format
      else {
        throw new Error(
          `Invalid page selection: "${value}". Use a format like 1, 3, 5-8.`
        );
      }
    }

    return [...selected].sort((a, b) => a - b);
  };

  // Add page numbers
  const addPageNumbers = async () => {
    if (!file) {
      setError("Please upload a PDF file first.");
      return;
    }

    if (!Number.isInteger(startNumber) || startNumber < 1) {
      setError("Starting number must be a positive whole number.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const bytes = await file.arrayBuffer();

      const pdfDoc = await PDFDocument.load(bytes);
      const pages = pdfDoc.getPages();

      if (pages.length === 0) {
        throw new Error("This PDF does not contain any pages.");
      }

      const selectedPages = getSelectedPages(pages.length);

      if (selectedPages.length === 0) {
        throw new Error("Please select at least one valid page.");
      }

      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const { r, g, b } = hexToRgb(color);

      let numberedCount = 0;

      selectedPages.forEach((index) => {
        // Skip first PDF page if enabled
        if (skipFirstPage && index === 0) {
          return;
        }

        const page = pages[index];
        const { width, height } = page.getSize();

        // Preserve original PDF page numbering
        const pageNumber = String(startNumber + index);

        const textWidth = font.widthOfTextAtSize(
          pageNumber,
          fontSize
        );

        let x = (width - textWidth) / 2;
        let y = 25;

        // Top or bottom
        if (position.startsWith("top")) {
          y = height - fontSize - 25;
        }

        // Left, center or right
        if (position.endsWith("left")) {
          x = 30;
        } else if (position.endsWith("right")) {
          x = width - textWidth - 30;
        }

        page.drawText(pageNumber, {
          x,
          y,
          size: fontSize,
          font,
          color: rgb(r, g, b),
        });

        numberedCount++;
      });

      if (numberedCount === 0) {
        throw new Error("No pages were numbered. Check your page selection.");
      }

      // Save PDF
      const pdfBytes = await pdfDoc.save();

      const blob = new Blob([pdfBytes], {
        type: "application/pdf",
      });

      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;

      link.download = `${file.name.replace(/\.pdf$/i, "")}_numbered.pdf`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => URL.revokeObjectURL(url), 1000);

      setSuccess(
        `Page numbers successfully added to ${numberedCount} page(s). Your PDF has been downloaded.`
      );
    } catch (err) {
      console.error("PDF page numbering error:", err);

      setError(
        err.message ||
        "Unable to add page numbers. Please try another PDF."
      );
    } finally {
      setLoading(false);
    }
  };

  // Reset tool
  const resetTool = () => {
    setFile(null);
    setPosition("bottom-center");
    setFontSize(12);
    setColor("#333333");
    setStartNumber(1);
    setSkipFirstPage(false);

    setPageOption("all");
    setCustomPages("");

    setError("");
    setSuccess("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="pdf-numbers-page">
      <div className="pdf-numbers-container">

        <button
          className="pdf-numbers-back"
          onClick={onBack}
        >
          ← Back to Document Tools
        </button>

        {/* Heading */}
        <div className="pdf-numbers-heading">
          <span className="pdf-numbers-icon">🔢</span>

          <h1>PDF Page Numbers</h1>

          <p>
            Add professional page numbers to your PDF documents.
          </p>
        </div>

        {/* Upload Section */}
        {!file ? (
          <label className="pdf-numbers-upload">

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={(e) => handleFile(e.target.files[0])}
            />

            <span className="pdf-numbers-upload-icon">
              📄
            </span>

            <h3>Upload your PDF file</h3>

            <p>Select a PDF document from your device</p>

            <span className="pdf-numbers-browse">
              Browse PDF
            </span>

            <small>PDF files only</small>
          </label>
        ) : (
          <div className="pdf-numbers-file">

            <span className="pdf-numbers-file-icon">
              📄
            </span>

            <div>
              <strong>{file.name}</strong>

              <small>
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </small>
            </div>

            <button
              onClick={resetTool}
              disabled={loading}
              title="Remove PDF"
            >
              ✕
            </button>
          </div>
        )}

        {/* Settings and Preview */}
        {file && (
          <div className="pdf-numbers-workspace">

            {/* Settings */}
            <div className="pdf-numbers-settings">

              <h3>Numbering Settings</h3>

              {/* Position */}
              <div className="pdf-numbers-field">
                <label>Page Number Position</label>

                <select
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                >
                  <option value="bottom-left">Bottom Left</option>
                  <option value="bottom-center">Bottom Center</option>
                  <option value="bottom-right">Bottom Right</option>
                  <option value="top-left">Top Left</option>
                  <option value="top-center">Top Center</option>
                  <option value="top-right">Top Right</option>
                </select>
              </div>

              {/* Apply To */}
              <div className="pdf-numbers-field">
                <label>Apply Numbers To</label>

                <select
                  value={pageOption}
                  onChange={(e) => {
                    setPageOption(e.target.value);
                    setError("");
                  }}
                >
                  <option value="all">All Pages</option>
                  <option value="custom">Custom Pages</option>
                </select>
              </div>

              {/* Custom Pages */}
              {pageOption === "custom" && (
                <div className="pdf-numbers-field">
                  <label>Enter Page Numbers</label>

                  <input
                    type="text"
                    value={customPages}
                    onChange={(e) => setCustomPages(e.target.value)}
                    placeholder="Example: 1, 3, 5-8"
                  />

                  <small>
                    Enter individual page numbers or ranges separated by commas.
                    Example: 1, 3, 5-8.
                  </small>
                </div>
              )}

              {/* Font Size */}
              <div className="pdf-numbers-field">
                <label>Font Size: {fontSize}px</label>

                <input
                  type="range"
                  min="8"
                  max="30"
                  value={fontSize}
                  onChange={(e) =>
                    setFontSize(Number(e.target.value))
                  }
                />
              </div>

              {/* Font Color */}
              <div className="pdf-numbers-field">
                <label>Font Color</label>

                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                />
              </div>

              {/* Starting Number */}
              <div className="pdf-numbers-field">
                <label>Starting Number</label>

                <input
                  type="number"
                  min="1"
                  max="9999"
                  value={startNumber}
                  onChange={(e) => {
                    const value = e.target.value;

                    setStartNumber(
                      value === ""
                        ? 1
                        : Math.max(
                            1,
                            Math.min(9999, Number(value))
                          )
                    );
                  }}
                />
              </div>

              {/* Skip First Page */}
              <label className="pdf-numbers-checkbox">
                <input
                  type="checkbox"
                  checked={skipFirstPage}
                  onChange={(e) =>
                    setSkipFirstPage(e.target.checked)
                  }
                />

                <span>Skip first page</span>
              </label>

              {/* Apply Button */}
              <button
                className="pdf-numbers-apply"
                onClick={addPageNumbers}
                disabled={loading}
              >
                {loading
                  ? "Processing PDF..."
                  : "↓ Add Page Numbers & Download"}
              </button>

            </div>

            {/* Preview */}
            <div className="pdf-numbers-preview">

              <h3>Page Number Preview</h3>

              <p>
                See an approximate preview of your numbering style.
              </p>

              <div className="pdf-numbers-paper">

                <div className="pdf-numbers-paper-content">
                  <span>PDF DOCUMENT PREVIEW</span>

                  <span>
                    Document content will remain unchanged.
                  </span>

                  <span>
                    ____________________________
                  </span>
                </div>

                <div
                  className={`pdf-numbers-sample ${position}`}
                  style={{
                    color,
                    fontSize: `${fontSize}px`,
                  }}
                >
                  {startNumber}
                </div>

              </div>

              <small>
                Preview is illustrative. Actual placement follows the PDF
                page dimensions.
              </small>

            </div>

          </div>
        )}

        {/* Error */}
        {error && (
          <div className="pdf-numbers-error">
            ⚠️ {error}
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="pdf-numbers-success">
            ✓ {success}
          </div>
        )}

        {/* How It Works */}
        <div className="pdf-numbers-info">

          <h3>How it works</h3>

          <div className="pdf-numbers-steps">

            <div>
              <span>1</span>
              <p>Upload your PDF document.</p>
            </div>

            <div>
              <span>2</span>
              <p>Customize page numbering settings.</p>
            </div>

            <div>
              <span>3</span>
              <p>Download your numbered PDF.</p>
            </div>

          </div>
        </div>

        {/* Privacy */}
        <p className="pdf-numbers-privacy">
          🔒 Your PDF is processed locally in your browser.
          It is not uploaded to our server.
        </p>

      </div>
    </div>
  );
}

export default PDFPageNumbers;
