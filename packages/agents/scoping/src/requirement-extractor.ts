/**
 * Requirement Extractor
 *
 * Extracts and categorizes requirements from email content using Claude
 */

import { createLLMClient, parseJsonFromText, type LLMClient, type Requirement } from '@closepilot/core';

export interface ExtractionResult {
  requirements: Requirement[];
  confidence: number;
}

/**
 * Extracts requirements from email text
 */
export class RequirementExtractor {
  private llm: LLMClient;

  constructor(llm: LLMClient = createLLMClient()) {
    this.llm = llm;
  }

  /**
   * Extract requirements from email content
   */
  async extract(emailContent: string): Promise<Requirement[]> {
    const prompt = this.buildPrompt(emailContent);

    const responseText = await this.llm.generateText({
      prompt,
      maxTokens: 2000,
      temperature: 0.1,
    });
    return this.parseRequirements(responseText);
  }

  /**
   * Build the extraction prompt
   */
  private buildPrompt(emailContent: string): string {
    return `You are a requirements analyst for a B2B service company. Extract all requirements from the following email thread.

Categorize requirements into these types:
- functional: What features/functionality the client wants
- technical: Technical requirements, platforms, technologies, integrations
- timeline: Deadlines, start dates, duration expectations
- budget: Budget constraints, pricing expectations
- design: UI/UX, branding, visual requirements
- legal: Contracts, compliance, security requirements
- other: Any other requirements

For each requirement, assign priority:
- high: Critical, must-have
- medium: Important, should-have
- low: Nice-to-have

Email Thread:
${emailContent}

Return requirements in this JSON format:
{
  "requirements": [
    {
      "category": "functional|technical|timeline|budget|design|legal|other",
      "description": "Clear description of the requirement",
      "priority": "high|medium|low"
    }
  ]
}

Return ONLY valid JSON, no other text.`;
  }

  /**
   * Parse requirements from Claude response
   */
  private parseRequirements(responseText: string): Requirement[] {
    try {
      const parsed = parseJsonFromText<any>(responseText);

      if (!parsed.requirements || !Array.isArray(parsed.requirements)) {
        throw new Error('Invalid requirements format');
      }

      return parsed.requirements.map((req: any, index: number) => ({
        id: `req-${Date.now()}-${index}`,
        category: req.category,
        description: req.description,
        priority: req.priority,
        status: 'identified' as const,
      }));
    } catch (error) {
      console.error('Failed to parse requirements:', error);
      // Return empty array on parse error
      return [];
    }
  }
}
