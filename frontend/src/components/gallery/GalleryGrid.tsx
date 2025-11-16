// src/components/gallery/GalleryGrid.tsx

import type { MetadataItem } from "../../types/media";
import { GalleryItemCard } from "./GalleryItemCard";

type Props = {
  items: MetadataItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
};

/**
 * Renders a grid of gallery items.
 */
export function GalleryGrid({ items, selectedId, onSelect, onEdit }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 p-6">
      {items.length === 0 && (
        <p className="text-slate-400 text-center col-span-full">
          No videos found.
        </p>
      )}

      {items.map((item) => (
        <GalleryItemCard
          key={item.fileId}
          item={item}
          selected={selectedId === item.fileId}
          onSelect={() => onSelect(item.fileId)}
          onEdit={() => onEdit(item.fileId)}
        />
      ))}
    </div>
  );
}
