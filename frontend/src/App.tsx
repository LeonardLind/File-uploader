import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { UploadPage } from "./routes/UploadPage";
import { StagingPage } from "./routes/StagingPage";
import { GalleryPage } from "./routes/GalleryPage";
import { LoginPage } from "./routes/LoginPage";
import { ImageStoreProvider } from "./state/useImageStore";
import { TopNav } from "./components/TopNav";

function AppContent() {
  const location = useLocation();
  const showTopNav = location.pathname !== "/";

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100">
      {showTopNav && <TopNav />}

      <main
        className={`flex-1 flex justify-center items-start overflow-hidden bg-neutral-950 ${
          showTopNav ? "pt-[6rem]" : "pt-0"
        }`}
      >
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/staging/:id" element={<StagingPage />} />
          <Route path="/gallery" element={<GalleryPage />} />
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
