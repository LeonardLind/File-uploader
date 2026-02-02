# File: frontend/src/hooks/useMetadata.ts

- [ ] Read and understand this file

What it is:
- A hook that downloads the file list from the server.

What it does (easy words):
- Calls the API to get all files and their metadata.
- Cleans the stage value so it matches the app's steps.
- Gives you `files`, `loading`, and `error` to use in the UI.

Stage in this app means:
- draft = just uploaded, not filled in yet
- id = filled in but not confirmed
- done = confirmed
- display = highlighted/featured

Why ?normalize stage? exists:
- It's a safety net for old or bad data.
- Example: if a file has `stage: "donee"` (typo), we treat it as `draft` so the UI doesn't break.

Practical example:
- You open the gallery page.
- This hook fetches `/api/upload/metadata`.
- One item comes back with `stage: "action"` from an old system.
- `normalizeStage()` turns that into `display` (or falls back to `draft` if it's unknown).
- Now the page can show the item in the right tab without errors.
