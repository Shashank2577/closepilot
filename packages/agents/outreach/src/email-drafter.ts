import {
  createLLMClient,
  parseJsonFromText,
  type GenerateTextInput,
  type TimeSlot,
} from '@closepilot/core';

export interface SimilarDealBrief {
  id?: string;
  name: string;
  summary?: string;
  outcome?: string;
  services?: string[];
}

export interface LeadBrief {
  dealId?: string;
  contactName: string;
  contactEmail: string;
  contactTitle?: string;
  company: {
    name: string;
    website?: string;
    industry?: string;
    description?: string;
  };
  statedNeed: string;
  inferredTechStack?: string[];
  icpScore?: number;
  similarPastDeals?: SimilarDealBrief[];
  sourceThreadId?: string;
}

export interface OrgProfile {
  name: string;
  description: string;
  valueProp: string;
  senderName?: string;
  senderTitle?: string;
  schedulingLink?: string;
  timezone?: string;
  defaultMeetingDurationMinutes?: number;
}

export interface EmailDraft {
  to: string[];
  subject: string;
  body: string;
  cc?: string[];
  threadId?: string;
  metadata?: {
    generatedBy: 'llm' | 'caller' | 'fallback';
    wordCount: number;
    referencedSlots?: string[];
  };
}

export interface LLMTextGenerator {
  generateText(input: GenerateTextInput): Promise<string>;
}

export interface DraftOutreachEmailOptions {
  llm?: LLMTextGenerator;
  generatedDraft?: string | Partial<EmailDraft>;
  slots?: TimeSlot[];
  calendarLink?: string;
  allowTemplateFallback?: boolean;
}

interface DraftJsonResponse {
  subject?: string;
  body?: string;
}

export async function draftOutreachEmail(
  leadBrief: LeadBrief,
  orgProfile: OrgProfile,
  options: DraftOutreachEmailOptions = {}
): Promise<EmailDraft> {
  if (options.generatedDraft) {
    return normalizeDraft(options.generatedDraft, leadBrief, 'caller');
  }

  const prompt = buildDraftPrompt(leadBrief, orgProfile, options);

  try {
    const llm = options.llm || createLLMClient({ maxTokens: 700 });
    const response = await llm.generateText({
      system:
        'You write concise, specific B2B outreach emails for a services company. Return JSON only.',
      prompt,
      maxTokens: 700,
      temperature: 0.35,
    });

    return normalizeDraft(parseDraftResponse(response), leadBrief, 'llm', options.slots);
  } catch (error) {
    if (options.allowTemplateFallback === false) {
      throw error;
    }

    return normalizeDraft(buildFallbackDraft(leadBrief, orgProfile, options), leadBrief, 'fallback', options.slots);
  }
}

export function buildDraftPrompt(
  leadBrief: LeadBrief,
  orgProfile: OrgProfile,
  options: Pick<DraftOutreachEmailOptions, 'slots' | 'calendarLink'> = {}
): string {
  const techStack = leadBrief.inferredTechStack?.length
    ? leadBrief.inferredTechStack.join(', ')
    : 'Unknown';
  const similarWork = leadBrief.similarPastDeals?.length
    ? leadBrief.similarPastDeals
        .slice(0, 3)
        .map((deal) => `${deal.name}${deal.summary ? `: ${deal.summary}` : ''}`)
        .join('\n')
    : 'No similar work supplied.';
  const slotText = options.slots?.length
    ? options.slots.map((slot) => `- ${formatSlot(slot, orgProfile.timezone)}`).join('\n')
    : 'No specific slots supplied.';

  return [
    `Draft a concise outreach email to ${leadBrief.contactName} at ${leadBrief.company.name}.`,
    '',
    'Prospect context:',
    `- Contact: ${leadBrief.contactName}${leadBrief.contactTitle ? `, ${leadBrief.contactTitle}` : ''}`,
    `- Company: ${leadBrief.company.name}`,
    `- Company description: ${leadBrief.company.description || 'Unknown'}`,
    `- Stated need: ${leadBrief.statedNeed}`,
    `- Inferred tech stack: ${techStack}`,
    `- ICP score: ${leadBrief.icpScore ?? 'Unknown'}`,
    '',
    'Our company:',
    `- Name: ${orgProfile.name}`,
    `- Description: ${orgProfile.description}`,
    `- Value prop: ${orgProfile.valueProp}`,
    '',
    'Similar past work:',
    similarWork,
    '',
    'Available meeting options:',
    slotText,
    options.calendarLink ? `Scheduling link: ${options.calendarLink}` : '',
    '',
    'Guidelines:',
    '- Maximum 150 words.',
    '- Reference the specific stated need, not a generic sales pitch.',
    '- Mention one relevant past project only if it fits naturally.',
    '- End with either one specific availability question or the scheduling link.',
    '- Professional, warm tone.',
    '- Return JSON with exactly these keys: subject, body.',
  ]
    .filter(Boolean)
    .join('\n');
}

export function parseDraftResponse(responseText: string): Partial<EmailDraft> {
  try {
    const parsed = parseJsonFromText<DraftJsonResponse>(responseText);
    if (parsed.subject || parsed.body) {
      return {
        subject: parsed.subject,
        body: parsed.body,
      };
    }
  } catch {
    // Fall through to tolerant Subject:/body parsing.
  }

  const subjectMatch = responseText.match(/^subject:\s*(.+)$/im);
  const subject = subjectMatch?.[1]?.trim();
  const body = responseText
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .replace(/^subject:\s*.+$/im, '')
    .replace(/^body:\s*/im, '')
    .trim();

  return { subject, body };
}

function normalizeDraft(
  draft: string | Partial<EmailDraft>,
  leadBrief: LeadBrief,
  generatedBy: 'llm' | 'caller' | 'fallback',
  slots?: TimeSlot[]
): EmailDraft {
  const partial = typeof draft === 'string' ? parseDraftResponse(draft) : draft;
  const body = cleanEmailBody(partial.body || String(draft || '').trim());
  const subject = cleanSubject(partial.subject || `Re: ${leadBrief.company.name} project discussion`);

  if (!body) {
    throw new Error('Outreach draft body is empty');
  }

  return {
    to: partial.to?.length ? partial.to : [leadBrief.contactEmail],
    cc: partial.cc,
    subject,
    body,
    threadId: partial.threadId || leadBrief.sourceThreadId,
    metadata: {
      generatedBy,
      wordCount: countWords(body),
      referencedSlots: slots?.map((slot) => formatSlot(slot)),
    },
  };
}

function buildFallbackDraft(
  leadBrief: LeadBrief,
  orgProfile: OrgProfile,
  options: Pick<DraftOutreachEmailOptions, 'slots' | 'calendarLink'>
): Partial<EmailDraft> {
  const firstName = leadBrief.contactName.split(/\s+/)[0] || leadBrief.contactName;
  const need = leadBrief.statedNeed || 'the project you described';
  const similar = leadBrief.similarPastDeals?.[0]?.name;
  const slotQuestion = options.slots?.[0]
    ? `Would ${formatSlot(options.slots[0], orgProfile.timezone)} work for a quick ${orgProfile.defaultMeetingDurationMinutes || 30}-minute conversation?`
    : options.calendarLink
      ? `If helpful, you can grab a time here: ${options.calendarLink}`
      : 'Would you be open to a quick conversation this week?';

  const body = [
    `Hi ${firstName},`,
    '',
    `Thanks for reaching out about ${need}. ${orgProfile.name} helps teams with ${orgProfile.valueProp}, and this looks aligned with the kind of work we handle.`,
    similar ? `A relevant example is ${similar}, which had a similar shape.` : '',
    '',
    slotQuestion,
    '',
    `Best,`,
    orgProfile.senderName || orgProfile.name,
  ]
    .filter((line) => line !== '')
    .join('\n');

  return {
    subject: `${leadBrief.company.name} project discussion`,
    body,
  };
}

function cleanSubject(subject: string): string {
  return subject
    .replace(/^["']|["']$/g, '')
    .replace(/^subject:\s*/i, '')
    .trim()
    .slice(0, 140);
}

function cleanEmailBody(body: string): string {
  return body
    .replace(/^["']|["']$/g, '')
    .replace(/^body:\s*/i, '')
    .trim();
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function formatSlot(slot: TimeSlot, timezone?: string): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
    timeZone: timezone,
  });
  return formatter.format(new Date(slot.start));
}
