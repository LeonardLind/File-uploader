import { type Status } from "./galleryUtils";

export const statusStyles: Record<
  Status,
  { bg: string; text: string; label: string }
> = {
  draft: { bg: "bg-slate-700", text: "text-white", label: "Draft" },
  id: { bg: "bg-amber-400", text: "text-black", label: "ID" },
  done: { bg: "bg-green-500", text: "text-black", label: "Done" },
  display: { bg: "bg-blue-500", text: "text-black", label: "Display" },
};
