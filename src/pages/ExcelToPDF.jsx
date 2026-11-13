
import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import html2pdf from "html2pdf.js";
import "./ExcelToPDF.css";

function ExcelToPDF({ onBack }) {
  const [file, setFile] = useState(null);
  const [workbook, setWorkbook] = useState(null);
  const [sheetName, setSheetName] = useState("");
  const [orientation, setOrientation] = useState("landscape");
  const [paperSize, setPaperSize] = useState("a4");
  const [loading, setLoading] = useState(false);
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState("");

  const previewRef = useRef(null);

  // READ EXCEL FILE
  const handleFile = async (selectedFile) => {
    if (!selectedFile) return;

    setError("");

    const extension = selectedFile.name.split(".").pop().toLowerCase();

    if (!["xlsx", "xls"].includes(extension)) {
      setError("Please upload a valid Excel file (.xlsx or .xls).");
      return;
    }

    setLoading(true);

    try {
      const buffer = await selectedFile.arrayBuffer();

      const data = XLSX.read(buffer, {
        type: "array",
        cellDates: true,
      });

      if (!data.SheetNames.length) {
        throw new Error("No worksheets found.");
      }

      setFile(selectedFile);
      setWorkbook(data);
      setSheetName(data.SheetNames[0]);
    } catch (err) {
      console.error(err);
      setError("Unable to read this Excel file. Please try another file.");
      setFile(null);
      setWorkbook(null);
    } finally {
      setLoading(false);
    }
  };

  // RESET TOOL
  const resetTool = () => {
    setFile(null);
    setWorkbook(null);
    setSheetName("");
    setError("");
  };

  // CONVERT EXCEL TO PDF
  const handleConvert = async () => {
    if (!workbook || !sheetName || !previewRef.current) return;

    setConverting(true);
    setError("");

    try {
      const options = {
        margin: 8,
        filename: `${file.name.replace(/\.(xlsx|xls)$/i, "")}.pdf`,

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
      console.error(err);
      setError("PDF conversion failed. Please try again.");
    } finally {
      setConverting(false);
    }
  };

  // GET CURRENT WORKSHEET DATA
  const currentSheet = workbook?.Sheets[sheetName];

  const tableData = currentSheet
    ? XLSX.utils.sheet_to_json(currentSheet, {
        header: 1,
        defval: "",
        raw: false,
      })
    : [];

  const hasData = tableData.some((row) =>
    row.some((cell) => String(cell).trim() !== "")
  );

  return (
    <div className="excel-pdf-page">
      <div className="excel-pdf-container">

        {/* BACK BUTTON */}
        <button className="excel-pdf-back" onClick={onBack}>
          ← Back to Document Tools
        </button>

        {/* HEADING */}
        <div className="excel-pdf-heading">
          <span className="excel-pdf-icon">📊</span>
          <h1>Excel to PDF Converter</h1>
          <p>
            Convert your Excel spreadsheets into PDF documents
            directly in your browser.
          </p>
        </div>

        {/* UPLOAD */}
        {!file && (
          <label className="excel-pdf-upload">
            <input
              type="file"
              accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              onChange={(e) => handleFile(e.target.files[0])}
            />

            <span className="excel-pdf-upload-icon">📁</span>
            <h3>Choose an Excel spreadsheet</h3>
            <p>Drag and drop your Excel file or browse your device</p>
            <span className="excel-pdf-browse">Browse Files</span>
            <small>Supported formats: XLSX, XLS</small>
          </label>
        )}

        {/* LOADING */}
        {loading && (
          <div className="excel-pdf-status">
            <div className="excel-pdf-spinner"></div>
            <p>Reading your spreadsheet...</p>
          </div>
        )}

        {/* ERROR */}
        {error && (
          <div className="excel-pdf-error">
            ⚠️ {error}
          </div>
        )}

        {/* WORKBOOK */}
        {file && workbook && (
          <>
            <div className="excel-pdf-file">
              <span>📊</span>

              <div>
                <strong>{file.name}</strong>
                <small>
                  {workbook.SheetNames.length} worksheet(s) ·{" "}
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </small>
              </div>

              <button onClick={resetTool} disabled={converting}>
                ✕
              </button>
            </div>

            {/* SETTINGS */}
            <div className="excel-pdf-settings">
              <div className="excel-pdf-setting">
                <label>Worksheet</label>
                <select
                  value={sheetName}
                  onChange={(e) => setSheetName(e.target.value)}
                >
                  {workbook.SheetNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="excel-pdf-setting">
                <label>Page Orientation</label>
                <select
                  value={orientation}
                  onChange={(e) => setOrientation(e.target.value)}
                >
                  <option value="portrait">Portrait</option>
                  <option value="landscape">Landscape</option>
                </select>
              </div>

              <div className="excel-pdf-setting">
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

            {/* PREVIEW */}
            <div className="excel-pdf-preview-heading">
              <div>
                <h3>Spreadsheet Preview</h3>
                <p>Review the selected worksheet before conversion.</p>
              </div>

              <span>{sheetName}</span>
            </div>

            <div className="excel-pdf-preview">
              {hasData ? (
                <div
                  ref={previewRef}
                  className="excel-pdf-table-wrapper"
                >
                  <table className="excel-pdf-table">
                    <tbody>
                      {tableData.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                          {row.map((cell, cellIndex) => (
                            <td key={cellIndex}>
                              {String(cell)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="excel-pdf-empty">
                  <span>📋</span>
                  <h3>Empty worksheet</h3>
                  <p>This worksheet does not contain any data.</p>
                </div>
              )}
            </div>

            {/* CONVERT */}
            <div className="excel-pdf-actions">
              <button
                className="excel-pdf-convert"
                onClick={handleConvert}
                disabled={converting || !hasData}
              >
                {converting
                  ? "Converting..."
                  : "↓ Convert & Download PDF"}
              </button>

              <button
                className="excel-pdf-reset"
                onClick={resetTool}
                disabled={converting}
              >
                Choose Another File
              </button>
            </div>
          </>
        )}

        {/* HOW IT WORKS */}
        <div className="excel-pdf-info">
          <h3>How it works</h3>

          <div className="excel-pdf-steps">
            <div>
              <span>1</span>
              <p>Upload your Excel spreadsheet.</p>
            </div>

            <div>
              <span>2</span>
              <p>Select a worksheet and PDF settings.</p>
            </div>

            <div>
              <span>3</span>
              <p>Convert and download your PDF.</p>
            </div>
          </div>
        </div>

        {/* PRIVACY */}
        <p className="excel-pdf-privacy">
          🔒 Your spreadsheet is processed locally in your browser.
          It is not uploaded to our server.
        </p>

      </div>
    </div>
  );
}

export default ExcelToPDF;
