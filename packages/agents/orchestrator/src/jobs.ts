export type AgentJobType =
  | 'RunEnrichment'
  | 'RunOutreach'
  | 'RunScoping'
  | 'RunProposal'
  | 'RunChase'
  | 'RunPrep'
  | 'RunCRMSync';

export interface AgentJob {
  type: AgentJobType;
  dealId: string; // Changed from number to string to match Deal.id type in orchestrator/src/index.ts
  payload?: Record<string, unknown>;
}
