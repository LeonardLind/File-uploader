import { useImageStore } from "../state/useImageStore";
import { FileDropzone } from "../components/FileDropzone";
import { ImagePreviewCard } from "../components/ImagePreviewCard";
import { Link } from "react-router-dom";
import backgroundImage from "../assets/forst.png";

export function UploadPage() {
  const { images } = useImageStore();

  // Images that are not saved yet = just uploaded
  const unsaved = images.filter((img) => !img.saved);

  return (
    <div
      className="relative w-screen h-screen bg-cover bg-center flex flex-col items-center justify-center text-white"
      style={{ backgroundImage: `url(${backgroundImage})` }}
    >
      {/* Overlay for dark tint */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px]" />

      {/* Content layer */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-5xl px-6">
        <header className="text-center mb-10">
          <h1 className="text-3xl font-semibold mb-2">Upload Camera Trap Images</h1>
          <p className="text-slate-300 text-sm">
            Drop your SD card images here. We’ll collect metadata next.
          </p>
        </header>

        {/* Drop zone */}
        <div className="w-full max-w-lg">
          <FileDropzone />
        </div>

        {/* Uploaded previews */}
        {unsaved.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-10">
            {unsaved.map((img) => (
              <div key={img.id} className="bg-neutral-900/80 rounded-xl p-4">
                <ImagePreviewCard image={img} />
                <Link
                  to={`/staging/${img.id}`}
                  className="mt-4 inline-block text-center w-full rounded-lg bg-lime-400 text-neutral-900 font-medium py-2 hover:bg-lime-300 transition"
                >
                  Add metadata →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
