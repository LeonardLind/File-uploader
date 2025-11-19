// src/state/useImageStore.tsx
import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
// import { generateThumbnailBlob } from "../utils/ffmpegThumbnail";
import { generateQuickThumbnail } from "../utils/generateQuickThumbnail";

export type PendingImage = {
  id: string;
  file: File;
  previewUrl: string;          // video URL blob
  previewImageUrl?: string;    // thumbnail image blob
  saved: boolean;
  uploading?: boolean;
  progress?: number;
  species?: string;
  plot?: string;
  experiencePoint?: string;
  sensorId?: string;
  deploymentId?: string;
};

type ImageStoreContextType = {
  images: PendingImage[];
  addFiles: (files: File[]) => void;
  updateImage: (id: string, data: Partial<PendingImage>) => void;
  removeImage: (id: string) => void;
};

const ImageStoreContext = createContext<ImageStoreContextType | null>(null);

export function ImageStoreProvider({ children }: { children: ReactNode }) {
  const [images, setImages] = useState<PendingImage[]>([]);

  /* -------------------------------------------------------------
      ADD FILES
  -------------------------------------------------------------- */
async function addFiles(files: File[]) {
  const results: PendingImage[] = [];

  for (const file of files) {
    const id = crypto.randomUUID();
    const previewUrl = URL.createObjectURL(file);

    let previewImageUrl = previewUrl;

    try {
      previewImageUrl = await generateQuickThumbnail(file);
    } catch {}

    results.push({
      id,
      file,
      previewUrl,
      previewImageUrl,
      saved: false,
      uploading: false,
      progress: 0,
    });
  }

  setImages((prev) => [...prev, ...results]);
}


  /* -------------------------------------------------------------
      UPDATE IMAGE — with URL cleanup!
  -------------------------------------------------------------- */
  function updateImage(id: string, data: Partial<PendingImage>) {
    setImages((prev) =>
      prev.map((img) => {
        if (img.id !== id) return img;

        // 🔥 If a NEW previewImageUrl arrives → revoke the OLD one
        if (
          data.previewImageUrl &&
          img.previewImageUrl &&
          img.previewImageUrl !== data.previewImageUrl
        ) {
          URL.revokeObjectURL(img.previewImageUrl);
        }

        // 🔥 If a NEW previewUrl arrives (rare) → revoke the OLD one
        if (
          data.previewUrl &&
          img.previewUrl &&
          img.previewUrl !== data.previewUrl
        ) {
          URL.revokeObjectURL(img.previewUrl);
        }

        return { ...img, ...data };
      })
    );
  }

  /* -------------------------------------------------------------
      REMOVE IMAGE — revoke both blob URLs
  -------------------------------------------------------------- */
  function removeImage(id: string) {
    setImages((prev) => {
      const target = prev.find((img) => img.id === id);

      if (target) {
        URL.revokeObjectURL(target.previewUrl);
        if (target.previewImageUrl) {
          URL.revokeObjectURL(target.previewImageUrl);
        }
      }

      return prev.filter((img) => img.id !== id);
    });
  }

  return (
    <ImageStoreContext.Provider
      value={{ images, addFiles, updateImage, removeImage }}
    >
      {children}
    </ImageStoreContext.Provider>
  );
}

export function useImageStore() {
  const ctx = useContext(ImageStoreContext);
  if (!ctx)
    throw new Error("useImageStore must be used inside <ImageStoreProvider>");
  return ctx;
}
