import { createLLMClient, type Deal, type LLMClient, type ProjectScope } from '@closepilot/core';

export interface GeneratedContent {
  executiveSummary: string;
  scope: string;
  timeline: string;
  terms: string[];
  nextSteps: string[];
  coverEmail: string;
}

interface GeneratedContentJson {
  executiveSummary?: string;
  scope?: string;
  timeline?: string;
  terms?: string[];
  nextSteps?: string[];
  coverEmail?: string;
}

export async function generateContent(deal: Deal, scope: ProjectScope): Promise<GeneratedContent> {
  const llm = createLLMClient({ maxTokens: 2200 });
  const parsed = await generateProposalJson(llm, deal, scope);

  return {
    executiveSummary: parsed.executiveSummary || fallbackExecutiveSummary(deal, scope),
    scope: parsed.scope || fallbackScope(scope),
    timeline: parsed.timeline || fallbackTimeline(scope),
    terms: Array.isArray(parsed.terms) && parsed.terms.length > 0 ? parsed.terms : fallbackTerms(),
    nextSteps: Array.isArray(parsed.nextSteps) && parsed.nextSteps.length > 0 ? parsed.nextSteps : fallbackNextSteps(),
    coverEmail: parsed.coverEmail || fallbackCoverEmail(deal),
  };
}

async function generateProposalJson(
  llm: LLMClient,
  deal: Deal,
  scope: ProjectScope
): Promise<GeneratedContentJson> {
  const prompt = `Generate proposal content for this B2B services opportunity.

Lead:
- Name: ${deal.leadName}
- Email: ${deal.leadEmail}
- Company: ${deal.leadCompany || 'unknown'}
- Title: ${deal.leadTitle || 'unknown'}

Project scope:
${JSON.stringify(scope, null, 2)}

Requirements:
${JSON.stringify(deal.requirements || [], null, 2)}

Write specific, non-boilerplate proposal content. Use concrete language from the requirements. Avoid unsupported claims.

Return JSON:
{
  "executiveSummary": "2 concise paragraphs",
  "scope": "scope of work with concrete deliverables",
  "timeline": "timeline and phase narrative",
  "terms": ["term"],
  "nextSteps": ["next step"],
  "coverEmail": "short email introducing the proposal"
}`;

  return llm.generateJson<GeneratedContentJson>({
    prompt,
    maxTokens: 2200,
    temperature: 0.3,
  });
}

function fallbackExecutiveSummary(deal: Deal, scope: ProjectScope): string {
  const companyName = deal.leadCompany || 'your company';
  return `This proposal outlines a focused engagement for ${companyName} to deliver ${scope.title}. ${scope.description}`;
}

function fallbackScope(scope: ProjectScope): string {
  return `Deliverables:\n${scope.deliverables.map((item) => `- ${item}`).join('\n')}\n\nAssumptions:\n${scope.assumptions
    .map((item) => `- ${item}`)
    .join('\n')}\n\nRisks:\n${scope.risks.map((item) => `- ${item}`).join('\n')}`;
}

function fallbackTimeline(scope: ProjectScope): string {
  return scope.timeline
    ? `The estimated timeline is ${scope.timeline}, subject to final scope confirmation and stakeholder feedback cycles.`
    : 'The final timeline will be confirmed during kickoff after requirements and dependencies are validated.';
}

function fallbackTerms(): string[] {
  return [
    'Proposal is valid for 30 days.',
    'Scope changes may affect timeline and pricing.',
    'Payment schedule will be finalized in the statement of work.',
  ];
}

function fallbackNextSteps(): string[] {
  return ['Review proposal', 'Confirm scope and timeline', 'Approve statement of work', 'Schedule kickoff'];
}

function fallbackCoverEmail(deal: Deal): string {
  return `Hi ${deal.leadName},\n\nAttached is the proposal based on our current understanding of your requirements. Please review it and share any feedback or questions.\n\nBest regards`;
}
