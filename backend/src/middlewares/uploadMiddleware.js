import multer from "multer";

const ALLOWED_TYPES = ["application/pdf", "image/png", "image/jpeg"];

const fileFilter = (_req, file, cb) => {
  if (!ALLOWED_TYPES.includes(file.mimetype)) {
    cb(new Error("Unsupported file type. Use PDF/PNG/JPEG."));
    return;
  }
  cb(null, true);
};

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter
});
