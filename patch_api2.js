const fs = require('fs');

// To fix Cannot find module, we can use tsconfig moduleResolution. Or we can just import from @closepilot/db, but the types in @closepilot/db need to be built.
// Let's run `cd packages/db && pnpm build` because earlier when I ran `pnpm build`, it should have generated `dist/instrument.d.ts` and `dist/instrument.js` and updated `dist/index.d.ts`. Let's check `packages/db/dist/index.d.ts`.
// Or let's just make the import `import { instrumentedDb } from '@closepilot/db';` again and make sure `packages/db` is correctly built.
let index = fs.readFileSync('packages/api/src/index.ts', 'utf8');
index = index.replace("import { instrumentedDb } from '@closepilot/db/src/instrument.js';", "import { instrumentedDb } from '@closepilot/db';");
fs.writeFileSync('packages/api/src/index.ts', index);
