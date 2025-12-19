import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { TopNav } from "./components/TopNav";
import { GalleryPage } from "./routes/GalleryPage";
import { UploadPage } from "./routes/UploadPage";
import { ImageStoreProvider } from "./state/useImageStore";

export default function App() {
  return (
    <BrowserRouter>
      <ImageStoreProvider>
        <div className="min-h-screen bg-neutral-950 text-white">
          <TopNav />
          <Routes>
            <Route path="/" element={<Navigate to="/gallery?view=draft" replace />} />
            <Route path="/gallery" element={<GalleryPage />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="*" element={<Navigate to="/gallery?view=draft" replace />} />
          </Routes>
        </div>
      </ImageStoreProvider>
    </BrowserRouter>
  );
}
