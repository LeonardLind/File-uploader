import type { MetadataItem } from "../types/gallery";

export type Status = "draft" | "id" | "done" | "display";
export type ViewFilter = Status;
export type IdState = "Unknown" | "Genus" | "AI ID" | "Guess" | "Confirmed";

const REQUIRED_FIELDS: Array<keyof MetadataItem> = ["plot", "experiencePoint", "sensorId", "deploymentId"];

// Check if all required fields are filled in
export function isComplete(item: MetadataItem) {
  return REQUIRED_FIELDS.every((key) => Boolean(item[key]));
}

// Accept only known stages; fall back to draft for invalid values.
export function normalizeStage(stage?: string | null): Status | null {
  if (!stage) return null;
  if (stage === "draft" || stage === "id" || stage === "done" || stage === "display") return stage;
  return "draft";
}

// Accept only known id states; fall back to Unknown for invalid values.
export function normalizeIdState(value?: string | null): IdState {
  if (value === "Unknown" || value === "Genus" || value === "AI ID" || value === "Guess" || value === "Confirmed") {
    return value;
  }
  return "Unknown";
}
// Fallback if normalizeStage returns null.
export function deriveStatus(item: MetadataItem): Status {
   // If marked as highlight → show in display
  if (item.highlight) return "display";
  const normalizedStage = normalizeStage(item.stage);
  if (normalizedStage) return normalizedStage;
  if (item.id_state === "Confirmed" && item.species) return "done";
  if (isComplete(item)) return "id";
  return "draft";
}

export function extractCameraName(key?: string): string | null {
  // Parse the camera id from the last underscore in the filename.
  if (!key) return null;
   // Get only the filename (remove folders)
  const base = key.split("/").pop() ?? key;
  const underscoreIndex = base.lastIndexOf("_");
  if (underscoreIndex === -1) return null;
  const tail = base.slice(underscoreIndex + 1);
  // Remove file extension (.jpg, .png, etc.)
  const withoutExt = tail.replace(/\.[^.]+$/, "");
  const trimmed = withoutExt.trim();
  return trimmed ? trimmed : null;
}
