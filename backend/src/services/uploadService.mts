// services/uploadService.mts
import { saveMetadata, deleteMetadata, getAllMetadata } from "./dynamoService.mjs";

// -----------------------------
// TYPES
// -----------------------------
export type MetadataPayload = {
  fileId: string;
  filename: string;
  thumbnailId: string;
  species: string;
  plot: string;
  experiencePoint: string;
  sensorId: string;
  deploymentId: string;
};

export type DynamoItem = Record<string, { S: string }>;

// -----------------------------
// Convert JS metadata → DynamoDB format
// -----------------------------
export function toDynamo(item: Record<string, string>): DynamoItem {
  const out: DynamoItem = {};

  for (const key of Object.keys(item)) {
    const value = item[key];
    if (typeof value === "string") {
      out[key] = { S: value };
    }
  }

  return out;
}

// -----------------------------
// Build Metadata object to insert into Dynamo
// -----------------------------
export function buildMetadataEntry(payload: MetadataPayload) {
  return {
    fileId: payload.fileId,
    filename: payload.filename,
    thumbnailId: payload.thumbnailId,
    species: payload.species,
    plot: payload.plot,
    experiencePoint: payload.experiencePoint,
    sensorId: payload.sensorId,
    deploymentId: payload.deploymentId,
    createdAt: new Date().toISOString(),
  };
}

// Re-export the dynamo service helpers
export { getAllMetadata, saveMetadata, deleteMetadata };
