import { Deal, ProjectScope } from '@closepilot/core';

export interface GeneratedContent {
  executiveSummary: string;
  scope: string;
  timeline: string;
  terms: string[];
  nextSteps: string[];
}

export function generateContent(deal: Deal, scope: ProjectScope): GeneratedContent {
  const companyName = deal.leadCompany || 'your company';

  const executiveSummary = `We are excited to propose a partnership with ${companyName} for the "${scope.title}" project.
This proposal outlines our approach to delivering a high-quality solution tailored to your specific needs.
${scope.description} We are confident that our expertise in ${scope.services.join(', ')} makes us the ideal partner for this engagement.`;

  const scopeText = `The scope of work for this project includes the following key deliverables:
${scope.deliverables.map(d => `- ${d}`).join('\n')}

Assumptions:
${scope.assumptions.map(a => `- ${a}`).join('\n')}

Risks to be managed:
${scope.risks.map(r => `- ${r}`).join('\n')}`;

  const timelineText = scope.timeline
    ? `The estimated timeline for this project is ${scope.timeline}. A detailed project schedule will be provided upon project kickoff.`
    : `The project timeline will be established during the initial kickoff phase, depending on final requirements.`;

  const terms = [
    'This proposal is valid for 30 days from the date of issue.',
    'Payment terms are Net 30 from the date of invoice.',
    'All intellectual property rights for the deliverables will transfer to the client upon full payment.',
    'Any changes to the scope of work may result in adjustments to the timeline and pricing.'
  ];

  const nextSteps = [
    'Review the proposal and pricing details.',
    'Sign the proposal to indicate acceptance.',
    'Schedule a project kickoff meeting.',
    'Provide initial payment as outlined in the payment schedule.'
  ];

  return {
    executiveSummary,
    scope: scopeText,
    timeline: timelineText,
    terms,
    nextSteps
  };
}
