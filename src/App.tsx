import { BrowserRouter, Routes, Route } from "react-router-dom";
import { UploadPage } from "./routes/UploadPage";
import { StagingPage } from "./routes/StagingPage";
import { GalleryPage } from "./routes/GalleryPage";
import { LoginPage } from "./routes/LoginPage";
import { ImageStoreProvider } from "./state/useImageStore";
import { TopNav } from "./components/TopNav";

function App() {
  return (
    <ImageStoreProvider>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
          <TopNav />
          <main className="flex-1 p-6 flex justify-center">
            <Routes>
              <Route path="/" element={<LoginPage />} />
              <Route path="/upload" element={<UploadPage />} />
              <Route path="/staging/:id" element={<StagingPage />} />
              <Route path="/gallery" element={<GalleryPage />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </ImageStoreProvider>
  );
}

export default App;
