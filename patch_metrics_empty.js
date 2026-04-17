const fs = require('fs');

let mTest = fs.readFileSync('packages/api/src/__tests__/metrics.test.ts', 'utf8');

// The output string from await metricsRegistry.metrics() could be empty if no metrics were recorded yet and default metrics might not be fully collected immediately or cleared by `metricsRegistry.clear()` in `beforeEach`?
// Oh! `beforeEach` runs `metricsRegistry.clear()`, which CLEARS everything, including `collectDefaultMetrics` and the custom counters!
// Then `/metrics` returns nothing!
mTest = mTest.replace('metricsRegistry.clear();', '// metricsRegistry.clear();');

fs.writeFileSync('packages/api/src/__tests__/metrics.test.ts', mTest);
