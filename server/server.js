
import express from "express";
import multer from "multer";
import ffmpegPath from "ffmpeg-static";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const app = express();
const PORT = 5000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ========================================
// DIRECTORIES
// ========================================

const uploadDir = path.join(__dirname, "uploads");
const outputDir = path.join(__dirname, "outputs");

fs.mkdirSync(uploadDir, { recursive: true });
fs.mkdirSync(outputDir, { recursive: true });

if (!ffmpegPath) {
  throw new Error("FFmpeg executable was not found.");
}

// ========================================
// MULTER UPLOAD CONFIGURATION
// ========================================

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();

    cb(null, `${crypto.randomUUID()}${extension}`);
  },
});

const upload = multer({
  storage,

  limits: {
    fileSize: 500 * 1024 * 1024,
  },

  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("video/")) {
      cb(null, true);
    } else {
      cb(new Error("Please upload a valid video file."));
    }
  },
});

// ========================================
// AUDIO UPLOAD CONFIGURATION
// ========================================

// ========================================
// AUDIO UPLOAD CONFIGURATION
// ========================================

const audioUpload = multer({
  storage,

  limits: {
    fileSize: 500 * 1024 * 1024,
  },

  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("audio/")) {
      cb(null, true);
    } else {
      cb(new Error("Please upload a valid audio file."));
    }
  },
});



// ========================================
// HELPER FUNCTIONS
// ========================================

function deleteFile(filePath) {
  if (filePath) {
    fs.unlink(filePath, () => {});
  }
}

function getQuality(value) {
  const settings = {
    high: {
      crf: "20",
      preset: "ultrafast",
    },

    medium: {
      crf: "26",
      preset: "ultrafast",
    },

    low: {
      crf: "32",
      preset: "ultrafast",
    },
  };

  return settings[value];
}

// ========================================
// HEALTH CHECK
// ========================================

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Tools Hub video backend is running.",
  });
});

// ========================================
// VIDEO COMPRESSOR
// ========================================

app.post(
  "/api/video/compress",
  upload.single("video"),
  (req, res) => {
    const inputPath = req.file?.path;

    if (!inputPath) {
      return res.status(400).json({
        success: false,
        message: "Please select a video.",
      });
    }

    const level = req.body.level || "medium";
    const resolution = Number(req.body.resolution || 720);

    // Existing compressor quality settings
    const settings = {
      low: {
        crf: "28",
        preset: "fast",
      },

      medium: {
        crf: "23",
        preset: "medium",
      },

      high: {
        crf: "20",
        preset: "slow",
      },
    };

    if (!settings[level]) {
      deleteFile(inputPath);

      return res.status(400).json({
        success: false,
        message: "Invalid compression level.",
      });
    }

    if (![2160, 1080, 720, 480].includes(resolution)) {
      deleteFile(inputPath);

      return res.status(400).json({
        success: false,
        message: "Invalid output resolution.",
      });
    }

    const outputName = `${crypto.randomUUID()}.mp4`;
    const outputPath = path.join(outputDir, outputName);

    const args = [
      "-y",
      "-i", inputPath,

      "-vf",
      `scale=w='min(${resolution},iw)':h='min(${resolution},ih)':force_original_aspect_ratio=decrease:force_divisible_by=2`,

      "-c:v", "libx264",
      "-preset", settings[level].preset,
      "-crf", settings[level].crf,

      "-c:a", "aac",
      "-b:a", "128k",

      "-movflags", "+faststart",
      "-pix_fmt", "yuv420p",

      outputPath,
    ];

    console.log("Starting video compression...");

    const ffmpeg = spawn(ffmpegPath, args);

    let errorOutput = "";
    let handled = false;

    ffmpeg.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    ffmpeg.on("error", (error) => {
      if (handled) return;
      handled = true;

      deleteFile(inputPath);
      deleteFile(outputPath);

      console.error("Compressor FFmpeg error:", error);

      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: "Could not start FFmpeg.",
        });
      }
    });

    ffmpeg.on("close", (code) => {
      if (handled) return;
      handled = true;

      deleteFile(inputPath);

      if (code !== 0) {
        deleteFile(outputPath);

        console.error("Compression failed:", errorOutput);

        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            message: "Video compression failed.",
          });
        }

        return;
      }

      console.log("Video compression completed.");

      res.download(
        outputPath,
        "compressed-video.mp4",
        (error) => {
          deleteFile(outputPath);

          if (error) {
            console.error("Compression download error:", error);
          }
        }
      );
    });
  }
);

// ========================================
// VIDEO CONVERTER
// ========================================

app.post(
  "/api/video/convert",
  upload.single("video"),
  (req, res) => {
    const inputPath = req.file?.path;

    if (!inputPath) {
      return res.status(400).json({
        success: false,
        message: "Please select a video.",
      });
    }

    const format = String(
      req.body.format || "mp4"
    ).toLowerCase();

    const quality = String(
      req.body.quality || "medium"
    ).toLowerCase();

    const supportedFormats = [
      "mp4",
      "webm",
      "mov",
      "avi",
      "mkv",
    ];

    if (!supportedFormats.includes(format)) {
      deleteFile(inputPath);

      return res.status(400).json({
        success: false,
        message: "Unsupported output format.",
      });
    }

    const settings = getQuality(quality);

    if (!settings) {
      deleteFile(inputPath);

      return res.status(400).json({
        success: false,
        message: "Invalid conversion quality.",
      });
    }

    const outputName = `${crypto.randomUUID()}.${format}`;
    const outputPath = path.join(outputDir, outputName);

    const args = [
      "-y",
      "-i", inputPath,

      "-map", "0:v:0",
      "-map", "0:a?",
      "-sn",
    ];

    // ------------------------------------
    // MP4, MOV, MKV
    // ------------------------------------

    if (
      format === "mp4" ||
      format === "mov" ||
      format === "mkv"
    ) {
      args.push(
        "-c:v", "libx264",
        "-preset", settings.preset,
        "-crf", settings.crf,
        "-pix_fmt", "yuv420p",

        "-c:a", "aac",
        "-b:a", "128k"
      );

      if (format === "mp4") {
        args.push("-movflags", "+faststart");
      }
    }

    // ------------------------------------
    // WEBM - FASTER VP8 ENCODING
    // ------------------------------------

    else if (format === "webm") {
      const webmQuality = {
        high: "24",
        medium: "32",
        low: "40",
      };

      args.push(
        "-c:v", "libvpx",
        "-crf", webmQuality[quality],
        "-b:v", "0",

        "-deadline", "realtime",
        "-cpu-used", "8",
        "-threads", "0",

        "-c:a", "libvorbis",
        "-q:a", "4"
      );
    }

    // ------------------------------------
    // AVI
    // ------------------------------------

    else if (format === "avi") {
      const aviQuality = {
        high: "2",
        medium: "5",
        low: "8",
      };

      args.push(
        "-c:v", "mpeg4",
        "-q:v", aviQuality[quality],

        "-c:a", "libmp3lame",
        "-b:a", "128k"
      );
    }

    args.push(outputPath);

    console.log(
      `Starting video conversion: ${format.toUpperCase()}`
    );

    const ffmpeg = spawn(ffmpegPath, args);

    let errorOutput = "";
    let handled = false;

    ffmpeg.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    ffmpeg.on("error", (error) => {
      if (handled) return;
      handled = true;

      deleteFile(inputPath);
      deleteFile(outputPath);

      console.error("Converter FFmpeg error:", error);

      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: "Could not start FFmpeg.",
        });
      }
    });

    ffmpeg.on("close", (code) => {
      if (handled) return;
      handled = true;

      deleteFile(inputPath);

      if (code !== 0) {
        deleteFile(outputPath);

        console.error("Video conversion failed:", errorOutput);

        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            message: `Conversion to ${format.toUpperCase()} failed. Check the backend terminal.`,
          });
        }

        return;
      }

      console.log(
        `Video conversion completed: ${format.toUpperCase()}`
      );

      res.download(
        outputPath,
        `converted-video.${format}`,
        (error) => {
          deleteFile(outputPath);

          if (error) {
            console.error("Converter download error:", error);
          }
        }
      );
    });
  }
);


// ========================================
// AUDIO CONVERTER
// ========================================

app.post(
  "/api/audio/convert",
  audioUpload.single("audio"),
  (req, res) => {
    const inputPath = req.file?.path;

    if (!inputPath) {
      return res.status(400).json({
        success: false,
        message: "Please select an audio file.",
      });
    }

    const format = String(
      req.body.format || "mp3"
    ).toLowerCase();

    const supportedFormats = [
      "mp3",
      "wav",
      "ogg",
      "m4a",
      "flac",
    ];

    if (!supportedFormats.includes(format)) {
      deleteFile(inputPath);

      return res.status(400).json({
        success: false,
        message: "Unsupported audio output format.",
      });
    }

    const outputName = `${crypto.randomUUID()}.${format}`;
    const outputPath = path.join(outputDir, outputName);

    const args = [
      "-y",
      "-i", inputPath,
      "-vn",
    ];

    // MP3
    if (format === "mp3") {
      args.push(
        "-c:a", "libmp3lame",
        "-b:a", "192k"
      );
    }

    // WAV
    else if (format === "wav") {
      args.push(
        "-c:a", "pcm_s16le"
      );
    }

    // OGG
    else if (format === "ogg") {
      args.push(
        "-c:a", "libvorbis",
        "-q:a", "5"
      );
    }

    // AAC in M4A container
    else if (format === "m4a") {
      args.push(
        "-c:a", "aac",
        "-b:a", "192k"
      );
    }

    // FLAC
    else if (format === "flac") {
      args.push(
        "-c:a", "flac"
      );
    }

    args.push(outputPath);

    console.log(
      `Starting audio conversion: ${format.toUpperCase()}`
    );

    const ffmpeg = spawn(ffmpegPath, args);

    let errorOutput = "";
    let handled = false;

    ffmpeg.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    ffmpeg.on("error", (error) => {
      if (handled) return;
      handled = true;

      deleteFile(inputPath);
      deleteFile(outputPath);

      console.error("Audio FFmpeg error:", error);

      if (!res.headersSent && !res.destroyed) {
        res.status(500).json({
          success: false,
          message: "Could not start audio conversion.",
        });
      }
    });

    ffmpeg.on("close", (code) => {
      if (handled) return;
      handled = true;

      deleteFile(inputPath);

      if (code !== 0) {
        deleteFile(outputPath);

        console.error("Audio conversion failed:", errorOutput);

        if (!res.headersSent && !res.destroyed) {
          res.status(500).json({
            success: false,
            message: `Conversion to ${format.toUpperCase()} failed.`,
          });
        }

        return;
      }

      console.log(
        `Audio conversion completed: ${format.toUpperCase()}`
      );

      if (res.destroyed) {
        deleteFile(outputPath);
        return;
      }

      res.download(
        outputPath,
        `converted-audio.${format}`,
        (error) => {
          deleteFile(outputPath);

          if (error) {
            console.error("Audio download error:", error);
          }
        }
      );
    });

    // Stop processing if the client disconnects.
    res.on("close", () => {
      if (!res.writableEnded && !handled) {
        ffmpeg.kill("SIGKILL");
        deleteFile(inputPath);
        deleteFile(outputPath);
      }
    });
  }
);

// ========================================
// UPLOAD ERROR HANDLING
// ========================================

app.use((error, req, res, next) => {
  console.error("Upload error:", error.message);

  if (req.file?.path) {
    deleteFile(req.file.path);
  }

  if (
    error instanceof multer.MulterError &&
    error.code === "LIMIT_FILE_SIZE"
  ) {
    return res.status(413).json({
      success: false,
      message: "Video is too large. Maximum size is 500 MB.",
    });
  }

  res.status(400).json({
    success: false,
    message: error.message || "Something went wrong.",
  });
});

// ========================================
// START SERVER
// ========================================

app.listen(PORT, () => {
  console.log(
    `Video backend running at http://localhost:${PORT}`
  );

  console.log("Video Compressor: Ready");
  console.log("Video Converter: Ready");
  console.log("Audio Converter: Ready");
});
