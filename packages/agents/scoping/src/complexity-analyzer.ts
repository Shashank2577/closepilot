import { ProjectScope, Requirement } from '@closepilot/core';

export interface ComplexityResult {
  score: number;
  scope: ProjectScope;
}

/**
 * Calculates the complexity score (0-100) based on requirements and scope properties,
 * and updates the scope's complexity rating.
 */
export async function calculateComplexity(
  requirements: Requirement[],
  scope: ProjectScope
): Promise<ComplexityResult> {
  let score = 0;

  // Base score from number of requirements
  score += requirements.length * 5;

  // Additional score for high priority requirements
  const highPriorityCount = requirements.filter((r) => r.priority === 'high').length;
  score += highPriorityCount * 10;

  // Score from deliverables and services
  score += scope.deliverables.length * 3;
  score += scope.services.length * 2;

  // Score from risks
  score += scope.risks.length * 8;

  // Cap at 100
  score = Math.min(score, 100);

  // Determine complexity level
  let complexityLevel: 'low' | 'medium' | 'high' = 'low';
  if (score >= 70) {
    complexityLevel = 'high';
  } else if (score >= 40) {
    complexityLevel = 'medium';
  }

  const updatedScope: ProjectScope = {
    ...scope,
    complexity: complexityLevel,
  };

  return {
    score,
    scope: updatedScope,
  };
}
