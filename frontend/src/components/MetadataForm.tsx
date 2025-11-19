import { useState } from "react";
import { useImageStore } from "../state/useImageStore";
import { VideoTrimmer } from "./VideoTrimmer";
import editIcon from "../assets/editicon.svg";
import deleteIcon from "../assets/deleteIcon.svg";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import { metadataMap as rawMetadataMap } from "../data/metadataMap";
import "../index.css";

type MetadataMap = {
  [plot: string]: {
    [experience: string]: {
      [sensor: string]: string | string[];
    };
  };
};

const metadataMap = rawMetadataMap as MetadataMap;

type MetadataFormProps = {
  file: File;
  defaultValues: {
    species: string;
    plot?: string | null;
    experiencePoint?: string | null;
    sensorId?: string | null;
    deploymentId?: string | null;
    fileId: string;
  };
  onSave?: (d: any) => void;
  onDelete?: () => void;
  editMode?: boolean;
};

export function MetadataForm({
  file,
  defaultValues,
  onSave,
  onDelete,
  editMode = false,
}: MetadataFormProps) {
  const [species, setSpecies] = useState<string>(defaultValues.species ?? "");
  const [plot, setPlot] = useState<string>(defaultValues.plot ?? "");
  const [experience, setExperience] = useState<string>(
    defaultValues.experiencePoint ?? ""
  );
  const [sensor, setSensor] = useState<string>(defaultValues.sensorId ?? "");
  const [deployment, setDeployment] = useState<string>(
    defaultValues.deploymentId ?? ""
  );

  const [trimModal, setTrimModal] = useState(false);
  const [localFile, setLocalFile] = useState<File>(file);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const { updateImage, images } = useImageStore();
  const currentImage = images.find((i) => i.file.name === file.name);
  const localId = currentImage?.id;
  const API_URL = import.meta.env.VITE_API_URL;

  // Helpers
  const baseInputBlue =
    "w-full h-10 md:h-11 lg:h-12 px-3 bg-black/30 border border-blue-400/30 rounded-lg text-gray-200 placeholder-gray-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-300/40 outline-none transition";

  const baseOptionBtn =
    "px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:border-lime-300 hover:text-lime-300 transition";

  const baseOptionBtnBlue =
    "px-4 py-2 rounded-lg bg-white/5 border border-blue-400/30 text-gray-200 hover:border-blue-300 hover:text-blue-300 transition";

  async function uploadVideoAndMetadata() {
    if (!localId) return;
    try {
      updateImage(localId, { uploading: true, progress: 0 });

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

      const thumbBuf = await ffmpeg.readFile("thumb.jpg");
      const thumbBlob = new Blob(
        [thumbBuf as unknown as BlobPart],
        { type: "image/jpeg" }
      );

      const fileRes = await fetch(`${API_URL}/api/upload/presign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: localFile.name,
          contentType: localFile.type,
        }),
      });

      const { uploadUrl, key } = await fileRes.json();

      const thumbRes = await fetch(`${API_URL}/api/upload/presign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: `thumb_${localFile.name}.jpg`,
          contentType: "image/jpeg",
        }),
      });

      const { uploadUrl: thumbUploadUrl, key: thumbKey } = await thumbRes.json();

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", localFile.type);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            updateImage(localId, { progress: pct });
          }
        };
        xhr.onload = () => {
          if (xhr.status < 300) {
            resolve(undefined); // satisfies TS: value is required
          } else {
            reject(new Error("upload failed"));
          }
        };
        xhr.onerror = () => reject(new Error("network error"));
        xhr.send(localFile);
      });

      await fetch(thumbUploadUrl, {
        method: "PUT",
        headers: { "Content-Type": "image/jpeg" },
        body: thumbBlob,
      });

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

      const result = await metaRes.json();
      if (!result.success) throw new Error(result.error);

      updateImage(localId, { uploading: false, progress: 100 });
      onSave?.(result.item);
    } catch (err) {
      alert("Upload failed");
      if (localId) {
        updateImage(localId, { uploading: false });
      }
    }
  }

  // Save handler
  async function handleSaveClick() {
    if (!plot || !experience || !sensor || !deployment) return;

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

        const result = await res.json();
        setSuccess(true);
        onSave?.(result.item);
      } catch {
        alert("Save failed");
      } finally {
        setSaving(false);
      }
      return;
    }

    if (localId) {
      updateImage(localId, {
        saved: true,
        uploading: true,
        progress: 0,
        species,
        plot,
        experiencePoint: experience,
        sensorId: sensor,
        deploymentId: deployment,
      });
    }

    uploadVideoAndMetadata();

    setSpecies("");
    setPlot("");
    setExperience("");
    setSensor("");
    setDeployment("");
  }

  // Option renderer
  const renderOptions = (
    opts: string[],
    select: (v: string) => void,
    blue: boolean = false
  ) => (
    <div className="flex flex-wrap justify-center gap-3">
      {opts.map((o) => (
        <button
          key={o}
          onClick={() => select(o)}
          className={blue ? baseOptionBtnBlue : baseOptionBtn}
        >
          {o}
        </button>
      ))}
    </div>
  );

  // EDIT MODE 
  if (editMode) {
    return (
      <div className="w-full max-w-2xl mx-auto flex flex-col gap-6 p-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl shadow-lg">
        {trimModal && (
          <VideoTrimmer
            file={localFile}
            onTrimmed={(f) => setLocalFile(f)}
            onClose={() => setTrimModal(false)}
          />
        )}

        <div className="flex justify-between items-center">
          <h3 className="text-xl font-semibold text-blue-300">Edit Metadata</h3>

          <div className="flex gap-3">
            <button
              onClick={() => setTrimModal(true)}
              className="w-10 h-10 rounded-full bg-white/10 border border-blue-400/30 hover:border-blue-300 transition flex items-center justify-center"
            >
              <img src={editIcon} className="w-5 h-5 invert" />
            </button>

            <button
              onClick={onDelete}
              className="w-10 h-10 rounded-full bg-white/10 border border-red-500/70 hover:bg-red-500 hover:text-black transition flex items-center justify-center"
            >
              <img src={deleteIcon} className="w-5 h-5 invert" />
            </button>
          </div>
        </div>

        <label className="text-sm text-gray-300">Species</label>
        <input
          value={species}
          onChange={(e) => setSpecies(e.target.value)}
          className={baseInputBlue}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            value={plot}
            onChange={(e) => setPlot(e.target.value)}
            placeholder="Plot"
            className={baseInputBlue}
          />
          <input
            value={experience}
            onChange={(e) => setExperience(e.target.value)}
            placeholder="Experience"
            className={baseInputBlue}
          />
          <input
            value={sensor}
            onChange={(e) => setSensor(e.target.value)}
            placeholder="Sensor"
            className={baseInputBlue}
          />
          <input
            value={deployment}
            onChange={(e) => setDeployment(e.target.value)}
            placeholder="Deployment"
            className={baseInputBlue}
          />
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleSaveClick}
            disabled={saving}
            className="px-6 py-2 bg-blue-400 hover:bg-blue-300 text-black font-semibold rounded-lg transition disabled:opacity-40"
          >
            {saving ? "Saving…" : success ? "Updated" : "Save"}
          </button>
        </div>
      </div>
    );
  }

  // NEW UPLOAD 
  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-5 p-4">
      {trimModal && (
        <VideoTrimmer
          file={localFile}
          onTrimmed={(f) => setLocalFile(f)}
          onClose={() => setTrimModal(false)}
        />
      )}

      <div className="w-full flex flex-col gap-6 p-5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10">
        <label className="text-sm text-gray-300">Species name</label>
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            value={species}
            onChange={(e) => setSpecies(e.target.value)}
            placeholder="Enter species"
            className="flex-1 h-10 bg-white/10 border border-white/10 rounded-lg px-4 text-gray-200 placeholder-gray-400 focus:border-lime-400 focus:ring-2 focus:ring-lime-400/40 outline-none transition"
          />

          <div className="flex gap-3 self-start md:self-auto">
            <button
              onClick={() => setTrimModal(true)}
              className="w-10 h-10 rounded-full bg-white/10 border border-white/10 hover:border-lime-400 transition flex items-center justify-center"
            >
              <img src={editIcon} className="w-5 h-5 invert" />
            </button>

            <button
              onClick={onDelete}
              className="w-10 h-10 rounded-full bg-white/10 border border-red-500/70 hover:bg-red-500 hover:text-black transition flex items-center justify-center"
            >
              <img src={deleteIcon} className="w-5 h-5 invert" />
            </button>
          </div>
        </div>

        {/*Plot */}
        {!plot && (
          <>
            <h3 className="text-lg text-lime-400">Select Plot</h3>
            {renderOptions(Object.keys(metadataMap), setPlot)}
          </>
        )}

        {/*Experience */}
        {plot && !experience && metadataMap[plot] && (
          <>
            <h3 className="text-lg text-lime-400">Select Experience Point</h3>
            {renderOptions(Object.keys(metadataMap[plot]), setExperience)}
          </>
        )}

        {/*Sensor */}
        {plot && experience && !sensor && metadataMap[plot]?.[experience] && (
          <>
            <h3 className="text-lg text-lime-400">Select Sensor</h3>
            {renderOptions(
              Object.keys(metadataMap[plot][experience]),
              setSensor
            )}
          </>
        )}

        {/*Deployment */}
        {plot &&
          experience &&
          sensor &&
          !deployment &&
          metadataMap[plot]?.[experience]?.[sensor] && (
            <>
              <h3 className="text-lg text-lime-400">Select Deployment</h3>
              <div className="flex flex-wrap justify-center gap-3">
                {(() => {
                  const value = metadataMap[plot][experience][sensor];
                  const options = Array.isArray(value) ? value : [value];
                  return options.map((d) => (
                    <button
                      key={d}
                      onClick={() => setDeployment(d)}
                      className={baseOptionBtn}
                    >
                      {d}
                    </button>
                  ));
                })()}
              </div>
            </>
          )}

        {/*Upload */}
        {plot && experience && sensor && deployment && (
          <div className="flex justify-end">
            <button
              onClick={handleSaveClick}
              className="px-6 py-2 bg-lime-400 hover:bg-lime-300 text-black font-semibold rounded-lg transition"
            >
              Upload & Save
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
