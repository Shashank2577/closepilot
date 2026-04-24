import { createLLMClient } from '@closepilot/core';
import type { ChaseDeal, EmailDraft, FollowUpNumber, StalledDeal } from './types.js';

export interface TextGenerationClient {
  generateJson<T = unknown>(input: {
    system?: string;
    prompt: string;
    maxTokens?: number;
    temperature?: number;
  }): Promise<T>;
}

export interface FollowUpDraftInput {
  stalledDeal: StalledDeal;
  previousEmail?: {
    id?: string;
    subject?: string;
    body?: string;
  };
  llm?: TextGenerationClient;
  now?: Date;
}

interface ModelFollowUpDraft {
  subject?: string;
  body?: string;
  rationale?: string;
  callToAction?: string;
}

const TONES: Record<FollowUpNumber, EmailDraft['tone']> = {
  1: 'gentle_check_in',
  2: 'value_add',
  3: 'closing_the_loop',
};

export async function draftFollowUp(input: FollowUpDraftInput): Promise<EmailDraft> {
  const { stalledDeal, previousEmail } = input;
  const generatedAt = input.now ?? new Date();
  const llm = input.llm ?? createOptionalLLMClient();

  if (llm) {
    try {
      const draft = await llm.generateJson<ModelFollowUpDraft>({
        system:
          'You draft concise B2B sales follow-up emails. Be specific, useful, and low pressure. Do not invent facts.',
        prompt: buildPrompt(stalledDeal, previousEmail),
        maxTokens: 700,
        temperature: 0.4,
      });

      const normalized = normalizeModelDraft(draft, stalledDeal, previousEmail, generatedAt);
      if (normalized) return normalized;
    } catch {
      // Fall through to deterministic drafting so the agent still produces an approval-ready item.
    }
  }

  return fallbackDraft(stalledDeal, previousEmail, generatedAt);
}

function buildPrompt(stalledDeal: StalledDeal, previousEmail?: FollowUpDraftInput['previousEmail']): string {
  const deal = stalledDeal.deal;
  const followUpNumber = stalledDeal.followUpNumber;
  const tone = TONES[followUpNumber].replace(/_/g, ' ');

  return [
    `Draft follow-up #${followUpNumber} for a proposal-stage deal.`,
    `Tone: ${tone}.`,
    `Lead: ${deal.leadName} <${deal.leadEmail}>`,
    `Company: ${deal.leadCompany || 'unknown'}`,
    `Days since last activity: ${stalledDeal.daysSinceActivity}`,
    `Current stage: ${deal.stage}`,
    `Project scope: ${summarizeValue(deal.projectScope)}`,
    `Proposal: ${summarizeValue(deal.proposal)}`,
    `Previous subject: ${previousEmail?.subject || 'unknown'}`,
    `Previous email excerpt: ${truncate(previousEmail?.body || '', 900) || 'not available'}`,
    '',
    'Return JSON with subject, body, rationale, and callToAction.',
    'Keep the body under 100 words. Include one clear next step. Avoid pressure, fake urgency, and generic bump language.',
  ].join('\n');
}

function normalizeModelDraft(
  draft: ModelFollowUpDraft,
  stalledDeal: StalledDeal,
  previousEmail: FollowUpDraftInput['previousEmail'],
  generatedAt: Date
): EmailDraft | undefined {
  if (!draft || typeof draft !== 'object') return undefined;
  const body = cleanMultiline(draft.body);
  if (!body) return undefined;

  return {
    to: [stalledDeal.deal.leadEmail],
    subject: cleanSubject(draft.subject, previousEmail?.subject),
    body,
    threadId: stalledDeal.deal.threadId || undefined,
    inReplyToMessageId: previousEmail?.id,
    followUpNumber: stalledDeal.followUpNumber,
    tone: TONES[stalledDeal.followUpNumber],
    rationale:
      cleanSentence(draft.rationale) ||
      `Deal has had no recorded activity for ${stalledDeal.daysSinceActivity} days.`,
    callToAction: cleanSentence(draft.callToAction) || defaultCallToAction(stalledDeal.followUpNumber),
    metadata: {
      dealId: String(stalledDeal.deal.id),
      generatedAt: generatedAt.toISOString(),
      daysSinceActivity: stalledDeal.daysSinceActivity,
      previousSubject: previousEmail?.subject,
      source: 'llm',
    },
  };
}

function fallbackDraft(
  stalledDeal: StalledDeal,
  previousEmail: FollowUpDraftInput['previousEmail'],
  generatedAt: Date
): EmailDraft {
  const deal = stalledDeal.deal;
  const subject = cleanSubject(undefined, previousEmail?.subject);
  const scope = getScopeLabel(deal);
  const body = fallbackBody(deal, stalledDeal.followUpNumber, scope);

  return {
    to: [deal.leadEmail],
    subject,
    body,
    threadId: deal.threadId || undefined,
    inReplyToMessageId: previousEmail?.id,
    followUpNumber: stalledDeal.followUpNumber,
    tone: TONES[stalledDeal.followUpNumber],
    rationale: `Deal has had no recorded activity for ${stalledDeal.daysSinceActivity} days.`,
    callToAction: defaultCallToAction(stalledDeal.followUpNumber),
    metadata: {
      dealId: String(deal.id),
      generatedAt: generatedAt.toISOString(),
      daysSinceActivity: stalledDeal.daysSinceActivity,
      previousSubject: previousEmail?.subject,
      source: 'fallback',
    },
  };
}

function fallbackBody(deal: ChaseDeal, followUpNumber: FollowUpNumber, scope: string): string {
  const firstName = firstNameOf(deal.leadName);

  if (followUpNumber === 1) {
    return [
      `Hi ${firstName},`,
      '',
      `I wanted to check whether the ${scope} proposal still lines up with what your team needs.`,
      'Happy to adjust scope, timing, or next steps if anything has changed.',
      '',
      'Would it be useful to review it together this week?',
    ].join('\n');
  }

  if (followUpNumber === 2) {
    return [
      `Hi ${firstName},`,
      '',
      `One thought on the ${scope}: the fastest path is probably to confirm the must-have outcomes first, then phase anything lower priority.`,
      'That usually keeps cost and timeline cleaner.',
      '',
      'Should I send a trimmed version of the plan?',
    ].join('\n');
  }

  return [
    `Hi ${firstName},`,
    '',
    `I do not want to keep nudging if the ${scope} is no longer active.`,
    'I can close the loop for now, or reopen it whenever the timing is better.',
    '',
    'Should I pause this on my side?',
  ].join('\n');
}

function createOptionalLLMClient(): TextGenerationClient | undefined {
  try {
    return createLLMClient();
  } catch {
    return undefined;
  }
}

function cleanSubject(subject: string | undefined, previousSubject: string | undefined): string {
  const raw = cleanSentence(subject) || previousSubject || 'Following up on your proposal';
  return raw.toLowerCase().startsWith('re:') ? raw : `Re: ${raw}`;
}

function cleanMultiline(value: unknown): string {
  return typeof value === 'string'
    ? value
        .trim()
        .replace(/\r\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
    : '';
}

function cleanSentence(value: unknown): string {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

function defaultCallToAction(followUpNumber: FollowUpNumber): string {
  if (followUpNumber === 1) return 'Ask whether a short review call would help.';
  if (followUpNumber === 2) return 'Offer to send a trimmed or revised plan.';
  return 'Ask whether to pause follow-up.';
}

function getScopeLabel(deal: ChaseDeal): string {
  const scope = deal.projectScope;
  if (scope && typeof scope === 'object' && 'title' in scope) {
    const title = cleanSentence((scope as { title?: unknown }).title);
    if (title) return title;
  }
  return deal.leadCompany ? `${deal.leadCompany} project` : 'project';
}

function firstNameOf(name: string): string {
  return name.trim().split(/\s+/)[0] || 'there';
}

function summarizeValue(value: unknown): string {
  if (!value) return 'not available';
  if (typeof value === 'string') return truncate(value, 800);
  return truncate(JSON.stringify(value), 800);
}

function truncate(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value;
}
