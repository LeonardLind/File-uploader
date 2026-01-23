import { useMemo } from "react";
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
  const view = useMemo<ViewFilter>(() => {
    const rawView = new URLSearchParams(locationSearch).get("view");
    return rawView === "id"
      ? "id"
      : rawView === "done"
      ? "done"
      : rawView === "display" || rawView === "action"
      ? "display"
      : "draft";
  }, [locationSearch]);

  const filtered = useMemo(() => {
    let result = [...files];

    Object.entries(filters).forEach(([key, rawValue]) => {
      if (key === "updatedSort") return;
      const value = typeof rawValue === "string" ? rawValue.trim() : "";
      if (!value) return;

      result = result.filter((f) => {
        const candidate = f[key as keyof MetadataItem];
        if (typeof candidate !== "string") return false;
        const candidateValue = candidate.toLowerCase();
        const searchValue = value.toLowerCase();

        if (key === "species") {
          return candidateValue.startsWith(searchValue);
        }

        return candidateValue === searchValue;
      });
    });

    if (view === "id") {
      result = result.filter((f) => deriveStatus(f) === "id");
    } else if (view === "done") {
      result = result.filter((f) => deriveStatus(f) === "done");
    } else if (view === "display") {
      result = result.filter((f) => deriveStatus(f) === "display");
    } else {
      result = result.filter((f) => deriveStatus(f) === "draft");
    }

    result.sort((a, b) => {
      const da = new Date(a.updatedAt || 0).getTime();
      const db = new Date(b.updatedAt || 0).getTime();
      return filters.updatedSort === "asc" ? da - db : db - da;
    });

    return result;
  }, [files, filters, view]);

  return { filtered, view };
}
