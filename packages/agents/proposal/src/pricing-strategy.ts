import type { ProjectScope, PricingBreakdown } from '@closepilot/core';

/**
 * Pricing strategy types
 */
export type PricingStrategy = 'standard' | 'premium' | 'custom';

/**
 * Service category base rates (hourly)
 */
const SERVICE_BASE_RATES: Record<string, number> = {
  'web development': 100,
  'web application': 120,
  'website': 80,
  'frontend': 90,
  'backend': 110,
  'mobile app': 130,
  'ios': 140,
  'android': 140,
  'react native': 125,
  'flutter': 125,
  'ui design': 95,
  'ux design': 100,
  'design system': 110,
  'custom software': 140,
  'enterprise software': 160,
  'saas': 150,
  'api integration': 100,
  'integration': 90,
  'consulting': 150,
  'advisory': 175,
  'architecture review': 160,
  'maintenance': 75,
  'support': 70,
  'optimization': 110,
  'performance': 120,
};

/**
 * Complexity multipliers
 */
const COMPLEXITY_MULTIPLIERS: Record<string, number> = {
  low: 1.0,
  medium: 1.3,
  high: 1.7,
};

/**
 * Strategy multipliers
 */
const STRATEGY_MULTIPLIERS: Record<PricingStrategy, number> = {
  standard: 1.0,
  premium: 1.35,
  custom: 1.5,
};

/**
 * Timeline adjustments (weeks to multiplier)
 */
const TIMELINE_ADJUSTMENTS: Record<number, number> = {
  1: 1.5,  // Rush - 50% premium
  2: 1.25, // Fast - 25% premium
  4: 1.0,  // Standard
  8: 0.95, // Extended - 5% discount
  12: 0.9, // Long-term - 10% discount
};

/**
 * Estimate hours for a service based on complexity
 */
function estimateServiceHours(service: string, complexity: string): number {
  const baseHours: Record<string, Record<string, number>> = {
    'web development': { low: 40, medium: 120, high: 300 },
    'web application': { low: 80, medium: 200, high: 500 },
    'website': { low: 40, medium: 80, high: 160 },
    'frontend': { low: 40, medium: 100, high: 250 },
    'backend': { low: 40, medium: 120, high: 300 },
    'mobile app': { low: 120, medium: 250, high: 500 },
    'ios': { low: 120, medium: 250, high: 500 },
    'android': { low: 120, medium: 250, high: 500 },
    'react native': { low: 100, medium: 200, high: 400 },
    'flutter': { low: 100, medium: 200, high: 400 },
    'ui design': { low: 20, medium: 60, high: 120 },
    'ux design': { low: 30, medium: 80, high: 160 },
    'design system': { low: 40, medium: 100, high: 200 },
    'custom software': { low: 100, medium: 300, high: 800 },
    'enterprise software': { low: 200, medium: 500, high: 1200 },
    'saas': { low: 150, medium: 400, high: 1000 },
    'api integration': { low: 20, medium: 60, high: 150 },
    'integration': { low: 15, medium: 50, high: 120 },
    'consulting': { low: 10, medium: 30, high: 80 },
    'advisory': { low: 10, medium: 25, high: 60 },
    'architecture review': { low: 15, medium: 40, high: 100 },
    'maintenance': { low: 10, medium: 30, high: 60 },
    'support': { low: 10, medium: 25, high: 50 },
    'optimization': { low: 20, medium: 60, high: 150 },
    'performance': { low: 25, medium: 80, high: 200 },
  };

  const serviceLower = service.toLowerCase();
  const hours = baseHours[serviceLower]?.[complexity];

  return hours || 40; // Default to 40 hours if not found
}

/**
 * Calculate pricing for a project
 */
export function calculatePricing(
  projectScope: ProjectScope,
  strategy: PricingStrategy = 'standard',
  timelineWeeks?: number
): PricingBreakdown {
  const breakdown: PricingBreakdown = {
    currency: 'USD',
    total: 0,
    breakdown: [],
  };

  let subtotal = 0;

  // Calculate pricing for each service
  for (const service of projectScope.services) {
    const serviceLower = service.toLowerCase();
    const hourlyRate = SERVICE_BASE_RATES[serviceLower] || 100;
    const hours = estimateServiceHours(service, projectScope.complexity);
    const complexityMultiplier = COMPLEXITY_MULTIPLIERS[projectScope.complexity] || 1.0;
    const strategyMultiplier = STRATEGY_MULTIPLIERS[strategy];

    const serviceTotal = hourlyRate * hours * complexityMultiplier * strategyMultiplier;

    breakdown.breakdown.push({
      service: service.charAt(0).toUpperCase() + service.slice(1),
      amount: Math.round(serviceTotal),
      description: `${hours} estimated hours at $${hourlyRate}/hr`,
    });

    subtotal += serviceTotal;
  }

  // Apply timeline adjustment if specified
  let timelineMultiplier = 1.0;
  if (timelineWeeks) {
    // Find closest timeline match
    const timelineKeys = Object.keys(TIMELINE_ADJUSTMENTS).map(Number).sort((a, b) => a - b);
    for (const key of timelineKeys) {
      if (timelineWeeks <= key) {
        timelineMultiplier = TIMELINE_ADJUSTMENTS[key];
        break;
      }
    }
    // If longer than max, use max discount
    if (timelineMultiplier === 1.0 && timelineWeeks > 12) {
      timelineMultiplier = TIMELINE_ADJUSTMENTS[12];
    }
  }

  subtotal *= timelineMultiplier;

  // Calculate total and round
  breakdown.total = Math.round(subtotal);

  // Add payment schedule based on total
  if (breakdown.total < 10000) {
    breakdown.paymentSchedule = '50% upfront, 50% on completion';
  } else if (breakdown.total < 50000) {
    breakdown.paymentSchedule = '40% upfront, 30% at milestone, 30% on completion';
  } else {
    breakdown.paymentSchedule = '30% upfront, 40% at milestones, 30% on completion';
  }

  return breakdown;
}

/**
 * Generate pricing summary text
 */
export function generatePricingSummary(pricing: PricingBreakdown): string {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: pricing.currency,
  });

  let summary = '## Investment Breakdown\n\n';

  for (const item of pricing.breakdown) {
    summary += `- **${item.service}**: ${formatter.format(item.amount)}`;
    if (item.description) {
      summary += ` (${item.description})`;
    }
    summary += '\n';
  }

  summary += `\n**Total Investment**: ${formatter.format(pricing.total)}\n\n`;
  summary += `**Payment Schedule**: ${pricing.paymentSchedule}\n`;

  return summary;
}

/**
 * Estimate timeline from project scope
 */
export function estimateTimeline(projectScope: ProjectScope): number {
  const baseWeeks: Record<string, Record<string, number>> = {
    'web development': { low: 2, medium: 6, high: 16 },
    'web application': { low: 4, medium: 10, high: 24 },
    'website': { low: 2, medium: 4, high: 10 },
    'frontend': { low: 2, medium: 5, high: 12 },
    'backend': { low: 2, medium: 6, high: 16 },
    'mobile app': { low: 6, medium: 12, high: 24 },
    'ios': { low: 6, medium: 12, high: 24 },
    'android': { low: 6, medium: 12, high: 24 },
    'react native': { low: 5, medium: 10, high: 20 },
    'flutter': { low: 5, medium: 10, high: 20 },
    'ui design': { low: 1, medium: 3, high: 8 },
    'ux design': { low: 2, medium: 4, high: 10 },
    'design system': { low: 3, medium: 6, high: 12 },
    'custom software': { low: 6, medium: 16, high: 40 },
    'enterprise software': { low: 12, medium: 24, high: 60 },
    'saas': { low: 10, medium: 20, high: 50 },
    'api integration': { low: 1, medium: 3, high: 8 },
    'integration': { low: 1, medium: 2, high: 6 },
    'consulting': { low: 1, medium: 2, high: 6 },
    'advisory': { low: 1, medium: 2, high: 4 },
    'architecture review': { low: 1, medium: 3, high: 8 },
    'maintenance': { low: 1, medium: 2, high: 4 },
    'support': { low: 1, medium: 2, high: 4 },
    'optimization': { low: 2, medium: 4, high: 10 },
    'performance': { low: 2, medium: 5, high: 12 },
  };

  let maxWeeks = 0;

  for (const service of projectScope.services) {
    const serviceLower = service.toLowerCase();
    const weeks = baseWeeks[serviceLower]?.[projectScope.complexity] || 4;
    maxWeeks = Math.max(maxWeeks, weeks);
  }

  // Add buffer for multiple services
  if (projectScope.services.length > 2) {
    maxWeeks = Math.round(maxWeeks * 1.3);
  }

  return maxWeeks;
}
