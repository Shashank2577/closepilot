import fs from 'fs';
const file = 'packages/agents/enrichment/src/index.ts';
let code = fs.readFileSync(file, 'utf-8');
code = code.replace(/duration: /g, 'durationMs: ');
fs.writeFileSync(file, code);
