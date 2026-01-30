import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const REGION = process.env.AWS_REGION || "us-east-1";
const TABLE_NAME = process.env.DYNAMO_TABLE;
const CAMERA_TABLE = process.env.CAMERA_METADATA_TABLE;
const UPLOADS_PREFIX = process.env.UPLOADS_PREFIX || "uploads/";
const ALLOWED_EXT = [".mp4", ".mov"];

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

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

const hasAllowedExtension = (key: string) => {
  const lower = key.toLowerCase();
  return ALLOWED_EXT.some((ext) => lower.endsWith(ext));
};

const getBaseFilename = (key: string) => key.split("/").pop() ?? key;

async function fetchCameraMetadata(cameraId: string) {
  if (!CAMERA_TABLE) return null;
  const result = await ddb.send(
    new GetCommand({
      TableName: CAMERA_TABLE,
      Key: { cameraId },
    })
  );
  return (result.Item as Record<string, unknown> | undefined) ?? null;
}

export const handler = async (event: { Records?: Array<Record<string, any>> }) => {
  if (!TABLE_NAME) {
    console.error("Missing DYNAMO_TABLE env var.");
    return;
  }

  const records = event?.Records ?? [];
  for (const record of records) {
    const key = record?.s3?.object?.key ? decodeURIComponent(record.s3.object.key.replace(/\+/g, " ")) : "";
    if (!key) continue;
    if (!key.startsWith(UPLOADS_PREFIX)) continue;
    if (!hasAllowedExtension(key)) continue;

    const existing = await ddb.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { fileId: key },
      })
    );
    if (existing.Item) {
      const current = existing.Item as Record<string, unknown>;
      const needsAutofill =
        !current.plot || !current.sensorId || !current.deploymentId || !current.experiencePoint;
      if (!needsAutofill) continue;

      const filename = getBaseFilename(key);
      const cameraId = extractCameraId(filename);
      if (!cameraId) continue;
      const cameraMeta = await fetchCameraMetadata(cameraId);
      if (!cameraMeta) continue;
      const meta = cameraMeta as Record<string, unknown>;

      const updates: Record<string, unknown> = {};
      if (!current.plot && meta.plot) updates.plot = meta.plot;
      if (!current.sensorId && meta.sensorId) updates.sensorId = meta.sensorId;
      if (!current.deploymentId && meta.deploymentId) updates.deploymentId = meta.deploymentId;
      if (!current.experiencePoint && meta.experiencePoint) updates.experiencePoint = meta.experiencePoint;
      if (Object.keys(updates).length === 0) continue;
      updates.updatedAt = new Date().toISOString();

      const expressionParts: string[] = [];
      const names: Record<string, string> = {};
      const values: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(updates)) {
        expressionParts.push(`#${k} = :${k}`);
        names[`#${k}`] = k;
        values[`:${k}`] = v;
      }

      await ddb.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { fileId: key },
          UpdateExpression: `SET ${expressionParts.join(", ")}`,
          ExpressionAttributeNames: names,
          ExpressionAttributeValues: values,
        })
      );
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
      }
    }

    await ddb.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: item,
      })
    );
  }
};
