
import { useEffect, useState } from "react";

/* =================================
   DEVELOPER TOOLS
================================= */

const tools = [
  { id: "json", name: "JSON Formatter", icon: "{}", desc: "Format, beautify and validate JSON." },
  { id: "html", name: "HTML Formatter", icon: "🌐", desc: "Beautify and minify HTML code." },
  { id: "base64", name: "Base64 Encoder", icon: "🔐", desc: "Encode and decode text, images and files." },
  { id: "url", name: "URL Encoder", icon: "🔗", desc: "Encode and decode URL strings." },
  { id: "css", name: "CSS Formatter", icon: "🎨", desc: "Format and minify CSS code." },
  { id: "javascript", name: "JavaScript Formatter & Minifier", icon: "JS", desc: "Beautify and minify JavaScript." },
  { id: "jwt", name: "JWT Decoder", icon: "🔑", desc: "Decode JSON Web Tokens." },
  { id: "uuid", name: "UUID Generator", icon: "🆔", desc: "Generate unique UUID identifiers." },
  { id: "regex", name: "Regex Tester", icon: ".*", desc: "Test regular expressions instantly." },
];

/* =================================
   CODE FORMATTER
================================= */

function formatCode(source, type, minify = false) {
  let result = "";
  let indent = 0;
  let quote = "";
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  let parens = 0;
  let pendingSpace = false;

  const isJS = type === "javascript";
  const pad = () => "  ".repeat(Math.max(0, indent));

  const addSpace = () => {
    if (pendingSpace && result && !/\s$/.test(result)) {
      result += " ";
    }
    pendingSpace = false;
  };

  const newline = () => {
    result = result.trimEnd();

    if (!minify) {
      result += "\n" + pad();
    } else {
      result += " ";
    }

    pendingSpace = false;
  };

  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    const next = source[i + 1];

    if (quote) {
      result += ch;

      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === quote) quote = "";

      continue;
    }

    if (lineComment) {
      if (ch === "\n") {
        lineComment = false;
        if (!minify) newline();
        else pendingSpace = true;
      } else if (!minify) {
        result += ch;
      }
      continue;
    }

    if (blockComment) {
      result += ch;

      if (ch === "*" && next === "/") {
        result += "/";
        i++;
        blockComment = false;
      }
      continue;
    }

    if (ch === "'" || ch === '"' || (isJS && ch === "`")) {
      addSpace();
      quote = ch;
      result += ch;
      continue;
    }

    if (isJS && ch === "/" && next === "/") {
      addSpace();
      if (!minify) result += "//";
      i++;
      lineComment = true;
      continue;
    }

    if (ch === "/" && next === "*") {
      addSpace();
      result += "/*";
      i++;
      blockComment = true;
      continue;
    }

    if (/\s/.test(ch)) {
      pendingSpace = true;
      continue;
    }

    if (ch === "(" || ch === "[") {
      addSpace();
      result += ch;
      parens++;
      continue;
    }

    if (ch === ")" || ch === "]") {
      result = result.trimEnd() + ch;
      parens = Math.max(0, parens - 1);
      continue;
    }

    if (ch === "{") {
      addSpace();
      result = result.trimEnd();

      if (minify) {
        result += "{";
      } else {
        result += " {\n";
      }

      indent++;

      if (!minify) result += pad();
      continue;
    }

    if (ch === "}") {
      indent = Math.max(0, indent - 1);
      result = result.trimEnd();

      if (minify) {
        result += "}";
      } else {
        if (!result.endsWith("{")) result += "\n";
        result += pad() + "}";
      }

      continue;
    }

    if (ch === ";" && (!isJS || parens === 0)) {
      result = result.trimEnd() + ";";

      if (!minify) newline();
      else pendingSpace = false;

      continue;
    }

    if (ch === ",") {
      result = result.trimEnd() + ",";
      if (!minify) result += " ";
      continue;
    }

    if (ch === ":") {
      result = result.trimEnd() + ":";
      if (!minify) result += " ";
      continue;
    }

    addSpace();
    result += ch;
  }

  return result.trim();
}

/* =================================
   HTML FORMATTER
================================= */

function formatHTML(source, minify = false) {
  if (minify) {
    return source
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/>\s+</g, "><")
      .trim();
  }

  const tokens =
    source.match(/<!--[\s\S]*?-->|<![^>]*>|<\/?[^>]+>|[^<]+/g) || [];

  const voidTags = new Set([
    "area", "base", "br", "col", "embed", "hr",
    "img", "input", "link", "meta", "param",
    "source", "track", "wbr",
  ]);

  const rawTags = new Set(["script", "style", "pre", "textarea"]);

  let indent = 0;
  const result = [];
  let rawTag = null;

  tokens.forEach((token) => {
    const value = token.trim();
    if (!value) return;

    if (rawTag) {
      result.push("  ".repeat(indent) + value);

      const closePattern = new RegExp(`</${rawTag}\\s*>`, "i");

      if (closePattern.test(value)) {
        rawTag = null;
        indent = Math.max(0, indent - 1);
      }
      return;
    }

    if (/^<!--/.test(value) || /^<!/.test(value)) {
      result.push("  ".repeat(indent) + value);
      return;
    }

    if (/^<\//.test(value)) {
      indent = Math.max(0, indent - 1);
      result.push("  ".repeat(indent) + value);
      return;
    }

    if (/^</.test(value)) {
      result.push("  ".repeat(indent) + value);

      const tagName = (
        value.match(/^<([a-z0-9-]+)/i) || []
      )[1]?.toLowerCase();

      const selfClosing = /\/>$/.test(value);
      const isVoid = voidTags.has(tagName);

      if (!selfClosing && !isVoid) {
        indent++;

        if (rawTags.has(tagName)) {
          rawTag = tagName;
        }
      }

      return;
    }

    result.push("  ".repeat(indent) + value);
  });

  return result.join("\n");
}

/* =================================
   BASE64 ENCODER
================================= */

function encodeBase64(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";

  // Avoid spreading huge arrays into function arguments.
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(
      ...bytes.subarray(i, i + chunkSize)
    );
  }

  return btoa(binary);
}

/* =================================
   BASE64 FILE DECODER
================================= */

function detectMimeType(bytes) {
  const startsWith = (...signature) =>
    signature.every((byte, index) => bytes[index] === byte);

  if (startsWith(0x89, 0x50, 0x4E, 0x47)) {
    return "image/png";
  }

  if (startsWith(0xFF, 0xD8, 0xFF)) {
    return "image/jpeg";
  }

  if (
    String.fromCharCode(...bytes.slice(0, 4)) === "GIF8"
  ) {
    return "image/gif";
  }

  if (
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) {
    return "image/webp";
  }

  if (
    String.fromCharCode(...bytes.slice(0, 4)) === "%PDF"
  ) {
    return "application/pdf";
  }

  if (
    startsWith(0x50, 0x4B, 0x03, 0x04) ||
    startsWith(0x50, 0x4B, 0x05, 0x06) ||
    startsWith(0x50, 0x4B, 0x07, 0x08)
  ) {
    return "application/zip";
  }

  if (
    String.fromCharCode(...bytes.slice(0, 2)) === "BM"
  ) {
    return "image/bmp";
  }

  if (startsWith(0x00, 0x00, 0x01, 0x00)) {
    return "image/x-icon";
  }

  if (
    String.fromCharCode(...bytes.slice(0, 3)) === "ID3"
  ) {
    return "audio/mpeg";
  }

  if (
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WAVE"
  ) {
    return "audio/wav";
  }

  return "";
}

function decodeBase64File(value) {
  let source = value.trim();
  let mimeType = "";

  // Support data URLs:
  // data:image/png;base64,AAAA...
  if (/^data:/i.test(source)) {
    const commaIndex = source.indexOf(",");

    if (commaIndex === -1) {
      throw new Error("Invalid Base64 data URL.");
    }

    const metadata = source.slice(5, commaIndex);
    const parts = metadata.split(";");

    if (!parts.some((part) => part.toLowerCase() === "base64")) {
      throw new Error("This data URL is not Base64 encoded.");
    }

    mimeType = parts[0] || "";
    source = source.slice(commaIndex + 1);
  }

  // Support Base64URL and whitespace
  source = source
    .replace(/\s/g, "")
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .replace(/=+$/, "");

  if (!source) {
    throw new Error("Please enter Base64 data.");
  }

  if (source.length % 4 === 1) {
    throw new Error("Invalid Base64 length.");
  }

  if (!/^[A-Za-z0-9+/]+$/.test(source)) {
    throw new Error("The input contains invalid Base64 characters.");
  }

  source += "=".repeat((4 - source.length % 4) % 4);

  let binary;

  try {
    binary = atob(source);
  } catch {
    throw new Error("Unable to decode this Base64 content.");
  }

  const bytes = Uint8Array.from(binary, (char) =>
    char.charCodeAt(0)
  );

  if (!mimeType) {
    mimeType = detectMimeType(bytes);
  }

  if (!mimeType || mimeType === "application/octet-stream") {
    // Raw Base64 without a data URL: try strict UTF-8 text first.
    try {
      const text = new TextDecoder("utf-8", {
        fatal: true,
      }).decode(bytes);

      return {
        kind: "text",
        text,
      };
    } catch {
      mimeType = "application/octet-stream";
    }
  }

  const textTypes = [
    "text/",
    "application/json",
    "application/xml",
    "application/javascript",
    "application/x-javascript",
    "application/x-www-form-urlencoded",
  ];

  const isText = textTypes.some((type) =>
    mimeType.toLowerCase().startsWith(type)
  );

  if (isText) {
    try {
      return {
        kind: "text",
        text: new TextDecoder("utf-8", {
          fatal: true,
        }).decode(bytes),
      };
    } catch {
      throw new Error(
        "This text data is not valid UTF-8. Try downloading it as a file."
      );
    }
  }

  return {
    kind: "file",
    bytes,
    mimeType,
  };
}

/* =================================
   JWT DECODER
================================= */

function decodeBase64Text(value) {
  const normalized = value
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const padded =
    normalized + "=".repeat((4 - normalized.length % 4) % 4);

  const binary = atob(padded);

  const bytes = Uint8Array.from(binary, (char) =>
    char.charCodeAt(0)
  );

  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

function decodeJWT(token) {
  const parts = token.trim().split(".");

  if (parts.length !== 3) {
    throw new Error("A JWT must contain three parts.");
  }

  return {
    header: JSON.parse(decodeBase64Text(parts[0])),
    payload: JSON.parse(decodeBase64Text(parts[1])),
    signature: parts[2],
  };
}

/* =================================
   UUID GENERATOR
================================= */

function generateUUID() {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
    /[xy]/g,
    (character) => {
      const random = crypto.getRandomValues(new Uint8Array(1))[0] & 15;

      return (
        character === "x"
          ? random
          : (random & 3) | 8
      ).toString(16);
    }
  );
}

/* =================================
   MAIN COMPONENT
================================= */

function DeveloperTools({ onBack }) {
  const [activeTool, setActiveTool] = useState(null);

  const [input, setInput] = useState("");
  const [testText, setTestText] = useState("");
  const [output, setOutput] = useState("");

  const [error, setError] = useState("");
  const [mode, setMode] = useState("format");

  const [regexFlags, setRegexFlags] = useState("g");
  const [regexResults, setRegexResults] = useState([]);

  const [uuidCount, setUuidCount] = useState(5);
  const [jwtData, setJwtData] = useState(null);

  const [decodedFile, setDecodedFile] = useState(null);

  const selectedTool = tools.find(
    (tool) => tool.id === activeTool
  );

  const isRegex = activeTool === "regex";
  const isUUID = activeTool === "uuid";
  const isJWT = activeTool === "jwt";
  const isBase64 = activeTool === "base64";
  const isURL = activeTool === "url";

  // Release temporary browser object URLs.
  useEffect(() => {
    return () => {
      if (decodedFile?.url) {
        URL.revokeObjectURL(decodedFile.url);
      }
    };
  }, [decodedFile]);

  const reset = () => {
    setInput("");
    setTestText("");
    setOutput("");
    setError("");
    setRegexResults([]);
    setJwtData(null);
    setDecodedFile(null);
    setMode("format");
  };

  const openTool = (id) => {
    reset();
    setActiveTool(id);
  };

  const goBack = () => {
    reset();
    setActiveTool(null);
  };

  /* =================================
     PROCESS TOOLS
  ================================= */

  const process = () => {
    setError("");
    setOutput("");
    setJwtData(null);
    setRegexResults([]);
    setDecodedFile(null);

    try {
      if (!input.trim()) {
        throw new Error("Please enter some input first.");
      }

      let result = "";

      switch (activeTool) {
        case "json": {
          const parsed = JSON.parse(input);

          result =
            mode === "minify"
              ? JSON.stringify(parsed)
              : JSON.stringify(parsed, null, 2);

          break;
        }

        case "html": {
          result = formatHTML(input, mode === "minify");
          break;
        }

        case "base64": {
          if (mode === "encode") {
            result = encodeBase64(input);
          } else {
            const decoded = decodeBase64File(input);

            if (decoded.kind === "text") {
              result = decoded.text;
            } else {
              const blob = new Blob([decoded.bytes], {
                type: decoded.mimeType,
              });

              const url = URL.createObjectURL(blob);

              const extensions = {
                "image/png": "png",
                "image/jpeg": "jpg",
                "image/webp": "webp",
                "image/gif": "gif",
                "image/bmp": "bmp",
                "image/svg+xml": "svg",
                "image/x-icon": "ico",
                "application/pdf": "pdf",
                "application/zip": "zip",
                "audio/mpeg": "mp3",
                "audio/wav": "wav",
                "application/octet-stream": "bin",
              };

              const extension =
                extensions[decoded.mimeType] || "bin";

              setDecodedFile({
                url,
                mimeType: decoded.mimeType,
                size: blob.size,
                filename: `decoded-file.${extension}`,
                isImage: decoded.mimeType.startsWith("image/"),
              });

              result = "Your file was decoded successfully.";
            }
          }

          break;
        }

        case "url": {
          result =
            mode === "encode"
              ? encodeURIComponent(input)
              : decodeURIComponent(input);

          break;
        }

        case "css": {
          result = formatCode(input, "css", mode === "minify");
          break;
        }

        case "javascript": {
          result = formatCode(input, "javascript", mode === "minify");
          break;
        }

        case "jwt": {
          const decoded = decodeJWT(input);

          setJwtData(decoded);

          result = JSON.stringify(
            {
              header: decoded.header,
              payload: decoded.payload,
            },
            null,
            2
          );

          break;
        }

        case "regex": {
          if (!testText.trim()) {
            throw new Error("Please enter text to test.");
          }

          // matchAll requires the global flag.
          const flags = regexFlags.includes("g")
            ? regexFlags
            : regexFlags + "g";

          const regex = new RegExp(input, flags);
          const matches = [...testText.matchAll(regex)];

          const found = matches.map((match) => ({
            value: match[0],
            index: match.index,
          }));

          setRegexResults(found);
          result = `${found.length} match(es) found.`;

          break;
        }

        default:
          throw new Error("Select a valid tool.");
      }

      setOutput(result);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    }
  };

  /* =================================
     UUID GENERATION
  ================================= */

  const generateUUIDs = () => {
    setError("");
    setOutput("");

    try {
      const ids = Array.from(
        { length: uuidCount },
        () => generateUUID()
      );

      setOutput(ids.join("\n"));
    } catch {
      setError("Your browser does not support secure UUID generation.");
    }
  };

  /* =================================
     COPY OUTPUT
  ================================= */

  const copyOutput = async () => {
    try {
      await navigator.clipboard.writeText(output);
      setError("");
    } catch {
      setError("Clipboard access failed. Please copy manually.");
    }
  };

  /* =================================
     DOWNLOAD OUTPUT
  ================================= */

  const downloadOutput = () => {
    if (!output) return;

    const blob = new Blob([output], {
      type: "text/plain;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${activeTool}-output.txt`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  /* =================================
     DOWNLOAD DECODED FILE
  ================================= */

  const downloadDecodedFile = () => {
    if (!decodedFile) return;

    const link = document.createElement("a");

    link.href = decodedFile.url;
    link.download = decodedFile.filename;

    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  /* =================================
     UI
  ================================= */

  return (
    <div className="devhub">

      <style>{`

        .devhub {
          min-height: 100vh;
          padding: 35px 20px 65px;
          background: #f5f8ff;
          color: #19345b;
          font-family: inherit;
          text-align: left;
        }

        .devhub * {
          box-sizing: border-box;
        }

        .devhub-container {
          max-width: 1150px;
          margin: auto;
        }

        .devhub-back {
          border: 0;
          background: transparent;
          color: #2563eb;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          padding: 10px 0;
          margin-bottom: 20px;
        }

        .devhub-back:hover {
          color: #174fc4;
        }

        .devhub-heading {
          text-align: center;
          margin-bottom: 35px;
        }

        .devhub-heading-icon {
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

        .devhub-heading h1 {
          font-size: 32px;
          margin: 0 0 9px;
          color: #19345b;
        }

        .devhub-heading p {
          color: #71839e;
          margin: 0;
          font-size: 15px;
        }

        /* Dashboard */

        .devhub-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 17px;
        }

        .devhub-card {
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

        .devhub-card:hover {
          border-color: #8db4ff;
          transform: translateY(-3px);
          box-shadow: 0 10px 25px #2563eb12;
        }

        .devhub-card-icon {
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

        .devhub-card-text {
          flex: 1;
          min-width: 0;
        }

        .devhub-card-text strong {
          display: block;
          font-size: 15px;
          margin-bottom: 6px;
        }

        .devhub-card-text small {
          display: block;
          color: #8392a8;
          line-height: 1.45;
          font-size: 12px;
        }

        .devhub-arrow {
          color: #2563eb;
          font-size: 20px;
        }

        /* Workspace */

        .devhub-workspace {
          background: #ffffff;
          border: 1px solid #e1e9f6;
          border-radius: 18px;
          padding: 25px;
          box-shadow: 0 8px 30px #1d3b6710;
        }

        .devhub-toolbar {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 20px;
        }

        .devhub-toolbar h2 {
          font-size: 20px;
          margin: 0;
        }

        .devhub-toolbar p {
          font-size: 13px;
          color: #8392a8;
          margin: 5px 0 0;
        }

        .devhub-controls {
          display: flex;
          flex-wrap: wrap;
          gap: 9px;
        }

        .devhub select,
        .devhub input[type="number"] {
          height: 42px;
          border: 1px solid #dce5f2;
          border-radius: 8px;
          padding: 0 12px;
          background: #ffffff;
          color: #19345b;
          font-size: 13px;
        }

        /* Mode buttons */

        .devhub-mode {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          padding: 4px;
          background: #f0f4fb;
          border-radius: 10px;
          margin-bottom: 18px;
          width: fit-content;
        }

        .devhub-mode button {
          border: 0;
          background: transparent;
          color: #64748b;
          border-radius: 7px;
          padding: 9px 16px;
          cursor: pointer;
          font-weight: 600;
          font-size: 13px;
        }

        .devhub-mode button.active {
          background: #ffffff;
          color: #2563eb;
          box-shadow: 0 1px 5px #1d3b6715;
        }

        /* Labels */

        .devhub-label {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          color: #405574;
          font-size: 13px;
          font-weight: 700;
          margin: 0 0 9px;
        }

        /* Input editor */

        .devhub textarea {
          display: block;
          width: 100%;
          min-height: 245px;
          resize: vertical;
          padding: 16px;
          border: 1px solid #dce5f2;
          border-radius: 10px;
          outline: none;
          color: #243955;
          background: #fbfcff;
          font: 13px/1.7 Consolas, Monaco, monospace;
          text-align: left;
          direction: ltr;
          unicode-bidi: plaintext;
          white-space: pre;
          tab-size: 2;
        }

        .devhub textarea:focus,
        .devhub input:focus,
        .devhub select:focus {
          border-color: #5790f5;
          box-shadow: 0 0 0 3px #2563eb12;
          outline: none;
        }

        /* Buttons */

        .devhub-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin: 18px 0;
        }

        .devhub-btn {
          border: 0;
          border-radius: 9px;
          padding: 12px 19px;
          background: #2563eb;
          color: #ffffff;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: 0.2s;
        }

        .devhub-btn:hover {
          background: #174fc4;
        }

        .devhub-btn.secondary {
          background: #edf3ff;
          color: #2563eb;
        }

        .devhub-btn.secondary:hover {
          background: #dfeaff;
        }

        .devhub-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Errors */

        .devhub-error {
          margin: 15px 0;
          padding: 12px 15px;
          border-radius: 9px;
          color: #b42318;
          background: #fff1f0;
          border: 1px solid #ffd5d2;
          font-size: 13px;
          overflow-wrap: anywhere;
        }

        /* Output */

        .devhub-result {
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid #edf1f7;
          text-align: left;
        }

        .devhub-result pre {
          display: block;
          width: 100%;
          margin: 0;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
          background: #f7f9fd;
          border: 1px solid #e3eaf4;
          padding: 16px;
          border-radius: 10px;
          min-height: 65px;
          max-height: 450px;
          overflow: auto;
          color: #263b5e;
          font: 13px/1.7 Consolas, Monaco, monospace;
          text-align: left;
          direction: ltr;
          unicode-bidi: plaintext;
          tab-size: 2;
        }

        .devhub-result-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 9px;
          margin-top: 10px;
        }

        /* Information */

        .devhub-info {
          margin-top: 20px;
          padding: 15px;
          background: #f4f7fd;
          border-radius: 10px;
          color: #71839e;
          font-size: 12px;
          line-height: 1.6;
        }

        /* Regex results */

        .devhub-matches {
          margin-top: 15px;
          padding: 14px;
          border-radius: 10px;
          background: #f5f8ff;
          border: 1px solid #e3eaf4;
          font-size: 13px;
        }

        .devhub-match {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding: 9px 0;
          border-bottom: 1px solid #e5ebf4;
          overflow-wrap: anywhere;
        }

        .devhub-match:last-child {
          border-bottom: 0;
        }

        /* JWT */

        .devhub-jwt {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-top: 15px;
        }

        .devhub-jwt section {
          min-width: 0;
          background: #f7f9fd;
          border: 1px solid #e3eaf4;
          padding: 13px;
          border-radius: 10px;
        }

        .devhub-jwt h4 {
          margin: 0 0 10px;
          font-size: 13px;
        }

        .devhub-jwt pre {
          white-space: pre-wrap;
          overflow-wrap: anywhere;
          font-size: 12px;
          text-align: left;
          direction: ltr;
        }

        /* Base64 decoded files */

        .devhub-decoded-file {
          margin-top: 22px;
          padding: 22px;
          background: #f7f9fd;
          border: 1px solid #e3eaf4;
          border-radius: 12px;
          text-align: left;
        }

        .devhub-decoded-file h3 {
          margin: 0 0 12px;
          color: #19345b;
          font-size: 17px;
        }

        .devhub-decoded-file p {
          margin: 7px 0;
          color: #71839e;
          font-size: 13px;
          overflow-wrap: anywhere;
        }

        .devhub-decoded-image {
          display: block;
          max-width: 100%;
          max-height: 350px;
          object-fit: contain;
          margin: 18px auto;
          padding: 10px;
          background: #ffffff;
          border: 1px solid #e3eaf4;
          border-radius: 10px;
        }

        .devhub-decoded-placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 110px;
          margin-top: 15px;
          background: #ffffff;
          border: 1px dashed #cbd8eb;
          border-radius: 10px;
          color: #71839e;
          font-size: 13px;
          text-align: center;
          padding: 15px;
        }

        /* Footer */

        .devhub-footer {
          text-align: center;
          margin-top: 30px;
          color: #8998ad;
          font-size: 12px;
        }

        /* Tablet */

        @media (max-width: 850px) {
          .devhub-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        /* Mobile */

        @media (max-width: 560px) {
          .devhub {
            padding: 22px 13px 45px;
          }

          .devhub-grid {
            grid-template-columns: 1fr;
          }

          .devhub-heading h1 {
            font-size: 26px;
          }

          .devhub-workspace {
            padding: 16px;
          }

          .devhub-jwt {
            grid-template-columns: 1fr;
          }

          .devhub-toolbar {
            align-items: flex-start;
          }

          .devhub textarea {
            min-height: 200px;
            font-size: 12px;
          }

          .devhub-actions .devhub-btn {
            flex: 1;
          }
        }

      `}</style>

      <div className="devhub-container">

        {/* BACK BUTTON */}

        <button
          className="devhub-back"
          onClick={activeTool ? goBack : onBack}
        >
          ← {activeTool ? "Back to Developer Tools" : "Back to Categories"}
        </button>

        {/* HEADING */}

        <div className="devhub-heading">

          <div className="devhub-heading-icon">
            {selectedTool?.icon || "⌘"}
          </div>

          <h1>
            {selectedTool?.name || "Developer Tools"}
          </h1>

          <p>
            {selectedTool?.desc ||
              "Simple and powerful utilities for developers."}
          </p>

        </div>

        {/* DASHBOARD */}

        {!activeTool ? (

          <div className="devhub-grid">

            {tools.map((tool) => (

              <button
                className="devhub-card"
                key={tool.id}
                onClick={() => openTool(tool.id)}
              >

                <span className="devhub-card-icon">
                  {tool.icon}
                </span>

                <span className="devhub-card-text">

                  <strong>{tool.name}</strong>

                  <small>{tool.desc}</small>

                </span>

                <span className="devhub-arrow">→</span>

              </button>

            ))}

          </div>

        ) : (

          /* TOOL WORKSPACE */

          <div className="devhub-workspace">

            {/* TOOL TITLE */}

            <div className="devhub-toolbar">

              <div>
                <h2>{selectedTool.name}</h2>
                <p>{selectedTool.desc}</p>
              </div>

              <div className="devhub-controls">

                {isRegex && (

                  <select
                    value={regexFlags}
                    onChange={(e) => {
                      setRegexFlags(e.target.value);
                      setOutput("");
                      setRegexResults([]);
                    }}
                    aria-label="Regex flags"
                  >
                    <option value="g">Global (g)</option>
                    <option value="gi">Global + Ignore Case (gi)</option>
                    <option value="i">Ignore Case (i)</option>
                    <option value="gm">Global + Multiline (gm)</option>
                    <option value="gim">
                      Global + Ignore Case + Multiline
                    </option>
                  </select>

                )}

                {isUUID && (

                  <select
                    value={uuidCount}
                    onChange={(e) => setUuidCount(Number(e.target.value))}
                    aria-label="Number of UUIDs"
                  >
                    {[1, 5, 10, 20, 50, 100].map((number) => (
                      <option key={number} value={number}>
                        {number} UUIDs
                      </option>
                    ))}
                  </select>

                )}

              </div>

            </div>

            {/* FORMAT / MINIFY MODE */}

            {["json", "html", "css", "javascript"].includes(activeTool) && (

              <div className="devhub-mode">

                {["format", "minify"].map((item) => (

                  <button
                    key={item}
                    className={mode === item ? "active" : ""}
                    onClick={() => {
                      setMode(item);
                      setOutput("");
                      setError("");
                    }}
                  >
                    {item === "format" ? "Format / Beautify" : "Minify"}
                  </button>

                ))}

              </div>

            )}

            {/* ENCODE / DECODE MODE */}

            {(isBase64 || isURL) && (

              <div className="devhub-mode">

                {["encode", "decode"].map((item) => (

                  <button
                    key={item}
                    className={mode === item ? "active" : ""}
                    onClick={() => {
                      setMode(item);
                      setOutput("");
                      setError("");
                      setDecodedFile(null);
                    }}
                  >
                    {item === "encode" ? "Encode" : "Decode"}
                  </button>

                ))}

              </div>

            )}

            {/* UUID GENERATOR */}

            {isUUID ? (

              <>

                <div className="devhub-info">
                  Generate cryptographically random UUID v4 identifiers.
                  Select the number of UUIDs you want to generate.
                </div>

                <div className="devhub-actions">

                  <button
                    className="devhub-btn"
                    onClick={generateUUIDs}
                  >
                    ✨ Generate UUIDs
                  </button>

                  <button
                    className="devhub-btn secondary"
                    onClick={reset}
                  >
                    Clear
                  </button>

                </div>

              </>

            ) : (

              /* INPUT AREA */

              <>

                <label
                  className="devhub-label"
                  htmlFor="devhub-input"
                >

                  <span>
                    {isRegex
                      ? "Regular Expression"
                      : isJWT
                        ? "JWT Token"
                        : isBase64
                          ? "Text, Base64 or Data URL"
                          : "Input"}
                  </span>

                  <span>{input.length} characters</span>

                </label>

                <textarea
                  id="devhub-input"
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    setError("");
                    setOutput("");
                    setRegexResults([]);
                    setDecodedFile(null);
                  }}
                  placeholder={
                    isRegex
                      ? "\\d+"
                      : isJWT
                        ? "Paste your JWT token here..."
                        : isBase64
                          ? mode === "encode"
                            ? "Enter text to encode..."
                            : "Paste Base64 content or a complete data URL here..."
                          : activeTool === "json"
                            ? '{\n  "name": "Tools Hub",\n  "version": 1\n}'
                            : activeTool === "html"
                              ? "<!DOCTYPE html>\n<html>\n<head><title>Tools Hub</title></head>\n<body><h1>Hello World</h1></body>\n</html>"
                              : activeTool === "css"
                                ? "body { color: blue; margin: 0; }"
                                : activeTool === "javascript"
                                  ? "function hello(){console.log('Hello World');}"
                                  : "Enter or paste your text here..."
                  }
                  spellCheck="false"
                />

                {/* BASE64 INFORMATION */}

                {isBase64 && (

                  <div className="devhub-info">
                    Decode supports ordinary text, Base64URL, image data URLs
                    and common binary formats. When an image or file is
                    detected, you'll get a preview where supported and a
                    download option.
                  </div>

                )}

                {/* REGEX TEST TEXT */}

                {isRegex && (

                  <>

                    <div className="devhub-info">
                      Enter a regular expression above and the text you
                      want to test below.
                    </div>

                    <label
                      className="devhub-label"
                      htmlFor="devhub-regex-text"
                      style={{ marginTop: 18 }}
                    >
                      <span>Test Text</span>
                      <span>{testText.length} characters</span>
                    </label>

                    <textarea
                      id="devhub-regex-text"
                      value={testText}
                      onChange={(e) => {
                        setTestText(e.target.value);
                        setOutput("");
                        setError("");
                        setRegexResults([]);
                      }}
                      placeholder="Enter text to test against your regular expression..."
                      spellCheck="false"
                    />

                  </>

                )}

                {/* ACTION BUTTONS */}

                <div className="devhub-actions">

                  <button
                    className="devhub-btn"
                    onClick={process}
                    disabled={
                      !input.trim() ||
                      (isRegex && !testText.trim())
                    }
                  >
                    {isRegex
                      ? "Test Regex"
                      : isJWT
                        ? "Decode JWT"
                        : isBase64
                          ? mode === "encode"
                            ? "Encode Base64"
                            : "Decode Base64"
                          : isURL
                            ? mode === "encode"
                              ? "Encode URL"
                              : "Decode URL"
                            : "Run Tool"}
                  </button>

                  <button
                    className="devhub-btn secondary"
                    onClick={reset}
                  >
                    Clear
                  </button>

                </div>

              </>

            )}

            {/* ERRORS */}

            {error && (

              <div className="devhub-error">
                ⚠️ {error}
              </div>

            )}

            {/* REGEX MATCH RESULTS */}

            {isRegex && output && (

              <div className="devhub-matches">

                <strong>{output}</strong>

                {regexResults.map((match, index) => (

                  <div
                    className="devhub-match"
                    key={`${match.index}-${index}`}
                  >

                    <code>{match.value || "(empty match)"}</code>

                    <span>Position: {match.index}</span>

                  </div>

                ))}

              </div>

            )}

            {/* JWT RESULTS */}

            {isJWT && jwtData && (

              <div className="devhub-jwt">

                <section>

                  <h4>JWT Header</h4>

                  <pre>
                    {JSON.stringify(jwtData.header, null, 2)}
                  </pre>

                </section>

                <section>

                  <h4>JWT Payload</h4>

                  <pre>
                    {JSON.stringify(jwtData.payload, null, 2)}
                  </pre>

                </section>

                <section style={{ gridColumn: "1 / -1" }}>

                  <h4>Signature (encoded)</h4>

                  <pre>{jwtData.signature}</pre>

                </section>

              </div>

            )}

            {/* TEXT OUTPUT */}

            {output && !isRegex && !decodedFile && (

              <div className="devhub-result">

                <label className="devhub-label">

                  <span>
                    {isUUID ? "Generated UUIDs" : "Output"}
                  </span>

                  <span>{output.length} characters</span>

                </label>

                <pre>{output}</pre>

                <div className="devhub-result-actions">

                  <button
                    className="devhub-btn"
                    onClick={copyOutput}
                  >
                    Copy Output
                  </button>

                  <button
                    className="devhub-btn secondary"
                    onClick={downloadOutput}
                  >
                    Download
                  </button>

                </div>

              </div>

            )}

            {/* DECODED IMAGE OR FILE OUTPUT */}

            {isBase64 && decodedFile && (

              <div className="devhub-decoded-file">

                <h3>
                  <span>✓</span> File Decoded Successfully
                </h3>

                <p>
                  **File name:** {decodedFile.filename}
                </p>

                <p>
                  **File type:** {decodedFile.mimeType}
                </p>

                <p>
                  **File size:** {(decodedFile.size / 1024).toFixed(2)} KB
                </p>

                {decodedFile.isImage ? (

                  <img
                    src={decodedFile.url}
                    alt="Decoded image preview"
                    className="devhub-decoded-image"
                  />

                ) : (

                  <div className="devhub-decoded-placeholder">
                    File successfully decoded. Use the button below to
                    download and open it with a suitable application.
                  </div>

                )}

                <div className="devhub-actions">

                  <button
                    className="devhub-btn"
                    onClick={downloadDecodedFile}
                  >
                    ↓ Download Decoded File
                  </button>

                  <button
                    className="devhub-btn secondary"
                    onClick={() => {
                      setDecodedFile(null);
                      setOutput("");
                    }}
                  >
                    Remove Preview
                  </button>

                </div>

              </div>

            )}

            {/* TOOL INFORMATION */}

            <div className="devhub-info">

              {activeTool === "jwt" && (
                <>
                  JWT decoding is performed locally. It does not verify
                  the token's signature or establish whether the token is trusted.
                </>
              )}

              {activeTool === "regex" && (
                <>
                  Regex uses JavaScript regular expression syntax.
                  Avoid untrusted, extremely complex patterns that could
                  take a long time to execute.
                </>
              )}

              {activeTool === "javascript" && (
                <>
                  The JavaScript formatter is a lightweight formatter,
                  not a full JavaScript parser. Review the output before
                  using it in production.
                </>
              )}

              {activeTool === "html" && (
                <>
                  HTML formatting is intended for ordinary markup.
                  Complex inline content, scripts and styles may need
                  manual review.
                </>
              )}

              {activeTool === "css" && (
                <>
                  CSS formatting is lightweight. Review complex strings
                  and comments after formatting or minifying.
                </>
              )}

              {activeTool === "uuid" && (
                <>
                  UUIDs are generated locally using your browser's
                  cryptographic random number generator.
                </>
              )}

              {activeTool === "json" && (
                <>
                  Invalid JSON will display an error. Formatting and
                  minifying preserve the JSON data.
                </>
              )}

              {activeTool === "base64" && (
                <>
                  Base64 is an encoding format, not encryption.
                  Never use it to protect sensitive information.
                </>
              )}

              {activeTool === "url" && (
                <>
                  URL encoding uses encodeURIComponent and
                  decodeURIComponent.
                </>
              )}

            </div>

          </div>

        )}

        <div className="devhub-footer">
          Tools Hub · Developer Utilities · Processed locally in your browser
        </div>

      </div>

    </div>
  );
}

export default DeveloperTools;
