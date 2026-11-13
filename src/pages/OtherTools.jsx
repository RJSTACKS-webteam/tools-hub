
import { useState } from "react";
import QRCode from "qrcode";
import JSZip from "jszip";

const tools = [
  {
    id: "qr",
    name: "QR Generator",
    icon: "▦",
    desc: "Generate QR codes for text, URLs and more.",
  },
  {
    id: "zip",
    name: "ZIP Extractor",
    icon: "📦",
    desc: "Open ZIP archives and download extracted files.",
  },
  {
    id: "word",
    name: "Word Counter",
    icon: "📝",
    desc: "Count words, characters and reading time.",
  },
  {
    id: "password",
    name: "Password Generator",
    icon: "🔐",
    desc: "Generate strong, random passwords.",
  },
];

function OtherTools({ onBack }) {
  const [activeTool, setActiveTool] = useState(null);

  // QR Generator
  const [qrText, setQrText] = useState("");
  const [qrImage, setQrImage] = useState("");
  const [qrSize, setQrSize] = useState(300);
  const [qrError, setQrError] = useState("");

  // ZIP Extractor
  const [zipFile, setZipFile] = useState(null);
  const [zipEntries, setZipEntries] = useState([]);
  const [zipError, setZipError] = useState("");
  const [zipLoading, setZipLoading] = useState(false);
  const [zipPreview, setZipPreview] = useState("");
  const [zipPreviewName, setZipPreviewName] = useState("");

  // Word Counter
  const [wordText, setWordText] = useState("");

  // Password Generator
  const [passwordLength, setPasswordLength] = useState(16);
  const [includeUppercase, setIncludeUppercase] = useState(true);
  const [includeLowercase, setIncludeLowercase] = useState(true);
  const [includeNumbers, setIncludeNumbers] = useState(true);
  const [includeSymbols, setIncludeSymbols] = useState(true);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const selectedTool = tools.find((tool) => tool.id === activeTool);

  const resetTool = () => {
    setQrText("");
    setQrImage("");
    setQrError("");

    setZipFile(null);
    setZipEntries([]);
    setZipError("");
    setZipLoading(false);
    setZipPreview("");
    setZipPreviewName("");

    setWordText("");

    setPasswordLength(16);
    setIncludeUppercase(true);
    setIncludeLowercase(true);
    setIncludeNumbers(true);
    setIncludeSymbols(true);
    setPassword("");
    setPasswordError("");
  };

  const openTool = (id) => {
    resetTool();
    setActiveTool(id);
  };

  const goBack = () => {
    resetTool();
    setActiveTool(null);
  };

  // =========================
  // QR GENERATOR
  // =========================

  const generateQR = async () => {
    setQrError("");
    setQrImage("");

    if (!qrText.trim()) {
      setQrError("Please enter some text or a URL.");
      return;
    }

    try {
      const image = await QRCode.toDataURL(qrText, {
        width: qrSize,
        margin: 2,
        errorCorrectionLevel: "H",
        color: {
          dark: "#19345b",
          light: "#ffffff",
        },
      });

      setQrImage(image);
    } catch (error) {
      setQrError("Unable to generate QR code. Please try again.");
    }
  };

  const downloadQR = () => {
    if (!qrImage) return;

    const link = document.createElement("a");
    link.href = qrImage;
    link.download = "tools-hub-qrcode.png";
    link.click();
  };

  // =========================
  // ZIP EXTRACTOR
  // =========================

  const handleZipFile = async (file) => {
    if (!file) return;

    setZipError("");
    setZipEntries([]);
    setZipPreview("");
    setZipPreviewName("");
    setZipFile(null);

    if (!file.name.toLowerCase().endsWith(".zip")) {
      setZipError("Please select a valid ZIP file.");
      return;
    }

    setZipLoading(true);

    try {
      const zip = await JSZip.loadAsync(file);

      const entries = Object.values(zip.files)
        .filter((entry) => !entry.dir)
        .map((entry) => ({
          name: entry.name,
          size: entry._data?.uncompressedSize ?? 0,
          compressedSize: entry._data?.compressedSize ?? 0,
          entry,
        }));

      setZipFile(file);
      setZipEntries(entries);

      if (entries.length === 0) {
        setZipError("This ZIP archive does not contain any files.");
      }
    } catch (error) {
      setZipError(
        "Unable to open this ZIP file. It may be corrupted or unsupported."
      );
    } finally {
      setZipLoading(false);
    }
  };

  const downloadZipEntry = async (item) => {
    try {
      const blob = await item.entry.async("blob");
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = item.name.split("/").pop() || "extracted-file";

      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setZipError(`Could not extract ${item.name}.`);
    }
  };

  const previewZipEntry = async (item) => {
    setZipError("");
    setZipPreview("");
    setZipPreviewName(item.name);

    try {
      const extension = item.name.split(".").pop()?.toLowerCase();

      const previewable = [
        "txt", "json", "html", "htm", "css", "js",
        "jsx", "xml", "csv", "md", "log",
      ];

      if (!previewable.includes(extension)) {
        setZipPreview(
          "Preview is not available for this file type. You can still download it."
        );
        return;
      }

      const content = await item.entry.async("text");
      const maxPreviewLength = 100000;

      setZipPreview(
        content.length > maxPreviewLength
          ? content.slice(0, maxPreviewLength) + "\n\n[Preview truncated]"
          : content
      );
    } catch (error) {
      setZipPreview("Unable to preview this file.");
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return "0 B";

    const units = ["B", "KB", "MB", "GB"];
    const index = Math.min(
      Math.floor(Math.log(bytes) / Math.log(1024)),
      units.length - 1
    );

    return `${(bytes / Math.pow(1024, index)).toFixed(
      index === 0 ? 0 : 2
    )} ${units[index]}`;
  };

  // =========================
  // WORD COUNTER
  // =========================

  const words = wordText.trim()
    ? wordText.trim().split(/\s+/).filter(Boolean)
    : [];

  const wordCount = words.length;
  const characterCount = wordText.length;
  const characterNoSpaces = wordText.replace(/\s/g, "").length;

  const sentences = wordText.trim()
    ? (wordText.match(/[.!?]+(?=\s|$)/g) || []).length
    : 0;

  const paragraphs = wordText.trim()
    ? wordText.trim().split(/\n\s*\n/).filter(Boolean).length
    : 0;

  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  // =========================
  // PASSWORD GENERATOR
  // =========================

  const generatePassword = () => {
    setPasswordError("");

    let characters = "";

    if (includeUppercase) characters += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    if (includeLowercase) characters += "abcdefghijklmnopqrstuvwxyz";
    if (includeNumbers) characters += "0123456789";
    if (includeSymbols) characters += "!@#$%^&*()-_=+[]{};:,.?";

    if (!characters) {
      setPasswordError("Please select at least one character type.");
      setPassword("");
      return;
    }

    const randomValues = new Uint32Array(passwordLength);
    crypto.getRandomValues(randomValues);

    let result = "";

    for (let i = 0; i < passwordLength; i++) {
      result += characters[randomValues[i] % characters.length];
    }

    setPassword(result);
  };

  const copyText = async (value, errorSetter) => {
    try {
      await navigator.clipboard.writeText(value);
      errorSetter("");
    } catch {
      errorSetter("Clipboard access failed. Please copy manually.");
    }
  };

  // =========================
  // UI
  // =========================

  return (
    <div className="oth-page">
      <style>{`

        .oth-page {
          min-height: 100vh;
          padding: 35px 20px 65px;
          background: #f5f8ff;
          color: #19345b;
          font-family: inherit;
          text-align: left;
        }

        .oth-page * {
          box-sizing: border-box;
        }

        .oth-container {
          max-width: 1150px;
          margin: auto;
        }

        .oth-back {
          border: 0;
          background: transparent;
          color: #2563eb;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          padding: 10px 0;
          margin-bottom: 20px;
        }

        .oth-back:hover {
          color: #174fc4;
        }

        .oth-heading {
          text-align: center;
          margin-bottom: 35px;
        }

        .oth-heading-icon {
          width: 66px;
          height: 66px;
          border-radius: 19px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: #e5edff;
          color: #2563eb;
          font-size: 28px;
          font-weight: 800;
          margin-bottom: 13px;
        }

        .oth-heading h1 {
          font-size: 32px;
          margin: 0 0 9px;
          color: #19345b;
        }

        .oth-heading p {
          color: #71839e;
          margin: 0;
          font-size: 15px;
        }

        /* Dashboard */

        .oth-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 17px;
        }

        .oth-card {
          text-align: left;
          display: flex;
          align-items: center;
          gap: 15px;
          min-height: 112px;
          padding: 20px;
          background: #ffffff;
          border: 1px solid #e1e9f6;
          border-radius: 15px;
          cursor: pointer;
          transition: 0.2s ease;
          color: inherit;
        }

        .oth-card:hover {
          border-color: #8db4ff;
          transform: translateY(-3px);
          box-shadow: 0 10px 25px #2563eb12;
        }

        .oth-card-icon {
          width: 48px;
          height: 48px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 13px;
          background: #edf3ff;
          color: #2563eb;
          font-size: 21px;
          font-weight: 800;
        }

        .oth-card-text {
          flex: 1;
          min-width: 0;
        }

        .oth-card-text strong {
          display: block;
          font-size: 15px;
          margin-bottom: 6px;
        }

        .oth-card-text small {
          display: block;
          color: #8392a8;
          line-height: 1.45;
          font-size: 12px;
        }

        .oth-arrow {
          color: #2563eb;
          font-size: 20px;
        }

        /* Workspace */

        .oth-workspace {
          background: #ffffff;
          border: 1px solid #e1e9f6;
          border-radius: 18px;
          padding: 25px;
          box-shadow: 0 8px 30px #1d3b6710;
        }

        .oth-toolbar {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 22px;
        }

        .oth-toolbar h2 {
          font-size: 20px;
          margin: 0;
        }

        .oth-toolbar p {
          font-size: 13px;
          color: #8392a8;
          margin: 5px 0 0;
        }

        .oth-label {
          display: block;
          color: #405574;
          font-size: 13px;
          font-weight: 700;
          margin-bottom: 9px;
        }

        .oth-input,
        .oth-textarea,
        .oth-select {
          width: 100%;
          border: 1px solid #dce5f2;
          border-radius: 10px;
          padding: 13px 15px;
          background: #fbfcff;
          color: #243955;
          outline: none;
          font-size: 14px;
        }

        .oth-textarea {
          min-height: 190px;
          resize: vertical;
          line-height: 1.7;
        }

        .oth-input:focus,
        .oth-textarea:focus,
        .oth-select:focus {
          border-color: #5790f5;
          box-shadow: 0 0 0 3px #2563eb12;
        }

        .oth-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin: 18px 0;
        }

        .oth-btn {
          border: 0;
          border-radius: 9px;
          padding: 12px 19px;
          background: #2563eb;
          color: white;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: 0.2s;
        }

        .oth-btn:hover {
          background: #174fc4;
        }

        .oth-btn.secondary {
          background: #edf3ff;
          color: #2563eb;
        }

        .oth-btn.secondary:hover {
          background: #dfeaff;
        }

        .oth-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .oth-error {
          margin: 15px 0;
          padding: 12px 15px;
          border-radius: 9px;
          color: #b42318;
          background: #fff1f0;
          border: 1px solid #ffd5d2;
          font-size: 13px;
          overflow-wrap: anywhere;
        }

        .oth-info {
          margin-top: 18px;
          padding: 15px;
          background: #f4f7fd;
          border-radius: 10px;
          color: #71839e;
          font-size: 12px;
          line-height: 1.6;
        }

        /* QR */

        .oth-qr-preview {
          margin-top: 25px;
          padding: 25px;
          background: #f7f9fd;
          border: 1px solid #e3eaf4;
          border-radius: 14px;
          text-align: center;
        }

        .oth-qr-preview img {
          display: block;
          max-width: 100%;
          height: auto;
          margin: auto;
          background: white;
          border-radius: 8px;
        }

        .oth-qr-settings {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin-top: 18px;
        }

        /* ZIP */

        .oth-upload {
          display: block;
          padding: 35px 20px;
          text-align: center;
          border: 2px dashed #c9d8f1;
          border-radius: 14px;
          background: #f8faff;
          cursor: pointer;
          transition: 0.2s;
        }

        .oth-upload:hover {
          border-color: #5790f5;
          background: #f2f6ff;
        }

        .oth-upload input {
          display: none;
        }

        .oth-upload-icon {
          font-size: 40px;
          display: block;
          margin-bottom: 12px;
        }

        .oth-upload strong {
          display: block;
          font-size: 15px;
          margin-bottom: 7px;
        }

        .oth-upload small {
          color: #8392a8;
        }

        .oth-file-list {
          margin-top: 20px;
          border: 1px solid #e3eaf4;
          border-radius: 12px;
          overflow: hidden;
        }

        .oth-file-header {
          padding: 13px 16px;
          background: #f4f7fd;
          display: flex;
          justify-content: space-between;
          gap: 10px;
          font-size: 13px;
          font-weight: 700;
        }

        .oth-file-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 13px 16px;
          border-top: 1px solid #edf1f7;
        }

        .oth-file-icon {
          font-size: 22px;
        }

        .oth-file-name {
          flex: 1;
          min-width: 0;
        }

        .oth-file-name strong {
          display: block;
          font-size: 13px;
          overflow-wrap: anywhere;
        }

        .oth-file-name small {
          display: block;
          color: #8392a8;
          margin-top: 4px;
          font-size: 11px;
        }

        .oth-file-actions {
          display: flex;
          gap: 7px;
          flex-wrap: wrap;
        }

        .oth-small-btn {
          border: 0;
          background: #edf3ff;
          color: #2563eb;
          border-radius: 7px;
          padding: 8px 10px;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }

        .oth-small-btn:hover {
          background: #dfeaff;
        }

        .oth-preview {
          margin-top: 18px;
          padding: 16px;
          background: #f7f9fd;
          border: 1px solid #e3eaf4;
          border-radius: 10px;
        }

        .oth-preview h4 {
          margin: 0 0 12px;
          font-size: 13px;
          overflow-wrap: anywhere;
        }

        .oth-preview pre {
          white-space: pre-wrap;
          overflow-wrap: anywhere;
          max-height: 300px;
          overflow: auto;
          margin: 0;
          text-align: left;
          direction: ltr;
          font: 12px/1.6 Consolas, Monaco, monospace;
        }

        /* Word counter */

        .oth-stats {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 13px;
          margin-top: 20px;
        }

        .oth-stat {
          padding: 18px 12px;
          background: #f7f9fd;
          border: 1px solid #e3eaf4;
          border-radius: 12px;
          text-align: center;
        }

        .oth-stat strong {
          display: block;
          color: #2563eb;
          font-size: 25px;
          margin-bottom: 6px;
        }

        .oth-stat span {
          color: #71839e;
          font-size: 12px;
        }

        .oth-word-footer {
          display: flex;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 14px;
          color: #8392a8;
          font-size: 12px;
        }

        /* Password */

        .oth-password-output {
          padding: 18px;
          background: #f7f9fd;
          border: 1px solid #e3eaf4;
          border-radius: 11px;
          font: 16px/1.6 Consolas, Monaco, monospace;
          overflow-wrap: anywhere;
          color: #19345b;
          min-height: 58px;
          margin-top: 20px;
        }

        .oth-options {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 13px;
          margin-top: 20px;
        }

        .oth-check {
          display: flex;
          align-items: center;
          gap: 9px;
          color: #405574;
          font-size: 13px;
          cursor: pointer;
        }

        .oth-check input {
          width: 17px;
          height: 17px;
          accent-color: #2563eb;
          cursor: pointer;
        }

        .oth-range-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 10px;
        }

        .oth-range-row strong {
          color: #2563eb;
        }

        .oth-range {
          width: 100%;
          accent-color: #2563eb;
        }

        .oth-footer {
          text-align: center;
          margin-top: 30px;
          color: #8998ad;
          font-size: 12px;
        }

        @media (max-width: 850px) {
          .oth-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 560px) {
          .oth-page {
            padding: 22px 13px 45px;
          }

          .oth-grid {
            grid-template-columns: 1fr;
          }

          .oth-heading h1 {
            font-size: 26px;
          }

          .oth-workspace {
            padding: 16px;
          }

          .oth-qr-settings,
          .oth-options {
            grid-template-columns: 1fr;
          }

          .oth-stats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .oth-file-row {
            align-items: flex-start;
            flex-wrap: wrap;
          }

          .oth-file-actions {
            width: 100%;
            padding-left: 34px;
          }

          .oth-actions .oth-btn {
            flex: 1;
          }
        }

      `}</style>

      <div className="oth-container">

        {/* BACK BUTTON */}

        <button
          className="oth-back"
          onClick={activeTool ? goBack : onBack}
        >
          ← {activeTool ? "Back to Other Tools" : "Back to Categories"}
        </button>

        {/* HEADING */}

        <div className="oth-heading">

          <div className="oth-heading-icon">
            {selectedTool?.icon || "🧰"}
          </div>

          <h1>{selectedTool?.name || "Other Tools"}</h1>

          <p>
            {selectedTool?.desc ||
              "More useful everyday utilities."}
          </p>

        </div>

        {/* DASHBOARD */}

        {!activeTool ? (

          <div className="oth-grid">

            {tools.map((tool) => (

              <button
                className="oth-card"
                key={tool.id}
                onClick={() => openTool(tool.id)}
              >

                <span className="oth-card-icon">
                  {tool.icon}
                </span>

                <span className="oth-card-text">
                  <strong>{tool.name}</strong>
                  <small>{tool.desc}</small>
                </span>

                <span className="oth-arrow">→</span>

              </button>

            ))}

          </div>

        ) : (

          <div className="oth-workspace">

            <div className="oth-toolbar">
              <div>
                <h2>{selectedTool.name}</h2>
                <p>{selectedTool.desc}</p>
              </div>
            </div>

            {/* =========================
                QR GENERATOR
            ========================= */}

            {activeTool === "qr" && (

              <>

                <label className="oth-label" htmlFor="oth-qr-input">
                  Enter text or URL
                </label>

                <textarea
                  id="oth-qr-input"
                  className="oth-textarea"
                  value={qrText}
                  onChange={(e) => {
                    setQrText(e.target.value);
                    setQrImage("");
                    setQrError("");
                  }}
                  placeholder="Enter a website URL, contact information, text or any message..."
                />

                <div className="oth-qr-settings">

                  <div>
                    <label className="oth-label" htmlFor="oth-qr-size">
                      QR Code Size
                    </label>

                    <select
                      id="oth-qr-size"
                      className="oth-select"
                      value={qrSize}
                      onChange={(e) => setQrSize(Number(e.target.value))}
                    >
                      <option value={200}>200 × 200</option>
                      <option value={300}>300 × 300</option>
                      <option value={500}>500 × 500</option>
                      <option value={800}>800 × 800</option>
                    </select>
                  </div>

                  <div>
                    <label className="oth-label">
                      Output Format
                    </label>
                    <div className="oth-info" style={{ marginTop: 0 }}>
                      PNG Image
                    </div>
                  </div>

                </div>

                <div className="oth-actions">

                  <button
                    className="oth-btn"
                    onClick={generateQR}
                  >
                    Generate QR Code
                  </button>

                  <button
                    className="oth-btn secondary"
                    onClick={() => {
                      setQrText("");
                      setQrImage("");
                      setQrError("");
                    }}
                  >
                    Clear
                  </button>

                </div>

                {qrError && (
                  <div className="oth-error">⚠️ {qrError}</div>
                )}

                {qrImage && (

                  <div className="oth-qr-preview">

                    <img
                      src={qrImage}
                      alt="Generated QR code"
                    />

                    <div className="oth-actions" style={{ justifyContent: "center" }}>

                      <button
                        className="oth-btn"
                        onClick={downloadQR}
                      >
                        ↓ Download QR Code
                      </button>

                      <button
                        className="oth-btn secondary"
                        onClick={() => copyText(qrText, setQrError)}
                      >
                        Copy Original Text
                      </button>

                    </div>

                  </div>

                )}

                <div className="oth-info">
                  Your QR code is generated locally in your browser.
                  No data is uploaded to a server.
                </div>

              </>

            )}

            {/* =========================
                ZIP EXTRACTOR
            ========================= */}

            {activeTool === "zip" && (

              <>

                <label className="oth-upload">

                  <input
                    type="file"
                    accept=".zip,application/zip,application/x-zip-compressed"
                    onChange={(e) => handleZipFile(e.target.files?.[0])}
                  />

                  <span className="oth-upload-icon">📦</span>

                  <strong>
                    {zipFile ? zipFile.name : "Choose a ZIP file"}
                  </strong>

                  <small>
                    Click here to select a ZIP archive from your device
                  </small>

                </label>

                {zipLoading && (
                  <div className="oth-info">
                    Opening ZIP archive... Please wait.
                  </div>
                )}

                {zipError && (
                  <div className="oth-error">⚠️ {zipError}</div>
                )}

                {zipFile && zipEntries.length > 0 && (

                  <div className="oth-file-list">

                    <div className="oth-file-header">
                      <span>Extracted Files</span>
                      <span>{zipEntries.length} files</span>
                    </div>

                    {zipEntries.map((item, index) => (

                      <div className="oth-file-row" key={`${item.name}-${index}`}>

                        <span className="oth-file-icon">📄</span>

                        <div className="oth-file-name">

                          <strong>{item.name}</strong>

                          <small>
                            {formatBytes(item.size)}
                          </small>

                        </div>

                        <div className="oth-file-actions">

                          <button
                            className="oth-small-btn"
                            onClick={() => previewZipEntry(item)}
                          >
                            Preview
                          </button>

                          <button
                            className="oth-small-btn"
                            onClick={() => downloadZipEntry(item)}
                          >
                            Download
                          </button>

                        </div>

                      </div>

                    ))}

                  </div>

                )}

                {zipPreviewName && (

                  <div className="oth-preview">

                    <h4>Preview: {zipPreviewName}</h4>

                    <pre>{zipPreview}</pre>

                  </div>

                )}

                <div className="oth-info">
                  ZIP files are processed locally in your browser.
                  Choose a file and download the extracted files individually.
                  Large or encrypted archives may not be supported.
                </div>

              </>

            )}

            {/* =========================
                WORD COUNTER
            ========================= */}

            {activeTool === "word" && (

              <>

                <label className="oth-label" htmlFor="oth-word-input">
                  Enter or paste your text
                </label>

                <textarea
                  id="oth-word-input"
                  className="oth-textarea"
                  value={wordText}
                  onChange={(e) => setWordText(e.target.value)}
                  placeholder="Start typing or paste your document here..."
                  style={{ minHeight: 270 }}
                />

                <div className="oth-stats">

                  <div className="oth-stat">
                    <strong>{wordCount}</strong>
                    <span>Words</span>
                  </div>

                  <div className="oth-stat">
                    <strong>{characterCount}</strong>
                    <span>Characters</span>
                  </div>

                  <div className="oth-stat">
                    <strong>{characterNoSpaces}</strong>
                    <span>Without Spaces</span>
                  </div>

                  <div className="oth-stat">
                    <strong>{sentences}</strong>
                    <span>Sentences</span>
                  </div>

                  <div className="oth-stat">
                    <strong>{paragraphs}</strong>
                    <span>Paragraphs</span>
                  </div>

                  <div className="oth-stat">
                    <strong>{readingTime} min</strong>
                    <span>Reading Time</span>
                  </div>

                </div>

                <div className="oth-word-footer">
                  <span>Updates automatically as you type.</span>
                  <span>{wordCount * 5} estimated speaking seconds</span>
                </div>

                <div className="oth-actions">

                  <button
                    className="oth-btn secondary"
                    onClick={() => setWordText("")}
                  >
                    Clear Text
                  </button>

                  <button
                    className="oth-btn"
                    onClick={() => copyText(wordText, () => {})}
                    disabled={!wordText}
                  >
                    Copy Text
                  </button>

                </div>

              </>

            )}

            {/* =========================
                PASSWORD GENERATOR
            ========================= */}

            {activeTool === "password" && (

              <>

                <div className="oth-range-row">

                  <label className="oth-label" htmlFor="oth-password-length">
                    Password Length
                  </label>

                  <strong>{passwordLength} characters</strong>

                </div>

                <input
                  id="oth-password-length"
                  className="oth-range"
                  type="range"
                  min="6"
                  max="64"
                  value={passwordLength}
                  onChange={(e) => setPasswordLength(Number(e.target.value))}
                />

                <div className="oth-options">

                  <label className="oth-check">
                    <input
                      type="checkbox"
                      checked={includeUppercase}
                      onChange={(e) => setIncludeUppercase(e.target.checked)}
                    />
                    Uppercase (A-Z)
                  </label>

                  <label className="oth-check">
                    <input
                      type="checkbox"
                      checked={includeLowercase}
                      onChange={(e) => setIncludeLowercase(e.target.checked)}
                    />
                    Lowercase (a-z)
                  </label>

                  <label className="oth-check">
                    <input
                      type="checkbox"
                      checked={includeNumbers}
                      onChange={(e) => setIncludeNumbers(e.target.checked)}
                    />
                    Numbers (0-9)
                  </label>

                  <label className="oth-check">
                    <input
                      type="checkbox"
                      checked={includeSymbols}
                      onChange={(e) => setIncludeSymbols(e.target.checked)}
                    />
                    Symbols (!@#$)
                  </label>

                </div>

                <div className="oth-actions">

                  <button
                    className="oth-btn"
                    onClick={generatePassword}
                  >
                    ✨ Generate Password
                  </button>

                  <button
                    className="oth-btn secondary"
                    onClick={() => {
                      setPassword("");
                      setPasswordError("");
                    }}
                  >
                    Clear
                  </button>

                </div>

                {passwordError && (
                  <div className="oth-error">
                    ⚠️ {passwordError}
                  </div>
                )}

                {password && (

                  <>

                    <label className="oth-label">
                      Generated Password
                    </label>

                    <div className="oth-password-output">
                      {password}
                    </div>

                    <div className="oth-actions">

                      <button
                        className="oth-btn"
                        onClick={() => copyText(password, setPasswordError)}
                      >
                        Copy Password
                      </button>

                      <button
                        className="oth-btn secondary"
                        onClick={generatePassword}
                      >
                        Generate Another
                      </button>

                    </div>

                  </>

                )}

                <div className="oth-info">
                  Passwords are generated locally using the browser's
                  cryptographically secure random-number generator.
                  Generated passwords are not stored or uploaded.
                </div>

              </>

            )}

          </div>

        )}

        <div className="oth-footer">
          Tools Hub · Everyday Utilities · Processed locally in your browser
        </div>

      </div>

    </div>
  );
}

export default OtherTools;
