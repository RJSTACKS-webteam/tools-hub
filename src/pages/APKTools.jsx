
import { useState } from "react";
import { parseApkMeta } from "apk-meta-parser";
import JSZip from "jszip";

const tools = [
  { id: "analyzer", name: "APK Analyzer", icon: "🔍", desc: "Inspect APK files and explore their contents." },
  { id: "information", name: "APK Information", icon: "📱", desc: "View package, version and Android SDK details." },
  { id: "permissions", name: "Permission Viewer", icon: "🔐", desc: "Inspect permissions declared in an APK." },
  { id: "icons", name: "Icon Extractor", icon: "🖼️", desc: "Find and download image assets from APK files." },
];

const permissionDescriptions = {
  "android.permission.INTERNET": "Allows the app to access the internet.",
  "android.permission.CAMERA": "Allows the app to use the camera.",
  "android.permission.RECORD_AUDIO": "Allows the app to record audio.",
  "android.permission.ACCESS_FINE_LOCATION": "Allows access to precise location.",
  "android.permission.ACCESS_COARSE_LOCATION": "Allows access to approximate location.",
  "android.permission.READ_CONTACTS": "Allows the app to read contacts.",
  "android.permission.WRITE_CONTACTS": "Allows the app to modify contacts.",
  "android.permission.READ_SMS": "Allows the app to read SMS messages.",
  "android.permission.SEND_SMS": "Allows the app to send SMS messages.",
  "android.permission.READ_CALL_LOG": "Allows the app to read call history.",
  "android.permission.READ_PHONE_STATE": "Allows access to phone state.",
  "android.permission.READ_EXTERNAL_STORAGE": "Allows reading shared external storage.",
  "android.permission.WRITE_EXTERNAL_STORAGE": "Allows writing to shared external storage.",
  "android.permission.ACCESS_BACKGROUND_LOCATION": "Allows location access in the background.",
  "android.permission.BODY_SENSORS": "Allows access to body sensor data.",
};

const dangerousPermissions = [
  "CAMERA",
  "RECORD_AUDIO",
  "ACCESS_FINE_LOCATION",
  "ACCESS_COARSE_LOCATION",
  "READ_CONTACTS",
  "WRITE_CONTACTS",
  "READ_SMS",
  "SEND_SMS",
  "READ_CALL_LOG",
  "READ_PHONE_STATE",
  "READ_EXTERNAL_STORAGE",
  "WRITE_EXTERNAL_STORAGE",
  "ACCESS_BACKGROUND_LOCATION",
  "BODY_SENSORS",
];

function APKTools({ onBack }) {
  const [activeTool, setActiveTool] = useState(null);

  const [apkFile, setApkFile] = useState(null);
  const [apkMeta, setApkMeta] = useState(null);
  const [zipEntries, setZipEntries] = useState([]);
  const [iconFiles, setIconFiles] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewName, setPreviewName] = useState("");

  const selectedTool = tools.find((tool) => tool.id === activeTool);

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

  const resetTool = () => {
    setApkFile(null);
    setApkMeta(null);
    setZipEntries([]);
    setIconFiles([]);
    setLoading(false);
    setError("");
    setSearch("");
    setFilter("all");
    setPreviewUrl("");
    setPreviewName("");
  };

  const openTool = (id) => {
    resetTool();
    setActiveTool(id);
  };

  const goBack = () => {
    resetTool();
    setActiveTool(null);
  };

  // ==================================
  // LOAD AND ANALYZE APK
  // ==================================

  const handleAPK = async (file) => {
    if (!file) return;

    resetTool();

    if (!file.name.toLowerCase().endsWith(".apk")) {
      setError("Please select a valid Android APK file.");
      return;
    }

    if (file.size === 0) {
      setError("The selected APK file is empty.");
      return;
    }

    setApkFile(file);
    setLoading(true);

    try {
      // Decode the binary Android manifest.
      const metadata = await parseApkMeta(file, {
        skipMd5: true,
        partial: true,
      });

      // Read APK archive contents.
      const zip = await JSZip.loadAsync(file);

      const entries = Object.values(zip.files)
        .filter((entry) => !entry.dir)
        .map((entry) => ({
          name: entry.name,
          size: entry._data?.uncompressedSize ?? 0,
          compressedSize: entry._data?.compressedSize ?? 0,
          entry,
        }));

      const images = entries.filter((entry) => {
        const path = entry.name.toLowerCase();

        return (
          /^res\/(mipmap|drawable)[^/]*\/.+\.(png|webp|jpe?g)$/i.test(path)
        );
      });

      setApkMeta(metadata);
      setZipEntries(entries);
      setIconFiles(images);
    } catch (err) {
      console.error("APK parsing error:", err);

      setError(
        err?.message ||
        "Unable to analyze this APK. It may be damaged or unsupported."
      );

      setApkFile(null);
      setApkMeta(null);
      setZipEntries([]);
      setIconFiles([]);
    } finally {
      setLoading(false);
    }
  };

  // ==================================
  // DOWNLOAD FILE FROM APK
  // ==================================

  const downloadEntry = async (item) => {
    try {
      const blob = await item.entry.async("blob");
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = item.name.split("/").pop() || "apk-file";

      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch (err) {
      setError("Unable to extract this file.");
    }
  };

  // ==================================
  // ICON PREVIEW
  // ==================================

  const previewIcon = async (item) => {
    try {
      if (previewUrl) URL.revokeObjectURL(previewUrl);

      const blob = await item.entry.async("blob");
      const url = URL.createObjectURL(blob);

      setPreviewUrl(url);
      setPreviewName(item.name);
    } catch (err) {
      setError("Unable to preview this image.");
    }
  };

  // ==================================
  // PERMISSION CLASSIFICATION
  // ==================================

  const isDangerousPermission = (permission) => {
    return dangerousPermissions.some((name) =>
      permission.endsWith(name)
    );
  };

  const filteredEntries = zipEntries.filter((entry) =>
    entry.name.toLowerCase().includes(search.toLowerCase())
  );

  const permissions = apkMeta?.permissions || [];

  const filteredPermissions = permissions.filter((permission) => {
    const matchesSearch = permission
      .toLowerCase()
      .includes(search.toLowerCase());

    const dangerous = isDangerousPermission(permission);

    const matchesFilter =
      filter === "all" ||
      (filter === "sensitive" && dangerous) ||
      (filter === "other" && !dangerous);

    return matchesSearch && matchesFilter;
  });

  const categoryCounts = {
    all: permissions.length,
    sensitive: permissions.filter(isDangerousPermission).length,
    other: permissions.filter(
      (permission) => !isDangerousPermission(permission)
    ).length,
  };

  const getCategory = (path) => {
    if (path.startsWith("res/")) return "Resources";
    if (path.startsWith("assets/")) return "Assets";
    if (path.startsWith("lib/")) return "Native Libraries";
    if (path.endsWith(".dex")) return "DEX Files";
    if (path.startsWith("META-INF/")) return "Signature / Metadata";
    if (path === "AndroidManifest.xml") return "Manifest";
    if (path === "resources.arsc") return "Resources";
    return "Other";
  };

  const fileCategories = [
    "All",
    "Manifest",
    "DEX Files",
    "Resources",
    "Assets",
    "Native Libraries",
    "Signature / Metadata",
    "Other",
  ];

  const categoryFileCounts = fileCategories.reduce((result, category) => {
    result[category] =
      category === "All"
        ? zipEntries.length
        : zipEntries.filter(
            (entry) => getCategory(entry.name) === category
          ).length;

    return result;
  }, {});

  const selectedEntries = filteredEntries.filter((entry) => {
    return (
      filter === "all" ||
      getCategory(entry.name) === filter
    );
  });

  // ==================================
  // COPY
  // ==================================

  const copyValue = async (value) => {
    try {
      await navigator.clipboard.writeText(String(value));
      setError("");
    } catch {
      setError("Unable to copy. Please copy manually.");
    }
  };

  // ==================================
  // EXPORT PERMISSIONS
  // ==================================

  const downloadPermissions = () => {
    const content = [
      `APK: ${apkFile?.name || ""}`,
      `Package: ${apkMeta?.packageName || "Unknown"}`,
      "",
      "DECLARED PERMISSIONS",
      "-------------------",
      ...permissions,
    ].join("\n");

    const blob = new Blob([content], {
      type: "text/plain;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "apk-permissions.txt";
    link.click();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // ==================================
  // UI
  // ==================================

  return (
    <div className="apk-page">

      <style>{`

        .apk-page {
          min-height: 100vh;
          padding: 35px 20px 65px;
          background: #f5f8ff;
          color: #19345b;
          font-family: inherit;
          text-align: left;
        }

        .apk-page * {
          box-sizing: border-box;
        }

        .apk-container {
          max-width: 1150px;
          margin: auto;
        }

        .apk-back {
          border: 0;
          background: transparent;
          color: #2563eb;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          padding: 10px 0;
          margin-bottom: 20px;
        }

        .apk-heading {
          text-align: center;
          margin-bottom: 35px;
        }

        .apk-heading-icon {
          width: 66px;
          height: 66px;
          border-radius: 19px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: #e5edff;
          font-size: 28px;
          margin-bottom: 13px;
        }

        .apk-heading h1 {
          font-size: 32px;
          margin: 0 0 9px;
          color: #19345b;
        }

        .apk-heading p {
          color: #71839e;
          margin: 0;
          font-size: 15px;
        }

        /* Dashboard */

        .apk-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 17px;
        }

        .apk-card {
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

        .apk-card:hover {
          border-color: #8db4ff;
          transform: translateY(-3px);
          box-shadow: 0 10px 25px #2563eb12;
        }

        .apk-card-icon {
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
        }

        .apk-card-text {
          flex: 1;
          min-width: 0;
        }

        .apk-card-text strong {
          display: block;
          font-size: 15px;
          margin-bottom: 6px;
        }

        .apk-card-text small {
          display: block;
          color: #8392a8;
          line-height: 1.45;
          font-size: 12px;
        }

        .apk-arrow {
          color: #2563eb;
          font-size: 20px;
        }

        /* Workspace */

        .apk-workspace {
          background: #ffffff;
          border: 1px solid #e1e9f6;
          border-radius: 18px;
          padding: 25px;
          box-shadow: 0 8px 30px #1d3b6710;
        }

        .apk-toolbar {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 22px;
        }

        .apk-toolbar h2 {
          font-size: 20px;
          margin: 0;
        }

        .apk-toolbar p {
          font-size: 13px;
          color: #8392a8;
          margin: 5px 0 0;
        }

        /* Upload */

        .apk-upload {
          display: block;
          padding: 38px 20px;
          text-align: center;
          border: 2px dashed #c9d8f1;
          border-radius: 14px;
          background: #f8faff;
          cursor: pointer;
          transition: 0.2s;
        }

        .apk-upload:hover {
          border-color: #5790f5;
          background: #f2f6ff;
        }

        .apk-upload input {
          display: none;
        }

        .apk-upload-icon {
          display: block;
          font-size: 42px;
          margin-bottom: 12px;
        }

        .apk-upload strong {
          display: block;
          font-size: 15px;
          margin-bottom: 7px;
        }

        .apk-upload small {
          color: #8392a8;
        }

        .apk-file-bar {
          display: flex;
          align-items: center;
          gap: 13px;
          margin-top: 18px;
          padding: 15px;
          border: 1px solid #e3eaf4;
          background: #f7f9fd;
          border-radius: 11px;
        }

        .apk-file-bar-icon {
          font-size: 25px;
        }

        .apk-file-bar-info {
          flex: 1;
          min-width: 0;
        }

        .apk-file-bar-info strong {
          display: block;
          font-size: 13px;
          overflow-wrap: anywhere;
        }

        .apk-file-bar-info small {
          display: block;
          color: #8392a8;
          margin-top: 4px;
        }

        .apk-remove {
          border: 0;
          background: #fff0f0;
          color: #dc2626;
          border-radius: 8px;
          padding: 9px 12px;
          cursor: pointer;
        }

        /* Buttons */

        .apk-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin: 18px 0;
        }

        .apk-btn {
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

        .apk-btn:hover {
          background: #174fc4;
        }

        .apk-btn.secondary {
          background: #edf3ff;
          color: #2563eb;
        }

        .apk-btn.secondary:hover {
          background: #dfeaff;
        }

        .apk-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .apk-error {
          margin: 15px 0;
          padding: 12px 15px;
          border-radius: 9px;
          color: #b42318;
          background: #fff1f0;
          border: 1px solid #ffd5d2;
          font-size: 13px;
          overflow-wrap: anywhere;
        }

        .apk-loading {
          margin-top: 17px;
          padding: 15px;
          border-radius: 10px;
          background: #eff5ff;
          color: #2563eb;
          font-size: 13px;
        }

        /* Summary cards */

        .apk-stats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 13px;
          margin-top: 22px;
        }

        .apk-stat {
          padding: 17px 12px;
          background: #f7f9fd;
          border: 1px solid #e3eaf4;
          border-radius: 12px;
          min-width: 0;
        }

        .apk-stat strong {
          display: block;
          color: #2563eb;
          font-size: 21px;
          margin-bottom: 6px;
          overflow-wrap: anywhere;
        }

        .apk-stat span {
          color: #71839e;
          font-size: 11px;
        }

        /* Information */

        .apk-section {
          margin-top: 23px;
          border: 1px solid #e3eaf4;
          border-radius: 12px;
          overflow: hidden;
        }

        .apk-section-heading {
          padding: 15px 17px;
          background: #f4f7fd;
          border-bottom: 1px solid #e3eaf4;
          font-size: 14px;
          font-weight: 700;
          display: flex;
          justify-content: space-between;
          gap: 10px;
        }

        .apk-detail-row {
          display: grid;
          grid-template-columns: minmax(130px, 0.7fr) 1.5fr;
          gap: 12px;
          padding: 13px 17px;
          border-bottom: 1px solid #edf1f7;
          font-size: 13px;
        }

        .apk-detail-row:last-child {
          border-bottom: 0;
        }

        .apk-detail-label {
          color: #8392a8;
        }

        .apk-detail-value {
          color: #263b5e;
          font-weight: 600;
          overflow-wrap: anywhere;
        }

        /* Search and filters */

        .apk-search {
          width: 100%;
          height: 44px;
          border: 1px solid #dce5f2;
          border-radius: 9px;
          padding: 0 13px;
          background: #fbfcff;
          color: #243955;
          outline: none;
          font-size: 13px;
        }

        .apk-search:focus {
          border-color: #5790f5;
          box-shadow: 0 0 0 3px #2563eb12;
        }

        .apk-filter {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          margin: 15px 0;
        }

        .apk-filter button {
          border: 1px solid #e1e9f6;
          border-radius: 8px;
          padding: 9px 12px;
          background: white;
          color: #64748b;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
        }

        .apk-filter button.active {
          background: #eaf1ff;
          border-color: #b6ceff;
          color: #2563eb;
        }

        /* File table */

        .apk-table {
          border: 1px solid #e3eaf4;
          border-radius: 11px;
          overflow: hidden;
        }

        .apk-table-head,
        .apk-table-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 110px 95px;
          gap: 12px;
          align-items: center;
          padding: 13px 15px;
        }

        .apk-table-head {
          background: #f4f7fd;
          font-size: 12px;
          font-weight: 700;
          color: #64748b;
        }

        .apk-table-row {
          border-top: 1px solid #edf1f7;
          font-size: 12px;
        }

        .apk-table-name {
          min-width: 0;
          overflow-wrap: anywhere;
          color: #334b6d;
        }

        .apk-table-size {
          color: #8392a8;
        }

        .apk-empty {
          padding: 24px;
          text-align: center;
          color: #8392a8;
          font-size: 13px;
        }

        /* Permissions */

        .apk-permission {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 14px 16px;
          border-bottom: 1px solid #edf1f7;
        }

        .apk-permission:last-child {
          border-bottom: 0;
        }

        .apk-permission-icon {
          width: 34px;
          height: 34px;
          flex-shrink: 0;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #edf3ff;
        }

        .apk-permission-content {
          flex: 1;
          min-width: 0;
        }

        .apk-permission-content strong {
          display: block;
          font-size: 12px;
          overflow-wrap: anywhere;
        }

        .apk-permission-content small {
          display: block;
          margin-top: 5px;
          color: #8392a8;
          font-size: 11px;
          line-height: 1.5;
        }

        .apk-tag {
          flex-shrink: 0;
          padding: 5px 8px;
          border-radius: 6px;
          background: #fff4e5;
          color: #a15c00;
          font-size: 10px;
          font-weight: 700;
        }

        .apk-tag.normal {
          background: #edf3ff;
          color: #2563eb;
        }

        /* Icons */

        .apk-icon-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 13px;
          margin-top: 18px;
        }

        .apk-icon-card {
          min-width: 0;
          border: 1px solid #e3eaf4;
          background: #f9fbff;
          border-radius: 11px;
          padding: 14px;
          text-align: center;
        }

        .apk-icon-card img {
          width: 75px;
          height: 75px;
          object-fit: contain;
          background: white;
          border-radius: 12px;
          padding: 5px;
          margin: 0 auto 10px;
        }

        .apk-icon-card strong {
          display: block;
          font-size: 11px;
          overflow-wrap: anywhere;
          margin-bottom: 5px;
        }

        .apk-icon-card small {
          display: block;
          color: #8392a8;
          font-size: 10px;
          margin-bottom: 10px;
        }

        .apk-preview {
          margin-top: 20px;
          padding: 20px;
          background: #f7f9fd;
          border: 1px solid #e3eaf4;
          border-radius: 12px;
          text-align: center;
        }

        .apk-preview img {
          width: 110px;
          height: 110px;
          object-fit: contain;
          background: white;
          border-radius: 14px;
          padding: 7px;
        }

        .apk-preview p {
          font-size: 12px;
          color: #71839e;
          overflow-wrap: anywhere;
        }

        .apk-info {
          margin-top: 20px;
          padding: 15px;
          background: #f4f7fd;
          border-radius: 10px;
          color: #71839e;
          font-size: 12px;
          line-height: 1.6;
        }

        .apk-footer {
          text-align: center;
          margin-top: 30px;
          color: #8998ad;
          font-size: 12px;
        }

        @media (max-width: 850px) {
          .apk-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .apk-stats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .apk-icon-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 560px) {
          .apk-page {
            padding: 22px 13px 45px;
          }

          .apk-grid {
            grid-template-columns: 1fr;
          }

          .apk-heading h1 {
            font-size: 26px;
          }

          .apk-workspace {
            padding: 16px;
          }

          .apk-detail-row {
            grid-template-columns: 1fr;
            gap: 5px;
          }

          .apk-table-head,
          .apk-table-row {
            grid-template-columns: minmax(0, 1fr) 65px;
          }

          .apk-table-head span:last-child,
          .apk-table-row button {
            display: none;
          }

          .apk-icon-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .apk-permission {
            flex-wrap: wrap;
          }
        }

      `}</style>

      <div className="apk-container">

        {/* BACK */}

        <button
          className="apk-back"
          onClick={activeTool ? goBack : onBack}
        >
          ← {activeTool ? "Back to APK Tools" : "Back to Categories"}
        </button>

        {/* HEADING */}

        <div className="apk-heading">

          <div className="apk-heading-icon">
            {selectedTool?.icon || "📱"}
          </div>

          <h1>{selectedTool?.name || "APK Tools"}</h1>

          <p>
            {selectedTool?.desc ||
              "Inspect and analyze Android APK files."}
          </p>

        </div>

        {/* DASHBOARD */}

        {!activeTool ? (

          <div className="apk-grid">

            {tools.map((tool) => (

              <button
                className="apk-card"
                key={tool.id}
                onClick={() => openTool(tool.id)}
              >

                <span className="apk-card-icon">
                  {tool.icon}
                </span>

                <span className="apk-card-text">
                  <strong>{tool.name}</strong>
                  <small>{tool.desc}</small>
                </span>

                <span className="apk-arrow">→</span>

              </button>

            ))}

          </div>

        ) : (

          <div className="apk-workspace">

            {/* TOOL HEADER */}

            <div className="apk-toolbar">
              <div>
                <h2>{selectedTool.name}</h2>
                <p>{selectedTool.desc}</p>
              </div>
            </div>

            {/* UPLOAD */}

            <label className="apk-upload">

              <input
                type="file"
                accept=".apk,application/vnd.android.package-archive"
                onChange={(e) => handleAPK(e.target.files?.[0])}
              />

              <span className="apk-upload-icon">📦</span>

              <strong>
                {apkFile ? "Choose another APK" : "Select an APK file"}
              </strong>

              <small>
                Click to browse your device · APK format
              </small>

            </label>

            {apkFile && (

              <div className="apk-file-bar">

                <span className="apk-file-bar-icon">📱</span>

                <div className="apk-file-bar-info">
                  <strong>{apkFile.name}</strong>
                  <small>{formatBytes(apkFile.size)}</small>
                </div>

                <button
                  className="apk-remove"
                  onClick={resetTool}
                  disabled={loading}
                >
                  ✕
                </button>

              </div>

            )}

            {loading && (
              <div className="apk-loading">
                ⏳ Analyzing APK and reading Android manifest...
              </div>
            )}

            {error && (
              <div className="apk-error">⚠️ {error}</div>
            )}

            {/* =========================
                APK ANALYZER
            ========================= */}

            {activeTool === "analyzer" && apkMeta && (

              <>

                <div className="apk-stats">

                  <div className="apk-stat">
                    <strong>{zipEntries.length}</strong>
                    <span>Files in APK</span>
                  </div>

                  <div className="apk-stat">
                    <strong>{formatBytes(apkFile.size)}</strong>
                    <span>APK Size</span>
                  </div>

                  <div className="apk-stat">
                    <strong>{permissions.length}</strong>
                    <span>Declared Permissions</span>
                  </div>

                  <div className="apk-stat">
                    <strong>
                      {zipEntries.filter((item) => item.name.endsWith(".dex")).length}
                    </strong>
                    <span>DEX Files</span>
                  </div>

                </div>

                <div className="apk-section">

                  <div className="apk-section-heading">
                    <span>APK Structure</span>
                    <span>{zipEntries.length} files</span>
                  </div>

                  <div style={{ padding: 15 }}>

                    <input
                      className="apk-search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search APK files..."
                    />

                    <div className="apk-filter">

                      {fileCategories.map((category) => (

                        <button
                          key={category}
                          className={
                            (filter === "all" && category === "All") ||
                            filter === category
                              ? "active"
                              : ""
                          }
                          onClick={() =>
                            setFilter(
                              category === "All" ? "all" : category
                            )
                          }
                        >
                          {category} ({categoryFileCounts[category]})
                        </button>

                      ))}

                    </div>

                  </div>

                  <div className="apk-table">

                    <div className="apk-table-head">
                      <span>File Name</span>
                      <span>Size</span>
                      <span>Action</span>
                    </div>

                    {selectedEntries.length === 0 ? (

                      <div className="apk-empty">
                        No matching files found.
                      </div>

                    ) : (

                      selectedEntries.map((item) => (

                        <div className="apk-table-row" key={item.name}>

                          <span className="apk-table-name">
                            📄 {item.name}
                          </span>

                          <span className="apk-table-size">
                            {formatBytes(item.size)}
                          </span>

                          <button
                            className="apk-small-btn"
                            onClick={() => downloadEntry(item)}
                          >
                            Download
                          </button>

                        </div>

                      ))

                    )}

                  </div>

                </div>

                <div className="apk-info">
                  APK Analyzer displays archive entries and their uncompressed
                  sizes. It does not perform malware detection or guarantee
                  that an APK is safe.
                </div>

              </>

            )}

            {/* =========================
                APK INFORMATION
            ========================= */}

            {activeTool === "information" && apkMeta && (

              <>

                <div className="apk-stats">

                  <div className="apk-stat">
                    <strong>{formatBytes(apkFile.size)}</strong>
                    <span>File Size</span>
                  </div>

                  <div className="apk-stat">
                    <strong>{apkMeta.versionCode ?? "—"}</strong>
                    <span>Version Code</span>
                  </div>

                  <div className="apk-stat">
                    <strong>{apkMeta.permissions?.length ?? 0}</strong>
                    <span>Permissions</span>
                  </div>

                  <div className="apk-stat">
                    <strong>{apkMeta.targetSdkVersion ?? "—"}</strong>
                    <span>Target SDK</span>
                  </div>

                </div>

                <div className="apk-section">

                  <div className="apk-section-heading">
                    Application Information
                  </div>

                  {[
                    ["Application Name", apkMeta.label],
                    ["Package Name", apkMeta.packageName],
                    ["Version Name", apkMeta.versionName],
                    ["Version Code", apkMeta.versionCode],
                    ["Minimum SDK", apkMeta.minSdkVersion],
                    ["Target SDK", apkMeta.targetSdkVersion],
                    ["Launcher Activity", apkMeta.mainActivity],
                    ["APK File Name", apkFile.name],
                    ["APK File Size", formatBytes(apkFile.size)],
                    [
                      "Label Resource Reference",
                      apkMeta.labelIsResourceId ? "Yes" : "No",
                    ],
                  ].map(([label, value]) => (

                    <div className="apk-detail-row" key={label}>
                      <span className="apk-detail-label">{label}</span>
                      <span className="apk-detail-value">
                        {value ?? "Not available"}
                      </span>
                    </div>

                  ))}

                </div>

                <div className="apk-actions">

                  <button
                    className="apk-btn"
                    onClick={() =>
                      copyValue(JSON.stringify(apkMeta, null, 2))
                    }
                  >
                    Copy APK Information
                  </button>

                  <button
                    className="apk-btn secondary"
                    onClick={() => {
                      const blob = new Blob(
                        [JSON.stringify(apkMeta, null, 2)],
                        { type: "application/json" }
                      );

                      const url = URL.createObjectURL(blob);
                      const link = document.createElement("a");

                      link.href = url;
                      link.download = "apk-information.json";
                      link.click();

                      setTimeout(() => URL.revokeObjectURL(url), 1000);
                    }}
                  >
                    Download JSON
                  </button>

                </div>

                {apkMeta.partial && (
                  <div className="apk-info">
                    Some metadata could not be fully decoded. Verify
                    the displayed information before relying on it.
                  </div>
                )}

              </>

            )}

            {/* =========================
                PERMISSION VIEWER
            ========================= */}

            {activeTool === "permissions" && apkMeta && (

              <>

                <div className="apk-stats">

                  <div className="apk-stat">
                    <strong>{categoryCounts.all}</strong>
                    <span>Total Permissions</span>
                  </div>

                  <div className="apk-stat">
                    <strong>{categoryCounts.sensitive}</strong>
                    <span>Selected Sensitive Permissions</span>
                  </div>

                  <div className="apk-stat">
                    <strong>{categoryCounts.other}</strong>
                    <span>Other Permissions</span>
                  </div>

                  <div className="apk-stat">
                    <strong>{apkMeta.packageName || "—"}</strong>
                    <span>Package</span>
                  </div>

                </div>

                <div style={{ marginTop: 22 }}>

                  <input
                    className="apk-search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search permissions..."
                  />

                  <div className="apk-filter">

                    {[
                      ["all", "All"],
                      ["sensitive", "Selected Sensitive"],
                      ["other", "Other"],
                    ].map(([value, label]) => (

                      <button
                        key={value}
                        className={filter === value ? "active" : ""}
                        onClick={() => setFilter(value)}
                      >
                        {label} ({categoryCounts[value]})
                      </button>

                    ))}

                  </div>

                </div>

                <div className="apk-section">

                  <div className="apk-section-heading">
                    <span>Declared Permissions</span>
                    <span>{filteredPermissions.length} shown</span>
                  </div>

                  {filteredPermissions.length === 0 ? (

                    <div className="apk-empty">
                      No matching permissions found.
                    </div>

                  ) : (

                    filteredPermissions.map((permission) => {

                      const dangerous = isDangerousPermission(permission);

                      return (

                        <div className="apk-permission" key={permission}>

                          <span className="apk-permission-icon">
                            {dangerous ? "⚠️" : "🔒"}
                          </span>

                          <div className="apk-permission-content">

                            <strong>{permission}</strong>

                            <small>
                              {permissionDescriptions[permission] ||
                                "Permission declared in the Android manifest."}
                            </small>

                          </div>

                          <span className={`apk-tag ${dangerous ? "" : "normal"}`}>
                            {dangerous ? "Review" : "Declared"}
                          </span>

                        </div>

                      );

                    })

                  )}

                </div>

                <div className="apk-actions">

                  <button
                    className="apk-btn"
                    onClick={downloadPermissions}
                  >
                    ↓ Export Permissions
                  </button>

                </div>

                <div className="apk-info">
                  The Review label identifies selected permission names
                  commonly associated with sensitive access. It is a
                  screening aid, not an Android protection-level check.
                  Actual runtime access depends on Android version,
                  app behavior and user consent.
                </div>

              </>

            )}

            {/* =========================
                ICON EXTRACTOR
            ========================= */}

            {activeTool === "icons" && apkMeta && (

              <>

                <div className="apk-stats">

                  <div className="apk-stat">
                    <strong>{iconFiles.length}</strong>
                    <span>Image Assets Found</span>
                  </div>

                  <div className="apk-stat">
                    <strong>{formatBytes(
                      iconFiles.reduce((sum, item) => sum + item.size, 0)
                    )}</strong>
                    <span>Total Image Size</span>
                  </div>

                  <div className="apk-stat">
                    <strong>{apkMeta.label || "Unknown"}</strong>
                    <span>Application</span>
                  </div>

                  <div className="apk-stat">
                    <strong>{apkMeta.packageName || "—"}</strong>
                    <span>Package Name</span>
                  </div>

                </div>

                {iconFiles.length === 0 ? (

                  <div className="apk-empty">
                    No PNG, JPEG or WebP image assets were found
                    in the scanned mipmap and drawable folders.
                  </div>

                ) : (

                  <div className="apk-icon-grid">

                    {iconFiles.map((item) => (

                      <div className="apk-icon-card" key={item.name}>

                        <div
                          onClick={() => previewIcon(item)}
                          style={{ cursor: "pointer" }}
                        >
                          <IconThumbnail item={item} />
                        </div>

                        <strong>
                          {item.name.split("/").pop()}
                        </strong>

                        <small>{formatBytes(item.size)}</small>

                        <button
                          className="apk-small-btn"
                          onClick={() => downloadEntry(item)}
                        >
                          Download
                        </button>

                      </div>

                    ))}

                  </div>

                )}

                {previewUrl && (

                  <div className="apk-preview">

                    <img
                      src={previewUrl}
                      alt="APK icon preview"
                    />

                    <p>{previewName}</p>

                    <div className="apk-actions" style={{ justifyContent: "center" }}>

                      <button
                        className="apk-btn"
                        onClick={() => {
                          const item = iconFiles.find(
                            (entry) => entry.name === previewName
                          );

                          if (item) downloadEntry(item);
                        }}
                      >
                        Download Image
                      </button>

                      <button
                        className="apk-btn secondary"
                        onClick={() => {
                          URL.revokeObjectURL(previewUrl);
                          setPreviewUrl("");
                          setPreviewName("");
                        }}
                      >
                        Close Preview
                      </button>

                    </div>

                  </div>

                )}

                <div className="apk-info">
                  This tool extracts image assets from res/mipmap and
                  res/drawable folders. Adaptive icon XML files and
                  resource references are not rendered into a final
                  application icon.
                </div>

              </>

            )}

          </div>

        )}

        <div className="apk-footer">
          Tools Hub · APK Utilities · Processed locally in your browser
        </div>

      </div>

    </div>
  );
}

// Separate thumbnail component.
// Reads image bytes from the APK archive for display.
function IconThumbnail({ item }) {
  const [src, setSrc] = useState("");

  const load = async () => {
    if (src) return;

    try {
      const blob = await item.entry.async("blob");
      const url = URL.createObjectURL(blob);
      setSrc(url);
    } catch {
      setSrc("");
    }
  };

  return (
    <div
      onMouseEnter={load}
      onClick={load}
      style={{
        width: 75,
        height: 75,
        margin: "0 auto 10px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#ffffff",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      {src ? (
        <img
          src={src}
          alt={item.name}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
          }}
        />
      ) : (
        <span style={{ fontSize: 24 }}>🖼️</span>
      )}
    </div>
  );
}

export default APKTools;
