import multer from 'multer';
import * as path from 'path';
import * as Minio from 'minio';
import config from '../config.js';
import * as fs from 'fs';

// Define upload directory
const uploadDir = path.join(__dirname, '..', 'uploads');

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const MINIO_BUCKET_NAME = config.minioBucket || process.env.MINIO_BUCKET_NAME;

if (!MINIO_BUCKET_NAME) {
  throw new Error('MINIO_BUCKET_NAME environment variable is not set');
}

// Configure MinIO client
const minioClient = new Minio.Client({
  endPoint: config.minioEndpoint || process.env.MINIO_ENDPOINT || 'defaultEndpoint',
  useSSL: config.minioUseSSL === true || process.env.MINIO_USE_SSL === 'true',
  accessKey: config.minioAccessKey || process.env.MINIO_ACCESS_KEY || 'defaultAccessKey',
  secretKey: config.minioSecretKey || process.env.MINIO_SECRET_KEY || 'defaultSecretKey',
});

// Ensure bucket exists
(async () => {
  const bucketExists = await minioClient.bucketExists(MINIO_BUCKET_NAME);
  if (!bucketExists) {
    await minioClient.makeBucket(MINIO_BUCKET_NAME);
  }
})().catch(console.error);

// Configure storage
const storage = multer.diskStorage({
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
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF and images are allowed.') as unknown as null, false);
    }
  }
});

export default upload;