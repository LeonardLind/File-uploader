// src/lib/ffmpeg/convertAviToMp4.ts
import { getFfmpegClient } from "./ffmpegClient";

/**
 * Converts .avi video to .mp4 using FFmpeg.
 * Returns a File object with the new MP4 content.
 */
export async function convertAviToMp4(
  file: File,
  onProgress?: (ratio: number) => void
): Promise<File> {
  const ffmpeg = await getFfmpegClient();

ffmpeg.on(
  "progress",
  ({ progress }: { progress: number }) => {
    if (onProgress) onProgress(progress);
  }
);


  const inputName = "input.avi";
  const outputName = "output.mp4";

  await ffmpeg.writeFile(inputName, await file.arrayBuffer());
  await ffmpeg.exec([
    "-i",
    inputName,
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    outputName,
  ]);

  const data = await ffmpeg.readFile(outputName);
  const blob = new Blob([data.buffer], { type: "video/mp4" });

  return new File([blob], file.name.replace(/\.avi$/i, ".mp4"), {
    type: "video/mp4",
  });
}
