import { createContext, useContext, useState, type ReactNode } from "react";

export type PendingImage = {
  id: string;
  file: File;            // 🆕 actual file
  previewUrl: string;    // local preview blob URL
  saved: boolean;        // whether uploaded/registered
  species?: string;
  experiencePoint?: string;
  sensorId?: string;
  deploymentId?: string;
  experienceId?: string;
};

type ImageStoreContextType = {
  images: PendingImage[];
  addFiles: (files: File[]) => void;
  updateImage: (id: string, data: Partial<PendingImage>) => void;
};

const ImageStoreContext = createContext<ImageStoreContextType | null>(null);

export function ImageStoreProvider({ children }: { children: ReactNode }) {
  const [images, setImages] = useState<PendingImage[]>([]);

  /** Add new local files to staging (not uploaded yet) */
  function addFiles(files: File[]) {
    const next = files.map((file) => {
      const id = crypto.randomUUID();
      const previewUrl = URL.createObjectURL(file);
      return {
        id,
        file,        // 🆕 keep original file
        previewUrl,
        saved: false,
      } satisfies PendingImage;
    });

    setImages((prev) => [...prev, ...next]);
  }

  /** Update a staged image by ID (used after upload or metadata save) */
  function updateImage(id: string, data: Partial<PendingImage>) {
    setImages((prev) =>
      prev.map((img) => (img.id === id ? { ...img, ...data } : img))
    );
  }

  return (
    <ImageStoreContext.Provider
      value={{
        images,
        addFiles,
        updateImage,
      }}
    >
      {children}
    </ImageStoreContext.Provider>
  );
}

export function useImageStore() {
  const ctx = useContext(ImageStoreContext);
  if (!ctx) {
    throw new Error("useImageStore must be used inside <ImageStoreProvider>");
  }
  return ctx;
}
