export type MetadataItem = {
  fileId: string;
  thumbnailId?: string;
  highlightThumbnailId?: string;
  filename: string;
  species?: string;
  plot?: string;
  experiencePoint?: string;
  sensorId?: string;
  deploymentId?: string;
  updatedAt?: string;
  highlight?: boolean;
  displayState?: string;
  stage?: "draft" | "id" | "display" | "action";
  trimStartSec?: number;
  trimEndSec?: number;
  id_state?: string;
  highlightFileId?: string;
};
