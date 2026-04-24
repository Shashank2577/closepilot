import { createLLMClient, type CompanyResearch, type LLMClient, type LLMConfig } from '@closepilot/core';

interface CompanyResearchJson {
  companyName?: string;
  industry?: string;
  size?: string | number;
  website?: string;
  description?: string;
  recentNews?: string[];
  fundingInfo?: {
    stage?: string;
    amount?: number;
    date?: string;
  };
  technologies?: string[];
  competitors?: string[];
}

export class CompanyResearcher {
  private llm: LLMClient;

  constructor(config: LLMConfig = {}) {
    this.llm = createLLMClient({ ...config, maxTokens: config.maxTokens || 1800 });
  }

  async research(companyName: string, domain?: string): Promise<CompanyResearch> {
    const prompt = `Research this B2B lead's company using public knowledge and, when available to the provider, web context.

Company: ${companyName}
Domain hint: ${domain || 'unknown'}

Find:
- company size or employee range
- industry
- website
- primary product/service and target market
- recent news, funding, or growth signals
- likely technology stack signals
- competitors or adjacent vendors

Return JSON matching:
{
  "companyName": "string",
  "industry": "string",
  "size": "string",
  "website": "string",
  "description": "string",
  "recentNews": ["string"],
  "fundingInfo": { "stage": "string", "amount": 0, "date": "YYYY-MM-DD" },
  "technologies": ["string"],
  "competitors": ["string"]
}`;

    const parsed = await this.llm.generateJson<CompanyResearchJson>({
      prompt,
      maxTokens: 1800,
      temperature: 0.2,
    });

    return {
      companyName: parsed.companyName || companyName,
      industry: parsed.industry,
      size: parsed.size === undefined ? undefined : String(parsed.size),
      website: parsed.website,
      description: parsed.description,
      recentNews: Array.isArray(parsed.recentNews) ? parsed.recentNews : [],
      fundingInfo: parsed.fundingInfo
        ? {
            stage: parsed.fundingInfo.stage,
            amount: parsed.fundingInfo.amount,
            date: parsed.fundingInfo.date ? new Date(parsed.fundingInfo.date) : undefined,
          }
        : undefined,
      technologies: Array.isArray(parsed.technologies) ? parsed.technologies : [],
      competitors: Array.isArray(parsed.competitors) ? parsed.competitors : [],
    };
  }
}
