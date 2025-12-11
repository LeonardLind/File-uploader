import { useEffect, useRef } from "react";
import { cameraMetadataMap } from "../data/cameraMetadata";
import { extractCameraName, normalizeStage } from "../utils/galleryUtils";
import type { MetadataItem } from "../types/gallery";

export function useAutofillMetadata(
  files: MetadataItem[],
  updateLocal: (fileId: string, updates: Partial<MetadataItem>) => void,
  apiUrl: string
) {
  const autoFilledIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    async function autofillMissing() {
      const candidates = files.filter(
        (f) =>
          !autoFilledIds.current.has(f.fileId) &&
          (!f.plot || !f.sensorId || !f.deploymentId || !f.experiencePoint)
      );

      for (const file of candidates) {
        const camera = extractCameraName(file.fileId || file.filename);
        if (!camera) continue;
        const meta = cameraMetadataMap[camera];
        if (!meta) continue;

        try {
          await fetch(`${apiUrl}/api/upload/metadata/update`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fileId: file.fileId,
              plot: meta.plot,
              sensorId: meta.sensorId,
              deploymentId: meta.deploymentId,
              experiencePoint: meta.experiencePoint,
              id_state: file.id_state || "Unknown",
            }),
          });

          updateLocal(file.fileId, {
            plot: meta.plot,
            sensorId: meta.sensorId,
            deploymentId: meta.deploymentId,
            experiencePoint: meta.experiencePoint,
            id_state: file.id_state || "Unknown",
            stage: normalizeStage(file.stage) || "draft",
            updatedAt: new Date().toISOString(),
          });
          autoFilledIds.current.add(file.fileId);
        } catch (err: unknown) {
          console.error("Autofill failed", err);
        }
      }
    }

    autofillMissing();
  }, [files, apiUrl, updateLocal]);
}
