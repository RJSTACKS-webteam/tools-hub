
import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import "./PDFCompressor.css";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const compressionOptions = {
  low: {
    label: "Low",
    scale: 1.5,
    quality: 0.82,
  },
  medium: {
    label: "Medium",
    scale: 1.15,
    quality: 0.65,
  },
  high: {
    label: "High",
    scale: 0.85,
    quality: 0.45,
  },
};

function PDFCompressor({ onBack }) {
  const [file, setFile] = useState(null);
  const [level, setLevel] = useState("medium");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const selectFile = async (event) => {
    const selected = event.target.files?.[0];
    event.target.value = "";

    if (!selected) return;

    if (
      selected.type !== "application/pdf" &&
      !selected.name.toLowerCase().endsWith(".pdf")
    ) {
      setError("Please select a valid PDF file.");
      return;
    }

    setFile(selected);
    setResult(null);
    setError("");
    setProgress("");
  };

  const canvasToBlob = (canvas, quality) =>
    new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Could not compress a PDF page."));
        },
        "image/jpeg",
        quality
      );
    });

  const compressPDF = async () => {
    if (!file) {
      setError("Please select a PDF file first.");
      return;
    }

    let pdfDocument = null;

    try {
      setLoading(true);
      setError("");
      setResult(null);

      const settings = compressionOptions[level];

      setProgress("Reading PDF...");

      const inputBytes = await file.arrayBuffer();

      pdfDocument = await pdfjsLib.getDocument({
        data: new Uint8Array(inputBytes),
      }).promise;

      const outputPDF = await PDFDocument.create();

      for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber++) {
        setProgress(
          `Compressing page ${pageNumber} of ${pdfDocument.numPages}...`
        );

        const page = await pdfDocument.getPage(pageNumber);
        const viewport = page.getViewport({
          scale: settings.scale,
        });

        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        if (!context) {
          throw new Error("Your browser could not create a canvas.");
        }

        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);

        await page.render({
          canvasContext: context,
          viewport,
        }).promise;

        const imageBlob = await canvasToBlob(
          canvas,
          settings.quality
        );

        const imageBytes = await imageBlob.arrayBuffer();
        const embeddedImage = await outputPDF.embedJpg(imageBytes);

        const originalViewport = page.getViewport({ scale: 1 });

        const outputPage = outputPDF.addPage([
          originalViewport.width,
          originalViewport.height,
        ]);

        outputPage.drawImage(embeddedImage, {
          x: 0,
          y: 0,
          width: originalViewport.width,
          height: originalViewport.height,
        });

        canvas.width = 0;
        canvas.height = 0;
        page.cleanup();
      }

      setProgress("Preparing compressed PDF...");

      const outputBytes = await outputPDF.save();
      const outputBlob = new Blob([outputBytes], {
        type: "application/pdf",
      });

      const url = URL.createObjectURL(outputBlob);

      const link = document.createElement("a");
      link.href = url;
      link.download = "compressed-document.pdf";

      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => URL.revokeObjectURL(url), 1000);

      const reduction =
        ((file.size - outputBlob.size) / file.size) * 100;

      setResult({
        originalSize: file.size,
        compressedSize: outputBlob.size,
        reduction,
        pageCount: pdfDocument.numPages,
      });

      setProgress("");
    } catch (err) {
      console.error("PDF compression error:", err);
      setProgress("");

      setError(
        err.message ||
          "Unable to compress this PDF. Check whether it is valid or password-protected."
      );
    } finally {
      if (pdfDocument) {
        await pdfDocument.destroy().catch(() => {});
      }

      setLoading(false);
    }
  };

  const removeFile = () => {
    setFile(null);
    setResult(null);
    setError("");
    setProgress("");
  };

  return (
    <div className="pdf-compressor-page">
      <div className="pdf-compressor-container">
        <button className="compressor-back-button" onClick={onBack}>
          ← Back to PDF Tools
        </button>

        <div className="compressor-heading">
          <div className="compressor-icon">🗜️</div>
          <h1>PDF Compressor</h1>
          <p>
            Reduce the size of your PDF documents and make
            them easier to share.
          </p>
        </div>

        {!file ? (
          <div className="compressor-upload-box">
            <div className="compressor-upload-icon">📄</div>
            <h2>Upload Your PDF</h2>
            <p>Select the PDF you want to compress.</p>

            <label className="compressor-select-button">
              Choose PDF File
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={selectFile}
                hidden
              />
            </label>

            <small>PDF files only</small>
          </div>
        ) : (
          <div className="compressor-workspace">
            <div className="compressor-file-card">
              <span className="compressor-file-icon">📕</span>

              <div className="compressor-file-info">
                <strong>{file.name}</strong>
                <span>{formatSize(file.size)}</span>
              </div>

              <button
                className="compressor-remove-button"
                onClick={removeFile}
                disabled={loading}
              >
                Remove
              </button>
            </div>

            <div className="compressor-options">
              <h2>Choose Compression Level</h2>
              <p>
                Higher compression may reduce image quality.
              </p>

              <div className="compression-levels">
                {Object.entries(compressionOptions).map(
                  ([key, option]) => (
                    <button
                      key={key}
                      className={`compression-option ${
                        level === key ? "active" : ""
                      }`}
                      onClick={() => setLevel(key)}
                      disabled={loading}
                    >
                      <strong>{option.label}</strong>
                      <span>
                        {key === "low"
                          ? "Better quality"
                          : key === "medium"
                            ? "Balanced"
                            : "Smaller size"}
                      </span>
                    </button>
                  )
                )}
              </div>

              <button
                className="compressor-action-button"
                onClick={compressPDF}
                disabled={loading}
              >
                {loading ? "Compressing..." : "Compress PDF"}
              </button>
            </div>
          </div>
        )}

        {loading && (
          <div className="compressor-progress">
            <div className="compressor-loader"></div>
            <span>{progress}</span>
          </div>
        )}

        {error && (
          <div className="compressor-message compressor-error">
            {error}
          </div>
        )}

        {result && (
          <div className="compressor-result">
            <h2>Compression Complete</h2>

            <div className="compressor-result-grid">
              <div>
                <span>Original Size</span>
                <strong>{formatSize(result.originalSize)}</strong>
              </div>

              <div>
                <span>New Size</span>
                <strong>{formatSize(result.compressedSize)}</strong>
              </div>

              <div>
                <span>Size Change</span>
                <strong>
                  {result.reduction >= 0
                    ? `${result.reduction.toFixed(1)}% smaller`
                    : `${Math.abs(result.reduction).toFixed(1)}% larger`}
                </strong>
              </div>
            </div>

            <p>
              Processed {result.pageCount} page(s).
              {result.reduction <= 0
                ? " This PDF did not become smaller at the selected quality level."
                : ""}
            </p>
          </div>
        )}

        <div className="compressor-privacy">
          🔒 Your PDF is processed directly in your browser.
          It is not uploaded to our server.
        </div>

        <p className="compressor-disclaimer">
          Note: This tool converts PDF pages into compressed images.
          Selectable text, links, forms and some document features
          may not be preserved.
        </p>
      </div>
    </div>
  );
}

export default PDFCompressor;
