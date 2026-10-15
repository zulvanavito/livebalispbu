const https = require('https');

const query = `
[out:json][timeout:25];
(
  node["amenity"="fuel"](-8.130, 115.085, -8.110, 115.105);
  way["amenity"="fuel"](-8.130, 115.085, -8.110, 115.105);
  node["name"~"Pertamina|SPBU",i](-8.130, 115.085, -8.110, 115.105);
  way["name"~"Pertamina|SPBU",i](-8.130, 115.085, -8.110, 115.105);
);
out center tags;
`;

const postData = 'data=' + encodeURIComponent(query);
const req = https.request({
  hostname: 'overpass.kumi.systems',
  path: '/api/interpreter',
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': Buffer.byteLength(postData),
    'User-Agent': 'LiveSPBUBali/1.0'
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    try {
      const data = JSON.parse(body);
      console.log('Found elements:', data.elements.length);
      data.elements.forEach(f => {
        const lat = f.lat || (f.center && f.center.lat);
        const lon = f.lon || (f.center && f.center.lon);
        console.log(`ID: ${f.id} | Name: ${f.tags.name} | Lat: ${lat}, Lon: ${lon} | Tags:`, f.tags);
      });
    } catch(e) {
      console.error(e);
    }
  });
});
req.write(postData);
req.end();
