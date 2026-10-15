const fs = require('fs');

const geocoded = JSON.parse(fs.readFileSync('scratch/geocoded_results.json', 'utf8'));

const bangliPoints = [];

for (const id in geocoded) {
  const item = geocoded[id];
  const addr = item.geo && item.geo.address ? item.geo.address : {};
  const regionStr = `${addr.region || ''} ${addr.county || ''} ${addr.city || ''} ${addr.state_district || ''}`.toLowerCase();
  
  if (regionStr.includes('bangli')) {
    bangliPoints.push({
      id,
      coord: item.coord,
      osmTags: item.osmTags,
      address: addr,
      displayName: item.geo ? item.geo.displayName : ''
    });
  }
}

console.log('Points identified as Bangli in previous geocoding:', bangliPoints.length);
bangliPoints.forEach((p, i) => {
  console.log(`[${i+1}] ID:${p.id} | Name:${p.osmTags.name || '-'} | Road:${p.address.road || p.address.village || '-'} | Lat:${p.coord.lat.toFixed(5)}, Lng:${p.coord.lng.toFixed(5)}`);
});
