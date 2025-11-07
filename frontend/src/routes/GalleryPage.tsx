import { useEffect, useState } from "react";

type MetadataItem = {
  fileId: string;
  filename: string;
  species?: string;
  plot?: string;
  experiencePoint?: string;
  sensorId?: string;
  deploymentId?: string;
  updatedAt?: string;
};

export function GalleryPage() {
  const [files, setFiles] = useState<MetadataItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const API_URL = import.meta.env.VITE_API_URL;
  const BUCKET_NAME = import.meta.env.VITE_AWS_BUCKET;

  useEffect(() => {
    async function fetchMetadata() {
      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/api/upload/metadata`);
        const data = await res.json();

        if (!data.success) throw new Error(data.error || "Failed to fetch metadata");
        setFiles(data.items || []);
      } catch (err: any) {
        console.error("❌ Error loading metadata:", err);
        setError(err.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    }

    fetchMetadata();
  }, [API_URL]);

  return (
    <div className="min-h-screen w-screen bg-neutral-950 text-white flex flex-col overflow-hidden">
      <main className="flex flex-col flex-1 px-10 py-10 items-center overflow-y-auto custom-scroll">
        <div className="w-full max-w-7xl">
          {/* Header */}
          <div className="mb-10 flex items-baseline justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-white">Gallery</h1>
              <p className="text-slate-400 text-sm">
                {loading
                  ? "Loading..."
                  : `${files.length} file${files.length === 1 ? "" : "s"} registered`}
              </p>
            </div>
          </div>

          {/* Error / Loading States */}
          {error && (
            <p className="text-red-400 mb-6 text-center">Error: {error}</p>
          )}

          {loading ? (
            <p className="text-slate-400 text-center">Fetching data...</p>
          ) : files.length === 0 ? (
            <p className="text-slate-500 text-center">No files registered yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-800 bg-neutral-900 shadow-md">
              <table className="min-w-full text-sm text-slate-300 border-collapse">
                <thead className="bg-neutral-800 text-slate-100 text-left uppercase text-xs tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Species</th>
                    <th className="px-4 py-3">Plot</th>
                    <th className="px-4 py-3">Experience Point</th>
                    <th className="px-4 py-3">Sensor</th>
                    <th className="px-4 py-3">Deployment</th>
                    <th className="px-4 py-3">Preview</th>
                    <th className="px-4 py-3">Filename</th>
                    <th className="px-4 py-3">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((file) => {
                    const s3Url = `https://${BUCKET_NAME}.s3.amazonaws.com/${file.fileId}`;
                    const isVideo = file.filename?.match(/\.(mp4|avi|mov|mkv)$/i);

                    return (
                      <tr
                        key={file.fileId}
                        className="border-t border-slate-800 hover:bg-neutral-800/50 transition-colors"
                      >
                        <td className="px-4 py-3 font-medium text-white">
                          {file.species || "—"}
                        </td>
                        <td className="px-4 py-3">{file.plot || "—"}</td>
                        <td className="px-4 py-3">{file.experiencePoint || "—"}</td>
                        <td className="px-4 py-3">{file.sensorId || "—"}</td>
                        <td className="px-4 py-3">{file.deploymentId || "—"}</td>
                        <td className="px-4 py-3">
                          {isVideo ? (
                            <video
                              src={s3Url}
                              className="w-24 h-16 object-cover rounded-md border border-slate-700"
                              controls
                            />
                          ) : (
                            <img
                              src={s3Url}
                              alt="thumbnail"
                              className="w-16 h-12 object-cover rounded-md border border-slate-700"
                            />
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          {file.filename || "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          {file.updatedAt
                            ? new Date(file.updatedAt).toLocaleString()
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
