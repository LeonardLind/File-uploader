import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { HighlightEditorModal } from "../components/HighlightEditorModal";
import { GalleryFilterBar } from "../components/GalleryFilterBar";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { EditPane } from "../components/EditPane";
import { Pagination } from "../components/Pagination";
import { HexLoader } from "../components/HexLoader";
import { useMetadata } from "../hooks/useMetadata";
import { useFilteredMetadata } from "../hooks/useFilteredMetadata";
import { useAutofillMetadata } from "../hooks/useAutofillMetadata";
import { useConfirmDialog } from "../hooks/useConfirmDialog";
import { useKeyboardNavigation } from "../hooks/useKeyboardNavigation";
import { deriveStatus, type Status } from "../utils/galleryUtils";
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
  const [savingMetadata, setSavingMetadata] = useState(false);
  const [showSidebarFilters, setShowSidebarFilters] = useState(false);
  const [mainFiltersOpen, setMainFiltersOpen] = useState(false);
  const [highlightAvailability, setHighlightAvailability] = useState<
    Record<string, { highlightFileId?: string; exists: boolean }>
  >({});

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

  const API_URL = import.meta.env.VITE_API_URL;
  const BUCKET_NAME = import.meta.env.VITE_AWS_BUCKET;
  const HIGHLIGHT_BUCKET = import.meta.env.VITE_AWS_HIGHLIGHT_BUCKET || BUCKET_NAME;
  const location = useLocation();
  const { confirmState, setConfirmState, requestConfirm, requestAlert } = useConfirmDialog();
  const { files, setFiles, loading, error } = useMetadata(API_URL);
  const { filtered, view } = useFilteredMetadata(files, filters, location.search);
  useKeyboardNavigation(editing, filtered, setEditing);

  const isSidebarLayout = view === "draft" || view === "id";
  const useSidebarLayout = isSidebarLayout && !!editing;
  const itemsPerPage = useSidebarLayout ? 10 : 7;

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
    setShowSidebarFilters(false);
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
      setSavingMetadata(true);
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
    } finally {
      setSavingMetadata(false);
    }
  };

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedItems = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    (currentPage - 1) * itemsPerPage + itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [filtered, itemsPerPage]);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  useEffect(() => {
    if (view !== "display") {
      setHighlightAvailability((prev) => (Object.keys(prev).length ? {} : prev));
      return;
    }

    const controller = new AbortController();
    const filesToCheck = paginatedItems.filter((item) => {
      if (!item.highlightFileId) return false;
      const cached = highlightAvailability[item.fileId];
      return !cached || cached.highlightFileId !== item.highlightFileId;
    });

    if (!filesToCheck.length) return;

    (async () => {
      const updates: Record<string, { highlightFileId?: string; exists: boolean }> = {};

      await Promise.all(
        filesToCheck.map(async (item) => {
          try {
            const res = await fetch(`${API_URL}/api/upload/highlight/exists`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ fileId: item.fileId, highlightFileId: item.highlightFileId }),
              signal: controller.signal,
            });
            const data = await res.json();
            if (!res.ok || !data?.success) {
              throw new Error(data?.error || "Highlight check failed");
            }
            updates[item.fileId] = { highlightFileId: item.highlightFileId, exists: Boolean(data.exists) };
          } catch (err: unknown) {
            if (controller.signal.aborted) return;
            console.warn("Failed to verify highlight asset", err);
            updates[item.fileId] = { highlightFileId: item.highlightFileId, exists: false };
          }
        })
      );

      if (controller.signal.aborted || Object.keys(updates).length === 0) {
        return;
      }

      setHighlightAvailability((prev) => ({
        ...prev,
        ...updates,
      }));
    })();

    return () => controller.abort();
  }, [API_URL, paginatedItems, view]);

  if (loading) {
    return (
      <div className="flex flex-col w-full min-h-screen bg-neutral-950 text-white">
        <main className="flex flex-1 items-center justify-center pt-24 pb-10 px-4">
          <HexLoader size={100} label="Preparing interface" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full bg-neutral-950 text-white">
      <main className="flex flex-col flex-1 h-full px-4 sm:px-6 md:px-8 lg:px-10 pt-20 pb-4 items-center overflow-y-auto custom-scroll relative">
        <div className="w-full max-w-6xl sm:max-w-7xl lg:max-w-[1400px]">
          <div className="mb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="text-slate-400 text-sm">
                {`${filtered.length} of ${files.length} file${files.length === 1 ? "" : "s"}`}
              </p>
            </div>
            {files.length > 0 && !editing && (
              <button
                onClick={() => setMainFiltersOpen((prev) => !prev)}
                className="self-start inline-flex items-center gap-2 rounded-md border border-slate-700 bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-lime-400 transition"
                title="Toggle filters"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4 text-lime-300"
                >
                  <path d="M4 5h16M6 12h12M9 19h6" />
                </svg>
                <span>{mainFiltersOpen ? "Hide filters" : "Show filters"}</span>
              </button>
            )}
          </div>

          {files.length > 0 && !editing && (
            <div className={`filter-panel ${mainFiltersOpen ? "filter-open" : ""}`}>
              <div className="filter-panel-inner">
                <GalleryFilterBar
                  filters={filters}
                  uniqueValues={uniqueValues}
                  onChange={handleFilterChange}
                  onClear={clearFilters}
                />
              </div>
            </div>
          )}
          {error && <p className="text-red-400 mb-6 text-center">Error: {error}</p>}

          {filtered.length === 0 ? (
            <p className="text-slate-500 text-center">No matching results.</p>
          ) : useSidebarLayout ? (
            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-3 lg:gap-4">
              <aside className="bg-neutral-900 border border-slate-800 rounded-lg h-full flex flex-col shadow-md">
                <div className="px-4 py-3 border-b border-slate-800 text-slate-200 font-semibold text-sm flex items-center justify-between gap-3">
                  <span>Files</span>
                  <button
                    onClick={() => setShowSidebarFilters((prev) => !prev)}
                    className="text-[11px] px-3 py-1.5 rounded-md border border-slate-700 text-slate-200 hover:border-lime-400 transition"
                  >
                    Filters
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto custom-scroll flex flex-col gap-2 px-2 pt-5 pb-2">
                  {paginatedItems.map((item) => {
                    const active = editing?.fileId === item.fileId;
                    return (
                      <button
                        key={item.fileId}
                        onClick={() => setEditing(item)}
                        className={`w-full text-left px-3 py-2 text-[11px] border border-slate-800 rounded-lg transition-colors ${
                          active
                            ? "bg-slate-800/80 text-white border-l-4 border-lime-400"
                            : "text-slate-200 hover:bg-neutral-800/80"
                        }`}
                      >
                        <div className="truncate font-medium text-[10px] sm:text-xs">
                          {item.filename || "(untitled)"}
                        </div>
                      </button>
                    );
                  })}
                </div>
                {totalPages > 1 && (
                  <div className="border-t border-slate-800 px-4 py-2 flex justify-center">
                    <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={goToPage} />
                  </div>
                )}
              </aside>

              <div className="w-full">
                {editing ? (
                  <EditPane
                    file={editing}
                    bucket={BUCKET_NAME}
                    apiUrl={API_URL}
                    currentView={view}
                    uniqueValues={uniqueValues}
                    onClose={() => setEditing(null)}
                    onSave={handleSaveEdit}
                    onDelete={handleDeleteFile}
                    onAlert={(title, message) => {
                      requestAlert({ title, message });
                    }}
                  />
                ) : (
                  <div className="h-full min-h-[300px] flex items-center justify-center text-slate-400 border border-slate-800 rounded-lg bg-neutral-900">
                    Select a file to edit
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className={editing ? "grid grid-cols-1 lg:grid-cols-2 gap-6" : "grid grid-cols-1 gap-6"}>
              {editing && (
                <div className="w-full">
                  <EditPane
                    file={editing}
                    bucket={BUCKET_NAME}
                    apiUrl={API_URL}
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
                          editing?.fileId === file.fileId || highlightEditor?.fileId === file.fileId;
                        const trimmedAvailability = highlightAvailability[file.fileId];
                        const hasTrimmedHighlight =
                          trimmedAvailability && trimmedAvailability.highlightFileId === file.highlightFileId
                            ? trimmedAvailability.exists
                            : Boolean(file.highlightFileId && file.highlightThumbnailId);

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
                              {file.species || "-"}
                            </td>

                            <td className="px-3 py-2">{file.plot || "-"}</td>

                            <td className="px-3 py-2">{file.experiencePoint || "-"}</td>

                            <td className="px-3 py-2">{file.sensorId || "-"}</td>

                            <td className="px-3 py-2">{file.deploymentId || "-"}</td>

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
                              {file.filename || "(no filename)"}
                            </td>

                            <td className="px-3 py-2 text-slate-400 whitespace-nowrap">
                              {file.updatedAt ? new Date(file.updatedAt).toLocaleString() : "-"}
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

      {savingMetadata && (
        <div className="fixed inset-0 z-70 bg-black/70 backdrop-blur-sm flex items-center justify-center px-4">
          <HexLoader size={88} label="Saving metadata" />
        </div>
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

      {showSidebarFilters && (
        <div className="fixed inset-0 z-75 bg-black/70 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="w-full max-w-4xl bg-neutral-950 border border-slate-800 rounded-2xl shadow-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base sm:text-lg font-semibold text-white">Filters</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={clearFilters}
                  className="text-[11px] sm:text-xs px-3 py-1.5 rounded-md border border-slate-700 text-slate-200 hover:border-lime-400 transition"
                >
                  Clear
                </button>
                <button
                  onClick={() => setShowSidebarFilters(false)}
                  className="text-[11px] sm:text-xs px-3 py-1.5 rounded-md bg-lime-400 text-black font-semibold hover:bg-lime-300 transition"
                >
                  Close
                </button>
              </div>
            </div>
              <GalleryFilterBar
                filters={filters}
                uniqueValues={uniqueValues}
                onChange={handleFilterChange}
                showClear={false}
                layout="grid"
              />
            </div>
          </div>
        )}
    </div>
  );
}
