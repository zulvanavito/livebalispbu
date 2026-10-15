const https = require('https');
const fs = require('fs');

const query = `
[out:json][timeout:30];
(
  node["amenity"="fuel"](-8.62, 115.24, -8.38, 115.38);
  way["amenity"="fuel"](-8.62, 115.24, -8.38, 115.38);
  node["amenity"="fuel"](-8.35, 114.45, -8.08, 115.45);
  way["amenity"="fuel"](-8.35, 114.45, -8.08, 115.45);
);
out center tags;
`;

const hosts = ['overpass.kumi.systems', 'overpass.private.coffee', 'maps.mail.ru'];

async function tryHost(host) {
  return new Promise((resolve, reject) => {
    console.log(`Trying host: ${host}...`);
    const postData = 'data=' + encodeURIComponent(query);
    const req = https.request({
      hostname: host,
      path: '/api/interpreter',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'LiveSPBUBali/1.0'
      },
      timeout: 20000
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          if (data && data.elements) {
            fs.writeFileSync('scratch/osm_gianyar_buleleng.json', body);
            console.log(`Success on ${host}! Total elements: ${data.elements.length}`);
            resolve(true);
            return;
          }
        } catch(e) {}
        console.log(`Failed on ${host}: ${body.slice(0, 100)}`);
        resolve(false);
      });
    });
    req.on('error', (err) => {
      console.log(`Error on ${host}: ${err.message}`);
      resolve(false);
    });
    req.write(postData);
    req.end();
  });
}

async function run() {
  for (const host of hosts) {
    const ok = await tryHost(host);
    if (ok) break;
  }
}

run();
