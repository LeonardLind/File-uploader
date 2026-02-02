type SignedUrlRequest = {
  apiUrl: string;
  key: string;
  type?: "default" | "highlight";
  expiresIn?: number;
  responseContentType?: string;
  signal?: AbortSignal;
};

// This function asks the server for a signed upload link
export async function fetchSignedUrl({
  apiUrl,
  key,
  type = "default",
  expiresIn,
  responseContentType,
  signal,
}: SignedUrlRequest): Promise<string> {

   // Send a request to our backend to ask for the signed URL
  const res = await fetch(`${apiUrl}/api/upload/signed-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      key,
      type,
      expiresIn,
      responseContentType,
    }),
    signal,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.success || !data?.url) {
    throw new Error(data?.error || "Failed to fetch signed URL");
  }

  return data.url as string;
}
