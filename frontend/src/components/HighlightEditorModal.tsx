import { useEffect, useRef, useState } from "react";
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

  const videoUrl = `https://${bucket}.s3.amazonaws.com/${file.fileId}`;
  const hasExistingHighlightAssets = Boolean(file.highlightFileId || file.highlightThumbnailId);
  const existingTrimStart = file.trimStartSec ?? 0;
  const existingTrimEnd = file.trimEndSec ?? 0;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const handleSeeked = () => captureFrame();
    video.addEventListener("seeked", handleSeeked);
    return () => video.removeEventListener("seeked", handleSeeked);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = frameTime;
    if (Math.abs(video.currentTime - frameTime) < 0.01) {
      captureFrame();
    }
  }, [frameTime]);

  useEffect(() => {
    setShowReplacePrompt(false);
    setReplaceVideo(true);
    setReplaceThumbnail(true);
    setError(null);
    setFramePreview(null);
  }, [file.fileId]);

  const captureFrame = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setFramePreview(dataUrl);
  };

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

      const cleanup = () => {
        video.removeEventListener("timeupdate", handleTimeUpdate);
        capture.getTracks().forEach((t: MediaStreamTrack) => t.stop());
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

    if (doReplaceThumbnail && !framePreview) {
      // Auto-capture at current frame time if missing for any reason.
      captureFrame();
      if (!framePreview) {
        setError("Unable to capture thumbnail frame. Try adjusting the thumbnail moment.");
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
        if (!framePreview) throw new Error("Capture a frame before replacing the thumbnail");
        const blob = dataUrlToBlob(framePreview);
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
        displayState: "Action",
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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="w-full max-w-5xl bg-neutral-950 border border-slate-800 rounded-2xl shadow-2xl p-6 lg:p-7 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-200 uppercase tracking-wide">
              Highlight editor
            </span>
            <h2 className="text-xl font-semibold text-white">{file.filename}</h2>
            <p className="text-slate-400 text-sm">
              Trim, capture a thumbnail, and upload the highlight assets.
            </p>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm rounded-md border border-slate-700 text-slate-200 hover:border-slate-500 transition"
          >
            Close
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/50 bg-red-500/10 text-red-100 text-sm px-3 py-2">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-800 bg-neutral-900 overflow-hidden">
            <video
              ref={videoRef}
              src={videoUrl}
              crossOrigin="anonymous"
              controls
              className="w-full h-[360px] lg:h-[420px] object-contain bg-black"
              onLoadedMetadata={(e) => {
                const dur = (e.target as HTMLVideoElement).duration;
                if (isFinite(dur)) {
                  setDuration(dur);
                  if (!trimEnd) setTrimEnd(Math.max(trimStart, Math.round(dur)));
                  captureFrame();
                }
              }}
            />
            <div className="p-4 space-y-4">
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 text-slate-100">
                  Start: {trimStart.toFixed(1)}s
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 text-slate-100">
                  End: {trimEnd.toFixed(1)}s
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 text-slate-100">
                  Clip: {(trimEnd - trimStart).toFixed(1)}s
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="space-y-2 lg:col-span-2">
                  <label className="text-sm text-slate-300">Thumbnail moment</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={duration ?? Math.max(trimEnd, trimStart + 1)}
                      step={0.1}
                      value={frameTime}
                      onChange={(e) => setFrameTime(Number(e.target.value))}
                      className="flex-1"
                    />
                    <input
                      type="number"
                      className="w-24 bg-neutral-800 border border-slate-700 rounded px-2 py-1 text-sm text-white"
                      value={frameTime}
                      onChange={(e) => setFrameTime(Number(e.target.value))}
                      min={0}
                      max={duration ?? undefined}
                      step={0.1}
                    />
                    <div className="flex items-center gap-2 bg-neutral-800 border border-slate-700 rounded-md px-2 py-1">
                      {framePreview ? (
                        <img
                          src={framePreview}
                          alt="Thumbnail preview"
                          className="w-14 h-10 object-cover rounded border border-slate-700"
                        />
                      ) : (
                        <div className="w-14 h-10 rounded border border-dashed border-slate-700 bg-neutral-900" />
                      )}
                      <span className="text-xs text-slate-300">Auto-captured</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-slate-300">Trim bounds</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      className="w-full bg-neutral-800 border border-slate-700 rounded px-2 py-2 text-sm text-white"
                      value={trimStart}
                      min={0}
                      max={trimEnd || undefined}
                      step={0.1}
                      onChange={(e) => setTrimStart(Number(e.target.value))}
                    />
                    <input
                      type="number"
                      className="w-full bg-neutral-800 border border-slate-700 rounded px-2 py-2 text-sm text-white"
                      value={trimEnd}
                      min={trimStart}
                      step={0.1}
                      onChange={(e) => setTrimEnd(Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                {file.highlight && (
                  <button
                    onClick={handleRevertToDone}
                    disabled={reverting}
                    className="px-4 py-2 rounded-md bg-red-500 text-white font-semibold hover:bg-red-400 transition disabled:opacity-60"
                  >
                    {reverting ? "Reverting..." : "Revert to Done"}
                  </button>
                )}
                <button
                  onClick={handleSaveClick}
                  disabled={saving}
                  className="px-4 py-2 rounded-md bg-lime-400 text-black font-semibold hover:bg-lime-300 transition disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save highlight"}
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-md border border-slate-700 text-slate-200 hover:border-slate-500 transition"
                >
                  Cancel
                </button>
              </div>

              {hasExistingHighlightAssets && (
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-amber-100 font-semibold text-sm">Existing highlight detected</p>
                    <button
                      onClick={() => setShowReplacePrompt(true)}
                      className="text-xs px-3 py-1 rounded-md bg-amber-400 text-black font-semibold hover:bg-amber-300 transition"
                    >
                      Change replace options
                    </button>
                  </div>
                  <p className="text-amber-100/80 text-xs">
                    We’ll replace the trimmed video/thumbnail unless you opt out in the dialog.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {showReplacePrompt && (
          <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center px-4">
            <div className="bg-neutral-900 border border-slate-800 rounded-xl w-full max-w-lg shadow-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Replace existing highlight?</h3>
                <button
                  onClick={() => setShowReplacePrompt(false)}
                  className="px-3 py-1 text-sm rounded-md border border-slate-700 text-slate-200 hover:border-slate-500 transition"
                >
                  Cancel
                </button>
              </div>

              <p className="text-slate-400 text-sm">
                This file already has a trimmed video and/or thumbnail. Choose what to replace or keep.
              </p>

              <label className="flex items-center gap-3 text-slate-200 text-sm">
                <input
                  type="checkbox"
                  checked={replaceVideo}
                  onChange={(e) => setReplaceVideo(e.target.checked)}
                  className="w-4 h-4 accent-lime-400"
                />
                Replace trimmed video (keeps current if unchecked)
              </label>

              <label className="flex items-center gap-3 text-slate-200 text-sm">
                <input
                  type="checkbox"
                  checked={replaceThumbnail}
                  onChange={(e) => setReplaceThumbnail(e.target.checked)}
                  className="w-4 h-4 accent-lime-400"
                />
                Replace thumbnail
              </label>

              {replaceThumbnail && !framePreview && (
                <p className="text-amber-300 text-xs">
                  Capture a frame first to replace the thumbnail.
                </p>
              )}

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowReplacePrompt(false)}
                  className="px-4 py-2 rounded-md border border-slate-700 text-slate-200 hover:border-slate-500 transition"
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
                  className="px-4 py-2 rounded-md bg-lime-400 text-black font-semibold hover:bg-lime-300 transition disabled:opacity-60"
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
