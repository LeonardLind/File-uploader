import { useLocation, useNavigate } from "react-router-dom";
import greenCubesLogo from "../assets/greenCubesLogo.png";

export function TopNav() {
  const location = useLocation();
  const navigate = useNavigate();

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

  return (
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
            onClick={() => navigate("/upload")}
            title="Manual upload"
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
  );
}
