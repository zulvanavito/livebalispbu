const fs = require('fs');

const raw = JSON.parse(fs.readFileSync('scratch/osm_tabanan_jembrana.json', 'utf8'));
console.log(`Total raw elements: ${raw.elements.length}`);

// Distinguish Jembrana (approx lng 114.40 - 114.93) and Tabanan (approx lng 114.93 - 115.22, lat -8.65 to -8.25)
// Also filter out any that might be in Buleleng (lat > -8.28 in the north) or Badung (lng > 115.18 south)
// And existing SPBUs in INITIAL_SPBU_DATA to avoid any duplication!

const spbuFile = fs.readFileSync('src/data/spbu-denpasar-badung.ts', 'utf8');
const existingIds = new Set();
const existingCoords = [];
for (const match of spbuFile.matchAll(/"id":\s*"([^"]+)"/g)) {
  existingIds.add(match[1]);
}
for (const match of spbuFile.matchAll(/"coordinates":\s*\{\s*"lat":\s*([0-9.-]+),\s*"lng":\s*([0-9.-]+)\s*\}/g)) {
  existingCoords.push({ lat: parseFloat(match[1]), lng: parseFloat(match[2]) });
}
console.log(`Existing SPBUs in DB: ${existingIds.size}`);

const candidates = [];
for (const el of raw.elements) {
  const lat = el.lat || (el.center && el.center.lat);
  const lng = el.lon || (el.center && el.center.lon);
  if (!lat || !lng) continue;

  // Check distance to existing points (threshold ~150 meters)
  let isDup = false;
  for (const ex of existingCoords) {
    const dLat = Math.abs(ex.lat - lat);
    const dLng = Math.abs(ex.lng - lng);
    if (dLat < 0.0015 && dLng < 0.0015) {
      isDup = true;
      break;
    }
  }
  if (isDup) continue;

  const tags = el.tags || {};
  const name = tags.name || tags.operator || tags.brand || 'SPBU Pertamina';
  
  // Categorize regency roughly by coordinates:
  // Jembrana: west of 114.93, south of -8.18
  // Tabanan: east of 114.93 and west of 115.22, south of -8.25
  let regency = 'Unknown';
  if (lng < 114.93) {
    regency = 'Jembrana';
  } else if (lng >= 114.93 && lng <= 115.22 && lat <= -8.25) {
    regency = 'Tabanan';
  }

  candidates.push({
    id: el.id,
    type: el.type,
    lat,
    lng,
    regency,
    name,
    brand: tags.brand,
    operator: tags.operator,
    street: tags['addr:street'],
    city: tags['addr:city'],
    postcode: tags['addr:postcode'],
    tags
  });
}

console.log(`Unique candidates: ${candidates.length}`);
const regencyCount = {};
candidates.forEach(c => regencyCount[c.regency] = (regencyCount[c.regency] || 0) + 1);
console.log('Regency distribution:', regencyCount);

fs.writeFileSync('scratch/candidates_tabanan_jembrana.json', JSON.stringify(candidates, null, 2));
