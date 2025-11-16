// src/lib/ffmpeg/trimVideo.ts
import { getFfmpegClient } from "./ffmpegClient";

/**
 * Trims a video between [start, end] seconds.
 * Returns a new File with the trimmed result.
 */
export async function trimVideo(
  file: File,
  start: number,
  end: number
): Promise<File> {
  const ffmpeg = await getFfmpegClient();

  const inputName = "trim_input.mp4";
  const outputName = "trim_output.mp4";

  await ffmpeg.writeFile(inputName, await file.arrayBuffer());

  await ffmpeg.exec([
    "-ss",
    String(start),
    "-to",
    String(end),
    "-i",
    inputName,
    "-c",
    "copy",
    outputName,
  ]);

  const data = await ffmpeg.readFile(outputName);
  const blob = new Blob([data.buffer], { type: file.type });

  return new File([blob], `trimmed_${file.name}`, { type: file.type });
}
