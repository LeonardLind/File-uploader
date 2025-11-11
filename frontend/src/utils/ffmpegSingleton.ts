// src/utils/ffmpegSingleton.ts
import { loadFFmpeg } from "./ffmpegLoader";

let ffmpegInstance: any = null;
let fetchFileFn: any = null;

/**
 * Returns a singleton FFmpeg instance that stays loaded between calls.
 */
export async function getFFmpeg() {
  if (!ffmpegInstance) {
    console.log("🧩 Preloading FFmpeg...");
    const { ffmpeg, fetchFile } = await loadFFmpeg();

    // ✅ Handle both FFmpeg APIs (old and new)
    if (typeof ffmpeg.setProgress === "function") {
      // Old-style API (createFFmpeg)
      ffmpeg.setProgress(({ ratio }: { ratio: number }) => {
        console.log(`FFmpeg progress: ${Math.round(ratio * 100)}%`);
      });
    } else if (typeof ffmpeg.on === "function") {
      // New class-based API (FFmpeg from @ffmpeg/ffmpeg@0.12+)
      ffmpeg.on("progress", ({ progress }: { progress: number }) => {
        console.log(`FFmpeg progress: ${Math.round(progress * 100)}%`);
      });
    } else {
      console.warn("⚠️ FFmpeg build does not support progress tracking");
    }

    ffmpegInstance = ffmpeg;
    fetchFileFn = fetchFile;
  }

  return ffmpegInstance; // ✅ return only the ffmpeg instance
}

/**
 * Expose fetchFile for use in other places if needed
 */
export function getFetchFile() {
  return fetchFileFn;
}
