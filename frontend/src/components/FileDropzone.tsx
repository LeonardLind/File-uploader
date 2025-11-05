import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useImageStore } from "../state/useImageStore";

type FileDropzoneProps = {
  compact?: boolean;
};

export function FileDropzone({ compact = false }: FileDropzoneProps) {
  const { addFiles } = useImageStore();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
  console.log("📁 Files dropped:", acceptedFiles);
  
  // Add to local store immediately for preview/staging
  addFiles(acceptedFiles); // ✅ Pass only File[]
  
  // (Optional) You can log or do validation here if needed
}, [addFiles]);


  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    accept: {
      "video/*": [],
      "image/*": [],
    },
  });

  return (
    <div
      {...getRootProps()}
      className={`relative w-full flex flex-col items-center justify-center rounded-2xl border-4 border-dashed transition-all duration-700 ease-in-out cursor-pointer text-center backdrop-blur-sm
        ${compact ? "h-48" : "h-[50vh]"}
        ${
          isDragActive
            ? "border-lime-400 bg-white/20 scale-[1.01]"
            : "border-white/70 bg-white/5 hover:bg-white/10 hover:border-lime-300"
        }`}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center justify-center gap-3 px-6 transition-all duration-700 ease-in-out">
        <p
          className={`font-semibold text-white/90 select-none ${
            compact ? "text-lg sm:text-base" : "text-2xl sm:text-xl"
          }`}
        >
          {isDragActive
            ? "Drop files here..."
            : "Drop files or open folder to select"}
        </p>
        <p className="text-slate-400 text-sm">
          Files will be staged locally — you can review before uploading to cloud.
        </p>
      </div>
    </div>
  );
}
