const fs = require('fs');
const clean = JSON.parse(fs.readFileSync('scratch/gianyar_buleleng_clean.json', 'utf8'));

console.log('=== ALL GIANYAR POINTS ===');
clean.gianyar.forEach((p, idx) => {
  console.log(`${idx+1}. ID:${p.id} | Name:${p.tags.name || '-'} | Ref:${p.tags.ref || p.tags['brand:wikidata'] || '-'} | St:${p.tags['addr:street'] || '-'} | Lat:${p.coord.lat.toFixed(5)}, Lng:${p.coord.lng.toFixed(5)}`);
});

console.log('\n=== ALL BULELENG POINTS (First 35) ===');
clean.buleleng.slice(0, 35).forEach((p, idx) => {
  console.log(`${idx+1}. ID:${p.id} | Name:${p.tags.name || '-'} | Ref:${p.tags.ref || '-'} | St:${p.tags['addr:street'] || '-'} | Lat:${p.coord.lat.toFixed(5)}, Lng:${p.coord.lng.toFixed(5)}`);
});
