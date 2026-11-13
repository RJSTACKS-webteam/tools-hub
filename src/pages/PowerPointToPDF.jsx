
import { useRef, useState } from "react";
import { init } from "pptx-preview";
import html2pdf from "html2pdf.js";
import "./PowerPointToPDF.css";

function PowerPointToPDF({ onBack }) {
  const previewRef = useRef(null);
  const viewerRef = useRef(null);

  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [orientation, setOrientation] = useState("landscape");
  const [paperSize, setPaperSize] = useState("a4");

  // LOAD POWERPOINT FILE
  const handleFile = async (selectedFile) => {
    if (!selectedFile) return;

    setError("");
    setReady(false);

    const extension = selectedFile.name.split(".").pop().toLowerCase();

    if (extension !== "pptx") {
      setError("Please select a PowerPoint file (.pptx).");
      return;
    }

    if (!previewRef.current) {
      setError("Preview area is unavailable. Please refresh the page.");
      return;
    }

    setFile(selectedFile);
    setLoading(true);

    try {
      previewRef.current.innerHTML = "";

      const buffer = await selectedFile.arrayBuffer();

      // Initialize the PPTX viewer
      viewerRef.current = init(previewRef.current, {
        width: 960,
        height: 540,
      });

      // Render the presentation
      await viewerRef.current.preview(buffer);

      setReady(true);
    } catch (err) {
      console.error("PowerPoint preview error:", err);

      setError(
        "Unable to preview this PowerPoint file. Please try another PPTX file."
      );

      setFile(null);
      viewerRef.current = null;
    } finally {
      setLoading(false);
    }
  };

  // CONVERT POWERPOINT TO PDF
  const handleConvert = async () => {
    if (!previewRef.current || !ready || !file) return;

    setConverting(true);
    setError("");

    try {
      const options = {
        margin: 5,

        filename: `${file.name.replace(/\.pptx$/i, "")}.pdf`,

        image: {
          type: "jpeg",
          quality: 0.98,
        },

        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
        },

        jsPDF: {
          unit: "mm",
          format: paperSize,
          orientation,
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
      console.error("PowerPoint PDF conversion error:", err);
      setError("PDF conversion failed. Please try again.");
    } finally {
      setConverting(false);
    }
  };

  // RESET
  const resetTool = () => {
    setFile(null);
    setReady(false);
    setError("");
    viewerRef.current = null;

    if (previewRef.current) {
      previewRef.current.innerHTML = "";
    }
  };

  return (
    <div className="ppt-pdf-page">
      <div className="ppt-pdf-container">

        {/* BACK BUTTON */}
        <button className="ppt-pdf-back" onClick={onBack}>
          ← Back to Document Tools
        </button>

        {/* HEADING */}
        <div className="ppt-pdf-heading">
          <span className="ppt-pdf-icon">📊</span>

          <h1>PowerPoint to PDF Converter</h1>

          <p>
            Convert your PowerPoint presentations into PDF
            documents directly in your browser.
          </p>
        </div>

        {/* FILE UPLOAD */}
        {!file && (
          <label className="ppt-pdf-upload">
            <input
              type="file"
              accept=".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation"
              onChange={(e) => handleFile(e.target.files[0])}
            />

            <span className="ppt-pdf-upload-icon">📁</span>

            <h3>Choose a PowerPoint presentation</h3>

            <p>
              Select a PPTX file from your device
            </p>

            <span className="ppt-pdf-browse">
              Browse Files
            </span>

            <small>Supported format: PPTX</small>
          </label>
        )}

        {/* SELECTED FILE */}
        {file && (
          <div className="ppt-pdf-file">
            <span>📊</span>

            <div>
              <strong>{file.name}</strong>

              <small>
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </small>
            </div>

            <button
              onClick={resetTool}
              disabled={loading || converting}
              title="Remove presentation"
            >
              ✕
            </button>
          </div>
        )}

        {/* LOADING */}
        {loading && (
          <div className="ppt-pdf-status">
            <div className="ppt-pdf-spinner"></div>
            <p>Loading your PowerPoint presentation...</p>
          </div>
        )}

        {/* ERROR */}
        {error && (
          <div className="ppt-pdf-error">
            ⚠️ {error}
          </div>
        )}

        {/* PRESENTATION SETTINGS */}
        {ready && (
          <>
            <div className="ppt-pdf-settings">
              <div className="ppt-pdf-setting">
                <label>Page Orientation</label>

                <select
                  value={orientation}
                  onChange={(e) => setOrientation(e.target.value)}
                >
                  <option value="landscape">Landscape</option>
                  <option value="portrait">Portrait</option>
                </select>
              </div>

              <div className="ppt-pdf-setting">
                <label>Paper Size</label>

                <select
                  value={paperSize}
                  onChange={(e) => setPaperSize(e.target.value)}
                >
                  <option value="a4">A4</option>
                  <option value="letter">Letter</option>
                </select>
              </div>
            </div>

            <div className="ppt-pdf-preview-heading">
              <div>
                <h3>Presentation Preview</h3>
                <p>Review your slides before converting.</p>
              </div>

              <span>PPTX</span>
            </div>
          </>
        )}

        {/* SLIDE PREVIEW */}
        <div
          className={`ppt-pdf-preview ${
            ready ? "" : "ppt-pdf-preview-hidden"
          }`}
        >
          <div
            ref={previewRef}
            className="ppt-pdf-rendered"
          ></div>
        </div>

        {/* CONVERT BUTTONS */}
        {ready && (
          <div className="ppt-pdf-actions">
            <button
              className="ppt-pdf-convert"
              onClick={handleConvert}
              disabled={converting}
            >
              {converting
                ? "Converting..."
                : "↓ Convert & Download PDF"}
            </button>

            <button
              className="ppt-pdf-reset"
              onClick={resetTool}
              disabled={converting}
            >
              Choose Another File
            </button>
          </div>
        )}

        {/* HOW IT WORKS */}
        <div className="ppt-pdf-info">
          <h3>How it works</h3>

          <div className="ppt-pdf-steps">
            <div>
              <span>1</span>
              <p>Upload your PPTX presentation.</p>
            </div>

            <div>
              <span>2</span>
              <p>Preview your presentation slides.</p>
            </div>

            <div>
              <span>3</span>
              <p>Convert and download your PDF.</p>
            </div>
          </div>
        </div>

        {/* PRIVACY */}
        <p className="ppt-pdf-privacy">
          🔒 Your presentation is processed locally in your browser.
          It is not uploaded to our server.
        </p>

      </div>
    </div>
  );
}

export default PowerPointToPDF;
