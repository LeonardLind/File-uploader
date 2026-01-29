export type CameraAutofill = {
  plot: string;
  sensorId: string;
  deploymentId: string;
  experiencePoint: string;
};

type CameraMetadataResponse = {
  success?: boolean;
  item?: Partial<CameraAutofill> & { cameraId?: string };
  error?: string;
};

export async function fetchCameraMetadata(
  apiUrl: string,
  cameraId: string,
  signal?: AbortSignal
): Promise<CameraAutofill | null> {
  if (!apiUrl) return null;
  const res = await fetch(`${apiUrl}/api/upload/camera-metadata/${cameraId}`, { signal });
  if (!res.ok) return null;
  const data = (await res.json()) as CameraMetadataResponse;
  if (!data?.success || !data.item) return null;

  const { plot, sensorId, deploymentId, experiencePoint } = data.item;
  if (!plot || !sensorId || !deploymentId || !experiencePoint) return null;
  return { plot, sensorId, deploymentId, experiencePoint };
}
