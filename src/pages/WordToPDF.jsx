
import { useRef, useState } from "react";
import { renderAsync } from "docx-preview";
import html2pdf from "html2pdf.js";
import "./WordToPDF.css";

function WordToPDF({ onBack }) {
  const previewRef = useRef(null);
  const docxStyleRef = useRef(null);

  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  // HANDLE WORD FILE UPLOAD
  const handleFile = async (selectedFile) => {
    if (!selectedFile) return;

    setError("");
    setReady(false);

    if (!selectedFile.name.toLowerCase().endsWith(".docx")) {
      setError("Please select a valid Word document (.docx).");
      return;
    }

    if (!previewRef.current || !docxStyleRef.current) {
      setError("Preview area is unavailable. Please refresh and try again.");
      return;
    }

    setFile(selectedFile);
    setLoading(true);

    try {
      // Clear previous document
      previewRef.current.innerHTML = "";
      docxStyleRef.current.innerHTML = "";

      // Render DOCX into the preview container.
      // Keep DOCX styles separate from the website stylesheet.
      await renderAsync(
        selectedFile,
        previewRef.current,
        docxStyleRef.current,
        {
          className: "docx-preview",
          inWrapper: true,
          breakPages: true,
          ignoreLastRenderedPageBreak: false,
          useBase64URL: true,
        }
      );

      setReady(true);
    } catch (err) {
      console.error("Word preview error:", err);

      setError(
        "Unable to preview this document. Please try another DOCX file."
      );

      setFile(null);
    } finally {
      setLoading(false);
    }
  };

  // CONVERT WORD TO PDF
  const handleConvert = async () => {
    if (!previewRef.current || !ready || !file) return;

    setConverting(true);
    setError("");

    try {
      const options = {
        margin: 10,

        filename: `${file.name.replace(/\.docx$/i, "")}.pdf`,

        image: {
          type: "jpeg",
          quality: 0.98,
        },

        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
          scrollX: 0,
          scrollY: 0,
        },

        jsPDF: {
          unit: "mm",
          format: "a4",
          orientation: "portrait",
        },

        pagebreak: {
          mode: ["css", "legacy"],
        },
      };

      await html2pdf()
        .set(options)
        .from(previewRef.current)
        .save();

    } catch (err) {
      console.error("PDF conversion error:", err);
      setError("PDF conversion failed. Please try again.");
    } finally {
      setConverting(false);
    }
  };

  // RESET TOOL
  const resetTool = () => {
    setFile(null);
    setReady(false);
    setError("");

    if (previewRef.current) {
      previewRef.current.innerHTML = "";
    }

    if (docxStyleRef.current) {
      docxStyleRef.current.innerHTML = "";
    }
  };

  return (
    <div className="word-pdf-page">
      <div className="word-pdf-container">

        {/* SEPARATE DOCX STYLES CONTAINER */}
        <div
          ref={docxStyleRef}
          style={{ display: "none" }}
        ></div>

        {/* BACK BUTTON */}
        <button
          className="word-pdf-back"
          onClick={onBack}
        >
          ← Back to Document Tools
        </button>

        {/* HEADING */}
        <div className="word-pdf-heading">
          <span className="word-pdf-icon">📄</span>

          <h1>Word to PDF Converter</h1>

          <p>
            Convert your Word documents into PDF files directly
            in your browser.
          </p>
        </div>

        {/* FILE UPLOAD */}
        {!file && (
          <label className="word-pdf-upload">
            <input
              type="file"
              accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(e) => handleFile(e.target.files[0])}
            />

            <span className="word-pdf-upload-icon">📁</span>

            <h3>Choose a Word document</h3>

            <p>
              Drag and drop your DOCX file or browse your device
            </p>

            <span className="word-pdf-browse">
              Browse Files
            </span>

            <small>Supported format: DOCX</small>
          </label>
        )}

        {/* SELECTED FILE */}
        {file && (
          <div className="word-pdf-file">
            <span>📄</span>

            <div>
              <strong>{file.name}</strong>

              <small>
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </small>
            </div>

            <button
              onClick={resetTool}
              disabled={loading || converting}
              title="Remove file"
            >
              ✕
            </button>
          </div>
        )}

        {/* LOADING */}
        {loading && (
          <div className="word-pdf-status">
            <div className="word-pdf-spinner"></div>

            <p>Preparing your document preview...</p>
          </div>
        )}

        {/* ERROR */}
        {error && (
          <div className="word-pdf-error">
            ⚠️ {error}
          </div>
        )}

        {/* DOCUMENT PREVIEW */}
        <div
          className={`word-pdf-preview ${
            ready ? "" : "word-pdf-preview-hidden"
          }`}
        >
          <div
            ref={previewRef}
            className="word-pdf-rendered"
          ></div>
        </div>

        {/* PREVIEW HEADING */}
        {ready && (
          <>
            <div className="word-pdf-preview-heading">
              <div>
                <h3>Document Preview</h3>

                <p>
                  Review your document before converting.
                </p>
              </div>

              <span>DOCX</span>
            </div>

            {/* CONVERSION ACTIONS */}
            <div className="word-pdf-actions">
              <button
                className="word-pdf-convert"
                onClick={handleConvert}
                disabled={converting}
              >
                {converting
                  ? "Converting..."
                  : "↓ Convert & Download PDF"}
              </button>

              <button
                className="word-pdf-reset"
                onClick={resetTool}
                disabled={converting}
              >
                Choose Another File
              </button>
            </div>
          </>
        )}

        {/* HOW IT WORKS */}
        <div className="word-pdf-info">
          <h3>How it works</h3>

          <div className="word-pdf-steps">
            <div>
              <span>1</span>
              <p>Upload your DOCX document.</p>
            </div>

            <div>
              <span>2</span>
              <p>Preview the document.</p>
            </div>

            <div>
              <span>3</span>
              <p>Convert and download your PDF.</p>
            </div>
          </div>
        </div>

        {/* PRIVACY MESSAGE */}
        <p className="word-pdf-privacy">
          🔒 Your document is processed locally in your browser.
          It is not uploaded to our server.
        </p>

      </div>
    </div>
  );
}

export default WordToPDF;
