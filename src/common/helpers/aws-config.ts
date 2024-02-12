import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const region = process.env.REGION;

export function getS3Client() {
  return new S3Client({
    credentials: { accessKeyId, secretAccessKey },
    region: region,
  });
}

export async function generateS3SignedUrl(
  s3Client: S3Client,
  putObjectCommand: PutObjectCommand | GetObjectCommand,
): Promise<string> {
  const expirationTime = 5 * 60; // 5 minutes
  return await getSignedUrl(s3Client, putObjectCommand, {
    expiresIn: expirationTime,
  });
}
