import { useEffect, useMemo, useState } from "react";
import type { MetadataItem } from "../types/gallery";
import { deriveStatus, type Status, type ViewFilter } from "../utils/galleryUtils";
import { HexLoader } from "./HexLoader";

type EditPaneProps = {
  file: MetadataItem;
  bucket: string;
  apiUrl: string;
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

export function EditPane({ file, bucket, apiUrl: _apiUrl, uniqueValues, onClose, onSave, onDelete, onAlert, currentView }: EditPaneProps) {
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
  const [videoLoading, setVideoLoading] = useState(true);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);

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
    setVideoLoading(true);
    setVideoDuration(null);
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
    <div className="rounded-lg border border-slate-800 bg-neutral-900 shadow-md p-2.5 h-full flex flex-col gap-2.5 md:p-3 2xl:p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="space-y-0.5">
          <h2 className="text-sm md:text-base font-semibold text-white">Edit metadata</h2>
          <p className="text-slate-400 text-[11px] md:text-xs truncate">{file.filename}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onDelete(file.fileId)}
            className="px-2.5 py-1 rounded-md border border-red-600 text-red-200 font-semibold hover:bg-red-600/10 transition text-[11px] md:text-xs"
          >
            Delete
          </button>
          <button
            onClick={save}
            className="px-3 py-1 rounded-md border border-lime-500 text-lime-100 font-semibold hover:bg-lime-400/10 transition text-[11px] md:text-xs"
          >
            Save
          </button>
          <button
            onClick={onClose}
            className="px-2.5 py-1 text-[11px] md:text-xs rounded-md border border-slate-700 text-slate-200 hover:border-slate-500 transition"
          >
            Close
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_250px] gap-2 h-full">
        <div className="flex flex-col gap-2.5">
          <div className="bg-black rounded-lg overflow-hidden border border-slate-800 relative flex-1 min-h-[220px]">
            {videoLoading && (
              <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-10 pointer-events-none">
                <HexLoader size={64} label="Loading video" />
              </div>
            )}
            <video
              src={`https://${bucket}.s3.amazonaws.com/${file.fileId}`}
              controls
              className="w-full h-full object-contain bg-black"
              onLoadedMetadata={(e) => {
                const dur = (e.target as HTMLVideoElement).duration;
                setVideoDuration(isFinite(dur) ? dur : null);
                if (isFinite(dur) && dur <= 5) {
                  setVideoLoading(false);
                }
              }}
              onTimeUpdate={(e) => {
                const vid = e.target as HTMLVideoElement;
                const dur = videoDuration ?? vid.duration;
                const threshold = isFinite(dur) && dur > 0 ? Math.min(5, dur) : 5;
                if (vid.currentTime >= threshold - 0.05) {
                  setVideoLoading(false);
                }
              }}
              onLoadedData={(e) => {
                const vid = e.target as HTMLVideoElement;
                const dur = videoDuration ?? vid.duration;
                if (isFinite(dur) && dur <= 5) {
                  setVideoLoading(false);
                }
              }}
              onError={() => setVideoLoading(false)}
            />
          </div>
        </div>

        <aside className="bg-neutral-900 border border-slate-800 rounded-lg p-3 flex flex-col gap-2.5">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-slate-400">Species</label>
            <input
              value={species}
              onChange={(e) => setSpecies(e.target.value)}
              className="w-full bg-neutral-800 border border-slate-700 rounded-md px-2 py-1.5 text-[11px] md:text-[12px] text-white"
              placeholder="Enter species"
              disabled={locked}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-slate-400">Stage</label>
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
              className="w-full bg-neutral-800 border border-slate-700 rounded-md px-2 py-1.25 text-[11px] md:text-[12px] text-white"
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
            <label className="text-[11px] text-slate-400">ID State</label>
            <select
              value={idState}
              onChange={(e) => setIdState(e.target.value)}
              className="w-full bg-neutral-800 border border-slate-700 rounded-md px-2 py-1.25 text-[11px] md:text-[12px] text-white"
            >
              {["Unknown", "Genus", "AI ID", "Guess", "Confirmed"].map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-slate-400">Plot</label>
            <select
              value={plot}
              onChange={(e) => setPlot(e.target.value)}
              className="w-full bg-neutral-800 border border-slate-700 rounded-md px-2 py-1.25 text-[11px] md:text-[12px] text-white"
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
            <label className="text-[11px] text-slate-400">Experience</label>
            <select
              value={experiencePoint}
              onChange={(e) => setExperiencePoint(e.target.value)}
              className="w-full bg-neutral-800 border border-slate-700 rounded-md px-2 py-1.25 text-[11px] md:text-[12px] text-white"
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
            <label className="text-[11px] text-slate-400">Sensor</label>
            <select
              value={sensorId}
              onChange={(e) => setSensorId(e.target.value)}
              className="w-full bg-neutral-800 border border-slate-700 rounded-md px-2 py-1.25 text-[11px] md:text-[12px] text-white"
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
            <label className="text-[11px] text-slate-400">Deployment</label>
            <select
              value={deploymentId}
              onChange={(e) => setDeploymentId(e.target.value)}
              className="w-full bg-neutral-800 border border-slate-700 rounded-md px-2 py-1.25 text-[11px] md:text-[12px] text-white"
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
          {status === "display" && (
            <label className="flex items-center gap-2 text-[11px] text-slate-400">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="h-4 w-4 accent-lime-400"
              />
              Active
            </label>
          )}
        </aside>
      </div>
    </div>
  );
}
