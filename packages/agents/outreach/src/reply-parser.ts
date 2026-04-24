import { parseJsonFromText, type GenerateTextInput, type TimeSlot } from '@closepilot/core';
import { formatSlotRange } from './slot-finder.js';

export type ReplyIntent =
  | 'accepted'
  | 'declined'
  | 'reschedule'
  | 'question'
  | 'out_of_office'
  | 'unknown';

export interface ParsedReply {
  intent: ReplyIntent;
  confidence: number;
  selectedSlot?: TimeSlot;
  selectedSlotIndex?: number;
  asksForAlternativeTimes: boolean;
  followUpQuestion?: string;
  rawText: string;
  signals: string[];
}

export interface ReplyParserLLM {
  generateText(input: GenerateTextInput): Promise<string>;
}

interface LLMReplyJson {
  intent?: ReplyIntent;
  confidence?: number;
  selected_slot_index?: number | null;
  asks_for_alternative_times?: boolean;
  follow_up_question?: string | null;
  signals?: string[];
}

const ACCEPTANCE_PATTERNS = [
  /\bthat works\b/i,
  /\bworks for me\b/i,
  /\bsounds good\b/i,
  /\bsee you then\b/i,
  /\bbook it\b/i,
  /\blet'?s do\b/i,
  /\bconfirmed\b/i,
  /\byes\b/i,
];

const RESCHEDULE_PATTERNS = [
  /\bdoesn'?t work\b/i,
  /\bdo not work\b/i,
  /\bcan't make\b/i,
  /\bcannot make\b/i,
  /\banother time\b/i,
  /\balternative\b/i,
  /\breschedule\b/i,
  /\bany other\b/i,
];

const DECLINE_PATTERNS = [
  /\bnot interested\b/i,
  /\bno thanks\b/i,
  /\bpass\b/i,
  /\bwe'?re all set\b/i,
  /\bnot a fit\b/i,
];

const OOO_PATTERNS = [
  /\bout of office\b/i,
  /\baway from (the )?office\b/i,
  /\bon vacation\b/i,
  /\breturning on\b/i,
  /\bauto[- ]?reply\b/i,
];

export function parseOutreachReply(replyText: string, offeredSlots: TimeSlot[] = []): ParsedReply {
  const text = replyText.trim();
  const signals: string[] = [];

  if (!text) {
    return {
      intent: 'unknown',
      confidence: 0,
      asksForAlternativeTimes: false,
      rawText: replyText,
      signals: ['empty_reply'],
    };
  }

  const outOfOffice = matchAny(text, OOO_PATTERNS, signals, 'out_of_office');
  const declined = matchAny(text, DECLINE_PATTERNS, signals, 'declined');
  const reschedule = matchAny(text, RESCHEDULE_PATTERNS, signals, 'reschedule');
  const accepted = matchAny(text, ACCEPTANCE_PATTERNS, signals, 'accepted');
  const question = /[?]/.test(text);
  const matchedSlot = findSelectedSlot(text, offeredSlots);

  if (outOfOffice) {
    return baseResult('out_of_office', 0.9, text, signals, matchedSlot, false);
  }

  if (declined) {
    return baseResult('declined', 0.86, text, signals, matchedSlot, false);
  }

  if (reschedule) {
    return baseResult('reschedule', 0.82, text, signals, matchedSlot, true);
  }

  if (accepted && matchedSlot) {
    return baseResult('accepted', 0.92, text, signals, matchedSlot, false);
  }

  if (accepted && offeredSlots.length === 1) {
    return baseResult(
      'accepted',
      0.78,
      text,
      [...signals, 'single_offered_slot'],
      { slot: offeredSlots[0], index: 0 },
      false
    );
  }

  if (accepted) {
    return baseResult('accepted', 0.68, text, signals, matchedSlot, false);
  }

  if (question) {
    return {
      intent: 'question',
      confidence: 0.64,
      asksForAlternativeTimes: false,
      followUpQuestion: extractQuestion(text),
      rawText: replyText,
      signals: [...signals, 'question_mark'],
    };
  }

  return {
    intent: 'unknown',
    confidence: 0.35,
    asksForAlternativeTimes: false,
    rawText: replyText,
    signals,
  };
}

export async function parseOutreachReplyWithLLM(
  replyText: string,
  offeredSlots: TimeSlot[],
  llm: ReplyParserLLM
): Promise<ParsedReply> {
  const deterministic = parseOutreachReply(replyText, offeredSlots);
  if (deterministic.confidence >= 0.8) {
    return deterministic;
  }

  const slotLines = offeredSlots
    .map((slot, index) => `${index}: ${formatSlotRange(slot.start, slot.end)}`)
    .join('\n');
  const response = await llm.generateText({
    system:
      'Classify sales scheduling replies. Return JSON only and do not invent a selected slot.',
    prompt: [
      'Reply:',
      replyText,
      '',
      'Offered slots:',
      slotLines || 'No slots supplied.',
      '',
      'Return JSON with keys: intent, confidence, selected_slot_index, asks_for_alternative_times, follow_up_question, signals.',
      'Allowed intent values: accepted, declined, reschedule, question, out_of_office, unknown.',
    ].join('\n'),
    maxTokens: 400,
    temperature: 0,
  });

  const parsed = parseJsonFromText<LLMReplyJson>(response);
  const selectedIndex =
    typeof parsed.selected_slot_index === 'number' && offeredSlots[parsed.selected_slot_index]
      ? parsed.selected_slot_index
      : deterministic.selectedSlotIndex;

  return {
    intent: parsed.intent || deterministic.intent,
    confidence: clamp(parsed.confidence ?? deterministic.confidence, 0, 1),
    selectedSlot: selectedIndex !== undefined ? offeredSlots[selectedIndex] : deterministic.selectedSlot,
    selectedSlotIndex: selectedIndex,
    asksForAlternativeTimes:
      parsed.asks_for_alternative_times ?? deterministic.asksForAlternativeTimes,
    followUpQuestion: parsed.follow_up_question || deterministic.followUpQuestion,
    rawText: replyText,
    signals: parsed.signals?.length ? parsed.signals : deterministic.signals,
  };
}

function baseResult(
  intent: ReplyIntent,
  confidence: number,
  text: string,
  signals: string[],
  matchedSlot: { slot: TimeSlot; index: number } | undefined,
  asksForAlternativeTimes: boolean
): ParsedReply {
  return {
    intent,
    confidence,
    selectedSlot: matchedSlot?.slot,
    selectedSlotIndex: matchedSlot?.index,
    asksForAlternativeTimes,
    rawText: text,
    signals,
  };
}

function matchAny(
  text: string,
  patterns: RegExp[],
  signals: string[],
  signal: string
): boolean {
  const matched = patterns.some((pattern) => pattern.test(text));
  if (matched) signals.push(signal);
  return matched;
}

function findSelectedSlot(
  text: string,
  offeredSlots: TimeSlot[]
): { slot: TimeSlot; index: number } | undefined {
  const normalized = normalize(text);
  let best: { slot: TimeSlot; index: number; score: number } | undefined;

  offeredSlots.forEach((slot, index) => {
    const score = scoreSlotMatch(normalized, slot);
    if (score > 0 && (!best || score > best.score)) {
      best = { slot, index, score };
    }
  });

  return best && best.score >= 2 ? { slot: best.slot, index: best.index } : undefined;
}

function scoreSlotMatch(normalizedText: string, slot: TimeSlot): number {
  const start = new Date(slot.start);
  const tokens = [
    start.toISOString().slice(0, 10),
    start.toLocaleDateString('en-US', { weekday: 'long' }),
    start.toLocaleDateString('en-US', { weekday: 'short' }),
    start.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }),
    start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    start.toLocaleTimeString('en-US', { hour: 'numeric' }),
  ].map(normalize);

  return tokens.reduce((score, token) => (token && normalizedText.includes(token) ? score + 1 : score), 0);
}

function extractQuestion(text: string): string | undefined {
  return text
    .split(/(?<=[?.!])\s+/)
    .find((sentence) => sentence.includes('?'))
    ?.trim();
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[,\u2013\u2014]/g, ' ').replace(/\s+/g, ' ').trim();
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
