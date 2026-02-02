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
  onClear?: () => void;
  showClear?: boolean;
  layout?: "flex" | "grid"; // Default flex; grid used in the Filters modal.
};

export function GalleryFilterBar({
  filters,
  uniqueValues,
  onChange,
  onClear,
  showClear = true,
  layout = "flex",
}: Props) {
  const shouldShowClear = showClear && typeof onClear === "function";
  // Fields shown in the filter bar, in order.
  const filterFields = [
    ["species", "Species"],
    ["plot", "Plot"],
    ["experiencePoint", "Experience"],
    ["sensorId", "Sensor"],
    ["deploymentId", "Deployment"],
    ["id_state", "ID State"],
  ] as const;
  const totalItems = filterFields.length + 1;
  const wrapperClass =
    layout === "grid"
      ? "bg-neutral-900 border border-slate-800 rounded-lg p-1.5 mb-2 flex flex-col gap-2"
      : "bg-neutral-900 border border-slate-800 rounded-lg p-1.5 mb-2 flex flex-row flex-wrap gap-2 items-center";
  const filtersClass =
    layout === "grid"
      ? "grid grid-cols-12 gap-2"
      : "flex flex-wrap gap-2 flex-1 min-w-0";
  const selectClass =
    layout === "grid"
      ? "bg-neutral-800 text-slate-200 border border-slate-700 rounded-md px-2.5 py-1 text-xs sm:text-sm h-7 sm:h-8 w-full"
      : "bg-neutral-800 text-slate-200 border border-slate-700 rounded-md px-2.5 py-1 text-xs sm:text-sm h-7 sm:h-8 flex-1 min-w-[9rem]";
  const inputClass =
    layout === "grid"
      ? "bg-neutral-800 text-slate-200 border border-slate-700 rounded-md px-2.5 py-1 text-xs sm:text-sm h-7 sm:h-8 w-full"
      : "bg-neutral-800 text-slate-200 border border-slate-700 rounded-md px-2.5 py-1 text-xs sm:text-sm h-7 sm:h-8 flex-1 min-w-[9rem]";
  const sortClass =
    layout === "grid"
      ? "bg-neutral-800 text-slate-200 border border-slate-700 rounded-md px-2.5 py-1 text-xs sm:text-sm h-7 sm:h-8 w-full"
      : "bg-neutral-800 text-slate-200 border border-slate-700 rounded-md px-2.5 py-1 text-xs sm:text-sm h-7 sm:h-8 flex-1 min-w-[10rem]";

  const gridSpanFor = (index: number) => {
    if (layout !== "grid") return "";
    const isLastRowItem = index >= totalItems - 3;
    return isLastRowItem ? "col-span-6 sm:col-span-4 lg:col-span-4" : "col-span-6 sm:col-span-4 lg:col-span-3";
  };

  return (
    <div className={wrapperClass}>
      <div className={filtersClass}>
        {filterFields.map(([key, label], index) => {
          const filterKey = key as keyof Filters;
          const spanClass = gridSpanFor(index);
          const value = filters[filterKey] || "";

          if (key === "species") {
            return (
              <input
                key={key}
                type="search"
                value={value}
                onChange={(e) => onChange(filterKey, e.target.value)}
                placeholder="Search species"
                className={`${inputClass} ${spanClass}`}
                autoComplete="off"
                spellCheck={false}
              />
            );
          }

          return (
            <select
              key={key}
              value={value}
              onChange={(e) => onChange(filterKey, e.target.value)}
              className={`${selectClass} ${spanClass}`}
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
          );
        })}

        <select
          value={filters.updatedSort}
          onChange={(e) => onChange("updatedSort", e.target.value)}
          className={`${sortClass} ${gridSpanFor(totalItems - 1)}`}
        >
          <option value="desc">Newest first</option>
          <option value="asc">Oldest first</option>
        </select>
      </div>

      {shouldShowClear && (
        <button
          onClick={onClear}
          className="px-2.5 py-1 text-xs rounded-md border border-slate-700 bg-neutral-900 text-slate-200 hover:border-lime-400 font-semibold transition h-7 sm:h-8"
        >
          Clear Filters
        </button>
      )}
    </div>
  );
}
