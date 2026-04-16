# agents/enrichment

The second agent in the Closepilot pipeline. Takes a newly ingested deal and researches both the company and the individual prospect using Claude AI and public signals. Outputs structured enrichment data that feeds the scoping and proposal stages.

## Status

✅ Complete — company research, prospect research, and deal update implemented.

## What it does

```
Deal in ENRICHMENT stage
    │
    ├─── Company Research (Claude AI)
    │       • Industry, size, funding stage
    │       • Tech stack signals
    │       • Recent news / growth indicators
    │       • Typical project budget range
    │
    ├─── Prospect Research (Claude AI)
    │       • Role and seniority
    │       • LinkedIn signals
    │       • Pain points from email context
    │       • Decision-making authority
    │
    └─── Update deal with CompanyResearch + ProspectResearch
         Advance stage → SCOPING
```

## Key interfaces

```typescript
interface CompanyResearch {
  industry: string;
  size: string;           // 'startup' | 'smb' | 'enterprise'
  fundingStage?: string;
  techStack?: string[];
  recentNews?: string[];
  estimatedBudget?: { min: number; max: number; currency: string };
}

interface ProspectResearch {
  role: string;
  seniority: string;
  linkedInUrl?: string;
  painPoints: string[];
  decisionMaker: boolean;
  engagementScore: number; // 0-100
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
DATABASE_URL=
```
