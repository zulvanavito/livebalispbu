const fs = require('fs');
const clean = JSON.parse(fs.readFileSync('scratch/gianyar_buleleng_clean.json', 'utf8'));

console.log('--- SAMPLE GIANYAR (first 10) ---');
clean.gianyar.slice(0, 10).forEach(p => {
  console.log(`[${p.id}] ${p.tags.name || p.tags.operator || 'No Name'} | brand: ${p.tags.brand || ''} | lat: ${p.coord.lat.toFixed(5)}, lng: ${p.coord.lng.toFixed(5)}`);
});

console.log('\n--- SAMPLE BULELENG (first 10) ---');
clean.buleleng.slice(0, 10).forEach(p => {
  console.log(`[${p.id}] ${p.tags.name || p.tags.operator || 'No Name'} | brand: ${p.tags.brand || ''} | lat: ${p.coord.lat.toFixed(5)}, lng: ${p.coord.lng.toFixed(5)}`);
});
