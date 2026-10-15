import { NextResponse } from 'next/server';
 
// Snapshot mode and simulated SVG traffic proxies have been deprecated.
// Real-time visual monitoring is provided through:
// 1. Direct HLS streams from official ATCS Dishub Bali.
// 2. Crowdsourced citizen queue photos stored in Cloudflare R2 (/api/spbu-photos).
export async function GET() {
  return NextResponse.json(
    {
      deprecated: true,
      message: 'Fitur snapshot simulasi telah dihapus. Silakan gunakan live HLS streaming ATCS atau Foto Antrean Warga (/api/spbu-photos).',
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=86400',
      },
    }
  );
}

