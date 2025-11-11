// src/pages/GalleryPage.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

type MetadataItem = {
  fileId: string;
  filename: string;
  species?: string;
  plot?: string;
  experiencePoint?: string;
  sensorId?: string;
  deploymentId?: string;
  updatedAt?: string;
};

export function GalleryPage() {
  const [files, setFiles] = useState<MetadataItem[]>([]);
  const [filtered, setFiltered] = useState<MetadataItem[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    species: "",
    plot: "",
    experiencePoint: "",
    sensorId: "",
    deploymentId: "",
    updatedSort: "desc",
  });

  const API_URL = import.meta.env.VITE_API_URL;
  const BUCKET_NAME = import.meta.env.VITE_AWS_BUCKET;
  const navigate = useNavigate();

  // 🧩 Fetch data
  useEffect(() => {
    async function fetchMetadata() {
      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/api/upload/metadata`);
        const data = await res.json();

        if (!data.success)
          throw new Error(data.error || "Failed to fetch metadata");

        setFiles(data.items || []);
      } catch (err: any) {
        console.error("❌ Error loading metadata:", err);
        setError(err.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    }

    fetchMetadata();
  }, [API_URL]);

  // 🧠 Unique dropdown values
  const uniqueValues = useMemo(() => {
    const getUnique = (key: keyof MetadataItem) =>
      Array.from(new Set(files.map((f) => f[key]).filter(Boolean))) as string[];
    return {
      species: getUnique("species"),
      plot: getUnique("plot"),
      experiencePoint: getUnique("experiencePoint"),
      sensorId: getUnique("sensorId"),
      deploymentId: getUnique("deploymentId"),
    };
  }, [files]);

  // 🧮 Filtering
  useEffect(() => {
    let result = [...files];
    Object.entries(filters).forEach(([key, value]) => {
      if (key !== "updatedSort" && value) {
        result = result.filter(
          (file) =>
            (file as any)[key]?.toLowerCase() === value.toLowerCase()
        );
      }
    });
    result.sort((a, b) => {
      const da = new Date(a.updatedAt || 0).getTime();
      const db = new Date(b.updatedAt || 0).getTime();
      return filters.updatedSort === "asc" ? da - db : db - da;
    });
    setFiltered(result);
  }, [filters, files]);

  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      species: "",
      plot: "",
      experiencePoint: "",
      sensorId: "",
      deploymentId: "",
      updatedSort: "desc",
    });
  };

  // 🧩 Selection logic
  const toggleSelect = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selected.length === filtered.length) {
      setSelected([]);
    } else {
      setSelected(filtered.map((f) => f.fileId));
    }
  };

  const handleEditSelected = () => {
    if (selected.length === 0) return;
    const query = selected.join(",");
    navigate(`/staging/edit?ids=${query}`);
  };

  return (
    <div className="min-h-screen w-screen bg-neutral-950 text-white flex flex-col overflow-hidden">
      <main className="flex flex-col flex-1 px-10 py-10 items-center overflow-y-auto custom-scroll">
        <div className="w-full max-w-7xl">
          {/* Header */}
          <div className="mb-10 flex items-baseline justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-white">Gallery</h1>
              <p className="text-slate-400 text-sm">
                {loading
                  ? "Loading..."
                  : `${filtered.length} of ${files.length} file${
                      files.length === 1 ? "" : "s"
                    }`}
              </p>
            </div>

            <button
              onClick={handleEditSelected}
              disabled={selected.length === 0}
              className={`px-4 py-2 rounded-md font-semibold transition ${
                selected.length === 0
                  ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                  : "bg-lime-400 text-black hover:bg-lime-300"
              }`}
            >
              Edit Selected ({selected.length})
            </button>
          </div>

          {/* Filters */}
          {!loading && files.length > 0 && (
            <div className="bg-neutral-900 border border-slate-800 rounded-lg p-4 mb-8 flex flex-wrap gap-4 items-center justify-between">
              <div className="flex flex-wrap gap-3">
                {(
                  [
                    ["species", "Species"],
                    ["plot", "Plot"],
                    ["experiencePoint", "Experience"],
                    ["sensorId", "Sensor"],
                    ["deploymentId", "Deployment"],
                  ] as const
                ).map(([key, label]) => (
                  <select
                    key={key}
                    value={filters[key]}
                    onChange={(e) =>
                      handleFilterChange(key, e.target.value)
                    }
                    className="bg-neutral-800 text-slate-200 border border-slate-700 rounded-md px-3 py-1.5 text-sm focus:ring-lime-400 focus:border-lime-400"
                  >
                    <option value="">{label}</option>
                    {uniqueValues[key].map((val) => (
                      <option key={val} value={val}>
                        {val}
                      </option>
                    ))}
                  </select>
                ))}

                {/* Updated Sort */}
                <select
                  value={filters.updatedSort}
                  onChange={(e) =>
                    handleFilterChange("updatedSort", e.target.value)
                  }
                  className="bg-neutral-800 text-slate-200 border border-slate-700 rounded-md px-3 py-1.5 text-sm focus:ring-lime-400 focus:border-lime-400"
                >
                  <option value="desc">Newest first</option>
                  <option value="asc">Oldest first</option>
                </select>
              </div>

              <button
                onClick={clearFilters}
                className="px-3 py-1.5 text-sm rounded-md bg-slate-700 hover:bg-slate-600 text-white transition"
              >
                Clear Filters
              </button>
            </div>
          )}

          {/* Table */}
          {error && (
            <p className="text-red-400 mb-6 text-center">Error: {error}</p>
          )}

          {loading ? (
            <p className="text-slate-400 text-center">Fetching data...</p>
          ) : filtered.length === 0 ? (
            <p className="text-slate-500 text-center">No matching results.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-800 bg-neutral-900 shadow-md">
              <table className="min-w-full text-sm text-slate-300 border-collapse">
                <thead className="bg-neutral-800 text-slate-100 text-left uppercase text-xs tracking-wider">
                  <tr>
                    <th className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={
                          selected.length > 0 &&
                          selected.length === filtered.length
                        }
                        onChange={toggleSelectAll}
                        className="accent-lime-400"
                      />
                    </th>
                    <th className="px-4 py-3">Species</th>
                    <th className="px-4 py-3">Plot</th>
                    <th className="px-4 py-3">Experience</th>
                    <th className="px-4 py-3">Sensor</th>
                    <th className="px-4 py-3">Deployment</th>
                    <th className="px-4 py-3">Preview</th>
                    <th className="px-4 py-3">Filename</th>
                    <th className="px-4 py-3">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((file) => {
                    const s3Url = `https://${BUCKET_NAME}.s3.amazonaws.com/${file.fileId}`;
                    const isVideo = file.filename?.match(
                      /\.(mp4|avi|mov|mkv)$/i
                    );
                    const isSelected = selected.includes(file.fileId);

                    return (
                      <tr
                        key={file.fileId}
                        className={`border-t border-slate-800 transition-colors ${
                          isSelected
                            ? "bg-lime-400/10"
                            : "hover:bg-neutral-800/50"
                        }`}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(file.fileId)}
                            className="accent-lime-400"
                          />
                        </td>
                        <td className="px-4 py-3 font-medium text-white">
                          {file.species || "—"}
                        </td>
                        <td className="px-4 py-3">{file.plot || "—"}</td>
                        <td className="px-4 py-3">
                          {file.experiencePoint || "—"}
                        </td>
                        <td className="px-4 py-3">{file.sensorId || "—"}</td>
                        <td className="px-4 py-3">{file.deploymentId || "—"}</td>
                        <td className="px-4 py-3">
                          {isVideo ? (
                            <video
                              src={s3Url}
                              className="w-24 h-16 object-cover rounded-md border border-slate-700"
                              controls
                            />
                          ) : (
                            <img
                              src={s3Url}
                              alt="thumbnail"
                              className="w-16 h-12 object-cover rounded-md border border-slate-700"
                            />
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          {file.filename || "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          {file.updatedAt
                            ? new Date(file.updatedAt).toLocaleString()
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
