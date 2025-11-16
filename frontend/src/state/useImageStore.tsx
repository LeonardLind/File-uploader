import { createContext, useContext, useState, type ReactNode } from "react";

export type PendingImage = {
  id: string;
  file: File;
  previewUrl: string;
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

  function addFiles(files: File[]) {
    const next = files.map((file) => {
      const id = crypto.randomUUID();
      const previewUrl = URL.createObjectURL(file);
      return {
        id,
        file,
        previewUrl,
        saved: false,
        uploading: false,
        progress: 0,
      } satisfies PendingImage;
    });
    setImages((prev) => [...prev, ...next]);
  }

  function updateImage(id: string, data: Partial<PendingImage>) {
    setImages((prev) =>
      prev.map((img) => (img.id === id ? { ...img, ...data } : img))
    );
  }

  function removeImage(id: string) {
    setImages((prev) => prev.filter((img) => img.id !== id));
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
