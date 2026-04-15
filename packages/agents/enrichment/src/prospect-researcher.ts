/**
 * Prospect Researcher
 *
 * Researches prospect (lead) information including:
 * - LinkedIn profile
 * - Professional background
 * - Decision maker status
 * - Influence level
 * - Recent activity
 */

import type { ProspectResearch } from '@closepilot/core';
import { Anthropic } from '@anthropic-ai/sdk';
import { DataSources } from './data-sources.js';

export interface ProspectResearcherConfig {
  anthropicApiKey: string;
  enableWebScraping?: boolean;
  enableApis?: boolean;
}

export interface ProspectInput {
  name: string;
  email: string;
  title?: string;
  company?: string;
}

export class ProspectResearcher {
  private anthropic: Anthropic;
  private dataSources: DataSources;

  constructor(config: ProspectResearcherConfig) {
    this.anthropic = new Anthropic({
      apiKey: config.anthropicApiKey,
    });

    this.dataSources = new DataSources({
      enableWebScraping: config.enableWebScraping ?? true,
      enableApis: config.enableApis ?? false,
    });
  }

  /**
   * Research a prospect and synthesize information
   */
  async research(input: ProspectInput): Promise<ProspectResearch> {
    if (!input.name || input.name.trim() === '') {
      return this.getEmptyResearch(input);
    }

    try {
      // Gather raw data from multiple sources
      const rawData = await this.gatherData(input);

      // Use Claude to synthesize and structure the research
      const synthesis = await this.synthesizeResearch(input, rawData);

      return {
        name: synthesis.name || input.name,
        title: synthesis.title || input.title || 'Unknown',
        LinkedIn: synthesis.LinkedIn,
        tenure: synthesis.tenure,
        background: synthesis.background,
        recentActivity: synthesis.recentActivity || [],
        decisionMaker: synthesis.decisionMaker ?? this.estimateDecisionMaker(input),
        influenceLevel: synthesis.influenceLevel || this.estimateInfluence(input),
      };
    } catch (error) {
      console.error(`Error researching prospect ${input.name}:`, error);
      return this.getFallbackResearch(input);
    }
  }

  /**
   * Gather raw data from multiple sources
   */
  private async gatherData(input: ProspectInput): Promise<{
    linkedInProfile?: string;
    googleInfo?: string;
    companyInfo?: string;
  }> {
    const results: Record<string, string | undefined> = {};

    try {
      // Google search for prospect
      if (this.dataSources.webScrapingEnabled) {
        results.googleInfo = await this.dataSources.googleSearch(
          `${input.name} ${input.company || ''}`
        );

        // Try to find LinkedIn profile
        const linkedInProfile = await this.dataSources.findLinkedInProfile(
          input.name,
          input.company
        );
        if (linkedInProfile) {
          results.linkedInProfile = linkedInProfile;
        }
      }

      // API-based data (when enabled)
      if (this.dataSources.apisEnabled) {
        // Would integrate with LinkedIn API, Clearbit, etc.
        // For now, placeholder
        results.companyInfo = 'API integration pending';
      }
    } catch (error) {
      console.error('Error gathering prospect data:', error);
    }

    return results;
  }

  /**
   * Use Claude to synthesize research into structured format
   */
  private async synthesizeResearch(
    input: ProspectInput,
    rawData: Record<string, string>
  ): Promise<ProspectResearch> {
    const prompt = this.buildSynthesisPrompt(input, rawData);

    try {
      const message = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const responseText =
        message.content[0].type === 'text'
          ? message.content[0].text
          : '{}';

      // Parse JSON response
      return JSON.parse(responseText) as ProspectResearch;
    } catch (error) {
      console.error('Error synthesizing prospect research:', error);
      return this.getFallbackResearch(input);
    }
  }

  /**
   * Build prompt for Claude synthesis
   */
  private buildSynthesisPrompt(
    input: ProspectInput,
    rawData: Record<string, string>
  ): string {
    return `You are a sales intelligence analyst. Research and analyze the prospect: "${input.name}".

Known information:
- Name: ${input.name}
- Email: ${input.email}
- Title: ${input.title || 'Unknown'}
- Company: ${input.company || 'Unknown'}

Available research data:
${JSON.stringify(rawData, null, 2)}

Based on the available data and your knowledge, provide a structured JSON response with the following format:
{
  "name": "string",
  "title": "string (their current job title)",
  "LinkedIn": "string (LinkedIn profile URL if found, omit otherwise)",
  "tenure": "string (how long they've been in their current role or company, if known)",
  "background": "string (brief 2-3 sentence professional background)",
  "recentActivity": ["array of 3-5 recent professional activities, posts, or developments"],
  "decisionMaker": boolean (true if this person is likely a decision maker for purchasing decisions),
  "influenceLevel": "string" (either "high", "medium", or "low" - estimating their influence on purchasing decisions)
}

Decision maker criteria:
- C-level executives (CEO, CTO, CFO, etc.) = true
- VPs and Directors = usually true, depends on company size
- Managers and below = usually false, unless they're the main contact

Influence level criteria:
- "high": C-level, founders, key decision makers
- "medium": Directors, senior managers, influencers in the process
- "low": Individual contributors, junior roles

If specific information is not available, make reasonable inferences based on their title and industry, or omit the field.

Respond ONLY with valid JSON, no additional text.`;
  }

  /**
   * Estimate if prospect is a decision maker based on title
   */
  private estimateDecisionMaker(input: ProspectInput): boolean {
    if (!input.title) return false;

    const decisionMakerTitles = [
      'ceo',
      'cto',
      'cfo',
      'coo',
      'cmo',
      'cio',
      'founder',
      'president',
      'vp',
      'vice president',
      'director',
      'head of',
      'chief',
    ];

    const title = input.title.toLowerCase();
    return decisionMakerTitles.some((dmTitle) =>
      title.includes(dmTitle)
    );
  }

  /**
   * Estimate influence level based on title
   */
  private estimateInfluence(input: ProspectInput): 'high' | 'medium' | 'low' {
    if (!input.title) return 'low';

    const title = input.title.toLowerCase();

    // High influence: C-level, founders
    if (
      title.includes('ceo') ||
      title.includes('cto') ||
      title.includes('cfo') ||
      title.includes('founder') ||
      title.includes('president') ||
      title.includes('chief')
    ) {
      return 'high';
    }

    // Medium influence: VPs, Directors
    if (
      title.includes('vp') ||
      title.includes('vice president') ||
      title.includes('director') ||
      title.includes('head of')
    ) {
      return 'medium';
    }

    // Low influence: Managers and below
    return 'low';
  }

  /**
   * Get empty research for missing prospect name
   */
  private getEmptyResearch(input: ProspectInput): ProspectResearch {
    return {
      name: input.name || 'Unknown',
      title: input.title || 'Unknown',
      decisionMaker: false,
      influenceLevel: 'low',
    };
  }

  /**
   * Get fallback research on error
   */
  private getFallbackResearch(input: ProspectInput): ProspectResearch {
    return {
      name: input.name,
      title: input.title || 'Unknown',
      decisionMaker: this.estimateDecisionMaker(input),
      influenceLevel: this.estimateInfluence(input),
      background: `Information about ${input.name} could not be retrieved at this time.`,
    };
  }
}
