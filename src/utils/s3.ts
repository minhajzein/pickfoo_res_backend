import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

let _s3Client: S3Client | null = null;

export const getS3Client = () => {
  if (!_s3Client) {
    if (!process.env.AWS_REGION || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      console.warn('S3 Client initialization delayed: Missing environment variables');
    }
    _s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });
  }
  return _s3Client;
};

export const deleteFileFromS3 = async (fileUrl: string) => {
  try {
    if (!fileUrl) return;

    const u = new URL(fileUrl);
    const key = u.pathname.replace(/^\/+/, '').split('?')[0];
    if (!key) {
      console.warn(`Invalid file URL: ${fileUrl}`);
      return;
    }

    const client = getS3Client();
    const command = new DeleteObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: key,
    });

    await client.send(command);
  } catch (error) {
    console.error('S3 Delete Error:', error);
  }
};

/**
 * Generate a presigned URL for reading an object
 */
export const getPresignedUrl = async (fileUrl: string) => {
  try {
    if (!fileUrl) return '';
    
    if (fileUrl.includes('X-Amz-Signature')) return fileUrl;

    // Support:
    // - https://bucket.s3.region.amazonaws.com/<key>
    // - https://<cdn-domain>/<key>   (when S3_PUBLIC_BASE_URL/CLOUDFRONT_URL is used)
    const u = new URL(fileUrl);
    const key = u.pathname.replace(/^\/+/, '').split('?')[0];
    if (!key) return fileUrl;

    const client = getS3Client();
    
    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: key,
    });

    return await getSignedUrl(client, command, { 
      expiresIn: Number(process.env.S3_PRESIGNED_URL_EXPIRY) || 3600 
    });
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    return fileUrl;
  }
};
