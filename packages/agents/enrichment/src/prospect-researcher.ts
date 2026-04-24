import { createLLMClient, type LLMClient, type LLMConfig, type ProspectResearch } from '@closepilot/core';

interface ProspectResearchJson {
  name?: string;
  title?: string;
  linkedin?: string;
  tenure?: string;
  background?: string;
  recentActivity?: string[];
  decisionMaker?: boolean;
  influenceLevel?: 'high' | 'medium' | 'low';
}

export class ProspectResearcher {
  private llm: LLMClient;

  constructor(config: LLMConfig = {}) {
    this.llm = createLLMClient({ ...config, maxTokens: config.maxTokens || 1200 });
  }

  async research(
    name: string,
    companyName?: string,
    title?: string,
    emailContext?: string
  ): Promise<ProspectResearch> {
    const prompt = `Infer the prospect profile for this B2B lead.

Name: ${name}
Company: ${companyName || 'unknown'}
Title: ${title || 'unknown'}
Email/context:
${emailContext || 'No additional context provided.'}

Infer:
- decision-making authority
- influence level
- seniority and technical depth
- likely pain points based on role/company
- concise background summary

Return JSON:
{
  "name": "string",
  "title": "string",
  "linkedin": "best-effort LinkedIn search URL",
  "tenure": "string",
  "background": "string",
  "recentActivity": ["string"],
  "decisionMaker": true,
  "influenceLevel": "high|medium|low"
}`;

    const parsed = await this.llm.generateJson<ProspectResearchJson>({
      prompt,
      maxTokens: 1200,
      temperature: 0.2,
    });

    return {
      name: parsed.name || name,
      title: parsed.title || title || 'Unknown Title',
      LinkedIn: parsed.linkedin || `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(
        `${name} ${companyName || ''}`.trim()
      )}`,
      tenure: parsed.tenure,
      background: parsed.background,
      recentActivity: Array.isArray(parsed.recentActivity) ? parsed.recentActivity : [],
      decisionMaker: Boolean(parsed.decisionMaker),
      influenceLevel: parsed.influenceLevel || inferInfluenceLevel(parsed.title || title || ''),
    };
  }
}

function inferInfluenceLevel(title: string): 'high' | 'medium' | 'low' {
  const normalized = title.toLowerCase();
  if (/\b(ceo|cto|cfo|coo|chief|founder|partner|president|vp|vice president)\b/.test(normalized)) {
    return 'high';
  }
  if (/\b(director|head|manager|lead)\b/.test(normalized)) {
    return 'medium';
  }
  return 'low';
}
