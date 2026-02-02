import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from "react";

type ToastTone = "success" | "info" | "warning" | "error";

type Toast = {
  id: string;
  title?: string;
  message: string;
  tone: ToastTone;
  closing?: boolean;
};

type ToastContextType = {
  notify: (toast: { title?: string; message: string; tone?: ToastTone; durationMs?: number }) => void;
};

const ToastContext = createContext<ToastContextType | null>(null);

const toneStyles: Record<ToastTone, { border: string; bg: string; icon: string }> = {
  success: { border: "border-lime-400/80", bg: "bg-neutral-900", icon: "text-lime-300" },
  info: { border: "border-blue-400/80", bg: "bg-neutral-900", icon: "text-blue-300" },
  warning: { border: "border-amber-400/80", bg: "bg-neutral-900", icon: "text-amber-300" },
  error: { border: "border-red-500/80", bg: "bg-neutral-900", icon: "text-red-300" },
};

function Icon({ tone }: { tone: ToastTone }) {
  if (tone === "success") {
    return (
      <svg
        viewBox="0 0 24 24"
        className="h-10 w-10"
        fill="none"
        aria-hidden="true"
      >
        <rect
          x="3.5"
          y="3.5"
          width="17"
          height="17"
          rx="4"
          stroke="rgba(163, 230, 53, 0.8)"
          strokeWidth="2"
        />
        <path
          d="M7.5 12.3l3 3 6.8-7"
          stroke="rgba(163, 230, 53, 0.8)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (tone === "info") {
    return (
      <svg
        viewBox="0 0 24 24"
        className="h-10 w-10"
        fill="none"
        aria-hidden="true"
      >
        <circle
          cx="12"
          cy="12"
          r="8.5"
          stroke="rgba(96, 165, 250, 0.8)"
          strokeWidth="2"
        />
        <circle cx="12" cy="8" r="1.2" fill="rgba(96, 165, 250, 0.8)" />
        <path
          d="M12 11.5v5"
          stroke="rgba(96, 165, 250, 0.8)"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (tone === "warning") {
    return (
      <svg
        viewBox="0 0 24 24"
        className="h-10 w-10"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M6.2 6.2l11.6 11.6M17.8 6.2L6.2 17.8"
          stroke="rgba(251, 191, 36, 0.8)"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      className="h-10 w-10"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M6.2 6.2l11.6 11.6M17.8 6.2L6.2 17.8"
        stroke="rgba(239, 68, 68, 0.8)"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  // Track auto-close timers for each toast.
  const timers = useRef<Record<string, number>>({});

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current[id];
    if (timer) {
      window.clearTimeout(timer);
      delete timers.current[id];
    }
  };

  const closeToast = (id: string) => {
    const timer = timers.current[id];
    if (timer) {
      window.clearTimeout(timer);
      delete timers.current[id];
    }
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, closing: true } : t))
    );
    window.setTimeout(() => removeToast(id), 240);
  };

  // Add a toast and schedule auto-dismiss.
  const notify = ({ title, message, tone = "info", durationMs = 10800 }: { title?: string; message: string; tone?: ToastTone; durationMs?: number }) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev.slice(-3), { id, title, message, tone }]);
    timers.current[id] = window.setTimeout(() => closeToast(id), durationMs);
  };

  const value = useMemo<ToastContextType>(() => ({ notify }), []);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-120 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => {
          const tone = toneStyles[toast.tone];
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto border ${tone.border} ${tone.bg} rounded-lg shadow-xl px-3.5 py-3 text-sm text-white backdrop-blur-sm flex gap-3 animate-fade-in toast-card ${toast.closing ? "toast-closing" : ""}`}
            >
              <div className={`pt-0.5 ${tone.icon}`}>
                <Icon tone={toast.tone} />
              </div>
              <div className="flex-1 space-y-1">
                {toast.title && <p className="font-semibold leading-tight">{toast.title}</p>}
                <p className="text-slate-200 text-[13px] leading-snug">{toast.message}</p>
              </div>
              <button
                onClick={() => closeToast(toast.id)}
                className="text-slate-400 hover:text-white text-[13px] mt-0.5"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
