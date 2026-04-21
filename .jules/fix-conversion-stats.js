import fs from 'fs';
const dbPath = 'packages/db/src/queries/analytics.ts';
let code = fs.readFileSync(dbPath, 'utf-8');
code = code.replace(
  "import { eq, asc } from 'drizzle-orm';",
  "import { eq, asc, count } from 'drizzle-orm';"
);
code = code.replace(
  /export async function getConversionStats\(\): Promise<ConversionStats> \{([\s\S]*?)return \{/m,
  `export async function getConversionStats(): Promise<ConversionStats> {
  const db = getDb();

  const stats = await db
    .select({
      stage: deals.stage,
      count: count()
    })
    .from(deals)
    .groupBy(deals.stage);

  let totalDeals = 0;
  let completed = 0;
  let failed = 0;
  let inProgress = 0;

  for (const row of stats) {
    const c = Number(row.count);
    totalDeals += c;
    if (row.stage === DealStage.COMPLETED) {
      completed += c;
    } else if (row.stage === DealStage.FAILED) {
      failed += c;
    } else {
      inProgress += c;
    }
  }

  const closed = completed + failed;
  const winRate = closed > 0 ? completed / closed : 0;

  return {`
);
fs.writeFileSync(dbPath, code);
