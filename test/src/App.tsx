import { useEffect, useMemo, useState } from "react";
import type { VideoItem } from "./types";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
const BUCKET = import.meta.env.VITE_AWS_BUCKET || "";

function isActive(item: VideoItem) {
  return item.highlight && (item.displayState || "Inactive") !== "Inactive";
}

function buildS3Url(key?: string | null) {
  if (!key) return null;
  if (key.startsWith("http")) return key;
  if (!BUCKET) return null;
  return `https://${BUCKET}.s3.amazonaws.com/${key}`;
}

function videoSrc(item: VideoItem) {
  const key = item.highlightFileId || item.fileId;
  return buildS3Url(key);
}

function thumbSrc(item: VideoItem) {
  const key = item.highlightThumbnailId || item.thumbnailId;
  return buildS3Url(key || undefined);
}

export default function App() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${API_URL}/api/upload/metadata`);
        const data = await res.json();
        if (!data?.success) throw new Error(data?.error || "Failed to load metadata");
        const items: VideoItem[] = data.items || [];
        setVideos(items);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load videos");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const activeVideos = useMemo(() => videos.filter(isActive), [videos]);

  return (
    <div className="page">
      <header className="top">
        <div>
          <p className="eyebrow">Active Videos</p>
          <h1>Gallery</h1>
          <p className="sub">
            Showing videos with displayState Active (or unset). Click to play; highlights show a thumbnail when present.
          </p>
        </div>
        <div className="pill">
          {activeVideos.length} video{activeVideos.length === 1 ? "" : "s"}
        </div>
      </header>

      {loading && <div className="notice">Loading…</div>}
      {error && <div className="notice error">Error: {error}</div>}

      <section className="grid">
        {activeVideos.map((video) => {
          const thumb = thumbSrc(video);
          const vid = videoSrc(video);
          const isPlaying = playingId === video.fileId;
          return (
            <article key={video.fileId} className="card">
              <div className="media">
                {isPlaying && vid ? (
                  <video src={vid} controls autoPlay preload="metadata" />
                ) : thumb ? (
                  <button
                    className="thumb-button"
                    onClick={() => {
                      if (vid) setPlayingId(video.fileId);
                    }}
                  >
                    <img src={thumb} alt="thumbnail" />
                    <span className="play-icon">▶</span>
                  </button>
                ) : vid ? (
                  <video src={vid} controls preload="metadata" />
                ) : (
                  <div className="notice error">Missing bucket config</div>
                )}
              </div>
              <div className="meta">
                <div className="title">{video.filename || video.fileId}</div>
                <div className="pill small">display: {video.displayState || "Active"}</div>
                {video.highlight && <div className="pill small accent">highlight</div>}
              </div>
            </article>
          );
        })}
      </section>

      {!loading && activeVideos.length === 0 && !error && (
        <div className="notice">No active videos found.</div>
      )}
    </div>
  );
}
