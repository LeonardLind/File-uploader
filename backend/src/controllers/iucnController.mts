import type { Request, Response } from "express";

const DEFAULT_IUCN_BASE_URL = "https://api.iucnredlist.org/api/v4";
const ALLOWED_CLASSES = new Set(["MAMMALIA", "AVES", "REPTILIA", "AMPHIBIA"]);
const MIN_QUERY_LENGTH = 3;
const REQUEST_TIMEOUT_MS = 8000;

type IucnCommonName = {
  name?: string;
  language?: string;
  main?: boolean;
};

type IucnTaxon = {
  sis_id?: number;
  scientific_name?: string;
  common_names?: IucnCommonName[];
  class_name?: string;
  order_name?: string;
  family_name?: string;
  genus_name?: string;
  species_name?: string;
  infra_name?: string | null;
  subpopulation_name?: string | null;
  species_taxa?: IucnTaxon[];
  subpopulation_taxa?: IucnTaxon[];
  infrarank_taxa?: IucnTaxon[];
};

type IucnScientificResponse = {
  taxon?: IucnTaxon;
};

type IucnSuggestion = {
  scientific_name: string;
  common_name?: string;
  class_name?: string;
  order_name?: string;
  family_name?: string;
  genus_name?: string;
  species_name?: string;
  sis_id?: number | null;
};

const pickCommonName = (commonNames?: IucnCommonName[]) => {
  if (!Array.isArray(commonNames) || commonNames.length === 0) return "";
  const mainEng = commonNames.find((name) => name.main && name.language === "eng");
  if (mainEng?.name) return mainEng.name;
  const anyEng = commonNames.find((name) => name.language === "eng");
  if (anyEng?.name) return anyEng.name;
  return commonNames[0]?.name ?? "";
};

const buildScientificName = (taxon: IucnTaxon) => {
  if (taxon.scientific_name) return taxon.scientific_name;
  const parts = [taxon.genus_name, taxon.species_name, taxon.infra_name].filter(Boolean);
  return parts.join(" ");
};

const collectTaxa = (taxon?: IucnTaxon) => {
  if (!taxon) return [];
  const species = Array.isArray(taxon.species_taxa) ? taxon.species_taxa : [];
  const infra = Array.isArray(taxon.infrarank_taxa) ? taxon.infrarank_taxa : [];
  const subpop = Array.isArray(taxon.subpopulation_taxa) ? taxon.subpopulation_taxa : [];
  return [taxon, ...species, ...infra, ...subpop];
};

export async function searchScientificName(req: Request, res: Response) {
  const rawQuery = typeof req.query.q === "string" ? req.query.q : "";
  const query = rawQuery.trim();

  if (query.length < MIN_QUERY_LENGTH) {
    return res.status(200).json({ count: 0, result: [] });
  }

  const parts = query.split(/\s+/).filter(Boolean);
  if (parts.length < 2) {
    return res.status(200).json({
      count: 0,
      result: [],
      hint: "Enter genus and species (e.g., Panthera tigris).",
    });
  }

  const [genusName, speciesName, ...rest] = parts;
  const infraName = rest.length ? rest.join(" ") : "";

  const token = process.env.IUCN_API_TOKEN?.trim();
  const baseUrl = (process.env.IUCN_API_BASE_URL || DEFAULT_IUCN_BASE_URL).trim().replace(/\/$/, "");
  if (!token) {
    return res.status(500).json({ error: "IUCN token not configured" });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const url = new URL(`${baseUrl}/taxa/scientific_name`);
    url.searchParams.set("genus_name", genusName);
    url.searchParams.set("species_name", speciesName);
    if (infraName) url.searchParams.set("infra_name", infraName);

    const response = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        "User-Agent": "File-Uploader/1.0",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const contentType = response.headers.get("content-type") || "";
    const rawBody = await response.text();
    let data: IucnScientificResponse = {};
    if (contentType.includes("application/json")) {
      try {
        data = JSON.parse(rawBody) as IucnScientificResponse;
      } catch {
        data = {};
      }
    }

    if (response.status === 404) {
      return res.status(200).json({ count: 0, result: [] });
    }

    if (!response.ok) {
      const fallbackMessage = `IUCN request failed (status ${response.status})`;
      const message = (data as { error?: string })?.error || fallbackMessage;
      console.error("IUCN request failed", {
        status: response.status,
        bodyPreview: rawBody.slice(0, 200),
      });
      return res.status(response.status).json({ error: message });
    }

    const taxa = collectTaxa(data.taxon);
    const suggestions: IucnSuggestion[] = taxa
      .map((taxon) => {
        const scientificName = buildScientificName(taxon);
        if (!scientificName) return null;
        return {
          scientific_name: scientificName,
          common_name: pickCommonName(taxon.common_names),
          class_name: taxon.class_name,
          order_name: taxon.order_name,
          family_name: taxon.family_name,
          genus_name: taxon.genus_name,
          species_name: taxon.species_name,
          sis_id: taxon.sis_id ?? null,
        };
      })
      .filter((item): item is IucnSuggestion => Boolean(item));

    const filtered = suggestions.filter((item) => {
      if (!item.class_name) return true;
      return ALLOWED_CLASSES.has(item.class_name.toUpperCase());
    });

    return res.json({ count: filtered.length, result: filtered });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return res.status(504).json({ error: "IUCN request timed out" });
    }
    return res.status(500).json({ error: "IUCN request failed" });
  } finally {
    clearTimeout(timeout);
  }
}
