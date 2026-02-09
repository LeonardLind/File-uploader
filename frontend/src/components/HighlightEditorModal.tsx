import { useCallback, useEffect, useRef, useState } from "react";
import { deriveStatus } from "../utils/galleryUtils";
import type { MetadataItem } from "../types/gallery";
import { HexLoader } from "./HexLoader";
import { useToast } from "./ToastProvider";
import { useSignedUrl } from "../hooks/useSignedUrl";
import { useDeleteFile } from "../hooks/useDeleteFile";
import { checkHighlightExists, deleteHighlight, presignUpload, saveHighlight, updateMetadata } from "../api/uploadApi";
import { useToggle } from "../hooks/useToggle";

type Props = {
  file: MetadataItem;
  apiUrl: string;
  onClose: () => void;
  onSaved: (updates: Partial<MetadataItem>) => void;
  onDeleted: (fileId: string) => void;
  requestConfirm: (options: {
    title: string;
    message: string;
    confirmLabel?: string;
    tone?: "danger" | "info";
  }) => Promise<boolean>;
};

const MIN_CLIP_GAP = 1.0; // Seconds
const END_STOP_EPS = 0.05; // Tiny buffer to avoid flash/black end frame 

type TimelineProps = {
  duration: number;
  trimStart: number;
  trimEnd: number;
  frameTime: number;
  onChange: (values: { trimStart: number; trimEnd: number; frameTime: number }) => void;
  onPreview?: (time: number, options?: { captureFrame?: boolean }) => void;
};

// A draggable handle on the timeline
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
  // Keep a handle to the timeline bar so we can measure clicks/drags.
  const barRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState<"start" | "end" | "thumb" | null>(null);
  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 1;
  const minGap = Math.min(MIN_CLIP_GAP, Math.max(safeDuration - 0.01, 0));
  // Clamps the time to not go below 0 or above duration.
  const clampTime = useCallback((value: number) => Math.min(Math.max(value, 0), duration), [duration]);
  // Map a video time to an x-position on the timeline bar.
  const frameToClient = (time: number) => {
    const bar = barRef.current;
    if (!bar) return 0;
    const rect = bar.getBoundingClientRect();
    return rect.left + (time / safeDuration) * rect.width;
  };

  // when user clicks timeline, pick the nearest handle to move
  const chooseHandle = (clientX: number) => {
    const distances = [
      { key: "start" as const, dist: Math.abs(frameToClient(trimStart) - clientX) },
      { key: "end" as const, dist: Math.abs(frameToClient(trimEnd) - clientX) },
      { key: "thumb" as const, dist: Math.abs(frameToClient(frameTime) - clientX) },
    ];
    distances.sort((a, b) => a.dist - b.dist);
    return distances[0].key;
  };

  // main math: mouse X -> new trimStart / trimEnd / frameTime
  const updateFromClientX = useCallback(
    (clientX: number, handle: "start" | "end" | "thumb") => {
      if (!Number.isFinite(duration) || duration <= 0) return;
      const bar = barRef.current;
      if (!bar) return;
      const rect = bar.getBoundingClientRect();
      // ratio 0..1 based on click position inside bar
      const ratio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
      // turn ratio into seconds
      const rawTime = clampTime(ratio * duration);

      let nextStart = trimStart;
      let nextEnd = trimEnd;
      let nextFrame = frameTime;

      if (handle === "start") {
        nextStart = Math.min(rawTime, nextEnd - minGap);
        nextStart = clampTime(nextStart);
        if (frameTime < nextStart) {
          nextFrame = nextStart;
        }
        onPreview?.(nextStart, { captureFrame: false });
      } else if (handle === "end") {
        nextEnd = Math.max(rawTime, nextStart + minGap);
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
    [clampTime, duration, frameTime, minGap, onChange, onPreview, trimEnd, trimStart]
  );

  // while dragging: listen to pointer move/up on window
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

  // make handles not touch the exact edges, looks nicer
  const INSET_PCT = 2;
  const insetPct = (time: number) => `${(time / safeDuration) * (100 - INSET_PCT * 2) + INSET_PCT}%`;

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

// Convert a data URL (from canvas) into a Blob for upload.
function dataUrlToBlob(dataUrl: string) {
  const [meta, content] = dataUrl.split(","); // Split the label part and the image data.
  const mime = meta.match(/:(.*?);/)?.[1] ?? "image/jpeg"; // Figure out the image type (jpg/png).
  const binary = atob(content); // Turn the base64 text back into raw bytes.
  const array = new Uint8Array(binary.length); // Make a byte list we can upload.
  for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i); // Copy bytes into the list.
  return new Blob([array], { type: mime }); // Build the final file for upload.
}

export function HighlightEditorModal({ file, apiUrl, onClose, onSaved, onDeleted, requestConfirm }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const pendingFrameCaptureRef = useRef(false);
  const saveTokenRef = useRef(0);
  // main timeline values
  const [duration, setDuration] = useState<number | null>(null);
  const [trimStart, setTrimStart] = useState<number>(file.trimStartSec ?? 0);
  const [trimEnd, setTrimEnd] = useState<number>(file.trimEndSec ?? 0);
  const [frameTime, setFrameTime] = useState<number>(file.trimStartSec ?? 0);
   // thumbnail preview image (data URL)
  const [framePreview, setFramePreview] = useState<string | null>(null);
  // saving states
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // when there is already a highlight, show a prompt (replace?)
  const replacePrompt = useToggle(false);
  const [replaceVideo, setReplaceVideo] = useState(true);
  const [replaceThumbnail, setReplaceThumbnail] = useState(true);
  // revert/delete states
  const [reverting, setReverting] = useState(false);
  const [revertingToId, setRevertingToId] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [videoLoading, setVideoLoading] = useState(true);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [highlightVideoExists, setHighlightVideoExists] = useState<boolean | null>(null);
  const suppressFrameCaptureRef = useRef(false);
  const effectiveStage = deriveStatus(file);
  const showIdActions = effectiveStage === "done";
  const { notify } = useToast();
  const { deleteFile } = useDeleteFile(apiUrl);

  const existingHighlightVideo = highlightVideoExists ?? Boolean(file.highlightFileId);
  const existingHighlightThumb = Boolean(file.highlightThumbnailId);
  const hasExistingHighlightAssets = existingHighlightVideo || existingHighlightThumb;
  const existingTrimStart = file.trimStartSec ?? 0;
  const existingTrimEnd = file.trimEndSec ?? 0;
  const replacePromptMessage = existingHighlightVideo && existingHighlightThumb
    ? "This file already has a trimmed video and thumbnail. Choose what to replace or keep."
    : existingHighlightVideo
        ? "This file already has a trimmed video. Choose what to replace or keep."
        : existingHighlightThumb
            ? "This file already has a thumbnail. Choose what to replace or keep."
            : "This file already has a trimmed video and/or thumbnail. Choose what to replace or keep.";
  
  // Play always start from trimStart
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
  
  // Grab a frame from the video and return it as a JPG data URL
  const captureFrameDataUrl = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return null;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 1); // Turn the frame into a base64 image string (easy to pass around).
    // Quality set to 1 to keep true quality, browser default set 0.92 to keep size down. (Andrew - "Storage is not a problem")
  };
  // Save that frame into state (for thumbnail preview)
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
      const shouldCapture = options?.captureFrame !== false;
      suppressFrameCaptureRef.current = !shouldCapture;
      if (Math.abs(video.currentTime - time) < 0.01) {
        if (shouldCapture) captureFrame();
        return;
      }
      if (shouldCapture) pendingFrameCaptureRef.current = true;
      video.currentTime = time;
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
      if (pendingFrameCaptureRef.current) {
        pendingFrameCaptureRef.current = false;
        captureFrame();
      }
    };
    video.addEventListener("seeked", handleSeeked);
    return () => video.removeEventListener("seeked", handleSeeked);
  }, [captureFrame]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const current = video.currentTime;
    if (Math.abs(current - frameTime) < 0.01) {
      captureFrame();
    } else {
      pendingFrameCaptureRef.current = true;
      video.currentTime = frameTime;
    }
  }, [captureFrame, frameTime]);
  // Reset local UI state when switching files.
  useEffect(() => {
    saveTokenRef.current += 1;
    replacePrompt.close();
    setReplaceVideo(true);
    setReplaceThumbnail(true);
    setError(null);
    setFramePreview(null);
    setVideoLoading(true);
    setVideoDuration(null);
    setHighlightVideoExists(null);
    setSaving(false);
  }, [file.fileId]);

  const { url: videoUrl, error: videoUrlError } = useSignedUrl({
    apiUrl,
    key: file.fileId,
    type: "default",
    enabled: Boolean(file.fileId),
  });

  useEffect(() => {
    if (videoUrlError) {
      console.warn("Failed to load signed video URL", videoUrlError);
      setVideoLoading(false);
    }
  }, [videoUrlError]);

  useEffect(() => {
    if (!file.highlightFileId) {
      setHighlightVideoExists(null);
      return;
    }

    // Check if a highlight video already exists for this item.
    const controller = new AbortController();
    (async () => {
      try {
        const data = await checkHighlightExists(
          apiUrl,
          { fileId: file.fileId, highlightFileId: file.highlightFileId },
          controller.signal
        );
        setHighlightVideoExists(Boolean(data.exists));
      } catch (err: unknown) {
        if (controller.signal.aborted) return;
        console.warn("Failed to verify highlight video", err);
      }
    })();

    return () => controller.abort();
  }, [apiUrl, file.fileId, file.highlightFileId]);

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

  const getPreferredRecorderMimeType = () => {
    if (typeof MediaRecorder === "undefined") return undefined;
    const candidates = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
    return candidates.find((type) => MediaRecorder.isTypeSupported(type));
  };

  const recordTrimmedSegment = async () => {
    // Record the selected clip using MediaRecorder.
    const video = videoRef.current;
    if (!video) {
      throw new Error("Video not ready for trimming.");
    }
    if (typeof MediaRecorder === "undefined") {
      throw new Error("MediaRecorder not supported in this browser.");
    }
    const captureSource = video as HTMLVideoElement & {
      captureStream?: () => MediaStream;
      mozCaptureStream?: () => MediaStream;
    };
    const capture = captureSource.captureStream?.() || captureSource.mozCaptureStream?.();
    if (!capture) {
      throw new Error("Video capture is not supported in this browser.");
    }

    const start = Math.max(0, trimStart);
    const end = duration ? Math.min(duration, trimEnd) : trimEnd;
    if (!end || end <= start) {
      throw new Error("Invalid trim range.");
    }

    const preferredMimeType = getPreferredRecorderMimeType();
    const recorder = preferredMimeType
      ? new MediaRecorder(capture, { mimeType: preferredMimeType })
      : new MediaRecorder(capture);
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

      // start recording
      video.addEventListener("timeupdate", handleTimeUpdate);
      video.currentTime = start;
      recorder.start();
      // play the video so captureStream produces frames
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
    const saveToken = ++saveTokenRef.current;
    const activeFileId = file.fileId;
    const isStale = () => saveToken !== saveTokenRef.current || file.fileId !== activeFileId;
    // Upload trimmed video and/or thumbnail, then update metadata.
    const { replaceVideo: doReplaceVideo, replaceThumbnail: doReplaceThumbnail } = options;
    const needsVideoUpload = doReplaceVideo || !file.highlightFileId;

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
      if (isStale()) return;
      // these are the "final" highlight ids we will save
      let highlightFileId = file.highlightFileId;
      let nextTrimStart = existingTrimStart;
      let nextTrimEnd = existingTrimEnd;
       // Upload trimmed video (if needed)
      if (needsVideoUpload) {
        // 1) record the trimmed part as blob
        const trimmedBlob = await recordTrimmedSegment();
        if (isStale()) return;
        const videoContentType = trimmedBlob.type || "video/webm";
        // 2) ask backend for upload URL + key
        const videoPresignData = await presignUpload(apiUrl, {
          filename: `highlight_${file.filename}.webm`,
          contentType: videoContentType,
          type: "highlightVideo",
        });
        if (isStale()) return;
        if (!videoPresignData?.uploadUrl || !videoPresignData?.key) {
          throw new Error("Failed to get upload URL for trimmed video");
        }
        // 3) upload directly to S3 (PUT)
        await fetch(videoPresignData.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": videoContentType },
          body: trimmedBlob,
        });
        if (isStale()) return;
        // 4) store new key and new trim times
        highlightFileId = videoPresignData.key;
        nextTrimStart = trimStart;
        nextTrimEnd = trimEnd;
      }

      let highlightThumbnailId = file.highlightThumbnailId || file.thumbnailId;
      // Upload thumbnail (if needed)
      if (doReplaceThumbnail) {
        if (!currentThumbnail) throw new Error("Capture a frame before replacing the thumbnail");
        // convert dataURL -> blob so we can upload it
        const blob = dataUrlToBlob(currentThumbnail);
        // ask backend for upload url + key
        const presignData = await presignUpload(apiUrl, {
          filename: `highlight_${file.filename}.jpg`,
          contentType: "image/jpeg",
          type: "highlightThumbnail",
        });
        if (isStale()) return;
        if (!presignData.uploadUrl || !presignData.key) {
          throw new Error("Failed to get upload URL for thumbnail");
        }
        // upload to S3
        await fetch(presignData.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": "image/jpeg" },
          body: blob,
        });
        if (isStale()) return;
        // store new key
        highlightThumbnailId = presignData.key;
      }

      if (!highlightFileId) {
        throw new Error("Highlight video was not created. Please try again.");
      }
      //Tell backend: "this file now has highlight assets"
      await saveHighlight(apiUrl, {
        sourceFileId: file.fileId,
        highlightFileId,
        highlightThumbnailId,
        trimStartSec: nextTrimStart,
        trimEndSec: nextTrimEnd,
        filename: file.filename,
        // include the rest of metadata so server can keep row consistent
        species: file.species,
        species_source: file.species_source,
        domesticated_common_name: file.domesticated_common_name,
        plot: file.plot,
        experiencePoint: file.experiencePoint,
        sensorId: file.sensorId,
        deploymentId: file.deploymentId,
        id_state: file.id_state ?? "Unknown",
      });
      if (isStale()) return;

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
      notify({
        title: "Highlight updated",
        message: "Trimmed video and thumbnail saved.",
        tone: "success",
      });
      onClose();
    } catch (err: unknown) {
      if (!isStale()) {
        setError(err instanceof Error ? err.message : "Failed to save highlight settings");
        notify({
          title: "Highlight save failed",
          message: err instanceof Error ? err.message : "Failed to save highlight settings.",
          tone: "error",
        });
      }
    } finally {
      if (!isStale()) {
        setSaving(false);
      }
    }
  };

  const handleRevertToId = async () => {
    const confirmed = await requestConfirm({
      title: "Revert to ID?",
      message: "This will move the item back to ID stage.",
      confirmLabel: "Yes, revert",
      tone: "danger",
    });
    if (!confirmed) return;

    setRevertingToId(true);
    setError(null);

    try {
      await updateMetadata(apiUrl, {
        fileId: file.fileId,
        stage: "id",
        highlight: false,
        displayState: "Showcase",
      });

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
      notify({ title: "Reverted to ID", message: "Item moved to ID.", tone: "info" });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to revert to ID");
      notify({
        title: "Revert failed",
        message: err instanceof Error ? err.message : "Failed to revert to ID.",
        tone: "error",
      });
    } finally {
      setRevertingToId(false);
    }
  };

  const removeHighlightAndMoveToDone = async (options: {
    title: string;
    message: string;
    confirmLabel: string;
    successTitle: string;
    successMessage: string;
    setBusy: (value: boolean) => void;
  }) => {
    const confirmed = await requestConfirm({
      title: options.title,
      message: options.message,
      confirmLabel: options.confirmLabel,
      tone: "danger",
    });
    if (!confirmed) return;

    options.setBusy(true);
    setError(null);

    try {
      await deleteHighlight(apiUrl, {
        fileId: file.fileId,
        highlightFileId: file.highlightFileId,
        highlightThumbnailId: file.highlightThumbnailId,
      });

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
      notify({ title: options.successTitle, message: options.successMessage, tone: "info" });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete highlight");
      notify({
        title: "Delete failed",
        message: err instanceof Error ? err.message : "Failed to delete highlight assets.",
        tone: "error",
      });
    } finally {
      options.setBusy(false);
    }
  };
  // If highlight exists already: show options first.
  const handleSaveClick = () => {
    if (hasExistingHighlightAssets) {
      setReplaceVideo(true);
      setReplaceThumbnail(true);
      replacePrompt.open();
      return;
    }
    performSave({ replaceVideo: true, replaceThumbnail: Boolean(framePreview) });
  };

  const handleDeleteOriginal = async () => {
    const confirmed = await requestConfirm({
      title: "Delete file?",
      message: "This will permanently remove the video from S3 and delete its metadata.",
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!confirmed) return;

    setDeleting(true);
    setError(null);

    try {
      await deleteFile(file.fileId);
      onDeleted(file.fileId);
      notify({
        title: "Item removed",
        message: "Item was successfully deleted.",
        tone: "info",
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete file");
      notify({
        title: "Delete failed",
        message: err instanceof Error ? err.message : "Failed to delete file.",
        tone: "error",
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleRevertToDone = async () => {
    if (!file.fileId) return;
    await removeHighlightAndMoveToDone({
      title: "Revert to Done?",
      message: "This will delete the highlight video and thumbnail and move the item back to Done.",
      confirmLabel: "Yes, revert",
      successTitle: "Reverted to Done",
      successMessage: "Highlight removed and item moved to Done.",
      setBusy: setReverting,
    });
  };

  const handleDeleteHighlight = async () => {
    await handleDeleteOriginal();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center px-2.5 sm:px-3 py-4 sm:py-6">
      <div className="relative w-full max-w-5xl bg-neutral-950 border border-slate-800 rounded-2xl shadow-2xl p-3.5 md:p-4 lg:p-5 2xl:p-6 space-y-4 sm:space-y-5 max-h-[92vh] overflow-y-auto custom-scroll">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-sm sm:text-base lg:text-base 2xl:text-lg font-semibold text-white wrap-break-word mb-0.5">
              Highlight editor
            </h2>
            <p className="text-slate-300 text-[10px] sm:text-xs 2xl:text-sm wrap-break-word">
              {file.filename}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {showIdActions && (
              <button
                onClick={handleRevertToId}
                disabled={revertingToId}
                className="px-3 py-1.5 rounded-md border border-amber-500 text-amber-100 font-semibold hover:bg-amber-500/10 transition text-[11px] sm:text-xs disabled:opacity-60"
              >
                {revertingToId ? "Reverting..." : "Revert to ID"}
              </button>
            )}
            {showIdActions && (
              <button
                onClick={handleDeleteHighlight}
                disabled={deleting}
                className="px-3 py-1.5 rounded-md border border-red-600 text-red-200 font-semibold hover:bg-red-600/10 transition text-[11px] sm:text-xs disabled:opacity-60"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            )}
            {file.highlight && (
              <button
                onClick={handleRevertToDone}
                disabled={reverting}
                className="px-3 py-1.5 rounded-md border border-red-600 text-red-200 font-semibold hover:bg-red-600/10 transition text-[11px] sm:text-xs disabled:opacity-60"
              >
                {reverting ? "Reverting..." : "Revert to Done"}
              </button>
            )}
            <button
              onClick={handleSaveClick}
              disabled={saving}
              className="px-3 py-1.5 rounded-md border border-lime-500 text-lime-100 font-semibold hover:bg-lime-400/10 transition text-[11px] sm:text-xs disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save highlight"}
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-[11px] sm:text-xs 2xl:px-3.5 rounded-md border border-slate-700 text-slate-200 hover:border-slate-500 transition"
            >
              Close
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/50 bg-red-500/10 text-red-100 text-xs sm:text-sm px-3 py-2">
            {error}
          </div>
        )}

        <div className="grid lg:grid-cols-[1.75fr_0.65fr] gap-2.5">
          <div className="space-y-3">
            <div className="rounded-xl border border-slate-800 bg-neutral-900 overflow-hidden relative">
              {videoLoading && (
                <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-10 pointer-events-none">
                  <HexLoader size={70} label="Loading video" />
                </div>
              )}
              <video
                ref={videoRef}
                src={videoUrl || undefined}
                crossOrigin="anonymous"
                controls={false}
                className="w-full h-[300px] lg:h-[360px] object-contain bg-black"
                onLoadedMetadata={(e) => {
                  const dur = (e.target as HTMLVideoElement).duration;
                  if (isFinite(dur)) {
                    setVideoDuration(dur);
                    if (dur <= 5) {
                      setVideoLoading(false);
                    }
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
                onTimeUpdate={(e) => {
                  const vid = e.target as HTMLVideoElement;
                  const dur = videoDuration ?? vid.duration;
                  const threshold = isFinite(dur) && dur > 0 ? Math.min(5, dur) : 5;
                  if (vid.currentTime >= threshold - 0.05) {
                    setVideoLoading(false);
                  }
                }}
                onLoadedData={(e) => {
                  const vid = e.target as HTMLVideoElement;
                  const dur = videoDuration ?? vid.duration;
                  if (isFinite(dur) && dur <= 5) {
                    setVideoLoading(false);
                  }
                }}
                onError={() => setVideoLoading(false)}
              />
            </div>
          </div>

              <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-slate-800 bg-neutral-900 p-3 md:p-2">
              {hasExistingHighlightAssets && (
                <div className="inline-flex items-center justify-center gap-2 px-1 py-1.5 rounded-md bg-amber-500/10 border border-amber-500/40 text-amber-100 text-[11px] sm:text-xs self-center max-w-62">
                  <span className="font-semibold">Existing highlight detected</span>
                  <button
                    onClick={replacePrompt.open}
                    className="text-amber-900 bg-amber-200 hover:bg-amber-300 px-2 py-1 rounded-md font-semibold text-[11px]"
                  >
                    Options
                  </button>
                </div>
              )}

              <div className="flex flex-col items-center gap-2 text-center">
                <div className="inline-flex flex-col items-center gap-1.5">
                  <div className="text-[11px] sm:text-xs 2xl:text-sm text-slate-200 font-semibold">Thumb preview</div>
                  {framePreview ? (
                    <img
                      src={framePreview}
                      alt="Thumbnail preview"
                      className="h-24 w-full object-cover rounded border border-slate-700"
                    />
                  ) : (
                    <div className="w-46 h-24 rounded border border-dashed border-slate-700 bg-neutral-900" />
                  )}
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-[10px] sm:text-[11px] 2xl:text-xs text-slate-200 min-w-46">
                  <span className="inline-flex items-center justify-center gap-1 px-1.5 py-0.5 rounded bg-slate-800 text-slate-100 font-semibold min-w-22">
                    Start {trimStart.toFixed(1)}s
                  </span>
                  <span className="inline-flex items-center justify-center gap-1 px-1.5 py-0.5 rounded bg-slate-800 text-slate-100 font-semibold min-w-22">
                    End {trimEnd.toFixed(1)}s
                  </span>
                  <span className="inline-flex items-center justify-center gap-1 px-1.5 py-0.5 rounded bg-slate-800 text-slate-100 font-semibold min-w-22">
                    Thumb {frameTime.toFixed(1)}s
                  </span>
                  <span className="inline-flex items-center justify-center gap-1 px-1.5 py-0.5 rounded bg-slate-800 text-slate-100 font-semibold min-w-22">
                    Clip {(trimEnd - trimStart).toFixed(1)}s
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2.5 flex-nowrap">
                <button
                  onClick={togglePlay}
                  className="px-3.5 py-1.5 text-[12px] sm:text-sm font-semibold rounded-md bg-slate-800 text-slate-100 border border-slate-700 hover:border-slate-500 flex items-center justify-center gap-2 min-w-30"
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
                  className="px-3.5 py-1.5 text-[12px] sm:text-sm font-semibold rounded-md bg-slate-800 text-slate-100 border border-slate-700 hover:border-slate-500 flex items-center justify-center gap-2 min-w-30"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M3 3h5v2H5v3H3V3zm9 0h5v5h-2V5h-3V3zm3 9h2v5h-5v-2h3v-3zm-7 3v2H3v-5h2v3h3z" />
                  </svg>
                  <span>Fullscreen</span>
                </button>
              </div>
            </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-neutral-900 p-3 md:p-1 space-y-2.5">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] sm:text-[11px] 2xl:text-xs text-slate-300 pl-1">Timeline</label>
              <span className="text-[11px] sm:text-[11px] 2xl:text-xs text-slate-400 pr-1">
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
        </div>

        {replacePrompt.value && (
          <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-sm flex items-center justify-center px-4">
            <div className="bg-neutral-900 border border-slate-800 rounded-xl w-full max-w-lg shadow-2xl p-4 sm:p-5 2xl:p-6 space-y-4 max-h-[90vh] overflow-y-auto custom-scroll">
              <div className="flex items-center justify-between">
                <h3 className="text-sm sm:text-base 2xl:text-lg font-semibold text-white">Replace existing highlight?</h3>
                <button
                  onClick={replacePrompt.close}
                  className="px-2.5 py-1 text-sm rounded-md border border-slate-700 text-slate-200 hover:border-slate-500 transition"
                >
                  ✕
                </button>
              </div>

              <p className="text-slate-400 text-xs sm:text-sm 2xl:text-sm">
                {replacePromptMessage}
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
                  onClick={() => {
                    replacePrompt.close();
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

        {saving && (
          <div className="absolute inset-0 z-65 bg-black/70 backdrop-blur-sm flex items-center justify-center">
            <HexLoader size={90} label="Saving highlight" />
          </div>
        )}
      </div>
    </div>
  );
}
