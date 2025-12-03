type Filters = {
  species: string;
  plot: string;
  experiencePoint: string;
  sensorId: string;
  deploymentId: string;
  id_state: string;
  updatedSort: "asc" | "desc" | string;
};

type UniqueValues = {
  species: string[];
  plot: string[];
  experiencePoint: string[];
  sensorId: string[];
  deploymentId: string[];
  id_state: string[];
};

type Props = {
  filters: Filters;
  uniqueValues: UniqueValues;
  onChange: (key: keyof Filters, value: string) => void;
  onClear: () => void;
};

export function GalleryFilterBar({ filters, uniqueValues, onChange, onClear }: Props) {
  return (
    <div className="bg-neutral-900 border border-slate-800 rounded-lg p-4 mb-8 flex flex-col md:flex-row md:flex-wrap gap-4 items-start md:items-center justify-between">
      <div className="flex flex-wrap gap-3 flex-1 min-w-0">
        {((
          [
            ["species", "Species"],
            ["plot", "Plot"],
            ["experiencePoint", "Experience"],
            ["sensorId", "Sensor"],
            ["deploymentId", "Deployment"],
            ["id_state", "ID State"],
          ] as const
        )).map(([key, label]) => (
          <select
            key={key}
            value={filters[key as keyof Filters] || ""}
            onChange={(e) => onChange(key as keyof Filters, e.target.value)}
            className="bg-neutral-800 text-slate-200 border border-slate-700 rounded-md px-3 py-2 text-sm w-[8.5rem] md:w-[9rem]"
          >
            <option value="">{label}</option>
            {uniqueValues[key as keyof UniqueValues]
              .filter(Boolean)
              .map((val) => (
                <option key={val} value={val}>
                  {val}
                </option>
              ))}
          </select>
        ))}

        <select
          value={filters.updatedSort}
          onChange={(e) => onChange("updatedSort", e.target.value)}
          className="bg-neutral-800 text-slate-200 border border-slate-700 rounded-md px-3 py-2 text-sm w-[10rem] md:w-[11rem]"
        >
          <option value="desc">Newest first</option>
          <option value="asc">Oldest first</option>
        </select>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onClear}
          className="px-3 py-2 text-sm rounded-md bg-slate-700 hover:bg-slate-600 transition"
        >
          Clear Filters
        </button>
      </div>
    </div>
  );
}
