# SPEC.md

## Objective
Standardize agent architecture and observability in `@closepilot/core` package.

## Components
1. **BaseAgent**: Abstract class providing standard lifecycle (`validateDealStage`, `preProcess`, `execute`, `postProcess`, `run`) in `packages/core/src/agent.ts`.
2. **ClosepilotLogger**: Structured JSON logger with `dealId` and `agentType` fields, supporting `info`, `warn`, `error`, `debug` methods, controlled by `LOG_LEVEL` environment variable. Exported via `createLogger(agentType)` in `packages/core/src/logger.ts`.
3. **SecretProvider**: Singleton managing typed credentials getters, throwing errors on missing variables, in `packages/core/src/secrets.ts`.
4. **Types Update**: Update `AgentInput` to include an optional `logger` and `AgentOutput` to include a required `durationMs` in `packages/core/src/types/agent.ts`.
5. **Testing**: Vitest tests for the new functionalities (`agent.test.ts`, `logger.test.ts`, `secrets.test.ts`).
6. **Agent Update**: Remove direct `process.env` access from `packages/agents/crm-sync/src/index.ts` and `packages/agents/ingestion/src/index.ts` by using the new `SecretProvider`.
