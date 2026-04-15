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
        // Drive Tools
        {
          name: 'list_templates',
          description: 'List document templates',
          inputSchema: {
            type: 'object',
            properties: {
              type: { type: 'string' },
            },
          },
        },
        {
          name: 'get_template',
          description: 'Get template by ID',
          inputSchema: {
            type: 'object',
            properties: {
              templateId: { type: 'string' },
            },
            required: ['templateId'],
          },
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
          inputSchema: {
            type: 'object',
            properties: {
              documentId: { type: 'string' },
            },
            required: ['documentId'],
          },
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
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              parentId: { type: 'string' },
            },
            required: ['name'],
          },
        },
        {
          name: 'list_drive_folder',
          description: 'List documents in a Drive folder',
          inputSchema: {
            type: 'object',
            properties: {
              folderId: { type: 'string' },
            },
            required: ['folderId'],
          },
        },
        {
          name: 'copy_drive_document',
          description: 'Copy a Drive document',
          inputSchema: {
            type: 'object',
            properties: {
              documentId: { type: 'string' },
              destinationFolderId: { type: 'string' },
              newTitle: { type: 'string' },
            },
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
          inputSchema: {
            type: 'object',
            properties: {
              documentId: { type: 'string' },
            },
            required: ['documentId'],
          },
        },
      ],
    };
  });

  // Handle call tool request
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
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
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: 'text', text: error.message || 'Unknown error' }],
      };
    }

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
