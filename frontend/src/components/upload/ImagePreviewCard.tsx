// src/components/upload/ImagePreviewCard.tsx
import type { PendingImage } from "../../types/media";

type ImagePreviewCardProps = {
  image: PendingImage & { animalLabel?: string };
  onRemove: () => void;
};

export function ImagePreviewCard({ image, onRemove }: ImagePreviewCardProps) {
  return (
    <div className="relative flex flex-col items-center gap-2 w-full">

      {/* Remove button */}
      <button
        onClick={onRemove}
        title="Remove"
        className="absolute top-2 right-2 bg-black/60 text-red-400 hover:text-red-200 hover:bg-black/80 rounded-full w-7 h-7 flex items-center justify-center transition"
      >
        ✕
      </button>

      <div className="w-full h-40 bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center border border-slate-800 shadow-md">
        {image.previewUrl ? (
          <img
            src={image.previewUrl}
            alt={image.animalLabel || "preview"}
            className="object-contain max-h-full max-w-full"
          />
        ) : (
          <div className="text-slate-500 text-sm">No preview available</div>
        )}
      </div>

      {image.animalLabel && (
        <p className="text-slate-300 text-sm font-medium text-center truncate max-w-40">
          {image.animalLabel}
        </p>
      )}
    </div>
  );
}
