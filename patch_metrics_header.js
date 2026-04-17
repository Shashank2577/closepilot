const fs = require('fs');

let index = fs.readFileSync('packages/api/src/index.ts', 'utf8');

// Hono's `c.text()` overrides the Content-Type header to `text/plain; charset=UTF-8`.
// To bypass this, we can return `new Response(...)` with our specific headers.

index = index.replace(
  "c.header('Content-Type', 'text/plain; version=0.0.4');\n  return c.text(await metricsRegistry.metrics());",
  "return new Response(await metricsRegistry.metrics(), {\n    headers: {\n      'Content-Type': 'text/plain; version=0.0.4'\n    }\n  });"
);

fs.writeFileSync('packages/api/src/index.ts', index);
