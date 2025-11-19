import { useLocation, useNavigate } from "react-router-dom";
import greenCubesLogo from "../assets/greenCubesLogo.png";
import valeLogo from "../assets/valeLogo.png";
import userIcon from "../assets/user.png";

export function TopNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const currentPage =
    location.pathname.startsWith("/gallery")
      ? "File Manager"
      : location.pathname.startsWith("/staging")
      ? "Register"
      : "Uploader";

  const activeIndex = location.pathname.startsWith("/staging")
    ? 1
    : location.pathname.startsWith("/gallery")
    ? 2
    : 0;

  return (
    <header className="fixed top-0 left-0 w-full z-50 text-white">
      {/* TOP BAR */}
      <div className="bg-[#0f0f10] ">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 lg:px-8 h-20">
          
          {/* LEFT LOGO */}
          <img src={greenCubesLogo} alt="Green Cubes Logo" className="h-8 sm:h-9 lg:h-10" />

          {/* CENTER TITLE */}
          <div className="flex items-center gap-2 sm:gap-3">
            <img src={valeLogo} alt="Vale Logo" className="h-7 sm:h-8 lg:h-9 object-contain" />
            <span className="text-xs sm:text-sm lg:text-base text-white/80 whitespace-nowrap">
              Vale / Brazil / Minas Águas Claras /
              <strong className="text-white ml-1">{currentPage}</strong>
            </span>
          </div>

          {/* RIGHT USER */}
          <div className="flex items-center gap-2 sm:gap-3 text-slate-300">
            <span className="text-xs sm:text-sm lg:text-base">Vale</span>
            <img src={userIcon} alt="User Icon" className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12" />
          </div>
        </div>
      </div>

      {/* BOTTOM NAV */}
      <div className="bg-transparent flex flex-col items-center pt-3">
        
        {/* NAV LINKS */}
        <nav className="flex gap-6 sm:gap-8 lg:gap-10 text-xs sm:text-sm lg:text-xl">
          {[
            { label: "Uploader", path: "/upload", i: 0 },
            { label: "Register", path: "/staging/sample", i: 1 },
            { label: "File Manager", path: "/gallery", i: 2 },
          ].map(({ label, path, i }) => (
            <span
              key={label}
              onClick={() => navigate(path)}
              className={`uppercase cursor-pointer transition ${
                activeIndex === i ? "text-lime-500" : "text-slate-300 hover:text-white"
              }`}
            >
              {label}
            </span>
          ))}
        </nav>

        {/* UNDERLINE BAR (transparent background) */}
        <div className="relative w-[300px] sm:w-[330px] lg:w-[440px] h-[3px] bg-slate-700 mt-1 rounded-full overflow-hidden">
          <div
            className="absolute top-0 left-0 h-full bg-lime-500 transition-transform duration-300"
            style={{ width: "33.333%", transform: `translateX(${activeIndex * 100}%)` }}
          />
        </div>
      </div>
    </header>
  );
}
