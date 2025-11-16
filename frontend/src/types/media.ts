// src/types/media.ts

/**
 * Represents a file staged in the upload process before it is saved.
 * This mirrors your current PendingImage from the store.
 */
export type PendingImage = {
  id: string;
  file: File;
  previewUrl: string;
  saved: boolean;
  uploading?: boolean;
  progress?: number;

  // optional metadata (filled later by MetadataForm)
  species?: string;
  plot?: string;
  experiencePoint?: string;
  sensorId?: string;
  deploymentId?: string;
};

/**
 * Raw DynamoDB format returned from the backend.
 */
export type MetadataItemDynamo = {
  filename?: { S: string };
  species?: { S: string };
  plot?: { S: string };
  experiencePoint?: { S: string };
  sensorId?: { S: string };
  deploymentId?: { S: string };
  fileId?: { S: string };
  thumbnailId?: { S: string };
  updatedAt?: { S: string };
};

/**
 * The normalized shape used by the frontend after converting
 * DynamoDB items.
 */
export type MetadataItem = {
  id: string;             // normalized from fileId
  fileId: string;
  filename: string;
  thumbnailId: string;

  species: string;
  plot: string;
  experiencePoint: string;
  sensorId: string;
  deploymentId: string;

  updatedAt: string;      // replaced createdAt
};

/**
 * Payload used when creating a new metadata entry.
 */
export type UploadMetadataPayload = {
  fileId: string;
  thumbnailId: string;
  filename: string;

  species: string;
  plot: string;
  experiencePoint: string;
  sensorId: string;
  deploymentId: string;
};

/**
 * Payload used when updating metadata of an existing entry.
 */
export type UpdateMetadataPayload = {
  fileId: string;

  species: string;
  plot: string;
  experiencePoint: string;
  sensorId: string;
  deploymentId: string;
};
