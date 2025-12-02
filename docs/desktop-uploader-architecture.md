# Desktop Ingestion / Uploader Architecture

This document captures the proposed desktop uploader that replaces heavy browser uploads and produces clean scientific register seeds. It implements Appendix C (cloud ingestion) and seeds downstream workflows (species ID, highlight curation, scientist validation) with consistent metadata.

## Stack & Process
- **Stack:** Tauri + React + TypeScript. Rust side handles filesystem, hashing, resumable uploads, and a small SQLite cache; React owns UX.
- **Process:** Select folders → parse naming defaults → assemble metadata → validate/fix → upload files → register metadata seeds → summary/exception export. File upload and metadata registration are separable/retriable.

## Core Modules
- **ProjectKnowledge (config JSON):** Folder pattern, allowed values/aliases, media extensions, location lookup rule, upload concurrency/retries/chunk size.
- **Scanner/Parser:** Walk selected roots, filter by extensions, parse folder names into defaults (client/forest/plot/date/xp), collect files, preview parsed rows and pattern errors.
- **MetadataAssembler:** Per-file enrichment (camera name hints, location lookup with geo, id_state/display_state defaults, stable register_seed_id, checksum/duration).
- **Validator:** Schema + business rules; emits per-row errors and marks exceptions that must be fixed or exported.
- **UploadEngine:** Queue with stages `file_upload` → `metadata_post`, resumable uploads, retries/backoff, persistent state for resume, per-file status and retry UI.
- **Persistence:** SQLite via Tauri for scans, validation state, upload sessions/tokens, config cache.
- **API Layer:** Typed clients for location lookup, upload session/presign, register seed POST, idempotency keys.
- **UI:** Screens for folder selection/preview, validation + batch edit, upload progress, summary + exportable exceptions.

## Metadata Model (TypeScript)
```ts
export type IdState = "Unknown" | "Genus" | "AI ID" | "Guess" | "Confirmed";
export type DisplayState = "Register" | "Showcase" | "Dashboard";

export interface GeoPoint { lat: number; lng: number; }

export interface LocationInfo {
  location_id: string;
  forest: string;
  plot: string;
  camera_name: string;
  geo: GeoPoint;
}

export interface HighlightTag {
  list?: string;                 // e.g., "Highlight", "TheAction"
  tier?: "Highlight" | "TheAction";
  notes?: string;
}

export interface TaxonomyInfo {
  taxon_id?: string;
  taxon_name?: string;           // scientific name
  common_name?: string;
  iucn_status?: string;
  expert_name?: string;
}

export interface RegisterSeed {
  register_seed_id: string;      // stable UUID per file
  client: string;
  forest: string;
  plot: string;
  date: string;                  // ISO date YYYY-MM-DD
  xp?: string;
  camera_name: string;
  location: LocationInfo;
  file_name: string;
  file_size: number;
  file_checksum: string;         // sha256 for idempotency
  media_type: "image" | "video";
  duration_sec?: number;
  captured_at?: string;          // EXIF datetime when available
  id_state: IdState;             // init "Unknown"
  display_state: DisplayState;   // init "Register"
  highlight?: HighlightTag;
  taxonomy?: TaxonomyInfo;
  backend_file_key?: string;     // set after upload
  source_path: string;           // local path for resume/retry
  errors?: string[];             // validation errors (desktop only)
}
```

## Project Knowledge Config (JSON example)
```json
{
  "folderPattern": "<client>_<forest>_<plot>_<date>[_<xp>]",
  "folderRegex": "^(?<client>[A-Za-z0-9-]+)_(?<forest>[A-Za-z0-9-]+)_(?<plot>[A-Za-z0-9-]+)_(?<date>\\d{4}-?\\d{2}-?\\d{2})(?:_(?<xp>[A-Za-z0-9-]+))?$",
  "dateFormat": "YYYYMMDD",
  "mediaExtensions": [".jpg", ".jpeg", ".mp4", ".mov", ".avi"],
  "cameraNamePattern": "CAM(?<camera>[0-9]{2})",
  "allowed": {
    "client": ["ACME"],
    "forest": ["Amazonia", "Cerrado"],
    "plot": ["P01", "P02"],
    "xp": ["XP1", "XP2"]
  },
  "aliases": {
    "forest": { "AMZ": "Amazonia" },
    "xp": { "X1": "XP1" }
  },
  "locationLookupRule": ["client", "forest", "plot", "camera_name", "xp"],
  "upload": {
    "concurrency": 3,
    "maxRetries": 5,
    "backoffMs": [500, 1000, 2000, 4000],
    "chunkSizeMb": 8
  }
}
```

## Parsing & Assembly
- Parse selected folders with the configured regex to derive client/forest/plot/date/xp defaults; flag pattern errors immediately.
- Enumerate media files by extension; infer camera_name from filename when possible; attach parsed defaults to each file row.
- Resolve `location_id` + `geo` via lookup API using configured fields; if zero/multiple matches, mark row with a resolvable error and allow human selection.
- Initialize `id_state = "Unknown"`, `display_state = "Register"`, generate `register_seed_id` (UUID), checksum, size, duration (if video).

## Validation Rules
- Required: client, forest, plot, valid date, camera_name, location_id, geo, media_type, checksum.
- XP: optional but must be in allowed set if present.
- Pattern errors: folder/file not parseable, date mismatch.
- Location resolution: none or many matches → error; user can pick or map manually.
- Missing required fields keep row in “invalid”; unresolved rows can be exported as exceptions.

## Upload Queue & Reliability
- Queue items carry the seed and current stage; workers process with configurable concurrency.
- **file_upload:** resumable upload (presigned or tus-like). Store session/resume token in SQLite; verify checksum.
- **metadata_post:** POST register seed with `backend_file_key` and idempotency key = `register_seed_id` or checksum.
- Retries: exponential backoff with jitter per stage; limit attempts; allow manual retry.
- Persistence: all scan/validation/upload state stored locally so the app resumes after crash/restart without re-uploading completed files.

## API Contracts (examples)
- **Location lookup**
```ts
interface LocationLookupRequest {
  client: string;
  forest: string;
  plot: string;
  camera_name: string;
  xp?: string;
}

interface LocationLookupResult {
  matches: Array<{
    location_id: string;
    geo: GeoPoint;
    confidence: number;
    forest: string;
    plot: string;
    camera_name: string;
  }>;
}
```

- **Register seed (after upload)**
```ts
interface RegisterSeedRequest {
  register_seed_id: string;
  backend_file_key: string;   // cloud storage key/path
  metadata: RegisterSeed;     // includes id_state/display_state/taxonomy/highlight placeholders
}

interface RegisterSeedResponse {
  register_seed_id: string;
  status: "accepted" | "duplicate" | "failed";
  message?: string;
}
```

## UI Flow (desktop)
- **Folder selection + preview:** choose roots, show parsed defaults per folder, file counts, pattern errors.
- **Validation + batch fix:** table with editable camera_name/xp/plot/forest, location lookup modal for ambiguities, error badges, bulk apply, export exceptions (CSV/JSON).
- **Upload:** two-stage status (file upload, metadata post), per-row retry, pause/resume, overall counters and throughput.
- **Summary:** totals processed/failed/exceptions, reasons, link to exported exceptions for browser or backend review.

## Browser/App Integration
- Browser stops doing large uploads; instead shows ingestion results/exceptions pulled from backend.
- Backend endpoints needed: location lookup, upload session/presign, register seed POST, exception retrieval.
- Use `register_seed_id` and `id_state` to connect downstream species, highlight, and scientist validation flows; metadata already includes taxonomy/highlight/display_state placeholders for later updates.

## Next Steps
- Finalize project config (folder pattern, allowed values, lookup rules) and seed initial JSON.
- Align backend endpoints for upload/resume and register-seed idempotency.
- Scaffold Tauri app with modules above; wire mock services for end-to-end dry runs.
- Implement SQLite persistence and resumable upload; add validation UI and exception export.
