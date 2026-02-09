import type { MetadataItem } from "../types/gallery";

export type Status = "draft" | "id" | "done" | "display";
export type ViewFilter = Status;
export type IdState = "Unknown" | "Genus" | "AI ID" | "Guess" | "Confirmed";
export type RequiredMetadataField = "species" | "plot" | "experiencePoint" | "sensorId" | "deploymentId";

const REQUIRED_FIELDS: Array<keyof MetadataItem> = ["plot", "experiencePoint", "sensorId", "deploymentId"];
export const REQUIRED_METADATA_FIELDS: RequiredMetadataField[] = [
  "species",
  "plot",
  "experiencePoint",
  "sensorId",
  "deploymentId",
];

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

export function isIdStateConfirmed(value?: string | null) {
  return value === "Confirmed";
}

export function getMissingMetadataFields(values: Partial<Record<RequiredMetadataField, string | undefined>>) {
  return REQUIRED_METADATA_FIELDS.filter((key) => {
    const value = values[key];
    return !value || value.trim() === "";
  });
}

export function isConfirmedMetadataReady(values: Partial<Record<RequiredMetadataField, string | undefined>> & { id_state?: string | null }) {
  const missing = getMissingMetadataFields(values);
  const idStateConfirmed = isIdStateConfirmed(values.id_state);
  return {
    ok: missing.length === 0 && idStateConfirmed,
    missing,
    idStateConfirmed,
  };
}

export function validateStageTransition(options: {
  currentStatus: Status;
  nextStatus: Status;
  speciesVerified: boolean;
  idState?: string | null;
  values: Partial<Record<RequiredMetadataField, string | undefined>>;
}) {
  const { currentStatus, nextStatus, speciesVerified, idState, values } = options;
  if (nextStatus !== "done" && nextStatus !== "display") {
    return {
      ok: true,
      missing: [] as RequiredMetadataField[],
      needsSpecies: false,
      idStateConfirmed: true,
    };
  }

  const missing = getMissingMetadataFields(values);
  const idStateConfirmed = isIdStateConfirmed(idState);
  const needsSpecies = !speciesVerified && currentStatus !== "done" && currentStatus !== "display";

  return {
    ok: missing.length === 0 && idStateConfirmed && !needsSpecies,
    missing,
    needsSpecies,
    idStateConfirmed,
  };
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
