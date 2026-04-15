import type { Deal, ProjectScope } from '@closepilot/core';

/**
 * Case study summary
 */
export interface CaseStudy {
  dealId: string;
  title: string;
  clientName: string;
  industry?: string;
  services: string[];
  complexity: 'low' | 'medium' | 'high';
  outcome: string;
  keyMetrics?: string[];
  completionDate: Date;
}

/**
 * Match score for case studies
 */
interface MatchedCaseStudy extends CaseStudy {
  matchScore: number;
  matchReasons: string[];
}

/**
 * Calculate similarity score between project scopes
 */
function calculateSimilarity(
  projectScope: ProjectScope,
  deal: Deal
): number {
  let score = 0;

  // Check if deal has project scope
  if (!deal.projectScope) {
    return 0;
  }

  const pastScope = deal.projectScope;

  // Service overlap (40 points max)
  const matchingServices = projectScope.services.filter(s =>
    pastScope.services.some(ps => ps.toLowerCase() === s.toLowerCase())
  );
  score += (matchingServices.length / Math.max(projectScope.services.length, 1)) * 40;

  // Complexity match (20 points)
  if (pastScope.complexity === projectScope.complexity) {
    score += 20;
  }

  // Deliverable similarity (20 points)
  if (pastScope.deliverables && projectScope.deliverables) {
    const matchingDeliverables = projectScope.deliverables.filter(d =>
      pastScope.deliverables!.some(pd =>
        pd.toLowerCase().includes(d.toLowerCase()) || d.toLowerCase().includes(pd.toLowerCase())
      )
    );
    score += (matchingDeliverables.length / Math.max(projectScope.deliverables.length, 1)) * 20;
  }

  // Industry/research match (20 points)
  if (deal.companyResearch && projectScope.description) {
    const industry = deal.companyResearch.industry?.toLowerCase() || '';
    const desc = projectScope.description.toLowerCase();

    if (industry && desc.includes(industry)) {
      score += 10;
    }
  }

  return Math.min(score, 100);
}

/**
 * Generate match reasons
 */
function generateMatchReasons(
  projectScope: ProjectScope,
  caseStudy: CaseStudy
): string[] {
  const reasons: string[] = [];

  // Service matches
  const matchingServices = projectScope.services.filter(s =>
    caseStudy.services.some(cs =>
      cs.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(cs.toLowerCase())
    )
  );
  if (matchingServices.length > 0) {
    reasons.push(`Similar services: ${matchingServices.join(', ')}`);
  }

  // Complexity match
  if (caseStudy.complexity === projectScope.complexity) {
    reasons.push(`Same complexity level: ${projectScope.complexity}`);
  }

  // Industry match
  if (caseStudy.industry && projectScope.description) {
    const desc = projectScope.description.toLowerCase();
    if (desc.includes(caseStudy.industry.toLowerCase())) {
      reasons.push(`Industry experience: ${caseStudy.industry}`);
    }
  }

  return reasons;
}

/**
 * Find matching case studies from past deals
 */
export async function findMatchingCaseStudies(
  projectScope: ProjectScope,
  pastDeals: Deal[],
  limit = 3
): Promise<MatchedCaseStudy[]> {
  // Filter deals that were completed and have project scope
  const completedDeals = pastDeals.filter(
    deal => deal.stage === 'completed' && deal.projectScope
  );

  // Score and rank deals
  const scored = completedDeals
    .map(deal => {
      const score = calculateSimilarity(projectScope, deal);

      // Convert deal to case study
      const caseStudy: CaseStudy = {
        dealId: deal.id,
        title: deal.projectScope!.title,
        clientName: deal.leadCompany || deal.leadName,
        industry: deal.companyResearch?.industry,
        services: deal.projectScope!.services,
        complexity: deal.projectScope!.complexity,
        outcome: extractOutcome(deal),
        keyMetrics: extractKeyMetrics(deal),
        completionDate: deal.updatedAt,
      };

      const matchReasons = generateMatchReasons(projectScope, caseStudy);

      return {
        caseStudy,
        matchScore: score,
        matchReasons,
      };
    })
    .filter(item => item.matchScore > 20) // Only include relevant matches
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit);

  return scored.map(s => ({
    ...s.caseStudy,
    matchScore: s.matchScore,
    matchReasons: s.matchReasons,
  }));
}

/**
 * Extract outcome from deal
 */
function extractOutcome(deal: Deal): string {
  if (deal.projectScope?.description) {
    return deal.projectScope.description;
  }
  return 'Successfully completed project';
}

/**
 * Extract key metrics from deal
 */
function extractKeyMetrics(deal: Deal): string[] | undefined {
  const metrics: string[] = [];

  if (deal.projectScope?.deliverables) {
    const deliverableCount = deal.projectScope.deliverables.length;
    metrics.push(`${deliverableCount} key deliverables`);
  }

  if (deal.projectScope?.complexity) {
    metrics.push(`Complexity: ${deal.projectScope.complexity}`);
  }

  return metrics.length > 0 ? metrics : undefined;
}

/**
 * Format case study for proposal
 */
export function formatCaseStudy(caseStudy: MatchedCaseStudy): string {
  let text = `### ${caseStudy.title}\n\n`;
  text += `**Client**: ${caseStudy.clientName}`;

  if (caseStudy.industry) {
    text += ` (${caseStudy.industry})`;
  }

  text += `\n**Services**: ${caseStudy.services.join(', ')}\n`;
  text += `**Complexity**: ${caseStudy.complexity}\n\n`;
  text += `**Outcome**: ${caseStudy.outcome}\n\n`;

  if (caseStudy.keyMetrics && caseStudy.keyMetrics.length > 0) {
    text += '**Key Results**:\n';
    for (const metric of caseStudy.keyMetrics) {
      text += `- ${metric}\n`;
    }
    text += '\n';
  }

  if (caseStudy.matchReasons.length > 0) {
    text += `**Why This Is Relevant**: ${caseStudy.matchReasons.join('; ')}\n\n`;
  }

  return text;
}

/**
 * Generate case studies section for proposal
 */
export function generateCaseStudiesSection(
  caseStudies: MatchedCaseStudy[]
): string {
  if (caseStudies.length === 0) {
    return '';
  }

  let section = '## Relevant Case Studies\n\n';
  section += 'We have successfully delivered similar projects for clients like:\n\n';

  for (const caseStudy of caseStudies) {
    section += formatCaseStudy(caseStudy);
  }

  return section;
}
