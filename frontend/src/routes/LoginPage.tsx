import { useState } from "react";
import { useNavigate } from "react-router-dom";
import forestImage from "../assets/forst.png";
import greenCubesLogo from "../assets/greenCubesLogo.png";
import menuIcon from "../assets/hamburger.png";

export function LoginPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    navigate("/upload");
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden text-white flex flex-col">
      <img
        src={forestImage}
        alt="forest background"
        className="absolute inset-0 w-full h-full object-cover"
      />

      <div className="absolute inset-0 bg-black/60" />

      <header className="relative z-10 w-full h-[6rem] ">
        <div className=" mx-auto h-full flex items-center justify-between px-12 pt-12">
          <div className="flex items-center gap-3">
            <img
              src={greenCubesLogo}
              alt="Green Cubes Logo"
              className="h-11 object-contain mt-3"
            />
            <div className="w-[0.15rem] rounded-xl h-16 bg-white/60" />
            <span className="text-white/90 text-2xl font-semibold tracking-wide">
              Image &amp; Audio uploader
            </span>
          </div>

          <div className="flex items-center">
            <img
              src={menuIcon}
              alt="Menu"
              className="h-8 w-17 opacity-80 hover:opacity-100 transition cursor-pointer"
            />
          </div>
        </div>
      </header>

      <div className="relative z-10 flex flex-1 items-center justify-center w-full">
        <div className="bg-neutral-900/90 rounded-xl w-full max-w-4xl h-[60vh] shadow-2xl border border-slate-800 flex items-center justify-center">
          <div className="text-center w-full max-w-md flex flex-col items-center justify-center gap-6">
            <h1 className="text-3xl font-semibold text-lime-500">
              Image &amp; Audio uploader
            </h1>

            <p className="text-sm text-slate-400 leading-relaxed max-w-xl">
              If you do not have an account please contact a support member{" "}
              <span className="text-lime-500 hover:underline cursor-pointer">
                HERE
              </span>
            </p>

            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-5 w-full items-center"
            >
              <label className="text-sm text-slate-200 font-medium self-start">
                Login
              </label>

              <input
                type="text"
                placeholder="First name"
                className="w-full h-[3.5rem] rounded-md bg-transparent border border-white px-6 text-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-lime-500/40 focus:border-lime-500"
                required
              />

              <div className="relative w-full">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="********"
                  className="w-full h-[3.5rem] rounded-md bg-transparent border border-white px-6 text-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-lime-500/40 focus:border-lime-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute inset-y-0 right-4 flex items-center text-slate-400 hover:text-slate-200"
                >
                  {"👁️"}
                </button>
              </div>

              <button
                type="submit"
                className="w-full h-[3.5rem] bg-lime-500 text-neutral-900 font-semibold rounded-md hover:bg-lime-400 transition-colors"
              >
                Login
              </button>

              <p className="text-xs text-slate-400">
                Forgotten password?{" "}
                <span className="text-lime-500 hover:underline cursor-pointer">
                  send reminder here
                </span>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
