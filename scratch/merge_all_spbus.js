const fs = require('fs');

// Read existing 114 SPBUs from src/data/spbu-denpasar-badung.ts
const content = fs.readFileSync('src/data/spbu-denpasar-badung.ts', 'utf8');

// Find the JSON array part
const match = content.match(/export const INITIAL_SPBU_DATA: SPBUItem\[\] = (\[[\s\S]*\]);/);
if (!match) {
  console.error('Could not find INITIAL_SPBU_DATA array in file!');
  process.exit(1);
}

let existing;
try {
  existing = eval(match[1]);
} catch(e) {
  console.error('Failed to parse existing array:', e);
  process.exit(1);
}

console.log('Existing SPBUs:', existing.length);

// Read new Gianyar and Buleleng SPBUs
const { gianyar, buleleng } = JSON.parse(fs.readFileSync('scratch/spbu_gianyar_buleleng_formatted.json', 'utf8'));

// Combine
const combined = [...existing, ...gianyar, ...buleleng];
console.log(`Combined total SPBUs: ${combined.length} (${existing.length} existing + ${gianyar.length} Gianyar + ${buleleng.length} Buleleng)`);

const fileOutput = `import { SPBUItem } from '@/types/spbu';

export const INITIAL_SPBU_DATA: SPBUItem[] = ${JSON.stringify(combined, null, 2)};
`;

fs.writeFileSync('src/data/spbu-denpasar-badung.ts', fileOutput, 'utf8');
console.log('Successfully written to src/data/spbu-denpasar-badung.ts!');
