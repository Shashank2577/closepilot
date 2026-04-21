export const MOCK_CLASSIFICATION = {
  isLead: true,
  confidence: 0.95,
  reason: 'Clear request for services with budget and timeline from a decision maker',
};

export const MOCK_EXTRACTED_LEAD = {
  name: 'John Smith',
  email: 'cto@acmecorp.com',
  company: 'Acme Corp',
  title: 'CTO',
  projectDescription: 'Rebuilding legacy customer portal',
  budget: '$150K',
  timeline: 'Q3 2026',
};

export const MOCK_ENRICHMENT = {
  companySize: '200-person',
  industry: 'SaaS',
  website: 'https://acmecorp.com',
  linkedinUrl: 'https://linkedin.com/company/acmecorp',
  estimatedRevenue: '$20M - $50M',
  painPoints: ['Legacy system', 'Outgrown current solution', 'Need for scalability'],
};

export const MOCK_SCOPING = {
  requirements: [
    { id: 'req-1', category: 'Frontend', description: 'Modern, responsive UI', priority: 'high', status: 'identified' },
    { id: 'req-2', category: 'Backend', description: 'Scalable architecture', priority: 'high', status: 'identified' },
    { id: 'req-3', category: 'Integration', description: 'Migration from legacy', priority: 'high', status: 'identified' },
    { id: 'req-4', category: 'Security', description: 'RBAC', priority: 'medium', status: 'identified' },
    { id: 'req-5', category: 'Analytics', description: 'Usage tracking', priority: 'low', status: 'identified' }
  ],
  complexity: 'high',
  estimatedHours: 800,
  needsClarification: false
};

export const MOCK_PROPOSAL = {
  title: 'Acme Corp Customer Portal Rebuild',
  summary: 'Modernize and scale Acme Corp\'s customer portal.',
  totalCost: 140000,
  timeline: '14 weeks',
  driveDocId: 'mock-doc-id',
  driveDocUrl: 'https://docs.google.com/document/d/mock-doc-id/edit'
};
