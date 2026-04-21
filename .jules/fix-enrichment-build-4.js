import fs from 'fs';
const file = 'packages/agents/enrichment/src/index.ts';
let code = fs.readFileSync(file, 'utf-8');
code = code.replace(
  /durationMs: duration,\n      durationMs: duration,\n      metadata: \{/g,
  'metadata: {'
);
code = code.replace(
  /durationMs: endTime.getTime\(\) - startTime.getTime\(\),/g,
  'duration: endTime.getTime() - startTime.getTime(),'
);

code = code.replace(
  /durationMs: duration,\n      metadata: \{/g,
  'metadata: {'
);

code = code.replace(
  /requiresApproval: false,\n        metadata: \{/g,
  'requiresApproval: false,\n        durationMs: endTime.getTime() - startTime.getTime(),\n        metadata: {'
);
code = code.replace(
  /approvalReason: 'Enrichment failed unexpectedly',\n        metadata: \{/g,
  "approvalReason: 'Enrichment failed unexpectedly',\n        durationMs: endTime.getTime() - startTime.getTime(),\n        metadata: {"
);


fs.writeFileSync(file, code);
