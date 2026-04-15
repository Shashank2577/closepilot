import type { ProjectScope, Proposal } from '@closepilot/core';

/**
 * Proposal template types
 */
export enum ProposalTemplate {
  WEB_DEVELOPMENT = 'web_development',
  MOBILE_APP = 'mobile_app',
  UI_UX_DESIGN = 'ui_ux_design',
  CUSTOM_SOFTWARE = 'custom_software',
  API_INTEGRATION = 'api_integration',
  CONSULTING = 'consulting',
  MAINTENANCE = 'maintenance',
  FULL_SERVICE = 'full_service',
}

/**
 * Template configuration
 */
export interface TemplateConfig {
  templateId: ProposalTemplate;
  name: string;
  serviceTypes: string[];
  complexity: ('low' | 'medium' | 'high')[];
  sections: TemplateSection[];
}

/**
 * Template sections configuration
 */
interface TemplateSection {
  id: string;
  title: string;
  required: boolean;
  order: number;
}

/**
 * Template configurations
 */
const TEMPLATE_CONFIGS: TemplateConfig[] = [
  {
    templateId: ProposalTemplate.WEB_DEVELOPMENT,
    name: 'Web Development Proposal',
    serviceTypes: ['web development', 'website', 'web application', 'frontend', 'backend'],
    complexity: ['low', 'medium', 'high'],
    sections: [
      { id: 'executive_summary', title: 'Executive Summary', required: true, order: 1 },
      { id: 'project_overview', title: 'Project Overview', required: true, order: 2 },
      { id: 'technical_approach', title: 'Technical Approach', required: true, order: 3 },
      { id: 'scope', title: 'Scope of Work', required: true, order: 4 },
      { id: 'timeline', title: 'Timeline & Milestones', required: true, order: 5 },
      { id: 'pricing', title: 'Investment', required: true, order: 6 },
      { id: 'terms', title: 'Terms & Conditions', required: true, order: 7 },
      { id: 'case_studies', title: 'Relevant Case Studies', required: false, order: 8 },
      { id: 'next_steps', title: 'Next Steps', required: true, order: 9 },
    ],
  },
  {
    templateId: ProposalTemplate.MOBILE_APP,
    name: 'Mobile App Development Proposal',
    serviceTypes: ['mobile app', 'ios', 'android', 'react native', 'flutter', 'mobile'],
    complexity: ['medium', 'high'],
    sections: [
      { id: 'executive_summary', title: 'Executive Summary', required: true, order: 1 },
      { id: 'project_overview', title: 'Project Overview', required: true, order: 2 },
      { id: 'platform_strategy', title: 'Platform Strategy', required: true, order: 3 },
      { id: 'technical_approach', title: 'Technical Approach', required: true, order: 4 },
      { id: 'scope', title: 'Scope of Work', required: true, order: 5 },
      { id: 'timeline', title: 'Timeline & Milestones', required: true, order: 6 },
      { id: 'pricing', title: 'Investment', required: true, order: 7 },
      { id: 'terms', title: 'Terms & Conditions', required: true, order: 8 },
      { id: 'case_studies', title: 'Relevant Case Studies', required: false, order: 9 },
      { id: 'next_steps', title: 'Next Steps', required: true, order: 10 },
    ],
  },
  {
    templateId: ProposalTemplate.UI_UX_DESIGN,
    name: 'UI/UX Design Proposal',
    serviceTypes: ['ui design', 'ux design', 'design system', 'user experience', 'user interface'],
    complexity: ['low', 'medium', 'high'],
    sections: [
      { id: 'executive_summary', title: 'Executive Summary', required: true, order: 1 },
      { id: 'project_overview', title: 'Project Overview', required: true, order: 2 },
      { id: 'design_approach', title: 'Design Approach', required: true, order: 3 },
      { id: 'scope', title: 'Scope of Work', required: true, order: 4 },
      { id: 'timeline', title: 'Timeline & Deliverables', required: true, order: 5 },
      { id: 'pricing', title: 'Investment', required: true, order: 6 },
      { id: 'terms', title: 'Terms & Conditions', required: true, order: 7 },
      { id: 'case_studies', title: 'Portfolio Highlights', required: false, order: 8 },
      { id: 'next_steps', title: 'Next Steps', required: true, order: 9 },
    ],
  },
  {
    templateId: ProposalTemplate.CUSTOM_SOFTWARE,
    name: 'Custom Software Development Proposal',
    serviceTypes: ['custom software', 'enterprise software', 'saas', 'platform', 'software development'],
    complexity: ['medium', 'high'],
    sections: [
      { id: 'executive_summary', title: 'Executive Summary', required: true, order: 1 },
      { id: 'project_overview', title: 'Project Overview', required: true, order: 2 },
      { id: 'solution_architecture', title: 'Solution Architecture', required: true, order: 3 },
      { id: 'technical_approach', title: 'Technical Approach', required: true, order: 4 },
      { id: 'scope', title: 'Scope of Work', required: true, order: 5 },
      { id: 'timeline', title: 'Timeline & Milestones', required: true, order: 6 },
      { id: 'pricing', title: 'Investment', required: true, order: 7 },
      { id: 'terms', title: 'Terms & Conditions', required: true, order: 8 },
      { id: 'case_studies', title: 'Relevant Case Studies', required: false, order: 9 },
      { id: 'next_steps', title: 'Next Steps', required: true, order: 10 },
    ],
  },
  {
    templateId: ProposalTemplate.API_INTEGRATION,
    name: 'API Integration Proposal',
    serviceTypes: ['api integration', 'integration', 'third party', 'api', 'webhooks'],
    complexity: ['low', 'medium'],
    sections: [
      { id: 'executive_summary', title: 'Executive Summary', required: true, order: 1 },
      { id: 'project_overview', title: 'Project Overview', required: true, order: 2 },
      { id: 'integration_approach', title: 'Integration Approach', required: true, order: 3 },
      { id: 'scope', title: 'Scope of Work', required: true, order: 4 },
      { id: 'timeline', title: 'Timeline', required: true, order: 5 },
      { id: 'pricing', title: 'Investment', required: true, order: 6 },
      { id: 'terms', title: 'Terms & Conditions', required: true, order: 7 },
      { id: 'next_steps', title: 'Next Steps', required: true, order: 8 },
    ],
  },
  {
    templateId: ProposalTemplate.CONSULTING,
    name: 'Technical Consulting Proposal',
    serviceTypes: ['consulting', 'advisory', 'technical consulting', 'architecture review'],
    complexity: ['low', 'medium', 'high'],
    sections: [
      { id: 'executive_summary', title: 'Executive Summary', required: true, order: 1 },
      { id: 'project_overview', title: 'Project Overview', required: true, order: 2 },
      { id: 'consulting_approach', title: 'Consulting Approach', required: true, order: 3 },
      { id: 'scope', title: 'Scope of Work', required: true, order: 4 },
      { id: 'timeline', title: 'Timeline & Deliverables', required: true, order: 5 },
      { id: 'pricing', title: 'Investment', required: true, order: 6 },
      { id: 'terms', title: 'Terms & Conditions', required: true, order: 7 },
      { id: 'case_studies', title: 'Relevant Experience', required: false, order: 8 },
      { id: 'next_steps', title: 'Next Steps', required: true, order: 9 },
    ],
  },
  {
    templateId: ProposalTemplate.MAINTENANCE,
    name: 'Maintenance & Support Proposal',
    serviceTypes: ['maintenance', 'support', 'optimization', 'performance', 'bug fixes'],
    complexity: ['low', 'medium'],
    sections: [
      { id: 'executive_summary', title: 'Executive Summary', required: true, order: 1 },
      { id: 'project_overview', title: 'Project Overview', required: true, order: 2 },
      { id: 'scope', title: 'Support Scope', required: true, order: 3 },
      { id: 'service_levels', title: 'Service Levels', required: true, order: 4 },
      { id: 'timeline', title: 'Engagement Terms', required: true, order: 5 },
      { id: 'pricing', title: 'Investment', required: true, order: 6 },
      { id: 'terms', title: 'Terms & Conditions', required: true, order: 7 },
      { id: 'next_steps', title: 'Next Steps', required: true, order: 8 },
    ],
  },
  {
    templateId: ProposalTemplate.FULL_SERVICE,
    name: 'Full-Service Partnership Proposal',
    serviceTypes: ['full service', 'end-to-end', 'complete solution', 'partnership'],
    complexity: ['high'],
    sections: [
      { id: 'executive_summary', title: 'Executive Summary', required: true, order: 1 },
      { id: 'project_overview', title: 'Project Overview', required: true, order: 2 },
      { id: 'solution_overview', title: 'Solution Overview', required: true, order: 3 },
      { id: 'technical_approach', title: 'Technical Approach', required: true, order: 4 },
      { id: 'scope', title: 'Comprehensive Scope', required: true, order: 5 },
      { id: 'timeline', title: 'Timeline & Milestones', required: true, order: 6 },
      { id: 'pricing', title: 'Investment', required: true, order: 7 },
      { id: 'terms', title: 'Terms & Conditions', required: true, order: 8 },
      { id: 'case_studies', title: 'Relevant Case Studies', required: false, order: 9 },
      { id: 'team', title: 'Our Team', required: false, order: 10 },
      { id: 'next_steps', title: 'Next Steps', required: true, order: 11 },
    ],
  },
];

/**
 * Select appropriate template based on project scope
 */
export function selectTemplate(projectScope: ProjectScope): TemplateConfig {
  // Check for explicit template match first
  const serviceTypesLower = projectScope.services.map(s => s.toLowerCase());

  // Score each template based on service type matches and complexity
  const scoredTemplates = TEMPLATE_CONFIGS.map(config => {
    let score = 0;

    // Service type matching (higher weight)
    for (const serviceType of config.serviceTypes) {
      if (serviceTypesLower.some(s => s.includes(serviceType) || serviceType.includes(s))) {
        score += 10;
      }
    }

    // Complexity matching (lower weight)
    if (config.complexity.includes(projectScope.complexity)) {
      score += 5;
    }

    // Service count preference (more services -> full-service or custom)
    if (projectScope.services.length >= 4) {
      if (config.templateId === ProposalTemplate.FULL_SERVICE) {
        score += 8;
      } else if (config.templateId === ProposalTemplate.CUSTOM_SOFTWARE) {
        score += 5;
      }
    }

    return { config, score };
  });

  // Sort by score descending
  scoredTemplates.sort((a, b) => b.score - a.score);

  // Return best match or default to web development
  const bestMatch = scoredTemplates[0];
  if (bestMatch.score > 0) {
    return bestMatch.config;
  }

  // Default fallback
  return TEMPLATE_CONFIGS.find(t => t.templateId === ProposalTemplate.WEB_DEVELOPMENT)!;
}

/**
 * Get template by ID
 */
export function getTemplate(templateId: ProposalTemplate): TemplateConfig | undefined {
  return TEMPLATE_CONFIGS.find(t => t.templateId === templateId);
}

/**
 * List all available templates
 */
export function listTemplates(): TemplateConfig[] {
  return TEMPLATE_CONFIGS;
}
