// src/lib/ffmpeg/ffmpegClient.ts
import { getFFmpeg } from "../../utils/ffmpegSingleton";

let ffmpegReady: Promise<void> | null = null;

/**
 * Returns a preloaded FFmpeg instance.
 * Ensures FFmpeg is only initialized once and reused everywhere.
 */
export async function getFfmpegClient() {
  const ffmpeg = await getFFmpeg();

  // preload only once
  if (!ffmpegReady) {
    ffmpegReady = ffmpeg.load();
  }

  await ffmpegReady;
  return ffmpeg;
}
