// src/utils/ffmpegLoader.ts

export async function loadFFmpeg() {
  try {
    const FFmpegModule = await import(
      /* @vite-ignore */ "https://unpkg.com/@ffmpeg/ffmpeg@0.12.15/dist/ffmpeg.min.mjs"
    );

    const { createFFmpeg, fetchFile } = FFmpegModule as any;

    if (typeof createFFmpeg !== "function") {
      console.error("⚠️ FFmpeg module keys:", Object.keys(FFmpegModule));
      throw new Error("❌ FFmpeg module did not export createFFmpeg()");
    }

    const ffmpeg = createFFmpeg({
      log: true,
      corePath: "https://unpkg.com/@ffmpeg/core@0.12.6/dist/ffmpeg-core.js",
    });

    console.log("🧩 Preloading FFmpeg core from CDN...");
    await ffmpeg.load();
    console.log("✅ FFmpeg ready!");

    return { ffmpeg, fetchFile };
  } catch (err) {
    console.error("❌ Failed to load FFmpeg:", err);
    throw err;
  }
}
