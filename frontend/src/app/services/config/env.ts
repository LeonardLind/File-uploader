// src/services/config/env.ts

export const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3000";

export const BUCKET_NAME =
  import.meta.env.VITE_AWS_BUCKET || "";

export function validateEnv() {
  if (!import.meta.env.VITE_API_URL) {
    console.warn("Missing VITE_API_URL — using default http://localhost:3000");
  }
  if (!import.meta.env.VITE_AWS_BUCKET) {
    console.warn("Missing VITE_AWS_BUCKET");
  }
}
