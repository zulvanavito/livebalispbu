const fs = require('fs');

const { gianyarList, bulelengList } = JSON.parse(fs.readFileSync('scratch/parsed_gianyar_buleleng.json', 'utf8'));

// Format clean Indonesian SPBU object
function formatGianyarSPBU(item, index) {
  const codeNum = String(index + 1).padStart(2, '0');
  const code = `54.805.${codeNum}`;
  
  // Refine District and Name based on coordinates and road/village
  let district = item.district || 'Gianyar';
  let landmark = item.village || item.road || 'Kota';

  const lat = item.coord.lat;
  const lng = item.coord.lng;

  // Spatial district refinement for Gianyar
  if (lat < -8.56 && lng < 115.30) {
    district = 'Sukawati';
  } else if (lat < -8.55 && lng >= 115.30 && lng < 115.34) {
    district = 'Blahbatuh';
  } else if (lat >= -8.55 && lat < -8.50 && lng >= 115.31) {
    district = 'Gianyar';
  } else if (lat >= -8.54 && lat < -8.49 && lng < 115.30) {
    district = 'Ubud';
  } else if (lat >= -8.49 && lat < -8.43 && lng >= 115.28 && lng < 115.33) {
    district = 'Tegallalang';
  } else if (lat >= -8.49 && lat < -8.43 && lng >= 115.33) {
    district = 'Tampaksiring';
  } else if (lat >= -8.45 && lng < 115.28) {
    district = 'Payangan';
  }

  // Name customization
  let name = `SPBU Pertamina ${code} ${district}`;
  const osmName = item.osmTags.name || '';
  if (osmName && osmName.length > 5 && !osmName.includes('Pelumas') && !osmName.toLowerCase().includes('no name')) {
    name = osmName.startsWith('SPBU') ? osmName : `SPBU ${osmName}`;
  } else {
    name = `SPBU Pertamina ${item.road || district} (${district})`;
  }

  return {
    id: `spbu-gianyar-${codeNum}`,
    code,
    name: name.replace(/\s+/g, ' ').trim(),
    address: `${item.road}, Kec. ${district}, Kabupaten Gianyar`,
    regency: 'Gianyar',
    district,
    coordinates: {
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6))
    },
    queueLevel: index % 4 === 0 ? 'congested' : (index % 3 === 0 ? 'moderate' : 'smooth'),
    estimatedWaitMinutes: index % 4 === 0 ? 30 : (index % 3 === 0 ? 15 : 5),
    fuelStock: {
      pertalite: index % 7 === 0 ? 'out_of_stock' : (index % 5 === 0 ? 'low' : 'available'),
      pertamax: 'available',
      solar: index % 6 === 0 ? 'out_of_stock' : 'available',
      dexlite: 'available'
    },
    cctv: {
      hasCCTV: false
    },
    reportCount: Math.floor(8 + (index * 3) % 25),
    upvotes: Math.floor(15 + (index * 5) % 45),
    lastReportedAt: new Date(Date.now() - (index * 12 + 10) * 60000).toISOString()
  };
}

function formatBulelengSPBU(item, index) {
  const codeNum = String(index + 1).padStart(2, '0');
  const code = `54.811.${codeNum}`;
  
  let district = item.district || 'Buleleng';
  const lat = item.coord.lat;
  const lng = item.coord.lng;

  // Spatial district refinement for Buleleng
  if (lng < 114.75) {
    district = 'Gerokgak';
  } else if (lng >= 114.75 && lng < 114.98 && lat >= -8.23) {
    district = 'Seririt';
  } else if (lng >= 114.85 && lng < 115.02 && lat < -8.23) {
    district = 'Busungbiu';
  } else if (lng >= 114.98 && lng < 115.05) {
    district = 'Banjar';
  } else if (lng >= 115.05 && lng < 115.13 && lat >= -8.15) {
    district = 'Buleleng';
  } else if (lng >= 115.05 && lng < 115.15 && lat < -8.15) {
    district = 'Sukasada';
  } else if (lng >= 115.13 && lng < 115.22) {
    district = 'Sawan';
  } else if (lng >= 115.22 && lng < 115.33) {
    district = 'Kubutambahan';
  } else if (lng >= 115.33) {
    district = 'Tejakula';
  }

  let name = `SPBU Pertamina ${code} ${district}`;
  const osmName = item.osmTags.name || '';
  if (osmName && osmName.length > 5 && !osmName.toLowerCase().includes('no name') && !osmName.includes('Cửa hàng')) {
    name = osmName.startsWith('SPBU') ? osmName : `SPBU ${osmName}`;
  } else {
    name = `SPBU Pertamina ${item.road || district} (${district})`;
  }

  return {
    id: `spbu-buleleng-${codeNum}`,
    code,
    name: name.replace(/\s+/g, ' ').trim(),
    address: `${item.road}, Kec. ${district}, Kabupaten Buleleng`,
    regency: 'Buleleng',
    district,
    coordinates: {
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6))
    },
    queueLevel: index % 5 === 0 ? 'congested' : (index % 2 === 0 ? 'moderate' : 'smooth'),
    estimatedWaitMinutes: index % 5 === 0 ? 35 : (index % 2 === 0 ? 15 : 5),
    fuelStock: {
      pertalite: index % 8 === 0 ? 'out_of_stock' : (index % 4 === 0 ? 'low' : 'available'),
      pertamax: 'available',
      solar: index % 5 === 0 ? 'out_of_stock' : 'available',
      dexlite: 'available'
    },
    cctv: {
      hasCCTV: false
    },
    reportCount: Math.floor(6 + (index * 2) % 22),
    upvotes: Math.floor(12 + (index * 4) % 40),
    lastReportedAt: new Date(Date.now() - (index * 15 + 8) * 60000).toISOString()
  };
}

const formattedGianyar = gianyarList.map(formatGianyarSPBU);
const formattedBuleleng = bulelengList.map(formatBulelengSPBU);

console.log(`Generated ${formattedGianyar.length} SPBUs for Gianyar`);
console.log(`Generated ${formattedBuleleng.length} SPBUs for Buleleng`);

fs.writeFileSync('scratch/spbu_gianyar_buleleng_formatted.json', JSON.stringify({
  gianyar: formattedGianyar,
  buleleng: formattedBuleleng
}, null, 2));
