/**
 * Complexity Analyzer
 *
 * Calculates project complexity score based on requirements
 */

import type { ProjectScope, Requirement } from '@closepilot/core';

export interface ComplexityAnalysis {
  score: number; // 0-100
  level: 'low' | 'medium' | 'high';
  factors: {
    requirementCount: number;
    technicalComplexity: number;
    ambiguity: number;
    integrationComplexity: number;
  };
  explanation: string[];
}

/**
 * Analyzes project complexity
 */
export class ComplexityAnalyzer {
  /**
   * Calculate complexity from requirements and scope
   */
  calculate(requirements: Requirement[], scope: ProjectScope): 'low' | 'medium' | 'high' {
    const analysis = this.analyze(requirements, scope);
    return analysis.level;
  }

  /**
   * Perform detailed complexity analysis
   */
  analyze(requirements: Requirement[], scope: ProjectScope): ComplexityAnalysis {
    const factors = {
      requirementCount: this.scoreRequirementCount(requirements),
      technicalComplexity: this.scoreTechnicalComplexity(requirements, scope),
      ambiguity: this.scoreAmbiguity(requirements),
      integrationComplexity: this.scoreIntegrationComplexity(requirements, scope),
    };

    // Weighted average (weights sum to 1.0)
    const weights = {
      requirementCount: 0.2,
      technicalComplexity: 0.35,
      ambiguity: 0.25,
      integrationComplexity: 0.2,
    };

    const score =
      factors.requirementCount * weights.requirementCount +
      factors.technicalComplexity * weights.technicalComplexity +
      factors.ambiguity * weights.ambiguity +
      factors.integrationComplexity * weights.integrationComplexity;

    const level = this.getLevel(score);
    const explanation = this.buildExplanation(factors, score);

    return {
      score: Math.round(score),
      level,
      factors,
      explanation,
    };
  }

  /**
   * Score based on number of requirements (0-100)
   */
  private scoreRequirementCount(requirements: Requirement[]): number {
    const count = requirements.length;
    if (count <= 5) return 20;
    if (count <= 10) return 40;
    if (count <= 15) return 60;
    if (count <= 20) return 80;
    return 100;
  }

  /**
   * Score based on technical complexity (0-100)
   */
  private scoreTechnicalComplexity(requirements: Requirement[], scope: ProjectScope): number {
    let score = 30; // Base score

    const techReqs = requirements.filter((r) => r.category === 'technical');

    // Check for complex technologies
    const techKeywords = [
      'machine learning',
      'ai',
      'blockchain',
      'real-time',
      'microservices',
      'kubernetes',
      'scalability',
    ];

    const hasComplexTech = techReqs.some((req) =>
      techKeywords.some((keyword) => req.description.toLowerCase().includes(keyword))
    );

    if (hasComplexTech) score += 30;

    // Check for multiple service types
    if (scope.services.length > 3) score += 20;
    if (scope.services.length > 5) score += 20;

    return Math.min(score, 100);
  }

  /**
   * Score based on ambiguity in requirements (0-100, higher = more complex)
   */
  private scoreAmbiguity(requirements: Requirement[]): number {
    const lowPriorityCount = requirements.filter((r) => r.priority === 'low').length;
    const lowPriorityRatio = lowPriorityCount / requirements.length;

    // More low-priority/ambiguous items = higher complexity
    return Math.round(lowPriorityRatio * 100);
  }

  /**
   * Score based on integration complexity (0-100)
   */
  private scoreIntegrationComplexity(requirements: Requirement[], scope: ProjectScope): number {
    let score = 20;

    // Check for integration requirements
    const integrationKeywords = ['api', 'integration', 'third-party', 'external', 'connect'];
    const integrationReqs = requirements.filter((req) =>
      integrationKeywords.some((keyword) => req.description.toLowerCase().includes(keyword))
    );

    score += integrationReqs.length * 15;

    // Check deliverables for integration complexity
    const deliverableText = scope.deliverables.join(' ').toLowerCase();
    if (deliverableText.includes('api')) score += 20;
    if (deliverableText.includes('integration')) score += 20;

    return Math.min(score, 100);
  }

  /**
   * Convert numeric score to complexity level
   */
  private getLevel(score: number): 'low' | 'medium' | 'high' {
    if (score < 40) return 'low';
    if (score < 70) return 'medium';
    return 'high';
  }

  /**
   * Build human-readable explanation
   */
  private buildExplanation(factors: ComplexityAnalysis['factors'], score: number): string[] {
    const explanation: string[] = [];

    if (factors.requirementCount > 70) {
      explanation.push('High number of requirements increases complexity');
    }

    if (factors.technicalComplexity > 70) {
      explanation.push('Technical requirements involve complex technologies');
    }

    if (factors.ambiguity > 60) {
      explanation.push('Many requirements need clarification');
    }

    if (factors.integrationComplexity > 60) {
      explanation.push('Multiple integrations increase project complexity');
    }

    if (explanation.length === 0) {
      explanation.push('Project appears straightforward');
    }

    return explanation;
  }
}
