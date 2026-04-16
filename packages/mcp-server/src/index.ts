#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { dealStoreToolDefinitions, handleDealStoreToolCall, registerDealStoreTools } from './tools/deal-store.js';
import { registerGmailTools } from './tools/gmail.js';
import { registerCalendarTools } from './tools/calendar.js';
import { registerDriveTools } from './tools/drive.js';

/**
 * Closepilot Deal Store MCP Server
 * Exposes database and Google services as MCP tools for agent use
 */

/**
 * Get authentication configuration from environment
 * TODO: In production, this will fetch from database based on authenticated user
 */
function getAuthConfig() {
  return {
    accessToken: process.env.GOOGLE_ACCESS_TOKEN || '',
    refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  };
}

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
        ...dealStoreToolDefinitions,
        // Calendar tools
        {
          name: 'create_calendar_event',
          description: 'Create a new calendar event with attendees',
          inputSchema: {
            type: 'object',
            properties: {
              title: { type: 'string', description: 'Event title' },
              description: { type: 'string', description: 'Event description' },
              startTime: { type: 'string', description: 'Start time (ISO 8601)' },
              endTime: { type: 'string', description: 'End time (ISO 8601)' },
              attendees: {
                type: 'array',
                items: { type: 'string' },
                description: 'Attendee email addresses',
              },
              location: { type: 'string', description: 'Event location' },
            },
            required: ['title', 'startTime', 'endTime', 'attendees'],
          },
        },
        {
          name: 'get_calendar_event',
          description: 'Get a calendar event by ID',
          inputSchema: {
            type: 'object',
            properties: {
              eventId: { type: 'string', description: 'Event ID' },
            },
            required: ['eventId'],
          },
        },
        {
          name: 'update_calendar_event',
          description: 'Update a calendar event',
          inputSchema: {
            type: 'object',
            properties: {
              eventId: { type: 'string', description: 'Event ID' },
              updates: { type: 'object', description: 'Event updates' },
            },
            required: ['eventId', 'updates'],
          },
        },
        {
          name: 'delete_calendar_event',
          description: 'Delete a calendar event',
          inputSchema: {
            type: 'object',
            properties: {
              eventId: { type: 'string', description: 'Event ID' },
            },
            required: ['eventId'],
          },
        },
        {
          name: 'check_availability',
          description: 'Check availability for attendees in a time window',
          inputSchema: {
            type: 'object',
            properties: {
              attendees: { type: 'array', items: { type: 'string' }, description: 'Attendee email addresses' },
              windowStart: { type: 'string', description: 'Window start (ISO 8601)' },
              windowEnd: { type: 'string', description: 'Window end (ISO 8601)' },
              duration: { type: 'number', description: 'Duration in minutes' },
            },
            required: ['attendees', 'windowStart', 'windowEnd', 'duration'],
          },
        },
        {
          name: 'schedule_meeting',
          description: 'Schedule a meeting by finding the best time',
          inputSchema: {
            type: 'object',
            properties: {
              title: { type: 'string', description: 'Meeting title' },
              description: { type: 'string', description: 'Meeting description' },
              duration: { type: 'number', description: 'Duration in minutes' },
              attendees: { type: 'array', items: { type: 'string' }, description: 'Attendee email addresses' },
              proposedTimes: {
                type: 'array',
                description: 'Proposed time slots',
                items: {
                  type: 'object',
                  properties: {
                    start: { type: 'string', description: 'Start time (ISO 8601)' },
                    end: { type: 'string', description: 'End time (ISO 8601)' },
                  },
                },
              },
              location: { type: 'string', description: 'Meeting location' },
            },
            required: ['title', 'duration', 'attendees', 'proposedTimes'],
          },
        },
        {
          name: 'list_upcoming_events',
          description: 'List upcoming calendar events',
          inputSchema: {
            type: 'object',
            properties: {
              startDate: { type: 'string', description: 'Start date (ISO 8601)' },
              endDate: { type: 'string', description: 'End date (ISO 8601)' },
              maxResults: { type: 'number', description: 'Maximum results' },
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
              attendees: { type: 'array', items: { type: 'string' }, description: 'Attendee email addresses' },
              windowStart: { type: 'string', description: 'Window start (ISO 8601)' },
              windowEnd: { type: 'string', description: 'Window end (ISO 8601)' },
              duration: { type: 'number', description: 'Duration in minutes' },
              count: { type: 'number', description: 'Number of slots to return' },
            },
            required: ['attendees', 'windowStart', 'windowEnd', 'duration'],
          },
        },
        // Drive Tools
        {
          name: 'list_templates',
          description: 'List document templates',
          inputSchema: { type: 'object', properties: { type: { type: 'string' } } },
        },
        {
          name: 'get_template',
          description: 'Get template by ID',
          inputSchema: { type: 'object', properties: { templateId: { type: 'string' } }, required: ['templateId'] },
        },
        {
          name: 'generate_document',
          description: 'Generate document from template',
          inputSchema: {
            type: 'object',
            properties: {
              templateId: { type: 'string' },
              dealId: { type: 'string' },
              values: { type: 'object' },
              outputFormat: { type: 'string', enum: ['doc', 'pdf', 'both'] },
              createInFolder: { type: 'string' },
            },
            required: ['templateId', 'dealId', 'values', 'outputFormat'],
          },
        },
        {
          name: 'get_document',
          description: 'Get generated document by ID',
          inputSchema: { type: 'object', properties: { documentId: { type: 'string' } }, required: ['documentId'] },
        },
        {
          name: 'update_document_status',
          description: 'Update document status',
          inputSchema: {
            type: 'object',
            properties: {
              documentId: { type: 'string' },
              status: { type: 'string', enum: ['draft', 'pending_review', 'approved', 'rejected'] },
            },
            required: ['documentId', 'status'],
          },
        },
        {
          name: 'create_drive_folder',
          description: 'Create Drive folder',
          inputSchema: { type: 'object', properties: { name: { type: 'string' }, parentId: { type: 'string' } }, required: ['name'] },
        },
        {
          name: 'list_drive_folder',
          description: 'List documents in a Drive folder',
          inputSchema: { type: 'object', properties: { folderId: { type: 'string' } }, required: ['folderId'] },
        },
        {
          name: 'copy_drive_document',
          description: 'Copy a Drive document',
          inputSchema: {
            type: 'object',
            properties: { documentId: { type: 'string' }, destinationFolderId: { type: 'string' }, newTitle: { type: 'string' } },
            required: ['documentId'],
          },
        },
        {
          name: 'share_drive_document',
          description: 'Share a Drive document',
          inputSchema: {
            type: 'object',
            properties: {
              documentId: { type: 'string' },
              emails: { type: 'array', items: { type: 'string' } },
              role: { type: 'string', enum: ['reader', 'writer', 'commenter'] },
            },
            required: ['documentId', 'emails', 'role'],
          },
        },
        {
          name: 'get_drive_download_url',
          description: 'Get document download URL',
          inputSchema: { type: 'object', properties: { documentId: { type: 'string' } }, required: ['documentId'] },
        },
      ],
    };
  });

  // Handle call tool request
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      const dealStoreResult = await handleDealStoreToolCall(name, args);
      if (dealStoreResult) {
        return dealStoreResult;
      }

      // Drive tools
      if (name === 'list_templates') {
        const { listTemplates } = await import('./tools/drive.js');
        const content = await listTemplates(args?.type as string | undefined);
        return { content: [{ type: 'text', text: JSON.stringify(content) }] };
      }
      if (name === 'get_template') {
        const { getTemplate } = await import('./tools/drive.js');
        const content = await getTemplate(args?.templateId as string);
        return { content: [{ type: 'text', text: JSON.stringify(content) }] };
      }
      if (name === 'generate_document') {
        const { generateDocument } = await import('./tools/drive.js');
        const content = await generateDocument(args as any);
        return { content: [{ type: 'text', text: JSON.stringify(content) }] };
      }
      if (name === 'get_document') {
        const { getDocument } = await import('./tools/drive.js');
        const content = await getDocument(args?.documentId as string);
        return { content: [{ type: 'text', text: JSON.stringify(content) }] };
      }
      if (name === 'update_document_status') {
        const { updateDocumentStatus } = await import('./tools/drive.js');
        const content = await updateDocumentStatus(args?.documentId as string, args?.status as any);
        return { content: [{ type: 'text', text: JSON.stringify(content) }] };
      }
      if (name === 'create_drive_folder') {
        const { createFolder } = await import('./tools/drive.js');
        const content = await createFolder(args?.name as string, args?.parentId as string | undefined);
        return { content: [{ type: 'text', text: JSON.stringify(content) }] };
      }
      if (name === 'list_drive_folder') {
        const { listFolder } = await import('./tools/drive.js');
        const content = await listFolder(args?.folderId as string);
        return { content: [{ type: 'text', text: JSON.stringify(content) }] };
      }
      if (name === 'copy_drive_document') {
        const { copyDocument } = await import('./tools/drive.js');
        const content = await copyDocument(args?.documentId as string, args?.destinationFolderId as string | undefined, args?.newTitle as string | undefined);
        return { content: [{ type: 'text', text: JSON.stringify(content) }] };
      }
      if (name === 'share_drive_document') {
        const { shareDocument } = await import('./tools/drive.js');
        await shareDocument(args?.documentId as string, args?.emails as string[], args?.role as any);
        return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }] };
      }
      if (name === 'get_drive_download_url') {
        const { getDownloadUrl } = await import('./tools/drive.js');
        const content = await getDownloadUrl(args?.documentId as string);
        return { content: [{ type: 'text', text: JSON.stringify(content) }] };
      }

      // Calendar tools
      if (name === 'create_calendar_event') {
        const { createEvent } = await import('./tools/calendar.js');
        const authConfig = getAuthConfig();
        const result = await createEvent({
          title: args.title as string,
          description: args.description as string | undefined,
          startTime: new Date(args.startTime as string),
          endTime: new Date(args.endTime as string),
          attendees: args.attendees as string[],
          location: args.location as string | undefined,
          authConfig,
        });
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
      }

      if (name === 'get_calendar_event') {
        const { getEvent } = await import('./tools/calendar.js');
        const authConfig = getAuthConfig();
        const result = await getEvent(args.eventId as string, authConfig);
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
      }

      if (name === 'update_calendar_event') {
        const { updateEvent } = await import('./tools/calendar.js');
        const authConfig = getAuthConfig();
        const result = await updateEvent(
          args.eventId as string,
          args.updates as Partial<import('@closepilot/core').CalendarEvent>,
          authConfig
        );
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
      }

      if (name === 'delete_calendar_event') {
        const { deleteEvent } = await import('./tools/calendar.js');
        const authConfig = getAuthConfig();
        await deleteEvent(args.eventId as string, authConfig);
        return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }] };
      }

      if (name === 'check_availability') {
        const { checkAvailability } = await import('./tools/calendar.js');
        const authConfig = getAuthConfig();
        const result = await checkAvailability(
          {
            attendees: args.attendees as string[],
            windowStart: new Date(args.windowStart as string),
            windowEnd: new Date(args.windowEnd as string),
            duration: args.duration as number,
          },
          authConfig
        );
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
      }

      if (name === 'schedule_meeting') {
        const { scheduleMeeting } = await import('./tools/calendar.js');
        const authConfig = getAuthConfig();
        const result = await scheduleMeeting(
          {
            title: args.title as string,
            description: args.description as string | undefined,
            duration: args.duration as number,
            attendees: args.attendees as string[],
            proposedTimes: (args.proposedTimes as Array<{ start: string; end: string }>).map(
              (slot) => ({
                start: new Date(slot.start),
                end: new Date(slot.end),
              })
            ),
            location: args.location as string | undefined,
          },
          authConfig
        );
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
      }

      if (name === 'list_upcoming_events') {
        const { listUpcomingEvents } = await import('./tools/calendar.js');
        const authConfig = getAuthConfig();
        const result = await listUpcomingEvents(
          new Date(args.startDate as string),
          args.endDate ? new Date(args.endDate as string) : undefined,
          (args.maxResults as number) || 10,
          authConfig
        );
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
      }

      if (name === 'find_available_slots') {
        const { findAvailableSlots } = await import('./tools/calendar.js');
        const authConfig = getAuthConfig();
        const result = await findAvailableSlots(
          {
            attendees: args.attendees as string[],
            windowStart: new Date(args.windowStart as string),
            windowEnd: new Date(args.windowEnd as string),
            duration: args.duration as number,
            count: args.count as number | undefined,
          },
          authConfig
        );
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
      }

      return {
        content: [
          {
            type: 'text',
            text: `Unknown tool: ${name}`,
          },
        ],
        isError: true,
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `Error executing tool ${name}: ${error.message}`,
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
