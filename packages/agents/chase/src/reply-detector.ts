import type { ChaseDeal, ChaseEmailMessage, ChaseThread, ReplyIntent, ReplySignal } from './types.js';
import { resolveLastActivityAt } from './stall-detector.js';

export interface ReplyDetectionOptions {
  since?: Date;
  now?: Date;
}

export function detectReplySignals(
  deal: ChaseDeal,
  thread: ChaseThread | null | undefined,
  options: ReplyDetectionOptions = {}
): ReplySignal[] {
  if (!thread?.messages?.length) return [];

  const since = options.since ?? resolveLastActivityAt(deal);
  return thread.messages
    .filter((message) => isLeadReply(deal, message))
    .filter((message) => parseDate(message.timestamp).getTime() > since.getTime())
    .sort((a, b) => parseDate(b.timestamp).getTime() - parseDate(a.timestamp).getTime())
    .map((message) => parseReply(deal, message));
}

export function parseReply(deal: ChaseDeal, message: ChaseEmailMessage): ReplySignal {
  const text = normalizeText(`${message.subject}\n${message.body}`);
  const intent = classifyIntent(text);
  const recommendedStage = recommendedStageForIntent(intent);

  return {
    dealId: String(deal.id),
    messageId: message.id,
    threadId: message.threadId,
    from: message.from.email,
    receivedAt: parseDate(message.timestamp),
    intent,
    confidence: confidenceForIntent(intent, text),
    summary: summarizeReply(intent, message.body),
    recommendedStage,
    requiresHumanReview: intent !== 'out_of_office',
  };
}

export function isLeadReply(deal: ChaseDeal, message: ChaseEmailMessage): boolean {
  const from = message.from.email.toLowerCase();
  const leadEmail = deal.leadEmail.toLowerCase();
  if (from === leadEmail) return true;

  const leadDomain = leadEmail.split('@')[1];
  return Boolean(leadDomain && from.endsWith(`@${leadDomain}`));
}

function classifyIntent(text: string): ReplyIntent {
  if (matches(text, ['out of office', 'automatic reply', 'auto-reply', 'ooo', 'on vacation'])) {
    return 'out_of_office';
  }
  if (matches(text, ['not interested', 'no longer', 'went with', 'another vendor', 'cancel', 'unsubscribe'])) {
    return 'not_interested';
  }
  if (matches(text, ['book', 'schedule', 'calendar', 'meet', 'call', 'available', 'times work'])) {
    return 'meeting_requested';
  }
  if (matches(text, ['approved', 'move forward', 'go ahead', 'proceed', 'sounds good', 'ready to start'])) {
    return 'ready_to_proceed';
  }
  if (matches(text, ['concern', 'too expensive', 'budget', 'price', 'timeline', 'delay', 'risk', 'legal'])) {
    return 'objection';
  }
  if (text.includes('?') || matches(text, ['can you', 'could you', 'how would', 'what about', 'clarify'])) {
    return 'question';
  }
  return 'neutral';
}

function recommendedStageForIntent(intent: ReplyIntent): string | undefined {
  if (intent === 'ready_to_proceed' || intent === 'meeting_requested' || intent === 'question' || intent === 'objection') {
    return 'negotiating';
  }
  if (intent === 'not_interested') return 'closed-lost';
  return undefined;
}

function confidenceForIntent(intent: ReplyIntent, text: string): number {
  if (intent === 'neutral') return 0.45;
  if (intent === 'question' && text.includes('?')) return 0.72;
  if (intent === 'out_of_office') return 0.9;
  return 0.78;
}

function summarizeReply(intent: ReplyIntent, body: string): string {
  const excerpt = normalizeWhitespace(body).slice(0, 180);
  const prefix = intent.replace(/_/g, ' ');
  return excerpt ? `${prefix}: ${excerpt}` : prefix;
}

function matches(text: string, phrases: string[]): boolean {
  return phrases.some((phrase) => text.includes(phrase));
}

function normalizeText(value: string): string {
  return normalizeWhitespace(value).toLowerCase();
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function parseDate(value: Date | string): Date {
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
}
