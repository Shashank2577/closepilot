# Closepilot Module & Package List

Closepilot is structured as a pnpm monorepo. Below is the list of packages and their responsibilities.

## Agent Packages (`packages/agents/*`)
Specialized AI actors that perform isolated tasks in the sales process.

- **`ingestion`**: Responsible for reading incoming communications (e.g., polling Gmail), classifying intent, and initiating the deal flow.
- **`enrichment`**: Gathers background context on leads (company info, prospect history) to aid in personalized communication.
- **`scoping`**: Analyzes the communication thread to extract concrete requirements and project scope.
- **`proposal`**: Takes scoped requirements and generates a formal proposal document, including pricing.
- **`crm-sync`**: Ensures that deal states, contacts, and activities are synchronized with external CRMs (Salesforce, HubSpot, Pipedrive).
- **`chase`** *(Planned)*: Handles follow-ups, stall detection, and negotiation tracking.
- **`outreach`** *(Planned)*: Manages initial cold/warm outreach scheduling and meeting booking.
- **`orchestrator`**: The central brain (using BullMQ). It evaluates the state of a deal and dispatches jobs to the other agents.

## Core Services & Apps

- **`api` (`packages/api`)**: The backend REST API built with Hono. Serves the web dashboard and handles webhooks.
- **`web` (`packages/web`)**: The Next.js 15 frontend application providing the human-in-the-loop dashboard.
- **`db` (`packages/db`)**: Contains all database schemas (Drizzle ORM), migrations, and query utilities.
- **`core` (`packages/core`)**: Shared types, utilities, and LLM wrapper functions used across all agents.
- **`mcp-server` (`packages/mcp-server`)**: Exposes the system's capabilities (Deal Store access, Google integrations) as tools for the LLM agents to consume.
- **`mcp-client` (`packages/mcp-client`)**: Client library to connect the agents to the MCP server.

## Tooling & Infrastructure

- **`e2e` (`packages/e2e`)**: End-to-end testing suite for verifying the pipeline flow.
