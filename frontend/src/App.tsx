import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import type { JSX } from "react";
import { UploadPage } from "./routes/UploadPage";
import { StagingPage } from "./routes/StagingPage";
import { GalleryPage } from "./routes/GalleryPage";
import { LoginPage } from "./routes/LoginPage";
import { ImageStoreProvider } from "./state/useImageStore";
import { TopNav } from "./components/TopNav";

// Reusable route guard
function PrivateRoute({ children }: { children: JSX.Element }) {
  const isAuth = localStorage.getItem("auth") === "true";
  return isAuth ? children : <Navigate to="/" replace />;
}

function AppContent() {
  const location = useLocation();
  const showTopNav = location.pathname !== "/";

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100">
      {/* Show navbar only when logged in */}
      {showTopNav && <TopNav />}

      <main
        className={`flex-1 flex justify-center items-start overflow-hidden bg-neutral-950 ${
          showTopNav ? "pt-24" : "pt-0"
        }`}
      >
        <Routes>
          {/* Public route */}
          <Route path="/" element={<LoginPage />} />

          {/* Protected routes */}
          <Route
            path="/upload"
            element={
              <PrivateRoute>
                <UploadPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/staging/:id"
            element={
              <PrivateRoute>
                <StagingPage />
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

          {/* Catch-all redirect */}
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
