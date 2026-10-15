const fs = require('fs');

const clean = JSON.parse(fs.readFileSync('scratch/gianyar_buleleng_clean.json', 'utf8'));

// Filter out bogus/pertamini tags
function isLegitSPBU(p) {
  const name = (p.tags.name || '').toLowerCase();
  const operator = (p.tags.operator || '').toLowerCase();
  const brand = (p.tags.brand || '').toLowerCase();
  const text = `${name} ${operator} ${brand}`;
  
  if (text.includes('petramini') || text.includes('pertamini') || text.includes('small place')) {
    return false;
  }
  return true;
}

const legitGianyar = clean.gianyar.filter(isLegitSPBU);
const legitBuleleng = clean.buleleng.filter(isLegitSPBU);

console.log(`Legit Gianyar candidates: ${legitGianyar.length}`);
console.log(`Legit Buleleng candidates: ${legitBuleleng.length}`);

fs.writeFileSync('scratch/legit_candidates.json', JSON.stringify({ legitGianyar, legitBuleleng }, null, 2));
