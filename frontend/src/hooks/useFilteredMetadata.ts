import { useEffect, useState } from "react";
import type { MetadataItem } from "../types/gallery";
import { deriveStatus, type ViewFilter } from "../utils/galleryUtils";

type Filters = {
  species: string;
  plot: string;
  experiencePoint: string;
  sensorId: string;
  deploymentId: string;
  id_state: string;
  updatedSort: "asc" | "desc" | string;
};

export function useFilteredMetadata(
  files: MetadataItem[],
  filters: Filters,
  locationSearch: string
) {
  const [filtered, setFiltered] = useState<MetadataItem[]>([]);
  const [view, setView] = useState<ViewFilter>("draft");

  useEffect(() => {
    let result = [...files];

    Object.entries(filters).forEach(([key, value]) => {
      if (key !== "updatedSort" && value) {
        result = result.filter((f) => {
          const candidate = f[key as keyof MetadataItem];
          return typeof candidate === "string" && candidate.toLowerCase() === value.toLowerCase();
        });
      }
    });

    const rawView = new URLSearchParams(locationSearch).get("view");
    const nextView: ViewFilter =
      rawView === "id"
        ? "id"
        : rawView === "done"
        ? "done"
        : rawView === "display" || rawView === "action"
        ? "display"
        : "draft";
    setView(nextView);

    if (nextView === "id") {
      result = result.filter((f) => deriveStatus(f) === "id");
    } else if (nextView === "done") {
      result = result.filter((f) => deriveStatus(f) === "done");
    } else if (nextView === "display") {
      result = result.filter((f) => deriveStatus(f) === "display");
    } else {
      result = result.filter((f) => deriveStatus(f) === "draft");
    }

    result.sort((a, b) => {
      const da = new Date(a.updatedAt || 0).getTime();
      const db = new Date(b.updatedAt || 0).getTime();
      return filters.updatedSort === "asc" ? da - db : db - da;
    });

    setFiltered(result);
  }, [files, filters, locationSearch]);

  return { filtered, view, setView };
}
