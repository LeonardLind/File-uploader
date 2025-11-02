import "../index.css";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useImageStore } from "../state/useImageStore";

export function StagingPage() {
  const navigate = useNavigate();
  const { images, updateImage } = useImageStore();

  const [selectedId, setSelectedId] = useState<string | null>(
    images.find((img) => !img.saved)?.id ?? null
  );

  const selectedImage = images.find((img) => img.id === selectedId);
  const uploaded = images.filter((img) => !img.saved);
  const registered = images.filter((img) => img.saved);

  function handleSave(data: {
    species: string;
    experiencePoint: string;
    sensorId: string;
    deploymentId: string;
    experienceId: string;
  }) {
    if (!selectedImage) return;
    updateImage(selectedImage.id, { ...data, saved: true });

    const remaining = uploaded.filter((img) => img.id !== selectedImage.id);
    setSelectedId(remaining.length > 0 ? remaining[0].id : null);
  }

  function handleDone() {
    navigate("/gallery");
  }

  return (
    <div className="relative min-h-screen w-full flex flex-col bg-neutral-900 text-white">
      <main className="flex flex-1 min-h-0 h-[calc(100vh-5rem)] bg-neutral-950 text-white overflow-hidden pt-[4rem]">
        <aside className="w-[20rem] bg-neutral-950 border-r border-slate-800 flex flex-col shrink-0 min-h-0">
          <div className="p-5 border-b border-slate-800 shrink-0">
            <h3 className="uppercase text-lg text-white">Media Upload</h3>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 custom-scroll">
            <div className="flex flex-col items-center gap-3">
              {uploaded.length === 0 && (
                <p className="text-slate-500 text-xs text-center">No images</p>
              )}

              {uploaded.map((img) => (
                <button
                  key={img.id}
                  onClick={() => setSelectedId(img.id)}
                  className={`relative overflow-hidden rounded-md border transition-transform duration-200 w-[18rem] h-40 ${
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

        <section className="flex-1 flex flex-col min-w-0 min-h-0">
          <div className="flex-1 min-h-0 overflow-y-auto py-10 px-8 custom-scroll">
            {selectedImage ? (
              <>
                <div className="bg-black rounded-md p-4 mb-10 shadow-md max-w-3xl w-full flex justify-center items-center mx-auto">
                  <img
                    src={selectedImage.previewUrl}
                    alt="Preview"
                    className="rounded-md max-h-[400px] object-contain"
                  />
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSave({
                      species: "",
                      experiencePoint: "",
                      sensorId: "",
                      deploymentId: "",
                      experienceId: "",
                    });
                  }}
                  className="flex flex-col gap-6 w-full max-w-3xl mx-auto"
                >
                  <div>
                    <label className="block text-slate-300 text-sm mb-2">
                      Species
                    </label>
                    <input
                      type="text"
                      placeholder="Start typing common or latin name"
                      className="w-full border border-slate-600 rounded-md bg-transparent text-slate-100 px-4 py-2 focus:border-lime-400 focus:ring-2 focus:ring-lime-400/30 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <label className="block text-slate-300 text-sm mb-2">
                        Experience Point
                      </label>
                      <select className="w-full border border-slate-600 rounded-md bg-transparent text-slate-100 px-4 py-2 focus:border-lime-400 focus:ring-2 focus:ring-lime-400/30 outline-none">
                        <option value="">Select</option>
                        <option value="XP1">XP1</option>
                        <option value="XP2">XP2</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-300 text-sm mb-2">
                        Sensor
                      </label>
                      <select className="w-full border border-slate-600 rounded-md bg-transparent text-slate-100 px-4 py-2 focus:border-lime-400 focus:ring-2 focus:ring-lime-400/30 outline-none">
                        <option value="">Select</option>
                        <option value="Cam08">Cam08</option>
                        <option value="Cam09">Cam09</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <label className="block text-slate-300 text-sm mb-2">
                        Deployment ID
                      </label>
                      <select className="w-full border border-slate-600 rounded-md bg-transparent text-slate-100 px-4 py-2 focus:border-lime-400 focus:ring-2 focus:ring-lime-400/30 outline-none">
                        <option value="">Select</option>
                        <option value="Footpath">Foot path</option>
                        <option value="Trail">Trail</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-300 text-sm mb-2">
                        Experience ID
                      </label>
                      <select className="w-full border border-slate-600 rounded-md bg-transparent text-slate-100 px-4 py-2 focus:border-lime-400 focus:ring-2 focus:ring-lime-400/30 outline-none">
                        <option value="">Select</option>
                        <option value="Breno">Breno</option>
                        <option value="Forest">Forest</option>
                      </select>
                    </div>
                  </div>
                </form>

                <div className="flex justify-center gap-6 mt-10 max-w-3xl mx-auto">
                  <button className="border border-slate-500 text-slate-200 px-6 py-2 rounded-md hover:bg-slate-800 transition">
                    Reject
                  </button>
                  <button
                    onClick={() =>
                      handleSave({
                        species: "",
                        experiencePoint: "",
                        sensorId: "",
                        deploymentId: "",
                        experienceId: "",
                      })
                    }
                    className="bg-lime-400 text-neutral-900 font-semibold px-8 py-2 rounded-md hover:bg-lime-300 transition"
                  >
                    Register
                  </button>
                </div>
              </>
            ) : (
              <p className="text-slate-400 mt-20 text-center">
                Select an image to begin adding metadata
              </p>
            )}
          </div>
        </section>

        <aside className="w-[20rem] bg-neutral-950 border-l border-slate-800 flex flex-col shrink-0 min-h-0">
          <div className="p-5 border-b border-slate-800 shrink-0">
            <h3 className="uppercase text-lg text-white">Registered</h3>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 custom-scroll">
            <div className="flex flex-col items-center gap-3">
              {registered.length === 0 && (
                <p className="text-slate-500 text-xs text-center">None yet</p>
              )}

              {registered.map((img) => (
                <button
                  key={img.id}
                  className="relative overflow-hidden rounded-md border border-transparent hover:border-slate-600 transition-transform duration-200 w-[18rem] h-40"
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

          <div className="p-5 border-t border-slate-800 flex justify-center shrink-0">
            {registered.length > 0 && (
              <button
                onClick={handleDone}
                className="bg-lime-400 text-neutral-900 font-semibold rounded-md px-4 py-2 hover:bg-lime-300 transition"
              >
                Done
              </button>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}
