import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import dotenv from "dotenv";

dotenv.config({ quiet: true });

const REGION = process.env.AWS_REGION || "us-east-1";
const BUCKET = process.env.AWS_BUCKET;
const TABLE_NAME = process.env.DYNAMO_TABLE;
const CAMERA_TABLE = process.env.CAMERA_METADATA_TABLE;
const PREFIX = "uploads/";
const DRY_RUN = process.env.DRY_RUN === "1";

if (!BUCKET || !TABLE_NAME || !CAMERA_TABLE) {
  console.error("Missing required env vars: AWS_BUCKET, DYNAMO_TABLE, CAMERA_METADATA_TABLE");
  process.exit(1);
}

const s3 = new S3Client({ region: REGION });
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

const ALLOWED_EXT = new Set([".mp4", ".mov"]);

const extractCameraId = (key?: string): string | null => {
  if (!key) return null;
  const base = key.split("/").pop() ?? key;
  const underscoreIndex = base.lastIndexOf("_");
  if (underscoreIndex === -1) return null;
  const tail = base.slice(underscoreIndex + 1);
  const withoutExt = tail.replace(/\.[^.]+$/, "");
  const trimmed = withoutExt.trim();
  return trimmed ? trimmed : null;
};

const getBaseFilename = (key: string) => key.split("/").pop() ?? key;

const hasAllowedExtension = (key: string) => {
  const lower = key.toLowerCase();
  for (const ext of ALLOWED_EXT) {
    if (lower.endsWith(ext)) return true;
  }
  return false;
};

const fetchCameraMetadata = async (cameraId: string) => {
  const result = await ddb.send(
    new GetCommand({
      TableName: CAMERA_TABLE,
      Key: { cameraId },
    })
  );
  return (result.Item as Record<string, unknown> | undefined) ?? null;
};

async function run() {
  let continuationToken: string | undefined;
  let scanned = 0;
  let created = 0;
  let skipped = 0;
  let autofilled = 0;

  do {
    const page = await s3.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: PREFIX,
        ContinuationToken: continuationToken,
      })
    );

    const contents = page.Contents ?? [];
    for (const obj of contents) {
      if (!obj.Key) continue;
      const key = obj.Key;
      scanned += 1;

      if (!key.startsWith(PREFIX)) {
        skipped += 1;
        continue;
      }
      if (!hasAllowedExtension(key)) {
        skipped += 1;
        continue;
      }

      const existing = await ddb.send(
        new GetCommand({
          TableName: TABLE_NAME,
          Key: { fileId: key },
        })
      );
      if (existing.Item) {
        skipped += 1;
        continue;
      }

      const filename = getBaseFilename(key);
      const cameraId = extractCameraId(filename);
      const now = new Date().toISOString();

      const item: Record<string, unknown> = {
        fileId: key,
        filename,
        stage: "draft",
        id_state: "Unknown",
        highlight: false,
        displayState: "Inactive",
        updatedAt: now,
      };

      if (cameraId) {
        const cameraMeta = await fetchCameraMetadata(cameraId);
        if (cameraMeta) {
          const { plot, sensorId, deploymentId, experiencePoint } = cameraMeta as Record<string, unknown>;
          if (plot) item.plot = plot;
          if (sensorId) item.sensorId = sensorId;
          if (deploymentId) item.deploymentId = deploymentId;
          if (experiencePoint) item.experiencePoint = experiencePoint;
          autofilled += 1;
        }
      }

      if (!DRY_RUN) {
        await ddb.send(
          new PutCommand({
            TableName: TABLE_NAME,
            Item: item,
          })
        );
      }
      created += 1;
    }

    continuationToken = page.NextContinuationToken;
  } while (continuationToken);

  console.log(
    JSON.stringify(
      {
        bucket: BUCKET,
        prefix: PREFIX,
        scanned,
        created,
        skipped,
        autofilled,
        dryRun: DRY_RUN,
      },
      null,
      2
    )
  );
}

run().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
