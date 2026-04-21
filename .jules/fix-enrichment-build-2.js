import fs from 'fs';
const file = 'packages/agents/enrichment/src/index.ts';
let code = fs.readFileSync(file, 'utf-8');
// Put duration back in metadata and add durationMs at top level
code = code.replace(
  /durationMs: duration/g,
  'duration: duration'
);
code = code.replace(
  /metadata: \{/,
  'durationMs: duration,\n      metadata: {'
);
fs.writeFileSync(file, code);
