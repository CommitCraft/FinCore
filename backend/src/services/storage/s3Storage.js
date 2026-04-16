import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";
import { env } from "../../config/env.js";

const s3Client = new S3Client({
  region: env.awsRegion,
  credentials: {
    accessKeyId: env.awsAccessKeyId,
    secretAccessKey: env.awsSecretAccessKey
  }
});

export const s3StorageService = {
  provider: "s3",
  async saveFile(fileBuffer, originalName, mimeType) {
    const key = `receipts/${Date.now()}-${uuidv4()}-${originalName.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: env.awsS3Bucket,
        Key: key,
        Body: fileBuffer,
        ContentType: mimeType,
        ServerSideEncryption: "AES256"
      })
    );

    return {
      provider: "s3",
      key,
      originalName,
      mimeType,
      size: fileBuffer.length
    };
  }
};
