# Closepilot Pitch Deck Content

This document outlines the content for the product pitch deck.

---

## Slide 1: Title
**Closepilot**
*The Autonomous B2B Deal Flow Engine*

---

## Slide 2: The Problem
**Sales Teams are Drowning in Admin**
- B2B sales reps spend less than 30% of their time actually selling.
- The rest is consumed by data entry, researching leads, writing repetitive scoping documents, and manually drafting proposals.
- Deals stall because follow-ups fall through the cracks and context is lost between systems.

---

## Slide 3: The Solution
**AI Agents that Work Your Pipeline**
Closepilot replaces manual admin with a swarm of specialized AI agents that autonomously manage the top and middle of your sales funnel.
- **Automated Ingestion:** We read your inbox, classify leads, and create records.
- **Deep Enrichment:** We research the company and the prospect instantly.
- **Intelligent Scoping:** We read the email thread and extract the technical requirements.
- **Proposal Generation:** We draft the proposal and calculate the price.

---

## Slide 4: How It Works (The Architecture)
*Visual: A flow chart showing an email coming in, hitting the Orchestrator, being passed to Ingestion, Enrichment, Scoping, and Proposal, with the CRM Syncing off to the side, and the Human-in-the-loop dashboard above.*

**It's a Micro-Agent Architecture.** Instead of one massive, prompt-heavy LLM trying to do everything, Closepilot uses specialized, narrowly-scoped agents coordinated by an enterprise-grade message queue (BullMQ), ensuring reliability and predictability.

---

## Slide 5: Key Features & Capabilities
- **Human-in-the-Loop:** Agents do the heavy lifting, but humans approve proposals and critical emails via our beautiful Next.js Kanban dashboard.
- **Multi-CRM Sync:** Plays nice with your existing stack. Native adapters for Salesforce, HubSpot, and Pipedrive.
- **Real-Time Streaming:** Watch your AI agents work in real-time with Server-Sent Events (SSE) powering the activity feed.
- **Secure & Enterprise Ready:** Built with OpenTelemetry, PostgreSQL, Fly.io, and strict Role-Based Access Control.

---

## Slide 6: Current Traction & Status
**Where We Are Today**
- **Phase 0 & 2 (Foundation & Infra):** 100% Complete. The database, API, UI, CI/CD, and monitoring are fully operational.
- **Phase 1 (Core Agents):** In progress. Ingestion and CRM Sync are live. Enrichment and Proposal engines are currently functioning with mock data and stubs, ready to be wired to production LLMs.

---

## Slide 7: Next Steps & The Future
**The Path to Full Autonomy**
- **Immediate:** Activate the BullMQ orchestrator and wire the Enrichment/Proposal agents to live data models.
- **Phase 3:** Introduce semantic vector search to base new proposals on historical past-project data.
- **Phase 4:** Deploy the *Scheduler* and *Chase* agents to fully automate meeting booking and post-proposal follow-ups.
- **Phase 5:** Train our proprietary ML models on ICP scoring and pricing elasticity based on real deal outcomes.

**Closepilot: Close more. Type less.**
