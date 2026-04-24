# Closepilot — Gemini Instructions

## Handoff System

**Read the handoff before doing anything else.**

Handoff files live inside this repo:
```
.handoffs/project.md               ← Persistent context: stack, architecture, decisions
.handoffs/handoff-YYYY-MM-DD.md    ← Today's live context and next steps
```

To find today's file:
```bash
ls .handoffs/handoff-$(date +%Y-%m-%d).md 2>/dev/null || ls .handoffs/handoff-*.md | sort | tail -1
```

At session end, say `close handoff` to trigger the close-handoff skill. It will update `.handoffs/handoff-$(date +%Y-%m-%d).md` — not any shared vault file.

## Closing a Session Manually

If the skill is unavailable, append this block to today's handoff file:

```markdown
### Close N | Gemini [model] | HH:MM
**Completed**:
- [specific items with file names]
**Deferred** (exact pickup):
- [file path + function + what to do]
**Needs Attention**:
- [anything broken, stuck, or risks]
```

## Project Context

Closepilot is an autonomous B2B deal flow engine — TypeScript pnpm monorepo with 11 packages. Infrastructure is solid (DB, API, web, BullMQ, Docker, CI/CD). Agent brains are the problem: Enrichment = stubs, Scoping = empty file, Proposal = hardcoded strings, orchestrator worker has never been started.

Full context: `.handoffs/project.md`
Execution plan: `docs/PRODUCTION-SPEC.md`
Honest status: `docs/STATUS.md`

## Codebase Analysis

For large codebase analysis, use:
```bash
gemini -p "@src/ @packages/ Analyze..."
gemini --all_files -p "Overview of project structure"
```
