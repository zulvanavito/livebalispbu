const https = require('https');
const fs = require('fs');

const query = `[out:json][timeout:25];(node["amenity"="fuel"](-8.60,114.40,-8.15,115.22);way["amenity"="fuel"](-8.60,114.40,-8.15,115.22););out center tags;`;

const mirrors = [
  { host: 'maps.mail.ru', path: '/osm/tools/overpass/api/interpreter' },
  { host: 'lz4.overpass-api.de', path: '/api/interpreter' },
  { host: 'overpass-api.de', path: '/api/interpreter' },
  { host: 'overpass.kumi.systems', path: '/api/interpreter' },
];

async function tryMirror(m) {
  return new Promise((resolve) => {
    console.log(`Checking ${m.host}...`);
    const encoded = encodeURIComponent(query);
    const req = https.get(`https://${m.host}${m.path}?data=${encoded}`, {
      headers: { 'User-Agent': 'LiveSPBUBali/1.0' },
      timeout: 20000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json && json.elements) {
            fs.writeFileSync('scratch/osm_tabanan_jembrana.json', data);
            console.log(`SUCCESS! Found ${json.elements.length} fuel locations via ${m.host}`);
            resolve(true);
            return;
          }
        } catch (e) {
          console.log(`Response error from ${m.host}: ${data.slice(0, 80)}`);
        }
        resolve(false);
      });
    });
    req.on('error', (e) => {
      console.log(`Network error on ${m.host}: ${e.message}`);
      resolve(false);
    });
  });
}

(async () => {
  for (const m of mirrors) {
    if (await tryMirror(m)) break;
  }
})();
