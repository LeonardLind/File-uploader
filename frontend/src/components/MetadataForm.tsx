// src/components/MetadataForm.tsx
import { useState } from "react";
import { useImageStore } from "../state/useImageStore";
import { VideoTrimmer } from "../components/staging/VideoTrimmer";


import { MetadataSelector } from "./staging/MetadataSelector";
import { MetadataEditForm } from "./staging/MetadataEditForm";

import { generateThumbnail } from "../lib/ffmpeg/generateThumbnail";
import { presignUpload, createMetadata, updateMetadata } from "../app/services/api/uploadApi";

import type { MetadataItem } from "../types/media";

import editIcon from "../assets/editicon.svg";
import deleteIcon from "../assets/deleteIcon.svg";

type MetadataFormProps = {
  file: File;
  defaultValues: {
    species: string;
    plot?: string;
    experiencePoint: string;
    sensorId: string;
    deploymentId: string;
    fileId?: string; // present in edit mode
  };
  onSave?: (data: MetadataItem | any) => void;
  onDelete?: () => void;
  editMode?: boolean;
};

/**
 * Handles both:
 * - Upload mode: assign metadata, generate thumbnail, upload video and thumbnail, store metadata.
 * - Edit mode: update metadata for an existing entry without uploading.
 */
export function MetadataForm({
  file,
  defaultValues,
  onSave,
  onDelete,
  editMode = false,
}: MetadataFormProps) {
  const [species, setSpecies] = useState(defaultValues.species || "");
  const [plot, setPlot] = useState(defaultValues.plot || "");
  const [experience, setExperience] = useState(defaultValues.experiencePoint || "");
  const [sensor, setSensor] = useState(defaultValues.sensorId || "");
  const [deployment, setDeployment] = useState(defaultValues.deploymentId || "");

  const [trimModalOpen, setTrimModalOpen] = useState(false);
  const [localFile, setLocalFile] = useState<File>(file);

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const { images, updateImage } = useImageStore();

  // For upload mode: try to find the corresponding pending image by file name
  const currentImage = images.find((img) => img.file.name === file.name);
  const localId = currentImage?.id;

  const canSubmit =
    species.trim().length > 0 &&
    plot &&
    experience &&
    sensor &&
    deployment;

  /**
   * Handles saving metadata in edit mode.
   * Only updates the backend metadata entry, no uploads involved.
   */
  async function handleEditSave() {
    if (!defaultValues.fileId) return;

    try {
      setSaving(true);
      setSuccess(false);

      const updated = await updateMetadata({
        fileId: defaultValues.fileId,
        species,
        plot,
        experiencePoint: experience,
        sensorId: sensor,
        deploymentId: deployment,
      });

      setSuccess(true);
      onSave?.(updated);
    } catch (err: any) {
      alert("Failed to update metadata: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  /**
   * Handles the full upload flow for a new video:
   * - Generates a thumbnail from the video
   * - Presigns and uploads the video
   * - Presigns and uploads the thumbnail
   * - Saves metadata referencing both keys
   */
  async function handleUploadSave() {
    if (!canSubmit) return;
    if (!localId) {
      alert("Could not find local image entry for this file.");
      return;
    }

    // Mark as uploading and saved in sidebar
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

    setSaving(true);
    setSuccess(false);
    setUploadProgress(0);

    try {
      // 1. Generate thumbnail from localFile
      const thumbnailFile = await generateThumbnail(localFile);

      // 2. Presign video upload
      const videoPresign = await presignUpload({
        filename: localFile.name,
        contentType: localFile.type || "application/octet-stream",
      });
      const { uploadUrl: videoUploadUrl, key: videoKey } = videoPresign;

      // 3. Presign thumbnail upload
      const thumbPresign = await presignUpload({
        filename: thumbnailFile.name,
        contentType: "image/jpeg",
      });
      const { uploadUrl: thumbUploadUrl, key: thumbKey } = thumbPresign;

      // 4. Upload video with progress tracking
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", videoUploadUrl);
        xhr.setRequestHeader("Content-Type", localFile.type || "application/octet-stream");

        xhr.upload.onprogress = (e) => {
          if (!e.lengthComputable) return;
          const percent = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(percent);
          updateImage(localId, { progress: percent });
        };

        xhr.onload = () =>
          xhr.status >= 200 && xhr.status < 300
            ? resolve()
            : reject(new Error("Video upload failed"));

        xhr.onerror = () => reject(new Error("Network error during video upload"));

        xhr.send(localFile);
      });

      // 5. Upload thumbnail
      await fetch(thumbUploadUrl, {
        method: "PUT",
        headers: { "Content-Type": "image/jpeg" },
        body: thumbnailFile,
      });

      // 6. Save metadata
      const created = await createMetadata({
        fileId: videoKey,
        thumbnailId: thumbKey,
        filename: localFile.name,
        species,
        plot,
        experiencePoint: experience,
        sensorId: sensor,
        deploymentId: deployment,
      });

      updateImage(localId, {
        uploading: false,
        progress: 100,
      });

      setSuccess(true);
      onSave?.(created);
    } catch (err: any) {
      alert("Upload failed: " + err.message);
      if (localId) {
        updateImage(localId, { uploading: false });
      }
    } finally {
      setSaving(false);
      setUploadProgress(0);
    }
  }

  const handleSubmit = async () => {
    if (editMode) {
      await handleEditSave();
    } else {
      await handleUploadSave();
    }
  };

  return (
    <div className="w-full max-w-3xl flex flex-col gap-6 px-2">
      {/* Trim Modal */}
{/* Trim Modal */}
{trimModalOpen && !editMode && (
  <VideoTrimmer
    file={localFile}
    onTrimmed={(trimmedFile) => {
      setLocalFile(trimmedFile);
      setTrimModalOpen(false);
    }}
    onClose={() => setTrimModalOpen(false)}
  />
)}


      {/* Header with species and actions */}
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

          {!editMode && (
            <button
              type="button"
              onClick={() => setTrimModalOpen(true)}
              className="w-9 h-9 flex items-center justify-center rounded-full border border-slate-600 bg-neutral-800 hover:bg-lime-500 transition"
              title="Trim video"
            >
              <img src={editIcon} alt="Trim" className="w-5 h-5 invert" />
            </button>
          )}

          <button
            type="button"
            onClick={onDelete}
            className="w-9 h-9 flex items-center justify-center rounded-full border border-red-500/70 text-red-400 bg-neutral-800 hover:bg-red-500 hover:text-black transition"
            title={editMode ? "Delete video" : "Remove from upload list"}
          >
            <img src={deleteIcon} alt="Delete" className="w-5 h-5 invert" />
          </button>
        </div>
      </div>

      {/* Main form content */}
      {editMode ? (
        <MetadataEditForm
          species={species}
          plot={plot}
          experience={experience}
          sensor={sensor}
          deployment={deployment}
          saving={saving}
          onSave={handleEditSave}
          onChange={(field, value) => {
            if (field === "species") setSpecies(value);
            if (field === "plot") setPlot(value);
            if (field === "experience") setExperience(value);
            if (field === "sensor") setSensor(value);
            if (field === "deployment") setDeployment(value);
          }}
        />
      ) : (
        <>
          <MetadataSelector
            plot={plot}
            experience={experience}
            sensor={sensor}
            deployment={deployment}
            onChangePlot={(v) => {
              setPlot(v);
              setExperience("");
              setSensor("");
              setDeployment("");
            }}
            onChangeExperience={(v) => {
              setExperience(v);
              setSensor("");
              setDeployment("");
            }}
            onChangeSensor={(v) => {
              setSensor(v);
              setDeployment("");
            }}
            onChangeDeployment={setDeployment}
          />

          <div className="flex flex-col gap-3 mt-6">
            <button
              onClick={handleSubmit}
              disabled={saving || !canSubmit}
              className={`bg-lime-400 text-neutral-900 font-semibold px-6 py-2 rounded-md transition ${
                saving || !canSubmit ? "opacity-60 cursor-not-allowed" : "hover:bg-lime-300"
              }`}
            >
              {editMode
                ? saving
                  ? "Saving..."
                  : success
                  ? "Updated"
                  : "Save changes"
                : saving
                ? uploadProgress > 0
                  ? `Uploading ${uploadProgress}%`
                  : "Uploading..."
                : success
                ? "Uploaded"
                : "Upload and save"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
