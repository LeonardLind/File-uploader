// src/components/upload/FileDropzone.tsx

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { convertAviToMp4 } from "../../lib/ffmpeg/convertAviToMp4";
import { useImageStore } from "../../state/useImageStore";

type FileDropzoneProps = {
  compact?: boolean;
};

export function FileDropzone({ compact = false }: FileDropzoneProps) {
  const { addFiles, updateImage } = useImageStore();

  const [localProgress, setLocalProgress] = useState<Record<string, number>>(
    {}
  );

  const isWorking = Object.values(localProgress).some(
    (v) => v < 1 && v >= 0
  );

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      for (const file of acceptedFiles) {
        const id = crypto.randomUUID();

        // Add placeholder file first
        addFiles([file]);

        let finalFile: File = file;

        if (file.name.toLowerCase().endsWith(".avi")) {
          finalFile = await convertAviToMp4(file, (ratio: number) => {
            setLocalProgress((prev) => ({ ...prev, [id]: ratio }));
            updateImage(id, { progress: ratio * 100 });
          });
        }

        setLocalProgress((prev) => ({ ...prev, [id]: 1 }));

        // Update the placeholder entry with the converted MP4 (if needed)
        updateImage(id, {
          file: finalFile,
          previewUrl: URL.createObjectURL(finalFile),
        });
      }
    },
    [addFiles, updateImage]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "video/*": [] },
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-xl text-center transition-all 
        ${compact ? "p-4" : "p-8"}
        ${isDragActive ? "border-lime-400 bg-lime-400/10" : "border-slate-600"}
      `}
    >
      <input {...getInputProps()} />

      {!isWorking && (
        <p className="text-slate-300">
          Drag and drop video files here, or click to select.
        </p>
      )}

      {isWorking && (
        <p className="text-lime-400">Processing video files…</p>
      )}
    </div>
  );
}
