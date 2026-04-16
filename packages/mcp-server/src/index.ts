#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { registerDealStoreTools } from './tools/deal-store.js';
import { registerGmailTools } from './tools/gmail.js';
import { registerCalendarTools } from './tools/calendar.js';
import { registerDriveTools } from './tools/drive.js';

/**
 * Closepilot Deal Store MCP Server
 * Exposes database and Google services as MCP tools for agent use
 */

async function main() {
  // Create MCP server
  const server = new Server(
    {
      name: 'closepilot-deal-store',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Register tool handlers
  registerDealStoreTools(server);
  registerGmailTools(server);
  registerCalendarTools(server);
  registerDriveTools(server);

  // Handle list tools request
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        // Deal Store tools
        {
          name: 'create_deal',
          description: 'Create a new deal in the system',
          inputSchema: {
            type: 'object',
            properties: {
              input: {
                type: 'object',
                description: 'Deal input data',
              },
            },
            required: ['input'],
          },
        },
        {
          name: 'get_deal',
          description: 'Get a deal by ID',
          inputSchema: {
            type: 'object',
            properties: {
              dealId: {
                type: 'string',
                description: 'Deal ID',
              },
            },
            required: ['dealId'],
          },
        },
        {
          name: 'update_deal_stage',
          description: 'Update deal stage',
          inputSchema: {
            type: 'object',
            properties: {
              dealId: { type: 'string' },
              stage: { type: 'string' },
              reason: { type: 'string' },
            },
            required: ['dealId', 'stage'],
          },
        },
        // Calendar Tools
        {
          name: 'create_calendar_event',
          description: 'Create a new Google Calendar event',
          inputSchema: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              description: { type: 'string' },
              startTime: { type: 'string' },
              endTime: { type: 'string' },
              attendees: { type: 'array', items: { type: 'string' } },
              location: { type: 'string' },
            },
            required: ['title', 'startTime', 'endTime', 'attendees'],
          },
        },
        {
          name: 'get_calendar_event',
          description: 'Get a Google Calendar event by ID',
          inputSchema: {
            type: 'object',
            properties: { eventId: { type: 'string' } },
            required: ['eventId'],
          },
        },
        {
          name: 'update_calendar_event',
          description: 'Update a Google Calendar event',
          inputSchema: {
            type: 'object',
            properties: {
              eventId: { type: 'string' },
              updates: { type: 'object' },
            },
            required: ['eventId', 'updates'],
          },
        },
        {
          name: 'delete_calendar_event',
          description: 'Delete a Google Calendar event',
          inputSchema: {
            type: 'object',
            properties: { eventId: { type: 'string' } },
            required: ['eventId'],
          },
        },
        {
          name: 'check_availability',
          description: 'Check availability for a meeting',
          inputSchema: {
            type: 'object',
            properties: {
              attendees: { type: 'array', items: { type: 'string' } },
              windowStart: { type: 'string' },
              windowEnd: { type: 'string' },
              duration: { type: 'number' },
            },
            required: ['attendees', 'windowStart', 'windowEnd', 'duration'],
          },
        },
        {
          name: 'schedule_meeting',
          description: 'Schedule a meeting with attendees',
          inputSchema: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              description: { type: 'string' },
              duration: { type: 'number' },
              attendees: { type: 'array', items: { type: 'string' } },
              proposedTimes: { type: 'array', items: { type: 'object' } },
              location: { type: 'string' },
            },
            required: ['title', 'duration', 'attendees', 'proposedTimes'],
          },
        },
        {
          name: 'list_upcoming_events',
          description: 'List upcoming Google Calendar events',
          inputSchema: {
            type: 'object',
            properties: {
              startDate: { type: 'string' },
              endDate: { type: 'string' },
              maxResults: { type: 'number' },
            },
            required: ['startDate'],
          },
        },
        {
          name: 'find_available_slots',
          description: 'Find available time slots for a meeting',
          inputSchema: {
            type: 'object',
            properties: {
              attendees: { type: 'array', items: { type: 'string' } },
              windowStart: { type: 'string' },
              windowEnd: { type: 'string' },
              duration: { type: 'number' },
              count: { type: 'number' },
            },
            required: ['attendees', 'windowStart', 'windowEnd', 'duration'],
          },
        },
        // Add more tool definitions...
      ],
    };
  });

  // Import calendar implementations
  const {
    createEvent, getEvent, updateEvent, deleteEvent,
    checkAvailability, scheduleMeeting, listUpcomingEvents, findAvailableSlots
  } = await import('./tools/calendar.js');

  // Handle call tool request
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      if (name === 'create_calendar_event') {
        const result = await createEvent(args as any);
        return { content: result };
      }
      if (name === 'get_calendar_event') {
        const result = await getEvent((args as any).eventId);
        return { content: result };
      }
      if (name === 'update_calendar_event') {
        const result = await updateEvent((args as any).eventId, (args as any).updates);
        return { content: result };
      }
      if (name === 'delete_calendar_event') {
        await deleteEvent((args as any).eventId);
        return { content: { success: true } };
      }
      if (name === 'check_availability') {
        const result = await checkAvailability(args as any);
        return { content: result };
      }
      if (name === 'schedule_meeting') {
        const result = await scheduleMeeting(args as any);
        return { content: result };
      }
      if (name === 'list_upcoming_events') {
        const result = await listUpcomingEvents((args as any).startDate, (args as any).endDate, (args as any).maxResults);
        return { content: result };
      }
      if (name === 'find_available_slots') {
        const result = await findAvailableSlots(args as any);
        return { content: result };
      }

      // Fallback for unimplemented tools
      return {
        content: [
          {
            type: 'text',
            text: `Tool ${name} not yet implemented`,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `Error executing ${name}: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  });

  // Start server
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('Closepilot Deal Store MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
