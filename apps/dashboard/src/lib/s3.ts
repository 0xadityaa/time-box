import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

let s3Client: S3Client | null = null;
export function getS3Client() {
  if (s3Client) return s3Client;
  
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.MINIO_ENDPOINT || !process.env.MINIO_ACCESS_KEY || !process.env.MINIO_SECRET_KEY) {
      throw new Error('MINIO_* environment variables are required in production.');
    }
  }
  
  s3Client = new S3Client({
    region: 'us-east-1',
    endpoint: process.env.MINIO_ENDPOINT || 'http://localhost:9000',
    credentials: {
      accessKeyId: process.env.MINIO_ACCESS_KEY || 'minioadmin',
      secretAccessKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
    },
    forcePathStyle: true,
  });
  return s3Client;
}

export async function fetchPayloadFromS3(uri: string): Promise<string | null> {
  if (!uri.startsWith('minio://')) return null;
  const path = uri.replace('minio://', '');
  const [bucket, ...rest] = path.split('/');
  const key = rest.join('/');
  
  if (bucket !== 'traces') {
    console.error('Unauthorized bucket access attempt:', bucket);
    return null;
  }
  
  const client = getS3Client();
  try {
    const response = await client.send(new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    }));
    if (!response.Body) return null;
    return await response.Body.transformToString();
  } catch (error) {
    console.error('Failed to fetch from S3:', error);
    return null;
  }
}
