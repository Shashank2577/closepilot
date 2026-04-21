/**
 * Seed script — inserts sample deals at different pipeline stages for local dev/demo.
 * Run: npx tsx scripts/seed.ts
 */
import { createDeal, updateDealStage } from '@closepilot/db';
import { DealStage } from '@closepilot/core';

const seedDeals = [
  {
    leadEmail: 'alice@acmecorp.com',
    leadName: 'Alice Johnson',
    leadCompany: 'Acme Corp',
    leadTitle: 'VP of Engineering',
    source: 'gmail' as const,
    targetStage: DealStage.INGESTION,
  },
  {
    leadEmail: 'bob@betatech.io',
    leadName: 'Bob Smith',
    leadCompany: 'BetaTech',
    leadTitle: 'CTO',
    source: 'gmail' as const,
    targetStage: DealStage.ENRICHMENT,
  },
  {
    leadEmail: 'carol@gammasoft.com',
    leadName: 'Carol White',
    leadCompany: 'GammaSoft',
    leadTitle: 'Head of Product',
    source: 'manual' as const,
    targetStage: DealStage.SCOPING,
  },
  {
    leadEmail: 'dave@deltaventures.com',
    leadName: 'Dave Brown',
    leadCompany: 'Delta Ventures',
    leadTitle: 'CEO',
    source: 'manual' as const,
    targetStage: DealStage.PROPOSAL,
  },
  {
    leadEmail: 'eve@epsilonai.com',
    leadName: 'Eve Davis',
    leadCompany: 'Epsilon AI',
    leadTitle: 'Director of Sales',
    source: 'other' as const,
    targetStage: DealStage.COMPLETED,
  },
];

async function seed() {
  console.log('Seeding sample deals...');

  for (const { targetStage, ...dealData } of seedDeals) {
    const deal = await createDeal(dealData);
    if (targetStage !== DealStage.INGESTION) {
      await updateDealStage(deal.id.toString(), targetStage, 'Seeded');
    }
    console.log(`  Created deal #${deal.id}: ${dealData.leadName} (${targetStage})`);
  }

  console.log('Done.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
