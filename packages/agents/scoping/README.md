# agents/scoping

The third agent in the Closepilot pipeline. Analyzes the enriched deal to extract technical requirements, define project scope, assess complexity, and — if the brief is ambiguous — draft a clarification email to the prospect.

## Status

✅ Complete — requirement extraction, scope definition, complexity analysis, and clarification generation all implemented.

## What it does

```
Deal in SCOPING stage (enrichment complete)
    │
    ├─── RequirementExtractor
    │       • Parse email thread for explicit requirements
    │       • Infer implied requirements from context
    │       • Tag requirements by category (frontend, backend, integration, etc.)
    │
    ├─── ScopeDefiner
    │       • Group requirements into work packages
    │       • Define project boundaries (in-scope / out-of-scope)
    │       • Estimate timeline range
    │
    ├─── ComplexityAnalyzer
    │       • Score complexity (low / medium / high / very-high)
    │       • Flag risk factors
    │       • Suggest team composition
    │
    └─── ClarificationGenerator (if ambiguous)
             • Draft email asking targeted clarifying questions
             • Request human approval before sending
             • Hold deal in SCOPING until response received
```

## Output

When scoping is complete, the deal is updated with:

```typescript
interface ProjectScope {
  summary: string;
  complexity: 'low' | 'medium' | 'high' | 'very-high';
  requirements: Requirement[];
  inScope: string[];
  outOfScope: string[];
  estimatedWeeks: { min: number; max: number };
  risks: string[];
  teamComposition: string[];
}
```

If clarification is needed:
- An approval is created requesting the human to review and send the clarification email
- The deal stays in `SCOPING` stage until the prospect replies

## Running

```bash
pnpm dev    # tsx watch src/index.ts
pnpm build  # tsc (test files excluded)
pnpm test   # vitest
```

## Environment

```env
ANTHROPIC_API_KEY=
DATABASE_URL=
```
