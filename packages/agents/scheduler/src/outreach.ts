import Anthropic from '@anthropic-ai/sdk';
import { Deal, TimeSlot } from '@closepilot/core';
import { DateTime } from 'luxon';

export class OutreachDrafter {
  private anthropic: Anthropic;

  constructor(apiKey: string) {
    this.anthropic = new Anthropic({ apiKey });
  }

  /**
   * Draft a personalized outreach email with meeting slots
   */
  async draftEmail(deal: Deal, slots: TimeSlot[]): Promise<{ subject: string; body: string }> {
    const slotStrings = slots.map(s => 
      DateTime.fromJSDate(s.start).toLocaleString(DateTime.DATETIME_MED)
    ).join('\n- ');

    const prompt = `
      You are an expert sales assistant for a high-end service business.
      Your goal is to draft a personalized, professional, and low-pressure outreach email to a new lead who has been qualified.

      LEAD INFORMATION:
      - Name: ${deal.leadName}
      - Company: ${deal.leadCompany || 'Unknown'}
      - Email: ${deal.leadEmail}
      - Initial Inquiry Context: ${deal.leadTitle || ''}
      
      RESEARCH DATA:
      ${JSON.stringify(deal.companyResearch, null, 2)}

      PROPOSED TIME SLOTS:
      - ${slotStrings}

      REQUIREMENTS:
      1. Mention a specific detail from their company research to show we've done our homework.
      2. Keep it under 150 words.
      3. Propose the time slots clearly.
      4. The tone should be helpful and consultative, not pushy.
      5. Output ONLY the subject and body in JSON format.

      Example output:
      {
        "subject": "Follow up regarding [Company] and [Topic]",
        "body": "Hi [Name], ..."
      }
    `;

    const message = await this.anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response format from Claude');
    }

    try {
      const result = JSON.parse(content.text);
      return result;
    } catch (error) {
      console.error('Failed to parse Claude response:', content.text);
      throw new Error('Failed to generate outreach email');
    }
  }
}
