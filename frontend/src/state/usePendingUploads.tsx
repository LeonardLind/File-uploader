import { createContext, useContext, useState, type ReactNode } from "react";

export type PendingVideo = {
  id: string;
  file: File;
  saved: boolean;
  uploading?: boolean;
  progress?: number;
};

type PendingUploadsContextType = {
  videos: PendingVideo[];
  addFiles: (files: File[]) => void;
  updateVideo: (id: string, data: Partial<PendingVideo>) => void;
};

const PendingUploadsContext = createContext<PendingUploadsContextType | null>(null);

export function PendingUploadsProvider({ children }: { children: ReactNode }) {
  const [videos, setVideos] = useState<PendingVideo[]>([]);

  // Add new files to the upload queue.
  async function addFiles(files: File[]) {
    const results: PendingVideo[] = [];

    for (const file of files) {
      // make a new id for each file
      const id = crypto.randomUUID();

      results.push({
        id,
        file,
        saved: false,
        uploading: false,
        progress: 0,
      });
    }

    setVideos((prev) => [...prev, ...results]);
  }

  function updateVideo(id: string, data: Partial<PendingVideo>) {
    setVideos((prev) =>
      prev.map((video) => {
        if (video.id !== id) return video;

        return { ...video, ...data };
      })
    );
  }

  return (
    <PendingUploadsContext.Provider value={{ videos, addFiles, updateVideo }}>
      {children}
    </PendingUploadsContext.Provider>
  );
}

export function usePendingUploads() {
  const ctx = useContext(PendingUploadsContext);
  if (!ctx) throw new Error("usePendingUploads must be used inside <PendingUploadsProvider>");
  return ctx;
}
