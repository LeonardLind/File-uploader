// src/lib/ffmpeg/generateThumbnail.ts
import { getFfmpegClient } from "./ffmpegClient";

/**
 * Generates a JPG thumbnail around the midpoint of the video.
 */
export async function generateThumbnail(
  videoFile: File,
  frameOffsetSeconds = 2
): Promise<File> {
  const ffmpeg = await getFfmpegClient();

  const inputName = "input.mp4";
  const outputName = "thumbnail.jpg";

  await ffmpeg.writeFile(inputName, await videoFile.arrayBuffer());

  await ffmpeg.exec([
    "-ss",
    `${frameOffsetSeconds}`,
    "-i",
    inputName,
    "-frames:v",
    "1",
    "-q:v",
    "2",
    outputName,
  ]);

  const fileData = await ffmpeg.readFile(outputName);
  const blob = new Blob([fileData.buffer], { type: "image/jpeg" });

  return new File([blob], "thumbnail.jpg", { type: "image/jpeg" });
}
