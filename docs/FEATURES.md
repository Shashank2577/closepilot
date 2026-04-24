# Closepilot Feature List

This document outlines the current and planned features for the Closepilot platform.

## 1. Automated Lead Ingestion
- Continuous polling of connected Gmail accounts.
- AI-driven classification of incoming emails (e.g., distinguishing between sales leads and spam).
- Automatic extraction of lead information and initial deal creation.

## 2. Autonomous Deal Enrichment
- Company and prospect research to gather contextual data.
- Initial ICP (Ideal Customer Profile) scoring to prioritize high-value leads.
- *(Note: Currently utilizing mock data; live web research and LLM integration pending).*

## 3. Intelligent Scoping & Proposal Generation
- Analysis of email threads to extract core project requirements.
- Automated generation of project scope definitions.
- Construction of proposals including drafted content and pricing strategy.
- *(Note: Currently relies on string templates and stubs).*

## 4. Multi-CRM Synchronization
- Real-time bi-directional sync with major CRMs.
- Supported adapters: HubSpot, Salesforce, Pipedrive.

## 5. Centralized Orchestration
- State machine-driven deal progression (e.g., `new-lead` -> `qualified` -> `proposal-sent`).
- Job queue management using BullMQ for reliable agent task execution.

## 6. Interactive Dashboard & Human Oversight
- **Kanban Board:** Visual management of deal stages.
- **Activity Feed:** Real-time event streaming via Server-Sent Events (SSE).
- **Approvals Queue:** Mandatory human-in-the-loop checkpoints before sending proposals or critical emails.
- **Analytics:** Velocity charts and pipeline health metrics.

## 7. Enterprise-Grade Infrastructure
- **Security:** Google OAuth with JWT, RBAC schema.
- **Observability:** OpenTelemetry tracing and Prometheus metrics.
- **Deployment:** Fully containerized (Docker) and configured for Fly.io.
