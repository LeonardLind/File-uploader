import { useState } from "react";

type Props = {
  defaultValues: {
    species: string;
    experiencePoint: string;
    sensorId: string;
    deploymentId: string;
    experienceId: string;
  };
  onSave: (data: {
    species: string;
    experiencePoint: string;
    sensorId: string;
    deploymentId: string;
    experienceId: string;
  }) => void;
};

export function MetadataForm({ defaultValues, onSave }: Props) {
  const [values, setValues] = useState(defaultValues);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setValues({ ...values, [e.target.name]: e.target.value });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave(values);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-3xl flex flex-col gap-6"
    >
      {/* SPECIES */}
      <div>
        <label className="block text-sm text-slate-300 mb-2">Species</label>
        <input
          name="species"
          type="text"
          placeholder="Start typing common or latin name"
          value={values.species}
          onChange={handleChange}
          className="w-full rounded-md bg-transparent border border-slate-600 px-4 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-lime-500/40 focus:border-lime-500"
        />
      </div>

      {/* ROW 1 — Experience Point + Sensor */}
      <div className="grid grid-cols-2 gap-8">
        <div>
          <label className="block text-sm text-slate-300 mb-2">Experience Point</label>
          <select
            name="experiencePoint"
            value={values.experiencePoint}
            onChange={handleChange}
            className="w-full rounded-md bg-transparent border border-slate-600 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-lime-500/40 focus:border-lime-500"
          >
            <option value="">Select</option>
            <option value="XP1">XP1</option>
            <option value="XP2">XP2</option>
          </select>
        </div>

        <div>
          <label className="block text-sm text-slate-300 mb-2">Sensor</label>
          <select
            name="sensorId"
            value={values.sensorId}
            onChange={handleChange}
            className="w-full rounded-md bg-transparent border border-slate-600 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-lime-500/40 focus:border-lime-500"
          >
            <option value="">Select</option>
            <option value="Cam08">Cam08</option>
            <option value="Cam09">Cam09</option>
          </select>
        </div>
      </div>

      {/* ROW 2 — Deployment ID + Experience ID */}
      <div className="grid grid-cols-2 gap-8">
        <div>
          <label className="block text-sm text-slate-300 mb-2">Deployment ID</label>
          <select
            name="deploymentId"
            value={values.deploymentId}
            onChange={handleChange}
            className="w-full rounded-md bg-transparent border border-slate-600 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-lime-500/40 focus:border-lime-500"
          >
            <option value="">Select</option>
            <option value="Footpath">Foot path</option>
            <option value="Trail">Trail</option>
          </select>
        </div>

        <div>
          <label className="block text-sm text-slate-300 mb-2">Experience ID</label>
          <select
            name="experienceId"
            value={values.experienceId}
            onChange={handleChange}
            className="w-full rounded-md bg-transparent border border-slate-600 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-lime-500/40 focus:border-lime-500"
          >
            <option value="">Select</option>
            <option value="Breno">Breno</option>
            <option value="Forest">Forest</option>
          </select>
        </div>
      </div>
    </form>
  );
}
