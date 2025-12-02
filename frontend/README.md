# Desktop uploader blueprint

The desktop ingestion/uploader design is documented in `../docs/desktop-uploader-architecture.md`. Use that as the blueprint for building the new Tauri + React desktop client that replaces heavy browser uploads.

Key assets added for implementation:
- `src/types/ingestion.ts`: strongly typed metadata models (register seeds, location lookup, config).
- `src/data/projectConfig.sample.json`: example project knowledge config (folder pattern, allowed values, lookup rule, upload settings).

Suggested next steps:
1) Duplicate `src/data/projectConfig.sample.json` to a real config file for your project and adjust pattern/allowed values.
2) Wire the ingestion types into state/services as you implement scanning, validation, and upload flows described in the doc.
3) Align backend endpoints for location lookup, resumable upload/presign, and register-seed POST with idempotency.
