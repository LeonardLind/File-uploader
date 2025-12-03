type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "info";
  hideCancel?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "info",
  hideCancel = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  const confirmClasses =
    tone === "danger"
      ? "bg-red-500 hover:bg-red-400 text-white"
      : "bg-lime-400 hover:bg-lime-300 text-black";

  return (
    <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-neutral-950 border border-slate-800 rounded-xl shadow-2xl p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Confirmation</p>
            <h3 className="text-lg font-semibold text-white">{title}</h3>
          </div>
          <button
            onClick={onCancel}
            className="px-2.5 py-1 text-sm rounded-md border border-slate-700 text-slate-200 hover:border-slate-500 transition"
          >
            ✕
          </button>
        </div>

        <p className="text-slate-300 text-sm leading-relaxed">{message}</p>

        <div className="flex justify-end gap-3 pt-1">
          {!hideCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-md border border-slate-700 text-slate-200 hover:border-slate-500 transition"
            >
              {cancelLabel}
            </button>
          )}
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-md font-semibold transition ${confirmClasses}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
