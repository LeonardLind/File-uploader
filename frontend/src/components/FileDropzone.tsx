import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { usePendingUploads } from "../state/usePendingUploads";
import { getFFmpeg } from "../utils/ffmpegSingleton";

type FileDropzoneProps = {
  compact?: boolean;
};

// Check if file is AVI (by mime type or file name)
const isAvi = (file: File) =>
  file.type === "video/x-msvideo" || /\.avi$/i.test(file.name);

type ProcessingFile = {
  id: string;
  name: string;
  progress: number; // 0–100
  status: "pending" | "converting" | "done" | "error";
};

export function FileDropzone({ compact = false }: FileDropzoneProps) {
  const { addFiles } = usePendingUploads();
  const [processing, setProcessing] = useState<ProcessingFile[]>([]);
  const [isWorking, setIsWorking] = useState(false);

  // Convert AVI to MP4 asynchronously (parallel-safe)
  const convertAviToMp4 = useCallback(
    async (file: File) => {
      const id = crypto.randomUUID();
      const name = file.name;

      setIsWorking(true);
      setProcessing((prev) => [
        ...prev,
        { id, name, progress: 0, status: "converting" },
      ]);

      try {
         // Get a fresh FFmpeg instance (heavy tool used to convert video)
        const ffmpeg = await getFFmpeg(true);
        // Names inside FFmpeg “virtual file system”
        const inputName = file.name;
        const outputName = inputName.replace(/\.avi$/i, ".mp4");
        // Put the file bytes into FFmpeg memory
        const data = new Uint8Array(await file.arrayBuffer());
        await ffmpeg.writeFile(inputName, data);
        // Listen for FFmpeg progress and update progress bar
        ffmpeg.on("progress", ({ progress }: { progress: number }) => {
          setProcessing((prev) =>
            prev.map((p) =>
              p.id === id ? { ...p, progress: Math.round(progress * 100) } : p
            )
          );
        });

        // Run the FFmpeg convert command (AVI -> MP4)
        await ffmpeg.exec([
          "-i",
          inputName,
          "-c:v",
          "libx264",
          "-preset",
          "veryfast",
          "-movflags",
          "+faststart",
          "-c:a",
          "aac",
          outputName,
        ]);
        // Read the result MP4 back from FFmpeg memory
        const result = await ffmpeg.readFile(outputName);
        // Turn it into a real browser File object
        const blob = new Blob([result.buffer], { type: "video/mp4" });
        const converted = new File([blob], outputName, { type: "video/mp4" });
        // Clean up FFmpeg memory files
        await ffmpeg.deleteFile(inputName);
        await ffmpeg.deleteFile(outputName);

        setProcessing((prev) =>
          prev.map((p) =>
            p.id === id ? { ...p, progress: 100, status: "done" } : p
          )
        );
        addFiles([converted]);

        setTimeout(() => {
          setProcessing((prev) => {
            const next = prev.filter((p) => p.id !== id);
            const stillWorking = next.some(
              (p) => p.status !== "done" && p.status !== "error"
            );
            setIsWorking(stillWorking);
            return next;
          });
        }, 1200);
      } catch (err) {
        console.error("Conversion error:", err);
        setProcessing((prev) => {
          const next: ProcessingFile[] = prev.map((p) =>
            p.id === id ? { ...p, status: "error" as const } : p
          );
          const anyOthers = next.some(
            (p) => p.id !== id && p.status !== "done" && p.status !== "error"
          );
          setIsWorking(anyOthers);
          return next;
        });
      }
    },
    [addFiles]
  );


  // Split normal files vs AVI, then process each group.
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (!acceptedFiles.length) return;

      const normalFiles = acceptedFiles.filter((f) => !isAvi(f));
      const aviFiles = acceptedFiles.filter(isAvi);

      if (aviFiles.length > 0) {
        setIsWorking(true);
      }

      if (normalFiles.length) {
        addFiles(normalFiles);
      }

      aviFiles.forEach((avi) => {
        convertAviToMp4(avi);
      });

      if (aviFiles.length === 0) {
        setIsWorking(false);
      }
    },
    [addFiles, convertAviToMp4]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    accept: { "video/*": [] },
  });

  return (
    <div className="w-full flex flex-col items-center">
      <div
        {...getRootProps()}
        className={`relative w-full flex flex-col items-center justify-center rounded-2xl border-4 border-dashed cursor-pointer transition-all
          ${
            compact
              ? "h-48"
              : isWorking
              ? "h-56"
              : "h-[50vh]" 
          }
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
            <p className="text-white/80 text-sm font-medium">
              Preparing or converting files...
            </p>
          )}
        </div>
      </div>

      {processing.length > 0 && (
        <div className="w-full mt-6 bg-neutral-900 border border-slate-800 rounded-lg p-4">
          <h2 className="text-slate-300 font-medium mb-3">
            Converting files…
          </h2>
          <div className="flex flex-col gap-3">
            {processing.map((p) => (
              <div
                key={p.id}
                className="flex flex-col bg-neutral-800 rounded-md p-3"
              >
                <div className="flex justify-between text-sm text-slate-300">
                  <span className="truncate">{p.name}</span>
                  <span>
                    {p.status === "error" ? "Error" : `${p.progress}%`}
                  </span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2 mt-2 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      p.status === "error" ? "bg-red-500" : "bg-lime-400"
                    }`}
                    style={{ width: `${p.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
