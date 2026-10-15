import { SPBUItem } from '@/types/spbu';

// Bounding box for Bali island SPBU coordinates
export const BALI_BOUNDS = {
  MIN_LAT: -8.88,
  MAX_LAT: -8.05,
  MIN_LNG: 114.40,
  MAX_LNG: 115.75,
};

// Polyfill-safe rounded rectangle drawing
export function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Draw authentic Live SPBU Bali brand logo pin
 */
export function drawBrandLogo(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  boxSize: number
) {
  // Dark container
  drawRoundedRect(ctx, x, y, boxSize, boxSize, boxSize * 0.28);
  ctx.fillStyle = '#09090b';
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#27272a';
  ctx.stroke();

  // Pin geometry scaled
  const cx = x + boxSize / 2;
  const cy = y + boxSize * 0.48;
  const scale = boxSize / 48;

  ctx.save();
  ctx.translate(cx, cy);

  // Outer fuel location pin
  ctx.beginPath();
  ctx.arc(0, -5 * scale, 11 * scale, Math.PI, 0, false);
  ctx.quadraticCurveTo(11 * scale, 5 * scale, 0, 17 * scale);
  ctx.quadraticCurveTo(-11 * scale, 5 * scale, -11 * scale, -5 * scale);
  ctx.closePath();

  const grad = ctx.createLinearGradient(0, -16 * scale, 0, 17 * scale);
  grad.addColorStop(0, '#10b981');
  grad.addColorStop(1, '#059669');
  ctx.fillStyle = grad;
  ctx.fill();

  // Inner droplet cutout
  ctx.beginPath();
  ctx.arc(0, -4 * scale, 5 * scale, 0, Math.PI * 2);
  ctx.fillStyle = '#09090b';
  ctx.fill();

  // Telemetry core beacon
  ctx.beginPath();
  ctx.arc(0, -4 * scale, 2.2 * scale, 0, Math.PI * 2);
  ctx.fillStyle = '#34d399';
  ctx.fill();

  // Top-right live green indicator dot
  ctx.beginPath();
  ctx.arc(x + boxSize - 8 * scale, y + 8 * scale, 2.8 * scale, 0, Math.PI * 2);
  ctx.fillStyle = '#10b981';
  ctx.fill();

  ctx.restore();
}

/**
 * Projects SPBU GPS coordinates onto canvas bounds
 */
export function projectCoordinates(
  lat: number,
  lng: number,
  mapX: number,
  mapY: number,
  mapW: number,
  mapH: number
) {
  const x =
    ((lng - BALI_BOUNDS.MIN_LNG) / (BALI_BOUNDS.MAX_LNG - BALI_BOUNDS.MIN_LNG)) *
      mapW +
    mapX;
  const y =
    ((BALI_BOUNDS.MAX_LAT - lat) / (BALI_BOUNDS.MAX_LAT - BALI_BOUNDS.MIN_LAT)) *
      mapH +
    mapY;
  return { x, y };
}

/**
 * Get dot color for an SPBU
 */
export function getSPBUStatusColor(
  spbu: SPBUItem,
  currentTimeMs?: number
): {
  color: string;
  category: 'smooth' | 'crowded' | 'congested' | 'stale';
} {
  // If reported over 3 hours ago or never
  if (!spbu.lastReportedAt) {
    return { color: '#94a3b8', category: 'stale' }; // Grey (perlu update)
  }
  const now = currentTimeMs || (typeof window !== 'undefined' ? Date.now() : 0);
  if (now > 0) {
    const diffHours = (now - new Date(spbu.lastReportedAt).getTime()) / (1000 * 3600);
    if (diffHours >= 3) {
      return { color: '#94a3b8', category: 'stale' };
    }
  }

  if (spbu.fuelStock.pertalite === 'out_of_stock' || spbu.queueLevel === 'congested') {
    return { color: '#ef4444', category: 'congested' }; // Red
  }
  if (spbu.queueLevel === 'moderate' || spbu.fuelStock.pertalite === 'low') {
    return { color: '#f59e0b', category: 'crowded' }; // Amber
  }
  return { color: '#10b981', category: 'smooth' }; // Green
}

/**
 * Draw Bali Dot Map on Canvas
 */
export function drawBaliDotMap(
  ctx: CanvasRenderingContext2D,
  spbus: SPBUItem[],
  mapX: number,
  mapY: number,
  mapW: number,
  mapH: number,
  options?: { haloRadius?: number; dotRadius?: number; currentTimeMs?: number }
) {
  const haloR = options?.haloRadius ?? 28;
  const dotR = options?.dotRadius ?? 7;

  // 1. Draw ambient landmass halos (overlapping circles create Bali silhouette)
  ctx.fillStyle = '#eae7df';
  for (const s of spbus) {
    const { x, y } = projectCoordinates(
      s.coordinates.lat,
      s.coordinates.lng,
      mapX,
      mapY,
      mapW,
      mapH
    );
    ctx.beginPath();
    ctx.arc(x, y, haloR, 0, Math.PI * 2);
    ctx.fill();
  }

  // 2. Draw dots with subtle white border
  for (const s of spbus) {
    const { x, y } = projectCoordinates(
      s.coordinates.lat,
      s.coordinates.lng,
      mapX,
      mapY,
      mapW,
      mapH
    );
    const { color } = getSPBUStatusColor(s, options?.currentTimeMs);

    ctx.beginPath();
    ctx.arc(x, y, dotR, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
  }
}

/**
 * Generate 1080x1920 Instagram/WhatsApp Story image (Live SPBU Bali Edition)
 */
export async function generateStoryImage(spbus: SPBUItem[]): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');

  const now = new Date();
  const timeMs = now.getTime();
  const timeStr = now.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Makassar',
  });

  const total = spbus.length;
  let smooth = 0;
  let crowded = 0;
  let congested = 0;
  let stale = 0;

  for (const s of spbus) {
    const { category } = getSPBUStatusColor(s, timeMs);
    if (category === 'smooth') smooth++;
    else if (category === 'crowded') crowded++;
    else if (category === 'congested') congested++;
    else stale++;
  }

  const availableCount = smooth + crowded;

  // 1. Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 1080, 1920);

  const bgGrad = ctx.createLinearGradient(0, 0, 0, 1920);
  bgGrad.addColorStop(0, '#f8fafc');
  bgGrad.addColorStop(0.35, '#ffffff');
  bgGrad.addColorStop(1, '#f1f5f9');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 1080, 1920);

  // 2. Brand Header (Live SPBU Bali)
  drawBrandLogo(ctx, 80, 110, 68);

  ctx.textAlign = 'left';
  ctx.font = 'bold 38px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#09090b';
  ctx.fillText('Live SPBU ', 164, 150);

  const prefixW = ctx.measureText('Live SPBU ').width;
  ctx.fillStyle = '#059669';
  ctx.fillText('Bali', 164 + prefixW, 150);

  // Domain pill badge
  const domainBadgeX = 164 + prefixW + ctx.measureText('Bali').width + 16;
  drawRoundedRect(ctx, domainBadgeX, 126, 175, 34, 10);
  ctx.fillStyle = '#ecfdf5';
  ctx.fill();
  ctx.strokeStyle = '#a7f3d0';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#047857';
  ctx.fillText('livebali.my.id', domainBadgeX + 16, 149);

  // Subtitle
  ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText(`PANTAUAN REALTIME BBM BALI • ${timeStr} WITA`, 80, 235);

  // 3. Hero Statement
  ctx.font = 'bold 76px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#059669';
  ctx.fillText(`${availableCount} dari ${total} SPBU`, 80, 325);

  ctx.font = 'bold 54px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#09090b';
  ctx.fillText('Lancar & Tersedia BBM', 80, 395);

  // 4. Dot Map of Bali
  const mapX = 60;
  const mapY = 450;
  const mapW = 960;
  const mapH = 580;
  drawBaliDotMap(ctx, spbus, mapX, mapY, mapW, mapH, {
    haloRadius: 30,
    dotRadius: 8,
    currentTimeMs: timeMs,
  });

  // 5. Status Legend
  const legendY = 1070;
  const legendItems = [
    { label: 'Lancar (< 5 mnt)', count: smooth, color: '#10b981' },
    { label: 'Ramai (5-15 mnt)', count: crowded, color: '#f59e0b' },
    { label: 'Padat / Habis', count: congested, color: '#ef4444' },
    { label: 'Perlu Update', count: stale, color: '#94a3b8' },
  ];

  ctx.font = '600 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  legendItems.forEach((item, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const lx = 80 + col * 460;
    const ly = legendY + row * 46;

    ctx.beginPath();
    ctx.arc(lx, ly, 10, 0, Math.PI * 2);
    ctx.fillStyle = item.color;
    ctx.fill();

    ctx.fillStyle = '#334155';
    ctx.fillText(`${item.label} (${item.count})`, lx + 24, ly + 7);
  });

  // 6. Data Transparency & Verification Pill
  drawRoundedRect(ctx, 80, 1185, 920, 64, 16);
  ctx.fillStyle = '#f0fdf4';
  ctx.fill();
  ctx.strokeStyle = '#bbf7d0';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#065f46';
  ctx.textAlign = 'center';
  ctx.fillText('✓ 281 SPBU Se-Bali • 23+ CCTV Dishub & Laporan Urun Daya Warga', 540, 1225);

  // 7. Area Breakdown (Kawasan Metropolitan Sarbagita)
  ctx.textAlign = 'left';
  ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText('STATUS KAWASAN METROPOLITAN SARBAGITA', 80, 1300);

  const areas = [
    { name: 'Kota Denpasar', regency: 'Denpasar' },
    { name: 'Kab. Badung', regency: 'Badung' },
    { name: 'Kab. Gianyar', regency: 'Gianyar' },
    { name: 'Kab. Tabanan', regency: 'Tabanan' },
  ];

  let areaY = 1340;
  for (const area of areas) {
    const areaSPBUs = spbus.filter((s) => s.regency === area.regency);
    const areaTotal = areaSPBUs.length;
    const areaAvailable = areaSPBUs.filter(
      (s) => s.fuelStock.pertalite !== 'out_of_stock' && s.queueLevel !== 'congested'
    ).length;

    ctx.font = '600 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#1e293b';
    ctx.fillText(area.name, 80, areaY + 22);

    // Progress Bar Background
    const barX = 360;
    const barW = 500;
    const barH = 20;
    drawRoundedRect(ctx, barX, areaY + 6, barW, barH, 10);
    ctx.fillStyle = '#e2e8f0';
    ctx.fill();

    // Progress fill
    const fillRatio = areaTotal > 0 ? areaAvailable / areaTotal : 0;
    if (fillRatio > 0) {
      drawRoundedRect(ctx, barX, areaY + 6, barW * fillRatio, barH, 10);
      ctx.fillStyle = '#10b981';
      ctx.fill();
    }

    // Fraction text
    ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.textAlign = 'right';
    ctx.fillText(`${areaAvailable}/${areaTotal}`, 1000, areaY + 23);
    ctx.textAlign = 'left';

    areaY += 56;
  }

  // 8. Dark Footer Card (Live SPBU Bali Branding)
  drawRoundedRect(ctx, 80, 1605, 920, 195, 28);
  ctx.fillStyle = '#09090b';
  ctx.fill();

  drawBrandLogo(ctx, 115, 1635, 52);

  ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('Live SPBU Bali', 185, 1672);

  ctx.font = 'bold 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#34d399';
  ctx.fillText('livebali.my.id', 800, 1672);

  ctx.font = '400 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#d4d4d8';
  ctx.fillText('Pantau kondisi antrean, stok Pertalite/Pertamax & CCTV ATCS se-Bali sebelum bepergian.', 115, 1726);

  ctx.font = '500 19px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#a1a1aa';
  ctx.fillText('Inisiatif urun daya independen warga Bali • Gratis & Real-time untuk masyarakat', 115, 1762);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to create Story image Blob'));
      },
      'image/png',
      0.95
    );
  });
}

/**
 * Generate 1080x1080 Instagram/Facebook Square Post image (Live SPBU Bali Edition)
 */
export async function generatePostImage(spbus: SPBUItem[]): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1080;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');

  const now = new Date();
  const timeMs = now.getTime();
  const timeStr = now.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Makassar',
  });

  const total = spbus.length;
  let smooth = 0;
  let crowded = 0;
  let congested = 0;
  let stale = 0;

  for (const s of spbus) {
    const { category } = getSPBUStatusColor(s, timeMs);
    if (category === 'smooth') smooth++;
    else if (category === 'crowded') crowded++;
    else if (category === 'congested') congested++;
    else stale++;
  }

  const availableCount = smooth + crowded;

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 1080, 1080);

  // Border card simulation
  drawRoundedRect(ctx, 30, 30, 1020, 1020, 32);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#e2e8f0';
  ctx.stroke();

  // Top bar: Live SPBU Bali Logo + Domain Pill
  drawBrandLogo(ctx, 70, 65, 52);

  ctx.textAlign = 'left';
  ctx.font = 'bold 30px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#09090b';
  ctx.fillText('Live SPBU ', 135, 101);

  const prefixW = ctx.measureText('Live SPBU ').width;
  ctx.fillStyle = '#059669';
  ctx.fillText('Bali', 135 + prefixW, 101);

  // Domain pill right aligned
  drawRoundedRect(ctx, 835, 70, 175, 38, 12);
  ctx.fillStyle = '#ecfdf5';
  ctx.fill();
  ctx.strokeStyle = '#a7f3d0';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#047857';
  ctx.fillText('livebali.my.id', 855, 96);

  // Subtitle
  ctx.textAlign = 'left';
  ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText(`PANTAUAN REALTIME BBM BALI • ${timeStr} WITA`, 70, 155);

  // Hero Headline
  ctx.font = 'bold 54px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#059669';
  ctx.fillText(`${availableCount} dari ${total} SPBU`, 70, 222);

  ctx.font = 'bold 42px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#09090b';
  ctx.fillText('Lancar & Tersedia BBM Se-Bali', 70, 276);

  // Dot Map
  const mapX = 60;
  const mapY = 315;
  const mapW = 960;
  const mapH = 560;
  drawBaliDotMap(ctx, spbus, mapX, mapY, mapW, mapH, {
    haloRadius: 28,
    dotRadius: 7,
    currentTimeMs: timeMs,
  });

  // Legend at bottom
  const legendY = 930;
  const legendItems = [
    { label: 'Lancar', count: smooth, color: '#10b981' },
    { label: 'Ramai', count: crowded, color: '#f59e0b' },
    { label: 'Padat/Habis', count: congested, color: '#ef4444' },
    { label: 'Perlu Update', count: stale, color: '#94a3b8' },
  ];

  ctx.font = '600 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const itemWidth = 220;
  legendItems.forEach((item, idx) => {
    const lx = 80 + idx * itemWidth;
    ctx.beginPath();
    ctx.arc(lx, legendY, 9, 0, Math.PI * 2);
    ctx.fillStyle = item.color;
    ctx.fill();

    ctx.fillStyle = '#475569';
    ctx.fillText(`${item.label} (${item.count})`, lx + 18, legendY + 7);
  });

  // Footer text
  ctx.font = '500 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.textAlign = 'center';
  ctx.fillText(
    'Pantau kondisi antrean, stok BBM & CCTV ATCS se-Bali di https://livebali.my.id',
    540,
    1000
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to create Post image Blob'));
      },
      'image/png',
      0.95
    );
  });
}

/**
 * Share or download image with native Web Share or fallback download
 */
export async function shareOrDownloadImage(
  blob: Blob,
  filename: string,
  title: string,
  text: string
): Promise<{ success: boolean; method: 'native' | 'download' }> {
  try {
    const file = new File([blob], filename, { type: 'image/png' });
    if (
      typeof navigator !== 'undefined' &&
      navigator.canShare &&
      navigator.canShare({ files: [file] })
    ) {
      await navigator.share({
        title,
        text,
        files: [file],
      });
      return { success: true, method: 'native' };
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { success: false, method: 'native' };
    }
  }

  // Fallback: Trigger direct file download
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);

  // Copy caption text to clipboard
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Ignore clipboard error
    }
  }

  return { success: true, method: 'download' };
}
