const fs = require('fs');

const currentFile = fs.readFileSync('src/data/spbu-denpasar-badung.ts', 'utf8');
const newItems = JSON.parse(fs.readFileSync('scratch/spbu_klungkung_karangasem_formatted.json', 'utf8'));

console.log(`Loaded ${newItems.length} new items to append.`);

const lastBraceIndex = currentFile.lastIndexOf('}');
if (lastBraceIndex === -1) {
  throw new Error('Could not find closing brace');
}

const newItemsJson = newItems.map(item => '  ' + JSON.stringify(item, null, 2).replace(/\n/g, '\n  ')).join(',\n');

const updatedFile = currentFile.slice(0, lastBraceIndex + 1) + ',\n' + newItemsJson + '\n];\n';

fs.writeFileSync('src/data/spbu-denpasar-badung.ts', updatedFile, 'utf8');
console.log('Successfully updated src/data/spbu-denpasar-badung.ts with Klungkung & Karangasem!');
