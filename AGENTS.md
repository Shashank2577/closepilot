# Closepilot — Agent Instructions (Codex / OpenAI)

## Handoff System

**Before starting any work, read the handoff files in this repo:**

```
.handoffs/project.md               ← Persistent: stack, architecture, key decisions
.handoffs/handoff-YYYY-MM-DD.md    ← Daily: what's happening now, next steps, session log
```

Run this to find today's file:
```bash
ls .handoffs/handoff-$(date +%Y-%m-%d).md 2>/dev/null || ls .handoffs/handoff-*.md | sort | tail -1
```

At the end of each session, append a Session Close block to today's handoff file:

```markdown
### Close N | Codex | HH:MM
**Completed**:
- [specific items with file names]
**Deferred** (exact pickup):
- [file path + function + what to do]
**Needs Attention**:
- [anything broken, stuck, or risks]
```

## Project Context

Closepilot is a TypeScript pnpm monorepo (11 packages). The infrastructure is solid; the agent brains are broken/empty. The BullMQ orchestrator worker has never been started. See `.handoffs/project.md` for the full picture and `docs/PRODUCTION-SPEC.md` for Sprint A/B/C execution plan.

## Key Commands

```bash
docker compose up -d          # Start Postgres:5432 + Redis:6379
pnpm api:dev                  # API on port 3001
pnpm web:dev                  # Web on port 3003
pnpm --filter orchestrator dev  # BullMQ worker
pnpm build                    # Full monorepo build
pnpm test                     # Run all tests
```


<claude-mem-context>
# Memory Context

# [closepilot] recent context, 2026-04-23 10:00pm GMT+5:30

Legend: 🎯session 🔴bugfix 🟣feature 🔄refactor ✅change 🔵discovery ⚖️decision 🚨security_alert 🔐security_note
Format: ID TIME TYPE TITLE
Fetch details: get_observations([IDs]) | Search: mem-search skill

Stats: 50 obs (18,892t read) | 670,663t work | 97% savings

### Apr 17, 2026
S10250 Implement Priority 1 blocking items: Database query stubs, API test fixes, and validation of MCP tool implementations (Apr 17 at 7:48 PM)
S10254 Fix TypeScript Build Errors and Complete MCP Tool Implementation After Verifying No Active Jules Sessions (Apr 17 at 8:01 PM)
S10255 Complete TypeScript Build Error Resolution and Commit All Fixes to consolidate/unmerged-features Branch (Apr 17 at 8:12 PM)
S10257 Verify Project Status and Complete Priority 1 MCP Tools Implementation with Full TypeScript Compliance (Apr 17 at 8:13 PM)
S10259 Wire Drive tools in MCP server handler to unblock proposal agent document generation - complete Priority 1 MVP blockers (Apr 17 at 8:13 PM)
S10266 Explain the Closepilot system in simple terms suitable for a 10-year-old (Apr 17 at 8:19 PM)
S10274 Complete application status check - assessing whether UI and all other aspects are sorted (Apr 17 at 8:30 PM)
S10434 Jules API Session Creation Blocked by Active Session Limit (Apr 17 at 8:55 PM)
### Apr 21, 2026
S10436 Unblock stuck Jules sessions for Wave 1 work orders (J-W1-DB and J-W1-API-DEFS) (Apr 21 at 12:07 AM)
24509 5:08p 🟣 Added FAILED column to Kanban deal board
24510 " 🔴 StatCard now applies trend color styling to value text
24512 " 🟣 Deal detail page completely rewritten with real data and live components
24513 " 🟣 DealModal wired for delete and edit operations with state management
24514 5:09p 🟣 DealModal edit mode with inline form for lead field updates
24515 " 🟣 DealModal delete confirmation with two-step flow
24516 " 🟣 KanbanBoard wires DealModal callbacks for automatic data refresh
24517 5:10p 🟣 Created CreateDealModal component for adding new deals
24518 " 🟣 Dashboard now uses backend semantic search for queries 3+ characters
24519 " 🟣 Dashboard now displays ActivityFeed and New Deal button with full create flow
24520 5:11p 🟣 SearchBar now debounces input with 300ms delay before triggering search
24521 " ✅ TypeScript type-check passed with no errors for web package
24522 5:20p 🟣 Visual distinction for FAILED deal stage in Kanban board
24523 5:31p ✅ closepilot Phase 2 Marked Complete in Handoff
S10444 closepilot Phase 2 Marked Complete in Handoff (Apr 21 at 5:31 PM)
### Apr 22, 2026
24540 7:10p 🔵 User Clarification: Inquiry About Claude Managed Agents
24541 7:30p ⚖️ Sprint Implementation Plan: Multi-Provider LLM Support Question
24542 " 🔵 Closepilot Sprint Implementation Planning: Codebase State Assessment
24543 7:31p 🔴 Build Failure: Drizzle ORM Version Conflict in E2E Package
24544 7:32p 🟣 Multi-Provider LLM Support: Provider-Agnostic Architecture Implementation
24545 7:33p 🟣 Ingestion-to-Enrichment Pipeline Integration with BullMQ Queue
24546 " 🟣 Enrichment Agent Complete Rewrite with Real LLM Intelligence and ICP Scoring
24547 7:34p 🔵 Sprint B/C Stage Analysis Task Initiated
24548 " 🟣 Parallel Agent Development Coordination and Enrichment ICP Integration
24549 7:35p 🔵 Closepilot Stage Model and Sprint B/C Expansion Analysis Complete
24550 " 🔵 Scheduler Package Reusable for Outreach Plus Complete Stage Dependency Map
24551 7:40p 🟣 Outreach agent package created with environment-based configuration
24552 8:15p 🔵 Test Suite Execution Revealed Multiple Package Failures
24553 " 🔴 Fixed BullMQ Queue Mock Constructor and Test Scope Issues
24554 " 🔵 Queue Mock Fix Revealed Variable Hoisting Issue
### Apr 23, 2026
24555 11:41a 🔵 Project Similarity Search Queries Are Unimplemented Stubs
24556 " 🔄 Orchestrator Refactored from Synchronous to Asynchronous Job-Based Execution
24557 " 🔵 Mixed Test Framework Usage Across Packages
24558 11:42a 🟣 Implemented Project Similarity Search with Weighted Text Scoring
24559 11:43a 🟣 Proposal Pricing Now Blends Historical Project Data with Estimates
24560 " ✅ New Deal Creation Now Skips Ingestion Stage and Starts at Enrichment
24561 " 🔄 Removed RunIngestion Job Type and Separated Ingestion from Worker Queue
24562 " 🔴 Fixed Gmail Monitor Concurrent Processing Flag Confusion
24563 11:44a 🔄 Simplified Researcher Constructors by Removing DataSources Dependency
24564 " 🔄 Completed DataSources Removal from Enrichment Agent
24565 11:45a 🔴 Added Explicit Type Annotation to Fix Implicit Any Error in Proposal Agent
24566 " 🔵 Proposal Package Build Blocked by TypeScript Module Resolution Failure
24567 " 🔴 Resolved Proposal Build Failure by Updating pnpm Lockfile
24568 11:46a 🔵 Core Package Tests Pass After Sprint A Phase 2 Integration
24569 " 🔵 Web Package Build Blocked by Google Fonts Network Failure
**24570** 11:57a 🔄 **Queue Flow Refactored to Skip Ingestion Stage**
The sales pipeline queue flow was refactored to eliminate the RunIngestion job stage. Previously, deal creation triggered RunIngestion which then enqueued RunEnrichment. Now deals directly enqueue RunEnrichment jobs, simplifying the orchestration path. This change touched the API deal creation endpoints, webhook handlers, and the orchestrator's job dispatcher, streamlining the agent pipeline by removing an unnecessary intermediate stage.
~245t 🛠️ 5,503

**24571** " 🔴 **Fixed Ingestion Monitor Execution State Race Condition**
The ingestion monitor had an execution-state management bug where the monitor's running state was coupled with its cycle processing lock. This created race conditions where the monitor could appear stopped while a processing cycle was still active, or vice versa. The fix separates these concerns: the running state tracks whether the monitor should be active, while isProcessing guards individual cycle execution. This prevents state corruption and ensures clean start/stop semantics.
~236t 🛠️ 5,503

**24572** " 🟣 **Implemented Project Similarity Query Layer**
A new database query layer was implemented in packages/db/src/queries/projects.ts to support similarity search across historical projects. The implementation includes three main functions: getProjectById for direct lookups, searchProjectsByKeywords for text-based search, and findSimilarProjects for content-based matching. This query layer enables the proposal pricing system to find comparable historical projects and incorporate their budgets into new estimates, replacing previous stub implementations with production-ready data access.
~257t 🛠️ 5,503

**24573** " 🟣 **Proposal Pricing Now Incorporates Historical Project Data**
The proposal agent's pricing strategy was enhanced to incorporate historical project data. Instead of relying solely on bottom-up task estimates, the pricing engine now queries for similar historical projects using the new similarity query layer, retrieves their actual budgets, and blends these values into the final estimate. This data-driven approach improves pricing accuracy by grounding estimates in real delivery costs. The proposal package was updated with a new dependency on the DB workspace package to enable this integration.
~263t 🛠️ 5,503

**24574** " 🔄 **Removed DataSources Stub Coupling from Enrichment Agents**
The enrichment service was refactored to remove coupling to stub DataSources constructor parameters. Previously, the company-researcher and prospect-researcher components accepted a DataSources object that was used during prototyping. This cleanup removes that test scaffolding and transitions the enrichment agents to use production data access patterns, making the codebase cleaner and removing obsolete stub wiring.
~232t 🛠️ 5,503

24575 " ✅ Sprint A/B Code Integration Completed with Full Test Verification

Access 671k tokens of past work via get_observations([IDs]) or mem-search skill.
</claude-mem-context>