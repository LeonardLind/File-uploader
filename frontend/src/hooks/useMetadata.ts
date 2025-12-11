import { useEffect, useState } from "react";
import { normalizeStage } from "../utils/galleryUtils";
import type { MetadataItem } from "../types/gallery";

export function useMetadata(apiUrl: string) {
  const [files, setFiles] = useState<MetadataItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await fetch(`${apiUrl}/api/upload/metadata`);
        const data = await res.json();

        if (!data.success) throw new Error(data.error);

        const items = (data.items || []).map((item: MetadataItem) => ({
          ...item,
          id_state: item.id_state || "Unknown",
          stage: normalizeStage((item as any).stage) ?? "draft",
        }));
        setFiles(items);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load metadata");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [apiUrl]);

  return { files, setFiles, loading, error };
}
