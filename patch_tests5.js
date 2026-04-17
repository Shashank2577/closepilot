const fs = require('fs');

let reqTest = fs.readFileSync('packages/api/src/middleware/__tests__/requestId.test.ts', 'utf8');
reqTest = reqTest.replace("from '../requestId.ts'", "from '../requestId.js'");
fs.writeFileSync('packages/api/src/middleware/__tests__/requestId.test.ts', reqTest);
