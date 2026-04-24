/**
 * Clarification Generator
 *
 * Generates clarification emails when requirements are incomplete
 */

import { createLLMClient, parseJsonFromText, type Deal, type LLMClient } from '@closepilot/core';

export interface ClarificationEmail {
  subject: string;
  body: string;
}

/**
 * Generates clarification emails
 */
export class ClarificationGenerator {
  private llm: LLMClient;

  constructor(llm: LLMClient = createLLMClient()) {
    this.llm = llm;
  }

  /**
   * Generate clarification email based on missing information
   */
  async generate(deal: Deal, missingInfo: string[]): Promise<ClarificationEmail> {
    const prompt = this.buildPrompt(deal, missingInfo);

    const responseText = await this.llm.generateText({
      prompt,
      maxTokens: 1500,
      temperature: 0.3,
    });
    return this.parseEmail(responseText);
  }

  /**
   * Build the clarification email prompt
   */
  private buildPrompt(deal: Deal, missingInfo: string[]): string {
    const missingText = missingInfo
      .map((info) => {
        switch (info) {
          case 'timeline':
            return '- Timeline/deadline expectations';
          case 'budget':
            return '- Budget range or constraints';
          case 'technical_details':
            return '- Specific technical requirements and platforms';
          default:
            return `- ${info}`;
        }
      })
      .join('\n');

    return `You are a project manager at a B2B service company. Write a professional, friendly clarification email to a prospect.

Deal Context:
- Lead: ${deal.leadName} (${deal.leadEmail})
- Company: ${deal.leadCompany || 'Not specified'}
- Stage: Initial scoping

Missing Information Needed:
${missingText}

Guidelines:
1. Be friendly and professional
2. Acknowledge their interest
3. Explain that we need a few more details to provide an accurate proposal
4. Ask specific questions about the missing information
5. Keep it concise (3-4 paragraphs max)
6. End with next steps

Return in this JSON format:
{
  "subject": "Email subject line",
  "body": "Full email body with professional greeting and sign-off"
}

Return ONLY valid JSON, no other text.`;
  }

  /**
   * Parse email from Claude response
   */
  private parseEmail(responseText: string): ClarificationEmail {
    try {
      const parsed = parseJsonFromText<any>(responseText);

      return {
        subject: parsed.subject || 'Project Clarification Questions',
        body: parsed.body || '',
      };
    } catch (error) {
      console.error('Failed to parse email:', error);
      // Return default email on parse error
      return {
        subject: 'Project Clarification Questions',
        body: `Hi,

Thank you for your interest! To provide you with an accurate proposal, we need a few more details about your project.

Could you please share:
1. Your timeline expectations
2. Budget range considerations
3. Any specific technical requirements

Looking forward to hearing from you!

Best regards`,
      };
    }
  }
}
