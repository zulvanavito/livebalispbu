const fs = require('fs');

const verified = JSON.parse(fs.readFileSync('scratch/verified_east_bali.json', 'utf8'));

const klungkungRaw = verified.filter(c => c.regency === 'Klungkung');
const karangasemRaw = verified.filter(c => c.regency === 'Karangasem');

console.log(`Klungkung raw: ${klungkungRaw.length}, Karangasem raw: ${karangasemRaw.length}`);

// Assign realistic Indonesian names and addresses based on location/district
const klungkungItems = klungkungRaw.map((item, idx) => {
  const code = `54.807.${(idx + 1).toString().padStart(2, '0')}`;
  const isNusaPenida = item.district === 'Nusa Penida';
  let name = '';
  let address = '';

  if (isNusaPenida) {
    if (idx === 0) {
      name = 'SPBU Pertamina Nusa Penida (Sampalan)';
      address = 'Jl. Ped - Buyuk, Batununggul, Kec. Nusa Penida, Kabupaten Klungkung';
    } else if (idx === 1) {
      name = 'SPBU Pertamina Toya Pakeh (Nusa Penida)';
      address = 'Jl. Raya Toya Pakeh, Ped, Kec. Nusa Penida, Kabupaten Klungkung';
    } else if (idx === 2) {
      name = 'SPBU Pertamina Batununggul (Nusa Penida)';
      address = 'Jl. Raya Batununggul, Kec. Nusa Penida, Kabupaten Klungkung';
    } else if (idx === 3) {
      name = 'SPBU Pertamina Ped (Nusa Penida)';
      address = 'Jl. Raya Ped, Kec. Nusa Penida, Kabupaten Klungkung';
    } else if (idx === 4) {
      name = 'SPBU Pertamina Jungutbatu (Nusa Lembongan)';
      address = 'Jl. Raya Jungutbatu, Nusa Lembongan, Kec. Nusa Penida, Kabupaten Klungkung';
    } else {
      name = `SPBU Pertamina Nusa Penida Unit ${idx + 1}`;
      address = `Jl. Raya Nusa Penida, Kec. Nusa Penida, Kabupaten Klungkung`;
    }
  } else {
    // Daratan Klungkung
    if (item.district === 'Banjarangkan') {
      name = `SPBU Pertamina Banjarangkan (Klungkung)`;
      address = `Jl. Raya Banjarangkan / Jl. By Pass Prof. Dr. Ida Bagus Mantra, Kec. Banjarangkan, Kabupaten Klungkung`;
    } else if (item.district === 'Dawan') {
      name = `SPBU Pertamina Kusamba (Dawan)`;
      address = `Jl. Raya Kusamba / Gunaksa, Kec. Dawan, Kabupaten Klungkung`;
    } else {
      name = `SPBU Pertamina Kota Semarapura`;
      address = `Jl. Diponegoro / Jl. Flamboyan, Semarapura, Kec. Klungkung, Kabupaten Klungkung`;
    }
  }

  const queueLevels = ['smooth', 'moderate', 'smooth', 'smooth', 'moderate'];
  const queue = queueLevels[idx % queueLevels.length];
  const waitMins = queue === 'congested' ? 35 : (queue === 'moderate' ? 15 : 5);

  return {
    id: `spbu-klungkung-${(idx + 1).toString().padStart(2, '0')}`,
    code,
    name,
    address,
    regency: 'Klungkung',
    district: item.district || 'Klungkung',
    coordinates: {
      lat: Number(item.lat.toFixed(6)),
      lng: Number(item.lng.toFixed(6))
    },
    queueLevel: queue,
    estimatedWaitMinutes: waitMins,
    fuelStock: {
      pertalite: idx % 4 === 2 ? 'low' : 'available',
      pertamax: 'available',
      solar: idx % 5 === 3 ? 'out_of_stock' : 'available',
      dexlite: 'available'
    },
    cctv: { hasCCTV: false },
    reportCount: 14 + (idx * 3) % 20,
    upvotes: 28 + (idx * 4) % 35,
    lastReportedAt: new Date(Date.now() - (idx * 15 * 60 * 1000)).toISOString()
  };
});

const karangasemItems = karangasemRaw.map((item, idx) => {
  const code = `54.808.${(idx + 1).toString().padStart(2, '0')}`;
  let name = '';
  let address = '';

  if (item.district === 'Manggis') {
    if (idx % 2 === 0) {
      name = `SPBU Pertamina Padangbai (Manggis)`;
      address = `Jl. Raya Padangbai / Pelabuhan, Kec. Manggis, Kabupaten Karangasem`;
    } else {
      name = `SPBU Pertamina Candidasa (Manggis)`;
      address = `Jl. Raya Candidasa - Sengkidu, Kec. Manggis, Kabupaten Karangasem`;
    }
  } else if (item.district === 'Abang') {
    name = `SPBU Pertamina Raya Abang (Amed)`;
    address = `Jl. Raya Abang - Culik, Kec. Abang, Kabupaten Karangasem`;
  } else if (item.district === 'Kubu') {
    name = `SPBU Pertamina Kubu (Tulamben)`;
    address = `Jl. Raya Kubu - Singaraja, Kec. Kubu, Kabupaten Karangasem`;
  } else if (item.district === 'Rendang') {
    name = `SPBU Pertamina Rendang (Besakih)`;
    address = `Jl. Raya Rendang - Besakih, Kec. Rendang, Kabupaten Karangasem`;
  } else if (item.district === 'Bebandem') {
    name = `SPBU Pertamina Bebandem (Karangasem)`;
    address = `Jl. Raya Bebandem, Kec. Bebandem, Kabupaten Karangasem`;
  } else {
    name = `SPBU Pertamina Kota Amlapura`;
    address = `Jl. Veteran / Jl. Sudirman, Amlapura, Kec. Karangasem, Kabupaten Karangasem`;
  }

  const queueLevels = ['smooth', 'smooth', 'moderate', 'smooth', 'congested'];
  const queue = queueLevels[idx % queueLevels.length];
  const waitMins = queue === 'congested' ? 40 : (queue === 'moderate' ? 15 : 5);

  return {
    id: `spbu-karangasem-${(idx + 1).toString().padStart(2, '0')}`,
    code,
    name,
    address,
    regency: 'Karangasem',
    district: item.district || 'Karangasem',
    coordinates: {
      lat: Number(item.lat.toFixed(6)),
      lng: Number(item.lng.toFixed(6))
    },
    queueLevel: queue,
    estimatedWaitMinutes: waitMins,
    fuelStock: {
      pertalite: idx % 5 === 1 ? 'low' : 'available',
      pertamax: 'available',
      solar: idx % 4 === 2 ? 'out_of_stock' : 'available',
      dexlite: 'available'
    },
    cctv: { hasCCTV: false },
    reportCount: 16 + (idx * 2) % 25,
    upvotes: 32 + (idx * 3) % 40,
    lastReportedAt: new Date(Date.now() - (idx * 13 * 60 * 1000)).toISOString()
  };
});

const allFormatted = [...klungkungItems, ...karangasemItems];
console.log(`Total formatted new items: ${allFormatted.length}`);
fs.writeFileSync('scratch/spbu_klungkung_karangasem_formatted.json', JSON.stringify(allFormatted, null, 2));

console.log('Sample Klungkung:', klungkungItems[0]);
console.log('Sample Karangasem:', karangasemItems[0]);
