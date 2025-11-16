import { useState } from "react";
import { useImageStore } from "../state/useImageStore";
import { VideoTrimmer } from "../components/staging/VideoTrimmer";
import editIcon from "../assets/editicon.svg";
import deleteIcon from "../assets/deleteIcon.svg";

// 🔹 NEW: for thumbnail generation
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";

type Props = {
  file: File;
  defaultValues: {
    species: string;
    plot?: string;
    experiencePoint: string;
    sensorId: string;
    deploymentId: string;
    fileId: string
  };
  onSave?: (data: any) => void;
  onDelete?: () => void;
  editMode?: boolean; // edit existing mode
};

type OptionMap = {
  [plot: string]: {
    [experience: string]: {
      [sensor: string]: string | string[];
    };
  };
};

export function MetadataForm({
  file,
  defaultValues,
  onSave,
  onDelete,
  editMode = false,
}: Props) {
  const [species, setSpecies] = useState(defaultValues.species);
  const [plot, setPlot] = useState<string | null>(defaultValues.plot || null);
  const [experience, setExperience] = useState<string | null>(
    defaultValues.experiencePoint || null
  );
  const [sensor, setSensor] = useState<string | null>(
    defaultValues.sensorId || null
  );
  const [deployment, setDeployment] = useState<string | null>(
    defaultValues.deploymentId || null
  );
  const [trimModal, setTrimModal] = useState(false);
  const [localFile, setLocalFile] = useState<File>(file);

  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [success, setSuccess] = useState(false);

  const { updateImage, images } = useImageStore();
  const currentImage = images.find((i) => i.file.name === file.name);
  const localId = currentImage?.id;

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

  async function handleSaveClick() {
    if (!plot || !experience || !sensor || !deployment) {
      return;
    }

    // 🟡 EDIT MODE: only update metadata (no thumbnail / no reupload)
    if (editMode) {
      try {
        setSaving(true);
        setSuccess(false);

        const res = await fetch(`${API_URL}/api/upload/metadata/update`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileId: defaultValues.fileId, 
            species,
            plot,
            experiencePoint: experience,
            sensorId: sensor,
            deploymentId: deployment,
          }),
        });

        const data = await res.json();
        if (!data.success) {
          throw new Error(data.error || "Failed to update metadata");
        }

        setSuccess(true);
        onSave?.(data.item);
      } catch (err: any) {
        alert("Save failed: " + err.message);
      } finally {
        setSaving(false);
      }
      return;
    }

    // 🟢 UPLOAD MODE: move to sidebar and upload video + thumbnail
if (localId) {
  updateImage(localId, {
    uploading: true,
    saved: true,
    progress: 0,
    species,
    plot,
    experiencePoint: experience,
    sensorId: sensor,
    deploymentId: deployment,
  });

  onSave?.({
    species,
    plot,
    experiencePoint: experience,
    sensorId: sensor,
    deploymentId: deployment,
  });
}

    // Reset form visually for the next video
    setSpecies("");
    setPlot(null);
    setExperience(null);
    setSensor(null);
    setDeployment(null);
    setSuccess(false);

    setSaving(true);
    setProgress(0);

    try {
      // 1️⃣ Generate thumbnail from the first frame
      const ffmpeg = new FFmpeg();
      await ffmpeg.load();
      await ffmpeg.writeFile("input.mp4", await fetchFile(localFile));

      await ffmpeg.exec([
        "-i",
        "input.mp4",
        "-ss",
        "00:00:01",
        "-frames:v",
        "1",
        "-vf",
        "scale=160:90",
        "thumb.jpg",
      ]);

      const thumbData = await ffmpeg.readFile("thumb.jpg");

      // Little TS hack: tell it this is a BlobPart
      const thumbnailBlob = new Blob(
        [thumbData as unknown as BlobPart],
        { type: "image/jpeg" }
      );

      // 2️⃣ Presign VIDEO
      const presignRes = await fetch(`${API_URL}/api/upload/presign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: localFile.name,
          contentType: localFile.type || "application/octet-stream",
        }),
      });
      const { uploadUrl, key } = await presignRes.json();

      // 3️⃣ Presign THUMBNAIL
      const thumbPresignRes = await fetch(`${API_URL}/api/upload/presign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: `thumb_${localFile.name}.jpg`,
          contentType: "image/jpeg",
        }),
      });
      const {
        uploadUrl: thumbUploadUrl,
        key: thumbKey,
      } = await thumbPresignRes.json();

      // 4️⃣ Upload VIDEO with XHR (to keep progress in sidebar)
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", localFile.type);

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable && localId) {
            const p = Math.round((e.loaded / e.total) * 100);
            updateImage(localId, { progress: p });
          }
        };

        xhr.onload = () =>
          xhr.status < 300
            ? resolve()
            : reject(new Error("Upload failed"));
        xhr.onerror = () => reject(new Error("Network error"));
        xhr.send(localFile);
      });

      // 5️⃣ Upload THUMBNAIL
      await fetch(thumbUploadUrl, {
        method: "PUT",
        headers: { "Content-Type": "image/jpeg" },
        body: thumbnailBlob,
      });

      // 6️⃣ Save METADATA including thumbnailId
      const metaRes = await fetch(`${API_URL}/api/upload/metadata`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId: key,
          thumbnailId: thumbKey,
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

      if (localId) {
        updateImage(localId, {
          uploading: false,
          progress: 100,
        });
      }

      setSuccess(true);
      onSave?.(metaData.item);
    } catch (err: any) {
      alert("Save failed: " + err.message);
      if (localId) updateImage(localId, { uploading: false });
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

  // 🟡 --- EDIT MODE (Compact Layout) ---
  if (editMode) {
    return (
      <div className="w-full max-w-3xl flex flex-col gap-5 px-2 border border-slate-800 rounded-xl p-5 bg-neutral-900/60 shadow-md">
        {trimModal && (
          <VideoTrimmer
            file={localFile}
            onTrimmed={(trimmed: File) => setLocalFile(trimmed)}
            onClose={() => setTrimModal(false)}
          />
        )}

        {/* Header Row */}
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-sky-400">Edit Metadata</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTrimModal(true)}
              className="w-9 h-9 flex items-center justify-center rounded-full border border-slate-600 bg-neutral-800 hover:bg-lime-500 hover:text-black transition"
              title="Trim video"
            >
              <img
                src={editIcon}
                alt="Trim"
                className="w-5 h-5 invert group-hover:invert-0 transition"
              />
            </button>
            <button
              onClick={onDelete}
              className="w-9 h-9 flex items-center justify-center rounded-full border border-red-500/70 text-red-400 bg-neutral-800 hover:bg-red-500 hover:text-black transition"
              title="Delete video"
            >
              <img
                src={deleteIcon}
                alt="Delete"
                className="w-5 h-5 invert group-hover:invert-0 transition"
              />
            </button>
          </div>
        </div>

        {/* Editable fields */}
        <label className="text-sm text-slate-300">Species</label>
        <input
          value={species}
          onChange={(e) => setSpecies(e.target.value)}
          className="bg-neutral-800 border border-slate-700 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-sky-400/40 focus:border-sky-400 transition"
        />

        <div className="grid grid-cols-2 gap-3">
          <input
            value={plot || ""}
            onChange={(e) => setPlot(e.target.value)}
            placeholder="Plot"
            className="bg-neutral-800 border border-slate-700 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-sky-400/40 focus:border-sky-400 transition"
          />
          <input
            value={experience || ""}
            onChange={(e) => setExperience(e.target.value)}
            placeholder="Experience"
            className="bg-neutral-800 border border-slate-700 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-sky-400/40 focus:border-sky-400 transition"
          />
          <input
            value={sensor || ""}
            onChange={(e) => setSensor(e.target.value)}
            placeholder="Sensor"
            className="bg-neutral-800 border border-slate-700 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-sky-400/40 focus:border-sky-400 transition"
          />
          <input
            value={deployment || ""}
            onChange={(e) => setDeployment(e.target.value)}
            placeholder="Deployment"
            className="bg-neutral-800 border border-slate-700 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-sky-400/40 focus:border-sky-400 transition"
          />
        </div>

        <div className="flex justify-end mt-4">
          <button
            onClick={handleSaveClick}
            disabled={saving}
            className={`bg-sky-400 text-black font-semibold px-6 py-2 rounded-md transition ${
              saving ? "opacity-50 cursor-wait" : "hover:bg-sky-300"
            }`}
          >
            {saving ? "Saving..." : success ? "Updated" : "Save Changes"}
          </button>
        </div>
      </div>
    );
  }

  // 🟢 --- NORMAL MODE (Multi-step Upload Flow) ---
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
          <button
            type="button"
            onClick={onDelete}
            className="w-9 h-9 flex items-center justify-center rounded-full border border-red-500/70 text-red-400 bg-neutral-800 hover:bg-red-500 hover:text-black transition"
            title="Remove from upload list"
          >
            <img
              src={deleteIcon}
              alt="Delete"
              className="w-5 h-5 invert group-hover:invert-0 transition"
            />
          </button>
        </div>
      </div>

      {/* Multi-step plot/experience/sensor/deployment selection */}
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
          <h3 className="text-lg font-semibold text-lime-400">
            Select Sensor
          </h3>
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
            onClick={handleSaveClick}
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
              ? "Uploaded"
              : "Upload & Save"}
          </button>
        </div>
      )}
    </div>
  );
}
