import { useCallback, useEffect, useRef, useState } from "react";
import { deriveStatus } from "../utils/galleryUtils";
import type { MetadataItem } from "../types/gallery";

type Props = {
  file: MetadataItem;
  bucket: string;
  apiUrl: string;
  onClose: () => void;
  onSaved: (updates: Partial<MetadataItem>) => void;
  requestConfirm: (options: {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    tone?: "danger" | "info";
    hideCancel?: boolean;
  }) => Promise<boolean>;
};

const MIN_CLIP_GAP = 0.1;
const END_STOP_EPS = 0.05;

type TimelineProps = {
  duration: number;
  trimStart: number;
  trimEnd: number;
  frameTime: number;
  onChange: (values: { trimStart: number; trimEnd: number; frameTime: number }) => void;
  onPreview?: (time: number, options?: { captureFrame?: boolean }) => void;
};

type HandleProps = {
  position: string;
  color: string;
  label: string;
  onPointerDown: () => void;
};

function Handle({ position, color, label, onPointerDown }: HandleProps) {
  return (
    <div className="absolute top-1/2 -translate-y-[74%] -translate-x-1/2" style={{ left: position }}>
      <div className="flex flex-col items-center gap-1">
        <div className="text-[12px] text-slate-100 font-semibold">{label}</div>
        <div
          className={`w-6 h-6 rounded-full border-2 border-black shadow-lg cursor-pointer ${color}`}
          onPointerDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onPointerDown();
          }}
        />
      </div>
    </div>
  );
}

function Timeline({ duration, trimStart, trimEnd, frameTime, onChange, onPreview }: TimelineProps) {
  const barRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState<"start" | "end" | "thumb" | null>(null);

  const clampTime = useCallback((value: number) => Math.min(Math.max(value, 0), duration), [duration]);

  const frameToClient = (time: number) => {
    const bar = barRef.current;
    if (!bar) return 0;
    const rect = bar.getBoundingClientRect();
    return rect.left + (time / duration) * rect.width;
  };

  const chooseHandle = (clientX: number) => {
    const distances = [
      { key: "start" as const, dist: Math.abs(frameToClient(trimStart) - clientX) },
      { key: "end" as const, dist: Math.abs(frameToClient(trimEnd) - clientX) },
      { key: "thumb" as const, dist: Math.abs(frameToClient(frameTime) - clientX) },
    ];
    distances.sort((a, b) => a.dist - b.dist);
    return distances[0].key;
  };

  const updateFromClientX = useCallback(
    (clientX: number, handle: "start" | "end" | "thumb") => {
      const bar = barRef.current;
      if (!bar) return;
      const rect = bar.getBoundingClientRect();
      const ratio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
      const rawTime = clampTime(ratio * duration);

      let nextStart = trimStart;
      let nextEnd = trimEnd;
      let nextFrame = frameTime;

      if (handle === "start") {
        nextStart = Math.min(rawTime, nextEnd - MIN_CLIP_GAP);
        nextStart = clampTime(nextStart);
        if (frameTime < nextStart) {
          nextFrame = nextStart;
        }
        onPreview?.(nextStart, { captureFrame: false });
      } else if (handle === "end") {
        nextEnd = Math.max(rawTime, nextStart + MIN_CLIP_GAP);
        nextEnd = clampTime(nextEnd);
        if (frameTime > nextEnd) {
          nextFrame = nextEnd;
        }
        onPreview?.(nextEnd, { captureFrame: false });
      } else {
        nextFrame = clampTime(Math.min(Math.max(rawTime, nextStart), nextEnd));
        onPreview?.(nextFrame, { captureFrame: true });
      }

      onChange({ trimStart: nextStart, trimEnd: nextEnd, frameTime: nextFrame });
    },
    [clampTime, duration, frameTime, onChange, onPreview, trimEnd, trimStart]
  );

  useEffect(() => {
    if (!dragging) return;
    const handleMove = (e: PointerEvent) => updateFromClientX(e.clientX, dragging);
    const handleUp = () => setDragging(null);
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [dragging, updateFromClientX]);

  const pct = (time: number) => `${(time / duration) * 100}%`;
  const INSET_PCT = 2;
  const insetPct = (time: number) => `${(time / duration) * (100 - INSET_PCT * 2) + INSET_PCT}%`;

  const startPct = insetPct(trimStart);
  const endPct = insetPct(trimEnd);
  const thumbPct = insetPct(frameTime);

  return (
    <div className="space-y-2">
      <div
        ref={barRef}
        className="relative h-16 w-full select-none"
        onPointerDown={(e) => {
          e.preventDefault();
          const handle = chooseHandle(e.clientX);
          setDragging(handle);
          updateFromClientX(e.clientX, handle);
        }}
      >
        <div className="absolute left-[2%] right-[2%] top-1/2 h-1 -translate-y-1/2 rounded-full bg-slate-600" />
        <div
          className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full bg-lime-400/70"
          style={{ left: startPct, right: `calc(100% - ${endPct})` }}
        />

        <Handle position={startPct} color="bg-white" label="Start" onPointerDown={() => setDragging("start")} />
        <Handle position={endPct} color="bg-white" label="End" onPointerDown={() => setDragging("end")} />
        <Handle position={thumbPct} color="bg-sky-400" label="Thumb" onPointerDown={() => setDragging("thumb")} />
      </div>
    </div>
  );
}

function dataUrlToBlob(dataUrl: string) {
  const [meta, content] = dataUrl.split(",");
  const mime = meta.match(/:(.*?);/)?.[1] ?? "image/jpeg";
  const binary = atob(content);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
  return new Blob([array], { type: mime });
}

export function HighlightEditorModal({ file, bucket, apiUrl, onClose, onSaved, requestConfirm }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [trimStart, setTrimStart] = useState<number>(file.trimStartSec ?? 0);
  const [trimEnd, setTrimEnd] = useState<number>(file.trimEndSec ?? 0);
  const [frameTime, setFrameTime] = useState<number>(file.trimStartSec ?? 0);
  const [framePreview, setFramePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReplacePrompt, setShowReplacePrompt] = useState(false);
  const [replaceVideo, setReplaceVideo] = useState(true);
  const [replaceThumbnail, setReplaceThumbnail] = useState(true);
  const [reverting, setReverting] = useState(false);
  const [revertingToId, setRevertingToId] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const suppressFrameCaptureRef = useRef(false);
  const effectiveStage = deriveStatus(file);
  const isDisplayStage = effectiveStage === "display";
  const showIdActions = effectiveStage === "done";

  const videoUrl = `https://${bucket}.s3.amazonaws.com/${file.fileId}`;
  const hasExistingHighlightAssets = Boolean(file.highlightFileId || file.highlightThumbnailId);
  const existingTrimStart = file.trimStartSec ?? 0;
  const existingTrimEnd = file.trimEndSec ?? 0;

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      suppressFrameCaptureRef.current = true;
      video.currentTime = trimStart;
      void video.play();
    } else {
      video.pause();
    }
  };

  const toggleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    } else {
      video.requestFullscreen?.();
    }
  };

  const handleTimelineChange = useCallback(
    ({
      trimStart: nextStart,
      trimEnd: nextEnd,
      frameTime: nextFrame,
    }: {
      trimStart: number;
      trimEnd: number;
      frameTime: number;
    }) => {
      setTrimStart(nextStart);
      setTrimEnd(nextEnd);
      setFrameTime(nextFrame);
    },
    []
  );

  const captureFrameDataUrl = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return null;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.9);
  };

  const captureFrame = useCallback(() => {
    const dataUrl = captureFrameDataUrl();
    if (dataUrl) {
      setFramePreview(dataUrl);
    }
  }, []);

  const handlePreviewTime = useCallback(
    (time: number, options?: { captureFrame?: boolean }) => {
      const video = videoRef.current;
      if (!video) return;
      suppressFrameCaptureRef.current = options?.captureFrame === false;
      video.currentTime = time;
      if (options?.captureFrame !== false) {
        captureFrame();
      }
    },
    [captureFrame]
  );

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const handleSeeked = () => {
      if (suppressFrameCaptureRef.current) {
        suppressFrameCaptureRef.current = false;
        return;
      }
      captureFrame();
    };
    video.addEventListener("seeked", handleSeeked);
    return () => video.removeEventListener("seeked", handleSeeked);
  }, [captureFrame]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = frameTime;
    if (Math.abs(video.currentTime - frameTime) < 0.01) {
      captureFrame();
    }
  }, [captureFrame, frameTime]);

  useEffect(() => {
    setShowReplacePrompt(false);
    setReplaceVideo(true);
    setReplaceThumbnail(true);
    setError(null);
    setFramePreview(null);
  }, [file.fileId]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
    };
  }, [file.fileId]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !trimEnd || isRecording) return;
    const handleTimeUpdate = () => {
      if (video.currentTime >= trimEnd - END_STOP_EPS) {
        video.pause();
        suppressFrameCaptureRef.current = true;
        video.currentTime = trimEnd;
      }
    };
    video.addEventListener("timeupdate", handleTimeUpdate);
    return () => video.removeEventListener("timeupdate", handleTimeUpdate);
  }, [isRecording, trimEnd]);

  const recordTrimmedSegment = async () => {
    const video = videoRef.current;
    if (!video) {
      throw new Error("Video not ready for trimming.");
    }
    if (typeof MediaRecorder === "undefined") {
      throw new Error("MediaRecorder not supported in this browser.");
    }
    // @ts-expect-error captureStream exists on HTMLMediaElement in modern browsers
    const capture = video.captureStream?.() || video.mozCaptureStream?.();
    if (!capture) {
      throw new Error("Video capture is not supported in this browser.");
    }

    const start = Math.max(0, trimStart);
    const end = duration ? Math.min(duration, trimEnd) : trimEnd;
    if (!end || end <= start) {
      throw new Error("Invalid trim range.");
    }

    const recorder = new MediaRecorder(capture, { mimeType: "video/webm" });
    const chunks: BlobPart[] = [];

    return await new Promise<Blob>((resolve, reject) => {
      let stopped = false;
      setIsRecording(true);

      const cleanup = () => {
        video.removeEventListener("timeupdate", handleTimeUpdate);
        capture.getTracks().forEach((t: MediaStreamTrack) => t.stop());
        setIsRecording(false);
      };

      const stopRecording = () => {
        if (stopped) return;
        stopped = true;
        recorder.stop();
      };

      const handleTimeUpdate = () => {
        if (video.currentTime >= end) {
          stopRecording();
        }
      };

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      recorder.onerror = (e) => {
        cleanup();
        reject(e instanceof Error ? e : new Error("Recording failed"));
      };
      recorder.onstop = () => {
        cleanup();
        video.pause();
        resolve(new Blob(chunks, { type: recorder.mimeType || "video/webm" }));
      };

      video.addEventListener("timeupdate", handleTimeUpdate);
      video.currentTime = start;
      recorder.start();
      video
        .play()
        .catch((err) => {
          stopRecording();
          cleanup();
          reject(err);
        });
    });
  };

  const performSave = async (options: { replaceVideo: boolean; replaceThumbnail: boolean }) => {
    const { replaceVideo: doReplaceVideo, replaceThumbnail: doReplaceThumbnail } = options;
    const needsVideoUpload = doReplaceVideo || !file.highlightFileId;

    if (!needsVideoUpload && !file.highlightFileId) {
      setError("A highlight video is required. Please enable replace video.");
      return;
    }

    let currentThumbnail = framePreview;
    if (doReplaceThumbnail && !currentThumbnail) {
      // Auto-capture at current frame time if missing for any reason.
      currentThumbnail = captureFrameDataUrl();
      if (currentThumbnail) {
        setFramePreview(currentThumbnail);
      }
      if (!currentThumbnail) {
        setError("Unable to capture thumbnail frame. Try adjusting the thumbnail marker on the timeline.");
        setSaving(false);
        return;
      }
    }

    setSaving(true);
    setError(null);

    try {
      let highlightFileId = file.highlightFileId;
      let nextTrimStart = existingTrimStart;
      let nextTrimEnd = existingTrimEnd;

      if (needsVideoUpload) {
        const trimmedBlob = await recordTrimmedSegment();
        const videoContentType = trimmedBlob.type || "video/webm";

        const videoPresignRes = await fetch(`${apiUrl}/api/upload/presign`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: `highlight_${file.filename}.webm`,
            contentType: videoContentType,
            type: "highlightVideo",
          }),
        });

        const videoPresignData = await videoPresignRes.json();
        if (!videoPresignData?.uploadUrl || !videoPresignData?.key) {
          throw new Error("Failed to get upload URL for trimmed video");
        }

        await fetch(videoPresignData.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": videoContentType },
          body: trimmedBlob,
        });

        highlightFileId = videoPresignData.key;
        nextTrimStart = trimStart;
        nextTrimEnd = trimEnd;
      }

      let highlightThumbnailId = file.highlightThumbnailId || file.thumbnailId;

      if (doReplaceThumbnail) {
        if (!currentThumbnail) throw new Error("Capture a frame before replacing the thumbnail");
        const blob = dataUrlToBlob(currentThumbnail);
        const presignRes = await fetch(`${apiUrl}/api/upload/presign`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: `highlight_${file.filename}.jpg`,
            contentType: "image/jpeg",
            type: "highlightThumbnail",
          }),
        });

        const presignData = await presignRes.json();
        if (!presignData.uploadUrl || !presignData.key) {
          throw new Error("Failed to get upload URL for thumbnail");
        }

        await fetch(presignData.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": "image/jpeg" },
          body: blob,
        });

        highlightThumbnailId = presignData.key;
      }

      if (!highlightFileId) {
        throw new Error("Highlight video was not created. Please try again.");
      }

      const saveRes = await fetch(`${apiUrl}/api/upload/highlight`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceFileId: file.fileId,
          highlightFileId,
          highlightThumbnailId,
          trimStartSec: nextTrimStart,
          trimEndSec: nextTrimEnd,
          filename: file.filename,
          species: file.species,
          plot: file.plot,
          experiencePoint: file.experiencePoint,
          sensorId: file.sensorId,
          deploymentId: file.deploymentId,
          id_state: file.id_state ?? "Unknown",
        }),
      });

      const saveResult = await saveRes.json();
      if (!saveRes.ok || !saveResult?.success) {
        throw new Error(saveResult?.error || "Failed to save highlight asset");
      }

      onSaved({
        highlight: true,
        displayState: "Display",
        stage: "display",
        trimStartSec: nextTrimStart,
        trimEndSec: nextTrimEnd,
        highlightThumbnailId,
        highlightFileId,
        updatedAt: new Date().toISOString(),
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save highlight settings");
    } finally {
      setSaving(false);
    }
  };

  const handleRevertToId = async () => {
    const confirmed = await requestConfirm({
      title: "Revert to ID?",
      message: "This will move the item back to ID and remove highlight status.",
      confirmLabel: "Yes, revert",
      cancelLabel: "Cancel",
      tone: "danger",
    });
    if (!confirmed) return;

    setRevertingToId(true);
    setError(null);

    try {
      const res = await fetch(`${apiUrl}/api/upload/metadata/update`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId: file.fileId,
          stage: "id",
          highlight: false,
          displayState: "Showcase",
        }),
      });
      const result = await res.json();
      if (!res.ok || !result?.success) {
        throw new Error(result?.error || "Failed to revert to ID");
      }

      onSaved({
        stage: "id",
        highlight: false,
        displayState: "Showcase",
        trimStartSec: undefined,
        trimEndSec: undefined,
        highlightFileId: undefined,
        highlightThumbnailId: undefined,
        updatedAt: new Date().toISOString(),
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to revert to ID");
    } finally {
      setRevertingToId(false);
    }
  };

  const handleDeleteHighlight = async () => {
    const confirmed = await requestConfirm({
      title: "Delete highlight?",
      message: "This will delete the highlight video/thumbnail and move the item back to Done.",
      confirmLabel: "Delete highlight",
      cancelLabel: "Cancel",
      tone: "danger",
    });
    if (!confirmed) return;

    setDeleting(true);
    setError(null);

    try {
      const res = await fetch(`${apiUrl}/api/upload/highlight/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId: file.fileId,
          highlightFileId: file.highlightFileId,
          highlightThumbnailId: file.highlightThumbnailId,
        }),
      });
      const result = await res.json();
      if (!res.ok || !result?.success) {
        throw new Error(result?.error || "Failed to delete highlight assets");
      }

      onSaved({
        highlight: false,
        displayState: "Showcase",
        stage: "done",
        trimStartSec: undefined,
        trimEndSec: undefined,
        highlightFileId: undefined,
        highlightThumbnailId: undefined,
        updatedAt: new Date().toISOString(),
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete highlight");
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveClick = () => {
    if (hasExistingHighlightAssets) {
      setReplaceVideo(true);
      setReplaceThumbnail(true);
      setShowReplacePrompt(true);
      return;
    }
    performSave({ replaceVideo: true, replaceThumbnail: Boolean(framePreview) });
  };

  const handleRevertToDone = async () => {
    if (!file.fileId) return;
    const confirmed = await requestConfirm({
      title: "Revert to Done?",
      message: "This will delete the highlight video and thumbnail and move the item back to Done.",
      confirmLabel: "Yes, revert",
      cancelLabel: "Cancel",
      tone: "danger",
    });
    if (!confirmed) return;

    setReverting(true);
    setError(null);

    try {
      const res = await fetch(`${apiUrl}/api/upload/highlight/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId: file.fileId,
          highlightFileId: file.highlightFileId,
          highlightThumbnailId: file.highlightThumbnailId,
        }),
      });

      const result = await res.json();
      if (!res.ok || !result?.success) {
        throw new Error(result?.error || "Failed to revert highlight");
      }

      onSaved({
        highlight: false,
        displayState: "Showcase",
        stage: "done",
        trimStartSec: undefined,
        trimEndSec: undefined,
        highlightFileId: undefined,
        highlightThumbnailId: undefined,
        updatedAt: new Date().toISOString(),
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to revert highlight");
    } finally {
      setReverting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center px-2.5 sm:px-3 py-4 sm:py-6">
      <div className="w-full max-w-5xl bg-neutral-950 border border-slate-800 rounded-2xl shadow-2xl p-3.5 md:p-4 lg:p-5 2xl:p-6 space-y-4 sm:space-y-5 max-h-[92vh] overflow-y-auto custom-scroll">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] sm:text-[11px] 2xl:text-xs font-semibold bg-slate-800 text-slate-200 uppercase tracking-wide">
              Highlight editor
            </span>
            <h2 className="text-sm sm:text-base lg:text-base 2xl:text-lg font-semibold text-white break-words">{file.filename}</h2>
            <p className="text-slate-400 text-[11px] sm:text-sm 2xl:text-base">
              Trim, capture a thumbnail, and upload the highlight assets.
            </p>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-[11px] sm:text-sm 2xl:px-3.5 rounded-md border border-slate-700 text-slate-200 hover:border-slate-500 transition"
          >
            Close
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/50 bg-red-500/10 text-red-100 text-xs sm:text-sm px-3 py-2">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-800 bg-neutral-900 overflow-hidden">
            <video
              ref={videoRef}
              src={videoUrl}
              crossOrigin="anonymous"
              controls={false}
              className="w-full h-[300px] lg:h-[360px] object-contain bg-black"
              onLoadedMetadata={(e) => {
                const dur = (e.target as HTMLVideoElement).duration;
                if (isFinite(dur)) {
                  setDuration(dur);
                  let nextEnd = trimEnd;
                  if (!nextEnd) {
                    nextEnd = Math.max(trimStart, Math.round(dur));
                    setTrimEnd(nextEnd);
                  }
                  const mid = trimStart + (nextEnd - trimStart) / 2;
                  setFrameTime(mid);
                  captureFrame();
                }
              }}
            />
            <div className="p-3.5 md:p-4 space-y-3 md:space-y-3.5">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[12px] sm:text-sm 2xl:text-base text-slate-300">Timeline</label>
                  <span className="text-[11px] sm:text-xs 2xl:text-sm text-slate-400">
                    Duration: {duration ? `${duration.toFixed(1)}s` : "loading..."}
                  </span>
                </div>
                {duration ? (
                  <Timeline
                    duration={duration}
                    trimStart={trimStart}
                    trimEnd={trimEnd}
                    frameTime={frameTime}
                    onChange={handleTimelineChange}
                    onPreview={handlePreviewTime}
                  />
                ) : (
                  <p className="text-xs text-slate-400">Load the video to edit the trim and thumbnail markers.</p>
                )}
              </div>

              <div className="flex flex-col lg:flex-row items-start justify-between gap-5">
                <div className="space-y-2 w-full lg:w-1/2">
                  <div className="flex justify-center">
                    <div className="inline-flex flex-col items-start gap-2">
                      <div className="text-[12px] sm:text-sm 2xl:text-base text-slate-200 font-semibold">Thumb preview</div>
                      {framePreview ? (
                        <img
                          src={framePreview}
                          alt="Thumbnail preview"
                          className="h-40 max-w-full object-cover rounded border border-slate-700"
                        />
                      ) : (
                        <div className="w-[240px] h-44 rounded border border-dashed border-slate-700 bg-neutral-900" />
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex-1 flex flex-col gap-2.5 w-full lg:w-1/2 items-center text-center">
                <div className="flex items-center justify-center gap-2.5 flex-wrap">
                  <button
                    onClick={togglePlay}
                    className="px-3 py-1.5 sm:px-3.5 sm:py-2 lg:px-4 lg:py-2 text-[11px] sm:text-sm font-semibold rounded-md bg-slate-800 text-slate-100 border border-slate-700 hover:border-slate-500 flex items-center gap-2"
                  >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        {isPlaying ? (
                          <path
                            fillRule="evenodd"
                            d="M6 4a1 1 0 00-1 1v10a1 1 0 002 0V5a1 1 0 00-1-1zm7 0a1 1 0 00-1 1v10a1 1 0 002 0V5a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        ) : (
                          <path d="M6.5 4.75a.75.75 0 011.125-.65l7 4.25a.75.75 0 010 1.3l-7 4.25A.75.75 0 016 13.25v-7.5a.75.75 0 01.5-.7z" />
                        )}
                      </svg>
                      <span>{isPlaying ? "Pause" : "Play"}</span>
                  </button>
                  <button
                    onClick={toggleFullscreen}
                    className="px-3 py-1.5 sm:px-3.5 sm:py-2 lg:px-4 lg:py-2 text-[11px] sm:text-sm font-semibold rounded-md bg-slate-800 text-slate-100 border border-slate-700 hover:border-slate-500 flex items-center gap-2"
                  >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M3 3h5v2H5v3H3V3zm9 0h5v5h-2V5h-3V3zm3 9h2v5h-5v-2h3v-3zm-7 3v2H3v-5h2v3h3z" />
                      </svg>
                      <span>Fullscreen</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] sm:text-xs 2xl:text-sm text-slate-200">
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-slate-800 text-slate-100 font-semibold">
                      Start {trimStart.toFixed(1)}s
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-slate-800 text-slate-100 font-semibold">
                      End {trimEnd.toFixed(1)}s
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-slate-800 text-slate-100 font-semibold">
                      Thumb {frameTime.toFixed(1)}s
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-slate-800 text-slate-100 font-semibold">
                      Clip {(trimEnd - trimStart).toFixed(1)}s
                    </span>
                  </div>

              <div className="flex flex-wrap items-center gap-2.5 justify-center">
                {file.highlight && (
                  <button
                    onClick={handleRevertToDone}
                    disabled={reverting}
                    className="px-3 py-1.5 sm:px-3.5 sm:py-2 lg:px-4 lg:py-2 rounded-md bg-red-500 text-white font-semibold hover:bg-red-400 transition disabled:opacity-60 text-[11px] sm:text-sm"
                  >
                        {reverting ? "Reverting..." : "Revert to Done"}
                      </button>
                    )}
                {showIdActions && (
                  <button
                    onClick={handleRevertToId}
                    disabled={revertingToId}
                    className="px-3 py-1.5 sm:px-3.5 sm:py-2 lg:px-4 lg:py-2 rounded-md bg-amber-500 text-white font-semibold hover:bg-amber-400 transition disabled:opacity-60 text-[11px] sm:text-sm"
                  >
                    {revertingToId ? "Reverting..." : "Revert to ID"}
                  </button>
                )}
                {showIdActions && (
                  <button
                    onClick={handleDeleteHighlight}
                    disabled={deleting}
                    className="px-3 py-1.5 sm:px-3.5 sm:py-2 lg:px-4 lg:py-2 rounded-md bg-red-600 text-white font-semibold hover:bg-red-500 transition disabled:opacity-60 text-[11px] sm:text-sm"
                  >
                    {deleting ? "Deleting..." : "Delete"}
                  </button>
                )}
                <button
                  onClick={handleSaveClick}
                  disabled={saving}
                  className="px-3 py-1.5 sm:px-3.5 sm:py-2 lg:px-4 lg:py-2 rounded-md bg-lime-400 text-black font-semibold hover:bg-lime-300 transition disabled:opacity-60 text-[11px] sm:text-sm"
                  >
                        {saving ? "Saving..." : "Save highlight"}
                      </button>
                    </div>

                  {hasExistingHighlightAssets && (
                    <div className="flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-amber-500/10 border border-amber-500/40 text-amber-100 text-[11px] sm:text-xs 2xl:text-sm">
                      <span className="font-semibold">Existing highlight detected</span>
                      <button
                        onClick={() => setShowReplacePrompt(true)}
                        className="text-amber-900 bg-amber-200 hover:bg-amber-300 px-2 py-1 rounded-md font-semibold text-[11px]"
                      >
                        Change replace options
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {showReplacePrompt && (
          <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center px-4">
            <div className="bg-neutral-900 border border-slate-800 rounded-xl w-full max-w-lg shadow-2xl p-4 sm:p-5 2xl:p-6 space-y-4 max-h-[90vh] overflow-y-auto custom-scroll">
              <div className="flex items-center justify-between">
                <h3 className="text-sm sm:text-base 2xl:text-lg font-semibold text-white">Replace existing highlight?</h3>
                <button
                  onClick={() => setShowReplacePrompt(false)}
                  className="px-3 py-1 text-[11px] sm:text-sm 2xl:px-3.5 rounded-md border border-slate-700 text-slate-200 hover:border-slate-500 transition"
                >
                  Close
                </button>
              </div>

              <p className="text-slate-400 text-xs sm:text-sm 2xl:text-sm">
                This file already has a trimmed video and/or thumbnail. Choose what to replace or keep.
              </p>

              <label className="flex items-center gap-3 text-slate-200 text-xs sm:text-sm 2xl:text-sm">
                <input
                  type="checkbox"
                  checked={replaceVideo}
                  onChange={(e) => setReplaceVideo(e.target.checked)}
                  className="w-4 h-4 accent-lime-400"
                />
                Replace trimmed video
              </label>

              <label className="flex items-center gap-3 text-slate-200 text-xs sm:text-sm 2xl:text-sm">
                <input
                  type="checkbox"
                  checked={replaceThumbnail}
                  onChange={(e) => setReplaceThumbnail(e.target.checked)}
                  className="w-4 h-4 accent-lime-400"
                />
                Replace thumbnail
              </label>

              {replaceThumbnail && !framePreview && (
                <p className="text-amber-300 text-[11px] sm:text-xs 2xl:text-sm">
                  Capture a frame first to replace the thumbnail.
                </p>
              )}

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowReplacePrompt(false)}
                  className="px-3 py-1.5 sm:px-3.5 sm:py-2 lg:px-4 lg:py-2 rounded-md border border-slate-700 text-slate-200 hover:border-slate-500 transition text-[11px] sm:text-sm"
                >
                  Go back
                </button>
                <button
                  onClick={() => {
                    setShowReplacePrompt(false);
                    performSave({ replaceVideo, replaceThumbnail });
                  }}
                  disabled={
                    saving ||
                    (!replaceVideo && !replaceThumbnail) ||
                    (replaceThumbnail && !framePreview)
                  }
                  className="px-3 py-1.5 sm:px-3.5 sm:py-2 lg:px-4 lg:py-2 rounded-md bg-lime-400 text-black font-semibold hover:bg-lime-300 transition disabled:opacity-60 text-[11px] sm:text-sm"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
