import "../index.css";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useImageStore } from "../state/useImageStore";
import { MetadataForm } from "../components/MetadataForm";

export function StagingPage() {
  const navigate = useNavigate();
  const { images, updateImage, removeImage } = useImageStore();

  const uploaded = images.filter((img) => !img.saved);
  const registered = images.filter((img) => img.saved);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  // ✅ Automatically select the first unsaved file when page loads or list updates
  useEffect(() => {
    if (uploaded.length > 0 && !selectedId) {
      setSelectedId(uploaded[0].id);
    }
  }, [uploaded, selectedId]);

  const selectedImage = images.find((img) => img.id === selectedId);

  /** ✅ Called after metadata + upload succeed */
  async function handleSave(savedData: any) {
    if (!selectedImage) return;

    console.log("✅ File successfully uploaded and metadata saved:", savedData);

    // Mark image as saved in global store
    updateImage(selectedImage.id, { ...savedData, saved: true });

    // Automatically move to next unsaved
    const remaining = uploaded.filter((img) => img.id !== selectedImage.id);
    setSelectedId(remaining.length > 0 ? remaining[0].id : null);
  }

  function handleDeleteCurrent(id: string) {
    const remaining = uploaded.filter((img) => img.id !== id);
    removeImage(id);
    setSelectedId(remaining.length > 0 ? remaining[0].id : null);
  }

  function handleDone() {
    navigate("/gallery");
  }

  return (
    <div className="flex flex-col w-full h-full bg-neutral-900 text-white">
      {/* Lock layout height; prevent body scroll */}
      <main className="flex flex-1 h-full bg-neutral-950">
{/* LEFT — Pending Review */}
<aside className="flex flex-col w-[20rem] h-full bg-neutral-950 border-r border-slate-800 overflow-hidden">
  {/* Header */}
  <div className="p-5 border-b border-slate-800 shrink-0">
    <h3 className="uppercase text-lg text-white">Pending Review</h3>
  </div>

  {/* Scrollable content */}
  <div className="flex-1 overflow-y-auto px-4 py-4 custom-scroll">
    <div className="flex flex-col items-center gap-3">
      {uploaded.length === 0 && (
        <p className="text-slate-500 text-xs text-center">No files</p>
      )}

      {uploaded.map((img) => (
        <button
          key={img.id}
          onClick={() => setSelectedId(img.id)}
          className={`relative overflow-hidden rounded-md border transition-all w-[18rem] h-40 ${
            selectedId === img.id
              ? "border-lime-400 bg-white/10"
              : "border-transparent hover:scale-[1.02] hover:border-slate-600"
          }`}
        >
          <video
            src={img.previewUrl}
            controls={false}
            className="w-full h-full object-cover rounded-md"
          />
        </button>
      ))}
    </div>
  </div>

  {/* Footer — Video Counter */}
  <div className="p-5 border-t border-slate-800 flex justify-center items-center shrink-0">
    <span className="text-m text-slate-400">
      {uploaded.length === 1
        ? "1 video pending"
        : `${uploaded.length} videos pending`}
    </span>
  </div>
</aside>


        {/* CENTER — Metadata Form */}
        <section className="flex-1 flex flex-col items-center overflow-y-auto py-10 px-8 custom-scroll">
          {selectedImage ? (
            <>
              <div className="bg-black rounded-md p-4 mb-10 shadow-md max-w-3xl w-full flex justify-center">
                <video
                  src={selectedImage.previewUrl}
                  controls
                  className="rounded-md max-h-[400px] object-contain"
                />
              </div>

              {selectedImage.file ? (
                <MetadataForm
                  file={selectedImage.file}
                  defaultValues={{
                    species: "",
                    experiencePoint: "",
                    sensorId: "",
                    deploymentId: "",
                    experienceId: "",
                  }}
                  onSave={handleSave}
                  onDelete={() => handleDeleteCurrent(selectedImage.id)}
                />
              ) : (
                <p className="text-slate-400 text-center">
                  ⚠️ No file attached to this entry.
                </p>
              )}
            </>
          ) : (
            <p className="text-slate-400 mt-20 text-center">
              Select a file to begin adding metadata
            </p>
          )}
        </section>

        {/* RIGHT — Registered Files */}
        <aside className="flex flex-col w-[20rem] h-full bg-neutral-950 border-l border-slate-800 overflow-hidden">
          {/* Header */}
          <div className="p-5 border-b border-slate-800 shrink-0">
            <h3 className="uppercase text-lg text-white">Registered</h3>
          </div>

          {/* Scrollable content */}
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

          {/* Footer */}
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
      </main>
    </div>
  );
}
