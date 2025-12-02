import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import type { JSX } from "react";
import { UploadPage } from "./routes/UploadPage";
import { GalleryPage } from "./routes/GalleryPage";
import { LoginPage } from "./routes/LoginPage";
import { ImageStoreProvider } from "./state/useImageStore";
import { TopNav } from "./components/TopNav";
import { getFFmpeg } from "./utils/ffmpegSingleton";

function PrivateRoute({ children }: { children: JSX.Element }) {
  const isAuth = localStorage.getItem("auth") === "true";
  return isAuth ? children : <Navigate to="/" replace />;
}

function AppContent() {
  const location = useLocation();
  const showTopNav = location.pathname !== "/";
  const isAuth = localStorage.getItem("auth") === "true";

  useEffect(() => {
    (async () => {
      try {
        console.log("Preloading FFmpeg...");
        await getFFmpeg();
        console.log("FFmpeg ready for use");
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
          showTopNav ? "pt-20" : "pt-0"
        }`}
      >
        <Routes>
          <Route
            path="/"
            element={isAuth ? <Navigate to="/gallery" replace /> : <LoginPage />}
          />
          <Route
            path="/upload"
            element={
              <PrivateRoute>
                <UploadPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/gallery"
            element={
              <PrivateRoute>
                <GalleryPage />
              </PrivateRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ImageStoreProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </ImageStoreProvider>
  );
}
