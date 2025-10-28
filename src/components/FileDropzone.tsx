import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useImageStore } from "../state/useImageStore";

export function FileDropzone() {
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
      className={`cursor-pointer flex items-center justify-center rounded-2xl border-4 border-dashed ${
        isDragActive ? "border-lime-400 bg-white/30" : "border-white/80 bg-white/10"
      } transition-colors duration-200 backdrop-blur-sm text-center h-[50vh]`}
    >
      <input {...getInputProps()} />
      <p className="text-2xl font-semibold text-white/90 px-4">
        {isDragActive
          ? "Drop files here..."
          : "Drag files or folders here to upload"}
      </p>
    </div>
  );
}
