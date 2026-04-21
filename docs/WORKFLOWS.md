# Closepilot Workflow Sequence Diagrams

## 1. Lead Ingestion & Qualification
This workflow describes how a new email inquiry becomes a qualified deal in the system.

```mermaid
sequenceDiagram
    participant G as Gmail
    participant IA as Ingestion Agent
    participant AI as Claude AI
    participant MCP as MCP Server (Deal Store)
    participant DB as PostgreSQL

    IA->>G: Poll for unread emails
    G-->>IA: New Email: "Interested in service"
    IA->>AI: Classify & Extract Lead Info
    AI-->>IA: { "name": "John", "email": "...", "intent": "high" }
    IA->>MCP: createDeal(leadData)
    MCP->>DB: INSERT INTO deals
    DB-->>MCP: Deal ID: 001
    MCP-->>IA: Success
    IA->>MCP: updateDealStage(001, "enrichment")
    Note over IA: Deal moved to next stage
```

## 2. Proposal Generation & Approval
Critical actions like proposal delivery require human oversight.

```mermaid
sequenceDiagram
    participant O as Orchestrator
    participant PA as Proposal Agent
    participant GD as Google Drive
    participant API as Closepilot API
    participant WEB as Web Dashboard
    participant H as Human User

    O->>PA: Execute for Deal 001
    PA->>GD: Create Doc from Template
    GD-->>PA: Doc URL: drive.google.com/...
    PA->>API: POST /api/approvals (requestComment: "Draft Ready")
    API->>WEB: SSE Broadcast: "New Approval Pending"
    WEB->>H: Display in Approval Queue
    H->>WEB: Click "Approve"
    WEB->>API: POST /api/approvals/1/approve
    API->>O: Trigger State Transition
    O->>PA: Finalize & Send
```

## 3. Production Hardening Flow (Internal)
How the system handles a request with security measures active.

```mermaid
sequenceDiagram
    participant C as Client (Dashboard)
    participant M as Middleware (API)
    participant R as Route Handler
    participant L as Logger

    C->>M: POST /api/deals (with Payload)
    M->>M: Check Rate Limit (Bucket < 30?)
    M->>M: Check Body Size (< 256KB?)
    M->>M: Validate CORS (Origin Allowed?)
    M->>R: Proceed to Handler
    R->>R: Zod Schema Validation
    R->>L: log.info({ apiKey: "sk-..." })
    L->>L: Redact ("sk-..." -> "[REDACTED]")
    R-->>C: 201 Created (with Security Headers)
```
