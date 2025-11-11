import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useImageStore } from "../state/useImageStore";
import { getFFmpeg } from "../utils/ffmpegSingleton";

type FileDropzoneProps = {
  compact?: boolean;
};

// You can expand this to include more formats like mov/mkv
const isAvi = (file: File) =>
  file.type === "video/x-msvideo" || /\.avi$/i.test(file.name);

export function FileDropzone({ compact = false }: FileDropzoneProps) {
  const { addFiles } = useImageStore();
  const [isWorking, setIsWorking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState<string | null>(null);

  // 🎬 Convert AVI to MP4 using FFmpeg WASM (class-based API)
  const convertAviToMp4 = useCallback(async (file: File): Promise<File> => {
    setStatusText("Preparing converter…");
    setProgress(0);

    const ffmpeg = await getFFmpeg();

    setStatusText("Converting to MP4…");

    const inputName = file.name;
    const outputName = inputName.replace(/\.avi$/i, ".mp4");

    // Write AVI file to FFmpeg’s in-memory filesystem
    const data = new Uint8Array(await file.arrayBuffer());
    await ffmpeg.writeFile(inputName, data);

    // Track progress
    ffmpeg.on("progress", ({ progress }: { progress: number }) => {
      setProgress(Math.round(progress * 100));
    });

    // Run the actual conversion
    await ffmpeg.exec([
      "-i", inputName,
      "-c:v", "libx264",
      "-preset", "veryfast",
      "-movflags", "+faststart",
      "-c:a", "aac",
      outputName,
    ]);

    // Read back the result
    const result = await ffmpeg.readFile(outputName);
    const blob = new Blob([result.buffer], { type: "video/mp4" });
    const converted = new File([blob], outputName, { type: "video/mp4" });

    // 🧹 Clean up memory inside FFmpeg
    await ffmpeg.deleteFile(inputName);
    await ffmpeg.deleteFile(outputName);

    return converted;
  }, []);

  // 📂 Handle file drop
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (!acceptedFiles.length) return;
      setIsWorking(true);
      setStatusText(null);
      setProgress(0);

      try {
        const staged: File[] = [];
        for (const file of acceptedFiles) {
          if (isAvi(file)) {
            setStatusText(`Converting ${file.name}…`);
            const mp4 = await convertAviToMp4(file);
            staged.push(mp4);
          } else {
            staged.push(file);
          }
        }

        addFiles(staged);
        setProgress(100);
        setStatusText("Ready for metadata ✅");
      } catch (err) {
        console.error("Conversion error:", err);
        setStatusText("Conversion failed ❌");
      } finally {
        setTimeout(() => setIsWorking(false), 1200);
      }
    },
    [addFiles, convertAviToMp4]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    accept: { "video/*": [], "image/*": [] },
  });

  return (
    <div
      {...getRootProps()}
      className={`relative w-full flex flex-col items-center justify-center rounded-2xl border-4 border-dashed cursor-pointer transition-all
        ${compact ? "h-48" : isWorking ? "h-56" : "h-[50vh]"}
        ${
          isDragActive
            ? "border-lime-400 bg-white/20 scale-[1.01]"
            : "border-white/70 bg-white/5 hover:bg-white/10 hover:border-lime-300"
        }`}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center justify-center gap-3 px-6">
        {!isWorking ? (
          <>
            <p
              className={`font-semibold text-white/90 ${
                compact ? "text-lg sm:text-base" : "text-2xl sm:text-xl"
              }`}
            >
              {isDragActive
                ? "Drop files here…"
                : "Drop files or open folder to select"}
            </p>
            <p className="text-slate-400 text-sm">
              AVI files will be converted to MP4 automatically.
            </p>
          </>
        ) : (
          <div className="w-3/4 max-w-md">
            <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
              <div
                className="h-full bg-lime-400 transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-3 text-white/80 text-sm font-medium">
              {statusText || `Working… ${progress}%`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
