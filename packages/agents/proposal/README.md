# agents/proposal

The fourth agent in the Closepilot pipeline. Generates a fully-formatted proposal document from the scoped deal — including executive summary, solution architecture, timeline, pricing breakdown, and terms — then exports it to Google Drive and requests human approval before sending.

## Status

✅ Complete — proposal generation, Drive export, pricing calculation, and approval gate implemented.

## What it does

```
Deal in PROPOSAL stage (scoping complete)
    │
    ├─── ProposalGenerator (Claude AI)
    │       • Executive summary tailored to prospect's pain points
    │       • Proposed solution architecture
    │       • Phase breakdown with milestones
    │       • Team and methodology section
    │
    ├─── PricingCalculator
    │       • Line-item breakdown by work package
    │       • Rates applied from config (hourly / fixed)
    │       • Optional packages / add-ons
    │       • Payment schedule
    │
    ├─── Drive Export
    │       • Fill Google Docs template with generated content
    │       • Store document reference on deal
    │       • Generate shareable link
    │
    └─── Approval gate
             • Create approval request for human review
             • Deal holds until approved
             • On approval → advance to CRM_SYNC
             • On rejection → return to SCOPING with notes
```

## Output

```typescript
interface Proposal {
  title: string;
  executiveSummary: string;
  solutionOverview: string;
  phases: ProposalPhase[];
  pricing: PricingBreakdown;
  timeline: string;
  terms: string;
  driveDocumentId?: string;
  driveDocumentUrl?: string;
}

interface PricingBreakdown {
  currency: string;
  total: number;
  lineItems: { description: string; quantity: number; rate: number; total: number }[];
  paymentSchedule: string;
}
```

## Running

```bash
pnpm dev    # tsx watch src/index.ts
pnpm test   # vitest
```

## Environment

```env
ANTHROPIC_API_KEY=
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY=
DATABASE_URL=
PROPOSAL_TEMPLATE_ID=   # Google Docs template ID
```
