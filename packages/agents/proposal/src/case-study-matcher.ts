export interface CaseStudy {
  id: string;
  title: string;
  industry: string;
  services: string[];
  description: string;
  url: string;
}

const mockCaseStudies: CaseStudy[] = [
  {
    id: 'cs-001',
    title: 'Enterprise Digital Transformation',
    industry: 'Technology',
    services: ['Web Development', 'Cloud Migration'],
    description: 'Helped a Fortune 500 company migrate legacy systems to the cloud and build a modern web portal.',
    url: 'https://example.com/cases/enterprise-digital'
  },
  {
    id: 'cs-002',
    title: 'E-commerce Platform Overhaul',
    industry: 'Retail',
    services: ['Web Development', 'UI/UX Design'],
    description: 'Redesigned and rebuilt an e-commerce platform resulting in 150% increase in conversion rates.',
    url: 'https://example.com/cases/ecommerce-overhaul'
  },
  {
    id: 'cs-003',
    title: 'Mobile App for Healthcare',
    industry: 'Healthcare',
    services: ['Mobile App Development', 'UI/UX Design'],
    description: 'Developed a secure patient portal mobile application compliant with HIPAA regulations.',
    url: 'https://example.com/cases/healthcare-mobile'
  },
  {
    id: 'cs-004',
    title: 'Marketing Site redesign',
    industry: 'Finance',
    services: ['Web Development', 'SEO'],
    description: 'Modernized a financial institution\'s marketing website, improving loading speeds and SEO rankings.',
    url: 'https://example.com/cases/finance-marketing'
  },
  {
    id: 'cs-005',
    title: 'Custom CRM implementation',
    industry: 'Real Estate',
    services: ['Software Engineering', 'System Integration'],
    description: 'Built a custom CRM integrated with multiple MLS databases for a large real estate brokerage.',
    url: 'https://example.com/cases/real-estate-crm'
  }
];

export function matchCaseStudies(services: string[], complexity: 'low' | 'medium' | 'high'): CaseStudy[] {
  if (!services || services.length === 0) {
    return mockCaseStudies.slice(0, 2);
  }

  // Find case studies that match the requested services
  const matched = mockCaseStudies.filter(cs =>
    cs.services.some(service => services.includes(service))
  );

  // If we have less than 2 matches, add some generic ones to meet the 2-3 requirement
  const result = [...matched];
  let i = 0;
  while (result.length < 2 && i < mockCaseStudies.length) {
    if (!result.find(r => r.id === mockCaseStudies[i].id)) {
      result.push(mockCaseStudies[i]);
    }
    i++;
  }

  // Limit to max 3 case studies
  return result.slice(0, 3);
}
