import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import greenCubesLogo from "../assets/greenCubesLogo.png";

type ConfirmedSpeciesSummary = {
  species: string;
  count: number;
  common_name?: string | null;
  class_name?: string | null;
  red_list_category_code?: string | null;
  red_list_category_label?: string | null;
  assessment_year?: string | null;
  assessment_url?: string | null;
};

export function TopNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryItems, setSummaryItems] = useState<ConfirmedSpeciesSummary[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const search = new URLSearchParams(location.search);
  const isUpload = location.pathname.startsWith("/upload");
  const view = search.get("view") ?? (isUpload ? null : "draft");
  const normalizedView = view === "action" ? "display" : view;
  const activeIndex =
    normalizedView === "id"
      ? 1
      : normalizedView === "done"
      ? 2
      : normalizedView === "display"
      ? 3
      : normalizedView === "draft"
      ? 0
      : -1;
  const indicatorWidths = ["20.8%", "9%", "21%", "27%"];
  const indicatorOffsets = ["0%", "29%", "45%", "74%"];

  const API_URL = import.meta.env.VITE_API_URL;

  const totalConfirmed = useMemo(
    () => summaryItems.reduce((total, item) => total + item.count, 0),
    [summaryItems]
  );

  const loadSummary = async () => {
    try {
      setSummaryLoading(true);
      setSummaryError(null);
      const res = await fetch(`${API_URL}/api/upload/confirmed-summary`);
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "Failed to load summary");
      }
      setSummaryItems(data.items || []);
    } catch (err: unknown) {
      setSummaryError(err instanceof Error ? err.message : "Failed to load summary");
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => {
    if (!summaryOpen) return;
    loadSummary();
  }, [summaryOpen]);

  const statusTone = (code?: string | null) => {
    switch (code) {
      case "CR":
      case "EN":
        return "border-red-500 text-red-200";
      case "VU":
      case "NT":
        return "border-amber-400 text-amber-200";
      case "LC":
        return "border-lime-400 text-lime-200";
      case "DD":
      case "NE":
        return "border-slate-500 text-slate-300";
      default:
        return "border-slate-700 text-slate-400";
    }
  };

  return (
    <>
      <header className="fixed top-0 left-0 w-full z-50 text-white bg-[#0f0f10]">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
          <div className="flex items-center gap-3">
            <img src={greenCubesLogo} alt="Green Cubes Logo" className="h-7 sm:h-8 lg:h-9" />
          </div>

          <nav className="relative flex items-center gap-3 sm:gap-5">
            <div className="absolute left-0 right-0 bottom-0 h-[2px] bg-slate-700 z-0" />
            {activeIndex >= 0 && (
              <div
                className="absolute bottom-0 h-[2px] bg-lime-500 rounded-full transition-all duration-300 ease-out z-10"
                style={{ width: indicatorWidths[activeIndex], left: indicatorOffsets[activeIndex] }}
              />
            )}
            {[
              { label: "Draft", view: "draft", i: 0 },
              { label: "ID", view: "id", i: 1 },
              { label: "Done", view: "done", i: 2 },
              { label: "Display", view: "display", i: 3 },
            ].map(({ label, view: nextView, i }) => (
              <span
                key={label}
                onClick={() => navigate(`/gallery?view=${nextView}`)}
                className={`relative z-20 uppercase cursor-pointer text-[13px] sm:text-sm pb-1 transition ${
                  activeIndex === i ? "text-lime-500" : "text-slate-300 hover:text-white"
                }`}
              >
                {label}
              </span>
            ))}
          </nav>

          <div className="flex items-center gap-3 sm:gap-4 text-slate-300">
            <button
              onClick={() => setSummaryOpen(true)}
              className={`group flex items-center gap-2 bg-neutral-800 border rounded-md px-2.5 py-1.5 transition text-sm ${
                summaryOpen ? "border-lime-400" : "border-slate-700 hover:border-lime-400"
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className={`h-5 w-5 transition-colors ${
                  summaryOpen ? "text-lime-400" : "text-slate-200 group-hover:text-lime-400"
                }`}
              >
                <path d="M4 6h16" />
                <path d="M4 12h16" />
                <path d="M4 18h16" />
              </svg>
              <span className="text-xs text-white hidden sm:inline">Overview</span>
            </button>
            <button
              onClick={() => navigate("/upload")}
              className={`group flex items-center gap-2 bg-neutral-800 border rounded-md px-2.5 py-1.5 transition text-sm ${
                isUpload ? "border-lime-400" : "border-slate-700 hover:border-lime-400"
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className={`h-5 w-5 transition-colors ${
                  isUpload ? "text-lime-400" : "text-slate-200 group-hover:text-lime-400"
                }`}
              >
                <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
                <path d="M12 4v10" />
                <path d="M8 8l4-4 4 4" />
              </svg>
              <span className="text-xs text-white hidden sm:inline">Upload</span>
            </button>
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
              className="h-6 w-6 sm:h-6 sm:w-6 lg:h-7 lg:w-7 text-slate-200"
            >
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20a8 8 0 0 1 16 0H4z" />
            </svg>
          </div>
        </div>
      </header>

      {summaryOpen && (
        <div className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="w-full max-w-5xl bg-neutral-950 border border-slate-800 rounded-2xl shadow-2xl p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Confirmed animals</p>
                <h3 className="text-lg font-semibold text-white">Species summary</h3>
                <p className="text-xs text-slate-500 mt-1">
                  {summaryItems.length === 0
                    ? "Only items with ID State = Confirmed."
                    : `${summaryItems.length} species, ${totalConfirmed} total confirmations.`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={loadSummary}
                  className="text-[11px] sm:text-xs px-3 py-1.5 rounded-md border border-slate-700 text-slate-200 hover:border-lime-400 transition"
                >
                  Refresh
                </button>
                <button
                  onClick={() => setSummaryOpen(false)}
                  className="text-[11px] sm:text-xs px-3 py-1.5 rounded-md bg-lime-400 text-black font-semibold hover:bg-lime-300 transition"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="mt-4 max-h-[65vh] overflow-y-auto pr-1 custom-scroll">
              {summaryLoading ? (
                <div className="text-sm text-slate-400 animate-pulse py-6 text-center">
                  Loading confirmed species...
                </div>
              ) : summaryError ? (
                <div className="text-sm text-red-400 py-6 text-center">{summaryError}</div>
              ) : summaryItems.length === 0 ? (
                <div className="text-sm text-slate-400 py-6 text-center">
                  No confirmed species found yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {summaryItems.map((item) => (
                    <div
                      key={item.species}
                      className="rounded-lg border border-slate-800 bg-neutral-900 p-3 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-white">{item.species}</p>
                          {item.common_name && (
                            <p className="text-xs text-slate-400">{item.common_name}</p>
                          )}
                          {item.class_name && (
                            <p className="text-[11px] text-slate-500">{item.class_name}</p>
                          )}
                        </div>
                        <span className="inline-flex items-center justify-center rounded-full bg-lime-400 text-black text-xs font-semibold px-2 py-1">
                          {item.count}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-300">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full border ${statusTone(
                            item.red_list_category_code
                          )}`}
                        >
                          {item.red_list_category_code || "Unknown"}
                        </span>
                        {item.red_list_category_label && (
                          <span className="text-slate-400">{item.red_list_category_label}</span>
                        )}
                        {item.assessment_year && (
                          <span className="text-slate-500">Year {item.assessment_year}</span>
                        )}
                        {item.assessment_url && (
                          <a
                            href={item.assessment_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-lime-300 hover:text-lime-200"
                          >
                            IUCN
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
