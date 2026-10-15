const fs = require('fs');

const geocoded = JSON.parse(fs.readFileSync('scratch/geocoded_results.json', 'utf8'));

const gianyarList = [];
const bulelengList = [];
const otherList = [];

for (const id in geocoded) {
  const item = geocoded[id];
  const geo = item.geo;
  if (!geo || !geo.address) continue;
  
  const addr = geo.address;
  const regionStr = `${addr.region || ''} ${addr.county || ''} ${addr.city || ''} ${addr.state_district || ''}`.toLowerCase();
  
  // Clean district name
  const rawDistrict = addr.town || addr.city_district || addr.suburb || addr.municipality || addr.district || '';
  const road = addr.road || addr.village || addr.hamlet || 'Jalan Raya';
  const village = addr.village || addr.suburb || addr.hamlet || '';

  if (regionStr.includes('gianyar') || item.targetRegency === 'Gianyar' && !regionStr.includes('bangli') && !regionStr.includes('klungkung')) {
    gianyarList.push({
      id,
      coord: item.coord,
      osmTags: item.osmTags,
      road,
      village,
      district: rawDistrict || 'Gianyar',
      fullAddress: `${road}, ${village ? village + ', ' : ''}Gianyar`,
      region: 'Gianyar'
    });
  } else if (regionStr.includes('buleleng') || (item.targetRegency === 'Buleleng' && !regionStr.includes('jembrana') && !regionStr.includes('tabanan') && !regionStr.includes('bangli'))) {
    bulelengList.push({
      id,
      coord: item.coord,
      osmTags: item.osmTags,
      road,
      village,
      district: rawDistrict || 'Buleleng',
      fullAddress: `${road}, ${village ? village + ', ' : ''}Buleleng`,
      region: 'Buleleng'
    });
  } else {
    otherList.push({ id, regionStr });
  }
}

console.log(`Gianyar: ${gianyarList.length} SPBUs`);
console.log(`Buleleng: ${bulelengList.length} SPBUs`);
console.log(`Excluded other regencies (Bangli/Tabanan/Jembrana/Klungkung border): ${otherList.length}`);

fs.writeFileSync('scratch/parsed_gianyar_buleleng.json', JSON.stringify({ gianyarList, bulelengList }, null, 2));
