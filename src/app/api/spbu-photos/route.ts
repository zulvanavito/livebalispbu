import { NextRequest, NextResponse } from 'next/server';
import { ListObjectsV2Command } from '@aws-sdk/client-s3';
import { r2Client, R2_BUCKET, R2_PUBLIC_URL, isR2Configured } from '@/lib/r2-client';

export interface R2PhotoItem {
  url: string;
  key: string;
  createdAt: string;
  size?: number;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const isSummary = searchParams.get('summary') === 'true';

    if (isSummary) {
      if (!isR2Configured || !r2Client) {
        return NextResponse.json({
          success: true,
          recentSpbuIds: [],
          summary: {},
          message: 'Cloudflare R2 belum dikonfigurasi.',
        });
      }

      const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
      const now = Date.now();
      const recentSpbuIdsSet = new Set<string>();
      const summary: Record<string, { url: string; createdAt: string }> = {};

      // 1. Scan organized folder prefix: spbus/
      try {
        const folderRes = await r2Client.send(
          new ListObjectsV2Command({
            Bucket: R2_BUCKET,
            Prefix: 'spbus/',
            MaxKeys: 1000,
          })
        );

        if (folderRes.Contents) {
          for (const obj of folderRes.Contents) {
            if (obj.Key && obj.LastModified && obj.Size && obj.Size > 0) {
              const age = now - obj.LastModified.getTime();
              if (age <= TWENTY_FOUR_HOURS_MS) {
                // Key format: spbus/{spbuId}/{filename}
                const parts = obj.Key.split('/');
                if (parts.length >= 3 && parts[1]) {
                  const spbuId = parts[1];
                  recentSpbuIdsSet.add(spbuId);
                  if (!summary[spbuId] || new Date(summary[spbuId].createdAt).getTime() < obj.LastModified.getTime()) {
                    summary[spbuId] = {
                      url: `${R2_PUBLIC_URL}/${obj.Key}`,
                      createdAt: obj.LastModified.toISOString(),
                    };
                  }
                }
              }
            }
          }
        }
      } catch (scanErr) {
        console.warn('Error scanning R2 spbus/ prefix:', scanErr);
      }

      // 2. Scan legacy root queue_ objects for backward compatibility
      try {
        const legacyRes = await r2Client.send(
          new ListObjectsV2Command({
            Bucket: R2_BUCKET,
            Prefix: 'queue_',
            MaxKeys: 200,
          })
        );

        if (legacyRes.Contents) {
          for (const obj of legacyRes.Contents) {
            if (obj.Key && obj.LastModified && obj.Size && obj.Size > 0) {
              const age = now - obj.LastModified.getTime();
              if (age <= TWENTY_FOUR_HOURS_MS) {
                // Key format: queue_{spbuId}_{timestamp}_{random}.jpg
                const match = obj.Key.match(/^queue_(.+?)_\d+_[a-zA-Z0-9_-]+\.[a-zA-Z0-9]+$/);
                if (match && match[1]) {
                  const spbuId = match[1];
                  recentSpbuIdsSet.add(spbuId);
                  if (!summary[spbuId] || new Date(summary[spbuId].createdAt).getTime() < obj.LastModified.getTime()) {
                    summary[spbuId] = {
                      url: `${R2_PUBLIC_URL}/${obj.Key}`,
                      createdAt: obj.LastModified.toISOString(),
                    };
                  }
                }
              }
            }
          }
        }
      } catch (legacyErr) {
        console.warn('Error scanning legacy R2 queue_ prefix:', legacyErr);
      }

      return NextResponse.json(
        {
          success: true,
          recentSpbuIds: Array.from(recentSpbuIdsSet),
          summary,
        },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
          },
        }
      );
    }

    const spbuId = searchParams.get('spbuId');

    if (!spbuId) {
      return NextResponse.json(
        { error: 'Parameter spbuId wajib disertakan.' },
        { status: 400 }
      );
    }

    const cleanSpbuId = spbuId.replace(/[^a-zA-Z0-9_-]/g, '');

    if (!isR2Configured || !r2Client) {
      return NextResponse.json({
        success: true,
        spbuId: cleanSpbuId,
        total: 0,
        photos: [],
        message: 'Cloudflare R2 belum dikonfigurasi.',
      });
    }

    // 1. Fetch from new organized folder prefix: spbus/{cleanSpbuId}/
    const folderRes = await r2Client.send(
      new ListObjectsV2Command({
        Bucket: R2_BUCKET,
        Prefix: `spbus/${cleanSpbuId}/`,
        MaxKeys: 20,
      })
    );

    const photos: R2PhotoItem[] = [];

    if (folderRes.Contents) {
      for (const obj of folderRes.Contents) {
        if (obj.Key && obj.Size && obj.Size > 0) {
          photos.push({
            url: `${R2_PUBLIC_URL}/${obj.Key}`,
            key: obj.Key,
            createdAt: obj.LastModified ? obj.LastModified.toISOString() : new Date().toISOString(),
            size: obj.Size,
          });
        }
      }
    }

    // 2. Fallback: also check legacy root keys (queue_{cleanSpbuId}_) for backward compatibility
    const legacyRes = await r2Client.send(
      new ListObjectsV2Command({
        Bucket: R2_BUCKET,
        Prefix: `queue_${cleanSpbuId}_`,
        MaxKeys: 10,
      })
    );

    if (legacyRes.Contents) {
      for (const obj of legacyRes.Contents) {
        if (obj.Key && obj.Size && obj.Size > 0) {
          photos.push({
            url: `${R2_PUBLIC_URL}/${obj.Key}`,
            key: obj.Key,
            createdAt: obj.LastModified ? obj.LastModified.toISOString() : new Date().toISOString(),
            size: obj.Size,
          });
        }
      }
    }

    // 3. Sort descending by LastModified (newest photo first)
    photos.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Take top 8 recent photos
    const recent = photos.slice(0, 8);

    return NextResponse.json(
      {
        success: true,
        spbuId: cleanSpbuId,
        total: recent.length,
        photos: recent,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      }
    );
  } catch (error: any) {
    if (error && typeof error === 'object' && 'digest' in error) {
      throw error;
    }
    console.error('Error fetching SPBU photos from R2:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Gagal mengambil riwayat foto antrean SPBU.',
        photos: [],
      },
      { status: 500 }
    );
  }
}
