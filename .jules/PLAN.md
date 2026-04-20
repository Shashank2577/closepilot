1. **Create BaseAgent** in `packages/core/src/agent.ts`
2. **Create ClosepilotLogger** in `packages/core/src/logger.ts`
3. **Create SecretProvider** in `packages/core/src/secrets.ts`
4. **Update Agent Types** in `packages/core/src/types/agent.ts`
5. **Write tests** in `packages/core/src/agent.test.ts`, `logger.test.ts`, `secrets.test.ts`
6. **Export new modules** in `packages/core/src/index.ts`
7. **Refactor Agents** to use `secrets` instead of `process.env` in `packages/agents/`
8. **Run checks** `pnpm typecheck` and `pnpm test`
