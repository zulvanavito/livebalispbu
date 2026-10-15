const fs = require('fs');

const candidates = JSON.parse(fs.readFileSync('scratch/candidates_tabanan_jembrana.json', 'utf8'));

console.log('=== CANDIDATE SPBU TABANAN & JEMBRANA ===');
candidates.forEach((item, i) => {
  const loc = `${item.lat.toFixed(5)}, ${item.lng.toFixed(5)}`;
  const extra = item.street ? `Jl: ${item.street}` : (item.tags['name:id'] || item.tags.description || '');
  console.log(`${(i + 1).toString().padStart(2, '0')}. [${item.regency.padEnd(8)}] ${item.name.padEnd(35)} | ${loc} | ${extra}`);
});
