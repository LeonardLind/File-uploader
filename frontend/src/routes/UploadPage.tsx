import { useEffect, useMemo, useState } from "react";
import { useImageStore } from "../state/useImageStore";
import { FileDropzone } from "../components/FileDropzone";
import backgroundImage from "../assets/forst.png";

export function UploadPage() {
  const { images, updateImage } = useImageStore();
  const [uploadedFiles, setUploadedFiles] = useState<
    { id: string; name: string; progress: number; done: boolean; uploading?: boolean }[]
  >([]);
  const [uploadingAll, setUploadingAll] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL;
  const BUCKET = import.meta.env.VITE_AWS_BUCKET;

  const unsaved = useMemo(() => images.filter((img) => !img.saved), [images]);

  function getFileNameFromImage(img: { file?: File | undefined; id: string }) {
    if (img.file && img.file.name) return img.file.name;
    return `capture_${img.id.slice(0, 6)}.mp4`;
  }

  useEffect(() => {
    const next = unsaved.map((img) => ({
      id: img.id,
      name: getFileNameFromImage(img),
      progress: img.progress ?? 0,
      done: Boolean(img.saved),
      uploading: Boolean(img.uploading),
    }));

    setUploadedFiles(next);
  }, [unsaved]);

  const total = uploadedFiles.length;
  const done = uploadedFiles.filter((f) => f.done).length;
  const hasUploads = total > 0;
  const anyUploading = useMemo(() => uploadedFiles.some((f) => f.uploading), [uploadedFiles]);

  async function uploadSingle(img: (typeof unsaved)[number]) {
    if (!img.file) return;
    try {
      updateImage(img.id, { uploading: true, progress: 0 });

      const presignRes = await fetch(`${API_URL}/api/upload/presign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: img.file.name,
          contentType: img.file.type || "application/octet-stream",
        }),
      });

      const { uploadUrl, key } = await presignRes.json();
      if (!uploadUrl || !key) throw new Error("Missing upload URL");

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", img.file!.type || "application/octet-stream");
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            updateImage(img.id, { progress: pct });
          }
        };
        xhr.onload = () => {
          if (xhr.status < 300) resolve();
          else reject(new Error(`Upload failed (${xhr.status})`));
        };
        xhr.onerror = () => reject(new Error("Network error"));
        xhr.send(img.file);
      });

      // Persist metadata so gallery can list the file
      await fetch(`${API_URL}/api/upload/metadata`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId: key, // S3 key returned from presign
          filename: img.file.name,
          // Optional fields left empty for now; they can be edited later in Gallery
          species: img.species,
          plot: img.plot,
          experiencePoint: img.experiencePoint,
          sensorId: img.sensorId,
          deploymentId: img.deploymentId,
          thumbnailId: undefined,
        }),
      });

      updateImage(img.id, {
        uploading: false,
        progress: 100,
        saved: true,
        deploymentId: img.deploymentId,
        sensorId: img.sensorId,
      });
    } catch (err) {
      console.error("Upload error", err);
      updateImage(img.id, { uploading: false });
      alert(`Upload failed for ${img.file?.name ?? img.id}`);
    }
  }

  async function handleUploadAll() {
    if (!unsaved.length) return;
    setUploadingAll(true);
    for (const img of unsaved) {
      await uploadSingle(img);
    }
    setUploadingAll(false);
  }

  return (
    <div
      className="relative min-h-screen w-full bg-cover bg-center flex flex-col text-white"
      style={{ backgroundImage: `url(${backgroundImage})` }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px]" />

      {/* MAIN */}
      <main
        className="
          relative z-10 flex flex-col flex-1 items-center w-full
          px-6 sm:px-8
          pt-32 md:pt-15 lg:pt-40
          pb-12 md:pb-16
          overflow-y-auto custom-scroll
        "
      >
        <div className="w-full max-w-5xl flex flex-col items-center text-center">

          {/* TITLE */}
          {!hasUploads && (
            <header className="mb-8 sm:mb-10 transition-opacity duration-300">
              <h1 className="text-2xl sm:text-3xl font-semibold mb-2 sm:mb-3">
                Upload Camera Trap Videos
              </h1>
              <p className="text-slate-300 text-xs sm:text-sm px-3">Drop your SD card here. We’ll upload directly.</p>
            </header>
          )}

          {/* DROPZONE */}
          <div
            className={`
              w-full max-w-2xl transition-all duration-500
              ${hasUploads ? "mb-6 sm:mb-8" : "mb-10 sm:mb-12"}
            `}
          >
            <FileDropzone compact={hasUploads} />
          </div>

          {/* FILE LIST + FOOTER */}
          {hasUploads && (
            <section className="w-full max-w-2xl">

              {/* LIST SCROLL HEIGHT RESPONSIVE */}
              <ul
                className="
                  space-y-1
                  max-h-[32vh] sm:max-h-[36vh] md:max-h-[24vh] lg:max-h-[42vh]
                  overflow-y-auto pr-2 custom-scroll
                "
              >
                {uploadedFiles.map((file) => (
                  <li
                    key={file.id}
                    className="bg-neutral-800/90 rounded-lg p-3 sm:p-2 flex flex-col gap-1"
                  >
                    <div className="flex items-start justify-between text-xs sm:text-sm">
                      <div className="text-white font-medium truncate max-w-[70%]">
                        {file.name}
                      </div>

                      <div className="flex items-center gap-2 text-[10px] sm:text-xs text-slate-300 whitespace-nowrap">
                        <span className="text-lime-400 font-semibold">Staged</span>
                        <span className="inline-block h-4 w-4 rounded-full bg-lime-400 text-neutral-900 text-[10px] font-bold leading-4 text-center">
                          ✓
                        </span>
                      </div>
                    </div>

                    <div className="w-full h-2 bg-slate-700/50 rounded-md overflow-hidden">
                      <div
                        className="h-full bg-lime-400 transition-all duration-300"
                        style={{ width: `${file.progress ?? 0}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>

              {/* FOOTER ALWAYS VISIBLE */}
              <div
                className="
                  mt-4 sm:mt-6
                  py-3 sm:py-4 px-1
                  flex items-center justify-between text-xs sm:text-sm
                "
              >
                <div className="text-slate-300">
                  <span className="text-white font-semibold">
                    {done}/{total}
                  </span>{" "}
                  files
                </div>

                <button
                  onClick={handleUploadAll}
                  disabled={!unsaved.length || anyUploading || uploadingAll}
                  className="
                    bg-lime-400 text-neutral-900 font-semibold rounded-md
                    px-3 py-2
                    hover:bg-lime-300 transition text-xs sm:text-sm
                    disabled:opacity-50 disabled:cursor-not-allowed
                  "
                >
                  {anyUploading || uploadingAll ? "Uploading..." : "Upload to AWS"}
                </button>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
