export interface PendingImage {
  id: string;
  previewUrl: string;
  saved: boolean; // ✅ should be a boolean
  species?: string;
  experiencePoint?: string;
  sensorId?: string;
  deploymentId?: string;
  experienceId?: string;
  // ... any other fields you have
}
