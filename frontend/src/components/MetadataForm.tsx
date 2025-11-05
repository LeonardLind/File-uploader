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

export function MetadataForm({ file, defaultValues, onSave }: Props) {
  const [values, setValues] = useState(defaultValues);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL;

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setValues({ ...values, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      alert("⚠️ No file found for upload.");
      return;
    }

    setSaving(true);
    setSuccess(false);

    try {
      console.log("📡 Requesting presigned URL...");
      const presignRes = await fetch(`${API_URL}/api/upload/presign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || "application/octet-stream",
        }),
      });

      if (!presignRes.ok) throw new Error(`Presign failed: ${presignRes.status}`);
      const { uploadUrl, key } = await presignRes.json();

      console.log("⬆️ Uploading to S3...");
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });

      if (!uploadRes.ok) throw new Error(`S3 upload failed: ${uploadRes.status}`);

      console.log("🎉 Upload complete:", key);

      console.log("🗃️ Saving metadata...");
      const metaRes = await fetch(`${API_URL}/api/upload/metadata`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId: key,
          filename: file.name,
          ...values,
        }),
      });

      const metaData = await metaRes.json();
      if (!metaData.success) throw new Error(metaData.error || "Failed to save metadata");

      console.log("✅ Metadata saved!");
      setSuccess(true);
      onSave?.(metaData.item);
    } catch (err: any) {
      console.error("❌ Upload failed:", err);
      alert(`Upload failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-3xl flex flex-col gap-8 px-2">
      {/* 🦋 Species */}
      <div className="flex flex-col gap-2">
        <label className="text-sm text-slate-300">Species</label>
        <input
          name="species"
          type="text"
          placeholder="Enter species (common or latin)"
          value={values.species}
          onChange={handleChange}
          className="w-full h-12 rounded-md bg-transparent border border-slate-600 px-4 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-lime-500/40 focus:border-lime-500 transition"
        />
      </div>

      {/* 🧭 Row 1 */}
      <div className="grid grid-cols-2 gap-8">
        <div className="flex flex-col gap-2">
          <label className="text-sm text-slate-300">Experience Point</label>
          <select
            name="experiencePoint"
            value={values.experiencePoint}
            onChange={handleChange}
            className="w-full h-12 rounded-md bg-transparent border border-slate-600 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-lime-500/40 focus:border-lime-500 transition"
          >
            <option value="">Select</option>
            <option value="XP1">XP1</option>
            <option value="XP2">XP2</option>
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm text-slate-300">Sensor</label>
          <select
            name="sensorId"
            value={values.sensorId}
            onChange={handleChange}
            className="w-full h-12 rounded-md bg-transparent border border-slate-600 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-lime-500/40 focus:border-lime-500 transition"
          >
            <option value="">Select</option>
            <option value="Cam08">Cam08</option>
            <option value="Cam09">Cam09</option>
          </select>
        </div>
      </div>

      {/* 🌲 Row 2 */}
      <div className="grid grid-cols-2 gap-8">
        <div className="flex flex-col gap-2">
          <label className="text-sm text-slate-300">Deployment ID</label>
          <select
            name="deploymentId"
            value={values.deploymentId}
            onChange={handleChange}
            className="w-full h-12 rounded-md bg-transparent border border-slate-600 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-lime-500/40 focus:border-lime-500 transition"
          >
            <option value="">Select</option>
            <option value="Footpath">Foot path</option>
            <option value="Trail">Trail</option>
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm text-slate-300">Experience ID</label>
          <select
            name="experienceId"
            value={values.experienceId}
            onChange={handleChange}
            className="w-full h-12 rounded-md bg-transparent border border-slate-600 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-lime-500/40 focus:border-lime-500 transition"
          >
            <option value="">Select</option>
            <option value="Breno">Breno</option>
            <option value="Forest">Forest</option>
          </select>
        </div>
      </div>

      {/* 💾 Submit */}
      <button
        type="submit"
        disabled={saving}
        className={`bg-lime-400 text-neutral-900 font-semibold px-6 py-2 rounded-md transition ${
          saving ? "opacity-50 cursor-not-allowed" : "hover:bg-lime-300"
        }`}
      >
        {saving ? "Uploading..." : success ? "Uploaded ✅" : "Save & Upload"}
      </button>
    </form>
  );
}
