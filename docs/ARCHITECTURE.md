# Closepilot Architecture

## System Overview

Closepilot is an autonomous B2B deal flow engine built as a TypeScript pnpm monorepo. It leverages a micro-architecture composed of specialized AI agents coordinated by a central orchestrator.

### Core Components

1. **Frontend (Web)**
   - **Tech Stack:** Next.js 15, TailwindCSS, Framer Motion
   - **Role:** Provides a dashboard for human oversight. Features include a Kanban board for deals, real-time activity streams via SSE, and an approval queue for AI actions.

2. **API Layer**
   - **Tech Stack:** Hono (REST API)
   - **Role:** Serves as the backend for the frontend dashboard. Exposes endpoints for deals, activities, approvals, and analytics.

3. **Database**
   - **Tech Stack:** PostgreSQL with Drizzle ORM
   - **Role:** Stores deals, artifacts, events, approvals, organizations, users, and past-projects.

4. **Agent Orchestrator**
   - **Tech Stack:** BullMQ, Redis
   - **Role:** Manages the state machine of the deal flow. Dispatches jobs to specialized agents based on the deal's current stage.

5. **AI Agents**
   - **Ingestion:** Polls Gmail, classifies incoming leads, and extracts structured data using Claude 3.5 Sonnet.
   - **Enrichment:** Researches company and prospect data (currently returning mock data).
   - **Scoping:** Extracts requirements from emails to define the scope of the deal.
   - **Proposal:** Generates proposals and pricing (currently using templates).
   - **CRM Sync:** Synchronizes data with external CRMs (HubSpot, Salesforce, Pipedrive).

6. **MCP Server**
   - **Role:** Provides 50+ tools for agents to interact with external systems (Deal Store, Gmail, Calendar, Google Drive).

## High-Level Architecture Diagram (Text-Based)

```text
[ External Systems ]          [ Closepilot Platform ]                 [ Human Operators ]
  (Gmail, CRMs)  <-------->  (MCP Server & API Layer)  <-------->     (Next.js Web UI)
                                        |                                     |
                                        v                                     v
[ Data Store ]               [ Agent Orchestrator ]                   [ Real-time Updates ]
 (PostgreSQL)  <-------->      (BullMQ & Redis)        -------->           (SSE)
                                        |
                                        v
                             [ Specialized Agents ]
                             - Ingestion Agent
                             - Enrichment Agent
                             - Scoping Agent
                             - Proposal Agent
                             - CRM Sync Agent
```
