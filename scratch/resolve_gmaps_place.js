const https = require('https');

const url = 'https://www.google.com/maps/search/?api=1&query=SPBU+5481114+Gajah+Mada+Singaraja';

https.get(url, (res) => {
  console.log('Status:', res.statusCode);
  console.log('Location:', res.headers.location);
  let body = '';
  res.on('data', c => body += c);
  res.on('end', () => {
    // Search for coordinates pattern in google maps html
    const matches = [...body.matchAll(/(-8\.\d{4,8})[\s,]+(115\.\d{4,8})/g)];
    console.log('Matches found:', matches.length);
    matches.slice(0, 10).forEach(m => console.log('Coord:', m[1], m[2]));
  });
});
