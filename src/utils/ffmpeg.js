
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

let ffmpegInstance = null;
let loadingPromise = null;
let activeProgressCallback = null;

export { fetchFile };

export async function getFFmpeg(onProgress) {
  activeProgressCallback =
    typeof onProgress === "function" ? onProgress : null;

  if (ffmpegInstance) return ffmpegInstance;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    const ffmpeg = new FFmpeg();

    ffmpeg.on("progress", ({ progress }) => {
      if (
        typeof activeProgressCallback === "function" &&
        Number.isFinite(progress)
      ) {
        activeProgressCallback(
          Math.max(0, Math.min(100, Math.round(progress * 100)))
        );
      }
    });

    const base = "/ffmpeg";

    const coreURL = await toBlobURL(
      `${base}/ffmpeg-core.js`,
      "text/javascript"
    );

    const wasmURL = await toBlobURL(
      `${base}/ffmpeg-core.wasm`,
      "application/wasm"
    );

    await ffmpeg.load({
      coreURL,
      wasmURL,
    });

    ffmpegInstance = ffmpeg;

    return ffmpeg;
  })();

  try {
    return await loadingPromise;
  } catch (error) {
    console.error("FFmpeg initialization failed:", error);
    loadingPromise = null;
    activeProgressCallback = null;
    throw error;
  }
}
