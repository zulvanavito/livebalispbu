const fs = require('fs');
const content = fs.readFileSync('src/data/spbu-denpasar-badung.ts', 'utf8');
const data = eval(content.match(/export const INITIAL_SPBU_DATA: SPBUItem\[\] = (\[[\s\S]*\]);/)[1]);
const buleleng = data.filter(s => s.regency === 'Buleleng');

console.log('Total Buleleng:', buleleng.length);
buleleng.forEach((s, i) => {
  if (s.name === 'SPBU Pertamina' || s.name.includes('PetraMINA') || s.name.includes('Pompa Bensin')) {
    console.log(`[${i+1}] ${s.id} | ${s.code} | '${s.name}' | ${s.address}`);
  }
});
