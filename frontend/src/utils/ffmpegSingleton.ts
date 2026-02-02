import { loadFFmpeg } from "./ffmpegLoader";

// We keep ONE FFmpeg in memory for the whole app
let ffmpegInstance: any = null;
let fetchFileFn: any = null;


export async function getFFmpeg(fresh = false) {
  // Reuse a single ffmpeg instance unless a fresh one is requested.
  if (fresh) {
    const { ffmpeg } = await loadFFmpeg();
    return ffmpeg;
  }

  if (!ffmpegInstance) {
    console.log("Preloading FFmpeg...");
    const { ffmpeg, fetchFile } = await loadFFmpeg();

    if (typeof ffmpeg.setProgress === "function") {
      ffmpeg.setProgress(({ ratio }: { ratio: number }) => {
        console.log(`FFmpeg progress: ${Math.round(ratio * 100)}%`);
      });
    } else if (typeof ffmpeg.on === "function") {
      ffmpeg.on("progress", ({ progress }: { progress: number }) => {
        console.log(`FFmpeg progress: ${Math.round(progress * 100)}%`);
      });
    } else {
      console.warn("FFmpeg build does not support progress tracking");
    }

    ffmpegInstance = ffmpeg;
    fetchFileFn = fetchFile;
  }

  return ffmpegInstance;
}

export function getFetchFile() {
  return fetchFileFn;
}
