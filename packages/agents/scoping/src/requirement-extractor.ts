/**
 * Requirement Extractor
 *
 * Extracts and categorizes requirements from email content using Claude
 */

import { Anthropic } from '@anthropic-ai/sdk';
import type { Requirement } from '@closepilot/core';

export interface ExtractionResult {
  requirements: Requirement[];
  confidence: number;
}

/**
 * Extracts requirements from email text
 */
export class RequirementExtractor {
  constructor(private anthropic: Anthropic) {}

  /**
   * Extract requirements from email content
   */
  async extract(emailContent: string): Promise<Requirement[]> {
    const prompt = this.buildPrompt(emailContent);

    const response = await this.anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const extractedText = response.content[0];
    if (extractedText.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    return this.parseRequirements(extractedText.text);
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
      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

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
