import dotenv from 'dotenv';

dotenv.config();

interface Config {
  port: number;
  mongoURI: string | undefined;
  jwtSecret: string | undefined;
  stripeSecretKey: string | undefined;
  minioEndpoint: string | undefined;
  minioPort: number | undefined;
  minioUseSSL: string | undefined;
  minioAccessKey: string | undefined;
  minioSecretKey: string | undefined;
  minioBucket: string | undefined;
  emailHost: string | undefined;
  emailPort: number | undefined;
  emailUsername: string | undefined;
  emailPassword: string | undefined;
  appUrl: string;
}

const config: Config = {
  port: parseInt(process.env.PORT || '3001', 10),
  mongoURI: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET || 'default_secret_key',
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  minioEndpoint: process.env.MINIO_ENDPOINT,
  minioPort: parseInt(process.env.MINIO_PORT || '9000', 10),
  minioUseSSL: process.env.MINIO_USE_SSL,
  minioAccessKey: process.env.MINIO_ACCESS_KEY,
  minioSecretKey: process.env.MINIO_SECRET_KEY,
  minioBucket: process.env.MINIO_BUCKET_NAME,
  emailHost: process.env.EMAIL_HOST,
  emailPort: parseInt(process.env.EMAIL_PORT || '1025', 10),
  emailUsername: process.env.EMAIL_USERNAME,
  emailPassword: process.env.EMAIL_PASSWORD,
  appUrl: process.env.APP_URL || 'http://localhost:3001',
};

export default config;
