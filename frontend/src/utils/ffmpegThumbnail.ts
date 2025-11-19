// src/utils/ffmpegThumbnail.ts
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";

/**
 * Generate a JPEG thumbnail from a video file using ffmpeg.wasm
 * Returns a Blob URL string.
 */
export async function generateThumbnailBlob(videoFile: File): Promise<string> {
  const ffmpeg = new FFmpeg();
  await ffmpeg.load();

  // Load video into FFmpeg FS
  await ffmpeg.writeFile("input.mp4", await fetchFile(videoFile));

  // Extract a frame at 1 second
  await ffmpeg.exec([
    "-i", "input.mp4",
    "-ss", "00:00:01",
    "-frames:v", "1",
    "-vf", "scale=200:-1",
    "thumb.jpg"
  ]);

  // readFile returns Uint8Array
  const uint8 = await ffmpeg.readFile("thumb.jpg") as Uint8Array;

  // Create a guaranteed ArrayBuffer (fix for TS errors)
  const arrayBuffer = new ArrayBuffer(uint8.byteLength);
  const view = new Uint8Array(arrayBuffer);
  view.set(uint8);

  const blob = new Blob([arrayBuffer], { type: "image/jpeg" });
  return URL.createObjectURL(blob);
}
