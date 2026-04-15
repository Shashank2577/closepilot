import Anthropic from '@anthropic-ai/sdk';
import type {
  Deal,
  ProjectScope,
  Proposal,
  PricingBreakdown,
  CompanyResearch,
  ProspectResearch,
} from '@closepilot/core';
import type { TemplateConfig } from './template-selector.js';

/**
 * Content generation options
 */
export interface ContentGeneratorOptions {
  apiKey: string;
  model?: string;
  maxTokens?: number;
}

/**
 * Generated proposal sections
 */
export interface GeneratedProposalSections {
  executiveSummary: string;
  projectOverview: string;
  technicalApproach?: string;
  scope: string;
  timeline: string;
  pricing: string;
  terms: string;
  nextSteps: string;
  additionalSections?: Record<string, string>;
}

/**
 * Content generator for proposal sections
 */
export class ContentGenerator {
  private anthropic: Anthropic;
  private model: string;
  private maxTokens: number;

  constructor(options: ContentGeneratorOptions) {
    this.anthropic = new Anthropic({ apiKey: options.apiKey });
    this.model = options.model || 'claude-3-5-sonnet-20241022';
    this.maxTokens = options.maxTokens || 4000;
  }

  /**
   * Generate all proposal sections
   */
  async generateProposal(
    deal: Deal,
    projectScope: ProjectScope,
    pricing: PricingBreakdown,
    template: TemplateConfig,
    caseStudies?: string[]
  ): Promise<Proposal> {
    const sections = await this.generateProposalSections(
      deal,
      projectScope,
      pricing,
      template,
      caseStudies
    );

    return {
      title: `Proposal: ${projectScope.title}`,
      executiveSummary: sections.executiveSummary,
      scope: sections.scope,
      timeline: sections.timeline,
      pricing: pricing,
      terms: this.parseTerms(sections.terms),
      nextSteps: this.parseNextSteps(sections.nextSteps),
    };
  }

  /**
   * Generate all proposal sections using Claude
   */
  async generateProposalSections(
    deal: Deal,
    projectScope: ProjectScope,
    pricing: PricingBreakdown,
    template: TemplateConfig,
    caseStudies?: string[]
  ): Promise<GeneratedProposalSections> {
    const prompt = this.buildGenerationPrompt(
      deal,
      projectScope,
      pricing,
      template,
      caseStudies
    );

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

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Expected text response from Claude');
    }

    return this.parseGeneratedSections(content.text);
  }

  /**
   * Build the generation prompt
   */
  private buildGenerationPrompt(
    deal: Deal,
    projectScope: ProjectScope,
    pricing: PricingBreakdown,
    template: TemplateConfig,
    caseStudies?: string[]
  ): string {
    let prompt = `You are a professional B2B proposal writer. Generate a compelling proposal based on the following information.\n\n`;

    prompt += `## Client Information\n`;
    prompt += `- Company: ${deal.leadCompany || 'N/A'}\n`;
    prompt += `- Contact: ${deal.leadName} (${deal.leadTitle || 'N/A'})\n\n`;

    if (deal.companyResearch) {
      prompt += this.formatCompanyResearch(deal.companyResearch);
    }

    if (deal.prospectResearch) {
      prompt += this.formatProspectResearch(deal.prospectResearch);
    }

    prompt += `## Project Scope\n`;
    prompt += `- Title: ${projectScope.title}\n`;
    prompt += `- Description: ${projectScope.description}\n`;
    prompt += `- Services: ${projectScope.services.join(', ')}\n`;
    prompt += `- Complexity: ${projectScope.complexity}\n\n`;

    if (projectScope.deliverables && projectScope.deliverables.length > 0) {
      prompt += `- Deliverables:\n`;
      for (const deliverable of projectScope.deliverables) {
        prompt += `  - ${deliverable}\n`;
      }
      prompt += '\n';
    }

    if (projectScope.assumptions && projectScope.assumptions.length > 0) {
      prompt += `- Assumptions:\n`;
      for (const assumption of projectScope.assumptions) {
        prompt += `  - ${assumption}\n`;
      }
      prompt += '\n';
    }

    if (projectScope.risks && projectScope.risks.length > 0) {
      prompt += `- Risks:\n`;
      for (const risk of projectScope.risks) {
        prompt += `  - ${risk}\n`;
      }
      prompt += '\n';
    }

    prompt += this.formatPricing(pricing);

    prompt += `## Template Type\n`;
    prompt += `${template.name}\n\n`;

    prompt += `## Required Sections\n`;
    for (const section of template.sections) {
      if (section.required) {
        prompt += `- ${section.title}\n`;
      }
    }
    prompt += '\n';

    if (caseStudies && caseStudies.length > 0) {
      prompt += `## Case Studies to Include\n\n`;
      prompt += caseStudies.join('\n\n');
      prompt += '\n\n';
    }

    prompt += `## Instructions\n\n`;
    prompt += `Generate a professional, persuasive proposal with the following sections:\n\n`;
    prompt += `1. **Executive Summary** (2-3 paragraphs): Compelling overview that addresses client needs and positions us as the ideal partner\n`;
    prompt += `2. **Project Overview** (1-2 paragraphs): Detailed project description with clear objectives\n`;
    prompt += `3. **Technical Approach** (1-2 paragraphs): Our methodology and technical approach (if applicable)\n`;
    prompt += `4. **Scope of Work** (bullet points): Detailed breakdown of what's included\n`;
    prompt += `5. **Timeline & Milestones** (structured format): Clear timeline with key milestones\n`;
    prompt += `6. **Investment** (formatted): Present the pricing information professionally\n`;
    prompt += `7. **Terms & Conditions** (numbered list): Standard terms\n`;
    prompt += `8. **Next Steps** (numbered list): Clear call-to-action\n\n`;

    prompt += `Format your response using Markdown with clear section headers. `;
    prompt += `Be professional, concise, and persuasive. `;
    prompt += `Focus on value and outcomes rather than just technical details.\n\n`;

    prompt += `Start your response now:`;

    return prompt;
  }

  /**
   * Format company research for prompt
   */
  private formatCompanyResearch(research: CompanyResearch): string {
    let text = `## Company Research\n`;
    text += `- Industry: ${research.industry || 'N/A'}\n`;
    text += `- Size: ${research.size || 'N/A'}\n`;

    if (research.description) {
      text += `- Description: ${research.description}\n`;
    }

    if (research.technologies && research.technologies.length > 0) {
      text += `- Technologies: ${research.technologies.join(', ')}\n`;
    }

    text += '\n';
    return text;
  }

  /**
   * Format prospect research for prompt
   */
  private formatProspectResearch(research: ProspectResearch): string {
    let text = `## Prospect Research\n`;
    text += `- Name: ${research.name}\n`;
    text += `- Title: ${research.title}\n`;
    text += `- Decision Maker: ${research.decisionMaker ? 'Yes' : 'No'}\n`;
    text += `- Influence Level: ${research.influenceLevel}\n`;

    if (research.background) {
      text += `- Background: ${research.background}\n`;
    }

    text += '\n';
    return text;
  }

  /**
   * Format pricing for prompt
   */
  private formatPricing(pricing: PricingBreakdown): string {
    let text = `## Pricing\n`;
    text += `- Currency: ${pricing.currency}\n`;
    text += `- Total: ${pricing.total}\n\n`;

    text += `Breakdown:\n`;
    for (const item of pricing.breakdown) {
      text += `- ${item.service}: ${item.amount}`;
      if (item.description) {
        text += ` (${item.description})`;
      }
      text += '\n';
    }

    if (pricing.paymentSchedule) {
      text += `\nPayment Schedule: ${pricing.paymentSchedule}\n`;
    }

    text += '\n';
    return text;
  }

  /**
   * Parse generated sections from Claude response
   */
  private parseGeneratedSections(text: string): GeneratedProposalSections {
    const sections: GeneratedProposalSections = {
      executiveSummary: '',
      projectOverview: '',
      scope: '',
      timeline: '',
      pricing: '',
      terms: '',
      nextSteps: '',
    };

    // Split by headers
    const lines = text.split('\n');
    let currentSection = '';
    let currentContent: string[] = [];

    for (const line of lines) {
      const headerMatch = line.match(/^#{1,3}\s+(.+)$/);

      if (headerMatch) {
        // Save previous section
        if (currentSection && currentContent.length > 0) {
          this.assignSection(sections, currentSection, currentContent.join('\n'));
        }

        // Start new section
        currentSection = headerMatch[1].toLowerCase().replace(/[^a-z]/g, '_');
        currentContent = [];
      } else if (currentSection) {
        currentContent.push(line);
      }
    }

    // Save last section
    if (currentSection && currentContent.length > 0) {
      this.assignSection(sections, currentSection, currentContent.join('\n'));
    }

    return sections;
  }

  /**
   * Assign content to appropriate section
   */
  private assignSection(
    sections: GeneratedProposalSections,
    sectionKey: string,
    content: string
  ): void {
    const key = sectionKey.toLowerCase().replace(/[^a-z]/g, '_');

    if (key.includes('executive') || key.includes('summary')) {
      sections.executiveSummary = content;
    } else if (key.includes('overview') || key.includes('project')) {
      sections.projectOverview = content;
    } else if (key.includes('scope') || key.includes('work')) {
      sections.scope = content;
    } else if (key.includes('timeline') || key.includes('milestone')) {
      sections.timeline = content;
    } else if (key.includes('pricing') || key.includes('investment')) {
      sections.pricing = content;
    } else if (key.includes('terms') || key.includes('conditions')) {
      sections.terms = content;
    } else if (key.includes('next') || key.includes('steps')) {
      sections.nextSteps = content;
    } else if (key.includes('technical') || key.includes('approach')) {
      sections.technicalApproach = content;
    } else {
      if (!sections.additionalSections) {
        sections.additionalSections = {};
      }
      sections.additionalSections[sectionKey] = content;
    }
  }

  /**
   * Parse terms from text
   */
  private parseTerms(text: string): string[] {
    return text
      .split('\n')
      .map(line => line.replace(/^\d+\.\s*/, '').trim())
      .filter(line => line.length > 0);
  }

  /**
   * Parse next steps from text
   */
  private parseNextSteps(text: string): string[] {
    return text
      .split('\n')
      .map(line => line.replace(/^\d+\.\s*/, '').trim())
      .filter(line => line.length > 0);
  }
}
