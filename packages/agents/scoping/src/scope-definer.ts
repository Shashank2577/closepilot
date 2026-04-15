import { Requirement, ProjectScope } from '@closepilot/core';

export interface ScopeContext {
  emailThreadId?: string;
  additionalContext?: string;
  complexity: 'low' | 'medium' | 'high';
  title?: string;
  description?: string;
}

/**
 * Defines the project scope based on extracted requirements and context.
 */
export async function defineScope(
  requirements: Requirement[],
  context: ScopeContext
): Promise<ProjectScope> {
  const services: string[] = [];
  const deliverables: string[] = [];
  const assumptions: string[] = [];
  const risks: string[] = [];

  let timeline: string | undefined;
  let budgetRange: string | undefined;

  for (const req of requirements) {
    switch (req.category) {
      case 'functional':
        services.push(`Software Development: ${req.description}`);
        deliverables.push(`Feature: ${req.description}`);
        break;
      case 'technical':
        services.push(`Technical Implementation: ${req.description}`);
        deliverables.push(`System Component: ${req.description}`);
        if (req.description.includes('API') || req.description.includes('integration')) {
          risks.push('Third-party API changes or rate limits');
        }
        break;
      case 'timeline':
        timeline = req.description;
        if (req.description.toLowerCase().includes('urgent')) {
          risks.push('Aggressive timeline may impact feature scope');
        }
        break;
      case 'budget':
        budgetRange = req.description;
        break;
    }

    if (req.clarification) {
      assumptions.push(`Assuming standard implementation for: ${req.description}`);
    }
  }

  // Ensure there's at least some basic structure
  if (services.length === 0) {
    services.push('General Consultation and Development');
  }
  if (deliverables.length === 0) {
    deliverables.push('System Architecture and Implementation');
  }
  if (assumptions.length === 0) {
    assumptions.push('Client will provide timely feedback');
  }

  return {
    title: context.title || 'Custom Software Project',
    description: context.description || 'Implementation of identified requirements.',
    timeline,
    budgetRange,
    complexity: context.complexity,
    services,
    deliverables,
    assumptions,
    risks,
  };
}
