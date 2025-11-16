// src/pages/upload/UploadPage.tsx
import { useNavigate } from "react-router-dom";
import { useImageStore } from "../../state/useImageStore";
import { FileDropzone } from "../../components/upload/FileDropzone";
import { ImagePreviewCard } from "./ImagePreviewCard";

/**
 * First step of the upload flow.
 * Users drag video files into the dropzone where:
 * - AVI files are converted to MP4
 * - Each video becomes an entry in the "pending uploads" store
 * After selecting files, users proceed to the staging page.
 */
export function UploadPage() {
  const navigate = useNavigate();
  const { images, removeImage } = useImageStore();

  const hasFiles = images.length > 0;

  return (
    <div className="flex flex-col items-center w-full max-w-5xl px-4 py-10">
      <h1 className="text-xl font-semibold mb-6">Video Uploader</h1>

      <div className="w-full mb-10">
        <FileDropzone />
      </div>

      {hasFiles && (
        <section className="w-full space-y-6">
          <h2 className="text-lg font-medium">Selected Videos</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {images.map((img) => (
              <ImagePreviewCard
                key={img.id}
                image={img}
                onRemove={() => removeImage(img.id)}
              />
            ))}
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={() => navigate(`/staging/${images[0].id}`)}
              className="px-6 py-3 bg-lime-400 text-black font-semibold rounded-md hover:bg-lime-300 transition"
            >
              Continue to Staging
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
