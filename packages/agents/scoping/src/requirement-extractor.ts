import { Requirement } from '@closepilot/core';

/**
 * Extracts requirements from an email thread.
 * In a real implementation, this would use an LLM (e.g. Claude) to parse the thread.
 * For this implementation, we use a heuristic/mock approach based on keywords.
 */
export async function extractRequirements(emailThread: string[]): Promise<Requirement[]> {
  const requirements: Requirement[] = [];
  const fullText = emailThread.join('\n').toLowerCase();

  const generateId = () => Math.random().toString(36).substring(2, 9);

  // Functional requirements heuristics
  if (fullText.includes('login') || fullText.includes('auth')) {
    requirements.push({
      id: generateId(),
      category: 'functional',
      description: 'User authentication and authorization system',
      priority: 'high',
      status: 'identified',
    });
  }

  if (fullText.includes('dashboard') || fullText.includes('admin')) {
    requirements.push({
      id: generateId(),
      category: 'functional',
      description: 'Admin dashboard for management',
      priority: 'medium',
      status: 'identified',
    });
  }

  // Technical requirements heuristics
  if (fullText.includes('api') || fullText.includes('integration')) {
    requirements.push({
      id: generateId(),
      category: 'technical',
      description: 'Third-party API integration',
      priority: 'high',
      status: 'identified',
    });
  }

  if (fullText.includes('mobile') || fullText.includes('ios') || fullText.includes('android')) {
    requirements.push({
      id: generateId(),
      category: 'technical',
      description: 'Mobile responsive or native mobile application',
      priority: 'high',
      status: 'identified',
    });
  }

  // Timeline requirements
  if (fullText.includes('q1') || fullText.includes('january') || fullText.includes('urgent')) {
    requirements.push({
      id: generateId(),
      category: 'timeline',
      description: 'Urgent delivery required (Q1)',
      priority: 'high',
      status: 'identified',
    });
  } else if (fullText.includes('timeline') || fullText.includes('deadline')) {
    requirements.push({
      id: generateId(),
      category: 'timeline',
      description: 'Specific timeline required',
      priority: 'medium',
      status: 'identified',
      clarification: 'What is the exact deadline?'
    });
  }

  // Budget requirements
  if (fullText.includes('budget') || fullText.includes('$')) {
    requirements.push({
      id: generateId(),
      category: 'budget',
      description: 'Budget constraints mentioned',
      priority: 'high',
      status: 'identified',
      clarification: fullText.includes('$') ? undefined : 'What is the exact budget range?'
    });
  }

  // If no specific requirements are found, add a generic one
  if (requirements.length === 0) {
    requirements.push({
      id: generateId(),
      category: 'functional',
      description: 'General system functionality',
      priority: 'medium',
      status: 'identified',
      clarification: 'Need more specific functional requirements.'
    });
  }

  return requirements;
}
