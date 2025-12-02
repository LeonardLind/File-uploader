// Strongly typed ingestion/metadata models for the desktop uploader.

export type IdState = "Unknown" | "Genus" | "AI ID" | "Guess" | "Confirmed";
export type DisplayState = "Register" | "Showcase" | "Dashboard";

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface LocationInfo {
  location_id: string;
  forest: string;
  plot: string;
  camera_name: string;
  geo: GeoPoint;
}

export interface HighlightTag {
  list?: string;
  tier?: "Highlight" | "TheAction";
  notes?: string;
}

export interface TaxonomyInfo {
  taxon_id?: string;
  taxon_name?: string;
  common_name?: string;
  iucn_status?: string;
  expert_name?: string;
}

export interface RegisterSeed {
  register_seed_id: string;
  client: string;
  forest: string;
  plot: string;
  date: string;
  xp?: string;
  camera_name: string;
  location: LocationInfo;
  file_name: string;
  file_size: number;
  file_checksum: string;
  media_type: "image" | "video";
  duration_sec?: number;
  captured_at?: string;
  id_state: IdState;
  display_state: DisplayState;
  highlight?: HighlightTag;
  taxonomy?: TaxonomyInfo;
  backend_file_key?: string;
  source_path: string;
  errors?: string[];
}

export interface LocationLookupRequest {
  client: string;
  forest: string;
  plot: string;
  camera_name: string;
  xp?: string;
}

export interface LocationLookupMatch {
  location_id: string;
  geo: GeoPoint;
  confidence: number;
  forest: string;
  plot: string;
  camera_name: string;
}

export interface LocationLookupResult {
  matches: LocationLookupMatch[];
}

export interface RegisterSeedRequest {
  register_seed_id: string;
  backend_file_key: string;
  metadata: RegisterSeed;
}

export interface RegisterSeedResponse {
  register_seed_id: string;
  status: "accepted" | "duplicate" | "failed";
  message?: string;
}

export interface ProjectConfig {
  folderPattern: string;
  folderRegex: string;
  dateFormat: string;
  mediaExtensions: string[];
  cameraNamePattern?: string;
  allowed: {
    client?: string[];
    forest?: string[];
    plot?: string[];
    xp?: string[];
  };
  aliases?: {
    client?: Record<string, string>;
    forest?: Record<string, string>;
    plot?: Record<string, string>;
    xp?: Record<string, string>;
  };
  locationLookupRule: Array<keyof LocationLookupRequest>;
  upload: {
    concurrency: number;
    maxRetries: number;
    backoffMs: number[];
    chunkSizeMb: number;
  };
}
