// src/components/gallery/GalleryFilters.tsx

type GalleryFiltersProps = {
  search: string;
  onSearch: (value: string) => void;

  speciesList: string[];
  selectedSpecies: string;
  onSelectSpecies: (value: string) => void;

  sortOrder: "newest" | "oldest";
  onSort: (value: "newest" | "oldest") => void;
};

/**
 * Renders search/filter controls for the gallery page.
 */
export function GalleryFilters({
  search,
  onSearch,
  speciesList,
  selectedSpecies,
  onSelectSpecies,
  sortOrder,
  onSort,
}: GalleryFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-4 p-4 bg-neutral-900 border-b border-slate-800">
      
      {/* Search */}
      <input
        type="text"
        placeholder="Search by species..."
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        className="flex-1 min-w-[200px] bg-neutral-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-lime-400 focus:ring-2 focus:ring-lime-500/20"
      />

      {/* Species filter */}
      <select
        value={selectedSpecies}
        onChange={(e) => onSelectSpecies(e.target.value)}
        className="bg-neutral-800 border border-slate-700 rounded-md px-3 py-2 text-white text-sm"
      >
        <option value="">All species</option>

        {speciesList
          .filter((s) => typeof s === "string" && s.trim() !== "")
          .map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
      </select>

      {/* Sort order */}
      <select
        value={sortOrder}
        onChange={(e) => onSort(e.target.value as "newest" | "oldest")}
        className="bg-neutral-800 border border-slate-700 rounded-md px-3 py-2 text-white text-sm"
      >
        <option value="newest">Newest first</option>
        <option value="oldest">Oldest first</option>
      </select>

    </div>
  );
}
