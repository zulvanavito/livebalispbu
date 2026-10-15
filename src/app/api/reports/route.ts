import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const turnstileSecret =
  process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY || '1x0000000000000000000000000000000AA';

const supabaseServer = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { spbuId, queueLevel, pertalite, pertamax, solar, note, turnstileToken } = body;

    if (!spbuId || !queueLevel) {
      return NextResponse.json(
        { error: 'Parameter spbuId dan queueLevel wajib diisi.' },
        { status: 400 }
      );
    }

    // Turnstile token verification
    const clientIp =
      request.headers.get('cf-connecting-ip') ||
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      '127.0.0.1';

    let isHuman = false;

    // Jika menggunakan dummy test key dari Cloudflare di localhost / dev
    if (turnstileSecret.startsWith('1x00000000000000000000')) {
      // Pastikan token ada (dihasilkan oleh widget Turnstile test key atau test-token-pass)
      isHuman = Boolean(turnstileToken);
    } else if (process.env.NODE_ENV === 'development' && turnstileToken === 'dev-bypass-token') {
      // Izinkan bypass khusus di mode development lokal
      isHuman = true;
    } else if (turnstileToken) {
      try {
        const formData = new URLSearchParams();
        formData.append('secret', turnstileSecret);
        formData.append('response', turnstileToken);
        formData.append('remoteip', clientIp);

        const cfRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
          method: 'POST',
          body: formData,
        });

        const outcome = await cfRes.json();
        isHuman = Boolean(outcome.success);
        if (!outcome.success) {
          console.warn('[Cloudflare Turnstile] Siteverify ditolak:', outcome['error-codes'] || outcome);
        }
      } catch (err) {
        console.error('Error verifying Cloudflare Turnstile:', err);
        // Fail open if Cloudflare is down but log it
        isHuman = true;
      }
    }

    if (!isHuman) {
      return NextResponse.json(
        { error: 'Verifikasi anti-bot gagal. Silakan centang verifikasi Cloudflare Turnstile.' },
        { status: 403 }
      );
    }

    // Stored procedure execution
    if (supabaseServer) {
      const { data, error } = await supabaseServer.rpc('submit_spbu_report', {
        p_spbu_id: spbuId,
        p_queue_level: queueLevel,
        p_pertalite: pertalite || 'available',
        p_pertamax: pertamax || 'available',
        p_solar: solar || 'available',
        p_note: note || null,
        p_ip_hash: clientIp ? Buffer.from(clientIp).toString('base64').slice(0, 16) : null,
      });

      if (error) {
        console.error('Supabase RPC error in /api/reports:', error);
        return NextResponse.json(
          { error: 'Gagal memperbarui database.', details: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Laporan berhasil divalidasi dan tersimpan di database.',
        data,
      });
    }

    // Fallback jika Supabase belum dikonfigurasi
    return NextResponse.json({
      success: true,
      message: 'Laporan diterima (mode lokal/fallback).',
      mockData: { spbuId, queueLevel, pertalite, pertamax, solar, note },
    });
  } catch (error) {
    console.error('API /api/reports internal error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server saat memproses laporan.' },
      { status: 500 }
    );
  }
}
