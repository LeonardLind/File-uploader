import { useLocation, useNavigate } from "react-router-dom";
import greenCubesLogo from "../assets/greenCubesLogo.png";
import valeLogo from "../assets/valeLogo.png";
import userIcon from "../assets/user.png";

export function TopNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const search = new URLSearchParams(location.search);
  const view = search.get("view") ?? "draft";
  const activeIndex = view === "done" ? 1 : view === "action" ? 2 : 0;

  return (
    <header className="fixed top-0 left-0 w-full z-50 text-white bg-[#0f0f10]">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 lg:px-8 h-20">
        <div className="flex items-center gap-3">
          <img src={greenCubesLogo} alt="Green Cubes Logo" className="h-8 sm:h-9 lg:h-10" />
          <img src={valeLogo} alt="Vale Logo" className="h-7 sm:h-8 lg:h-9 object-contain" />
        </div>

        <nav className="flex items-center gap-4 sm:gap-6">
          {[
            { label: "Draft", path: "/gallery?view=draft", i: 0 },
            { label: "Done", path: "/gallery?view=done", i: 1 },
            { label: "Action", path: "/gallery?view=action", i: 2 },
          ].map(({ label, path, i }) => (
            <span
              key={label}
              onClick={() => navigate(path)}
              className={`uppercase cursor-pointer text-sm sm:text-base transition ${
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
            className="flex items-center gap-2 bg-neutral-800 border border-slate-700 rounded-md px-3 py-2 hover:border-lime-400 transition"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-lime-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 2a1 1 0 01.894.553l2 4A1 1 0 0112 8H8a1 1 0 01-.894-1.447l2-4A1 1 0 0110 2zm-4 7a1 1 0 011 1v4h2v-3a1 1 0 112 0v3h2v-4a1 1 0 112 0v5a1 1 0 01-1 1H5a1 1 0 01-1-1v-5a1 1 0 011-1z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-sm text-white hidden sm:inline">Upload</span>
          </button>
          <img src={userIcon} alt="User Icon" className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12" />
        </div>
      </div>
    </header>
  );
}
