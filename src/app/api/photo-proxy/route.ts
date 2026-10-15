import { NextRequest, NextResponse } from 'next/server';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { r2Client, R2_BUCKET, isR2Configured } from '@/lib/r2-client';

export async function GET(request: NextRequest) {
  try {
    const key = request.nextUrl.searchParams.get('key');
    if (!key) {
      return new NextResponse('Missing key parameter', { status: 400 });
    }

    if (!isR2Configured || !r2Client) {
      return new NextResponse('R2 Storage not configured', { status: 503 });
    }

    // Sanitize key (strip leading slashes or full URLs if accidentally passed)
    let cleanKey = key.trim();
    if (cleanKey.startsWith('http://') || cleanKey.startsWith('https://')) {
      try {
        const parsed = new URL(cleanKey);
        cleanKey = parsed.pathname;
      } catch {
        // fallback
      }
    }
    cleanKey = cleanKey.replace(/^\/+/, '');

    const res = await r2Client.send(
      new GetObjectCommand({
        Bucket: R2_BUCKET,
        Key: cleanKey,
      })
    );

    if (!res.Body) {
      return new NextResponse('Object body empty', { status: 404 });
    }

    const contentType = res.ContentType || 'image/webp';
    // Native AWS SDK v3 WebStream compatible with standard Web Response
    const stream = res.Body.transformToWebStream();

    return new NextResponse(stream as any, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error: any) {
    if (error && typeof error === 'object' && 'digest' in error) {
      throw error;
    }
    console.error('Error proxying photo from Cloudflare R2:', error);
    return new NextResponse('Image not found or error loading', { status: 404 });
  }
}

