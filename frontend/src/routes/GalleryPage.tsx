import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { HighlightEditorModal } from "../components/HighlightEditorModal";
import { GalleryFilterBar } from "../components/GalleryFilterBar";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { EditPane } from "../components/EditPane";
import { Pagination } from "../components/Pagination";
import { useMetadata } from "../hooks/useMetadata";
import { useFilteredMetadata } from "../hooks/useFilteredMetadata";
import { useAutofillMetadata } from "../hooks/useAutofillMetadata";
import { useConfirmDialog } from "../hooks/useConfirmDialog";
import { useKeyboardNavigation } from "../hooks/useKeyboardNavigation";
import { deriveStatus, type Status, type ViewFilter } from "../utils/galleryUtils";
import type { MetadataItem } from "../types/gallery";

const statusStyles: Record<Status, { bg: string; text: string; label: string }> = {
  draft: { bg: "bg-slate-700", text: "text-white", label: "Draft" },
  id: { bg: "bg-amber-400", text: "text-black", label: "ID" },
  done: { bg: "bg-green-500", text: "text-black", label: "Done" },
  display: { bg: "bg-blue-500", text: "text-black", label: "Display" },
};

export function GalleryPage() {
  const [highlightEditor, setHighlightEditor] = useState<MetadataItem | null>(null);
  const [editing, setEditing] = useState<MetadataItem | null>(null);

  const [filters, setFilters] = useState({
    species: "",
    plot: "",
    experiencePoint: "",
    sensorId: "",
    deploymentId: "",
    id_state: "",
    updatedSort: "desc",
  });

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 7;

  const API_URL = import.meta.env.VITE_API_URL;
  const BUCKET_NAME = import.meta.env.VITE_AWS_BUCKET;
  const HIGHLIGHT_BUCKET = import.meta.env.VITE_AWS_HIGHLIGHT_BUCKET || BUCKET_NAME;
  const location = useLocation();
  const { confirmState, setConfirmState, requestConfirm, requestAlert } = useConfirmDialog();
  const { files, setFiles, loading, error } = useMetadata(API_URL);
  const { filtered, view } = useFilteredMetadata(files, filters, location.search);
  useKeyboardNavigation(editing, filtered, setEditing);

  const uniqueValues = useMemo(() => {
    const getUnique = (key: keyof MetadataItem) =>
      Array.from(new Set(files.map((f) => f[key]).filter(Boolean))) as string[];
    return {
      species: getUnique("species"),
      plot: getUnique("plot"),
      experiencePoint: getUnique("experiencePoint"),
      sensorId: getUnique("sensorId"),
      deploymentId: getUnique("deploymentId"),
      id_state: getUnique("id_state"),
    };
  }, [files]);

  useEffect(() => {
    setEditing(null);
    setHighlightEditor(null);
  }, [view]);

  const handleFilterChange = (key: keyof typeof filters, value: string) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  const clearFilters = () =>
    setFilters({
      species: "",
      plot: "",
      experiencePoint: "",
      sensorId: "",
      deploymentId: "",
      id_state: "",
      updatedSort: "desc",
    });

  const updateLocal = (fileId: string, updates: Partial<MetadataItem>) => {
    setFiles((prev) => prev.map((f) => (f.fileId === fileId ? { ...f, ...updates } : f)));
  };

  useAutofillMetadata(files, updateLocal, API_URL);

  const handleDeleteFile = async (fileId: string) => {
    const confirmed = await requestConfirm({
      title: "Delete file?",
      message: "This will permanently remove the video from S3 and delete its metadata.",
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      tone: "danger",
    });
    if (!confirmed) return;

    try {
      const res = await fetch(`${API_URL}/api/upload/delete`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId }),
      });
      const result = await res.json();
      if (!res.ok || !result?.success) {
        throw new Error(result?.error || "Delete failed");
      }

      setFiles((prev) => prev.filter((f) => f.fileId !== fileId));
      setEditing((prev) => (prev?.fileId === fileId ? null : prev));
      setHighlightEditor((prev) => (prev?.fileId === fileId ? null : prev));
    } catch (err: unknown) {
      console.error("Delete failed", err);
      requestAlert({
        title: "Delete failed",
        message: err instanceof Error ? err.message : "Failed to delete file",
      });
    }
  };

  const handleRowClick = (file: MetadataItem) => {
    if (view === "display" || view === "done") {
      setHighlightEditor(file);
    } else {
      setEditing(file);
    }
  };

  const toggleActive = async (file: MetadataItem, active: boolean) => {
    try {
      const displayState = active ? "Active" : "Inactive";
      await fetch(`${API_URL}/api/upload/metadata/update`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId: file.fileId,
          displayState,
        }),
      });
      updateLocal(file.fileId, { displayState });
    } catch (err: unknown) {
      requestAlert({
        title: "Update failed",
        message: err instanceof Error ? err.message : "Failed to update active state",
      });
    }
  };

  const handleSaveEdit = async (payload: {
    species?: string;
    plot?: string;
    experiencePoint?: string;
    sensorId?: string;
    deploymentId?: string;
    status: Status;
    id_state: string;
    displayState?: string;
    highlight?: boolean;
  }) => {
    if (!editing) return;
    if (payload.status === "done") {
      const requiredFilled = [
        payload.species,
        payload.plot,
        payload.experiencePoint,
        payload.sensorId,
        payload.deploymentId,
      ].every((val) => (val ?? "").trim() !== "");
      if (!requiredFilled || payload.id_state !== "Confirmed") {
        await requestAlert({
          title: "Done requires confirmed metadata",
          message: "All fields must be filled and ID State must be Confirmed before moving to Done.",
        });
        return;
      }
    }
    if (payload.status === "display") {
      const requiredFilled = [
        payload.species,
        payload.plot,
        payload.experiencePoint,
        payload.sensorId,
        payload.deploymentId,
      ].every((val) => (val ?? "").trim() !== "");
      if (!requiredFilled || payload.id_state !== "Confirmed") {
        await requestAlert({
          title: "Display requires confirmed metadata",
          message: "All fields must be filled and ID State must be Confirmed before setting status to Display.",
        });
        return;
      }
    }
    const nextHighlight = payload.status === "display";
    const nextDisplay =
      payload.displayState ||
      (nextHighlight ? "Active" : payload.status === "done" ? "Showcase" : "Showcase");
    const sendHighlight =
      payload.highlight !== undefined ? payload.highlight : nextHighlight ? true : undefined;

    try {
      const res = await fetch(`${API_URL}/api/upload/metadata/update`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId: editing.fileId,
          species: payload.species,
          plot: payload.plot,
          experiencePoint: payload.experiencePoint,
          sensorId: payload.sensorId,
          deploymentId: payload.deploymentId,
          id_state: payload.id_state,
          highlight: sendHighlight,
          displayState: nextDisplay,
          stage: payload.status,
        }),
      });

      const result = await res.json();
      if (!result?.success) {
        throw new Error(result?.error || "Metadata update failed");
      }

      const displayState = payload.displayState || nextDisplay;
      updateLocal(editing.fileId, {
        ...payload,
        highlight: sendHighlight ?? editing.highlight,
        displayState,
        stage: payload.status,
        updatedAt: new Date().toISOString(),
      });
      setEditing((prev) =>
        prev ? { ...prev, ...payload, highlight: sendHighlight ?? prev.highlight, displayState } : null
      );

      const currentIndex = filtered.findIndex((f) => f.fileId === editing.fileId);
      if (currentIndex >= 0 && currentIndex < filtered.length - 1) {
        setEditing(filtered[currentIndex + 1]);
      }
  } catch (err: unknown) {
    console.error("Failed to save metadata", err);
    requestAlert({ title: "Save failed", message: "Please try again." });
  }
};

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedItems = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    (currentPage - 1) * ITEMS_PER_PAGE + ITEMS_PER_PAGE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [filtered]);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  return (
    <div className="flex flex-col w-full h-full bg-neutral-950 text-white">
      <main className="flex flex-col flex-1 h-full px-4 sm:px-6 md:px-8 lg:px-10 pt-20 pb-4 items-center overflow-y-auto custom-scroll">
        <div className="w-full max-w-6xl sm:max-w-7xl lg:max-w-[1400px]">
          <div className="mb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="text-slate-400 text-sm">
                {loading
                  ? "Loading..."
                  : `${filtered.length} of ${files.length} file${
                      files.length === 1 ? "" : "s"
                    }`}
              </p>
            </div>
          </div>

          {!loading && files.length > 0 && (
            <GalleryFilterBar
              filters={filters}
              uniqueValues={uniqueValues}
              onChange={handleFilterChange}
              onClear={clearFilters}
            />
          )}
          {error && (
            <p className="text-red-400 mb-6 text-center">Error: {error}</p>
          )}

          {loading ? (
            <p className="text-slate-400 text-center">Fetching data...</p>
          ) : filtered.length === 0 ? (
            <p className="text-slate-500 text-center">No matching results.</p>
          ) : (
            <div className={editing ? "grid grid-cols-1 lg:grid-cols-2 gap-6" : "grid grid-cols-1 gap-6"}>
              {editing && (
                <div className="w-full">
                  <EditPane
                    file={editing}
                    bucket={BUCKET_NAME}
                    currentView={view}
                    uniqueValues={uniqueValues}
                    onClose={() => setEditing(null)}
                    onSave={handleSaveEdit}
                    onDelete={handleDeleteFile}
                    onAlert={(title, message) => {
                      requestAlert({ title, message });
                    }}
                  />
                </div>
              )}

              <div className="w-full">
                <div className="overflow-x-auto rounded-lg border border-slate-800 bg-neutral-900 shadow-md custom-scroll">
                  <table className="min-w-full text-xs sm:text-sm text-slate-300 border-collapse">
                    <thead className="bg-neutral-800 text-slate-100 text-left uppercase text-[10px] sm:text-xs tracking-wide">
                      <tr>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2">ID State</th>
                        <th className="px-3 py-2">Species</th>
                        <th className="px-3 py-2">Plot</th>
                        <th className="px-3 py-2">Experience</th>
                        <th className="px-3 py-2">Sensor</th>
                        <th className="px-3 py-2">Deployment</th>
                        {view === "display" && <th className="px-3 py-2">Preview</th>}
                        {view === "display" && <th className="px-3 py-2">Trimmed</th>}
                        {view === "display" && <th className="px-3 py-2">Active</th>}
                        <th className="px-3 py-2">Filename</th>
                        <th className="px-3 py-2">Updated</th>
                      </tr>
                    </thead>

                    <tbody>
                      {paginatedItems.map((file) => {
                        const status = deriveStatus(file);
                        const statusStyle = statusStyles[status];
                        const isActive =
                          editing?.fileId === file.fileId ||
                          highlightEditor?.fileId === file.fileId;
                        const hasTrimmedHighlight = Boolean(file.highlightFileId && file.highlightThumbnailId);

                        return (
                          <tr
                            key={file.fileId}
                            onClick={() => handleRowClick(file)}
                            className={`border-t border-slate-800 transition-colors cursor-pointer ${
                              isActive ? "bg-lime-400/10" : "hover:bg-neutral-800/50"
                            }`}
                          >
                            <td className="px-3 py-2">
                              <span
                                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${statusStyle.bg} ${statusStyle.text}`}
                              >
                                {statusStyle.label}
                              </span>
                            </td>

                            <td className="px-3 py-2">
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-100">
                                {file.id_state || "Unknown"}
                              </span>
                            </td>

                            <td className="px-3 py-2 font-medium text-white">
                              {file.species || "—"}
                            </td>

                            <td className="px-3 py-2">{file.plot || "-"}</td>

                            <td className="px-3 py-2">
                              {file.experiencePoint || "—"}
                            </td>

                            <td className="px-3 py-2">{file.sensorId || "—"}</td>

                            <td className="px-3 py-2">
                              {file.deploymentId || "—"}
                            </td>

                            {view === "display" && (
                              <td className="px-3 py-2">
                                {file.highlightThumbnailId || file.thumbnailId ? (
                                  <img
                                    src={`https://${file.highlightThumbnailId ? HIGHLIGHT_BUCKET : BUCKET_NAME}.s3.amazonaws.com/${file.highlightThumbnailId || file.thumbnailId}`}
                                    alt="thumbnail"
                                    className="w-20 h-14 sm:w-24 sm:h-16 object-cover rounded-md border border-slate-700"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                ) : (
                                  <div className="w-20 h-14 sm:w-24 sm:h-16 rounded-md border border-dashed border-slate-700 bg-neutral-900 text-[10px] sm:text-xs text-slate-400 flex items-center justify-center">
                                    No thumbnail yet
                                  </div>
                                )}
                              </td>
                            )}

                            {view === "display" && (
                              <td className="px-3 py-2">
                                <input
                                  type="checkbox"
                                  checked={hasTrimmedHighlight}
                                  readOnly
                                  onClick={(e) => e.stopPropagation()}
                                  title="Highlight video and thumbnail uploaded"
                                  className="w-4 h-4 accent-lime-400 cursor-default"
                                />
                              </td>
                            )}

                            {view === "display" && (
                              <td className="px-3 py-2">
                                <input
                                  type="checkbox"
                                  checked={(file.displayState || "Active") !== "Inactive"}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) => toggleActive(file, e.target.checked)}
                                  className="h-4 w-4 accent-lime-400"
                                />
                              </td>
                            )}

                            <td className="px-3 py-2 text-slate-400 truncate max-w-[10rem]">
                              {file.filename || "—"}
                            </td>

                            <td className="px-3 py-2 text-slate-400 whitespace-nowrap">
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

                <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={goToPage} />
              </div>
            </div>
          )}
        </div>
      </main>

      {highlightEditor && (
        <HighlightEditorModal
          file={highlightEditor}
          bucket={BUCKET_NAME}
          apiUrl={API_URL}
          requestConfirm={requestConfirm}
          onClose={() => setHighlightEditor(null)}
          onSaved={(updates) => updateLocal(highlightEditor.fileId, updates)}
        />
      )}

      <ConfirmDialog
        open={Boolean(confirmState)}
        title={confirmState?.title || ""}
        message={confirmState?.message || ""}
        confirmLabel={confirmState?.confirmLabel}
        tone={confirmState?.tone}
        onConfirm={() => {
          confirmState?.resolve(true);
          setConfirmState(null);
        }}
        onCancel={() => {
          confirmState?.resolve(false);
          setConfirmState(null);
        }}
      />
    </div>
  );
}
