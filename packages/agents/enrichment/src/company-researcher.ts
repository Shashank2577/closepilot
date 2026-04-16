import { CompanyResearch } from '@closepilot/core';
import { DataSources } from './data-sources';

export class CompanyResearcher {
  private dataSources: DataSources;

  constructor(dataSources: DataSources) {
    this.dataSources = dataSources;
  }

  /**
   * Researches a company using multiple data sources and aggregates the results.
   */
  async research(companyName: string, domain?: string): Promise<CompanyResearch> {
    const searchDomain = domain || companyName.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com';

    // Fetch data concurrently from different sources
    const [linkedInData, crunchbaseData, clearbitData, searchResults] = await Promise.all([
      this.dataSources.getLinkedInCompany(companyName),
      this.dataSources.getCrunchbaseData(companyName),
      this.dataSources.getClearbitData(searchDomain),
      this.dataSources.searchGoogle(`${companyName} company news updates`)
    ]);

    // Map aggregated data to the core CompanyResearch type
    const research: CompanyResearch = {
      companyName: linkedInData?.name || companyName,
      industry: linkedInData?.industry,
      size: linkedInData?.size,
      website: linkedInData?.website,
      description: linkedInData?.description,
      technologies: clearbitData?.techStack || [],
      competitors: crunchbaseData?.competitors || [],
      recentNews: searchResults.map(res => res.title),
    };

    if (crunchbaseData) {
      research.fundingInfo = {
        stage: crunchbaseData.fundingStage,
        amount: crunchbaseData.fundingAmount,
        date: crunchbaseData.lastFundingDate,
      };
    }

    return research;
  }
}
