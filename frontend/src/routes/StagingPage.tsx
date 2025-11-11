// src/pages/StagingPage.tsx
import "../index.css";
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useImageStore } from "../state/useImageStore";
import { MetadataForm } from "../components/MetadataForm";

type PendingImage = {
  id: string;
  file: File;
  previewUrl: string;
  saved?: boolean;
  species?: string;
  plot?: string;
  experiencePoint?: string;
  sensorId?: string;
  deploymentId?: string;
};

type ExistingVideo = {
  fileId: string;
  filename: string;
  species?: string;
  plot?: string;
  experiencePoint?: string;
  sensorId?: string;
  deploymentId?: string;
  previewUrl?: string;
};

function isExistingVideo(item: any): item is ExistingVideo {
  return "fileId" in item;
}

function isPendingImage(item: any): item is PendingImage {
  return "id" in item && "file" in item;
}

export function StagingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { images, updateImage, removeImage } = useImageStore();

  const query = new URLSearchParams(location.search);
  const editIds = query.get("ids")?.split(",") ?? [];

  const [existingVideos, setExistingVideos] = useState<ExistingVideo[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);

  const uploaded = images.filter((img) => !img.saved);
  const registered = images.filter((img) => img.saved);
  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    if (editIds.length > 0) {
      setEditMode(true);
      fetchExistingVideos();
    } else if (uploaded.length > 0 && !selectedId) {
      setSelectedId(uploaded[0].id);
    }
  }, [editIds]);

  async function fetchExistingVideos() {
    try {
      const res = await fetch(`${API_URL}/api/upload/metadata`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      const matches = data.items.filter((f: any) => editIds.includes(f.fileId));
      setExistingVideos(matches);
      if (matches.length > 0) setSelectedId(matches[0].fileId);
    } catch (err) {
      console.error("❌ Failed to load existing videos:", err);
    }
  }

  const selectedImage: PendingImage | ExistingVideo | undefined = editMode
    ? existingVideos.find((f) => f.fileId === selectedId)
    : images.find((img) => img.id === selectedId);

  async function handleSave(savedData: any) {
    if (!selectedImage) return;

    if (isExistingVideo(selectedImage)) {
      // ✅ EDIT MODE
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
        alert("✅ Metadata updated successfully!");
      } catch (err) {
        alert("❌ Failed to update metadata");
        console.error(err);
      }
    } else if (isPendingImage(selectedImage)) {
      // ✅ NORMAL MODE
      updateImage(selectedImage.id, { ...savedData, saved: true });
      const remaining = uploaded.filter((img) => img.id !== selectedImage.id);
      setSelectedId(remaining.length > 0 ? remaining[0].id : null);
    }
  }

  async function handleDeleteCurrent(id: string) {
    if (editMode) {
      if (!confirm("Are you sure you want to delete this video and its metadata?")) return;
      try {
        await fetch(`${API_URL}/api/upload/delete`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileId: id }),
        });
        setExistingVideos((prev) => prev.filter((v) => v.fileId !== id));
        setSelectedId(null);
      } catch {
        alert("❌ Failed to delete file");
      }
    } else {
      removeImage(id);
      const remaining = uploaded.filter((img) => img.id !== id);
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
              {editMode ? "Editing Existing" : "Pending Review"}
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 custom-scroll">
            <div className="flex flex-col items-center gap-3">
              {(editMode ? existingVideos : uploaded).length === 0 && (
                <p className="text-slate-500 text-xs text-center">No files</p>
              )}

              {(editMode ? existingVideos : uploaded).map((vid) => (
                <button
                  key={isExistingVideo(vid) ? vid.fileId : vid.id}
                  onClick={() =>
                    setSelectedId(isExistingVideo(vid) ? vid.fileId : vid.id)
                  }
                  className={`relative overflow-hidden rounded-md border transition-all w-[18rem] h-40 ${
                    selectedId === (isExistingVideo(vid) ? vid.fileId : vid.id)
                      ? "border-lime-400 bg-white/10"
                      : "border-transparent hover:scale-[1.02] hover:border-slate-600"
                  }`}
                >
                  <video
                    src={
                      isExistingVideo(vid)
                        ? vid.previewUrl ||
                          `https://${import.meta.env.VITE_AWS_BUCKET}.s3.amazonaws.com/${vid.fileId}`
                        : vid.previewUrl
                    }
                    controls={false}
                    className="w-full h-full object-cover rounded-md"
                  />
                  {isExistingVideo(vid) && (
                    <div className="absolute top-1 right-1 bg-yellow-400 text-black text-xs font-bold px-2 py-0.5 rounded">
                      Edit
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="p-5 border-t border-slate-800 flex justify-center items-center shrink-0">
            <span className="text-m text-slate-400">
              {editMode
                ? `${existingVideos.length} videos to edit`
                : `${uploaded.length} pending`}
            </span>
          </div>
        </aside>

        {/* CENTER FORM */}
        <section className="flex-1 flex flex-col items-center overflow-y-auto py-10 px-8 custom-scroll">
          {selectedImage ? (
            <>
              <div className="bg-black rounded-md p-4 mb-10 shadow-md max-w-3xl w-full flex justify-center relative">
                <video
                  src={
                    isExistingVideo(selectedImage)
                      ? selectedImage.previewUrl ||
                        `https://${import.meta.env.VITE_AWS_BUCKET}.s3.amazonaws.com/${selectedImage.fileId}`
                      : selectedImage.previewUrl
                  }
                  controls
                  className="rounded-md max-h-[400px] object-contain"
                />
                {isExistingVideo(selectedImage) && (
                  <div className="absolute top-3 left-3 bg-yellow-400 text-black font-semibold text-xs px-2 py-1 rounded">
                    Editing Existing
                  </div>
                )}
              </div>

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
                  experienceId: "",
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
            </>
          ) : (
            <p className="text-slate-400 mt-20 text-center">
              Select a file to begin{" "}
              {editMode ? "editing" : "adding"} metadata
            </p>
          )}
        </section>

        {/* RIGHT SIDEBAR */}
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
