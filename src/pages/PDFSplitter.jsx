
import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import JSZip from "jszip";
import "./PDFSplitter.css";

function PDFSplitter({ onBack }) {
  const [file, setFile] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [pageRanges, setPageRanges] = useState("");
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

  const handleFile = async (event) => {
    const selectedFile = event.target.files?.[0];
    event.target.value = "";

    if (!selectedFile) return;

    if (
      selectedFile.type !== "application/pdf" &&
      !selectedFile.name.toLowerCase().endsWith(".pdf")
    ) {
      setError("Please select a valid PDF file.");
      return;
    }

    try {
      setError("");
      setSuccess("");
      setProgress("Reading PDF...");
      setFile(null);
      setPageCount(0);
      setPageRanges("");

      const bytes = await selectedFile.arrayBuffer();
      const pdf = await PDFDocument.load(bytes);

      setFile(selectedFile);
      setPageCount(pdf.getPageCount());
      setProgress("");
    } catch (err) {
      console.error(err);
      setProgress("");
      setError(
        "Unable to open this PDF. It may be damaged or password-protected."
      );
    }
  };

  const parseRanges = (value, totalPages) => {
    const parts = value.split(",").map((part) => part.trim());

    if (!value.trim() || parts.some((part) => !part)) {
      throw new Error("Enter page numbers or ranges, for example: 1-3, 5.");
    }

    const ranges = parts.map((part) => {
      const match = part.match(/^(\d+)\s*(?:-\s*(\d+))?$/);

      if (!match) {
        throw new Error(`Invalid page range: "${part}".`);
      }

      const start = Number(match[1]);
      const end = match[2] ? Number(match[2]) : start;

      if (
        start < 1 ||
        end < 1 ||
        start > totalPages ||
        end > totalPages
      ) {
        throw new Error(
          `Page numbers must be between 1 and ${totalPages}.`
        );
      }

      if (start > end) {
        throw new Error(
          `Invalid range "${part}". The starting page must be smaller.`
        );
      }

      return { start, end };
    });

    return ranges;
  };

  const splitPDF = async () => {
    if (!file) {
      setError("Please upload a PDF file first.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");
      setProgress("Checking page ranges...");

      const ranges = parseRanges(pageRanges, pageCount);
      const originalBytes = await file.arrayBuffer();
      const originalPDF = await PDFDocument.load(originalBytes);
      const zip = new JSZip();

      for (let i = 0; i < ranges.length; i++) {
        const { start, end } = ranges[i];

        setProgress(
          `Extracting pages ${start}-${end} (${i + 1} of ${ranges.length})...`
        );

        const newPDF = await PDFDocument.create();

        const pageIndexes = Array.from(
          { length: end - start + 1 },
          (_, index) => start - 1 + index
        );

        const copiedPages = await newPDF.copyPages(
          originalPDF,
          pageIndexes
        );

        copiedPages.forEach((page) => newPDF.addPage(page));

        const pdfBytes = await newPDF.save();

        const outputName =
          ranges.length === 1
            ? `split-pages-${start}-${end}.pdf`
            : `split-pages-${start}-${end}.pdf`;

        zip.file(outputName, pdfBytes);
      }

      setProgress("Creating ZIP file...");

      const zipBlob = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 5 },
      });

      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement("a");

      link.href = url;
      link.download = "split-pdf-files.zip";

      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => URL.revokeObjectURL(url), 1000);

      setProgress("");
      setSuccess(
        `Successfully extracted ${ranges.length} PDF file(s).`
      );
    } catch (err) {
      console.error("PDF split error:", err);
      setProgress("");
      setError(
        err.message || "Unable to split this PDF. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const removeFile = () => {
    setFile(null);
    setPageCount(0);
    setPageRanges("");
    setError("");
    setSuccess("");
    setProgress("");
  };

  return (
    <div className="pdf-splitter-page">
      <div className="pdf-splitter-container">

        <button className="splitter-back-button" onClick={onBack}>
          ← Back to PDF Tools
        </button>

        <div className="splitter-heading">
          <div className="splitter-icon">✂️</div>
          <h1>PDF Splitter</h1>
          <p>
            Extract specific pages from your PDF and save
            them as separate PDF files.
          </p>
        </div>

        {!file ? (
          <div className="splitter-upload-box">
            <div className="splitter-upload-icon">📄</div>
            <h2>Upload Your PDF</h2>
            <p>Select the PDF document you want to split.</p>

            <label className="splitter-select-button">
              Choose PDF File
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFile}
                hidden
              />
            </label>

            <small>Only PDF files are supported</small>
          </div>
        ) : (
          <div className="splitter-workspace">

            <div className="splitter-file-card">
              <span className="splitter-file-icon">📕</span>

              <div className="splitter-file-details">
                <strong>{file.name}</strong>
                <span>
                  {formatSize(file.size)} · {pageCount} pages
                </span>
              </div>

              <button
                className="splitter-remove-button"
                onClick={removeFile}
                disabled={loading}
              >
                Remove
              </button>
            </div>

            <div className="splitter-range-card">
              <h2>Select Pages to Extract</h2>
              <p>
                Enter page numbers or ranges separated by commas.
              </p>

              <label htmlFor="page-ranges">
                Page numbers and ranges
              </label>

              <input
                id="page-ranges"
                type="text"
                placeholder="Example: 1-3, 5, 8-10"
                value={pageRanges}
                onChange={(event) => {
                  setPageRanges(event.target.value);
                  setError("");
                  setSuccess("");
                }}
                disabled={loading}
              />

              <div className="splitter-example">
                <strong>Examples:</strong>
                <span>1-3 = Extract pages 1 to 3</span>
                <span>5 = Extract page 5</span>
                <span>1-3, 5, 8-10 = Create 3 PDF files</span>
              </div>

              <button
                className="splitter-action-button"
                onClick={splitPDF}
                disabled={loading}
              >
                {loading ? "Splitting PDF..." : "Split PDF"}
              </button>
            </div>
          </div>
        )}

        {progress && (
          <div className="splitter-progress">
            <div className="splitter-loader"></div>
            <span>{progress}</span>
          </div>
        )}

        {error && (
          <div className="splitter-message splitter-error">
            {error}
          </div>
        )}

        {success && (
          <div className="splitter-message splitter-success">
            ✓ {success}
          </div>
        )}

        <div className="splitter-privacy">
          🔒 Your PDF is processed directly in your browser.
          It is not uploaded to our server.
        </div>

      </div>
    </div>
  );
}

export default PDFSplitter;
