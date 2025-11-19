export function generateQuickThumbnail(file: File, time = 1): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);

    video.preload = "metadata";
    video.src = url;
    video.muted = true;
    video.playsInline = true;

    video.onloadeddata = () => {
      video.currentTime = time;
    };

    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) return reject("Canvas unsupported");

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url);
        if (!blob) return reject("Thumbnail failed");

        resolve(URL.createObjectURL(blob)); // <<< FAST BLOB URL
      }, "image/jpeg", 0.8);
    };

    video.onerror = reject;
  });
}
