import { promises as fs } from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { env } from "../../config/env.js";

const ensureDir = async (dirPath) => {
  await fs.mkdir(dirPath, { recursive: true });
};

export const localStorageService = {
  provider: "local",
  async saveFile(fileBuffer, originalName, mimeType) {
    const safeName = `${Date.now()}-${uuidv4()}-${originalName.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
    const outputDir = path.resolve(process.cwd(), env.localUploadDir);
    await ensureDir(outputDir);
    const fullPath = path.join(outputDir, safeName);
    await fs.writeFile(fullPath, fileBuffer);

    return {
      provider: "local",
      key: safeName,
      originalName,
      mimeType,
      size: fileBuffer.length
    };
  }
};
