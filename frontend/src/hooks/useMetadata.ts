import { useEffect, useState } from "react";
import { normalizeIdState, normalizeStage } from "../utils/galleryUtils";
import type { MetadataItem } from "../types/gallery";
import { fetchMetadata } from "../api/uploadApi";

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
        const data = await fetchMetadata(apiUrl);

        // Ensure stage/id is valid; fall back to draft/Unknown when it isn't.
        const items = (data.items || []).map((item) => {
          const next = item as MetadataItem;
          return {
            ...next,
            id_state: normalizeIdState(next.id_state),
            stage: normalizeStage(next.stage) ?? "draft",
          };
        });
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
