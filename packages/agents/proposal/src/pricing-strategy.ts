import { PricingBreakdown, Requirement } from '@closepilot/core';

export type PricingStrategyType = 'standard' | 'premium' | 'custom';

export interface PricingInput {
  services: string[];
  requirements: Requirement[];
  complexity: 'low' | 'medium' | 'high';
  strategy: PricingStrategyType;
  hourlyRate?: number;
  historicalProjects?: Array<{
    id?: number;
    name?: string;
    budget?: string | null;
  }>;
}

const DEFAULT_HOURLY_RATE = 150;

export function calculatePricing(input: PricingInput): PricingBreakdown {
  const hourlyRate = input.hourlyRate || Number(process.env.PROPOSAL_HOURLY_RATE || DEFAULT_HOURLY_RATE);
  const requirementHours = estimateRequirementHours(input.requirements, input.complexity);
  const serviceHours = estimateServiceHours(input.services, input.complexity);
  const estimatedSubtotal = Math.max(requirementHours, serviceHours) * hourlyRate;
  const historicalSubtotal = estimateHistoricalReferencePrice(input.historicalProjects);
  const blendedSubtotal =
    historicalSubtotal !== undefined ? estimatedSubtotal * 0.65 + historicalSubtotal * 0.35 : estimatedSubtotal;
  const total = Math.round(blendedSubtotal * strategyMultiplier(input.strategy));

  const breakdown = buildBreakdown(input, total);

  return {
    currency: 'USD',
    total,
    breakdown,
    paymentSchedule: buildPaymentSchedule(total),
  };
}

export function estimateRequirementHours(
  requirements: Requirement[],
  fallbackComplexity: 'low' | 'medium' | 'high'
): number {
  if (requirements.length === 0) return complexityBaseHours(fallbackComplexity);

  return requirements.reduce((sum, requirement) => {
    const priorityBase = requirement.priority === 'high' ? 40 : requirement.priority === 'medium' ? 24 : 10;
    const text = requirement.description.toLowerCase();
    const complexity =
      /integration|api|migration|security|compliance|realtime|real-time|ai|workflow|automation/.test(text)
        ? 1.6
        : text.length > 180
          ? 1.25
          : 1;
    return sum + priorityBase * complexity;
  }, 0);
}

function estimateServiceHours(services: string[], complexity: 'low' | 'medium' | 'high'): number {
  const serviceCount = Math.max(services.length, 1);
  return serviceCount * complexityBaseHours(complexity);
}

function complexityBaseHours(complexity: 'low' | 'medium' | 'high'): number {
  if (complexity === 'high') return 120;
  if (complexity === 'medium') return 72;
  return 40;
}

function strategyMultiplier(strategy: PricingStrategyType): number {
  if (strategy === 'premium') return 1.3;
  if (strategy === 'custom') return 1.2;
  return 1.15;
}

function buildBreakdown(input: PricingInput, total: number): PricingBreakdown['breakdown'] {
  const services = input.services.length > 0 ? input.services : ['Professional Services'];
  const perService = Math.round(total / services.length);
  const strategyLabel =
    input.strategy === 'premium' ? 'Premium' : input.strategy === 'custom' ? 'Custom' : 'Standard';
  return services.map((service, index) => ({
    service,
    amount: index === services.length - 1 ? total - perService * (services.length - 1) : perService,
    description: `${strategyLabel} pricing based on ${input.complexity} complexity and scoped requirements.`,
  }));
}

function buildPaymentSchedule(total: number): string {
  return total >= 50000
    ? '40% kickoff, 30% beta delivery, 30% launch acceptance.'
    : '50% kickoff, 25% beta delivery, 25% launch acceptance.';
}

function estimateHistoricalReferencePrice(
  historicalProjects: PricingInput['historicalProjects']
): number | undefined {
  if (!historicalProjects || historicalProjects.length === 0) return undefined;

  const prices = historicalProjects
    .map((project) => parseBudget(project.budget))
    .filter((price): price is number => typeof price === 'number' && Number.isFinite(price) && price > 0);

  if (prices.length === 0) return undefined;
  const avg = prices.reduce((sum, value) => sum + value, 0) / prices.length;
  return Math.round(avg);
}

function parseBudget(budget?: string | null): number | undefined {
  if (!budget) return undefined;
  const matches = budget.replace(/,/g, '').match(/\d+/g);
  if (!matches || matches.length === 0) return undefined;
  const numbers = matches.map((value) => Number(value)).filter((value) => Number.isFinite(value));
  if (numbers.length === 0) return undefined;
  return Math.round(numbers.reduce((sum, value) => sum + value, 0) / numbers.length);
}
