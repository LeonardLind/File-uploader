// src/components/gallery/GalleryItemCard.tsx

import { BUCKET_NAME } from "../../app/services/config/env";
import type { MetadataItem } from "../../types/media";

type Props = {
  item: MetadataItem;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
};

/**
 * Thumbnail card for a single video item in the gallery grid.
 */
export function GalleryItemCard({ item, selected, onSelect, onEdit }: Props) {
  const src = BUCKET_NAME
    ? `https://${BUCKET_NAME}.s3.amazonaws.com/${item.thumbnailId || item.fileId}`
    : "";

  return (
    <div
      onClick={onSelect}
      className={`relative cursor-pointer rounded-md overflow-hidden border transition-all
        ${selected ? "border-lime-400" : "border-transparent hover:border-slate-600"}
      `}
    >
      <video src={src} className="w-full h-40 object-cover pointer-events-none" />

      {/* Edit badge */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
        }}
        className="absolute top-2 right-2 text-xs bg-yellow-400 text-black px-2 py-1 rounded-md hover:bg-yellow-300"
      >
        Edit
      </button>

      <div className="p-2 bg-neutral-900 border-t border-slate-800">
        <p className="text-sm text-white font-medium">{item.species}</p>
        <p className="text-xs text-slate-400">
          Plot {item.plot} · {item.experiencePoint}
        </p>
      </div>
    </div>
  );
}
