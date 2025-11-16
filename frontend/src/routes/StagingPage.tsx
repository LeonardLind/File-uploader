// src/routes/StagingPage.tsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useImageStore } from "../state/useImageStore";
import { MetadataForm } from "../components/MetadataForm";

import { getMetadataList } from "../app/services/api/galleryApi";
import { deleteFile } from "../app/services/api/uploadApi";
import { BUCKET_NAME } from "../app/services/config/env";
import type { MetadataItem } from "../types/media";

/**
 * Type guard to detect existing metadata entries (edit mode).
 */
function isExisting(item: any): item is MetadataItem {
  return item && typeof item.fileId === "string";
}

export function StagingPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const { images, removeImage } = useImageStore();

  // Query parameter "ids" is used when editing existing videos from gallery
  const query = new URLSearchParams(location.search);
  const editIds = (query.get("ids") || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  const [existingVideos, setExistingVideos] = useState<MetadataItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const editMode = editIds.length > 0;

  // Pending (not yet registered) videos
  const pending = useMemo(
    () => images.filter((img) => !img.saved),
    [images]
  );

  // Registered videos in the right sidebar
  const registered = useMemo(
    () =>
      images
        .filter((img) => img.saved)
        .sort((a, b) => Number(b.uploading) - Number(a.uploading)),
    [images]
  );

  /**
   * Load existing metadata entries when in edit mode.
   */
  useEffect(() => {
    if (!editMode) return;

    async function loadExisting() {
      try {
        const all = await getMetadataList();
        const matches = all.filter((item) => editIds.includes(item.fileId));
        setExistingVideos(matches);
        if (matches.length > 0) {
          setSelectedId(matches[0].fileId);
        }
      } catch (err) {
        console.error("Failed to load existing videos:", err);
      }
    }

    loadExisting();
  }, [editMode, editIds]);

  /**
   * When not in edit mode, ensure there is a selected pending item.
   */
  useEffect(() => {
    if (editMode) return;
    if (!selectedId && pending.length > 0) {
      setSelectedId(pending[0].id);
    }
  }, [editMode, pending, selectedId]);

  const selectedItem = useMemo(() => {
    if (!selectedId) return undefined;
    if (editMode) {
      return existingVideos.find((v) => v.fileId === selectedId);
    }
    return images.find((img) => img.id === selectedId);
  }, [selectedId, editMode, existingVideos, images]);

  /**
   * Deletes the currently selected item.
   * - Edit mode: remove from backend and local list.
   * - Upload mode: remove from local pending list only.
   */
  async function handleDeleteCurrent(id: string) {
    if (editMode) {
      const confirmed = window.confirm("Are you sure you want to delete this video?");
      if (!confirmed) return;

      try {
        await deleteFile(id);
        setExistingVideos((prev) => prev.filter((v) => v.fileId !== id));
        setSelectedId(() => {
          const remaining = existingVideos.filter((v) => v.fileId !== id);
          return remaining.length > 0 ? remaining[0].fileId : null;
        });
      } catch (err) {
        alert("Failed to delete file");
        console.error(err);
      }
    } else {
      removeImage(id);
      const remaining = pending.filter((img) => img.id !== id);
      setSelectedId(remaining.length > 0 ? remaining[0].id : null);
    }
  }

  function handleDone() {
    navigate("/gallery");
  }

  return (
    <div className="flex flex-col w-full h-full bg-neutral-900 text-white">
      <main className="flex flex-1 h-full bg-neutral-950">
        {/* LEFT SIDEBAR */}
        <aside className="flex flex-col w-[20rem] h-full bg-neutral-950 border-r border-slate-800 overflow-hidden">
          <div className="p-5 border-b border-slate-800 shrink-0">
            <h3 className="uppercase text-lg text-white">
              {editMode ? "Editing existing" : "Pending review"}
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 custom-scroll">
            <div className="flex flex-col items-center gap-3">
              {(editMode ? existingVideos : pending).length === 0 && (
                <p className="text-slate-500 text-xs text-center">No files</p>
              )}

              {(editMode ? existingVideos : pending).map((item) => {
                const key = isExisting(item) ? item.fileId : item.id;
                const active = selectedId === key;

                const videoSrc = isExisting(item)
                  ? item.thumbnailId && BUCKET_NAME
                    ? `https://${BUCKET_NAME}.s3.amazonaws.com/${item.thumbnailId}`
                    : BUCKET_NAME
                    ? `https://${BUCKET_NAME}.s3.amazonaws.com/${item.fileId}`
                    : ""
                  : item.previewUrl;

                return (
                  <button
                    key={key}
                    onClick={() => setSelectedId(key)}
                    className={`relative overflow-hidden rounded-md border transition-all w-[18rem] h-40 ${
                      active
                        ? "border-lime-400 bg-white/10"
                        : "border-transparent hover:scale-[1.02] hover:border-slate-600"
                    }`}
                  >
                    {videoSrc ? (
                      <video
                        src={videoSrc}
                        controls={false}
                        className="w-full h-full object-cover rounded-md"
                      />
                    ) : (
                      <div className="w-full h-full bg-neutral-800" />
                    )}

                    {isExisting(item) && (
                      <div className="absolute top-1 right-1 bg-yellow-400 text-black text-xs font-bold px-2 py-0.5 rounded">
                        Edit
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-5 border-t border-slate-800 flex justify-center items-center shrink-0">
            <span className="text-sm text-slate-400">
              {editMode
                ? `${existingVideos.length} videos to edit`
                : `${pending.length} pending`}
            </span>
          </div>
        </aside>

        {/* CENTER FORM */}
        <section className="flex-1 flex flex-col items-center overflow-y-auto py-10 px-8 custom-scroll">
          {selectedItem ? (
            <div className="flex flex-col items-center w-full">
              {/* Video preview */}
              <div className="bg-black rounded-md p-4 mb-10 shadow-md max-w-3xl w-full flex justify-center relative">
                {isExisting(selectedItem) ? (
                  <video
                    src={
                      BUCKET_NAME
                        ? `https://${BUCKET_NAME}.s3.amazonaws.com/${selectedItem.fileId}`
                        : ""
                    }
                    controls
                    className="rounded-md max-h-[400px] object-contain"
                  />
                ) : (
                  <video
                    src={selectedItem.previewUrl}
                    controls
                    className="rounded-md max-h-[400px] object-contain"
                  />
                )}
              </div>

              {/* Metadata form */}
              <MetadataForm
                file={
                  isExisting(selectedItem)
                    ? new File([], selectedItem.filename)
                    : selectedItem.file
                }
                defaultValues={{
                  species: selectedItem.species || "",
                  plot: selectedItem.plot,
                  experiencePoint: selectedItem.experiencePoint || "",
                  sensorId: selectedItem.sensorId || "",
                  deploymentId: selectedItem.deploymentId || "",
                  fileId: isExisting(selectedItem) ? selectedItem.fileId : undefined,
                }}
                editMode={isExisting(selectedItem)}
                onSave={(updated) => {
                  if (isExisting(selectedItem)) {
                    setExistingVideos((prev) =>
                      prev.map((item) =>
                        item.fileId === updated.fileId ? updated : item
                      )
                    );
                  }
                }}
                onDelete={() =>
                  handleDeleteCurrent(
                    isExisting(selectedItem) ? selectedItem.fileId : selectedItem.id
                  )
                }
              />
            </div>
          ) : (
            <p className="text-slate-400 mt-20 text-center">
              Select a file to begin {editMode ? "editing" : "adding"} metadata.
            </p>
          )}
        </section>

        {/* RIGHT SIDEBAR (registered uploads) */}
        {!editMode && (
          <aside className="flex flex-col w-[20rem] h-full bg-neutral-950 border-l border-slate-800 overflow-hidden">
            <div className="p-5 border-b border-slate-800 shrink-0">
              <h3 className="uppercase text-lg text-white">Registered</h3>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 custom-scroll">
              <div className="flex flex-col items-center gap-3">
                {registered.length === 0 && (
                  <p className="text-slate-500 text-xs text-center">None yet</p>
                )}

                {registered.map((img) => (
                  <div
                    key={img.id}
                    className="relative overflow-hidden rounded-md border border-transparent hover:border-slate-600 w-[18rem] h-40 transition-transform"
                  >
                    <video
                      src={img.previewUrl}
                      className="w-full h-full object-cover rounded-md"
                      controls={false}
                    />
                    {img.uploading && (
                      <div className="absolute bottom-0 left-0 w-full bg-slate-700 h-2">
                        <div
                          className="bg-lime-400 h-2 transition-all duration-300"
                          style={{ width: `${img.progress ?? 0}%` }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {registered.length > 0 && (
              <div className="p-5 border-t border-slate-800 flex justify-center shrink-0">
                <button
                  onClick={handleDone}
                  className="bg-lime-400 text-neutral-900 font-semibold rounded-md px-4 py-2 hover:bg-lime-300 transition"
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
