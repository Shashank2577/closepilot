import { Deal, DealStage } from './deal';
import type { ClosepilotLogger } from '../logger';

/**
 * Input for agents to process a deal
 */
export interface AgentInput<T = unknown> {
  dealId: string;
  deal: Deal;
  context: T;
  metadata?: AgentMetadata;
  logger?: ClosepilotLogger;
}

/**
 * Output from agent processing
 */
export interface AgentOutput<T = unknown> {
  dealId: string;
  success: boolean;
  data?: T;
  errors?: string[];
  nextStage?: DealStage;
  requiresApproval: boolean;
  approvalReason?: string;
  metadata?: AgentMetadata;
  durationMs: number;
}

/**
 * Metadata for agent execution
 */
export interface AgentMetadata {
  agentType: AgentType;
  executionId: string;
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
}

/**
 * Agent types in the system
 */
export enum AgentType {
  INGESTION = 'ingestion',
  ENRICHMENT = 'enrichment',
  SCOPING = 'scoping',
  PROPOSAL = 'proposal',
  CRM_SYNC = 'crm_sync',
  ORCHESTRATOR = 'orchestrator',
}

/**
 * Handoff between agents
 */
export interface AgentHandoff {
  fromAgent: AgentType;
  toAgent: AgentType;
  dealId: string;
  reason: string;
  context: unknown;
  timestamp: Date;
}

/**
 * Context for enrichment agent
 */
export interface EnrichmentContext {
  companyResearchDepth: 'basic' | 'comprehensive';
  prospectResearchDepth: 'basic' | 'comprehensive';
  sourcesToCheck: string[];
}

/**
 * Context for scoping agent
 */
export interface ScopingContext {
  emailThreadId?: string;
  additionalContext?: string;
  complexity: 'low' | 'medium' | 'high';
}

/**
 * Context for proposal agent
 */
export interface ProposalContext {
  templateId?: string;
  pricingStrategy: 'standard' | 'premium' | 'custom';
  includeCaseStudies: boolean;
  timelineInWeeks?: number;
}

/**
 * Context for CRM sync agent
 */
export interface CrmSyncContext {
  crmSystem: 'hubspot' | 'salesforce' | 'pipedrive';
  syncFields: string[];
  createContact: boolean;
  createDeal: boolean;
}
