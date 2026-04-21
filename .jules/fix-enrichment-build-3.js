import fs from 'fs';
const file = 'packages/agents/enrichment/src/index.ts';
let code = fs.readFileSync(file, 'utf-8');
code = code.replace(
  /metadata: \{/g,
  'durationMs: duration,\n      metadata: {'
);
fs.writeFileSync(file, code);
