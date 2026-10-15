const fs = require('fs');

const raw = JSON.parse(fs.readFileSync('scratch/osm_gianyar_buleleng.json', 'utf8'));

// Deduplicate and extract lat/lng
function getCoord(el) {
  if (el.type === 'node') return { lat: el.lat, lng: el.lon };
  if (el.center) return { lat: el.center.lat, lng: el.center.lon };
  return null;
}

function haversine(c1, c2) {
  const R = 6371e3;
  const p1 = c1.lat * Math.PI / 180;
  const p2 = c2.lat * Math.PI / 180;
  const dp = (c2.lat - c1.lat) * Math.PI / 180;
  const dl = (c2.lng - c1.lng) * Math.PI / 180;
  const a = Math.sin(dp/2)*Math.sin(dp/2) + Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)*Math.sin(dl/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// Bounding definitions:
// Buleleng is North Bali (lat > -8.35, mostly lat between -8.08 and -8.35)
// Gianyar is East of Badung/Denpasar (lat between -8.62 and -8.40, lng between 115.24 and 115.38)

const points = [];
for (const el of raw.elements) {
  const c = getCoord(el);
  if (!c) continue;
  
  // Deduplicate within 120m
  const dup = points.find(p => haversine(p.coord, c) < 120);
  if (dup) {
    // Merge tags if needed
    dup.tags = { ...dup.tags, ...el.tags };
    continue;
  }

  // Determine Regency:
  let regency = 'Unknown';
  let district = '';

  // If lat > -8.40 it's North Bali -> Buleleng
  if (c.lat > -8.35 && c.lat < -8.05) {
    regency = 'Buleleng';
  } else if (c.lat <= -8.40 && c.lat >= -8.65 && c.lng >= 115.24 && c.lng <= 115.39) {
    regency = 'Gianyar';
  }

  points.push({
    id: el.id,
    coord: c,
    regency,
    tags: el.tags || {}
  });
}

console.log('Total unique points:', points.length);
const gianyar = points.filter(p => p.regency === 'Gianyar');
const buleleng = points.filter(p => p.regency === 'Buleleng');
const others = points.filter(p => p.regency === 'Unknown');

console.log(`Gianyar: ${gianyar.length}, Buleleng: ${buleleng.length}, Others: ${others.length}`);

fs.writeFileSync('scratch/gianyar_buleleng_clean.json', JSON.stringify({ gianyar, buleleng, others }, null, 2));
