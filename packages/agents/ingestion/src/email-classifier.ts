import Anthropic from '@anthropic-ai/sdk';
import type { EmailMessage, EmailContext } from '@closepilot/core';

/**
 * Configuration for the email classifier
 */
export interface ClassifierConfig {
  anthropicApiKey: string;
  model?: string;
  maxTokens?: number;
}

/**
 * Result of email classification
 */
export interface ClassificationResult {
  isLeadInquiry: boolean;
  confidence: number; // 0-1
  reasoning?: string;
  extractedContext?: EmailContext;
}

/**
 * Email Classifier
 * Uses Claude AI to classify emails as lead inquiries or non-leads
 */
export class EmailClassifier {
  private anthropic: Anthropic;
  private model: string;
  private maxTokens: number;

  constructor(config: ClassifierConfig) {
    this.anthropic = new Anthropic({
      apiKey: config.anthropicApiKey,
    });
    this.model = config.model || 'claude-3-5-sonnet-20241022';
    this.maxTokens = config.maxTokens || 1024;
  }

  /**
   * Classify an email as a lead inquiry or not
   */
  async classifyEmail(email: EmailMessage): Promise<ClassificationResult> {
    const prompt = this.buildClassificationPrompt(email);

    try {
      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      return this.parseClassificationResponse(text);
    } catch (error) {
      console.error('Error classifying email:', error);
      // Fallback: assume it's not a lead if classification fails
      return {
        isLeadInquiry: false,
        confidence: 0,
        reasoning: 'Classification failed due to error',
      };
    }
  }

  /**
   * Extract lead information from an email
   */
  async extractLeadInfo(email: EmailMessage): Promise<{
    name?: string;
    company?: string;
    title?: string;
    requirements?: string[];
    budgetMentioned?: string;
    timelineMentioned?: string;
    urgency?: 'low' | 'medium' | 'high';
  }> {
    const prompt = this.buildExtractionPrompt(email);

    try {
      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      return this.parseExtractionResponse(text);
    } catch (error) {
      console.error('Error extracting lead info:', error);
      return {};
    }
  }

  /**
   * Extract initial context from email for enrichment
   */
  async extractInitialContext(email: EmailMessage): Promise<EmailContext> {
    const prompt = this.buildContextExtractionPrompt(email);

    try {
      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      return this.parseContextResponse(text);
    } catch (error) {
      console.error('Error extracting context:', error);
      return {
        isLeadInquiry: false,
        urgency: 'low',
      };
    }
  }

  /**
   * Build prompt for email classification
   */
  private buildClassificationPrompt(email: EmailMessage): string {
    return `You are an expert at identifying B2B lead inquiries from service businesses.

Analyze this email and determine if it is a legitimate B2B lead inquiry.

Email Details:
- From: ${email.from.name ? `${email.from.name} <${email.from.email}>` : email.from.email}
- Subject: ${email.subject}
- Body: ${email.body}

Respond in the following JSON format:
{
  "isLeadInquiry": true/false,
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation of why this is or isn't a lead inquiry"
}

Consider these indicators of a lead inquiry:
- Asking for services, pricing, or quotes
- Project or work inquiries
- Partnership or collaboration requests
- Questions about capabilities or availability
- Professional tone from business domains

Consider these indicators of non-leads:
- Spam or promotional content
- Job applications
- Personal inquiries
- Unsubscribes or complaints
- Internal communications`;
  }

  /**
   * Build prompt for lead information extraction
   */
  private buildExtractionPrompt(email: EmailMessage): string {
    return `Extract key information from this B2B lead inquiry email.

Email Details:
- From: ${email.from.name ? `${email.from.name} <${email.from.email}>` : email.from.email}
- Subject: ${email.subject}
- Body: ${email.body}

Respond in JSON format with these fields (omit if not found):
{
  "name": "contact person's name",
  "company": "company name",
  "title": "job title",
  "requirements": ["requirement1", "requirement2"],
  "budgetMentioned": "any budget mentioned",
  "timelineMentioned": "any timeline mentioned",
  "urgency": "low" | "medium" | "high"
}`;
  }

  /**
   * Build prompt for context extraction
   */
  private buildContextExtractionPrompt(email: EmailMessage): string {
    return `Extract contextual information from this B2B lead inquiry.

Email Details:
- From: ${email.from.name ? `${email.from.name} <${email.from.email}>` : email.from.email}
- Subject: ${email.subject}
- Body: ${email.body}

Respond in JSON format:
{
  "isLeadInquiry": true/false,
  "extractedRequirements": ["req1", "req2"],
  "companyMentioned": "company name",
  "budgetMentioned": "budget info",
  "timelineMentioned": "timeline info",
  "urgency": "low" | "medium" | "high"
}`;
  }

  /**
   * Parse classification response from Claude
   */
  private parseClassificationResponse(text: string): ClassificationResult {
    try {
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return {
        isLeadInquiry: parsed.isLeadInquiry || false,
        confidence: parsed.confidence || 0,
        reasoning: parsed.reasoning,
      };
    } catch (error) {
      console.error('Error parsing classification response:', error);
      return {
        isLeadInquiry: false,
        confidence: 0,
        reasoning: 'Failed to parse response',
      };
    }
  }

  /**
   * Parse extraction response from Claude
   */
  private parseExtractionResponse(text: string): any {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Error parsing extraction response:', error);
      return {};
    }
  }

  /**
   * Parse context response from Claude
   */
  private parseContextResponse(text: string): EmailContext {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Error parsing context response:', error);
      return {
        isLeadInquiry: false,
        urgency: 'low',
      };
    }
  }
}

/**
 * Factory function to create an email classifier
 */
export function createEmailClassifier(config: ClassifierConfig): EmailClassifier {
  return new EmailClassifier(config);
}
