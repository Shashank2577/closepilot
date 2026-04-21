# Closepilot: Advanced Roadmap (Phase 3 & 4)

This document details the high-level and granular requirements for Phase 3 (Intelligence & Scale) and Phase 4 (Ecosystem & Autonomy). This spec is designed for consumption by autonomous development systems like **Jules**.

---

## 🚀 Phase 3: Intelligence & Scale (Optimization & Enterprise)

### 1. Advanced Analytics & Predictive Insights
*   **Goal**: Move from operational automation to actionable business intelligence.
*   **Requirements**:
    *   **Conversion Metrics**: Aggregate analytics on deal stage velocity.
    *   **Closing Probability**: ML model training on historic deal data to score new leads.
    *   **Bottleneck Detection**: Dashboard reporting on where deals dwell the longest (e.g., scoping agent delay).
    *   **Custom Reports**: API endpoints for CSV/PDF export of sales performance.

### 2. Autonomous Agent Autonomy (Memory & RAG)
*   **Goal**: Reduce API costs and increase agent intelligence via context.
*   **Requirements**:
    *   **Semantic Memory (Vector Store)**: Implement Pinecone or pgvector to store past deal context.
    *   **RAG Pipeline**: Agents must query the Vector Store before executing scoping or research tasks.
    *   **Dynamic Response Templates**: Use past successful email threads to fine-tune proposal tone.

### 3. Enterprise Features (RBAC)
*   **Goal**: Support team-based usage.
*   **Requirements**:
    *   **Role-Based Access Control (RBAC)**: Define permissions for `Owner`, `Manager`, `SalesRep`, and `Agent`.
    *   **Audit Logging**: Immutable event store of all human approvals and agent actions.
    *   **Multi-tenant CRM Mapping**: Support for multiple CRM instances per account (e.g., one for sales, one for support).

### 4. Infrastructure Performance
*   **Goal**: Handle concurrent deal flows at scale.
*   **Requirements**:
    *   **Redis Caching**: Cache agent memory and API responses to minimize latency/costs.
    *   **BullMQ Integration**: Robust background queueing for agent tasks to handle burst traffic.

---

## 🌐 Phase 4: The Ecosystem Phase (Platform & Swarms)

### 1. Market-Place for "Deal Blueprints"
*   **Goal**: Enable custom sales motions for different service industries.
*   **Requirements**:
    *   **Blueprint Schema**: Define a JSON format for "Deal Recipes" (templates, research prompts, CRM mappings).
    *   **Import/Export UI**: Interface to upload/download blueprints.
    *   **Validation Layer**: Ensure imported blueprints are secure and schema-compliant.

### 2. Multi-Agent Swarms
*   **Goal**: Orchestrate multiple specialized agents per deal.
*   **Requirements**:
    *   **Swarm Controller**: Extend Orchestrator to manage parallel sub-agent tasks.
    *   **Agent Communication Protocol**: Allow agents to request information from one another (e.g., Scoping Agent asks Enrichment Agent for more details).
    *   **Dynamic Task Delegation**: Use an LLM-based router to spawn specific agents based on deal metadata.

### 3. External Integrations (Platform Ecosystem)
*   **Goal**: Connect Closepilot to the wider enterprise toolset.
*   **Requirements**:
    *   **Slack/Teams Webhooks**: Real-time notifications for approval requests.
    *   **LinkedIn API Integration**: Deep lead research directly from LinkedIn profiles.
    *   **Custom Webhooks**: Allow users to trigger webhooks on deal stage changes.

---

## 🤖 Instructions for Autonomous Agents (e.g., Jules)

When implementing these phases, agents MUST:

1.  **Strict Typing**: Always update `@closepilot/core` types before modifying schemas.
2.  **Telemetry**: Every new analytic or autonomous decision MUST be instrumented with OpenTelemetry.
3.  **Security**: No user-defined blueprint can execute arbitrary code; blueprints must use a strict, limited set of MCP tool wrappers.
4.  **Testing**: For every new agent logic, provide a corresponding integration test in `packages/agents/**/__tests__`.
5.  **State Consistency**: When introducing caching (Redis), implement a double-write or invalidation strategy to ensure DB consistency.
