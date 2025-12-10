import { useEffect } from "react";
import type { MetadataItem } from "../types/gallery";

export function useKeyboardNavigation(
  editing: MetadataItem | null,
  filtered: MetadataItem[],
  setEditing: (file: MetadataItem | null) => void
) {
  const selectRelative = (delta: number) => {
    if (!editing) return;
    const idx = filtered.findIndex((f) => f.fileId === editing.fileId);
    if (idx === -1) return;
    const nextIdx = idx + delta;
    if (nextIdx >= 0 && nextIdx < filtered.length) {
      setEditing(filtered[nextIdx]);
    }
  };

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!editing) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        selectRelative(1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        selectRelative(-1);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [editing, filtered]);
}
