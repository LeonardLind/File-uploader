S3 uploads -> DynamoDB autofill (Lambda)

This Lambda creates a metadata row whenever a new video is uploaded to `uploads/`,
and autofills plot/sensor/deployment/experience when a trailing `_SENSORID` is found.

Build + deploy (AWS Console)
1) Build the Lambda bundle locally:
   - `cd infra/lambda/s3-autofill`
   - `npm install`
   - `npm run build`
   - Zip the output:
     PowerShell:
     `Compress-Archive -Path dist/*,node_modules,package.json -DestinationPath s3-autofill.zip`

2) Create the Lambda in AWS Console:
   - Runtime: Node.js 20.x
   - Upload `s3-autofill.zip`
   - Handler: `dist/index.handler`

3) Set Lambda environment variables:
   - `AWS_REGION=us-east-1`
   - `DYNAMO_TABLE=gc-sideproj-files`
   - `CAMERA_METADATA_TABLE=leoCameraMetadataMap`
   - `UPLOADS_PREFIX=uploads/`

4) Attach IAM permissions to the Lambda role:
   - DynamoDB: `GetItem`, `PutItem` on both tables

5) Add S3 event notifications (bucket: `filemanagerleo`):
   - Prefix: `uploads/`
   - Suffix: `.mp4`
   - Event: ObjectCreated
   - Target: this Lambda
   - Repeat with suffix `.mov`

Notes
- If a filename does not contain a trailing `_SENSORID`, the record is created without autofill.
- Highlights are ignored because only `uploads/` is watched.
