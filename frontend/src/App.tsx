import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { TopNav } from "./components/TopNav";
import { GalleryPage } from "./routes/GalleryPage";
import { UploadPage } from "./routes/UploadPage";
import { LoginPage } from "./routes/LoginPage";
import { ToastProvider } from "./components/ToastProvider";

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <div className="min-h-screen bg-neutral-950 text-white">
          <TopNav />
          <Routes>
            <Route path="/" element={<Navigate to="/gallery?view=draft" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/gallery" element={<GalleryPage />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="*" element={<Navigate to="/gallery?view=draft" replace />} />
          </Routes>
        </div>
      </ToastProvider>
    </BrowserRouter>
  );
}
