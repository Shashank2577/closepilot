import fs from 'fs';
const file = 'packages/agents/orchestrator/src/agent-dispatcher.ts';
let code = fs.readFileSync(file, 'utf-8');
code = code.replace(
  /requiresApproval: false,\n      metadata: \{/g,
  'requiresApproval: false,\n      durationMs: Date.now() - Date.now(),\n      metadata: {'
);
fs.writeFileSync(file, code);
