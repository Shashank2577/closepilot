/**
 * Company Researcher
 *
 * Researches company information including:
 * - Industry classification
 * - Company size
 * - Funding information
 * - Technology stack
 * - Competitors
 * - Recent news
 */

import type { CompanyResearch } from '@closepilot/core';
import { Anthropic } from '@anthropic-ai/sdk';
import { DataSources } from './data-sources.js';

export interface CompanyResearcherConfig {
  anthropicApiKey: string;
  enableWebScraping?: boolean;
  enableApis?: boolean;
}

export class CompanyResearcher {
  private anthropic: Anthropic;
  private dataSources: DataSources;

  constructor(config: CompanyResearcherConfig) {
    this.anthropic = new Anthropic({
      apiKey: config.anthropicApiKey,
    });

    this.dataSources = new DataSources({
      enableWebScraping: config.enableWebScraping ?? true,
      enableApis: config.enableApis ?? false,
    });
  }

  /**
   * Research a company and synthesize information
   */
  async research(companyName: string): Promise<CompanyResearch> {
    if (!companyName || companyName.trim() === '') {
      return this.getEmptyResearch(companyName);
    }

    try {
      // Gather raw data from multiple sources
      const rawData = await this.gatherData(companyName);

      // Use Claude to synthesize and structure the research
      const synthesis = await this.synthesizeResearch(companyName, rawData);

      return {
        companyName: synthesis.companyName || companyName,
        industry: synthesis.industry,
        size: synthesis.size,
        website: synthesis.website,
        description: synthesis.description,
        recentNews: synthesis.recentNews || [],
        fundingInfo: synthesis.fundingInfo,
        technologies: synthesis.technologies || [],
        competitors: synthesis.competitors || [],
      };
    } catch (error) {
      console.error(`Error researching company ${companyName}:`, error);
      return this.getFallbackResearch(companyName);
    }
  }

  /**
   * Gather raw data from multiple sources
   */
  private async gatherData(companyName: string): Promise<{
    website?: string;
    crunchbase?: string;
    googleInfo?: string;
    techStack?: string;
  }> {
    const results: Record<string, string> = {};

    try {
      // Google search for basic info
      if (this.dataSources.webScrapingEnabled) {
        results.googleInfo = await this.dataSources.googleSearch(companyName);
        results.website = await this.dataSources.findWebsite(companyName);
      }

      // Try to get tech stack information
      if (this.dataSources.webScrapingEnabled && results.website) {
        results.techStack = await this.dataSources.analyzeTechStack(
          results.website
        );
      }

      // API-based data (when enabled)
      if (this.dataSources.apisEnabled) {
        // Would integrate with Crunchbase, Clearbit, etc.
        // For now, placeholder
        results.crunchbase = 'API integration pending';
      }
    } catch (error) {
      console.error('Error gathering data:', error);
    }

    return results;
  }

  /**
   * Use Claude to synthesize research into structured format
   */
  private async synthesizeResearch(
    companyName: string,
    rawData: Record<string, string>
  ): Promise<CompanyResearch> {
    const prompt = this.buildSynthesisPrompt(companyName, rawData);

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
      return JSON.parse(responseText) as CompanyResearch;
    } catch (error) {
      console.error('Error synthesizing research:', error);
      return this.getFallbackResearch(companyName);
    }
  }

  /**
   * Build prompt for Claude synthesis
   */
  private buildSynthesisPrompt(
    companyName: string,
    rawData: Record<string, string>
  ): string {
    return `You are a business research analyst. Research and synthesize information about the company "${companyName}".

Available raw data:
${JSON.stringify(rawData, null, 2)}

Based on the available data and your knowledge, provide a structured JSON response with the following format:
{
  "companyName": "string",
  "industry": "string (e.g., 'SaaS', 'E-commerce', 'FinTech')",
  "size": "string (e.g., '1-10', '11-50', '51-200', '201-500', '501-1000', '1000+')",
  "website": "string (URL if found)",
  "description": "string (brief 2-3 sentence description)",
  "recentNews": ["array of 3-5 recent news headlines or developments"],
  "fundingInfo": {
    "stage": "string (e.g., 'Seed', 'Series A', 'Series B', 'IPO', 'Bootstrapped')",
    "amount": number (funding amount in USD if known, omit otherwise),
    "date": "string (funding date if known, omit otherwise)"
  },
  "technologies": ["array of likely technologies used (e.g., 'React', 'Node.js', 'AWS', 'Salesforce')"],
  "competitors": ["array of 3-5 main competitors"]
}

If specific information is not available, make reasonable inferences based on the company name and industry, or omit the field. Focus on accuracy - if you're uncertain, it's better to omit than to guess.

Respond ONLY with valid JSON, no additional text.`;
  }

  /**
   * Get empty research for missing company name
   */
  private getEmptyResearch(companyName: string): CompanyResearch {
    return {
      companyName: companyName || 'Unknown',
      description: 'No company name provided',
    };
  }

  /**
   * Get fallback research on error
   */
  private getFallbackResearch(companyName: string): CompanyResearch {
    return {
      companyName,
      description: `Information about ${companyName} could not be retrieved at this time.`,
    };
  }
}
