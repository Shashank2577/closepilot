import { Requirement } from '@closepilot/core';

export interface ClarificationResult {
  needsClarification: boolean;
  emailDraft?: string;
}

/**
 * Generates a clarification email if there are requirements in 'identified' state
 * that need clarification (e.g. they have the `clarification` field populated).
 */
export async function generateClarificationEmail(
  requirements: Requirement[],
  prospectName: string
): Promise<ClarificationResult> {
  const requirementsNeedingClarification = requirements.filter(
    (req) => req.status === 'identified' && req.clarification
  );

  if (requirementsNeedingClarification.length === 0) {
    return { needsClarification: false };
  }

  let emailDraft = `Hi ${prospectName},\n\n`;
  emailDraft += `Thank you for discussing your project with us. We are currently putting together a detailed scope and proposal.\n`;
  emailDraft += `To ensure we accurately capture your needs, could you please clarify the following points?\n\n`;

  requirementsNeedingClarification.forEach((req, index) => {
    emailDraft += `${index + 1}. Regarding "${req.description}": ${req.clarification}\n`;
  });

  emailDraft += `\nLooking forward to your response so we can finalize the proposal.\n\n`;
  emailDraft += `Best regards,\n`;
  emailDraft += `The Closepilot Team`;

  return {
    needsClarification: true,
    emailDraft,
  };
}
