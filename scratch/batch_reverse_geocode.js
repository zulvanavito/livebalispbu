const https = require('https');
const fs = require('fs');

const { legitGianyar, legitBuleleng } = JSON.parse(fs.readFileSync('scratch/legit_candidates.json', 'utf8'));

let results = {};
if (fs.existsSync('scratch/geocoded_results.json')) {
  try {
    results = JSON.parse(fs.readFileSync('scratch/geocoded_results.json', 'utf8'));
  } catch(e) {}
}

function reverseGeocode(lat, lon) {
  return new Promise((resolve) => {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;
    const req = https.get(url, {
      headers: {
        'User-Agent': 'LiveSPBUBaliGeocode/1.0 (bali_survey@livebali.id)'
      },
      timeout: 10000
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve(json);
        } catch(e) {
          resolve(null);
        }
      });
    });
    req.on('error', () => resolve(null));
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  const all = [
    ...legitGianyar.map(p => ({ ...p, targetRegency: 'Gianyar' })),
    ...legitBuleleng.map(p => ({ ...p, targetRegency: 'Buleleng' }))
  ];

  console.log(`Starting geocoding for ${all.length} points...`);
  
  let count = 0;
  for (const item of all) {
    count++;
    if (results[item.id]) {
      continue;
    }

    const res = await reverseGeocode(item.coord.lat, item.coord.lng);
    results[item.id] = {
      id: item.id,
      coord: item.coord,
      targetRegency: item.targetRegency,
      osmTags: item.tags,
      geo: res ? {
        displayName: res.display_name,
        address: res.address || {}
      } : null
    };

    fs.writeFileSync('scratch/geocoded_results.json', JSON.stringify(results, null, 2));
    const addr = res && res.address ? (res.address.road || res.address.village || res.address.town || 'unknown') : 'failed';
    const reg = res && res.address ? (res.address.region || res.address.county || res.address.city || '') : '';
    console.log(`[${count}/${all.length}] ID:${item.id} -> ${addr} (${reg})`);

    await sleep(850);
  }

  console.log('Finished reverse geocoding all items!');
}

run();
