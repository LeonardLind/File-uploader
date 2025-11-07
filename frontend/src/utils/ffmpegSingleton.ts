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

    ffmpeg.setProgress(({ ratio }: { ratio: number }) => {
      console.log(`FFmpeg progress: ${Math.round(ratio * 100)}%`);
    });

    ffmpegInstance = ffmpeg;
    fetchFileFn = fetchFile;
  }

  return { ffmpeg: ffmpegInstance, fetchFile: fetchFileFn };
}
