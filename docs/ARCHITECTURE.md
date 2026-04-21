# Closepilot System Architecture

## Overview
Closepilot is an autonomous B2B deal flow engine designed to automate the entire lifecycle of a sales deal—from lead ingestion via email to final CRM synchronization. It leverages a multi-agent orchestration pattern, specialized MCP (Model Context Protocol) tools, and a hardened REST API.

## System Components

### 1. Agents (The Workforce)
Agents are specialized, autonomous services that perform specific tasks:
- **Ingestion Agent**: Polls Gmail for new inquiries, classifies leads using Claude AI, and extracts initial deal context.
- **Enrichment Agent**: Researches companies and prospects using web search and LinkedIn data to build a comprehensive lead profile.
- **Scoping Agent**: Analyzes requirements and technical needs to define the project scope.
- **Proposal Agent**: Generates professional PDF/Google Doc proposals based on the project scope and templates.
- **CRM Sync Agent**: Synchronizes finalized and approved deals with HubSpot, Salesforce, or Pipedrive.
- **Orchestrator**: The central "brain" that manages deal state transitions and coordinates agent execution.

### 2. API Service (`packages/api`)
A hardened Hono-based REST API that serves as the gateway for the Web Dashboard and external integrations.
- **Hardening**: Implements rate limiting (120 RPM), payload size limits (256KB), and secure headers (HSTS, CSP).
- **Validation**: Strict Zod-based request validation for all endpoints.
- **Observability**: OpenTelemetry tracing, Prometheus metrics, and request-scoped logging with secret redaction.

### 3. MCP Server (`packages/mcp-server`)
A tool-provider server implementing the Model Context Protocol.
- **Deal Store**: Provides database tools (create/get/update deals) to agents.
- **Gmail Tools**: Provides email search, read, and draft creation tools.
- **Drive Tools**: Provides Google Drive folder management and Document generation tools.

### 4. Web Dashboard (`packages/web`)
A Next.js 15 application for human-in-the-loop oversight.
- **Pipeline View**: A Kanban-style board for tracking deal stages.
- **Approval Queue**: A dedicated interface for reviewing critical agent outputs (e.g., proposals) before they proceed.
- **Real-time Updates**: Activity streaming via SSE (Server-Sent Events).

## Data Architecture
- **Database**: PostgreSQL with Drizzle ORM.
- **Schema**: Centralized in `packages/db`, using a "Deal" entity as the primary state container.
- **State Machine**: A formal state machine in the core package defines valid transitions (e.g., `ingestion` -> `enrichment`).

## Security & Hardening
- **Environment**: Strict Zod validation of all secrets and configs on startup.
- **Log Redaction**: Automatic masking of `apiKey`, `Authorization`, and other sensitive patterns.
- **Graceful Shutdown**: All services handle `SIGTERM` to drain active connections and close database pools safely.
