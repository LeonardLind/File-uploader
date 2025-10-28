import { type PendingImage } from "../types";

export function ImagePreviewCard({ image }: { image: PendingImage }) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-full h-40 bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center">
        <img
          src={image.previewUrl}
          alt="preview"
          className="object-contain max-h-full"
        />
      </div>
      {image.animalLabel && (
        <div className="mt-2 text-slate-300 text-sm font-medium">
          {image.animalLabel}
        </div>
      )}
    </div>
  );
}
