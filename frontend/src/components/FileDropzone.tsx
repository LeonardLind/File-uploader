import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useImageStore } from "../state/useImageStore";
import { getFFmpeg } from "../utils/ffmpegSingleton";

type FileDropzoneProps = {
  compact?: boolean;
};

const isAvi = (file: File) =>
  file.type === "video/x-msvideo" || /\.avi$/i.test(file.name);

export function FileDropzone({ compact = false }: FileDropzoneProps) {
  const { addFiles } = useImageStore();
  const [isWorking, setIsWorking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState<string | null>(null);

  const convertAviToMp4 = useCallback(async (file: File): Promise<File> => {
    setStatusText("Preparing converter…");

    const { ffmpeg, fetchFile } = await getFFmpeg();

    setStatusText("Converting to MP4…");
    setProgress(0);

    const inName = file.name;
    const outName = inName.replace(/\.avi$/i, ".mp4");

    ffmpeg.setProgress(({ ratio }: { ratio: number }) =>
      setProgress(Math.round(ratio * 100))
    );

    ffmpeg.FS("writeFile", inName, await fetchFile(file));
    await ffmpeg.run(
      "-i",
      inName,
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-movflags",
      "+faststart",
      "-c:a",
      "aac",
      outName
    );

    const data = ffmpeg.FS("readFile", outName);
    return new File([data.buffer], outName, { type: "video/mp4" });
  }, []);

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
        setStatusText("Ready for metadata");
      } catch (err) {
        console.error("Conversion error:", err);
        setStatusText("Failed");
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
