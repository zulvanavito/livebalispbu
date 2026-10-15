import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

const accountId = '6b4dfd000e18eef43405b0f08eec0eff';
const accessKeyId = '5d8dd1d49c2055a42978cfd24c764d2e';
const secretAccessKey = '3867434a50d5a0c4e38a8504df0149bd469cc84252a7b69c114e5e8b5d924c19';
const bucket = 'livespbu-photos';

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

async function main() {
  try {
    const res = await client.send(new ListObjectsV2Command({ Bucket: bucket }));
    console.log('Total objects in R2:', res.KeyCount);
    if (res.Contents) {
      for (const obj of res.Contents) {
        console.log(`- Key: ${obj.Key}, Size: ${obj.Size} bytes, LastModified: ${obj.LastModified}`);
      }
    }
  } catch (err) {
    console.error('Error listing R2:', err);
  }
}

main();
