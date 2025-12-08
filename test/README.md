# Active Video Grid (test)

Minimal React + Vite + TypeScript frontend to list active videos from your existing backend.

## How it works
- Fetches `/api/upload/metadata` from `VITE_API_URL` (defaults to `http://localhost:3000`).
- Filters items where `displayState` is not `"Inactive"`.
- Displays them in a responsive grid; shows highlight thumbnail when present, otherwise the video.

## Run
```bash
cd test
npm install
npm run dev
```

Environment vars (optional):
- `VITE_API_URL` (default `http://localhost:3000`)
- `VITE_AWS_BUCKET` (used to build `https://<bucket>.s3.amazonaws.com/<key>` URLs)
