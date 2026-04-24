import type {
  CalendarEvent,
  Deal,
  EmailMessage,
  TimeSlot,
} from '@closepilot/core';
import {
  CalendarTools,
  DealStoreClient,
  DealStoreTools,
  GmailTools,
} from '@closepilot/mcp-client';
import {
  draftOutreachEmail,
  type DraftOutreachEmailOptions,
  type EmailDraft,
  type LLMTextGenerator,
  type LeadBrief,
  type OrgProfile,
} from './email-drafter.js';
import {
  findAvailableSlots,
  type CalendarAvailabilityPort,
  type FindAvailableSlotsOptions,
  type OutreachTimeSlot,
} from './slot-finder.js';
import {
  bookOutreachMeeting,
  type BookingResult,
  type CalendarBookingPort,
  type GmailSendPort,
} from './booker.js';
import {
  parseOutreachReply,
  parseOutreachReplyWithLLM,
  type ParsedReply,
} from './reply-parser.js';

export type OutreachStage = 'qualified' | 'outreach-sent' | 'meeting-booked';

export interface OutreachAgentDependencies {
  mcpClient?: DealStoreClient;
  dealStore?: DealStoreTools;
  calendar?: CalendarTools;
  gmail?: GmailTools;
}

export interface OutreachAgentConfig {
  orgProfile?: OrgProfile;
  llm?: LLMTextGenerator;
  mcpServerCommand?: string;
  requireApproval?: boolean;
  slotOptions?: Omit<FindAvailableSlotsOptions, 'attendees'>;
  draftOptions?: Omit<DraftOutreachEmailOptions, 'llm' | 'slots'>;
  sendConfirmationOnBooking?: boolean;
}

export interface OutreachProcessInput {
  dealId: string;
  orgId?: string;
  deal?: Deal;
  leadBrief?: LeadBrief;
  generatedDraft?: string | Partial<EmailDraft>;
  approvedDraft?: EmailDraft;
  slots?: TimeSlot[];
  replyText?: string;
  selectedSlot?: TimeSlot;
  sendApprovedDraft?: boolean;
}

export interface OutreachProcessResult {
  dealId: string;
  orgId?: string;
  success: boolean;
  mode: 'draft' | 'send' | 'parse-reply' | 'book';
  draft?: EmailDraft;
  sentEmail?: EmailMessage;
  slots?: OutreachTimeSlot[];
  parsedReply?: ParsedReply;
  booking?: BookingResult;
  calendarEvent?: CalendarEvent;
  requiresApproval: boolean;
  suggestedStage?: OutreachStage;
  approvalPayload?: {
    type: 'outreach_email';
    draft: EmailDraft;
    slots: TimeSlot[];
  };
  warnings?: string[];
  errors?: string[];
  durationMs: number;
}

interface ResolvedOutreachAgentConfig extends OutreachAgentConfig {
  orgProfile: OrgProfile;
}

export class OutreachAgent {
  private mcpClient?: DealStoreClient;
  private dealStore?: DealStoreTools;
  private calendar?: CalendarTools;
  private gmail?: GmailTools;
  private readonly config: ResolvedOutreachAgentConfig;

  constructor(
    dependencies: OutreachAgentDependencies | DealStoreClient = {},
    config: OutreachAgentConfig = {}
  ) {
    const resolvedDependencies =
      dependencies instanceof DealStoreClient ? { mcpClient: dependencies } : dependencies;

    this.config = resolveConfig(config);
    this.mcpClient = resolvedDependencies.mcpClient;
    this.dealStore = resolvedDependencies.dealStore;
    this.calendar = resolvedDependencies.calendar;
    this.gmail = resolvedDependencies.gmail;

    if (resolvedDependencies.mcpClient) {
      this.dealStore ||= new DealStoreTools(resolvedDependencies.mcpClient);
      this.calendar ||= new CalendarTools(resolvedDependencies.mcpClient);
      this.gmail ||= new GmailTools(resolvedDependencies.mcpClient);
    }
  }

  async process(input: OutreachProcessInput): Promise<OutreachProcessResult> {
    const startedAt = Date.now();
    const warnings: string[] = [];

    try {
      await this.ensureMcpTools();

      if (input.replyText || input.selectedSlot) {
        return await this.processReplyOrBooking(input, startedAt, warnings);
      }

      const deal = input.deal || (await this.loadDeal(input.dealId));
      const leadBrief = input.leadBrief || buildLeadBriefFromDeal(deal);
      const slots = input.slots
        ? input.slots.map(toOutreachSlot)
        : await this.findSlotsForLead(leadBrief, warnings);
      const draft =
        input.approvedDraft ||
        (await draftOutreachEmail(leadBrief, this.config.orgProfile, {
          ...this.config.draftOptions,
          generatedDraft: input.generatedDraft,
          slots,
          llm: this.config.llm,
        }));

      if (input.sendApprovedDraft) {
        const sentEmail = await this.sendDraft(draft);
        return {
          dealId: input.dealId,
          orgId: input.orgId,
          success: true,
          mode: 'send',
          draft,
          sentEmail,
          slots,
          requiresApproval: false,
          suggestedStage: 'outreach-sent',
          warnings: warnings.length ? warnings : undefined,
          durationMs: Date.now() - startedAt,
        };
      }

      await this.markPendingApproval(input.dealId, warnings);

      return {
        dealId: input.dealId,
        orgId: input.orgId,
        success: true,
        mode: 'draft',
        draft,
        slots,
        requiresApproval: this.config.requireApproval !== false,
        suggestedStage: 'outreach-sent',
        approvalPayload: {
          type: 'outreach_email',
          draft,
          slots,
        },
        warnings: warnings.length ? warnings : undefined,
        durationMs: Date.now() - startedAt,
      };
    } catch (error) {
      return {
        dealId: input.dealId,
        orgId: input.orgId,
        success: false,
        mode: input.replyText || input.selectedSlot ? 'parse-reply' : 'draft',
        requiresApproval: false,
        errors: [error instanceof Error ? error.message : 'Unknown outreach error'],
        warnings: warnings.length ? warnings : undefined,
        durationMs: Date.now() - startedAt,
      };
    }
  }

  private async processReplyOrBooking(
    input: OutreachProcessInput,
    startedAt: number,
    warnings: string[]
  ): Promise<OutreachProcessResult> {
    const offeredSlots = input.slots || [];
    const parsedReply = input.replyText
      ? this.config.llm
        ? await parseOutreachReplyWithLLM(input.replyText, offeredSlots, this.config.llm)
        : parseOutreachReply(input.replyText, offeredSlots)
      : undefined;
    const selectedSlot = input.selectedSlot || parsedReply?.selectedSlot;

    if (!selectedSlot) {
      return {
        dealId: input.dealId,
        orgId: input.orgId,
        success: true,
        mode: 'parse-reply',
        parsedReply,
        requiresApproval: parsedReply?.intent === 'question' || parsedReply?.intent === 'reschedule',
        warnings: warnings.length ? warnings : undefined,
        durationMs: Date.now() - startedAt,
      };
    }

    const deal = input.deal || (await this.loadDeal(input.dealId));
    const leadBrief = input.leadBrief || buildLeadBriefFromDeal(deal);
    const booking = await this.bookMeeting(input.dealId, leadBrief, selectedSlot);

    return {
      dealId: input.dealId,
      orgId: input.orgId,
      success: true,
      mode: 'book',
      parsedReply,
      booking,
      calendarEvent: booking.event,
      requiresApproval: false,
      suggestedStage: 'meeting-booked',
      warnings: warnings.length ? warnings : undefined,
      durationMs: Date.now() - startedAt,
    };
  }

  private async ensureMcpTools(): Promise<void> {
    if ((this.dealStore && this.calendar && this.gmail) || !this.config.mcpServerCommand) {
      return;
    }

    this.mcpClient = new DealStoreClient(this.config.mcpServerCommand);
    await this.mcpClient.connect();
    this.dealStore ||= new DealStoreTools(this.mcpClient);
    this.calendar ||= new CalendarTools(this.mcpClient);
    this.gmail ||= new GmailTools(this.mcpClient);
  }

  private async loadDeal(dealId: string): Promise<Deal> {
    if (!this.dealStore) {
      throw new Error('DealStoreTools are required when process input does not include deal or leadBrief');
    }

    const deal = await this.dealStore.getDeal(dealId);
    if (!deal) {
      throw new Error(`Deal ${dealId} not found`);
    }
    return deal;
  }

  private async findSlotsForLead(
    leadBrief: LeadBrief,
    warnings: string[]
  ): Promise<OutreachTimeSlot[]> {
    if (!this.calendar) {
      warnings.push('CalendarTools not configured; outreach draft will not include concrete slots');
      return [];
    }

    return findAvailableSlots(this.calendar as CalendarAvailabilityPort, {
      ...this.config.slotOptions,
      attendees: [leadBrief.contactEmail],
    });
  }

  private async sendDraft(draft: EmailDraft): Promise<EmailMessage> {
    if (!this.gmail) {
      throw new Error('GmailTools are required to send an approved outreach draft');
    }

    return this.gmail.sendEmail({
      to: draft.to,
      subject: draft.subject,
      body: draft.body,
      cc: draft.cc,
      threadId: draft.threadId,
    });
  }

  private async bookMeeting(
    dealId: string,
    leadBrief: LeadBrief,
    selectedSlot: TimeSlot
  ): Promise<BookingResult> {
    if (!this.calendar) {
      throw new Error('CalendarTools are required to book an outreach meeting');
    }

    return bookOutreachMeeting(
      this.calendar as CalendarBookingPort,
      {
        dealId,
        contactName: leadBrief.contactName,
        contactEmail: leadBrief.contactEmail,
        companyName: leadBrief.company.name,
        orgProfile: this.config.orgProfile,
        selectedSlot,
        durationMinutes:
          this.config.slotOptions?.durationMinutes ||
          this.config.orgProfile.defaultMeetingDurationMinutes,
        agenda: buildDefaultAgenda(leadBrief),
        threadId: leadBrief.sourceThreadId,
        sendConfirmation: this.config.sendConfirmationOnBooking,
      },
      this.gmail as GmailSendPort | undefined
    );
  }

  private async markPendingApproval(dealId: string, warnings: string[]): Promise<void> {
    if (!this.dealStore || this.config.requireApproval === false) {
      return;
    }

    try {
      await this.dealStore.updateDeal(dealId, { approvalStatus: 'pending' });
    } catch (error) {
      warnings.push(
        `Could not mark outreach approval pending: ${
          error instanceof Error ? error.message : 'unknown error'
        }`
      );
    }
  }
}

export function buildLeadBriefFromDeal(deal: Deal): LeadBrief {
  const requirements = deal.requirements?.map((requirement) => requirement.description).join('; ');
  const services = deal.projectScope?.services?.join(', ');
  const statedNeed =
    deal.projectScope?.description ||
    requirements ||
    services ||
    'a potential services engagement';

  return {
    dealId: deal.id,
    contactName: deal.leadName,
    contactEmail: deal.leadEmail,
    contactTitle: deal.leadTitle,
    company: {
      name: deal.leadCompany || deal.companyResearch?.companyName || 'your team',
      website: deal.companyResearch?.website,
      industry: deal.companyResearch?.industry,
      description: deal.companyResearch?.description,
    },
    statedNeed,
    inferredTechStack: deal.companyResearch?.technologies,
    similarPastDeals: [],
    sourceThreadId: deal.threadId,
  };
}

function toOutreachSlot(slot: TimeSlot): OutreachTimeSlot {
  return {
    start: new Date(slot.start),
    end: new Date(slot.end),
    label: `${new Date(slot.start).toISOString()} - ${new Date(slot.end).toISOString()}`,
    allAttendeesAvailable: true,
    conflicts: [],
  };
}

function buildDefaultAgenda(leadBrief: LeadBrief): string[] {
  return [
    `Understand ${leadBrief.company.name}'s goals`,
    'Confirm scope, constraints, and timeline',
    'Agree on the next step',
  ];
}

function resolveConfig(config: OutreachAgentConfig): ResolvedOutreachAgentConfig {
  return {
    ...config,
    orgProfile: config.orgProfile || {
      name: process.env.CLOSEPILOT_ORG_NAME || 'Closepilot',
      description:
        process.env.CLOSEPILOT_ORG_DESCRIPTION ||
        'A services team that helps B2B companies scope and deliver software projects.',
      valueProp:
        process.env.CLOSEPILOT_ORG_VALUE_PROP ||
        'turning inbound project interest into clear scope, timeline, and next steps',
      senderName: process.env.CLOSEPILOT_SENDER_NAME || process.env.CLOSEPILOT_ORG_NAME || 'Closepilot',
      schedulingLink: process.env.CLOSEPILOT_SCHEDULING_LINK,
      timezone: process.env.TZ,
      defaultMeetingDurationMinutes: Number(process.env.CLOSEPILOT_DEFAULT_MEETING_MINUTES || 30),
    },
  };
}

export * from './email-drafter.js';
export * from './slot-finder.js';
export * from './booker.js';
export * from './reply-parser.js';
