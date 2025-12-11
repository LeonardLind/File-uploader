import { useEffect, useMemo, useState } from "react";
import type { MetadataItem } from "../types/gallery";
import { deriveStatus, type Status, type ViewFilter } from "../utils/galleryUtils";

type EditPaneProps = {
  file: MetadataItem;
  bucket: string;
  uniqueValues: {
    species: string[];
    plot: string[];
    experiencePoint: string[];
    sensorId: string[];
    deploymentId: string[];
  };
  onClose: () => void;
  onSave: (payload: {
    species?: string;
    plot?: string;
    experiencePoint?: string;
    sensorId?: string;
    deploymentId?: string;
    status: Status;
    id_state: string;
    displayState?: string;
    highlight?: boolean;
  }) => void;
  onDelete: (fileId: string) => void;
  onAlert: (title: string, message: string) => void;
  currentView: ViewFilter;
};

export function EditPane({ file, bucket, uniqueValues, onClose, onSave, onDelete, onAlert, currentView }: EditPaneProps) {
  const defaultStage = useMemo<Status>(() => {
    if (currentView === "draft") return "id";
    if (currentView === "id") return "done";
    if (currentView === "done") return "display";
    return deriveStatus(file);
  }, [currentView, file]);

  const [species, setSpecies] = useState(file.species ?? "");
  const [plot, setPlot] = useState(file.plot ?? "");
  const [experiencePoint, setExperiencePoint] = useState(file.experiencePoint ?? "");
  const [sensorId, setSensorId] = useState(file.sensorId ?? "");
  const [deploymentId, setDeploymentId] = useState(file.deploymentId ?? "");
  const [status, setStatus] = useState<Status>(defaultStage);
  const [idState, setIdState] = useState(file.id_state || "Unknown");
  const [active, setActive] = useState(file.displayState !== "Inactive");

  const locked = deriveStatus(file) === "display";
  const allFieldsFilled = [species, plot, experiencePoint, sensorId, deploymentId].every(
    (val) => !!val && val.trim() !== ""
  );
  const canSetDisplayStage = idState === "Confirmed" && allFieldsFilled;

  useEffect(() => {
    setSpecies(file.species ?? "");
    setPlot(file.plot ?? "");
    setExperiencePoint(file.experiencePoint ?? "");
    setSensorId(file.sensorId ?? "");
    setDeploymentId(file.deploymentId ?? "");
    setStatus(defaultStage);
    setIdState(file.id_state || "Unknown");
    setActive(file.displayState !== "Inactive");
  }, [file, defaultStage]);

  useEffect(() => {
    if (status === "display" && !canSetDisplayStage) {
      setStatus("done");
    }
  }, [status, canSetDisplayStage]);

  const save = () => {
    const payloadIdState = idState || "Unknown";
    onSave({
      species,
      plot,
      experiencePoint,
      sensorId,
      deploymentId,
      status,
      id_state: payloadIdState,
      displayState: active ? "Active" : "Inactive",
      highlight: status === "display",
    });
  };

  return (
    <div className="rounded-lg border border-slate-800 bg-neutral-900 shadow-md p-3.5 h-full flex flex-col gap-3.5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Edit metadata</h2>
          <p className="text-slate-400 text-xs">{file.filename}</p>
        </div>
        <button
          onClick={onClose}
          className="px-3 py-1.5 text-xs rounded-md border border-slate-700 text-slate-200 hover:border-slate-500 transition"
        >
          Close
        </button>
      </div>

      <div className="bg-black rounded-lg overflow-hidden border border-slate-800">
        <video
          src={`https://${bucket}.s3.amazonaws.com/${file.fileId}`}
          controls
          className="w-full h-[220px] object-contain bg-black"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400">Species</label>
          <input
            value={species}
            onChange={(e) => setSpecies(e.target.value)}
            className="w-full bg-neutral-800 border border-slate-700 rounded-md px-2.5 py-2 text-sm text-white"
            placeholder="Enter species"
            disabled={locked}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400">Stage</label>
          <select
            value={status}
            onChange={(e) => {
              const nextStatus = e.target.value as Status;
              if ((nextStatus === "done" || nextStatus === "display") && (!canSetDisplayStage || idState !== "Confirmed")) {
                onAlert(
                  nextStatus === "done"
                    ? "Done requires confirmed metadata"
                    : "Display requires confirmed metadata",
                  "All fields must be filled and ID State must be Confirmed before moving to this stage."
                );
                return;
              }
              setStatus(nextStatus);
            }}
            className="w-full bg-neutral-800 border border-slate-700 rounded-md px-2.5 py-2 text-sm text-white"
          >
            <option value="draft">Draft</option>
            <option value="id">ID</option>
            <option value="done" disabled={!canSetDisplayStage || idState !== "Confirmed"}>
              Done
            </option>
            <option value="display" disabled={!canSetDisplayStage || idState !== "Confirmed"}>
              Display
            </option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400">ID State</label>
          <select
            value={idState}
            onChange={(e) => {
              const next = e.target.value;
              setIdState(next);
            }}
            className="w-full bg-neutral-800 border border-slate-700 rounded-md px-2.5 py-2 text-sm text-white"
          >
            {["Unknown", "Genus", "AI ID", "Guess", "Confirmed"].map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400">Plot</label>
          <select
            value={plot}
            onChange={(e) => setPlot(e.target.value)}
            className="w-full bg-neutral-800 border border-slate-700 rounded-md px-2.5 py-2 text-sm text-white"
            disabled={locked}
          >
            <option value="">Select plot</option>
            {uniqueValues.plot.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400">Experience</label>
          <select
            value={experiencePoint}
            onChange={(e) => setExperiencePoint(e.target.value)}
            className="w-full bg-neutral-800 border border-slate-700 rounded-md px-2.5 py-2 text-sm text-white"
            disabled={locked}
          >
            <option value="">Select experience</option>
            {uniqueValues.experiencePoint.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400">Sensor</label>
          <select
            value={sensorId}
            onChange={(e) => setSensorId(e.target.value)}
            className="w-full bg-neutral-800 border border-slate-700 rounded-md px-2.5 py-2 text-sm text-white"
            disabled={locked}
          >
            <option value="">Select sensor</option>
            {uniqueValues.sensorId.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400">Deployment</label>
          <select
            value={deploymentId}
            onChange={(e) => setDeploymentId(e.target.value)}
            className="w-full bg-neutral-800 border border-slate-700 rounded-md px-2.5 py-2 text-sm text-white"
            disabled={locked}
          >
            <option value="">Select deployment</option>
            {uniqueValues.deploymentId.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>

      {status === "display" && (
        <div className="flex items-center gap-2.5">
          <label className="text-xs text-slate-400">Active</label>
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="h-4 w-4 accent-lime-400"
          />
        </div>
      )}

      <div className="flex justify-end gap-2.5">
        <button
          onClick={() => onDelete(file.fileId)}
          className="px-3.5 py-2 rounded-md bg-red-600 text-white font-semibold hover-bg-red-500 transition text-sm"
        >
          Delete
        </button>
        <button
          onClick={save}
          className="px-3.5 py-2 rounded-md bg-lime-400 text-black font-semibold hover:bg-lime-300 transition text-sm"
        >
          Save
        </button>
      </div>
    </div>
  );
}
