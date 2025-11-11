import { useEffect, useRef, useState } from "react";
import { getFFmpeg } from "../utils/ffmpegSingleton";

type VideoTrimmerProps = {
  file: File;
  onTrimmed: (trimmedFile: File) => void;
  onClose: () => void;
};

export function VideoTrimmer({ file, onTrimmed, onClose }: VideoTrimmerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  const [duration, setDuration] = useState(0);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState<number | null>(null);
  const [processing, setProcessing] = useState(false);
  const [dragging, setDragging] = useState<"start" | "end" | null>(null);

  // ✅ only set duration once
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoaded = () => {
      const dur = video.duration;
      setDuration(dur);
      // only set `end` if it hasn’t been manually set yet
      setEnd((prev) => (prev === null ? dur : prev));
    };

    video.addEventListener("loadedmetadata", handleLoaded);
    return () => video.removeEventListener("loadedmetadata", handleLoaded);
  }, []);

  // 🧩 Handle dragging
  const handleMouseMove = (e: MouseEvent) => {
    if (!barRef.current || !duration || !dragging) return;

    const rect = barRef.current.getBoundingClientRect();
    const ratio = Math.min(Math.max(0, (e.clientX - rect.left) / rect.width), 1);
    const time = ratio * duration;

    if (dragging === "start") {
      const newStart = Math.min(time, (end ?? duration) - 0.1);
      setStart(newStart);
      if (videoRef.current) videoRef.current.currentTime = newStart;
    } else if (dragging === "end") {
      const newEnd = Math.max(time, start + 0.1);
      setEnd(newEnd);
      if (videoRef.current) videoRef.current.currentTime = newEnd;
    }
  };

  const stopDragging = () => setDragging(null);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", stopDragging);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", stopDragging);
    };
  });

  async function handleTrim() {
    if (end === null) return;
    setProcessing(true);
    try {
      const ffmpeg = await getFFmpeg();
      console.log("🎬 Starting trim...");

      const inputName = "input.mp4";
      const outputName = "output.mp4";
      const data = new Uint8Array(await file.arrayBuffer());
      await ffmpeg.writeFile(inputName, data);

      await ffmpeg.exec([
        "-ss", `${start}`,
        "-to", `${end}`,
        "-i", inputName,
        "-c", "copy",
        outputName,
      ]);

      const result = await ffmpeg.readFile(outputName);
      const blob = new Blob([result.buffer], { type: "video/mp4" });
      const trimmedFile = new File([blob], `trimmed_${file.name}`, { type: "video/mp4" });
      onTrimmed(trimmedFile);
      onClose();
    } catch (err) {
      console.error("❌ Trim failed:", err);
      alert("Failed to trim video");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-neutral-900 p-6 rounded-lg w-[42rem] text-white shadow-xl">
        <h2 className="text-lg font-semibold mb-4">Trim Video</h2>

        {/* 🔒 Fixed-size video box */}
        <div className="relative w-full h-[260px] overflow-hidden rounded-lg border border-slate-700">
          <video
            ref={videoRef}
            src={URL.createObjectURL(file)}
            controls
            className="w-full h-full object-contain bg-black"
          />
        </div>

        {/* 🎚 Trim bar */}
        {end !== null && (
          <>
            <div className="relative mt-6 mb-3 h-4" ref={barRef}>
              <div className="absolute top-1/2 -translate-y-1/2 w-full h-[6px] bg-slate-700 rounded-full" />

              <div
                className="absolute top-1/2 -translate-y-1/2 h-[6px] bg-lime-400/70 rounded-full"
                style={{
                  left: `${(start / duration) * 100}%`,
                  width: `${((end - start) / duration) * 100}%`,
                }}
              />

              {/* Start handle */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-lime-400 border-2 border-white rounded-full shadow-lg cursor-pointer hover:scale-125 transition-transform"
                style={{
                  left: `${(start / duration) * 100}%`,
                  transform: "translate(-50%, -50%)",
                }}
                onMouseDown={() => setDragging("start")}
              ></div>

              {/* End handle */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-lime-400 border-2 border-white rounded-full shadow-lg cursor-pointer hover:scale-125 transition-transform"
                style={{
                  left: `${(end / duration) * 100}%`,
                  transform: "translate(-50%, -50%)",
                }}
                onMouseDown={() => setDragging("end")}
              ></div>
            </div>

            <div className="flex justify-between text-xs text-slate-400">
              <span>Start: {start.toFixed(1)}s</span>
              <span>End: {end.toFixed(1)}s</span>
              <span>Clip: {(end - start).toFixed(1)}s</span>
            </div>
          </>
        )}

        <div className="flex justify-end gap-3 mt-5">
          <button onClick={onClose} className="px-4 py-2 bg-slate-700 rounded-md hover:bg-slate-600 transition">
            Cancel
          </button>
          <button
            onClick={handleTrim}
            disabled={processing}
            className={`px-4 py-2 bg-lime-400 text-black rounded-md font-semibold ${
              processing ? "opacity-50 cursor-wait" : "hover:bg-lime-300"
            }`}
          >
            {processing ? "Trimming..." : "Trim & Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
