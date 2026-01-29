import { useEffect, useRef } from "react";
import { fetchCameraMetadata, type CameraAutofill } from "../data/cameraMetadata";
import { extractCameraName, normalizeStage } from "../utils/galleryUtils";
import type { MetadataItem } from "../types/gallery";

export function useAutofillMetadata(
  files: MetadataItem[],
  updateLocal: (fileId: string, updates: Partial<MetadataItem>) => void,
  apiUrl: string
) {
  const autoFilledIds = useRef<Set<string>>(new Set());
  const cameraCache = useRef<Map<string, CameraAutofill | null>>(new Map());
  const inFlight = useRef<Map<string, Promise<CameraAutofill | null>>>(new Map());

  useEffect(() => {
    let cancelled = false;

    const getCameraMetadata = async (cameraId: string) => {
      if (cameraCache.current.has(cameraId)) {
        return cameraCache.current.get(cameraId) ?? null;
      }

      const existing = inFlight.current.get(cameraId);
      if (existing) return existing;

      const request = fetchCameraMetadata(apiUrl, cameraId)
        .catch(() => null)
        .then((result) => {
          cameraCache.current.set(cameraId, result);
          return result;
        })
        .finally(() => {
          inFlight.current.delete(cameraId);
        });

      inFlight.current.set(cameraId, request);
      return request;
    };

    async function autofillMissing() {
      if (!apiUrl) return;
      const candidates = files.filter(
        (f) =>
          !autoFilledIds.current.has(f.fileId) &&
          (!f.plot || !f.sensorId || !f.deploymentId || !f.experiencePoint)
      );

      for (const file of candidates) {
        if (cancelled) return;
        const camera = extractCameraName(file.fileId || file.filename);
        if (!camera) continue;
        const meta = await getCameraMetadata(camera);
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

          if (cancelled) return;
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
    return () => {
      cancelled = true;
    };
  }, [files, apiUrl, updateLocal]);
}
