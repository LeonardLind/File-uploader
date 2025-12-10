import { useState } from "react";

type ConfirmState =
  | ({
      title: string;
      message: string;
      confirmLabel?: string;
      cancelLabel?: string;
      tone?: "danger" | "info";
      hideCancel?: boolean;
      resolve: (value: boolean) => void;
    })
  | null;

export function useConfirmDialog() {
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);

  const requestConfirm = (options: {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    tone?: "danger" | "info";
    hideCancel?: boolean;
  }) =>
    new Promise<boolean>((resolve) => {
      setConfirmState({ ...options, resolve });
    });

  const requestAlert = (options: { title: string; message: string }) =>
    requestConfirm({ ...options, confirmLabel: "OK", hideCancel: true });

  return { confirmState, setConfirmState, requestConfirm, requestAlert };
}
