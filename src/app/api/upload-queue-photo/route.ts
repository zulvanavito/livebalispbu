import { NextRequest, NextResponse } from 'next/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { r2Client, R2_BUCKET, R2_PUBLIC_URL, isR2Configured } from '@/lib/r2-client';

interface DetectedImageType {
  mime: string;
  extension: 'jpg' | 'png' | 'webp';
}

/**
 * Validates the binary file signature (Magic Bytes) to ensure
 * only genuine raster images (JPEG, PNG, WebP) are accepted.
 * Prevents MIME spoofing and rejects non-image or executable files.
 */
function detectImageMagicBytes(buffer: Buffer): DetectedImageType | null {
  if (buffer.length < 12) return null;

  // 1. JPEG: Starts with FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mime: 'image/jpeg', extension: 'jpg' };
  }

  // 2. PNG: Starts with 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { mime: 'image/png', extension: 'png' };
  }

  // 3. WebP: Starts with RIFF (bytes 0..3) and contains WEBP (bytes 8..11)
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return { mime: 'image/webp', extension: 'webp' };
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const spbuId = (formData.get('spbuId') as string | null) || 'spbu-general';

    if (!file) {
      return NextResponse.json(
        { error: 'File foto antrean tidak ditemukan.' },
        { status: 400, headers: { 'X-Content-Type-Options': 'nosniff' } }
      );
    }

    // Limit upload file size (max 2.5 MB)
    const MAX_SIZE = 2.5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'Ukuran foto terlalu besar. Maksimal 2.5 MB.' },
        { status: 400, headers: { 'X-Content-Type-Options': 'nosniff' } }
      );
    }

    // 1. Initial Client MIME type check against whitelist
    const validClientMimes = ['image/webp', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!validClientMimes.includes(file.type.toLowerCase())) {
      return NextResponse.json(
        { error: 'Format foto tidak didukung. Hanya format WebP, JPEG, atau PNG yang diizinkan.' },
        { status: 400, headers: { 'X-Content-Type-Options': 'nosniff' } }
      );
    }

    // Read file bytes into Buffer for binary inspection
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 2. Strict Magic Bytes (Binary Signature) Verification
    const detectedType = detectImageMagicBytes(buffer);
    if (!detectedType) {
      return NextResponse.json(
        { error: 'Format file tidak diizinkan atau bukan gambar asli. Hanya foto JPEG, PNG, atau WebP yang valid yang dapat diunggah.' },
        { status: 400, headers: { 'X-Content-Type-Options': 'nosniff' } }
      );
    }

    const cleanSpbuId = spbuId.replace(/[^a-zA-Z0-9_-]/g, '');
    const key = `queue_${cleanSpbuId}_${Date.now()}.${detectedType.extension}`;

    // If Cloudflare R2 is configured, upload to R2 bucket
    if (isR2Configured && r2Client) {
      await r2Client.send(
        new PutObjectCommand({
          Bucket: R2_BUCKET,
          Key: key,
          Body: buffer,
          ContentType: detectedType.mime,
          ContentDisposition: 'inline',
          CacheControl: 'public, max-age=31536000, immutable',
        })
      );

      const photoUrl = `${R2_PUBLIC_URL}/${key}`;
      return NextResponse.json(
        {
          success: true,
          photoUrl,
          key,
          detectedFormat: detectedType.extension,
        },
        { headers: { 'X-Content-Type-Options': 'nosniff' } }
      );
    }

    // Fallback: If R2 is temporarily unconfigured, return base64 data URL for preview/testing
    const base64Data = buffer.toString('base64');
    const fallbackDataUrl = `data:${detectedType.mime};base64,${base64Data}`;

    return NextResponse.json(
      {
        success: true,
        photoUrl: fallbackDataUrl,
        isFallback: true,
        detectedFormat: detectedType.extension,
      },
      { headers: { 'X-Content-Type-Options': 'nosniff' } }
    );
  } catch (error: unknown) {
    console.error('Error uploading queue photo to Cloudflare R2:', error);
    const message = error instanceof Error ? error.message : 'Gagal mengunggah foto ke server storage.';
    return NextResponse.json(
      { error: message },
      { status: 500, headers: { 'X-Content-Type-Options': 'nosniff' } }
    );
  }
}
