import { useCallback, useState } from "react";
import { deleteFile as deleteFileRequest } from "../api/uploadApi";

export function useDeleteFile(apiUrl: string) {
  const [deleting, setDeleting] = useState(false);

  const deleteFile = useCallback(
    async (fileId: string) => {
      setDeleting(true);
      try {
        return await deleteFileRequest(apiUrl, fileId);
      } finally {
        setDeleting(false);
      }
    },
    [apiUrl]
  );

  return { deleteFile, deleting };
}
