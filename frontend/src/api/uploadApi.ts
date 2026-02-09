type JsonValue = Record<string, unknown>;

async function requestJson<T extends JsonValue>(
  input: RequestInfo,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(input, init);
  const data = (await res.json().catch(() => ({}))) as T & {
    success?: boolean;
    error?: string;
  };
  if (!res.ok || data?.success === false) {
    throw new Error(data?.error || "Request failed");
  }
  return data;
}

export async function fetchMetadata(apiUrl: string) {
  return requestJson<{ success: boolean; items?: unknown[] }>(`${apiUrl}/api/upload/metadata`);
}

export async function updateMetadata(apiUrl: string, payload: JsonValue) {
  return requestJson(`${apiUrl}/api/upload/metadata/update`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function deleteFile(apiUrl: string, fileId: string) {
  return requestJson(`${apiUrl}/api/upload/delete`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileId }),
  });
}

export async function presignUpload(
  apiUrl: string,
  payload: { filename: string; contentType: string; type?: string }
) {
  return requestJson<{ uploadUrl?: string; key?: string }>(`${apiUrl}/api/upload/presign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function createMetadata(apiUrl: string, payload: JsonValue) {
  return requestJson(`${apiUrl}/api/upload/metadata`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function checkHighlightExists(
  apiUrl: string,
  payload: { fileId: string; highlightFileId?: string },
  signal?: AbortSignal
) {
  return requestJson<{ exists?: boolean; success?: boolean }>(`${apiUrl}/api/upload/highlight/exists`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });
}

export async function deleteHighlight(
  apiUrl: string,
  payload: { fileId: string; highlightFileId?: string; highlightThumbnailId?: string }
) {
  return requestJson(`${apiUrl}/api/upload/highlight/delete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function saveHighlight(apiUrl: string, payload: JsonValue) {
  return requestJson(`${apiUrl}/api/upload/highlight`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function fetchConfirmedSummary(apiUrl: string) {
  return requestJson<{ success: boolean; items?: unknown[] }>(
    `${apiUrl}/api/upload/confirmed-summary`
  );
}

export async function fetchSignedUrl(apiUrl: string, payload: {
  key: string;
  type?: "default" | "highlight";
  expiresIn?: number;
  responseContentType?: string;
  signal?: AbortSignal;
}) {
  return requestJson<{ success?: boolean; url?: string }>(`${apiUrl}/api/upload/signed-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      key: payload.key,
      type: payload.type,
      expiresIn: payload.expiresIn,
      responseContentType: payload.responseContentType,
    }),
    signal: payload.signal,
  });
}
