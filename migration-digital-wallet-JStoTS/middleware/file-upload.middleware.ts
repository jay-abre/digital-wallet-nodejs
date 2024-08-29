import multer, { StorageEngine, FileFilterCallback } from 'multer';
import path from 'path';
import * as Minio from 'minio';
import config from '../config';
import fs from 'fs';

// Define upload directory
const uploadDir = path.join(__dirname, '..', 'uploads');

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Ensure all required config values are present
const MINIO_BUCKET_NAME = config.minioBucket || process.env.MINIO_BUCKET_NAME;
const MINIO_ENDPOINT = config.minioEndpoint || process.env.MINIO_ENDPOINT;
const MINIO_USE_SSL = config.minioUseSSL === 'true' || process.env.MINIO_USE_SSL === 'true';
const MINIO_ACCESS_KEY = config.minioAccessKey || process.env.MINIO_ACCESS_KEY;
const MINIO_SECRET_KEY = config.minioSecretKey || process.env.MINIO_SECRET_KEY;

if (!MINIO_BUCKET_NAME) {
  throw new Error('MINIO_BUCKET_NAME environment variable is not set');
}

if (!MINIO_ENDPOINT) {
  throw new Error('MINIO_ENDPOINT environment variable is not set');
}

if (!MINIO_ACCESS_KEY) {
  throw new Error('MINIO_ACCESS_KEY environment variable is not set');
}

if (!MINIO_SECRET_KEY) {
  throw new Error('MINIO_SECRET_KEY environment variable is not set');
}

// Configure MinIO client
const minioClient = new Minio.Client({
  endPoint: MINIO_ENDPOINT,
  useSSL: MINIO_USE_SSL,
  accessKey: MINIO_ACCESS_KEY,
  secretKey: MINIO_SECRET_KEY,
});

// Ensure bucket exists
(async () => {
  try {
    const bucketExists = await minioClient.bucketExists(MINIO_BUCKET_NAME);
    if (!bucketExists) {
      await minioClient.makeBucket(MINIO_BUCKET_NAME);
    }
  } catch (error) {
    console.error(error);
  }
})();

// Configure storage
const storage: StorageEngine = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});

// Configure Multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB file size limit
  },
  fileFilter: (req, file, cb: FileFilterCallback) => {
    if (file.mimetype === 'application/pdf' || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF and images are allowed.') as any, false);
    }
  }
});

export default upload;
