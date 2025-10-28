import { Link, NavLink } from "react-router-dom";

export function TopNav() {
  const base =
    "text-sm font-medium px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800";
  const active =
    "text-white bg-slate-800";

  return (
    <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-6">
        <Link
          to="/"
          className="text-white font-semibold text-lg tracking-tight"
        >
          Forest Ingest
        </Link>

        <nav className="flex gap-2">
          <NavLink
            to="/"
            className={({ isActive }) =>
              isActive ? `${base} ${active}` : base
            }
          >
            Upload
          </NavLink>
          <NavLink
            to="/gallery"
            className={({ isActive }) =>
              isActive ? `${base} ${active}` : base
            }
          >
            Gallery
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
