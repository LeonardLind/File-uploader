// src/app/App.tsx
import { useEffect } from "react";
import { BrowserRouter, useLocation } from "react-router-dom";

import { ImageStoreProvider } from "../state/useImageStore";
import { TopNav } from "../components/layout/TopNav";
import { getFFmpeg } from "../utils/ffmpegSingleton";
import { AppRoutes } from "./routes";

/**
 * Layout component that is aware of the current location.
 * Responsible for:
 * - Showing or hiding the top navigation
 * - Preloading FFmpeg on startup
 * - Rendering the routed pages in the main area
 */
function AppLayout() {
  const location = useLocation();
  const showTopNav = location.pathname !== "/";

  // Preload FFmpeg once at app startup so later operations feel instant.
  useEffect(() => {
    (async () => {
      try {
        // Preload shared FFmpeg client
        await getFFmpeg();
      } catch (err) {
        console.error("Failed to preload FFmpeg:", err);
      }
    })();
  }, []);

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100">
      {showTopNav && <TopNav />}

      <main
        className={`flex-1 flex justify-center items-start overflow-hidden bg-neutral-950 ${
          showTopNav ? "pt-24" : "pt-0"
        }`}
      >
        <AppRoutes />
      </main>
    </div>
  );
}

/**
 * Root application component.
 * Wraps routing with providers that are global to the whole app.
 */
export default function App() {
  return (
    <ImageStoreProvider>
      <BrowserRouter>
        <AppLayout />
      </BrowserRouter>
    </ImageStoreProvider>
  );
}
