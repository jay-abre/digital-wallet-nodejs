import dotenv from 'dotenv';
dotenv.config();

interface Config {
    port: number;
    mongoURI: string;
    jwtSecret: string;
    stripeSecretKey: string;
    minioEndpoint: string;
    minioPort: number;
    minioUseSSL: boolean;
    minioAccessKey: string;
    minioSecretKey: string;
    minioBucket: string;
    emailHost: string;
    emailPort: number;
    emailUsername: string;
    emailPassword: string;
    appUrl: string;
}

const config: Config = {
    port: parseInt(process.env.PORT || '3000', 10),
    mongoURI: process.env.MONGO_URI || '',
    jwtSecret: process.env.JWT_SECRET || '',
    stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
    minioEndpoint: process.env.MINIO_ENDPOINT || '',
    minioPort: parseInt(process.env.MINIO_PORT || '0', 10),
    minioUseSSL: process.env.MINIO_USE_SSL === 'true',
    minioAccessKey: process.env.MINIO_ACCESS_KEY || '',
    minioSecretKey: process.env.MINIO_SECRET_KEY || '',
    minioBucket: process.env.MINIO_BUCKET_NAME || '',
    emailHost: process.env.EMAIL_HOST || '',
    emailPort: parseInt(process.env.EMAIL_PORT || '0', 10),
    emailUsername: process.env.EMAIL_USERNAME || '',
    emailPassword: process.env.EMAIL_PASSWORD || '',
    appUrl: process.env.APP_URL || 'http://localhost:3000',
};

export default config;