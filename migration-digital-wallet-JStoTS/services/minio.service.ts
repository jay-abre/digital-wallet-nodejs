import Minio from 'minio';

const minioClient = new Minio.Client({
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000', 10),
    useSSL: false,
    accessKey: process.env.MINIO_ACCESS_KEY || 'user',
    secretKey: process.env.MINIO_SECRET_KEY || 'password',
});

async function uploadFile(bucketName: string, fileName: string, filePath: string) {
    try {
        await minioClient.fPutObject(bucketName, fileName, filePath, {});
        console.log('File uploaded successfully');
    } catch (err) {
        console.error('Error uploading file:', err);
    }
}
