import { useLocation, useNavigate } from "react-router-dom";
import greenCubesLogo from "../../assets/greenCubesLogo.png";
import valeLogo from "../../assets/valeLogo.png";
import userIcon from "../../assets/user.png";

export function TopNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const getCurrentPage = () => {
    if (location.pathname.startsWith("/gallery")) return "File Manager";
    if (location.pathname.startsWith("/staging")) return "Register";
    if (location.pathname.startsWith("/login")) return "Login";
    return "Uploader";
  };

  const currentPage = getCurrentPage();

  const getActiveIndex = () => {
    if (location.pathname.startsWith("/upload")) return 0;
    if (location.pathname.startsWith("/staging")) return 1;
    if (location.pathname.startsWith("/gallery")) return 2;
    return 0;
  };
  const activeIndex = getActiveIndex();

  return (
    <header className="w-full text-white absolute top-0 left-0 z-50">
      <div className="w-full bg-[#141414]">
        <div className="max-w-7xl mx-auto h-24 flex items-center justify-between relative">
          <div className="flex items-center">
            <img
              src={greenCubesLogo}
              alt="Green Cubes Logo"
              className="h-10 object-contain"
            />
          </div>

          <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-3 whitespace-nowrap text-left">
            <img src={valeLogo} alt="Vale Logo" className="h-9 object-contain" />
            <span className="text-sm text-white/80">
              Vale / Brazil / Minas Águas Claras /{" "}
              <strong className="text-white font-semibold">{currentPage}</strong>
            </span>
          </div>

          <div className="flex items-center gap-1 text-slate-300 text-base">
            <span className="pt-1">Vale</span>
            <img
              src={userIcon}
              alt="User Icon"
              className="h-12 w-12 object-contain"
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto flex justify-end pt-3 text-m font-medium tracking-wide bg-transparent relative">
        <div className="flex flex-col items-center justify-center">
          <nav className="flex items-center justify-center gap-10 mb-0.5">
            <span
              onClick={() => navigate("/upload")}
              className={`uppercase cursor-pointer transition ${
                activeIndex === 0
                  ? "text-lime-500"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              Uploader
            </span>

            <span
              onClick={() => navigate("/staging/sample")}
              className={`uppercase cursor-pointer transition ${
                activeIndex === 1
                  ? "text-lime-500"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              Register
            </span>

            <span
              onClick={() => navigate("/gallery")}
              className={`uppercase cursor-pointer transition ${
                activeIndex === 2
                  ? "text-lime-500"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              File Manager
            </span>
          </nav>
          <div className="relative w-[355px] h-[3px] bg-slate-700 rounded-full overflow-hidden">
            <div
              className="absolute top-0 left-0 h-full bg-lime-500 transition-all duration-300"
              style={{
                width: "33.333333333%",
                transform: `translateX(${activeIndex * 100}%)`,
              }}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
