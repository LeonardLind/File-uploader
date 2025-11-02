import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useImageStore } from "../state/useImageStore";

type FileDropzoneProps = {
  compact?: boolean;
};

export function FileDropzone({ compact = false }: FileDropzoneProps) {
  const { addFiles } = useImageStore();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      setIsUploading(true);
      setIsDone(false);
      setUploadProgress(0);

      for (let i = 0; i < acceptedFiles.length; i++) {
        const file = acceptedFiles[i];
        const formData = new FormData();
        formData.append("file", file);

        try {
          const res = await fetch("http://localhost:3000/upload", {
            method: "POST",
            body: formData,
          });

          if (!res.ok) throw new Error("Upload failed");

          // simulate upload progress for smooth animation
          setUploadProgress(Math.round(((i + 1) / acceptedFiles.length) * 100));

          // add to local state
          addFiles([file]);
        } catch (err) {
          console.error("Upload error:", err);
        }
      }

      // mark as done after a small delay
      setTimeout(() => {
        setIsUploading(false);
        setIsDone(true);
      }, 500);
    },
    [addFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    accept: { "image/*": [] },
  });

  const showProgress = isUploading || isDone;

  return (
    <div
      {...getRootProps()}
      className={`relative w-full flex flex-col items-center justify-center rounded-2xl border-4 border-dashed transition-all duration-700 ease-in-out cursor-pointer text-center backdrop-blur-sm
        ${compact ? "h-48" : isUploading ? "h-56" : "h-[50vh]"}
        ${
          isDragActive
            ? "border-lime-400 bg-white/20 scale-[1.01]"
            : "border-white/70 bg-white/5 hover:bg-white/10 hover:border-lime-300"
        }`}
    >
      <input {...getInputProps()} />

      {/* CONTENT */}
      <div className="flex flex-col items-center justify-center gap-3 px-6 transition-all duration-700 ease-in-out">
        {!showProgress ? (
          <p
            className={`font-semibold text-white/90 select-none ${
              compact ? "text-lg sm:text-base" : "text-2xl sm:text-xl"
            }`}
          >
            {isDragActive
              ? "Drop files here..."
              : "Drop files or open folder to upload"}
          </p>
        ) : (
          <div className="w-3/4 max-w-md">
            <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full transition-all duration-700 ease-out ${
                  isDone ? "bg-lime-400" : "bg-lime-300"
                }`}
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <p className="mt-3 text-white/80 text-sm font-medium">
              {isDone
                ? "✅ Upload complete!"
                : `Uploading... ${uploadProgress}%`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
