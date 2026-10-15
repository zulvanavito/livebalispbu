// Simple OLC decoder
const CODE_ALPHABET = "23456789CFGHJMPQRVWX";

function decodeOLC(code) {
  // Pad with Singaraja prefix: Singaraja is around -8.11, 115.09
  // 20-degree block for Bali is 6P (South of equator: -20 to 0 is 6)
  // Let's test standard Open Location Code for Bali
  // Bali is in area "6PH4"
  const fullCode = "6PH4" + code.replace("+", "");
  console.log("Full code:", fullCode);
  
  let minLat = -90, maxLat = 90;
  let minLng = -180, maxLng = 180;
  
  for (let i = 0; i < 10; i += 2) {
    const latChar = fullCode[i];
    const lngChar = fullCode[i+1];
    const latVal = CODE_ALPHABET.indexOf(latChar);
    const lngVal = CODE_ALPHABET.indexOf(lngChar);
    
    const latGrid = (maxLat - minLat) / 20;
    const lngGrid = (maxLng - minLng) / 20;
    
    maxLat = minLat + (latVal + 1) * latGrid;
    minLat = minLat + latVal * latGrid;
    
    maxLng = minLng + (lngVal + 1) * lngGrid;
    minLng = minLng + lngVal * lngGrid;
  }
  
  const lat = (minLat + maxLat) / 2;
  const lng = (minLng + maxLng) / 2;
  console.log(`Decoded: lat = ${lat}, lng = ${lng}`);
}

decodeOLC("V3QV+56Q");
