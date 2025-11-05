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

  const API_URL = import.meta.env.VITE_API_URL;

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setIsUploading(true);
      setIsDone(false);

      for (const file of acceptedFiles) {
        try {
          // 1️⃣ Request pre-signed URL from backend
          const res = await fetch(`${API_URL}/api/upload/presign`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              filename: file.name,
              contentType: file.type,
            }),
          });

          if (!res.ok) throw new Error("Failed to get presigned URL");
          const { uploadUrl, key } = await res.json();

          // 2️⃣ Upload file directly to S3
          await fetch(uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": file.type },
            body: file,
          });

          console.log("✅ Uploaded to S3:", key);

          // Optional: update local store for UI preview
          addFiles([file]);

          // Simulate progress (optional)
          for (let p = 0; p <= 100; p += 20) {
            setUploadProgress(p);
            await new Promise((r) => setTimeout(r, 50));
          }
        } catch (err) {
          console.error("❌ Upload failed:", err);
        }
      }

      setIsUploading(false);
      setIsDone(true);
    },
    [API_URL, addFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    accept: {
      "video/*": [],
      "image/*": [],
    },
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
