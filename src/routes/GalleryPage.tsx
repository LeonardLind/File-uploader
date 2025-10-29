import { useImageStore } from "../state/useImageStore";

export function GalleryPage() {
  const { images } = useImageStore();

  const savedImages = images.filter((img) => img.saved);

  return (
    <div className="min-h-screen w-screen bg-neutral-950 text-white flex flex-col overflow-hidden">

      {/* === MAIN CONTENT === */}
      <main className="flex flex-col flex-1 px-10 py-10 items-center overflow-y-auto">
        <div className="w-full max-w-7xl">
          {/* Subheader */}
          <div className="mb-10 flex items-baseline justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-white">File Manager</h1>
              <p className="text-slate-400 text-sm">
                {savedImages.length} files registered
              </p>
            </div>
          </div>

          {/* Table */}
          {savedImages.length === 0 ? (
            <p className="text-slate-500">No files registered yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-800 bg-neutral-900 shadow-md">
              <table className="min-w-full text-sm text-slate-300 border-collapse">
                <thead className="bg-neutral-800 text-slate-100 text-left uppercase text-xs tracking-wider">
                  <tr>
                    <th className="px-4 py-3">
                      <input type="checkbox" className="accent-lime-400" />
                    </th>
                    <th className="px-4 py-3">Species</th>
                    <th className="px-4 py-3">Experience Point</th>
                    <th className="px-4 py-3">Sensor ID</th>
                    <th className="px-4 py-3">Deployment ID</th>
                    <th className="px-4 py-3">Experience ID</th>
                    <th className="px-4 py-3">Thumbnail</th>
                    <th className="px-4 py-3">Media ID</th>
                    <th className="px-4 py-3">Captured</th>
                    <th className="px-4 py-3">Uploaded</th>
                  </tr>
                </thead>

                <tbody>
                  {savedImages.map((img) => (
                    <tr
                      key={img.id}
                      className="border-t border-slate-800 hover:bg-neutral-800/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <input type="checkbox" className="accent-lime-400" />
                      </td>

                      <td className="px-4 py-3 font-medium text-white">
                        {img.species || "—"}
                      </td>

                      <td className="px-4 py-3">{img.experiencePoint || "—"}</td>
                      <td className="px-4 py-3">{img.sensorId || "—"}</td>
                      <td className="px-4 py-3">{img.deploymentId || "—"}</td>
                      <td className="px-4 py-3">{img.experienceId || "—"}</td>

                      <td className="px-4 py-3">
                        {img.previewUrl ? (
                          <img
                            src={img.previewUrl}
                            alt="thumb"
                            className="w-16 h-10 object-cover rounded-md border border-slate-700"
                          />
                        ) : (
                          <span className="text-slate-600">–</span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-slate-400">b476188833003</td>
                      <td className="px-4 py-3 text-slate-400">21042025</td>
                      <td className="px-4 py-3 text-slate-400">01052025</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
