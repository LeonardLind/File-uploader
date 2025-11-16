import { API_URL } from "../config/env";
import type { MetadataItem } from "../../../types/media";

export async function getMetadataList(): Promise<MetadataItem[]> {
  const res = await fetch(`${API_URL}/api/upload/metadata`);

  if (!res.ok) {
    throw new Error("Failed to fetch metadata list");
  }

  const json = await res.json();

  // Backend returns { success, message, data }
  return json.data || [];
}
