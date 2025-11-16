// src/components/staging/MetadataSelector.tsx

import {
  plots,
  getExperiencePoints,
  getSensors,
  getDeployments,
} from "../../lib/metadata/plotConfig";

type SelectorProps = {
  plot: string;
  experience: string;
  sensor: string;
  deployment: string;

  onChangePlot: (v: string) => void;
  onChangeExperience: (v: string) => void;
  onChangeSensor: (v: string) => void;
  onChangeDeployment: (v: string) => void;
};

/**
 * Renders the four-step metadata selection UI used when uploading new videos.
 * Separated from MetadataForm for clarity and easier maintenance.
 */
export function MetadataSelector({
  plot,
  experience,
  sensor,
  deployment,
  onChangePlot,
  onChangeExperience,
  onChangeSensor,
  onChangeDeployment,
}: SelectorProps) {
  const xpOptions = plot ? getExperiencePoints(plot) : [];
  const sensorOptions = experience ? getSensors(experience) : [];
  const deploymentOptions = sensor ? getDeployments(sensor) : [];

  return (
    <div className="flex flex-col gap-6">
      {/* Plot */}
      <div>
        <label className="block mb-2 text-sm">Plot</label>
        <select
          value={plot}
          onChange={(e) => onChangePlot(e.target.value)}
          className="w-full bg-neutral-900 border border-slate-700 rounded-lg p-2"
        >
          <option value="">Select plot</option>
          {plots.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      {/* Experience */}
      <div>
        <label className="block mb-2 text-sm">Experience Point</label>
        <select
          value={experience}
          onChange={(e) => onChangeExperience(e.target.value)}
          disabled={!plot}
          className="w-full bg-neutral-900 border border-slate-700 rounded-lg p-2
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="">Select experience</option>
          {xpOptions.map((xp) => (
            <option key={xp} value={xp}>
              {xp}
            </option>
          ))}
        </select>
      </div>

      {/* Sensor */}
      <div>
        <label className="block mb-2 text-sm">Sensor</label>
        <select
          value={sensor}
          onChange={(e) => onChangeSensor(e.target.value)}
          disabled={!experience}
          className="w-full bg-neutral-900 border border-slate-700 rounded-lg p-2
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="">Select sensor</option>
          {sensorOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* Deployment */}
      <div>
        <label className="block mb-2 text-sm">Deployment</label>
        <select
          value={deployment}
          onChange={(e) => onChangeDeployment(e.target.value)}
          disabled={!sensor}
          className="w-full bg-neutral-900 border border-slate-700 rounded-lg p-2
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="">Select deployment</option>
          {deploymentOptions.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
