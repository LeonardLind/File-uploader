import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

type MetadataItem = {
  fileId: string;
  thumbnailId?: string;
  highlightThumbnailId?: string;
  filename: string;
  species?: string;
  plot?: string;
  experiencePoint?: string;
  sensorId?: string;
  deploymentId?: string;
  updatedAt?: string;
  highlight?: boolean;
  displayState?: string;
  trimStartSec?: number;
  trimEndSec?: number;
  id_state?: string;
};

type Status = "register" | "finish" | "action";
type ViewFilter = "draft" | "done" | "action";

type CameraAutofill = {
  plot: string;
  sensorId: string;
  deploymentId: string;
  experiencePoint: string;
};

// Generated mapping CAM001..CAM057 from project spec
const cameraMetadataMap: Record<string, CameraAutofill> = {
  CAM001: { plot: "Horto Alegria", experiencePoint: "XP1 - Cavidades", sensorId: "Sensor_ID_63", deploymentId: "Deployment_ID_49" },
  CAM002: { plot: "Horto Alegria", experiencePoint: "XP1 - Cavidades", sensorId: "Sensor_ID_65", deploymentId: "Deployment_ID_51" },
  CAM003: { plot: "Horto Alegria", experiencePoint: "XP1 - Cavidades", sensorId: "Sensor_ID_66", deploymentId: "Deployment_ID_52" },
  CAM004: { plot: "Horto Alegria", experiencePoint: "XP1 - Cavidades", sensorId: "Sensor_ID_67", deploymentId: "Deployment_ID_53" },
  CAM005: { plot: "Horto Alegria", experiencePoint: "XP1 - Cavidades", sensorId: "Sensor_ID_64", deploymentId: "Deployment_ID_50" },
  CAM006: { plot: "Horto Alegria", experiencePoint: "XP2 - Intacta", sensorId: "Sensor_ID_58", deploymentId: "Deployment_ID_44" },
  CAM007: { plot: "Horto Alegria", experiencePoint: "XP2 - Intacta", sensorId: "Sensor_ID_59", deploymentId: "Deployment_ID_45" },
  CAM008: { plot: "Horto Alegria", experiencePoint: "XP2 - Intacta", sensorId: "Sensor_ID_60", deploymentId: "Deployment_ID_46" },
  CAM009: { plot: "Horto Alegria", experiencePoint: "XP2 - Intacta", sensorId: "Sensor_ID_61", deploymentId: "Deployment_ID_47" },
  CAM010: { plot: "Horto Alegria", experiencePoint: "XP2 - Intacta", sensorId: "Sensor_ID_62", deploymentId: "Deployment_ID_48" },
  CAM011: { plot: "Horto Alegria", experiencePoint: "XP3 - Germano", sensorId: "Sensor_ID_72", deploymentId: "Deployment_ID_58" },
  CAM012: { plot: "Mina Aguas Claras", experiencePoint: "Mata-atlantica rehab", sensorId: "Sensor_ID_0", deploymentId: "Deployment_ID_0" },
  CAM013: { plot: "Mina Aguas Claras", experiencePoint: "Cerrado reabilitation", sensorId: "Sensor_ID_4", deploymentId: "Deployment_ID_13" },
  CAM014: { plot: "Mina Aguas Claras", experiencePoint: "Cerrado reabilitation", sensorId: "Sensor_ID_12", deploymentId: "Deployment_ID_14" },
  CAM015: { plot: "Mina Aguas Claras", experiencePoint: "Cerrado reabilitation", sensorId: "Sensor_ID_18", deploymentId: "Deployment_ID_9" },
  CAM016: { plot: "Mina Aguas Claras", experiencePoint: "Cerrado reabilitation", sensorId: "Sensor_ID_23", deploymentId: "Deployment_ID_11" },
  CAM017: { plot: "Mina Aguas Claras", experiencePoint: "Cerrado reabilitation", sensorId: "Sensor_ID_27", deploymentId: "Deployment_ID_10" },
  CAM018: { plot: "Mina Aguas Claras", experiencePoint: "Cerrado reabilitation", sensorId: "Sensor_ID_31", deploymentId: "Deployment_ID_12" },
  CAM019: { plot: "Mina Aguas Claras", experiencePoint: "Cerrado Mature", sensorId: "Sensor_ID_2", deploymentId: "Deployment_ID_25" },
  CAM020: { plot: "Mina Aguas Claras", experiencePoint: "Cerrado Mature", sensorId: "Sensor_ID_13", deploymentId: "Deployment_ID_26" },
  CAM021: { plot: "Mina Aguas Claras", experiencePoint: "Cerrado Mature", sensorId: "Sensor_ID_21", deploymentId: "Deployment_ID_21" },
  CAM022: { plot: "Mina Aguas Claras", experiencePoint: "Cerrado Mature", sensorId: "Sensor_ID_25", deploymentId: "Deployment_ID_23" },
  CAM023: { plot: "Mina Aguas Claras", experiencePoint: "Cerrado Mature", sensorId: "Sensor_ID_29", deploymentId: "Deployment_ID_22" },
  CAM024: { plot: "Mina Aguas Claras", experiencePoint: "Mata-atlantica intact", sensorId: "Sensor_ID_3", deploymentId: "Deployment_ID_5" },
  CAM025: { plot: "Mina Aguas Claras", experiencePoint: "Mata-atlantica intact", sensorId: "Sensor_ID_7", deploymentId: "Deployment_ID_6" },
  CAM026: { plot: "Mina Aguas Claras", experiencePoint: "Mata-atlantica intact", sensorId: "Sensor_ID_9", deploymentId: "Deployment_ID_7" },
  CAM027: { plot: "Mina Aguas Claras", experiencePoint: "Mata-atlantica intact", sensorId: "Sensor_ID_10", deploymentId: "Deployment_ID_8" },
  CAM028: { plot: "Mina Aguas Claras", experiencePoint: "Mata-atlantica intact", sensorId: "Sensor_ID_17", deploymentId: "Deployment_ID_1" },
  CAM029: { plot: "Mina Aguas Claras", experiencePoint: "Mata-atlantica intact", sensorId: "Sensor_ID_22", deploymentId: "Deployment_ID_3" },
  CAM030: { plot: "Mina Aguas Claras", experiencePoint: "Mata-atlantica intact", sensorId: "Sensor_ID_27", deploymentId: "Deployment_ID_2" },
  CAM031: { plot: "Mina Aguas Claras", experiencePoint: "Mata-atlantica intact", sensorId: "Sensor_ID_30", deploymentId: "Deployment_ID_4" },
  CAM032: { plot: "Mina Aguas Claras", experiencePoint: "Mature forest edge", sensorId: "Sensor_ID_4", deploymentId: "Deployment_ID_19" },
  CAM033: { plot: "Mina Aguas Claras", experiencePoint: "Mature forest edge", sensorId: "Sensor_ID_16", deploymentId: "Deployment_ID_20" },
  CAM034: { plot: "Mina Aguas Claras", experiencePoint: "Mature forest edge", sensorId: "Sensor_ID_20", deploymentId: "Deployment_ID_15" },
  CAM035: { plot: "Mina Aguas Claras", experiencePoint: "Mature forest edge", sensorId: "Sensor_ID_24", deploymentId: "Deployment_ID_17" },
  CAM036: { plot: "Mina Aguas Claras", experiencePoint: "Mature forest edge", sensorId: "Sensor_ID_28", deploymentId: "Deployment_ID_16" },
  CAM037: { plot: "Mina Aguas Claras", experiencePoint: "Mature forest edge", sensorId: "Sensor_ID_32", deploymentId: "Deployment_ID_18" },
  CAM038: { plot: "Gaio", experiencePoint: "XP1 Fronteira", sensorId: "Sensor_ID_54", deploymentId: "Deployment_ID_40" },
  CAM039: { plot: "Gaio", experiencePoint: "XP1 Fronteira", sensorId: "Sensor_ID_55", deploymentId: "Deployment_ID_41" },
  CAM040: { plot: "Gaio", experiencePoint: "XP1 Fronteira", sensorId: "Sensor_ID_56", deploymentId: "Deployment_ID_42" },
  CAM041: { plot: "Gaio", experiencePoint: "XP1 Fronteira", sensorId: "Sensor_ID_57", deploymentId: "Deployment_ID_43" },
  CAM042: { plot: "Gaio", experiencePoint: "XP2 Transicao", sensorId: "Sensor_ID_50", deploymentId: "Deployment_ID_36" },
  CAM043: { plot: "Gaio", experiencePoint: "XP2 Transicao", sensorId: "Sensor_ID_51", deploymentId: "Deployment_ID_37" },
  CAM044: { plot: "Gaio", experiencePoint: "XP2 Transicao", sensorId: "Sensor_ID_52", deploymentId: "Deployment_ID_38" },
  CAM045: { plot: "Gaio", experiencePoint: "XP2 Transicao", sensorId: "Sensor_ID_53", deploymentId: "Deployment_ID_39" },
  CAM046: { plot: "Gaio", experiencePoint: "XP3 Crescimento", sensorId: "Sensor_ID_41", deploymentId: "Deployment_ID_32" },
  CAM047: { plot: "Gaio", experiencePoint: "XP3 Crescimento", sensorId: "Sensor_ID_42", deploymentId: "Deployment_ID_33" },
  CAM048: { plot: "Gaio", experiencePoint: "XP3 Crescimento", sensorId: "Sensor_ID_43", deploymentId: "Deployment_ID_34" },
  CAM049: { plot: "Gaio", experiencePoint: "XP3 Crescimento", sensorId: "Sensor_ID_49", deploymentId: "Deployment_ID_35" },
  CAM050: { plot: "Gaio", experiencePoint: "XP4 Independente", sensorId: "Sensor_ID_37", deploymentId: "Deployment_ID_28" },
  CAM051: { plot: "Gaio", experiencePoint: "XP4 Independente", sensorId: "Sensor_ID_38", deploymentId: "Deployment_ID_29" },
  CAM052: { plot: "Gaio", experiencePoint: "XP4 Independente", sensorId: "Sensor_ID_39", deploymentId: "Deployment_ID_30" },
  CAM053: { plot: "Gaio", experiencePoint: "XP4 Independente", sensorId: "Sensor_ID_40", deploymentId: "Deployment_ID_31" },
  CAM054: { plot: "Gaio", experiencePoint: "XP5 Selvageria", sensorId: "Sensor_ID_68", deploymentId: "Deployment_ID_54" },
  CAM055: { plot: "Gaio", experiencePoint: "XP5 Selvageria", sensorId: "Sensor_ID_69", deploymentId: "Deployment_ID_55" },
  CAM056: { plot: "Gaio", experiencePoint: "XP5 Selvageria", sensorId: "Sensor_ID_70", deploymentId: "Deployment_ID_56" },
  CAM057: { plot: "Gaio", experiencePoint: "XP5 Selvageria", sensorId: "Sensor_ID_71", deploymentId: "Deployment_ID_57" },
};

const REQUIRED_FIELDS: Array<keyof MetadataItem> = [
  "species",
  "plot",
  "experiencePoint",
  "sensorId",
  "deploymentId",
];

function isComplete(item: MetadataItem) {
  return REQUIRED_FIELDS.every((key) => Boolean(item[key]));
}

function deriveStatus(item: MetadataItem): Status {
  if (item.highlight) return "action";
  if (isComplete(item)) return "finish";
  return "register";
}

function dataUrlToBlob(dataUrl: string) {
  const [meta, content] = dataUrl.split(",");
  const mime = meta.match(/:(.*?);/)?.[1] ?? "image/jpeg";
  const binary = atob(content);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
  return new Blob([array], { type: mime });
}

function extractCameraName(key?: string): string | null {
  if (!key) return null;
  const base = key.split("/").pop() ?? key;
  const match = base.match(/(CAM\d{3})/i);
  return match ? match[1].toUpperCase() : null;
}

type HighlightEditorProps = {
  file: MetadataItem;
  bucket: string;
  apiUrl: string;
  onClose: () => void;
  onSaved: (updates: Partial<MetadataItem>) => void;
};

function HighlightEditor({ file, bucket, apiUrl, onClose, onSaved }: HighlightEditorProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [trimStart, setTrimStart] = useState<number>(file.trimStartSec ?? 0);
  const [trimEnd, setTrimEnd] = useState<number>(file.trimEndSec ?? 0);
  const [frameTime, setFrameTime] = useState<number>(file.trimStartSec ?? 0);
  const [framePreview, setFramePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const videoUrl = `https://${bucket}.s3.amazonaws.com/${file.fileId}`;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = frameTime;
  }, [frameTime]);

  const captureFrame = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setFramePreview(dataUrl);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      let highlightThumbnailId = file.highlightThumbnailId || file.thumbnailId;

      if (framePreview) {
        const blob = dataUrlToBlob(framePreview);
        const presignRes = await fetch(`${apiUrl}/api/upload/presign`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: `highlight_${file.filename}.jpg`,
            contentType: "image/jpeg",
            type: "thumbnail",
          }),
        });

        const presignData = await presignRes.json();
        if (!presignData.uploadUrl || !presignData.key) {
          throw new Error("Failed to get upload URL for thumbnail");
        }

        await fetch(presignData.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": "image/jpeg" },
          body: blob,
        });

        highlightThumbnailId = presignData.key;
      }

      await fetch(`${apiUrl}/api/upload/metadata/update`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId: file.fileId,
          highlight: true,
          displayState: "Action",
          trimStartSec: trimStart,
          trimEndSec: trimEnd,
          highlightThumbnailId,
        }),
      });

      onSaved({
        highlight: true,
        displayState: "Action",
        trimStartSec: trimStart,
        trimEndSec: trimEnd,
        highlightThumbnailId,
        updatedAt: new Date().toISOString(),
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save highlight settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="bg-neutral-900 border border-slate-800 rounded-xl w-full max-w-5xl shadow-2xl p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Highlight editor</h2>
            <p className="text-slate-400 text-sm">
              Mark trim points and capture a thumbnail frame for downstream web use.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white px-3 py-1 rounded-md border border-slate-700"
          >
            Close
          </button>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-black rounded-lg overflow-hidden border border-slate-800">
            <video
              ref={videoRef}
              src={videoUrl}
              controls
              className="w-full h-[260px] object-contain bg-black"
              onLoadedMetadata={(e) => {
                const dur = (e.target as HTMLVideoElement).duration;
                if (isFinite(dur)) {
                  setDuration(dur);
                  if (!trimEnd) setTrimEnd(Math.max(trimStart, Math.round(dur)));
                }
              }}
            />

            <div className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <label className="text-sm text-slate-300 w-28">Frame time</label>
                <input
                  type="range"
                  min={0}
                  max={duration ?? Math.max(trimEnd, trimStart + 1)}
                  step={0.1}
                  value={frameTime}
                  onChange={(e) => setFrameTime(Number(e.target.value))}
                  className="flex-1"
                />
                <input
                  type="number"
                  className="w-20 bg-neutral-800 border border-slate-700 rounded px-2 py-1 text-sm text-white"
                  value={frameTime}
                  onChange={(e) => setFrameTime(Number(e.target.value))}
                  min={0}
                  max={duration ?? undefined}
                  step={0.1}
                />
              </div>

              <div className="flex items-center gap-3">
                <label className="text-sm text-slate-300 w-28">Trim start</label>
                <input
                  type="number"
                  className="w-24 bg-neutral-800 border border-slate-700 rounded px-2 py-1 text-sm text-white"
                  value={trimStart}
                  min={0}
                  max={trimEnd || undefined}
                  step={0.1}
                  onChange={(e) => setTrimStart(Number(e.target.value))}
                />

                <label className="text-sm text-slate-300">Trim end</label>
                <input
                  type="number"
                  className="w-24 bg-neutral-800 border border-slate-700 rounded px-2 py-1 text-sm text-white"
                  value={trimEnd}
                  min={trimStart}
                  step={0.1}
                  onChange={(e) => setTrimEnd(Number(e.target.value))}
                />
              </div>

              <button
                onClick={captureFrame}
                className="px-4 py-2 rounded-md bg-blue-500 text-black font-semibold hover:bg-blue-400 transition"
              >
                Capture frame
              </button>
            </div>
          </div>

          <div className="bg-neutral-950 border border-slate-800 rounded-lg p-4 flex flex-col gap-4">
            <h3 className="text-lg font-semibold text-white">Thumbnail preview</h3>
            {framePreview ? (
              <img
                src={framePreview}
                alt="Captured frame"
                className="w-full max-h-64 object-contain rounded-md border border-slate-800"
              />
            ) : (
              <div className="w-full h-64 bg-neutral-900 border border-dashed border-slate-700 rounded-md flex items-center justify-center text-slate-500 text-sm">
                Capture a frame to preview
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 rounded-md bg-lime-400 text-black font-semibold hover:bg-lime-300 transition disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save highlight"}
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-md border border-slate-700 text-slate-200 hover:border-slate-500 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

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
    status: "done" | "action";
    id_state: string;
  }) => void;
};

function EditPane({ file, bucket, uniqueValues, onClose, onSave }: EditPaneProps) {
  const [species, setSpecies] = useState(file.species ?? "");
  const [plot, setPlot] = useState(file.plot ?? "");
  const [experiencePoint, setExperiencePoint] = useState(file.experiencePoint ?? "");
  const [sensorId, setSensorId] = useState(file.sensorId ?? "");
  const [deploymentId, setDeploymentId] = useState(file.deploymentId ?? "");
  const [status, setStatus] = useState<"done" | "action">(
    file.highlight ? "action" : "done"
  );
  const [idState, setIdState] = useState(file.id_state || "Unknown");

  const locked = deriveStatus(file) === "action";

  useEffect(() => {
    setSpecies(file.species ?? "");
    setPlot(file.plot ?? "");
    setExperiencePoint(file.experiencePoint ?? "");
    setSensorId(file.sensorId ?? "");
    setDeploymentId(file.deploymentId ?? "");
    setStatus(file.highlight ? "action" : "done");
    setIdState(file.id_state || "Unknown");
  }, [file]);

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
    });
  };

  return (
    <div className="rounded-lg border border-slate-800 bg-neutral-900 shadow-md p-4 h-full flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Edit metadata</h2>
          <p className="text-slate-400 text-sm">{file.filename}</p>
        </div>
        <button
          onClick={onClose}
          className="px-3 py-1.5 text-sm rounded-md border border-slate-700 text-slate-200 hover:border-slate-500 transition"
        >
          Close
        </button>
      </div>

      <div className="bg-black rounded-lg overflow-hidden border border-slate-800">
        <video
          src={`https://${bucket}.s3.amazonaws.com/${file.fileId}`}
          controls
          className="w-full h-[260px] object-contain bg-black"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400">Species</label>
          <input
            value={species}
            onChange={(e) => setSpecies(e.target.value)}
            className="w-full bg-neutral-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-white"
            placeholder="Enter species"
            disabled={locked}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as "done" | "action")}
            className="w-full bg-neutral-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-white"
          >
            <option value="done">Done</option>
            <option value="action">Action</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400">ID State</label>
          <select
            value={idState}
            onChange={(e) => setIdState(e.target.value)}
            className="w-full bg-neutral-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-white"
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
            className="w-full bg-neutral-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-white"
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
            className="w-full bg-neutral-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-white"
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
            className="w-full bg-neutral-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-white"
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
            className="w-full bg-neutral-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-white"
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

      <div className="flex justify-end gap-3">
        <button
          onClick={save}
          className="px-4 py-2 rounded-md bg-lime-400 text-black font-semibold hover:bg-lime-300 transition"
        >
          Save
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-md border border-slate-700 text-slate-200 hover:border-slate-500 transition"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export function GalleryPage() {
  const [files, setFiles] = useState<MetadataItem[]>([]);
  const [filtered, setFiltered] = useState<MetadataItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [highlightEditor, setHighlightEditor] = useState<MetadataItem | null>(null);
  const [editing, setEditing] = useState<MetadataItem | null>(null);
  const [view, setView] = useState<ViewFilter>("draft");

  const [filters, setFilters] = useState({
    species: "",
    plot: "",
    experiencePoint: "",
    sensorId: "",
    deploymentId: "",
    updatedSort: "desc",
  });

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 7;

  const API_URL = import.meta.env.VITE_API_URL;
  const BUCKET_NAME = import.meta.env.VITE_AWS_BUCKET;
  const location = useLocation();
  const autoFilledIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/api/upload/metadata`);
        const data = await res.json();

        if (!data.success) throw new Error(data.error);

        const items = (data.items || []).map((item: MetadataItem) => ({
          ...item,
          id_state: item.id_state || "Unknown",
        }));
        setFiles(items);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load metadata");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [API_URL]);

  const uniqueValues = useMemo(() => {
    const getUnique = (key: keyof MetadataItem) =>
      Array.from(new Set(files.map((f) => f[key]).filter(Boolean))) as string[];
    return {
      species: getUnique("species"),
      plot: getUnique("plot"),
      experiencePoint: getUnique("experiencePoint"),
      sensorId: getUnique("sensorId"),
      deploymentId: getUnique("deploymentId"),
      id_state: getUnique("id_state"),
    };
  }, [files]);

  useEffect(() => {
    let result = [...files];

    Object.entries(filters).forEach(([key, value]) => {
      if (key !== "updatedSort" && value) {
        result = result.filter((f) => {
          const candidate = f[key as keyof MetadataItem];
          return typeof candidate === "string" && candidate.toLowerCase() === value.toLowerCase();
        });
      }
    });

    const nextView = (new URLSearchParams(location.search).get("view") as ViewFilter | null) || "draft";
    setView(nextView);
    if (nextView === "done") {
      result = result.filter((f) => deriveStatus(f) === "finish");
    } else if (nextView === "action") {
      result = result.filter((f) => deriveStatus(f) === "action");
    } else {
      result = result.filter((f) => deriveStatus(f) === "register");
    }

    result.sort((a, b) => {
      const da = new Date(a.updatedAt || 0).getTime();
      const db = new Date(b.updatedAt || 0).getTime();
      return filters.updatedSort === "asc" ? da - db : db - da;
    });

    setFiltered(result);
    setCurrentPage(1);
  }, [files, filters, location.search]);

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
          await fetch(`${API_URL}/api/upload/metadata/update`, {
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
            updatedAt: new Date().toISOString(),
          });
          autoFilledIds.current.add(file.fileId);
        } catch (err: unknown) {
          console.error("Autofill failed", err);
        }
      }
    }

    autofillMissing();
  }, [files, API_URL]);

  const handleFilterChange = (key: keyof typeof filters, value: string) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  const clearFilters = () =>
    setFilters({
      species: "",
      plot: "",
      experiencePoint: "",
      sensorId: "",
      deploymentId: "",
      updatedSort: "desc",
    });

  const updateLocal = (fileId: string, updates: Partial<MetadataItem>) => {
    setFiles((prev) => prev.map((f) => (f.fileId === fileId ? { ...f, ...updates } : f)));
  };

  const handleRowDoubleClick = (file: MetadataItem) => {
    if (view === "action") {
      setHighlightEditor(file);
    } else {
      setEditing(file);
    }
  };

  const handleSaveEdit = async (payload: {
    species?: string;
    plot?: string;
    experiencePoint?: string;
    sensorId?: string;
    deploymentId?: string;
    status: "done" | "action";
    id_state: string;
  }) => {
    if (!editing) return;
    const nextHighlight = payload.status === "action";
    const nextDisplay = nextHighlight ? "Action" : "Showcase";

    try {
      const res = await fetch(`${API_URL}/api/upload/metadata/update`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId: editing.fileId,
          species: payload.species,
          plot: payload.plot,
          experiencePoint: payload.experiencePoint,
          sensorId: payload.sensorId,
          deploymentId: payload.deploymentId,
          id_state: payload.id_state,
          highlight: nextHighlight,
          displayState: nextDisplay,
        }),
      });

      const result = await res.json();
      if (!result?.success) {
        throw new Error(result?.error || "Metadata update failed");
      }

      updateLocal(editing.fileId, {
        ...payload,
        highlight: nextHighlight,
        displayState: nextDisplay,
        updatedAt: new Date().toISOString(),
      });
      setEditing((prev) =>
        prev ? { ...prev, ...payload, highlight: nextHighlight, displayState: nextDisplay } : null
      );

      const currentIndex = filtered.findIndex((f) => f.fileId === editing.fileId);
      if (currentIndex >= 0 && currentIndex < filtered.length - 1) {
        setEditing(filtered[currentIndex + 1]);
      }
    } catch (err: unknown) {
      console.error("Failed to save metadata", err);
      alert("Save failed");
    }
  };

  const statusStyles: Record<
    Status,
    { bg: string; text: string; label: string }
  > = {
    register: { bg: "bg-slate-700", text: "text-white", label: "Register" },
    finish: { bg: "bg-green-500", text: "text-black", label: "Finish" },
    action: { bg: "bg-blue-500", text: "text-black", label: "Action" },
  };

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedItems = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    (currentPage - 1) * ITEMS_PER_PAGE + ITEMS_PER_PAGE
  );

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  const renderPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else if (currentPage <= 3) {
      pages.push(1, 2, 3, 4, "...", totalPages);
    } else if (currentPage >= totalPages - 2) {
      pages.push(
        1,
        "...",
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages
      );
    } else {
      pages.push(
        1,
        "...",
        currentPage - 1,
        currentPage,
        currentPage + 1,
        "...",
        totalPages
      );
    }

    return pages.map((p, i) =>
      typeof p === "number" ? (
        <button
          key={i}
          onClick={() => goToPage(p)}
          className={`px-3 py-1 rounded-md text-xs sm:text-sm font-medium ${
            p === currentPage
              ? "bg-lime-400 text-black"
              : "bg-neutral-800 text-slate-200 hover:bg-neutral-700"
          }`}
        >
          {p}
        </button>
      ) : (
        <span key={i} className="px-2 text-slate-500 text-sm">
          {p}
        </span>
      )
    );
  };

  const selectRelative = (delta: number) => {
    if (!editing) return;
    const idx = filtered.findIndex((f) => f.fileId === editing.fileId);
    if (idx === -1) return;
    const nextIdx = idx + delta;
    if (nextIdx >= 0 && nextIdx < filtered.length) {
      setEditing(filtered[nextIdx]);
    }
  };

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!editing) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        selectRelative(1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        selectRelative(-1);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [editing, filtered]);

  return (
    <div className="flex flex-col w-full h-full bg-neutral-950 text-white">
      <main className="flex flex-col flex-1 h-full px-4 sm:px-6 md:px-8 lg:px-10 py-8 items-center overflow-y-auto custom-scroll">
        <div className="w-full max-w-7xl">
          <div className="mb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold">Gallery</h1>
              <p className="text-slate-400 text-sm">
                {loading
                  ? "Loading..."
                  : `${filtered.length} of ${files.length} file${
                      files.length === 1 ? "" : "s"
                    }`}
              </p>
            </div>
          </div>

          {!loading && files.length > 0 && (
            <div className="bg-neutral-900 border border-slate-800 rounded-lg p-4 mb-8 flex flex-col md:flex-row md:flex-wrap gap-4 items-start md:items-center justify-between">
              <div className="flex flex-wrap gap-3 flex-1 min-w-0">
                {(
                  [
                    ["species", "Species"],
                    ["plot", "Plot"],
                    ["experiencePoint", "Experience"],
                    ["sensorId", "Sensor"],
                    ["deploymentId", "Deployment"],
                  ] as const
                ).map(([key, label]) => (
                  <select
                    key={key}
                    value={filters[key]}
                    onChange={(e) => handleFilterChange(key, e.target.value)}
                    className="bg-neutral-800 text-slate-200 border border-slate-700 rounded-md px-3 py-2 text-sm w-[8.5rem] md:w-[9rem]"
                  >
                    <option value="">{label}</option>
                    {uniqueValues[key].map((val) => (
                      <option key={val} value={val}>
                        {val}
                      </option>
                    ))}
                  </select>
                ))}

                <select
                  value={filters.updatedSort}
                  onChange={(e) =>
                    handleFilterChange("updatedSort", e.target.value)
                  }
                  className="bg-neutral-800 text-slate-200 border border-slate-700 rounded-md px-3 py-2 text-sm w-[10rem] md:w-[11rem]"
                >
                  <option value="desc">Newest first</option>
                  <option value="asc">Oldest first</option>
                </select>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={clearFilters}
                  className="px-3 py-2 text-sm rounded-md bg-slate-700 hover:bg-slate-600 transition"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          )}

          {error && (
            <p className="text-red-400 mb-6 text-center">Error: {error}</p>
          )}

          {loading ? (
            <p className="text-slate-400 text-center">Fetching data...</p>
          ) : filtered.length === 0 ? (
            <p className="text-slate-500 text-center">No matching results.</p>
          ) : (
            <div className={editing ? "grid grid-cols-1 lg:grid-cols-2 gap-6" : "grid grid-cols-1 gap-6"}>
              {editing && (
                <div className="w-full">
                  <EditPane
                    file={editing}
                    bucket={BUCKET_NAME}
                    uniqueValues={uniqueValues}
                    onClose={() => setEditing(null)}
                    onSave={handleSaveEdit}
                  />
                </div>
              )}

              <div className="w-full">
                <div className="overflow-x-auto rounded-lg border border-slate-800 bg-neutral-900 shadow-md">
                  <table className="min-w-full text-xs sm:text-sm text-slate-300 border-collapse">
                    <thead className="bg-neutral-800 text-slate-100 text-left uppercase text-[10px] sm:text-xs tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">ID State</th>
                        <th className="px-4 py-3">Species</th>
                        <th className="px-4 py-3">Plot</th>
                        <th className="px-4 py-3">Experience</th>
                        <th className="px-4 py-3">Sensor</th>
                        <th className="px-4 py-3">Deployment</th>
                        {view === "action" && <th className="px-4 py-3">Preview</th>}
                        <th className="px-4 py-3">Filename</th>
                        <th className="px-4 py-3">Updated</th>
                      </tr>
                    </thead>

                    <tbody>
                      {paginatedItems.map((file) => {
                        const status = deriveStatus(file);
                        const statusStyle = statusStyles[status];
                        const isActive =
                          editing?.fileId === file.fileId ||
                          highlightEditor?.fileId === file.fileId;

                        return (
                          <tr
                            key={file.fileId}
                            onDoubleClick={() => handleRowDoubleClick(file)}
                            className={`border-t border-slate-800 transition-colors cursor-pointer ${
                              isActive ? "bg-lime-400/10" : "hover:bg-neutral-800/50"
                            }`}
                          >
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${statusStyle.bg} ${statusStyle.text}`}
                              >
                                {statusStyle.label}
                              </span>
                            </td>

                            <td className="px-4 py-3">
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-100">
                                {file.id_state || "Unknown"}
                              </span>
                            </td>

                            <td className="px-4 py-3 font-medium text-white">
                              {file.species || "—"}
                            </td>

                            <td className="px-4 py-3">{file.plot || "—"}</td>

                            <td className="px-4 py-3">
                              {file.experiencePoint || "—"}
                            </td>

                            <td className="px-4 py-3">{file.sensorId || "—"}</td>

                            <td className="px-4 py-3">
                              {file.deploymentId || "—"}
                            </td>

                            {view === "action" && (
                              <td className="px-4 py-3">
                                {file.highlightThumbnailId || file.thumbnailId ? (
                                  <img
                                    src={`https://${BUCKET_NAME}.s3.amazonaws.com/${file.highlightThumbnailId || file.thumbnailId}`}
                                    alt="thumbnail"
                                    className="w-20 h-14 sm:w-24 sm:h-16 object-cover rounded-md border border-slate-700"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                ) : (
                                  <div className="w-20 h-14 sm:w-24 sm:h-16 rounded-md border border-dashed border-slate-700 bg-neutral-900 text-[10px] sm:text-xs text-slate-400 flex items-center justify-center">
                                    No thumbnail yet
                                  </div>
                                )}
                              </td>
                            )}

                            <td className="px-4 py-3 text-slate-400 truncate max-w-[10rem]">
                              {file.filename || "—"}
                            </td>

                            <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                              {file.updatedAt
                                ? new Date(file.updatedAt).toLocaleString()
                                : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`px-3 py-1 rounded-md text-xs sm:text-sm font-medium ${
                      currentPage === 1
                        ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                        : "bg-neutral-800 text-slate-200 hover:bg-neutral-700"
                    }`}
                  >
                    Previous
                  </button>

                  {renderPageNumbers()}

                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`px-3 py-1 rounded-md text-xs sm:text-sm font-medium ${
                      currentPage === totalPages
                        ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                        : "bg-neutral-800 text-slate-200 hover:bg-neutral-700"
                    }`}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {highlightEditor && (
        <HighlightEditor
          file={highlightEditor}
          bucket={BUCKET_NAME}
          apiUrl={API_URL}
          onClose={() => setHighlightEditor(null)}
          onSaved={(updates) => updateLocal(highlightEditor.fileId, updates)}
        />
      )}
    </div>
  );
}
