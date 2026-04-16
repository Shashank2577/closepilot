import { ProspectResearch } from '@closepilot/core';
import { DataSources } from './data-sources';

export class ProspectResearcher {
  private dataSources: DataSources;

  constructor(dataSources: DataSources) {
    this.dataSources = dataSources;
  }

  /**
   * Evaluates if a given job title belongs to a decision maker.
   * Simple heuristic based on common executive/director titles.
   */
  private isDecisionMaker(title: string): boolean {
    const lowerTitle = title.toLowerCase();
    const dmKeywords = ['ceo', 'cto', 'cfo', 'coo', 'vp', 'director', 'head', 'founder', 'chief'];
    return dmKeywords.some(keyword => lowerTitle.includes(keyword));
  }

  /**
   * Researches a prospect using multiple data sources and aggregates the results.
   */
  async research(name: string, companyName?: string): Promise<ProspectResearch> {
    const linkedInProfile = await this.dataSources.getLinkedInProfile(name, companyName);

    const title = linkedInProfile?.title || 'Unknown Title';
    const decisionMaker = this.isDecisionMaker(title);

    // Calculate influence level
    let influenceLevel: 'high' | 'medium' | 'low' = 'low';
    if (decisionMaker) {
      influenceLevel = 'high';
    } else if (title.toLowerCase().includes('manager') || title.toLowerCase().includes('lead')) {
      influenceLevel = 'medium';
    }

    const research: ProspectResearch = {
      name: linkedInProfile?.name || name,
      title: title,
      LinkedIn: `https://linkedin.com/in/${name.toLowerCase().replace(/\s+/g, '-')}`,
      tenure: linkedInProfile?.tenure,
      background: linkedInProfile?.background,
      recentActivity: linkedInProfile?.recentActivity || [],
      decisionMaker,
      influenceLevel,
    };

    return research;
  }
}
