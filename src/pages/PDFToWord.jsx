
import { useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  PageBreak,
} from "docx";
import "./PDFToWord.css";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

function PDFToWord({ onBack }) {
  const [file, setFile] = useState(null);
  const [pageCount, setPageCount] = useState(0);
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

      const bytes = await selectedFile.arrayBuffer();

      const pdf = await pdfjsLib.getDocument({
        data: new Uint8Array(bytes),
      }).promise;

      setFile(selectedFile);
      setPageCount(pdf.numPages);

      await pdf.destroy();
      setProgress("");
    } catch (err) {
      console.error(err);
      setProgress("");
      setError(
        "Unable to open this PDF. It may be damaged or password-protected."
      );
    }
  };

  const extractText = (items) => {
    let lines = [];
    let currentLine = "";
    let previousY = null;

    for (const item of items) {
      if (!item.str) continue;

      const currentY = item.transform?.[5];

      if (
        previousY !== null &&
        currentY !== undefined &&
        Math.abs(currentY - previousY) > 3
      ) {
        if (currentLine.trim()) {
          lines.push(currentLine.trim());
        }
        currentLine = "";
      }

      currentLine += item.str;

      if (item.hasEOL) {
        if (currentLine.trim()) {
          lines.push(currentLine.trim());
        }
        currentLine = "";
      }

      previousY = currentY ?? previousY;
    }

    if (currentLine.trim()) {
      lines.push(currentLine.trim());
    }

    return lines;
  };

  const convertToWord = async () => {
    if (!file) {
      setError("Please upload a PDF file first.");
      return;
    }

    let pdf = null;

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      setProgress("Opening PDF...");

      const bytes = await file.arrayBuffer();

      pdf = await pdfjsLib.getDocument({
        data: new Uint8Array(bytes),
      }).promise;

      const documentSections = [];
      let extractedCharacters = 0;

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        setProgress(
          `Extracting text from page ${pageNumber} of ${pdf.numPages}...`
        );

        const page = await pdf.getPage(pageNumber);
        const textContent = await page.getTextContent();

        const lines = extractText(textContent.items);

        if (lines.length > 0) {
          extractedCharacters += lines.join("").length;

          if (documentSections.length > 0) {
            documentSections.push(
              new Paragraph({
                children: [new PageBreak()],
              })
            );
          }

          lines.forEach((line) => {
            documentSections.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: line,
                    size: 22,
                  }),
                ],
                spacing: {
                  after: 120,
                },
              })
            );
          });
        }

        page.cleanup();
      }

      if (extractedCharacters === 0) {
        throw new Error(
          "No selectable text was found. This may be a scanned PDF. Use OCR to extract text from scanned documents."
        );
      }

      setProgress("Creating Word document...");

      const wordDocument = new Document({
        sections: [
          {
            properties: {},
            children: documentSections,
          },
        ],
      });

      const wordBlob = await Packer.toBlob(wordDocument);

      const url = URL.createObjectURL(wordBlob);
      const link = document.createElement("a");

      const baseName = file.name.replace(/\.pdf$/i, "");

      link.href = url;
      link.download = `${baseName}.docx`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => URL.revokeObjectURL(url), 1000);

      setProgress("");
      setSuccess(
        `Successfully converted ${pdf.numPages} page(s) into a Word document.`
      );
    } catch (err) {
      console.error("PDF to Word error:", err);
      setProgress("");
      setError(
        err.message || "Unable to convert this PDF. Please try again."
      );
    } finally {
      if (pdf) {
        await pdf.destroy().catch(() => {});
      }

      setLoading(false);
    }
  };

  const removeFile = () => {
    setFile(null);
    setPageCount(0);
    setError("");
    setSuccess("");
    setProgress("");
  };

  return (
    <div className="pdf-word-page">
      <div className="pdf-word-container">

        <button className="word-back-button" onClick={onBack}>
          ← Back to PDF Tools
        </button>

        <div className="word-heading">
          <div className="word-icon">📝</div>
          <h1>PDF to Word</h1>
          <p>
            Convert your PDF documents into editable Word files.
          </p>
        </div>

        {!file ? (
          <div className="word-upload-box">
            <div className="word-upload-icon">📄</div>
            <h2>Upload Your PDF</h2>
            <p>Select the PDF document you want to convert.</p>

            <label className="word-select-button">
              Choose PDF File
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFile}
                hidden
              />
            </label>

            <small>PDF files only</small>
          </div>
        ) : (
          <div className="word-workspace">
            <div className="word-file-card">
              <span className="word-file-icon">📕</span>

              <div className="word-file-info">
                <strong>{file.name}</strong>
                <span>
                  {formatSize(file.size)} · {pageCount} pages
                </span>
              </div>

              <button
                className="word-remove-button"
                onClick={removeFile}
                disabled={loading}
              >
                Remove
              </button>
            </div>

            <div className="word-convert-card">
              <div className="word-format-info">
                <div>
                  <span>📄</span>
                  <strong>PDF</strong>
                </div>

                <span className="word-arrow">→</span>

                <div>
                  <span>📝</span>
                  <strong>Word (.docx)</strong>
                </div>
              </div>

              <p>
                Your PDF text will be extracted and placed into
                an editable Word document.
              </p>

              <button
                className="word-convert-button"
                onClick={convertToWord}
                disabled={loading}
              >
                {loading ? "Converting..." : "Convert to Word"}
              </button>
            </div>
          </div>
        )}

        {loading && (
          <div className="word-progress">
            <div className="word-loader"></div>
            <span>{progress}</span>
          </div>
        )}

        {error && (
          <div className="word-message word-error">
            {error}
          </div>
        )}

        {success && (
          <div className="word-message word-success">
            ✓ {success}
          </div>
        )}

        <div className="word-privacy">
          🔒 Your PDF is processed directly in your browser.
          It is not uploaded to our server.
        </div>

        <div className="word-note">
          <strong>Note:</strong> This version extracts selectable
          text. Original images, tables, columns and complex
          formatting may not be preserved. Scanned PDFs require OCR.
        </div>

      </div>
    </div>
  );
}

export default PDFToWord;
