// src/utils/ffmpegLoader.ts
export async function loadFFmpeg() {
  try {
    const mod: any = await import("@ffmpeg/ffmpeg");

    // Detect whether it’s the class-based or function-based build
    const FFmpegClass = mod.FFmpeg || mod.default?.FFmpeg;
    const createFFmpeg = mod.createFFmpeg || mod.default?.createFFmpeg;
    const fetchFile =
      mod.fetchFile || mod.default?.fetchFile || mod.FFmpeg?.fetchFile;

    let ffmpeg: any;

    if (FFmpegClass) {
      // ✅ Newer class-based API
      ffmpeg = new FFmpegClass();
      console.log("🧩 Detected class-based FFmpeg build");
    } else if (typeof createFFmpeg === "function") {
      // ✅ Legacy factory API
      ffmpeg = createFFmpeg({ log: true });
      console.log("🧩 Detected function-based FFmpeg build");
    } else {
      console.error("⚠️ FFmpeg module keys:", Object.keys(mod));
      throw new Error("❌ No valid FFmpeg export found");
    }

    if (!ffmpeg.isLoaded || !ffmpeg.isLoaded()) {
      console.log("🧩 Preloading FFmpeg...");
      await ffmpeg.load();
      console.log("✅ FFmpeg ready!");
    }

    return { ffmpeg, fetchFile };
  } catch (err) {
    console.error("❌ Failed to load FFmpeg:", err);
    throw err;
  }
}
