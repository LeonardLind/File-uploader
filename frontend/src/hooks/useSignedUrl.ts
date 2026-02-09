import { useEffect, useState } from "react";
import { fetchSignedUrl } from "../api/uploadApi";

type UseSignedUrlOptions = {
  apiUrl: string;
  key?: string | null;
  type?: "default" | "highlight";
  enabled?: boolean;
};

export function useSignedUrl({ apiUrl, key, type = "default", enabled = true }: UseSignedUrlOptions) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !key) {
      setUrl(null);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    let active = true;
    setLoading(true);
    setError(null);
    setUrl(null);

    (async () => {
      try {
        const data = await fetchSignedUrl(apiUrl, {
          key,
          type,
          signal: controller.signal,
        });
        const nextUrl = data?.url;
        if (!nextUrl) {
          throw new Error("Failed to fetch signed URL");
        }
        if (!active) return;
        setUrl(nextUrl);
      } catch (err: unknown) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Failed to fetch signed URL");
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
      controller.abort();
    };
  }, [apiUrl, key, type, enabled]);

  return { url, loading, error };
}
