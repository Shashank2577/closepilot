# Closepilot

Autonomous B2B Deal Flow Engine for Service Businesses.

## Overview

Closepilot is an AI-powered system that automates the entire B2B deal lifecycle for service businesses. Using a multi-agent architecture, it handles:

- **Ingestion**: Automatically captures leads from Gmail
- **Enrichment**: Researches prospects and companies
- **Scoping**: Analyzes requirements and creates project scopes
- **Proposal**: Generates customized proposals
- **CRM Sync**: Updates CRM systems
- **Orchestration**: Coordinates all agents with human oversight

## Architecture

This is a monorepo with 7 packages:

```
packages/
├── core/           # Shared TypeScript type definitions
├── mcp-client/     # MCP client for Jules agents to interact with Deal Store
├── mcp-server/     # Deal Store MCP server (database + Google services)
├── db/             # PostgreSQL schema and Drizzle ORM
├── api/            # Hono-based REST API
├── web/            # Next.js web application
└── agents/         # Agent implementations (ingestion, enrichment, scoping, proposal, crm-sync, orchestrator)
```

## Tech Stack

- **Runtime**: Node.js 20+
- **Package Manager**: pnpm
- **Language**: TypeScript 5.3+
- **Database**: PostgreSQL with Drizzle ORM
- **API**: Hono
- **Web**: Next.js 15 + React 18
- **AI**: Claude API with Anthropic Agent SDK
- **MCP**: Model Context Protocol server for tool exposure
- **Services**: Gmail API, Google Calendar API, Google Drive API

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 8+
- Docker (for PostgreSQL)
- GitHub CLI (gh)

### Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd closepilot
```

2. Run the setup script:
```bash
./scripts/setup.sh
```

This will:
- Install all dependencies
- Set up the PostgreSQL database
- Generate Drizzle migrations
- Build all packages
- Start development servers

3. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your API keys and credentials
```

4. Start development servers:
```bash
# Start all services
pnpm dev

# Or start individually:
pnpm mcp:dev    # MCP server on port 3000
pnpm api:dev    # API server on port 3001
pnpm web:dev    # Web app on port 3002
```

## Development

### Database

- **View data**: `pnpm db:studio` (opens Drizzle Studio)
- **Push schema**: `pnpm db:push` (pushes schema changes to database)
- **Run migrations**: `pnpm db:migrate`

### Testing

- **Run all tests**: `pnpm test`
- **Run specific package**: `pnpm --filter @closepilot/<package> test`

### Building

- **Build all**: `pnpm build`
- **Build specific**: `pnpm --filter @closepilot/<package> build`

### Linting

- **Lint all**: `pnpm lint`
- **Lint specific**: `pnpm --filter @closepilot/<package> lint`

## Project Status

This project is currently in Phase 0: Foundation setup.

- [x] Repository initialization
- [x] Workspace configuration
- [x] Package structure
- [ ] Core type definitions
- [ ] MCP server infrastructure
- [ ] Database schema
- [ ] Agent implementations
- [ ] Web UI

## Contributing

This project uses a parallel development workflow with 15 independent agent sessions. See `docs/superpowers/specs/2026-04-15-closepilot-foundation-design.md` for the complete implementation plan.

## License

MIT
