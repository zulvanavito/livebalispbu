import { NextRequest, NextResponse } from 'next/server';

// Generates an informative SVG snapshot placeholder representing traffic CCTV frame with timestamp and location
function generatePlaceholderSVG(camName: string, location: string, timestamp: string, queueStatus: string) {
  const isCongested = queueStatus.includes('padat') || queueStatus.includes('macet') || queueStatus.includes('congested');
  const alertColor = isCongested ? '#ef4444' : '#10b981';
  const alertText = isCongested ? 'ANTREAN PADAT / MENGULAR' : 'ARUS RELATIF LANCAR';

  return `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
    <defs>
      <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#1e293b"/>
        <stop offset="60%" stop-color="#334155"/>
        <stop offset="100%" stop-color="#0f172a"/>
      </linearGradient>
      <linearGradient id="roadGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#1e293b"/>
        <stop offset="100%" stop-color="#090d16"/>
      </linearGradient>
      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>
      </pattern>
    </defs>

    <!-- Background: Night/Day Traffic Cam Tone -->
    <rect width="800" height="450" fill="url(#skyGrad)"/>
    <rect width="800" height="450" fill="url(#grid)"/>

    <!-- Perspective Road -->
    <polygon points="320,180 480,180 780,450 20,450" fill="url(#roadGrad)"/>
    
    <!-- Road Lane Divider Lines -->
    <line x1="400" y1="180" x2="400" y2="450" stroke="#facc15" stroke-dasharray="16,12" stroke-width="4"/>
    <line x1="360" y1="180" x2="210" y2="450" stroke="#ffffff" stroke-dasharray="10,14" stroke-width="2" opacity="0.6"/>
    <line x1="440" y1="180" x2="590" y2="450" stroke="#ffffff" stroke-dasharray="10,14" stroke-width="2" opacity="0.6"/>

    <!-- SPBU Canopy in Background (Left or Right side) -->
    <polygon points="40,220 250,200 250,290 40,320" fill="#dc2626" opacity="0.85"/>
    <rect x="40" y="220" width="210" height="15" fill="#ffffff" opacity="0.9"/>
    <rect x="70" y="290" width="20" height="80" fill="#64748b"/>
    <rect x="180" y="270" width="20" height="90" fill="#64748b"/>
    <!-- Fuel Icon on canopy -->
    <text x="145" y="255" fill="#ffffff" font-family="sans-serif" font-weight="900" font-size="22" text-anchor="middle">SPBU</text>

    <!-- Simulated Vehicles in Queue -->
    ${
      isCongested
        ? `
      <!-- Multiple queued cars & motorbikes -->
      <!-- Car 1 -->
      <rect x="110" y="320" width="130" height="60" rx="8" fill="#3b82f6"/>
      <polygon points="125,320 145,295 210,295 225,320" fill="#60a5fa"/>
      <circle cx="130" cy="380" r="10" fill="#0f172a"/>
      <circle cx="220" cy="380" r="10" fill="#0f172a"/>
      <!-- Tail lights -->
      <rect x="112" y="340" width="8" height="15" rx="3" fill="#ef4444"/>
      <rect x="230" y="340" width="8" height="15" rx="3" fill="#ef4444"/>

      <!-- Car 2 in queue -->
      <rect x="160" y="260" width="85" height="40" rx="6" fill="#64748b"/>
      <polygon points="170,260 185,242 225,242 238,260" fill="#94a3b8"/>
      <!-- Tail lights -->
      <circle cx="163" cy="275" r="4" fill="#ef4444"/>
      <circle cx="242" cy="275" r="4" fill="#ef4444"/>

      <!-- Motorbikes queueing -->
      <rect x="60" y="340" width="25" height="40" rx="4" fill="#10b981"/>
      <circle cx="72" cy="378" r="7" fill="#0f172a"/>
      <circle cx="72" cy="345" r="4" fill="#facc15"/>

      <rect x="80" y="300" width="20" height="32" rx="3" fill="#f97316"/>
      <circle cx="90" cy="330" r="6" fill="#0f172a"/>
      `
        : `
      <!-- Flowing light traffic -->
      <rect x="360" y="270" width="80" height="38" rx="6" fill="#3b82f6"/>
      <polygon points="370,270 385,252 425,252 435,270" fill="#93c5fd"/>
      <circle cx="372" cy="285" r="4" fill="#ef4444"/>
      <circle cx="428" cy="285" r="4" fill="#ef4444"/>
      `
    }

    <!-- CCTV Camera Overlay Header -->
    <rect x="0" y="0" width="800" height="56" fill="rgba(0,0,0,0.7)"/>
    <circle cx="28" cy="28" r="8" fill="#ef4444">
      <animate attributeName="opacity" values="1;0.2;1" dur="1.5s" repeatCount="indefinite"/>
    </circle>
    <text x="46" y="34" fill="#ffffff" font-family="monospace" font-size="16" font-weight="bold">LIVE ATCS DISHUB - KAMERA PENGAWASAN</text>
    <text x="770" y="34" fill="#38bdf8" font-family="monospace" font-size="14" text-anchor="end">${timestamp}</text>

    <!-- Location & Status Footer Bar -->
    <rect x="0" y="394" width="800" height="56" fill="rgba(0,0,0,0.85)"/>
    <text x="24" y="420" fill="#f8fafc" font-family="sans-serif" font-size="16" font-weight="bold">Lokasi: ${location}</text>
    <text x="24" y="438" fill="#94a3b8" font-family="sans-serif" font-size="12">ID Feed: ${camName}</text>

    <!-- Queue Status Badge -->
    <rect x="530" y="405" width="245" height="34" rx="6" fill="${alertColor}"/>
    <text x="652" y="428" fill="#ffffff" font-family="sans-serif" font-size="13" font-weight="bold" text-anchor="middle">${alertText}</text>
  </svg>
  `;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const cam = searchParams.get('cam') || 'atcs-denpasar-main';

  // Map camera identifiers to readable location titles and conditions
  const cameraMetadata: Record<string, { name: string; loc: string; queue: string }> = {
    'sunset-dewisri': {
      name: 'ATCS-BDG-012',
      loc: 'Simpang Sunset Road - Dewi Sri, Kuta',
      queue: 'congested',
    },
    'canggu-main': {
      name: 'COMM-CGU-04',
      loc: 'Simpang Pantai Batu Bolong, Canggu',
      queue: 'congested',
    },
    'dewaruci-underpass': {
      name: 'ATCS-BDG-002',
      loc: 'Underpass Simpang Siur Dewa Ruci',
      queue: 'moderate',
    },
    'jimbaran-unud': {
      name: 'ATCS-DPS-044',
      loc: 'Simpang Jimbaran - Unud Kampus',
      queue: 'smooth',
    },
    'nusadua-gate': {
      name: 'ATCS-BDG-088',
      loc: 'Gerbang Tol & Bundaran Nusa Dua',
      queue: 'smooth',
    },
    'mengwi-terminal': {
      name: 'ATCS-BLI-019',
      loc: 'Simpang Terminal Mengwi, Badung',
      queue: 'moderate',
    },
    'marlboro-mahendradatta': {
      name: 'ATCS-DPS-023',
      loc: 'Simpang Marlboro - Mahendradatta',
      queue: 'congested',
    },
    'sanur-hangtuah': {
      name: 'ATCS-DPS-031',
      loc: 'Simpang Sanur Paradise / Hang Tuah',
      queue: 'moderate',
    },
    'gatsu-tohpati': {
      name: 'ATCS-DPS-008',
      loc: 'Simpang Gatot Subroto - Tohpati',
      queue: 'congested',
    },
    'gatsu-cokroaminoto': {
      name: 'ATCS-DPS-005',
      loc: 'Simpang Gatsu - Cokroaminoto Ubung',
      queue: 'smooth',
    },
    'simpang-enam': {
      name: 'ATCS-DPS-001',
      loc: 'Simpang Enam Teuku Umar - Diponegoro',
      queue: 'moderate',
    },
    'sesetan-pegok': {
      name: 'ATCS-DPS-016',
      loc: 'Simpang Raya Sesetan - Pegok',
      queue: 'empty',
    },
    'imambonjol-sunset': {
      name: 'ATCS-DPS-027',
      loc: 'Simpang Imam Bonjol - Sunset Road',
      queue: 'congested',
    },
  };

  const meta = cameraMetadata[cam] || {
    name: cam.toUpperCase(),
    loc: 'Area Pengawasan Lalu Lintas Bali',
    queue: 'moderate',
  };

  const now = new Date();
  const timeFormatted = now.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Asia/Makassar', // WITA
  }) + ' WITA';

  const svgContent = generatePlaceholderSVG(meta.name, meta.loc, timeFormatted, meta.queue);

  return new NextResponse(svgContent, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
