// Frontend type for the metadata we expect from DynamoDB.
export type MetadataItem = {
  fileId: string;
  thumbnailId?: string;
  highlightThumbnailId?: string;
  filename: string;
  species?: string;
  species_source?: "iucn" | "domesticated";
  domesticated_common_name?: string | null;
  plot?: string;
  experiencePoint?: string;
  sensorId?: string;
  deploymentId?: string;
  updatedAt?: string;
  highlight?: boolean;
  displayState?: string;
  stage?: "draft" | "id" | "done" | "display";
  trimStartSec?: number;
  trimEndSec?: number;
  id_state?: string;
  highlightFileId?: string;
};
