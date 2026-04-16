/**
 * Data Sources integration for Enrichment Agent
 * This file contains interfaces and simulated APIs for external data sources
 * like LinkedIn, Crunchbase, Clearbit, and Google Search.
 */

export interface LinkedInCompanyData {
  name: string;
  industry: string;
  size: string;
  website: string;
  description: string;
}

export interface LinkedInProfileData {
  name: string;
  title: string;
  company: string;
  background: string;
  tenure: string;
  recentActivity: string[];
}

export interface CrunchbaseData {
  fundingStage: string;
  fundingAmount: number;
  lastFundingDate: Date;
  competitors: string[];
}

export interface ClearbitData {
  techStack: string[];
  metrics: {
    estimatedRevenue: string;
    employees: number;
  };
}

export interface SearchResult {
  title: string;
  snippet: string;
  url: string;
}

export class DataSources {
  /**
   * Simulate fetching company data from LinkedIn
   */
  async getLinkedInCompany(domainOrName: string): Promise<LinkedInCompanyData | null> {
    // In a real implementation, this would call the LinkedIn API
    console.log(`[DataSources] Fetching LinkedIn company data for: ${domainOrName}`);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));

    if (!domainOrName) return null;

    return {
      name: domainOrName,
      industry: 'Software Development',
      size: '50-200',
      website: `https://www.${domainOrName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
      description: 'A leading technology company providing innovative solutions.'
    };
  }

  /**
   * Simulate fetching profile data from LinkedIn
   */
  async getLinkedInProfile(name: string, company?: string): Promise<LinkedInProfileData | null> {
    console.log(`[DataSources] Fetching LinkedIn profile data for: ${name} at ${company || 'unknown'}`);

    await new Promise(resolve => setTimeout(resolve, 100));

    if (!name) return null;

    return {
      name,
      title: 'Director of Engineering',
      company: company || 'Acme Corp',
      background: 'Experienced leader with 10+ years in software engineering and cloud architecture.',
      tenure: '3 years, 2 months',
      recentActivity: [
        'Liked a post about AI in enterprise',
        'Commented on "The future of distributed systems"'
      ]
    };
  }

  /**
   * Simulate fetching funding and competitor data from Crunchbase
   */
  async getCrunchbaseData(companyName: string): Promise<CrunchbaseData | null> {
    console.log(`[DataSources] Fetching Crunchbase data for: ${companyName}`);

    await new Promise(resolve => setTimeout(resolve, 100));

    if (!companyName) return null;

    return {
      fundingStage: 'Series B',
      fundingAmount: 25000000,
      lastFundingDate: new Date('2023-08-15'),
      competitors: ['CompetitorA', 'CompetitorB', 'CompetitorC']
    };
  }

  /**
   * Simulate fetching tech stack from Clearbit
   */
  async getClearbitData(domain: string): Promise<ClearbitData | null> {
    console.log(`[DataSources] Fetching Clearbit data for: ${domain}`);

    await new Promise(resolve => setTimeout(resolve, 100));

    if (!domain) return null;

    return {
      techStack: ['React', 'Node.js', 'PostgreSQL', 'AWS', 'Docker'],
      metrics: {
        estimatedRevenue: '$10M - $50M',
        employees: 125
      }
    };
  }

  /**
   * Simulate performing a Google Search
   */
  async searchGoogle(query: string): Promise<SearchResult[]> {
    console.log(`[DataSources] Performing Google search for: ${query}`);

    await new Promise(resolve => setTimeout(resolve, 100));

    if (!query) return [];

    return [
      {
        title: `Recent news about ${query}`,
        snippet: `${query} recently announced a new product line...`,
        url: 'https://news.example.com/article'
      },
      {
        title: `${query} Q3 Earnings Report`,
        snippet: `The company exceeded expectations in Q3...`,
        url: 'https://finance.example.com/report'
      }
    ];
  }
}
