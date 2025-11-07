import { useState } from "react";

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
};

type OptionMap = {
  [plot: string]: {
    [experience: string]: {
      [sensor: string]: string | string[];
    };
  };
};

export function MetadataForm({ file, defaultValues, onSave }: Props) {
  const [species, setSpecies] = useState(defaultValues.species);
  const [plot, setPlot] = useState<string | null>(null);
  const [experience, setExperience] = useState<string | null>(null);
  const [sensor, setSensor] = useState<string | null>(null);
  const [deployment, setDeployment] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [success, setSuccess] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL;

  // 🧩 All option data in one nested object
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
      "XP3 - Germano": {
        Sensor_ID_72: "Deployment_ID_58",
      },
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

  // 🧭 Step-by-step state
  const step = !plot ? 1 : !experience ? 2 : !sensor ? 3 : !deployment ? 4 : 5;

  // 🧩 Upload process
  async function handleUpload() {
    if (!file) return alert("No file found.");
    if (!plot || !experience || !sensor || !deployment) {
      alert("Please complete all selections first.");
      return;
    }

    setSaving(true);
    setProgress(0);
    setSuccess(false);

    try {
      const presignRes = await fetch(`${API_URL}/api/upload/presign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || "application/octet-stream",
        }),
      });
      const { uploadUrl, key } = await presignRes.json();

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => (xhr.status < 300 ? resolve() : reject());
        xhr.onerror = () => reject();
        xhr.send(file);
      });

      const metaRes = await fetch(`${API_URL}/api/upload/metadata`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId: key,
          filename: file.name,
          species,
          plot,
          experiencePoint: experience,
          sensorId: sensor,
          deploymentId: deployment,
        }),
      });

      const metaData = await metaRes.json();
      if (!metaData.success) throw new Error(metaData.error);

      setSuccess(true);
      onSave?.(metaData.item);
    } catch (err: any) {
      alert("Upload failed: " + err.message);
    } finally {
      setSaving(false);
      setProgress(0);
    }
  }

  // 🧩 Render helpers
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
      {/* 🐾 Species */}
      <div className="flex flex-col gap-2">
        <label className="text-sm text-slate-300">Species name</label>
        <input
          type="text"
          value={species}
          onChange={(e) => setSpecies(e.target.value)}
          placeholder="Enter species"
          className="w-full h-12 rounded-md bg-transparent border border-slate-600 px-4 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-lime-500/40 focus:border-lime-500 transition"
        />
      </div>

      {/* Step 1 - Plot */}
      {step >= 1 && !plot && (
        <>
          <h3 className="text-lg font-semibold text-lime-400">Select Plot</h3>
          {renderOptions(Object.keys(data), setPlot)}
        </>
      )}

      {/* Step 2 - Experience */}
      {step >= 2 && plot && !experience && (
        <>
          <h3 className="text-lg font-semibold text-lime-400">Select Experience Point</h3>
          {renderOptions(Object.keys(data[plot]), setExperience)}
        </>
      )}

      {/* Step 3 - Sensor */}
      {step >= 3 && plot && experience && !sensor && (
        <>
          <h3 className="text-lg font-semibold text-lime-400">Select Sensor</h3>
          {renderOptions(Object.keys(data[plot][experience]), setSensor)}
        </>
      )}

{/* Step 4 - Deployment */}
{step >= 4 && plot && experience && sensor && !deployment && (
  <>
    <h3 className="text-lg font-semibold text-lime-400">Select Deployment</h3>
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


      {/* Step 5 - Upload */}
      {step >= 5 && plot && experience && sensor && deployment && (
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
