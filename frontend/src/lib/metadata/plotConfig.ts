// src/lib/metadata/plotConfig.ts

/**
 * Static hierarchy of metadata selection.
 * Split into separate labeled objects for clarity and easier maintenance.
 */

export const plots = ["A", "B", "C", "D"] as const;

export const experiencePoints = {
  A: ["XP1", "XP2"],
  B: ["XP1", "XP3", "XP5"],
  C: ["XP2", "XP10"],
  D: ["XP1"],
} as const;

export const sensors = {
  XP1: ["Sensor1", "Sensor3"],
  XP2: ["Sensor7", "Sensor9"],
  XP3: ["Sensor4"],
  XP5: ["Sensor10"],
  XP10: ["Sensor99"],
} as const;

export const deployments = {
  Sensor1: ["D1", "D5"],
  Sensor3: ["D2"],
  Sensor7: ["D3", "D4"],
  Sensor9: ["D11"],
  Sensor4: ["D6"],
  Sensor10: ["D7", "D8"],
  Sensor99: ["D20"],
} as const;

/**
 * Convenience helpers used in components.
 */

export function getExperiencePoints(plot: string): readonly string[] {
  return experiencePoints[plot as keyof typeof experiencePoints] ?? [];
}

export function getSensors(exp: string): readonly string[] {
  return sensors[exp as keyof typeof sensors] ?? [];
}

export function getDeployments(sensor: string): readonly string[] {
  return deployments[sensor as keyof typeof deployments] ?? [];
}

