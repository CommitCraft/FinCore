import { env } from "../../config/env.js";
import { localStorageService } from "./localStorage.js";
import { s3StorageService } from "./s3Storage.js";

export const storageService = env.fileStorage === "s3" ? s3StorageService : localStorageService;
