import { useState } from "react";
import { useNavigate, NavLink } from "react-router-dom";
import forestImage from "../assets/forst.png";

export function LoginPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    navigate("/"); // temporary login behavior
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden text-white">
      {/* full background image */}
      <img
        src={forestImage}
        alt="forest background"
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* dark overlay */}
      <div className="absolute inset-0 bg-black/60" />

      {/* navbar */}
      <header className="relative z-10 flex justify-between items-center px-8 py-5 text-sm tracking-wide">
        <div className="flex items-center gap-3">
          <div className="font-bold text-lg">
            <span className="text-lime-500">GREEN CUBES</span>
          </div>
          <div className="text-slate-300">| Image &amp; Audio uploader</div>
        </div>

        <nav className="flex items-center gap-8">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `uppercase ${
                isActive
                  ? "text-lime-500 border-b border-lime-500 pb-1"
                  : "text-slate-300 hover:text-white"
              }`
            }
          >
            Uploader
          </NavLink>
          <NavLink
            to="/staging/sample"
            className="uppercase text-slate-300 hover:text-white"
          >
            Register
          </NavLink>
          <NavLink
            to="/gallery"
            className="uppercase text-slate-300 hover:text-white"
          >
            File Manager
          </NavLink>
        </nav>
      </header>

      {/* centered login card */}
      <div className="relative z-10 flex justify-center items-center w-full h-[calc(100vh-5rem)] px-4">
  {/* outer card */}
  <div className="bg-neutral-900 rounded-xl w-full max-w-4xl h-[60vh] shadow-2xl border border-slate-800 flex justify-center items-center">
  {/* inner content box */}
  <div className="text-center px-20 py-10 flex flex-col items-center justify-center gap-8">
    <h1 className="text-3xl font-semibold text-lime-500 mb-4">
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
      className="flex flex-col gap-6 w-full max-w-md items-center"
    >
      <label className="text-sm text-slate-200 font-medium self-start">
        Login
      </label>

      <input
  type="text"
  placeholder="First name"
  className="w-full rounded-md bg-transparent border border-white px-8 py-4 text-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-lime-500/40 focus:border-lime-500"
  required
/>

      <div className="relative w-full">
        <input
          type={showPassword ? "text" : "password"}
          placeholder="********"
          className="w-full rounded-md bg-transparent border border-white px-8 py-4 text-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-lime-500/40 focus:border-lime-500"
          required
        />
        <button
          type="button"
          onClick={() => setShowPassword((p) => !p)}
          className="absolute inset-y-0 right-4 flex items-center text-slate-400 hover:text-slate-200"
        >
          { "👁️"}
        </button>
      </div>

<button
  type="button"
  onClick={() => navigate("/upload")}
  className="w-full mt-2 bg-lime-500 text-neutral-900 font-semibold py-3 rounded-md hover:bg-lime-400 transition-colors"
>
  Login
</button>

      <p className="text-xs text-slate-400 mt-3">
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
