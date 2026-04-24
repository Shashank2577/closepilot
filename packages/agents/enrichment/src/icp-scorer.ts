import type { CompanyResearch, ProspectResearch } from '@closepilot/core';

export interface ICPConfig {
  targetIndustries: string[];
  preferredTechnologies: string[];
  minCompanySize?: number;
  maxCompanySize?: number;
  qualifyThreshold: number;
  reviewThreshold: number;
  weights: {
    industry: number;
    size: number;
    techStack: number;
    authority: number;
    signalQuality: number;
  };
}

export interface ICPScoreBreakdown {
  category: string;
  score: number;
  max: number;
  reasoning: string;
}

export interface ICPScoreResult {
  totalScore: number;
  recommendation: 'qualify' | 'needs-review' | 'decline';
  breakdown: ICPScoreBreakdown[];
}

const DEFAULT_ICP_CONFIG: ICPConfig = {
  targetIndustries: ['software', 'saas', 'technology', 'fintech', 'healthcare', 'ecommerce'],
  preferredTechnologies: ['react', 'next.js', 'node.js', 'typescript', 'postgres', 'aws', 'gcp', 'azure'],
  minCompanySize: 10,
  maxCompanySize: 1000,
  qualifyThreshold: 70,
  reviewThreshold: 45,
  weights: {
    industry: 20,
    size: 20,
    techStack: 20,
    authority: 25,
    signalQuality: 15,
  },
};

export function scoreICP(
  company: CompanyResearch | undefined,
  prospect: ProspectResearch | undefined,
  config: ICPConfig = DEFAULT_ICP_CONFIG
): ICPScoreResult {
  const breakdown: ICPScoreBreakdown[] = [];
  let total = 0;

  const industry = company?.industry?.toLowerCase() || '';
  const industryMatch = config.targetIndustries.some((target) => industry.includes(target.toLowerCase()));
  total += pushScore(
    breakdown,
    'industry',
    industryMatch ? config.weights.industry : Math.round(config.weights.industry * 0.35),
    config.weights.industry,
    industryMatch ? 'Company industry matches target ICP' : 'Industry is unknown or outside target ICP'
  );

  const employeeCount = parseCompanySize(company?.size);
  const inSizeRange =
    employeeCount === undefined ||
    ((!config.minCompanySize || employeeCount >= config.minCompanySize) &&
      (!config.maxCompanySize || employeeCount <= config.maxCompanySize));
  total += pushScore(
    breakdown,
    'size',
    inSizeRange ? config.weights.size : Math.round(config.weights.size * 0.5),
    config.weights.size,
    employeeCount === undefined
      ? 'Company size unavailable; partial credit applied'
      : `${employeeCount} employees is ${inSizeRange ? 'inside' : 'outside'} target range`
  );

  const technologies = (company?.technologies || []).map((tech) => tech.toLowerCase());
  const techMatches = config.preferredTechnologies.filter((tech) =>
    technologies.some((candidate) => candidate.includes(tech.toLowerCase()))
  );
  const techScore = Math.min(config.weights.techStack, techMatches.length * 5);
  total += pushScore(
    breakdown,
    'tech_stack',
    techScore,
    config.weights.techStack,
    techMatches.length > 0 ? `Matched technologies: ${techMatches.join(', ')}` : 'No preferred technology signals found'
  );

  const authorityScore = prospect?.decisionMaker
    ? config.weights.authority
    : prospect?.influenceLevel === 'high'
      ? Math.round(config.weights.authority * 0.75)
      : prospect?.influenceLevel === 'medium'
        ? Math.round(config.weights.authority * 0.5)
        : Math.round(config.weights.authority * 0.2);
  total += pushScore(
    breakdown,
    'authority',
    authorityScore,
    config.weights.authority,
    prospect?.decisionMaker ? 'Prospect appears to be a decision maker' : 'Prospect authority is limited or inferred'
  );

  const signalCount = [
    company?.description,
    company?.recentNews?.length,
    company?.fundingInfo?.stage,
    prospect?.background,
  ].filter(Boolean).length;
  const signalScore = Math.min(config.weights.signalQuality, signalCount * 4);
  total += pushScore(
    breakdown,
    'signal_quality',
    signalScore,
    config.weights.signalQuality,
    `${signalCount} useful enrichment signals found`
  );

  const totalScore = Math.min(100, total);
  const recommendation =
    totalScore >= config.qualifyThreshold
      ? 'qualify'
      : totalScore >= config.reviewThreshold
        ? 'needs-review'
        : 'decline';

  return { totalScore, recommendation, breakdown };
}

function pushScore(
  breakdown: ICPScoreBreakdown[],
  category: string,
  score: number,
  max: number,
  reasoning: string
): number {
  breakdown.push({ category, score, max, reasoning });
  return score;
}

function parseCompanySize(size?: string): number | undefined {
  if (!size) return undefined;
  const normalized = size.replace(/,/g, '').toLowerCase();
  const range = normalized.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (range) return Math.round((Number(range[1]) + Number(range[2])) / 2);
  const plus = normalized.match(/(\d+)\+/);
  if (plus) return Number(plus[1]);
  const number = normalized.match(/\d+/);
  return number ? Number(number[0]) : undefined;
}
