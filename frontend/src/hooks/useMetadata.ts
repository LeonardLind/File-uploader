import { useEffect, useState } from "react";
import { normalizeIdState, normalizeStage } from "../utils/galleryUtils";
import type { MetadataItem } from "../types/gallery";

// This hook loads all metadata rows from the dynamoDB table.
export function useMetadata(apiUrl: string) {
  const [files, setFiles] = useState<MetadataItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        // Fetch metadata list from dynamoDb.
        const res = await fetch(`${apiUrl}/api/upload/metadata`);
        const data = await res.json();

        if (!data.success) throw new Error(data.error);

        // Ensure stage/id is valid; fall back to draft/Unknown when it isn't.
        const items = (data.items || []).map((item: MetadataItem) => ({
          ...item,
          id_state: normalizeIdState(item.id_state),
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
