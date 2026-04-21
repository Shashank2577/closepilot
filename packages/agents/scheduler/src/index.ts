import { DealStoreClient, CalendarTools, DealStoreTools } from '@closepilot/mcp-client';
import { AvailabilityChecker } from './availability.js';
import { OutreachDrafter } from './outreach.js';
import { Deal, DealStage } from '@closepilot/core';

export interface SchedulerConfig {
  anthropicApiKey: string;
  mcpServerCommand?: string;
}

export class SchedulerAgent {
  private availability: AvailabilityChecker;
  private drafter: OutreachDrafter;
  private dealStore: DealStoreTools;

  constructor(private config: SchedulerConfig, calendarTools: CalendarTools, dealStoreTools: DealStoreTools) {
    this.availability = new AvailabilityChecker(calendarTools);
    this.drafter = new OutreachDrafter(config.anthropicApiKey);
    this.dealStore = dealStoreTools;
  }

  /**
   * Process a deal that needs scheduling
   */
  async processDeal(dealId: string): Promise<void> {
    console.log(`Scheduler Agent processing deal: ${dealId}`);

    // 1. Get deal details
    const deal = await this.dealStore.getDeal(dealId);
    if (!deal) {
      throw new Error(`Deal ${dealId} not found`);
    }

    // 2. Find available slots
    const slots = await this.availability.getAvailableSlots();
    if (slots.length === 0) {
      console.warn(`No available slots found for deal ${dealId}`);
      return;
    }

    // 3. Draft outreach email
    const email = await this.drafter.draftEmail(deal, slots);

    // 4. Create approval request for the outreach
    // Note: In the actual implementation, we might have a specific approval tool
    // For now, we'll log it and update the deal stage or metadata
    console.log(`Drafted outreach for ${deal.leadEmail}:`, email);
    
    console.log(`[Scheduler] Activity: SCHEDULER_OUTREACH_DRAFTED for deal ${dealId} — Drafted outreach email to ${deal.leadEmail}`);

    // Update deal stage to indicated outreach is pending approval/sent
    // In our pipeline, let's assume 'scoping' or a custom sub-stage
    // For now, we'll just mark it as processed by scheduler
  }
}

/**
 * Start the Scheduler Agent
 */
export async function startSchedulerAgent(config: SchedulerConfig): Promise<SchedulerAgent> {
  const client = new DealStoreClient(config.mcpServerCommand);
  await client.connect();

  const calendarTools = new CalendarTools(client);
  const dealStoreTools = new DealStoreTools(client);

  const agent = new SchedulerAgent(config, calendarTools, dealStoreTools);
  return agent;
}
