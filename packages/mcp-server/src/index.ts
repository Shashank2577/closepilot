#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { registerDealStoreTools } from './tools/deal-store.js';
import { registerGmailTools, gmailToolHandlers } from './tools/gmail.js';
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
        // Gmail tools
        {
          name: 'search_emails',
          description: 'Search emails in Gmail',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string' },
              from: { type: 'string' },
              to: { type: 'string' },
              subject: { type: 'string' },
              hasAttachment: { type: 'boolean' },
              label: { type: 'string' },
              after: { type: 'string' },
              before: { type: 'string' },
            },
          },
        },
        {
          name: 'get_thread',
          description: 'Get an email thread by ID',
          inputSchema: {
            type: 'object',
            properties: {
              threadId: { type: 'string' },
            },
            required: ['threadId'],
          },
        },
        {
          name: 'get_message',
          description: 'Get an email message by ID',
          inputSchema: {
            type: 'object',
            properties: {
              messageId: { type: 'string' },
            },
            required: ['messageId'],
          },
        },
        {
          name: 'send_email',
          description: 'Send an email',
          inputSchema: {
            type: 'object',
            properties: {
              to: { type: 'array', items: { type: 'string' } },
              subject: { type: 'string' },
              body: { type: 'string' },
              cc: { type: 'array', items: { type: 'string' } },
              threadId: { type: 'string' },
            },
            required: ['to', 'subject', 'body'],
          },
        },
        {
          name: 'extract_email_context',
          description: 'Extract context from an email using AI',
          inputSchema: {
            type: 'object',
            properties: {
              messageId: { type: 'string' },
            },
            required: ['messageId'],
          },
        },
        {
          name: 'get_recent_threads',
          description: 'Get recent email threads',
          inputSchema: {
            type: 'object',
            properties: {
              limit: { type: 'number' },
              pageToken: { type: 'string' },
            },
          },
        },
        {
          name: 'watch_emails',
          description: 'Watch emails (push notifications)',
          inputSchema: {
            type: 'object',
            properties: {
              topic: { type: 'string' },
            },
            required: ['topic'],
          },
        },
        {
          name: 'stop_watching',
          description: 'Stop watching emails',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        // Add more tool definitions...
      ],
    };
  });

  // Handle call tool request
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      if (gmailToolHandlers[name]) {
        // We'll map the after/before strings back to dates if present
        const parsedArgs = { ...args };
        if (parsedArgs && typeof parsedArgs === 'object') {
          if ('after' in parsedArgs && typeof parsedArgs.after === 'string') {
            parsedArgs.after = new Date(parsedArgs.after);
          }
          if ('before' in parsedArgs && typeof parsedArgs.before === 'string') {
            parsedArgs.before = new Date(parsedArgs.before);
          }
        }

        const result = await gmailToolHandlers[name](parsedArgs);
        return {
          content: [
            {
              type: 'text',
              text: typeof result === 'object' ? JSON.stringify(result) : String(result),
            },
          ],
        };
      }

      // Fallback for not implemented tools
      return {
        content: [
          {
            type: 'text',
            text: `Tool ${name} not yet implemented`,
          },
        ],
      };
    } catch (error: any) {
      console.error(`Error calling tool ${name}:`, error);
      return {
        content: [
          {
            type: 'text',
            text: `Error calling tool ${name}: ${error.message}`,
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
