import { useState } from "react";

type Props = {
  fileId: string; // 🔹 new prop
  defaultValues: {
    species: string;
    experiencePoint: string;
    sensorId: string;
    deploymentId: string;
    experienceId: string;
  };
  onSave?: (data: any) => void;
};

export function MetadataForm({ fileId, defaultValues, onSave }: Props) {
  const [values, setValues] = useState(defaultValues);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setValues({ ...values, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);

    try {
      const res = await fetch("http://localhost:3000/api/metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId,
          filename: fileId.split("/").pop(),
          ...values,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setSuccess(true);
        onSave?.(data.item);
      } else {
        console.error("Failed to save:", data.error);
      }
    } catch (err) {
      console.error("❌ Error saving metadata:", err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-3xl flex flex-col gap-8 px-2">
      <div className="flex flex-col gap-2">
        <label className="text-sm text-slate-300">Species</label>
        <input
          name="species"
          type="text"
          placeholder="Start typing common or latin name"
          value={values.species}
          onChange={handleChange}
          className="w-full h-12nded-md bg-transparent border border-slate-600 px-4 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-lime-500/40 focus:border-lime-500 transition"
        />
      </div>

      {/* ROW 1 */}
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
            className="w-full h-12nded-md bg-transparent border border-slate-600 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-lime-500/40 focus:border-lime-500 transition"
          >
            <option value="">Select</option>
            <option value="Cam08">Cam08</option>
            <option value="Cam09">Cam09</option>
          </select>
        </div>
      </div>

      {/* ROW 2 */}
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

      <button
        type="submit"
        disabled={saving}
        className={`bg-lime-400 text-neutral-900 font-semibold px-6 py-2 rounded-md transition ${
          saving ? "opacity-50 cursor-not-allowed" : "hover:bg-lime-300"
        }`}
      >
        {saving ? "Saving..." : success ? "Saved ✅" : "Save Metadata"}
      </button>
    </form>
  );
}
