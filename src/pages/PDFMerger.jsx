
import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import "./PDFMerger.css";

function PDFMerger({ onBack }) {
  const [files, setFiles] = useState([]);
  const [merging, setMerging] = useState(false);
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

  const addFiles = (event) => {
    const selectedFiles = Array.from(event.target.files || []);

    const validFiles = selectedFiles.filter(
      (file) => file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf")
    );

    if (validFiles.length !== selectedFiles.length) {
      setError("Only PDF files are allowed.");
    } else {
      setError("");
    }

    setSuccess("");

    setFiles((previous) => [
      ...previous,
      ...validFiles,
    ]);

    event.target.value = "";
  };

  const removeFile = (index) => {
    setFiles((previous) =>
      previous.filter((_, i) => i !== index)
    );

    setError("");
    setSuccess("");
  };

  const moveFile = (index, direction) => {
    const newIndex = index + direction;

    if (newIndex < 0 || newIndex >= files.length) return;

    const updatedFiles = [...files];

    [updatedFiles[index], updatedFiles[newIndex]] = [
      updatedFiles[newIndex],
      updatedFiles[index],
    ];

    setFiles(updatedFiles);
    setSuccess("");
  };

  const clearFiles = () => {
    setFiles([]);
    setError("");
    setSuccess("");
    setProgress("");
  };

  const mergePDFs = async () => {
    if (files.length < 2) {
      setError("Please select at least two PDF files.");
      return;
    }

    try {
      setMerging(true);
      setError("");
      setSuccess("");
      setProgress("Preparing your PDF files...");

      const mergedPDF = await PDFDocument.create();

      for (let i = 0; i < files.length; i++) {
        setProgress(
          `Processing PDF ${i + 1} of ${files.length}...`
        );

        const fileBytes = await files[i].arrayBuffer();

        const pdf = await PDFDocument.load(fileBytes);

        const copiedPages = await mergedPDF.copyPages(
          pdf,
          pdf.getPageIndices()
        );

        copiedPages.forEach((page) => {
          mergedPDF.addPage(page);
        });
      }

      setProgress("Creating merged PDF...");

      const mergedBytes = await mergedPDF.save();

      const blob = new Blob([mergedBytes], {
        type: "application/pdf",
      });

      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = "merged-document.pdf";

      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(url);

      setProgress("");
      setSuccess("Your PDF files have been merged successfully!");
    } catch (err) {
      console.error("PDF merge error:", err);

      setError(
        "Unable to merge these PDFs. Please check that the files are valid and not password-protected."
      );

      setProgress("");
    } finally {
      setMerging(false);
    }
  };

  return (
    <div className="pdf-merger-page">
      <div className="pdf-merger-container">

        <button className="pdf-back-button" onClick={onBack}>
          ← Back to PDF Tools
        </button>

        <div className="pdf-merger-heading">
          <div className="pdf-merger-icon">📄</div>

          <h1>PDF Merger</h1>

          <p>
            Combine multiple PDF files into one document
            quickly and easily.
          </p>
        </div>

        <div className="pdf-upload-box">
          <div className="pdf-upload-icon">📁</div>

          <h2>Select PDF Files</h2>

          <p>
            Choose two or more PDF files to combine.
          </p>

          <label className="pdf-select-button">
            + Choose PDF Files
            <input
              type="file"
              accept=".pdf,application/pdf"
              multiple
              onChange={addFiles}
              disabled={merging}
              hidden
            />
          </label>

          <small>PDF files only</small>
        </div>

        {files.length > 0 && (
          <div className="pdf-files-section">
            <div className="pdf-files-header">
              <div>
                <h2>Selected Files</h2>
                <p>{files.length} PDF file(s) selected</p>
              </div>

              <button
                className="pdf-clear-button"
                onClick={clearFiles}
                disabled={merging}
              >
                Clear All
              </button>
            </div>

            <div className="pdf-file-list">
              {files.map((file, index) => (
                <div className="pdf-file-item" key={`${file.name}-${index}`}>
                  <div className="pdf-file-icon">📕</div>

                  <div className="pdf-file-info">
                    <strong>{file.name}</strong>
                    <span>{formatSize(file.size)}</span>
                  </div>

                  <div className="pdf-file-actions">
                    <button
                      title="Move up"
                      onClick={() => moveFile(index, -1)}
                      disabled={merging || index === 0}
                    >
                      ↑
                    </button>

                    <button
                      title="Move down"
                      onClick={() => moveFile(index, 1)}
                      disabled={merging || index === files.length - 1}
                    >
                      ↓
                    </button>

                    <button
                      title="Remove file"
                      className="pdf-remove-button"
                      onClick={() => removeFile(index)}
                      disabled={merging}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <p className="pdf-order-note">
              The PDFs will be merged in the order shown above.
              Use the arrows to change their order.
            </p>

            <button
              className="pdf-merge-button"
              onClick={mergePDFs}
              disabled={merging || files.length < 2}
            >
              {merging ? "Merging PDFs..." : "Merge PDF Files"}
            </button>
          </div>
        )}

        {merging && (
          <div className="pdf-progress-message">
            <div className="pdf-loader"></div>
            <p>{progress}</p>
          </div>
        )}

        {error && (
          <div className="pdf-message pdf-error">
            {error}
          </div>
        )}

        {success && (
          <div className="pdf-message pdf-success">
            ✓ {success}
          </div>
        )}

        <div className="pdf-privacy-note">
          <span>🔒</span>
          <p>
            Your PDFs are processed directly in your browser.
            Your documents are not uploaded to our server.
          </p>
        </div>

      </div>
    </div>
  );
}

export default PDFMerger;
