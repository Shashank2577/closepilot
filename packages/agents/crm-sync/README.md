# agents/crm-sync

The fifth agent in the Closepilot pipeline. Syncs the completed deal — contact, deal record, proposal, and activities — to the configured CRM system. Supports HubSpot, Salesforce, and Pipedrive.

## Status

✅ Complete — adapters for all three CRMs implemented, field mapping, activity sync, and document attachment.

## What it does

```
Deal in CRM_SYNC stage (proposal approved)
    │
    ├─── Initialize CRM adapter (HubSpot / Salesforce / Pipedrive)
    │
    ├─── Contact sync
    │       • Search for existing contact by email
    │       • Create or update contact record
    │       • Link to company / organization
    │
    ├─── Deal sync
    │       • Create deal/opportunity in CRM
    │       • Map Closepilot stage → CRM pipeline stage
    │       • Set value, close date, probability
    │
    ├─── Activity sync
    │       • Push email thread highlights as CRM notes
    │       • Log meetings and calls
    │
    ├─── Document attachment
    │       • Attach proposal document reference
    │
    └─── Update deal: crmId, crmType, crmSyncedAt
         Advance stage → COMPLETED
```

## CRM adapters

### HubSpot (`hubspot-adapter.ts`)
Uses `@hubspot/api-client`. Supports contacts, deals, associations, file attachments, and activity notes.

### Salesforce (`salesforce-adapter.ts`)
Uses `jsforce`. Supports Contact, Opportunity, Task objects and content version for document attachment.

### Pipedrive (`pipedrive-adapter.ts`)
Uses `pipedrive` npm package. Supports Persons, Deals, Activities, Organizations, and Files.

## Configuration

The adapter is selected at runtime based on the `crmType` field in the deal or a `CRM_TYPE` environment variable:

```env
CRM_TYPE=hubspot   # or 'salesforce' or 'pipedrive'

# HubSpot
HUBSPOT_API_KEY=
HUBSPOT_OAUTH_TOKEN=

# Salesforce
SALESFORCE_USERNAME=
SALESFORCE_PASSWORD=
SALESFORCE_TOKEN=

# Pipedrive
PIPEDRIVE_API_KEY=
```

## Running

```bash
pnpm dev    # tsx watch src/index.ts
pnpm test   # vitest
```
