import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PendingUploadsProvider, usePendingUploads } from "../state/usePendingUploads";
import { FileDropzone } from "../components/FileDropzone";
import backgroundImage from "../assets/forst.png";
import { useToast } from "../components/ToastProvider";
import { createMetadata, presignUpload } from "../api/uploadApi";

type UploadedFile = {
  id: string;
  name: string;
  progress: number;
  done: boolean;
  uploading?: boolean;
};

function UploadPageContent() {
  const { videos, updateVideo } = usePendingUploads();
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const navigate = useNavigate();
  const { notify } = useToast();

  const API_URL = import.meta.env.VITE_API_URL;

  const unsaved = useMemo(() => videos.filter((video) => !video.saved), [videos]);

  function getFileNameFromVideo(video: { file?: File | undefined; id: string }) {
    if (video.file && video.file.name) return video.file.name;
    return `capture_${video.id.slice(0, 6)}.mp4`;
  }

  useEffect(() => {
    const next = videos.map((video) => ({
      id: video.id,
      name: getFileNameFromVideo(video),
      progress: video.progress ?? 0,
      done: Boolean(video.saved),
      uploading: Boolean(video.uploading),
    }));

    setUploadedFiles(next);
  }, [videos]);

  const total = uploadedFiles.length;
  const done = uploadedFiles.filter((f) => f.done).length;
  const hasUploads = total > 0;
  const hasReady = done > 0;
  const filesToRender = useMemo(() => {
    const orderMap = new Map(uploadedFiles.map((f, idx) => [f.id, idx]));
    return [...uploadedFiles].sort((a, b) => {
      if (a.done === b.done) {
        return (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0);
      }
      return a.done ? 1 : -1; // staged first, done later
    });
  }, [uploadedFiles]);

  // Upload one file to S3, then create its metadata row.
  async function uploadSingle(video: (typeof unsaved)[number]) {
    if (!video.file) return;
    try {
      updateVideo(video.id, { uploading: true, progress: 0 });
       // Step 1: ask backend for uploadUrl + key
      const { uploadUrl, key } = await presignUpload(API_URL, {
        filename: video.file.name,
        contentType: video.file.type || "application/octet-stream",
      });
      if (!uploadUrl || !key) throw new Error("Missing upload URL");
      // Step 2: upload to storage with progress updates
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", video.file!.type || "application/octet-stream");
        // Update progress bar
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            updateVideo(video.id, { progress: pct });
          }
        };
        xhr.onload = () => {
          if (xhr.status < 300) resolve();
          else reject(new Error(`Upload failed (${xhr.status})`));
        };
        xhr.onerror = () => reject(new Error("Network error"));
        xhr.send(video.file);
      });
      // Step 3: create metadata row immediately so app uploads show up right away.
      // The S3 Lambda is a safety net + handles external uploads.
      await createMetadata(API_URL, {
        fileId: key,
        filename: video.file.name,
        // For now: metadata not set here (all undefined)
        species: undefined,
        plot: undefined,
        experiencePoint: undefined,
        sensorId: undefined,
        deploymentId: undefined,
        thumbnailId: undefined,
        displayState: "Inactive",
        highlight: false,
      });

      updateVideo(video.id, {
        uploading: false,
        progress: 100,
        saved: true,
      });
      notify({
        title: "Upload complete",
        message: `${video.file.name} saved to Draft.`,
        tone: "success",
      });
    } catch (err) {
      console.error("Upload error", err);
      updateVideo(video.id, { uploading: false });
      notify({
        title: "Upload failed",
        message: `${video.file?.name ?? video.id}: ${err instanceof Error ? err.message : "Unable to upload."}`,
        tone: "error",
      });
    }
  }

  // Auto-upload any pending files.
  useEffect(() => {
    const pending = unsaved.filter((video) => !video.uploading && !video.saved);
    if (!pending.length) return;
    pending.forEach((video) => {
      void uploadSingle(video);
    });
  }, [unsaved]);

  return (
    <div
      className="relative min-h-screen w-full bg-cover bg-center flex flex-col text-white"
      style={{ backgroundImage: `url(${backgroundImage})` }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px]" />

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
          {!hasUploads && (
            <header className="mb-8 sm:mb-10 transition-opacity duration-300">
              <h1 className="text-2xl sm:text-3xl font-semibold mb-2 sm:mb-3">Upload Camera Trap Videos</h1>
              <p className="text-slate-300 text-xs sm:text-sm px-3">Drop your SD card here. We'll upload directly.</p>
            </header>
          )}

          <div
            className={`
              w-full max-w-2xl transition-all duration-500
              ${hasUploads ? "mb-6 sm:mb-8" : "mb-10 sm:mb-12"}
            `}
          >
            <FileDropzone compact={hasUploads} />
          </div>

          {hasUploads && (
            <section className="w-full max-w-2xl">
              <ul
                className="
                  space-y-1
                  max-h-[150px] sm:max-h-40 md:max-h-[170px] lg:max-h-[180px]
                  overflow-y-auto pr-2 custom-scroll
                "
              >
                {filesToRender.map((file) => (
                  <li key={file.id} className="bg-neutral-800/90 rounded-lg p-3 sm:p-2 flex flex-col gap-1">
                    <div className="flex items-start justify-between text-[11px] sm:text-xs">
                      <div className="text-white font-medium truncate max-w-[70%]">{file.name}</div>

                      <div className="flex items-center gap-2 text-[10px] sm:text-xs text-slate-300 whitespace-nowrap">
                        {file.done ? (
                          <span className="text-lime-400 font-semibold">Done</span>
                        ) : (
                          <span className="text-slate-300 font-semibold">Staged</span>
                        )}
                        <svg
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                          className="h-4 w-4"
                        >
                          <circle cx="12" cy="12" r="12" fill={file.done ? "#a3e635" : "#9CA3AF"} />
                          <path
                            d="M6 12.5l4 4 8-9"
                            fill="none"
                            stroke="#000000"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
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

              <div
                className="
                  mt-1 sm:mt-2
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

                <div className="flex items-center gap-2">
                  {hasReady && (
                    <button
                      onClick={() => navigate("/gallery?view=draft")}
                      className="px-3 py-2 text-xs sm:text-sm rounded-md border border-slate-700 text-white hover:border-lime-400 hover:text-white transition bg-neutral-800"
                    >
                      View in draft
                    </button>
                  )}
                </div>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

// Wrapper: gives UploadPageContent access to the pending uploads store
export function UploadPage() {
  return (
    <PendingUploadsProvider>
      <UploadPageContent />
    </PendingUploadsProvider>
  );
}
