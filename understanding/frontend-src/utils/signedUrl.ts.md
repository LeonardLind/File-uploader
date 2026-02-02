# File: frontend/src/utils/signedUrl.ts

- [ ] Read and understand this file

What it is:
- Helper to request a signed URL from the backend.

What it does (easy words):
- Calls `/api/upload/signed-url` with a key.
- Returns a temporary URL to view the file.

Practical example:
- The gallery uses this to show video or thumbnail previews from S3.
