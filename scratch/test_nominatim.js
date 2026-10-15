const https = require('https');

function reverseGeocode(lat, lon) {
  return new Promise((resolve) => {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;
    https.get(url, {
      headers: {
        'User-Agent': 'LiveSPBUBali_App/1.0 (bali_spbu_tracker@livebali.id)'
      }
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
    }).on('error', () => resolve(null));
  });
}

async function test() {
  const r1 = await reverseGeocode(-8.52316, 115.27594);
  console.log('Sample Gianyar:', r1 ? r1.display_name : 'failed');
  if (r1 && r1.address) console.log('Address details:', r1.address);
}

test();
