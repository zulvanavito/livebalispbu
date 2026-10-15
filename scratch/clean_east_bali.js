const fs = require('fs');

const raw = JSON.parse(fs.readFileSync('scratch/clean_klungkung_karangasem.json', 'utf8'));

// Filter out pertamini, pertashop, small garage, bensin motorbike
const excludedWords = ['petramini', 'pertamini', 'pertashop', 'small garage', 'bensin motorbike', 'minicon'];

const valid = raw.filter(item => {
  const name = item.name.toLowerCase();
  for (const word of excludedWords) {
    if (name.includes(word)) return false;
  }
  return true;
});

// Deduplicate points closer than 150m
const deduped = [];
for (const item of valid) {
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

console.log(`Clean verified SPBUs: ${deduped.length}`);
const stats = {};
deduped.forEach(d => stats[d.regency] = (stats[d.regency] || 0) + 1);
console.log('Stats:', stats);

fs.writeFileSync('scratch/verified_east_bali.json', JSON.stringify(deduped, null, 2));
