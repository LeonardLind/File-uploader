"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const REGION = process.env.AWS_REGION || "us-east-1";
const TABLE_NAME = process.env.DYNAMO_TABLE;
const CAMERA_TABLE = process.env.CAMERA_METADATA_TABLE;
const UPLOADS_PREFIX = process.env.UPLOADS_PREFIX || "uploads/";
const ALLOWED_EXT = [".mp4", ".mov"];
const ddb = lib_dynamodb_1.DynamoDBDocumentClient.from(new client_dynamodb_1.DynamoDBClient({ region: REGION }));
const extractCameraId = (key) => {
    if (!key)
        return null;
    const base = key.split("/").pop() ?? key;
    const underscoreIndex = base.lastIndexOf("_");
    if (underscoreIndex === -1)
        return null;
    const tail = base.slice(underscoreIndex + 1);
    const withoutExt = tail.replace(/\.[^.]+$/, "");
    const trimmed = withoutExt.trim();
    return trimmed ? trimmed : null;
};
const hasAllowedExtension = (key) => {
    const lower = key.toLowerCase();
    return ALLOWED_EXT.some((ext) => lower.endsWith(ext));
};
const getBaseFilename = (key) => key.split("/").pop() ?? key;
async function fetchCameraMetadata(cameraId) {
    if (!CAMERA_TABLE)
        return null;
    const result = await ddb.send(new lib_dynamodb_1.GetCommand({
        TableName: CAMERA_TABLE,
        Key: { cameraId },
    }));
    return result.Item ?? null;
}
const handler = async (event) => {
    if (!TABLE_NAME) {
        console.error("Missing DYNAMO_TABLE env var.");
        return;
    }
    const records = event?.Records ?? [];
    for (const record of records) {
        const key = record?.s3?.object?.key ? decodeURIComponent(record.s3.object.key.replace(/\+/g, " ")) : "";
        if (!key)
            continue;
        if (!key.startsWith(UPLOADS_PREFIX))
            continue;
        if (!hasAllowedExtension(key))
            continue;
        const existing = await ddb.send(new lib_dynamodb_1.GetCommand({
            TableName: TABLE_NAME,
            Key: { fileId: key },
        }));
        if (existing.Item) {
            const current = existing.Item;
            const needsAutofill = !current.plot || !current.sensorId || !current.deploymentId || !current.experiencePoint;
            if (!needsAutofill)
                continue;
            const filename = getBaseFilename(key);
            const cameraId = extractCameraId(filename);
            if (!cameraId)
                continue;
            const cameraMeta = await fetchCameraMetadata(cameraId);
            if (!cameraMeta)
                continue;
            const meta = cameraMeta;
            const updates = {};
            if (!current.plot && meta.plot)
                updates.plot = meta.plot;
            if (!current.sensorId && meta.sensorId)
                updates.sensorId = meta.sensorId;
            if (!current.deploymentId && meta.deploymentId)
                updates.deploymentId = meta.deploymentId;
            if (!current.experiencePoint && meta.experiencePoint)
                updates.experiencePoint = meta.experiencePoint;
            if (Object.keys(updates).length === 0)
                continue;
            updates.updatedAt = new Date().toISOString();
            const expressionParts = [];
            const names = {};
            const values = {};
            for (const [k, v] of Object.entries(updates)) {
                expressionParts.push(`#${k} = :${k}`);
                names[`#${k}`] = k;
                values[`:${k}`] = v;
            }
            await ddb.send(new lib_dynamodb_1.UpdateCommand({
                TableName: TABLE_NAME,
                Key: { fileId: key },
                UpdateExpression: `SET ${expressionParts.join(", ")}`,
                ExpressionAttributeNames: names,
                ExpressionAttributeValues: values,
            }));
            continue;
        }
        const filename = getBaseFilename(key);
        const cameraId = extractCameraId(filename);
        const now = new Date().toISOString();
        const item = {
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
                const { plot, sensorId, deploymentId, experiencePoint } = cameraMeta;
                if (plot)
                    item.plot = plot;
                if (sensorId)
                    item.sensorId = sensorId;
                if (deploymentId)
                    item.deploymentId = deploymentId;
                if (experiencePoint)
                    item.experiencePoint = experiencePoint;
            }
        }
        await ddb.send(new lib_dynamodb_1.PutCommand({
            TableName: TABLE_NAME,
            Item: item,
        }));
    }
};
exports.handler = handler;
