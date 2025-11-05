import AWS from "aws-sdk";
import dotenv from "dotenv";

dotenv.config();

AWS.config.update({
  region: process.env.AWS_REGION || "us-east-1",
});

export const s3 = new AWS.S3({
  apiVersion: "2006-03-01",
});
