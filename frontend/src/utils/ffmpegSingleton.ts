// src/utils/ffmpegSingleton.ts
import { loadFFmpeg } from "./ffmpegLoader";

let ffmpegInstance: any = null;
let fetchFileFn: any = null;

/**
 * Returns an FFmpeg instance.
 * - Default (no args): returns a shared singleton.
 * - With `fresh = true`: creates a new independent instance (for parallel conversions).
 */
export async function getFFmpeg(fresh = false) {
  // 🆕 If a fresh instance is requested, always create a new one
  if (fresh) {
    const { ffmpeg } = await loadFFmpeg();
    return ffmpeg;
  }

  // 🧩 Otherwise use or create the singleton
  if (!ffmpegInstance) {
    console.log("🧩 Preloading FFmpeg...");
    const { ffmpeg, fetchFile } = await loadFFmpeg();

    // ✅ Handle both FFmpeg APIs (old and new)
    if (typeof ffmpeg.setProgress === "function") {
      ffmpeg.setProgress(({ ratio }: { ratio: number }) => {
        console.log(`FFmpeg progress: ${Math.round(ratio * 100)}%`);
      });
    } else if (typeof ffmpeg.on === "function") {
      ffmpeg.on("progress", ({ progress }: { progress: number }) => {
        console.log(`FFmpeg progress: ${Math.round(progress * 100)}%`);
      });
    } else {
      console.warn("⚠️ FFmpeg build does not support progress tracking");
    }

    ffmpegInstance = ffmpeg;
    fetchFileFn = fetchFile;
  }

  return ffmpegInstance;
}

/**
 * Expose fetchFile for use elsewhere if needed.
 */
export function getFetchFile() {
  return fetchFileFn;
}
