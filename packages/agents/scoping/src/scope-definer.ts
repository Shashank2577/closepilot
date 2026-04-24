/**
 * Scope Definer
 *
 * Defines project scope based on extracted requirements
 */

import { createLLMClient, parseJsonFromText, type LLMClient, type ProjectScope, type Requirement } from '@closepilot/core';

/**
 * Defines project scope from requirements
 */
export class ScopeDefiner {
  private llm: LLMClient;

  constructor(llm: LLMClient = createLLMClient()) {
    this.llm = llm;
  }

  /**
   * Define project scope based on requirements
   */
  async define(requirements: Requirement[], emailContent: string): Promise<ProjectScope> {
    const prompt = this.buildPrompt(requirements, emailContent);

    const responseText = await this.llm.generateText({
      prompt,
      maxTokens: 2000,
      temperature: 0.2,
    });
    return this.parseScope(responseText);
  }

  /**
   * Build the scope definition prompt
   */
  private buildPrompt(requirements: Requirement[], emailContent: string): string {
    const reqText = requirements
      .map((r) => `[${r.priority}] ${r.category}: ${r.description}`)
      .join('\n');

    return `You are a project manager defining scope for a B2B service project. Based on the requirements and email thread, define a comprehensive project scope.

Requirements:
${reqText}

Original Email Context:
${emailContent}

Define the scope with these elements:

1. title: Short project title (2-6 words)
2. description: 2-3 sentence project overview
3. timeline: Estimated duration (e.g., "8-12 weeks", "3-4 months")
4. budgetRange: Price range based on requirements (e.g., "$50k-$75k", "$100k-$150k")
5. services: Array of service types (e.g., ["Web Development", "UI/UX Design", "API Integration"])
6. deliverables: Specific tangible outputs (e.g., ["Responsive web application", "Admin dashboard", "API documentation"])
7. assumptions: Things you're assuming to be true (e.g., ["Client will provide branding assets", "Third-party APIs are available"])
8. risks: Potential risks and concerns (e.g., ["Timeline may vary based on feedback speed", "Integration complexity not fully known"])

Return in this JSON format:
{
  "title": "Project Title",
  "description": "Project description",
  "timeline": "Estimated timeline",
  "budgetRange": "Budget range",
  "services": ["service1", "service2"],
  "deliverables": ["deliverable1", "deliverable2"],
  "assumptions": ["assumption1", "assumption2"],
  "risks": ["risk1", "risk2"]
}

Return ONLY valid JSON, no other text.`;
  }

  /**
   * Parse scope from Claude response
   */
  private parseScope(responseText: string): ProjectScope {
    try {
      const parsed = parseJsonFromText<any>(responseText);

      return {
        title: parsed.title || 'Project',
        description: parsed.description || '',
        timeline: parsed.timeline,
        budgetRange: parsed.budgetRange,
        complexity: 'medium', // Will be overridden by complexity analyzer
        services: parsed.services || [],
        deliverables: parsed.deliverables || [],
        assumptions: parsed.assumptions || [],
        risks: parsed.risks || [],
      };
    } catch (error) {
      console.error('Failed to parse scope:', error);
      // Return default scope on parse error
      return {
        title: 'Project',
        description: 'Project scope could not be determined',
        services: [],
        deliverables: [],
        assumptions: [],
        risks: [],
        complexity: 'medium',
      };
    }
  }
}
