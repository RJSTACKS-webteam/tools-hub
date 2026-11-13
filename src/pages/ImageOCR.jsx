
import { useEffect, useRef, useState } from "react";
import { createWorker } from "tesseract.js";
import "./ImageOCR.css";

const languages = [
  { label: "English", value: "eng" },
  { label: "Malayalam", value: "mal" },
  { label: "Hindi", value: "hin" },
];

function ImageOCR({ onBack }) {
  const [image, setImage] = useState(null);
  const [language, setLanguage] = useState("eng");
  const [extractedText, setExtractedText] = useState("");
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef(null);
  const imageUrlRef = useRef(null);
  const workerRef = useRef(null);
  const runIdRef = useRef(0);

  useEffect(() => {
    return () => {
      runIdRef.current += 1;

      if (imageUrlRef.current) {
        URL.revokeObjectURL(imageUrlRef.current);
      }

      if (workerRef.current) {
        workerRef.current.terminate().catch(() => {});
        workerRef.current = null;
      }
    };
  }, []);

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(2)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleUpload = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      event.target.value = "";
      return;
    }

    if (imageUrlRef.current) {
      URL.revokeObjectURL(imageUrlRef.current);
    }

    const url = URL.createObjectURL(file);

    imageUrlRef.current = url;

    setImage({
      name: file.name,
      size: file.size,
      type: file.type,
      url,
    });

    setExtractedText("");
    setProgress(0);
    setStatus("");
    setError("");
    setCopied(false);

    event.target.value = "";
  };

  const extractText = async () => {
    if (!image) return;

    const currentRun = ++runIdRef.current;

    setLoading(true);
    setError("");
    setExtractedText("");
    setProgress(0);
    setCopied(false);
    setStatus("Preparing OCR engine...");

    try {
      if (workerRef.current) {
        await workerRef.current.terminate();
        workerRef.current = null;
      }

      if (currentRun !== runIdRef.current) return;

      const worker = await createWorker(
        language,
        1,
        {
          logger: (message) => {
            if (currentRun !== runIdRef.current) return;

            if (message.status) {
              setStatus(message.status);
            }

            if (typeof message.progress === "number") {
              setProgress(
                Math.min(100, Math.round(message.progress * 100))
              );
            }
          },
        }
      );

      if (currentRun !== runIdRef.current) {
        await worker.terminate();
        return;
      }

      workerRef.current = worker;

      setStatus("Recognizing text...");

      const result = await worker.recognize(image.url);

      if (currentRun !== runIdRef.current) return;

      setExtractedText(result.data.text || "");
      setProgress(100);
      setStatus("Text extraction completed.");

      await worker.terminate();

      if (workerRef.current === worker) {
        workerRef.current = null;
      }
    } catch (ocrError) {
      if (currentRun === runIdRef.current) {
        setError(
          ocrError.message ||
            "Unable to extract text. Please try another image."
        );
        setStatus("OCR failed.");
      }
    } finally {
      if (currentRun === runIdRef.current) {
        setLoading(false);
      }
    }
  };

  const copyText = async () => {
    if (!extractedText) return;

    try {
      await navigator.clipboard.writeText(extractedText);
      setCopied(true);

      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(
        "Clipboard access was blocked. Select the text and copy it manually."
      );
    }
  };

  const downloadText = () => {
    if (!extractedText) return;

    const blob = new Blob([extractedText], {
      type: "text/plain;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${image.name.replace(/\.[^/.]+$/, "")}-extracted.txt`;
    link.click();

    URL.revokeObjectURL(url);
  };

  const removeImage = async () => {
    runIdRef.current += 1;

    if (workerRef.current) {
      const worker = workerRef.current;
      workerRef.current = null;
      await worker.terminate().catch(() => {});
    }

    if (imageUrlRef.current) {
      URL.revokeObjectURL(imageUrlRef.current);
      imageUrlRef.current = null;
    }

    setImage(null);
    setExtractedText("");
    setProgress(0);
    setStatus("");
    setError("");
    setLoading(false);
    setCopied(false);
  };

  return (
    <div className="image-ocr-page">
      <header className="ocr-header">
        <button className="ocr-back-btn" onClick={onBack}>
          ← Back to Image Tools
        </button>

        <h1>Image OCR</h1>

        <p>
          Extract text from images, screenshots and scanned documents.
        </p>
      </header>

      {!image ? (
        <div className="ocr-upload-card">
          <div className="ocr-upload-icon">📝</div>

          <h2>Upload Your Image</h2>

          <p>
            Select an image to recognize and extract its text.
          </p>

          <button
            className="ocr-primary-btn"
            onClick={() => fileInputRef.current?.click()}
          >
            Choose Image
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={handleUpload}
          />

          <span>Supports JPG, PNG and WebP images.</span>
        </div>
      ) : (
        <div className="ocr-workspace">
          <section className="ocr-preview-card">
            <div className="ocr-card-heading">
              <h3>Image Preview</h3>

              <button
                className="ocr-remove-btn"
                onClick={removeImage}
                disabled={loading}
              >
                Remove Image
              </button>
            </div>

            <div className="ocr-image-preview">
              <img src={image.url} alt="Uploaded image" />
            </div>

            <div className="ocr-file-details">
              <div>
                <span>File Name</span>
                <strong>{image.name}</strong>
              </div>

              <div>
                <span>File Size</span>
                <strong>{formatSize(image.size)}</strong>
              </div>

              <div>
                <span>Format</span>
                <strong>{image.type || "Unknown"}</strong>
              </div>
            </div>
          </section>

          <section className="ocr-result-card">
            <div className="ocr-card-heading">
              <h3>Text Extraction</h3>
            </div>

            <label className="ocr-label" htmlFor="ocr-language">
              Recognition Language
            </label>

            <select
              id="ocr-language"
              value={language}
              disabled={loading}
              onChange={(event) => {
                setLanguage(event.target.value);
                setExtractedText("");
                setProgress(0);
                setStatus("");
                setError("");
              }}
            >
              {languages.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>

            <button
              className="ocr-primary-btn ocr-extract-btn"
              onClick={extractText}
              disabled={loading}
            >
              {loading ? "Extracting Text..." : "Extract Text"}
            </button>

            {loading && (
              <div className="ocr-progress-section">
                <div className="ocr-progress-heading">
                  <span>{status || "Processing..."}</span>
                  <strong>{progress}%</strong>
                </div>

                <div className="ocr-progress-track">
                  <div
                    className="ocr-progress-fill"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <p>
                  The first use of a language may take longer while its
                  recognition data is downloaded.
                </p>
              </div>
            )}

            {status && !loading && (
              <p className="ocr-status">{status}</p>
            )}

            <label className="ocr-label" htmlFor="ocr-output">
              Extracted Text
            </label>

            <textarea
              id="ocr-output"
              className="ocr-output"
              value={extractedText}
              onChange={(event) => {
                setExtractedText(event.target.value);
                setCopied(false);
              }}
              placeholder="Extracted text will appear here..."
              spellCheck="false"
            />

            <div className="ocr-output-info">
              <span>
                {extractedText.length.toLocaleString()} characters
              </span>

              <span>
                {extractedText.trim()
                  ? extractedText.trim().split(/\s+/).length
                  : 0}{" "}
                words
              </span>
            </div>

            <div className="ocr-actions">
              <button
                className="ocr-primary-btn"
                onClick={copyText}
                disabled={!extractedText.trim()}
              >
                {copied ? "✓ Copied!" : "Copy Text"}
              </button>

              <button
                className="ocr-secondary-btn"
                onClick={downloadText}
                disabled={!extractedText.trim()}
              >
                Download TXT
              </button>
            </div>
          </section>
        </div>
      )}

      {error && (
        <div className="ocr-error">
          {error}
        </div>
      )}

      <div className="ocr-privacy-note">
        <strong>Privacy:</strong> Image recognition runs in your browser.
        Language recognition files may be downloaded from the internet
        on first use. Your image is not uploaded to our server.
      </div>
    </div>
  );
}

export default ImageOCR;
