import type { PendingImage } from "../types";

export function ImagePreviewCard({ image }: { image: PendingImage & { animalLabel?: string } }) {
  return (
    <div className="flex flex-col items-center gap-2 w-full">
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
