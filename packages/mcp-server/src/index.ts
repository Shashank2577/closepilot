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
        // Add more tool definitions...
      ],
    };
  });

  // Handle call tool request
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    // Tool handlers are registered separately, this just routes to them
    // The actual implementation is in the tool registration files

    return {
      content: [
        {
          type: 'text',
          text: `Tool ${name} not yet implemented`,
        },
      ],
    };
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
