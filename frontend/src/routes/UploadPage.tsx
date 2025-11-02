import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useImageStore } from "../state/useImageStore";
import { FileDropzone } from "../components/FileDropzone";
import backgroundImage from "../assets/forst.png";

export function UploadPage() {
  const navigate = useNavigate();
  const { images } = useImageStore();
  const unsaved = images.filter((img) => !img.saved);

  function getFileNameFromImage(img: { file?: File | undefined; id: string }) {
    if (img.file && img.file.name) return img.file.name;
    return `capture_${img.id.slice(0, 6)}.jpg`;
  }

  const uploadList = useMemo(() => {
    return unsaved.map((img) => ({
      id: img.id,
      name: getFileNameFromImage(img),
      progress: 100,
      done: true,
    }));
  }, [unsaved]);

  const total = uploadList.length;
  const done = uploadList.filter((f) => f.done).length;

  function handleContinue() {
    if (unsaved.length === 0) return;
    navigate(`/staging/${unsaved[0].id}`);
  }

  const hasUploads = total > 0;

  return (
    <div
      className="relative min-h-screen w-full bg-cover bg-center flex flex-col text-white"
      style={{ backgroundImage: `url(${backgroundImage})` }}
    >

      <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px]" />

      <main className="relative z-10 flex flex-col flex-1 items-center w-full pt-40 pb-16 px-8">
        <div className="w-full max-w-5xl flex flex-col items-center text-center">

          {!hasUploads && (
            <header className="mb-10 transition-opacity duration-300">
              <h1 className="text-3xl font-semibold mb-3">
                Upload Camera Trap Videos
              </h1>
              <p className="text-slate-300 text-sm">
                Drop your SD card here. We’ll collect metadata next.
              </p>
            </header>
          )}

          <div
            className={`w-full max-w-2xl transition-all duration-300 ${
              hasUploads ? "mb-8" : "mb-12"
            }`}
          >
            <FileDropzone
              compact={hasUploads} 
            />
          </div>

          {hasUploads && (
            <section className="w-full max-w-2xl ">
              <ul className="space-y-2 max-h-[30vh] overflow-y-auto pr-2 custom-scroll">
                {uploadList.map((file) => (
                  <li
                    key={file.id}
                    className="bg-neutral-800/90 rounded-lg p-4 flex flex-col gap-1"
                  >
                    <div className="flex items-start justify-between text-sm">
                      <div className="text-white font-medium truncate max-w-[70%]">
                        {file.name}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-300 whitespace-nowrap">
                        {file.done ? (
                          <>
                            <span className="text-lime-400 font-semibold">
                              Uploaded
                            </span>
                            <span className="inline-block h-4 w-4 rounded-full bg-lime-400 text-neutral-900 text-[10px] font-bold leading-[16px] text-center">
                              ✓
                            </span>
                          </>
                        ) : (
                          <>
                            <span>{file.progress}%</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="w-full h-2 bg-slate-700/50 rounded-md overflow-hidden">
                      <div
                        className={`h-full ${
                          file.done ? "bg-lime-400" : "bg-lime-500"
                        } transition-all duration-300`}
                        style={{
                          width: `${file.progress}%`,
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>

              <div className="flex items-center justify-between mt-6 text-sm">
                <div className="text-slate-300">
                  <span className="text-white font-semibold">
                    {done}/{total}
                  </span>{" "}
                  files uploaded
                </div>

                <button
                  onClick={handleContinue}
                  className="bg-lime-400 text-neutral-900 font-semibold rounded-md px-2 py-2 hover:bg-lime-300 transition"
                >
                  Continue to register 
                </button>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
