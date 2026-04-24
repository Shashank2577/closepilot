# Closepilot Sequence Flows

This document details the end-to-end sequence flows for how a deal moves through the Closepilot architecture.

## 1. Automated Ingestion Flow

**Trigger:** A new email arrives in the monitored inbox.

1. **Email Polling:** The `ingestion` agent's monitor polls Gmail via the MCP Server.
2. **LLM Classification:** The `email-classifier` uses Claude to evaluate the email. It determines if it's a valid B2B lead.
3. **Record Creation:** If valid, the ingestion agent creates a new Deal record in the database with the stage `new-lead`.
4. **Queue Dispatch:** The agent emits a `lead_created` event. The `orchestrator` picks this up and schedules an `enrichment_job`.

## 2. Enrichment & Scoping Flow

**Trigger:** Orchestrator dispatches an enrichment job.

1. **Data Gathering:** The `enrichment` agent executes. It runs `company-researcher` and `prospect-researcher` to gather data (currently mocked).
2. **State Update:** The deal is updated with the enriched context, and the stage moves to `qualified`.
3. **Queue Dispatch:** The orchestrator schedules a `scoping_job`.
4. **Requirement Extraction:** The `scoping` agent reads the initial email and any subsequent replies. The `requirement-extractor` identifies core deliverables.
5. **Scope Definition:** The `scope-definer` structures these into a formal scope object.
6. **State Update:** The deal stage is updated to `scoping` (or `proposal-pending`).

## 3. Proposal Generation Flow

**Trigger:** Orchestrator dispatches a proposal job.

1. **Content Generation:** The `proposal` agent takes the structured scope. The `content-generator` drafts the proposal sections.
2. **Pricing:** The `pricing-strategy` module calculates the estimated cost (currently a hardcoded logic).
3. **Approval Request:** The system flags the proposal as requiring human approval before sending. A record is created in the `approvals` table.
4. **Human Interaction:** An operator reviews the proposal in the Next.js `web` dashboard and clicks "Approve".
5. **Document Creation & Sending:** The agent uses Google Drive/Gmail MCP tools to generate the final PDF/Doc and send it to the client.
6. **State Update:** Deal stage moves to `proposal-sent`.

## 4. CRM Synchronization Flow

**Trigger:** Any state change on the Deal object.

1. **Event Emission:** The database or API emits a generic `deal_updated` event.
2. **Sync Agent:** The `crm-sync` agent listens to this event.
3. **Adapter Execution:** It maps the internal Closepilot Deal state to the configured external CRM format (e.g., Salesforce Opportunity).
4. **API Call:** Pushes the update to the CRM to ensure sales managers have visibility in their native tools.

## Diagram: Core State Machine

```text
[ new-lead ] ---> (Ingestion) ---> [ qualified ] ---> (Enrichment/Scoping)
                                        |
                                        v
[ proposal-sent ] <--- (Proposal) <--- [ scoping ]
      |
      v
[ negotiating / closed-won ]  <--- (Human / Future Chase Agent)
```
