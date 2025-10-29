import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useImageStore } from "../state/useImageStore";

type FileDropzoneProps = {
  compact?: boolean;
};

export function FileDropzone({ compact = false }: FileDropzoneProps) {
  const { addFiles } = useImageStore();

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      addFiles(acceptedFiles);
    },
    [addFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    accept: { "image/*": [] },
  });

  return (
    <div
      {...getRootProps()}
      className={`relative w-full flex items-center justify-center rounded-2xl border-4 border-dashed transition-all duration-600 cursor-pointer text-center backdrop-blur-sm
        ${compact ? "h-48" : "h-[50vh]"}
        ${
          isDragActive
            ? "border-lime-400 bg-white/20 scale-[1.01]"
            : "border-white/70 bg-white/5 hover:bg-white/10 hover:border-lime-300"
        }`}
    >
      <input {...getInputProps()} />

      <div className="flex flex-col items-center justify-center gap-3 px-6">
        <p
          className={`font-semibold text-white/90 select-none ${
            compact ? "text-lg sm:text-base" : "text-2xl sm:text-xl"
          }`}
        >
          {isDragActive
            ? "Drop files here..."
            : "Drop files or open folder to upload"}
        </p>
      </div>
    </div>
  );
}
