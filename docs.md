### iNaturalist + IUCN flow
We use iNaturalist only for the prefix-search dropdown (birds + mammals). When a user picks a suggestion, we switch to IUCN and look up that scientific name. If IUCN returns a single exact match, we auto-select it; otherwise the user chooses from the IUCN list. IUCN selections are marked as verified and saved with `species_source = "iucn"`.

For domesticated animals, type "domesticated" in the species field to reveal a curated list (cat, dog, cattle, poultry, etc.). Selecting from that list saves the scientific name plus `domesticated_common_name`, and sets `species_source = "domesticated"`. These are treated as valid for Done even though they are not in IUCN.

### Metadata autofill flow
When new videos appear, we try to auto-fill missing metadata (plot, sensor, deployment, experience). The app extracts the camera ID from the file name, looks that up in the camera metadata DynamoDB table, then writes those values into the main metadata table for the video. If a video already has those fields filled, we skip it. This happens client-side via `/api/upload/camera-metadata/:cameraId` and `/api/upload/metadata/update`, then we update the UI locally so the table reflects the autofill.

### Highlight trim + save flow
The highlight editor trims a clip in the browser using MediaRecorder, then uploads the trimmed video and a chosen thumbnail to S3 via presigned URLs. After upload, we call `/api/upload/highlight` to save the highlight IDs and trim times. The backend updates the main metadata record (and optionally a separate highlights table), sets `highlight = true`, `displayState = Action`, and stores `trimStartSec`, `trimEndSec`, `highlightFileId`, and `highlightThumbnailId`. If you replace a highlight, old highlight assets are cleaned up in S3. Deleting or reverting a highlight calls `/api/upload/highlight/delete`, removes the highlight assets, and resets those fields on the base item.

### Upload + presigned URL flow
Uploads happen with presigned URLs. The frontend requests `/api/upload/presign` with a filename, content type, and type (video/thumbnail/highlight). The backend picks the right bucket + prefix, returns a short-lived upload URL, and the client PUTs the file directly to S3. Once the upload finishes, the app saves metadata via `/api/upload/metadata` or updates it via `/api/upload/metadata/update`.

### Stage, displayState, and highlight rules
Stages drive what actions are allowed: Draft -> ID -> Done -> Display. To move into Done, all required fields must be filled and ID State must be Confirmed. Display is used for highlighted items; saving a highlight sets `stage = display` and `displayState = Action`. Reverting/deleting highlights moves items back to Done (or ID when explicitly requested) and clears highlight fields.

### Highlight availability check
The gallery periodically checks whether highlight assets still exist in S3. It calls `/api/upload/highlight/exists` with the fileId or highlightFileId, and the backend verifies the object in the highlight bucket. This allows the UI to show whether a highlight is actually available even if the metadata still points to it.
