const fs = require('fs');

const raw = JSON.parse(fs.readFileSync('scratch/osm_klungkung_karangasem.json', 'utf8'));
console.log(`Total raw elements found: ${raw.elements.length}`);

// Load existing SPBU coordinates to avoid any duplicates
const spbuFile = fs.readFileSync('src/data/spbu-denpasar-badung.ts', 'utf8');
const existingCoords = [];
for (const match of spbuFile.matchAll(/"coordinates":\s*\{\s*"lat":\s*([0-9.-]+),\s*"lng":\s*([0-9.-]+)\s*\}/g)) {
  existingCoords.push({ lat: parseFloat(match[1]), lng: parseFloat(match[2]) });
}
console.log(`Existing SPBUs in DB: ${existingCoords.length}`);

const candidates = [];
for (const el of raw.elements) {
  const lat = el.lat || (el.center && el.center.lat);
  const lng = el.lon || (el.center && el.center.lon);
  if (!lat || !lng) continue;

  // Filter out any within 150m of existing SPBUs
  let isDup = false;
  for (const ex of existingCoords) {
    if (Math.abs(ex.lat - lat) < 0.0015 && Math.abs(ex.lng - lng) < 0.0015) {
      isDup = true;
      break;
    }
  }
  if (isDup) continue;

  const tags = el.tags || {};
  const name = tags.name || tags.operator || tags.brand || 'SPBU Pertamina';
  const nameLower = name.toLowerCase();

  // Exclude mini-dispensers, pertamini, or accessory shops
  if (nameLower.includes('petramini') || nameLower.includes('minicon')) continue;

  // Categorize between Klungkung and Karangasem:
  // Nusa Penida: lat <= -8.65, lng between 115.42 and 115.65 -> Klungkung (Nusa Penida)
  // Klungkung Daratan: lat between -8.58 and -8.50, lng between 115.34 and 115.46
  // Karangasem:
  // - Padangbai / Manggis: lat between -8.55 and -8.48, lng >= 115.48
  // - Candidasa / Karangasem Kota: lat between -8.50 and -8.40, lng >= 115.50
  // - Rendang / Selat: lat between -8.45 and -8.38, lng between 115.40 and 115.50
  // - Abang / Kubu: lat between -8.38 and -8.15, lng >= 115.50

  let regency = 'Karangasem';
  let district = '';

  if (lat <= -8.65) {
    regency = 'Klungkung';
    district = 'Nusa Penida';
  } else if (lng <= 115.46 && lat >= -8.57 && lat <= -8.50) {
    regency = 'Klungkung';
    if (lng <= 115.38) district = 'Banjarangkan';
    else if (lat >= -8.53) district = 'Klungkung';
    else district = 'Dawan';
  } else {
    regency = 'Karangasem';
    if (lng >= 115.47 && lat >= -8.55 && lat <= -8.48) district = 'Manggis';
    else if (lng >= 115.57 && lat >= -8.46 && lat <= -8.40) district = 'Karangasem';
    else if (lng >= 115.55 && lat <= -8.38) district = 'Abang';
    else if (lat <= -8.28) district = 'Kubu';
    else if (lat >= -8.47 && lng <= 115.50) district = 'Rendang';
    else district = 'Bebandem';
  }

  candidates.push({
    id: el.id,
    type: el.type,
    lat,
    lng,
    regency,
    district,
    name,
    street: tags['addr:street'],
    city: tags['addr:city'],
    tags
  });
}

// Deduplicate very close candidates (< 150m)
const deduped = [];
for (const item of candidates) {
  let isClose = false;
  for (const d of deduped) {
    if (Math.abs(d.lat - item.lat) < 0.0015 && Math.abs(d.lng - item.lng) < 0.0015) {
      isClose = true;
      break;
    }
  }
  if (!isClose) {
    deduped.push(item);
  }
}

console.log(`Deduplicated new SPBUs for East Bali: ${deduped.length}`);
const stats = {};
deduped.forEach(d => stats[d.regency] = (stats[d.regency] || 0) + 1);
console.log('Distribution:', stats);

fs.writeFileSync('scratch/clean_klungkung_karangasem.json', JSON.stringify(deduped, null, 2));

deduped.forEach((item, idx) => {
  console.log(`${(idx + 1).toString().padStart(2, '0')}. [${item.regency}] (${item.district || 'General'}) ${item.name} | ${item.lat.toFixed(5)}, ${item.lng.toFixed(5)}`);
});
