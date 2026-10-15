const fs = require('fs');

const content = fs.readFileSync('src/data/spbu-denpasar-badung.ts', 'utf8');
const data = eval(content.match(/export const INITIAL_SPBU_DATA: SPBUItem\[\] = (\[[\s\S]*\]);/)[1]);

data.forEach(s => {
  // 1. Fix Gajah Mada Singaraja
  if (s.id === 'spbu-buleleng-05' || s.address.includes('Gajah Mada')) {
    s.code = '54.811.14';
    s.name = 'SPBU Pertamina Gajah Mada (Singaraja)';
    s.address = 'Jl. Gajah Mada, Kelurahan Banjar Jawa, Kec. Buleleng, Kabupaten Buleleng';
    s.district = 'Buleleng';
    s.coordinates = {
      lat: -8.11626,
      lng: 115.09494
    };
  }

  // 2. Fix Sudirman / Banyuasri
  if (s.id === 'spbu-buleleng-11') {
    s.code = '54.811.02';
    s.name = 'SPBU Pertamina Banyuasri (Sudirman Singaraja)';
    s.address = 'Jl. Panglima Sudirman, Banyuasri, Kec. Buleleng, Kabupaten Buleleng';
  }

  // 3. Fix A. Yani / Kaliuntu
  if (s.id === 'spbu-buleleng-22') {
    s.code = '54.811.15';
    s.name = 'SPBU Pertamina Ahmad Yani / Kaliuntu (Singaraja)';
    s.address = 'Jl. Ahmad Yani, Kaliuntu, Kec. Buleleng, Kabupaten Buleleng';
  }

  // 4. Fix Surapati
  if (s.id === 'spbu-buleleng-20') {
    s.name = 'SPBU Pertamina Surapati (Singaraja)';
    s.address = 'Jl. Surapati, Kampung Anyar, Kec. Buleleng, Kabupaten Buleleng';
  }

  // 5. Fix Laksamana
  if (s.id === 'spbu-buleleng-21') {
    s.name = 'SPBU Pertamina Laksamana (Baktiseraga Singaraja)';
    s.address = 'Jl. Laksamana, Baktiseraga, Kec. Buleleng, Kabupaten Buleleng';
  }

  // 6. Fix Kubutambahan / Air Sanih
  if (s.id === 'spbu-buleleng-01') {
    s.name = 'SPBU Pertamina Kubutambahan (Air Sanih)';
    s.address = 'Jl. Raya Singaraja - Amlapura, Kubutambahan, Kabupaten Buleleng';
  }

  // 7. Fix Dencarik Banjar
  if (s.id === 'spbu-buleleng-10') {
    s.name = 'SPBU Pertamina Dencarik (Banjar)';
    s.address = 'Jl. Raya Seririt-Singaraja, Dencarik, Kec. Banjar, Kabupaten Buleleng';
  }

  // 8. Fix Kalianget Seririt
  if (s.id === 'spbu-buleleng-18') {
    s.name = 'SPBU Pertamina Kalianget (Seririt)';
    s.address = 'Jl. Raya Seririt-Gilimanuk, Kalianget, Kec. Seririt, Kabupaten Buleleng';
  }

  // 9. Fix Sukasada
  if (s.id === 'spbu-buleleng-19') {
    s.code = '54.811.04';
    s.name = 'SPBU Pertamina Sukasada (Jelantik Gingsir)';
    s.address = 'Jl. Jelantik Gingsir, Sukasada, Kabupaten Buleleng';
  }

  // 10. Fix Tukad Mungga / Anturan
  if (s.id === 'spbu-buleleng-33') {
    s.code = '54.811.01';
    s.name = 'SPBU Pertamina Tukad Mungga / Anturan (Singaraja)';
    s.address = 'Jl. Raya Singaraja-Seririt, Anturan, Kec. Buleleng, Kabupaten Buleleng';
  }

  // Generic fallback if any 'SPBU Pertamina' is left in Buleleng
  if (s.regency === 'Buleleng' && s.name === 'SPBU Pertamina') {
    const road = s.address.split(',')[0].replace('Jalan', 'Jl.');
    s.name = `SPBU Pertamina ${road} (${s.district})`;
  }
});

const output = `import { SPBUItem } from '@/types/spbu';

export const INITIAL_SPBU_DATA: SPBUItem[] = ${JSON.stringify(data, null, 2)};
`;

fs.writeFileSync('src/data/spbu-denpasar-badung.ts', output, 'utf8');
console.log('Successfully calibrated Buleleng and Gajah Mada SPBUs!');
