import { S3Client } from '@aws-sdk/client-s3';

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || '';
const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || '';
const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || '';

export const isR2Configured = Boolean(
  accountId &&
  accessKeyId &&
  secretAccessKey
);

export const r2Client = isR2Configured
  ? new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    })
  : null;

export const R2_BUCKET = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'livespbu-photos';
export const R2_PUBLIC_URL = (process.env.CLOUDFLARE_R2_PUBLIC_URL || 'https://pub-8b4995e4147f470ba5e2de6d97e31544.r2.dev').replace(/\/$/, '');
