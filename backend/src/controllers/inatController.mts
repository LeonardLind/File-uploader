import type { Request, Response } from "express";

const DEFAULT_INATURALIST_BASE_URL = "https://api.inaturalist.org/v1";
const MIN_QUERY_LENGTH = 3;
const REQUEST_TIMEOUT_MS = 8000;
const INAT_TAXON_IDS = {
  aves: 3,
  mammalia: 40151,
} as const;

type InatTaxon = {
  id?: number;
  name?: string;
  preferred_common_name?: string;
  rank?: string;
};

type InatAutocompleteResponse = {
  results?: InatTaxon[];
};

export async function searchInaturalist(req: Request, res: Response) {
  const rawQuery = typeof req.query.q === "string" ? req.query.q : "";
  const query = rawQuery.trim();

  if (query.length < MIN_QUERY_LENGTH) {
    return res.status(200).json({ count: 0, result: [] });
  }

  const token = process.env.INATURALIST_API_TOKEN?.trim();
  const baseUrl = (process.env.INATURALIST_API_BASE_URL || DEFAULT_INATURALIST_BASE_URL)
    .trim()
    .replace(/\/$/, "");

  try {
    const headers: Record<string, string> = {
      "User-Agent": "File-Uploader/1.0",
      Accept: "application/json",
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const fetchAutocomplete = async (taxonId: number) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      try {
        const url = new URL(`${baseUrl}/taxa/autocomplete`);
        url.searchParams.set("q", query);
        url.searchParams.set("is_active", "true");
        url.searchParams.set("rank", "species");
        url.searchParams.set("per_page", "10");
        url.searchParams.set("taxon_id", String(taxonId));

        const response = await fetch(url.toString(), {
          signal: controller.signal,
          headers,
        });

        const contentType = response.headers.get("content-type") || "";
        const rawBody = await response.text();
        let data: InatAutocompleteResponse = {};
        if (contentType.includes("application/json")) {
          try {
            data = JSON.parse(rawBody) as InatAutocompleteResponse;
          } catch {
            data = {};
          }
        }

        if (!response.ok) {
          const fallbackMessage = `iNaturalist request failed (status ${response.status})`;
          const message = (data as { error?: string })?.error || fallbackMessage;
          console.error("iNaturalist request failed", {
            status: response.status,
            bodyPreview: rawBody.slice(0, 200),
          });
          throw new Error(message);
        }

        return Array.isArray(data.results) ? data.results : [];
      } finally {
        clearTimeout(timeout);
      }
    };

    const settled = await Promise.allSettled([
      fetchAutocomplete(INAT_TAXON_IDS.aves),
      fetchAutocomplete(INAT_TAXON_IDS.mammalia),
    ]);

    const merged: InatTaxon[] = [];
    const seen = new Set<number | string>();
    for (const entry of settled) {
      if (entry.status !== "fulfilled") continue;
      for (const taxon of entry.value) {
        const key = taxon.id ?? taxon.name ?? "";
        if (!key || seen.has(key)) continue;
        seen.add(key);
        merged.push(taxon);
      }
    }

    const mapped = merged
      .map((taxon) => {
        const scientificName = taxon.name?.trim();
        if (!scientificName) return null;
        return {
          scientific_name: scientificName,
          common_name: taxon.preferred_common_name?.trim() || "",
          rank: taxon.rank,
          id: taxon.id,
        };
      })
      .filter(Boolean);

    return res.json({ count: mapped.length, result: mapped });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return res.status(504).json({ error: "iNaturalist request timed out" });
    }
    return res.status(500).json({ error: "iNaturalist request failed" });
  }
}
