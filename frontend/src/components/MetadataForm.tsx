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
      className="w-full max-w-3xl flex flex-col gap-8 px-2"
    >

      <div className="flex flex-col gap-2">
        <label className="text-sm text-slate-300">Species</label>
        <input
          name="species"
          type="text"
          placeholder="Start typing common or latin name"
          value={values.species}
          onChange={handleChange}
          className="w-full h-[3rem] rounded-md bg-transparent border border-slate-600 px-4 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-lime-500/40 focus:border-lime-500 transition"
        />
      </div>

      <div className="grid grid-cols-2 gap-8">
        <div className="flex flex-col gap-2">
          <label className="text-sm text-slate-300">Experience Point</label>
          <select
            name="experiencePoint"
            value={values.experiencePoint}
            onChange={handleChange}
            className="w-full h-[3rem] rounded-md bg-transparent border border-slate-600 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-lime-500/40 focus:border-lime-500 appearance-none transition"
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
            className="w-full h-[3rem] rounded-md bg-transparent border border-slate-600 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-lime-500/40 focus:border-lime-500 appearance-none transition"
          >
            <option value="">Select</option>
            <option value="Cam08">Cam08</option>
            <option value="Cam09">Cam09</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8">
        <div className="flex flex-col gap-2">
          <label className="text-sm text-slate-300">Deployment ID</label>
          <select
            name="deploymentId"
            value={values.deploymentId}
            onChange={handleChange}
            className="w-full h-[3rem] rounded-md bg-transparent border border-slate-600 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-lime-500/40 focus:border-lime-500 appearance-none transition"
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
            className="w-full h-[3rem] rounded-md bg-transparent border border-slate-600 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-lime-500/40 focus:border-lime-500 appearance-none transition"
          >
            <option value="">Select</option>
            <option value="Breno">Breno</option>
            <option value="Forest">Forest</option>
          </select>
        </div>
      </div>

      <button
        type="submit"
        className="hidden bg-lime-400 text-neutral-900 font-semibold px-6 py-2 rounded-md hover:bg-lime-300 transition"
      >
        Save
      </button>
    </form>
  );
}
