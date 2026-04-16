import dotenv from "dotenv";

dotenv.config();

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 5000),
  mongoUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/finance_mgmt",
  mongoMaxPoolSize: process.env.MONGO_MAX_POOL_SIZE ? Number(process.env.MONGO_MAX_POOL_SIZE) : undefined,
  mongoMinPoolSize: process.env.MONGO_MIN_POOL_SIZE ? Number(process.env.MONGO_MIN_POOL_SIZE) : undefined,
  mongoMaxIdleTimeMS: process.env.MONGO_MAX_IDLE_TIME_MS ? Number(process.env.MONGO_MAX_IDLE_TIME_MS) : undefined,
  mongoServerSelectionTimeoutMS: process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS
    ? Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS)
    : undefined,
  mongoConnectTimeoutMS: process.env.MONGO_CONNECT_TIMEOUT_MS ? Number(process.env.MONGO_CONNECT_TIMEOUT_MS) : undefined,
  mongoSocketTimeoutMS: process.env.MONGO_SOCKET_TIMEOUT_MS ? Number(process.env.MONGO_SOCKET_TIMEOUT_MS) : undefined,
  jwtSecret: process.env.JWT_SECRET || "changeme",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1d",
  fileStorage: process.env.FILE_STORAGE || "local",
  localUploadDir: process.env.LOCAL_UPLOAD_DIR || "uploads/private",
  awsRegion: process.env.AWS_REGION,
  awsS3Bucket: process.env.AWS_S3_BUCKET,
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
};
