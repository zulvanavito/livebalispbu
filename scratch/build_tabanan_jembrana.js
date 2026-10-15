const fs = require('fs');

const clean = JSON.parse(fs.readFileSync('scratch/clean_tabanan_jembrana.json', 'utf8'));

// Format to SPBUItem schema:
// {
//   id: string;
//   code: string;
//   name: string;
//   address: string;
//   regency: BaliRegency;
//   district: string;
//   coordinates: { lat: number; lng: number };
//   queueLevel: 'smooth' | 'moderate' | 'congested' | 'empty';
//   estimatedWaitMinutes: number;
//   fuelStock: { pertalite: StockStatus; pertamax: StockStatus; solar: StockStatus; dexlite?: StockStatus };
//   cctv: { hasCCTV: boolean; streamUrl?: string; ... };
//   reportCount: number;
//   upvotes: number;
//   lastReportedAt: string;
// }

// Let's analyze districts based on coordinates:
// Tabanan districts:
// - Kediri: lat -8.53 to -8.58, lng 115.06 to 115.15
// - Tabanan Kota: lat -8.51 to -8.55, lng 115.11 to 115.15
// - Kerambitan: lat -8.50 to -8.56, lng 115.04 to 115.08
// - Selemadeg: lat -8.48 to -8.53, lng 115.00 to 115.04 (Bajera)
// - Selemadeg Timur: lat -8.50 to -8.54, lng 115.03 to 115.07 (Megati)
// - Selemadeg Barat: lat -8.45 to -8.52, lng 114.93 to 115.00 (Surabrata / Antosari)
// - Baturiti (Bedugul): lat -8.25 to -8.38, lng 115.16 to 115.22
// - Penebel / Marga: lat -8.40 to -8.48, lng 115.12 to 115.20
// - Pupuan: lat -8.30 to -8.38, lng 114.98 to 115.05

// Jembrana districts:
// - Melaya (incl. Gilimanuk): lat -8.16 to -8.30, lng 114.42 to 114.54
// - Negara: lat -8.32 to -8.38, lng 114.58 to 114.65
// - Jembrana: lat -8.34 to -8.39, lng 114.62 to 114.70
// - Mendoyo: lat -8.38 to -8.42, lng 114.70 to 114.82
// - Pekutatan: lat -8.40 to -8.46, lng 114.82 to 114.93 (Medewi, Pulukan, Gumbrih)

function assignDistrictAndName(item, idx, regency) {
  const { lat, lng } = item;
  let district = '';
  let name = '';
  let address = '';
  let code = '';

  if (regency === 'Tabanan') {
    code = `54.821.${(idx + 1).toString().padStart(2, '0')}`;
    if (lat >= -8.38 && lng >= 115.16) {
      district = 'Baturiti';
      name = `SPBU Pertamina Baturiti (Bedugul ${idx + 1})`;
      address = `Jl. Raya Denpasar - Singaraja, Baturiti, Kabupaten Tabanan`;
    } else if (lat < -8.30 && lng < 115.06) {
      district = 'Pupuan';
      name = `SPBU Pertamina Raya Pupuan`;
      address = `Jl. Raya Seririt - Pupuan, Kec. Pupuan, Kabupaten Tabanan`;
    } else if (lng <= 114.98) {
      district = 'Selemadeg Barat';
      name = `SPBU Pertamina Surabrata (Selemadeg Barat)`;
      address = `Jl. Raya Denpasar - Gilimanuk, Lalanglinggah, Kec. Selemadeg Barat, Kabupaten Tabanan`;
    } else if (lng <= 115.04) {
      district = 'Selemadeg';
      name = `SPBU Pertamina Bajera (Selemadeg)`;
      address = `Jl. Raya Denpasar - Gilimanuk, Bajera, Kec. Selemadeg, Kabupaten Tabanan`;
    } else if (lng <= 115.08) {
      district = 'Kerambitan';
      name = `SPBU Pertamina Kerambitan`;
      address = `Jl. Raya Denpasar - Gilimanuk, Kec. Kerambitan, Kabupaten Tabanan`;
    } else if (lat >= -8.50 && lat <= -8.40 && lng >= 115.10 && lng <= 115.20) {
      district = 'Marga';
      name = `SPBU Pertamina Marga Tabanan`;
      address = `Jl. Raya Marga - Apuan, Kec. Marga, Kabupaten Tabanan`;
    } else if (lng >= 115.10 && lat <= -8.51) {
      district = 'Tabanan';
      name = `SPBU Pertamina Kota Tabanan`;
      address = `Jl. Pahlawan / Dr. Ir. Soekarno, Kec. Tabanan, Kabupaten Tabanan`;
    } else {
      district = 'Kediri';
      name = `SPBU Pertamina Kediri Tabanan`;
      address = `Jl. Raya Denpasar - Tabanan, Abiantuwung, Kec. Kediri, Kabupaten Tabanan`;
    }
  } else {
    // Jembrana
    code = `54.822.${(idx + 1).toString().padStart(2, '0')}`;
    if (lat <= -8.22 && lng <= 114.47) {
      district = 'Melaya';
      name = `SPBU Pertamina Gilimanuk (Pelabuhan)`;
      address = `Jl. Raya Pelabuhan Gilimanuk, Kec. Melaya, Kabupaten Jembrana`;
    } else if (lng <= 114.56) {
      district = 'Melaya';
      name = `SPBU Pertamina Melaya Jembrana`;
      address = `Jl. Raya Denpasar - Gilimanuk, Kec. Melaya, Kabupaten Jembrana`;
    } else if (lng <= 114.63) {
      district = 'Negara';
      name = `SPBU Pertamina Kota Negara`;
      address = `Jl. Jenderal Sudirman / Ngurah Rai, Dauhwaru, Kec. Negara, Kabupaten Jembrana`;
    } else if (lng <= 114.71) {
      district = 'Jembrana';
      name = `SPBU Pertamina Dangintukadaya (Jembrana)`;
      address = `Jl. Raya Denpasar - Gilimanuk, Kec. Jembrana, Kabupaten Jembrana`;
    } else if (lng <= 114.81) {
      district = 'Mendoyo';
      name = `SPBU Pertamina Mendoyo (Penyaringan)`;
      address = `Jl. Raya Denpasar - Gilimanuk, Penyaringan, Kec. Mendoyo, Kabupaten Jembrana`;
    } else {
      district = 'Pekutatan';
      name = `SPBU Pertamina Pekutatan (Medewi)`;
      address = `Jl. Raya Denpasar - Gilimanuk, Medewi / Pulukan, Kec. Pekutatan, Kabupaten Jembrana`;
    }
  }

  // Refine specific names if OSM had real names:
  if (item.name && item.name !== 'Pertamina' && item.name !== 'Fuel Station' && item.name !== 'SPBU Pertamina' && item.name !== 'SPBU') {
    name = item.name.replace(/54\.\d{3}\.\d+/g, '').trim();
    if (!name.toLowerCase().startsWith('spbu')) name = `SPBU ${name}`;
  }

  return { district, name, address, code };
}

const tabananRaw = clean.filter(c => c.regency === 'Tabanan');
const jembranaRaw = clean.filter(c => c.regency === 'Jembrana');

console.log(`Tabanan raw: ${tabananRaw.length}, Jembrana raw: ${jembranaRaw.length}`);

const tabananItems = tabananRaw.map((item, idx) => {
  const meta = assignDistrictAndName(item, idx, 'Tabanan');
  const queueLevels = ['smooth', 'smooth', 'moderate', 'smooth', 'moderate'];
  const queue = queueLevels[idx % queueLevels.length];
  const waitMins = queue === 'congested' ? 35 : (queue === 'moderate' ? 15 : 5);
  
  return {
    id: `spbu-tabanan-${(idx + 1).toString().padStart(2, '0')}`,
    code: meta.code,
    name: meta.name,
    address: meta.address,
    regency: 'Tabanan',
    district: meta.district,
    coordinates: {
      lat: Number(item.lat.toFixed(6)),
      lng: Number(item.lng.toFixed(6))
    },
    queueLevel: queue,
    estimatedWaitMinutes: waitMins,
    fuelStock: {
      pertalite: idx % 6 === 3 ? 'low' : 'available',
      pertamax: 'available',
      solar: idx % 5 === 4 ? 'out_of_stock' : 'available',
      dexlite: 'available'
    },
    cctv: { hasCCTV: false },
    reportCount: 12 + (idx * 2) % 20,
    upvotes: 25 + (idx * 3) % 35,
    lastReportedAt: new Date(Date.now() - (idx * 17 * 60 * 1000)).toISOString()
  };
});

const jembranaItems = jembranaRaw.map((item, idx) => {
  const meta = assignDistrictAndName(item, idx, 'Jembrana');
  const queueLevels = ['moderate', 'smooth', 'smooth', 'moderate', 'congested'];
  const queue = queueLevels[idx % queueLevels.length];
  const waitMins = queue === 'congested' ? 40 : (queue === 'moderate' ? 15 : 5);

  return {
    id: `spbu-jembrana-${(idx + 1).toString().padStart(2, '0')}`,
    code: meta.code,
    name: meta.name,
    address: meta.address,
    regency: 'Jembrana',
    district: meta.district,
    coordinates: {
      lat: Number(item.lat.toFixed(6)),
      lng: Number(item.lng.toFixed(6))
    },
    queueLevel: queue,
    estimatedWaitMinutes: waitMins,
    fuelStock: {
      pertalite: idx % 5 === 2 ? 'low' : 'available',
      pertamax: 'available',
      solar: idx % 4 === 1 ? 'out_of_stock' : 'available',
      dexlite: 'available'
    },
    cctv: { hasCCTV: false },
    reportCount: 15 + (idx * 2) % 25,
    upvotes: 30 + (idx * 4) % 40,
    lastReportedAt: new Date(Date.now() - (idx * 14 * 60 * 1000)).toISOString()
  };
});

const allFormatted = [...tabananItems, ...jembranaItems];
console.log(`Total formatted new items: ${allFormatted.length}`);
fs.writeFileSync('scratch/spbu_tabanan_jembrana_formatted.json', JSON.stringify(allFormatted, null, 2));

// Test formatting sample:
console.log('Sample Tabanan:', tabananItems[0]);
console.log('Sample Jembrana:', jembranaItems[0]);
