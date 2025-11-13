// src/utils/generateThumbnail.ts
export function generateThumbnail(videoUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.src = videoUrl;
    video.crossOrigin = "anonymous";
    video.muted = true;
    (video as any).playsInline = true;

    const onError = (err: any) => {
      cleanup();
      reject(err || new Error("Failed to load video for thumbnail"));
    };

    const cleanup = () => {
      video.removeEventListener("loadeddata", onLoaded);
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
    };

    const onLoaded = () => {
      // Jump a tiny bit into the video to avoid black first frame if possible
      try {
        video.currentTime = 0.1;
      } catch {
        video.currentTime = 0;
      }
    };

    const onSeeked = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 160;
      canvas.height = 90;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        cleanup();
        reject(new Error("Canvas 2D context not available"));
        return;
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
      cleanup();
      resolve(dataUrl);
    };

    video.addEventListener("loadeddata", onLoaded);
    video.addEventListener("seeked", onSeeked);
    video.addEventListener("error", onError);
  });
}
