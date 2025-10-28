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

    // Move to next unsaved image
    const remaining = uploaded.filter((img) => img.id !== selectedImage.id);
    if (remaining.length > 0) setSelectedId(remaining[0].id);
    else setSelectedId(null);
  }

  function handleDone() {
    navigate("/gallery");
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-neutral-900 text-white flex flex-col">
      {/* Navbar */}
      <header className="flex justify-between items-center px-8 py-4 bg-neutral-950 text-sm tracking-wide border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="font-bold text-lg text-lime-500">GREEN CUBES</div>
          <div className="text-slate-300">| Image &amp; Audio uploader</div>
        </div>
        <nav className="flex items-center gap-8">
          <span className="uppercase text-slate-300 hover:text-white cursor-pointer">
            Uploader
          </span>
          <span className="uppercase border-b border-lime-500 text-lime-500 pb-1">
            Register
          </span>
          <span
            onClick={() => navigate("/gallery")}
            className="uppercase text-slate-300 hover:text-white cursor-pointer"
          >
            File Manager
          </span>
        </nav>
      </header>

      {/* Main layout */}
      <main className="flex flex-1 overflow-hidden bg-neutral-950 text-white h-[calc(100vh-4rem)]">
        {/* LEFT SIDEBAR */}
        <aside className="w-120 bg-neutral-950 border-r border-slate-800 flex flex-col shrink-0 h-full">
          <div className="p-4">
            <h3 className="uppercase text-xl text-white">Media Upload</h3>
          </div>

          <div className="flex-1 overflow-y-auto px-4 custom-scroll">
            <div className="flex flex-col items-center gap-2 min-h-full">
              {uploaded.length === 0 && (
                <p className="text-slate-500 text-xs text-center">No images</p>
              )}
              {uploaded.map((img) => (
                <button
                  key={img.id}
                  onClick={() => setSelectedId(img.id)}
                  className={`relative overflow-hidden rounded-md border transition-transform duration-200 ${
                    selectedId === img.id
                      ? "border-lime-400 bg-white/10"
                      : "border-transparent hover:scale-[1.02] hover:border-slate-600"
                  } w-[20rem] h-40 my-2`}
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

        {/* CENTER SECTION */}
        <section className="flex-1 flex flex-col items-center justify-start p-10 overflow-y-auto min-w-0 h-full">
          {selectedImage ? (
            <>
              {/* Centered image preview */}
              <div className="bg-black rounded-md p-4 mb-10 shadow-md max-w-3xl w-full flex justify-center items-center mx-auto">
                <img
                  src={selectedImage.previewUrl}
                  alt="Preview"
                  className="rounded-md max-h-[400px] object-contain"
                />
              </div>

              {/* Metadata form */}
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
                className="flex flex-col gap-6 w-full max-w-3xl"
              >
                <div>
                  <label className="block text-slate-300 text-sm mb-2">
                    Species
                  </label>
                  <input
                    type="text"
                    placeholder="Start typing common or latin name"
                    className="w-full border border-slate-600 rounded-md bg-transparent text-slate-100 p-2 focus:border-lime-400 focus:ring-2 focus:ring-lime-400/30 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <label className="block text-slate-300 text-sm mb-2">
                      Experience Point
                    </label>
                    <select className="w-full border border-slate-600 rounded-md bg-transparent text-slate-100 p-2 focus:border-lime-400 focus:ring-2 focus:ring-lime-400/30 outline-none">
                      <option value="">Select</option>
                      <option value="XP1">XP1</option>
                      <option value="XP2">XP2</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 text-sm mb-2">
                      Sensor
                    </label>
                    <select className="w-full border border-slate-600 rounded-md bg-transparent text-slate-100 p-2 focus:border-lime-400 focus:ring-2 focus:ring-lime-400/30 outline-none">
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
                    <select className="w-full border border-slate-600 rounded-md bg-transparent text-slate-100 p-2 focus:border-lime-400 focus:ring-2 focus:ring-lime-400/30 outline-none">
                      <option value="">Select</option>
                      <option value="Footpath">Foot path</option>
                      <option value="Trail">Trail</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 text-sm mb-2">
                      Experience ID
                    </label>
                    <select className="w-full border border-slate-600 rounded-md bg-transparent text-slate-100 p-2 focus:border-lime-400 focus:ring-2 focus:ring-lime-400/30 outline-none">
                      <option value="">Select</option>
                      <option value="Breno">Breno</option>
                      <option value="Forest">Forest</option>
                    </select>
                  </div>
                </div>
              </form>

              {/* Buttons */}
              <div className="flex justify-center gap-6 mt-10">
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
            <p className="text-slate-400 mt-20">
              Select an image to begin adding metadata
            </p>
          )}
        </section>

        {/* RIGHT SIDEBAR */}
        <aside className="w-120 bg-neutral-950 border-l border-slate-800 flex flex-col shrink-0 h-full">
          <div className="p-4">
            <h3 className="uppercase text-xl text-white">Registered</h3>
          </div>

          <div className="flex-1 overflow-y-auto px-4 custom-scroll">
            <div className="flex flex-col items-center gap-2 min-h-full">
              {registered.length === 0 && (
                <p className="text-slate-500 text-xs text-center">None yet</p>
              )}
              {registered.map((img) => (
                <button
                  key={img.id}
                  className="relative overflow-hidden rounded-md border border-transparent hover:border-slate-600 transition-transform duration-200 w-[20rem] h-40 my-2"
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

          <div className="p-4 border-t border-slate-800 flex justify-center">
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
