import type { MetadataItem } from "../types/gallery";

export type Status = "draft" | "id" | "done" | "display";
export type ViewFilter = Status;

const REQUIRED_FIELDS: Array<keyof MetadataItem> = ["plot", "experiencePoint", "sensorId", "deploymentId"];

export function isComplete(item: MetadataItem) {
  return REQUIRED_FIELDS.every((key) => Boolean(item[key]));
}

export function normalizeStage(stage?: string | null): Status | null {
  if (!stage) return null;
  if (stage === "action") return "display";
  if (stage === "display") return "done";
  if (stage === "done" || stage === "id" || stage === "draft") return stage;
  return null;
}

export function deriveStatus(item: MetadataItem): Status {
  if (item.highlight) return "display";
  const normalizedStage = normalizeStage(item.stage);
  if (normalizedStage) return normalizedStage;
  if (item.id_state === "Confirmed" && item.species) return "done";
  if (isComplete(item)) return "id";
  return "draft";
}

export function extractCameraName(key?: string): string | null {
  if (!key) return null;
  const base = key.split("/").pop() ?? key;
  const underscoreIndex = base.lastIndexOf("_");
  if (underscoreIndex === -1) return null;
  const tail = base.slice(underscoreIndex + 1);
  const withoutExt = tail.replace(/\.[^.]+$/, "");
  const trimmed = withoutExt.trim();
  return trimmed ? trimmed : null;
}
