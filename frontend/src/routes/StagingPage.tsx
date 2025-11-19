import "../index.css";
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useImageStore } from "../state/useImageStore";
import { MetadataForm } from "../components/MetadataForm";

type PendingImage = {
  id: string;
  file: File;
  previewUrl: string;
  previewImageUrl?: string;
  saved?: boolean;
  species?: string;
  plot?: string;
  experiencePoint?: string;
  sensorId?: string;
  deploymentId?: string;
  uploading?: boolean;
  progress?: number;
};

type ExistingVideo = {
  fileId: string;
  filename: string;
  species?: string;
  plot?: string;
  experiencePoint?: string;
  sensorId?: string;
  deploymentId?: string;
  thumbnailId?: string;
  previewUrl?: string;
};

function isExistingVideo(item: PendingImage | ExistingVideo): item is ExistingVideo {
  return "fileId" in item;
}

function isPendingImage(item: PendingImage | ExistingVideo): item is PendingImage {
  return "id" in item && "file" in item;
}

/* ─────────────────────────────────────────────── */
/* Thumbnail (desktop, simple breakpoints)         */
/* ─────────────────────────────────────────────── */

const Thumbnail = React.memo(function Thumbnail({
  src,
  highlight,
  children,
}: {
  src: string;
  highlight?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-md bg-[#141416] border transition-all
        w-40 h-24 md:w-48 md:h-28 lg:w-56 lg:h-32
        ${highlight ? "border-lime-400" : "border-[#2a2b2e] hover:border-lime-400/40"}`}
    >
      <img src={src} className="w-full h-full object-cover rounded-md" draggable={false} />
      {children}
    </div>
  );
});

/* ─────────────────────────────────────────────── */
/* Main Component                                  */
/* ─────────────────────────────────────────────── */

export function StagingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { images, updateImage, removeImage } = useImageStore();

  const editIds = useMemo(() => {
    const q = new URLSearchParams(location.search);
    return q.get("ids")?.split(",") ?? [];
  }, [location.search]);

  const [existingVideos, setExistingVideos] = useState<ExistingVideo[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);

  const uploaded = images.filter((img) => !img.saved);
  const registered = images
    .filter((img) => img.saved)
    .sort((a, b) => Number(b.uploading) - Number(a.uploading));

  const API_URL = import.meta.env.VITE_API_URL;
  const BUCKET = import.meta.env.VITE_AWS_BUCKET;

  /* LOAD EXISTING VIDEOS (for edit mode) */
  useEffect(() => {
    if (editIds.length === 0) return;

    setEditMode(true);
    if (existingVideos.length > 0) return;

    async function load() {
      try {
        const res = await fetch(`${API_URL}/api/upload/metadata`);
        const data = await res.json();
        if (!data.success) throw new Error(data.error);

        const matches: ExistingVideo[] = data.items.filter((f: ExistingVideo) =>
          editIds.includes(f.fileId)
        );

        setExistingVideos(matches);
        if (matches.length > 0) setSelectedId(matches[0].fileId);
      } catch (err) {
        console.error("Failed loading existing videos", err);
      }
    }

    load();
  }, [editIds, existingVideos.length, API_URL]);

  /* AUTO SELECT FIRST PENDING (upload mode) */
  useEffect(() => {
    if (!editMode && uploaded.length > 0 && !selectedId) {
      setSelectedId(uploaded[0].id);
    }
  }, [uploaded, editMode, selectedId]);

  const selectedImage: PendingImage | ExistingVideo | undefined = editMode
    ? existingVideos.find((f) => f.fileId === selectedId)
    : images.find((img) => img.id === selectedId);

  /* SAVE HANDLER */
  async function handleSave(savedData: any) {
    if (!selectedImage) return;

    if (isExistingVideo(selectedImage)) {
      try {
        const res = await fetch(`${API_URL}/api/upload/metadata/update`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileId: selectedImage.fileId,
            ...savedData,
          }),
        });

        const result = await res.json();
        if (!result.success) throw new Error(result.error);

        setExistingVideos((prev) =>
          prev.map((f) =>
            f.fileId === selectedImage.fileId ? { ...f, ...savedData } : f
          )
        );
      } catch {
        alert("Failed to update metadata");
      }
      return;
    }

    if (isPendingImage(selectedImage)) {
      updateImage(selectedImage.id, { ...savedData, saved: true });

      const remaining = images.filter(
        (img) => !img.saved && img.id !== selectedImage.id
      );

      setSelectedId(remaining.length > 0 ? remaining[0].id : null);
    }
  }

  /* DELETE HANDLER */
  async function handleDeleteCurrent(id: string) {
    if (editMode) {
      if (!confirm("Delete this video?")) return;

      try {
        await fetch(`${API_URL}/api/upload/delete`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileId: id }),
        });

        setExistingVideos((prev) => prev.filter((v) => v.fileId !== id));
        setSelectedId(null);
      } catch {
        alert("Delete failed");
      }

      return;
    }

    removeImage(id);
    const remaining = images.filter((img) => !img.saved && img.id !== id);
    setSelectedId(remaining.length > 0 ? remaining[0].id : null);
  }

  function handleDone() {
    navigate("/gallery");
  }

  const canShowLeft = editMode ? existingVideos.length > 0 : uploaded.length > 0;
  const canShowRight = !editMode && registered.length > 0;

  /* ─────────────────────────────────────────────── */
  /* RENDER                                         */
  /* ─────────────────────────────────────────────── */

  return (
    <div className="flex flex-col w-full h-full bg-[#0f0f10] text-white overflow-hidden">
      <main className="relative flex-1 h-full flex flex-row">
        {/* LEFT SIDEBAR (Pending / Editing) */}
        <aside className="w-52 md:w-60 lg:w-64 h-full bg-[#1a1b1e] border-r border-[#2a2b2e] flex flex-col">
  <div className="p-4 border-b border-[#2a2b2e] bg-[#1a1b1e]">
    <h3 className="text-sm font-semibold text-gray-300 tracking-wide">
      {editMode ? "Editing" : "Pending"}
    </h3>
  </div>

  <div className="flex-1 overflow-y-auto p-4 custom-scroll bg-[#141416]">
    <div className="flex flex-col items-center gap-4">
      {!canShowLeft && (
        <p className="text-gray-500 text-xs text-center">No files</p>
      )}

      {(editMode ? existingVideos : uploaded).map((vid) => {
        const isOld = isExistingVideo(vid);
        const id = isOld ? vid.fileId : vid.id;

        const thumbSrc = isOld
          ? vid.thumbnailId
            ? `https://${BUCKET}.s3.amazonaws.com/${vid.thumbnailId}`
            : `https://${BUCKET}.s3.amazonaws.com/${vid.fileId}`
          : vid.previewImageUrl || vid.previewUrl;

        return (
          <div
            key={id}
            onClick={() => setSelectedId(id)}
            className="cursor-pointer"
          >
            <Thumbnail src={thumbSrc} highlight={selectedId === id}>
              {isOld && (
                <div className="absolute top-1 right-1 bg-lime-400 text-black text-xs font-bold px-2 py-1 rounded">
                  Edit
                </div>
              )}
            </Thumbnail>
          </div>
        );
      })}
    </div>
  </div>

  <div className="p-3 border-t border-[#2a2b2e] bg-[#1a1b1e] flex justify-center">
    <span className="text-gray-400 text-xs">
      {editMode
        ? `${existingVideos.length} items`
        : `${uploaded.length} pending`}
    </span>
  </div>
</aside>


        {/* MAIN CONTENT AREA */}
        <section className="flex-1 flex flex-col items-center overflow-y-auto py-15 px-4 md:px-6 lg:px-8 custom-scroll bg-[#0f0f10]">
          {selectedImage ? (
            <div className="flex flex-col items-center w-full max-w-3xl gap-6">
              {/* VIDEO PREVIEW CARD */}
              <div className="rounded-lg border border-[#2a2b2e] w-full overflow-hidden max-w-3xl bg-black">
                <video
                  src={
                    isExistingVideo(selectedImage)
                      ? selectedImage.previewUrl ||
                        `https://${BUCKET}.s3.amazonaws.com/${selectedImage.fileId}`
                      : selectedImage.previewUrl
                  }
                  controls
                  className="w-full h-full"
                />
              </div>

              {/* METADATA FORM */}
              <MetadataForm
                file={
                  isExistingVideo(selectedImage)
                    ? new File([], selectedImage.filename)
                    : selectedImage.file
                }
                defaultValues={{
                  species: selectedImage.species || "",
                  plot: selectedImage.plot,
                  experiencePoint: selectedImage.experiencePoint || "",
                  sensorId: selectedImage.sensorId || "",
                  deploymentId: selectedImage.deploymentId || "",
                  fileId: isExistingVideo(selectedImage)
                    ? selectedImage.fileId
                    : "",
                }}
                onSave={handleSave}
                onDelete={() =>
                  handleDeleteCurrent(
                    isExistingVideo(selectedImage)
                      ? selectedImage.fileId
                      : selectedImage.id
                  )
                }
                editMode={isExistingVideo(selectedImage)}
              />
            </div>
          ) : (
            <p className="text-gray-500 mt-20 text-center text-sm md:text-base">
              Select a file to begin{" "}
              {editMode ? "editing" : "adding"} metadata
            </p>
          )}
        </section>

        {/* RIGHT SIDEBAR (Registered) */}
        {!editMode && (
          <aside className="w-52 md:w-60 lg:w-64 h-full bg-[#1a1b1e] border-r border-[#2a2b2e] flex flex-col">
            <div className="p-4 border-b border-[#2a2b2e] bg-[#1a1b1e]">
              <h3 className="uppercase text-sm font-semibold text-gray-300 tracking-wide">
                Registered
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scroll bg-[#141416]">
              <div className="flex flex-col items-center gap-4">
                {!canShowRight && (
                  <p className="text-gray-500 text-xs">None yet</p>
                )}

                {registered.map((img) => (
                  <Thumbnail
                    key={img.id}
                    src={img.previewImageUrl || img.previewUrl}
                  >
                    {img.uploading && (
                      <div className="absolute bottom-0 left-0 w-full bg-[#1a1b1e] h-2">
                        <div
                          className="bg-lime-400 h-2 transition-all duration-300"
                          style={{ width: `${img.progress ?? 0}%` }}
                        />
                      </div>
                    )}
                  </Thumbnail>
                ))}
              </div>
            </div>

            {registered.length > 0 && (
              <div className="p-3 border-t border-[#2a2b2e] bg-[#1a1b1e] flex justify-center">
                <button
                  onClick={handleDone}
                  className="bg-lime-400 text-black font-semibold px-5 py-2 rounded-md hover:bg-lime-300 transition cursor-pointer"
                >
                  Done
                </button>
              </div>
            )}
          </aside>
        )}
      </main>
    </div>
  );
}
