// src/components/MetadataForm.tsx
import { useState } from "react";
import { VideoTrimmer } from "./VideoTrimmer"; // ✅ use the new standalone trimmer
import editIcon from "../assets/editicon.svg";
import deleteIcon from "../assets/deleteIcon.svg";

type Props = {
  file: File;
  defaultValues: {
    species: string;
    experiencePoint: string;
    sensorId: string;
    deploymentId: string;
    experienceId: string;
  };
  onSave?: (data: any) => void;
  onDelete?: () => void;
};

type OptionMap = {
  [plot: string]: {
    [experience: string]: {
      [sensor: string]: string | string[];
    };
  };
};

export function MetadataForm({ file, defaultValues, onSave, onDelete }: Props) {
  const [species, setSpecies] = useState(defaultValues.species);
  const [plot, setPlot] = useState<string | null>(null);
  const [experience, setExperience] = useState<string | null>(null);
  const [sensor, setSensor] = useState<string | null>(null);
  const [deployment, setDeployment] = useState<string | null>(null);
  const [trimModal, setTrimModal] = useState(false);
  const [localFile, setLocalFile] = useState<File>(file);

  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [success, setSuccess] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL;

  const data: OptionMap = {
    "Horto Alegria": {
      "XP1 - Cavidades": {
        Sensor_ID_63: "Deployment_ID_49",
        Sensor_ID_65: "Deployment_ID_51",
        Sensor_ID_66: "Deployment_ID_52",
        Sensor_ID_67: "Deployment_ID_53",
        Sensor_ID_64: "Deployment_ID_50",
      },
      "XP2 - Intacta": {
        Sensor_ID_58: "Deployment_ID_44",
        Sensor_ID_59: "Deployment_ID_45",
        Sensor_ID_60: "Deployment_ID_46",
        Sensor_ID_61: "Deployment_ID_47",
        Sensor_ID_62: "Deployment_ID_48",
      },
      "XP3 - Germano": { Sensor_ID_72: "Deployment_ID_58" },
    },
    "Mina Aguas Claras": {
      "Mata-atlantica rehab": { Sensor_ID_0: "Deployment_ID_0" },
      "Cerrado reabilitation": {
        Sensor_ID_4: "Deployment_ID_13",
        Sensor_ID_12: "Deployment_ID_14",
        Sensor_ID_18: "Deployment_ID_9",
        Sensor_ID_23: "Deployment_ID_11",
        Sensor_ID_27: "Deployment_ID_10",
        Sensor_ID_31: "Deployment_ID_12",
      },
      "Cerrado Mature": {
        Sensor_ID_2: "Deployment_ID_25",
        Sensor_ID_13: ["Deployment_ID_26", "Deployment_ID_27"],
        Sensor_ID_21: "Deployment_ID_21",
        Sensor_ID_25: "Deployment_ID_23",
        Sensor_ID_29: ["Deployment_ID_22", "Deployment_ID_24"],
      },
      "Mata-atlantica intact": {
        Sensor_ID_3: "Deployment_ID_5",
        Sensor_ID_7: "Deployment_ID_6",
        Sensor_ID_9: "Deployment_ID_7",
        Sensor_ID_10: "Deployment_ID_8",
        Sensor_ID_17: "Deployment_ID_1",
        Sensor_ID_22: "Deployment_ID_3",
        Sensor_ID_27: "Deployment_ID_2",
        Sensor_ID_30: "Deployment_ID_4",
      },
      "Mature forest edge": {
        Sensor_ID_4: "Deployment_ID_19",
        Sensor_ID_16: "Deployment_ID_20",
        Sensor_ID_20: "Deployment_ID_15",
        Sensor_ID_24: "Deployment_ID_17",
        Sensor_ID_28: "Deployment_ID_16",
        Sensor_ID_32: "Deployment_ID_18",
      },
    },
    Gaio: {
      "XP1 - Fronteira": {
        Sensor_ID_54: "Deployment_ID_40",
        Sensor_ID_55: "Deployment_ID_41",
        Sensor_ID_56: "Deployment_ID_42",
        Sensor_ID_57: "Deployment_ID_43",
      },
      "XP2 - Transicao": {
        Sensor_ID_50: "Deployment_ID_36",
        Sensor_ID_51: "Deployment_ID_37",
        Sensor_ID_52: "Deployment_ID_38",
        Sensor_ID_53: "Deployment_ID_39",
      },
      "XP3 - Crescimento": {
        Sensor_ID_41: "Deployment_ID_32",
        Sensor_ID_42: "Deployment_ID_33",
        Sensor_ID_43: "Deployment_ID_34",
        Sensor_ID_49: "Deployment_ID_35",
      },
      "XP4 - Independente": {
        Sensor_ID_37: "Deployment_ID_28",
        Sensor_ID_38: "Deployment_ID_29",
        Sensor_ID_39: "Deployment_ID_30",
        Sensor_ID_40: "Deployment_ID_31",
      },
      "XP5 - Selvageria": {
        Sensor_ID_68: "Deployment_ID_54",
        Sensor_ID_69: "Deployment_ID_55",
        Sensor_ID_70: "Deployment_ID_56",
        Sensor_ID_71: "Deployment_ID_57",
      },
    },
  };

  async function handleUpload() {
    if (!localFile) return alert("No file found.");
    if (!plot || !experience || !sensor || !deployment)
      return alert("Please complete all selections first.");

    setSaving(true);
    setProgress(0);
    setSuccess(false);

    try {
      // Step 1 — get presigned URL
      const presignRes = await fetch(`${API_URL}/api/upload/presign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: localFile.name,
          contentType: localFile.type || "application/octet-stream",
        }),
      });
      const { uploadUrl, key } = await presignRes.json();

      // Step 2 — upload to S3
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", localFile.type);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable)
            setProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () =>
          xhr.status < 300 ? resolve() : reject(new Error("Upload failed"));
        xhr.onerror = () => reject(new Error("Network error"));
        xhr.send(localFile);
      });

      // Step 3 — save metadata
      const metaRes = await fetch(`${API_URL}/api/upload/metadata`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId: key,
          filename: localFile.name,
          species,
          plot,
          experiencePoint: experience,
          sensorId: sensor,
          deploymentId: deployment,
        }),
      });

      const metaData = await metaRes.json();
      if (!metaData.success)
        throw new Error(metaData.error || "Failed to save metadata");

      setSuccess(true);
      onSave?.(metaData.item);
    } catch (err: any) {
      alert("Upload failed: " + err.message);
    } finally {
      setSaving(false);
      setProgress(0);
    }
  }

  const renderOptions = (options: string[], onSelect: (val: string) => void) => (
    <div className="flex flex-wrap gap-3 justify-center">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onSelect(opt)}
          className="px-4 py-2 bg-neutral-800 text-slate-200 rounded-md border border-slate-700 hover:bg-lime-500 hover:text-black transition"
        >
          {opt}
        </button>
      ))}
    </div>
  );

  return (
    <div className="w-full max-w-3xl flex flex-col gap-6 px-2">
      {trimModal && (
        <VideoTrimmer
          file={localFile}
          onTrimmed={(trimmed: File) => setLocalFile(trimmed)}
          onClose={() => setTrimModal(false)}
        />
      )}

      {/* Species + Actions */}
      <div className="flex flex-col gap-2">
        <label className="text-sm text-slate-300">Species name</label>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={species}
            onChange={(e) => setSpecies(e.target.value)}
            placeholder="Enter species"
            className="flex-1 h-12 rounded-md bg-transparent border border-slate-600 px-4 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-lime-500/40 focus:border-lime-500 transition"
          />

          {/* Trim button */}
          <button
          type="button"
          onClick={() => setTrimModal(true)}
          className="w-9 h-9 flex items-center justify-center rounded-full border border-slate-600 bg-neutral-800 hover:bg-lime-500 transition"
          title="Trim video"
          >
            <img
            src={editIcon}
            alt="Trim"
            className="w-5 h-5 invert group-hover:invert-0 transition"
            />
            </button>

          {/* Delete button */}
          <button
            type="button"
            onClick={onDelete}
            className="w-9 h-9 flex items-center justify-center rounded-full border border-red-500/70 text-red-400 bg-neutral-800 hover:bg-red-500 hover:text-black transition"
            title="Remove from upload list"
          >
            <img
            src={deleteIcon}
            alt="Trim"
            className="w-5 h-5 invert group-hover:invert-0 transition"
            />
          </button>
        </div>
      </div>

      {/* Steps remain unchanged */}
      {!plot && (
        <>
          <h3 className="text-lg font-semibold text-lime-400">Select Plot</h3>
          {renderOptions(Object.keys(data), setPlot)}
        </>
      )}

      {plot && !experience && (
        <>
          <h3 className="text-lg font-semibold text-lime-400">
            Select Experience Point
          </h3>
          {renderOptions(Object.keys(data[plot]), setExperience)}
        </>
      )}

      {plot && experience && !sensor && (
        <>
          <h3 className="text-lg font-semibold text-lime-400">Select Sensor</h3>
          {renderOptions(Object.keys(data[plot][experience]), setSensor)}
        </>
      )}

      {plot && experience && sensor && !deployment && (
        <>
          <h3 className="text-lg font-semibold text-lime-400">
            Select Deployment
          </h3>
          <div className="flex flex-wrap justify-center gap-3">
            {Array.isArray(data[plot][experience][sensor])
              ? (data[plot][experience][sensor] as string[]).map((dep) => (
                  <button
                    key={dep}
                    onClick={() => setDeployment(dep)}
                    className="px-4 py-2 bg-neutral-800 text-slate-200 rounded-md border border-slate-700 hover:bg-lime-500 hover:text-black transition"
                  >
                    {dep}
                  </button>
                ))
              : (
                <button
                  onClick={() =>
                    setDeployment(data[plot][experience][sensor] as string)
                  }
                  className="px-4 py-2 bg-neutral-800 text-slate-200 rounded-md border border-slate-700 hover:bg-lime-500 hover:text-black transition"
                >
                  {data[plot][experience][sensor]}
                </button>
              )}
          </div>
        </>
      )}

      {plot && experience && sensor && deployment && (
        <div className="flex flex-col gap-3 mt-6">
          <button
            onClick={handleUpload}
            disabled={saving}
            className={`bg-lime-400 text-neutral-900 font-semibold px-6 py-2 rounded-md transition ${
              saving ? "opacity-50 cursor-wait" : "hover:bg-lime-300"
            }`}
          >
            {saving
              ? progress > 0
                ? `Uploading ${progress}%...`
                : "Uploading..."
              : success
              ? "Uploaded ✅"
              : "Upload & Save"}
          </button>

          {saving && (
            <div className="w-full bg-slate-700 rounded-md h-2 overflow-hidden">
              <div
                className="bg-lime-400 h-2 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
