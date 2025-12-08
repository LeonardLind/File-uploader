export type VideoItem = {
  fileId: string;
  filename?: string;
  displayState?: string;
  highlight?: boolean;
  highlightThumbnailId?: string;
  thumbnailId?: string;
  sourceFileId?: string;
  trimStartSec?: number;
  trimEndSec?: number;
  highlightFileId?: string;
};
