import "../index.css";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useImageStore } from "../state/useImageStore";
import { MetadataForm } from "../components/MetadataForm";

export function StagingPage() {
  const navigate = useNavigate();
  const { images, updateImage } = useImageStore();

  const [selectedId, setSelectedId] = useState<string | null>(
    images.find((img) => !img.saved)?.id ?? null
  );

  const selectedImage = images.find((img) => img.id === selectedId);
  const uploaded = images.filter((img) => !img.saved);
  const registered = images.filter((img) => img.saved);

  const API_URL = import.meta.env.VITE_API_URL;

  async function handleSave(savedData: any) {
    if (!selectedImage) return;

    try {
      // ✅ File name fallback since PendingImage doesn't have `file`
      const filename = (selectedImage as any).file?.name || `${selectedImage.id}.mp4`;

      const res = await fetch(`${API_URL}/api/upload/metadata`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId: selectedImage.id,
          filename,
          ...savedData,
        }),
      });

      if (!res.ok) throw new Error("Failed to save metadata");
      console.log("✅ Metadata saved to DynamoDB");

      updateImage(selectedImage.id, { ...savedData, saved: true });

      const remaining = uploaded.filter((img) => img.id !== selectedImage.id);
      setSelectedId(remaining.length > 0 ? remaining[0].id : null);
    } catch (err) {
      console.error("❌ Error saving metadata:", err);
      alert("Failed to save metadata. Check console for details.");
    }
  }

  function handleDone() {
    navigate("/gallery");
  }

  return (
    <div className="relative min-h-screen w-full flex flex-col bg-neutral-900 text-white">
      <main className="flex flex-1 h-[calc(100vh-5rem)] bg-neutral-950 overflow-hidden pt-16">
        {/* LEFT — Uploaded files */}
        <aside className="w-[20rem] bg-neutral-950 border-r border-slate-800 flex flex-col">
          <div className="p-5 border-b border-slate-800">
            <h3 className="uppercase text-lg text-white">Media Upload</h3>
          </div>

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
                  <img
                    src={img.previewUrl}
                    alt="thumbnail"
                    className="w-full h-full object-cover rounded-md"
                  />
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* CENTER — Metadata Form */}
        <section className="flex-1 flex flex-col items-center overflow-y-auto py-10 px-8 custom-scroll">
          {selectedImage ? (
            <>
              <div className="bg-black rounded-md p-4 mb-10 shadow-md max-w-3xl w-full flex justify-center">
                <img
                  src={selectedImage.previewUrl}
                  alt="Preview"
                  className="rounded-md max-h-[400px] object-contain"
                />
              </div>

              {/* ✅ Pass fileId explicitly (fixes TS2741) */}
              <MetadataForm
                fileId={selectedImage.id}
                defaultValues={{
                  species: "",
                  experiencePoint: "",
                  sensorId: "",
                  deploymentId: "",
                  experienceId: "",
                }}
                onSave={handleSave}
              />
            </>
          ) : (
            <p className="text-slate-400 mt-20 text-center">
              Select a file to begin adding metadata
            </p>
          )}
        </section>

        {/* RIGHT — Registered list */}
        <aside className="w-[20rem] bg-neutral-950 border-l border-slate-800 flex flex-col">
          <div className="p-5 border-b border-slate-800">
            <h3 className="uppercase text-lg text-white">Registered</h3>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 custom-scroll">
            <div className="flex flex-col items-center gap-3">
              {registered.length === 0 && (
                <p className="text-slate-500 text-xs text-center">None yet</p>
              )}
              {registered.map((img) => (
                <button
                  key={img.id}
                  className="relative overflow-hidden rounded-md border border-transparent hover:border-slate-600 w-[18rem] h-40 transition-transform"
                >
                  <img
                    src={img.previewUrl}
                    alt="Registered thumbnail"
                    className="w-full h-full object-cover rounded-md"
                  />
                </button>
              ))}
            </div>
          </div>

          {registered.length > 0 && (
            <div className="p-5 border-t border-slate-800 flex justify-center">
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
