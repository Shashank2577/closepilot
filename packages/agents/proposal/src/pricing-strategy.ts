import { PricingBreakdown } from '@closepilot/core';

export type PricingStrategyType = 'standard' | 'premium' | 'custom';

// Base rates for different services
const SERVICE_BASE_RATES: Record<string, number> = {
  'Web Development': 15000,
  'Mobile App Development': 25000,
  'UI/UX Design': 10000,
  'Cloud Migration': 20000,
  'SEO': 5000,
  'Software Engineering': 30000,
  'System Integration': 15000,
};

const DEFAULT_BASE_RATE = 10000;

export function calculatePricing(
  services: string[],
  complexity: 'low' | 'medium' | 'high',
  strategy: PricingStrategyType
): PricingBreakdown {

  let complexityMultiplier = 1;
  if (complexity === 'medium') {
    complexityMultiplier = 1.5;
  } else if (complexity === 'high') {
    complexityMultiplier = 2.5;
  }

  let marginMultiplier = 1;
  if (strategy === 'standard') {
    // 15% margin
    marginMultiplier = 1.15;
  } else if (strategy === 'premium') {
    // 30% margin
    marginMultiplier = 1.30;
  } else if (strategy === 'custom') {
    // Custom negotiated, arbitrarily picking 20% for now
    marginMultiplier = 1.20;
  }

  const breakdown: PricingBreakdown['breakdown'] = [];
  let total = 0;

  for (const service of services) {
    const baseRate = SERVICE_BASE_RATES[service] || DEFAULT_BASE_RATE;
    const amount = baseRate * complexityMultiplier * marginMultiplier;

    breakdown.push({
      service,
      amount: Math.round(amount),
      description: `${strategy.charAt(0).toUpperCase() + strategy.slice(1)} pricing for ${service} at ${complexity} complexity.`
    });

    total += amount;
  }

  // If no services were provided, add a default line item
  if (breakdown.length === 0) {
    const defaultAmount = DEFAULT_BASE_RATE * complexityMultiplier * marginMultiplier;
    breakdown.push({
      service: 'Professional Services',
      amount: Math.round(defaultAmount),
      description: `Professional services at ${complexity} complexity.`
    });
    total += defaultAmount;
  }

  return {
    currency: 'USD',
    total: Math.round(total),
    breakdown,
    paymentSchedule: '50% upfront, 25% upon beta delivery, 25% upon final deployment.'
  };
}
