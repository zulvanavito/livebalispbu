const fs = require('fs');
const clean = JSON.parse(fs.readFileSync('scratch/gianyar_buleleng_clean.json', 'utf8'));

console.log('=== BULELENG POINTS (36 to 66) ===');
clean.buleleng.slice(35).forEach((p, idx) => {
  console.log(`${idx+36}. ID:${p.id} | Name:${p.tags.name || '-'} | Ref:${p.tags.ref || '-'} | St:${p.tags['addr:street'] || '-'} | Lat:${p.coord.lat.toFixed(5)}, Lng:${p.coord.lng.toFixed(5)}`);
});
