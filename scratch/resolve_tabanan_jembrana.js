const fs = require('fs');
const https = require('https');

const candidates = JSON.parse(fs.readFileSync('scratch/candidates_tabanan_jembrana.json', 'utf8'));

// Filter out junk (petramini, minicon, pertashop)
const validCandidates = candidates.filter(item => {
  const name = item.name.toLowerCase();
  if (name.includes('petramini') || name.includes('minicon')) return false;
  return true;
});

// Deduplicate very close points (< 100 meters, approx 0.001 deg)
const deduped = [];
for (const item of validCandidates) {
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

console.log(`Deduplicated valid SPBU stations: ${deduped.length}`);
const stats = {};
deduped.forEach(d => stats[d.regency] = (stats[d.regency] || 0) + 1);
console.log('Count by regency:', stats);

fs.writeFileSync('scratch/clean_tabanan_jembrana.json', JSON.stringify(deduped, null, 2));
