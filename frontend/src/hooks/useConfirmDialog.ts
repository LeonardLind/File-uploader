import { useState } from "react";

type ConfirmState =
  | {
      title: string;
      message: string;
      confirmLabel?: string;
      tone?: "danger" | "info";
      resolve: (value: boolean) => void;
    }
  | null;

export function useConfirmDialog() {
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);

  // Show a confirm dialog and wait for the user's answer
  const requestConfirm = (options: {
    title: string;
    message: string;
    confirmLabel?: string;
    tone?: "danger" | "info";
  }) =>
    new Promise<boolean>((resolve) => {
      setConfirmState({ ...options, resolve });
    });

  // Alert = same dialog, just "OK"
  const requestAlert = (options: { title: string; message: string }) =>
    requestConfirm({ ...options, confirmLabel: "OK", tone: "info" });

  return { confirmState, setConfirmState, requestConfirm, requestAlert };
}
