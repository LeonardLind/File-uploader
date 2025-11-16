// src/services/api/uploadApi.ts

import { API_URL } from "../config/env";
import type {
  UploadMetadataPayload,
  UpdateMetadataPayload,
  MetadataItem,
} from "../../../types/media";

/**
 * Get presigned URL for uploading a video or a thumbnail.
 */
export async function presignUpload(params: {
  filename: string;
  contentType: string;
}) {
  const res = await fetch(`${API_URL}/api/upload/presign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!res.ok) throw new Error("Failed to presign upload");
  return res.json();
}

/**
 * Save metadata for a newly uploaded video.
 */
export async function createMetadata(payload: UploadMetadataPayload) {
  const res = await fetch(`${API_URL}/api/upload/metadata`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!data.success) throw new Error(data.error || "Failed to save metadata");
  return data.item as MetadataItem;
}

/**
 * Update metadata for an existing file (edit mode).
 */
export async function updateMetadata(payload: UpdateMetadataPayload) {
  const res = await fetch(`${API_URL}/api/upload/metadata/update`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!data.success) throw new Error(data.error || "Update failed");
  return data.item as MetadataItem;
}

/**
 * Delete metadata + actual video file.
 */
export async function deleteFile(fileId: string) {
  const res = await fetch(`${API_URL}/api/upload/delete/${fileId}`, {
    method: "DELETE",
  });

  if (!res.ok) throw new Error("Failed to delete file");
  return res.json();
}
