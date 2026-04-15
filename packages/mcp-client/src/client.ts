import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { Deal, DealInput, DealStage } from '@closepilot/core';

/**
 * Closepilot Deal Store MCP Client
 * Provides typed interface to interact with the Deal Store MCP server
 */
export class DealStoreClient {
  private client: Client;
  private transport: StdioClientTransport;
  private connected = false;

  constructor(serverCommand?: string) {
    this.client = new Client(
      {
        name: 'closepilot-mcp-client',
        version: '0.1.0',
      },
      {
        capabilities: {},
      }
    );

    // Default to stdio transport
    this.transport = new StdioClientTransport({
      command: serverCommand || 'node',
      args: ['dist/index.js'],
    });
  }

  /**
   * Connect to the MCP server
   */
  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    await this.client.connect(this.transport);
    this.connected = true;
  }

  /**
   * Disconnect from the MCP server
   */
  async disconnect(): Promise<void> {
    if (!this.connected) {
      return;
    }

    await this.client.close();
    this.connected = false;
  }

  /**
   * Check if client is connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * List all available tools from the MCP server
   */
  async listTools(): Promise<any[]> {
    if (!this.connected) {
      throw new Error('Client not connected. Call connect() first.');
    }

    const response = await this.client.listTools();
    return response.tools || [];
  }

  /**
   * Call a tool on the MCP server
   */
  async callTool(name: string, args: Record<string, unknown>): Promise<any> {
    if (!this.connected) {
      throw new Error('Client not connected. Call connect() first.');
    }

    const response = await this.client.callTool({
      name,
      arguments: args,
    });

    return response;
  }
}

/**
 * Factory function to create a connected DealStoreClient
 */
export async function createDealStoreClient(
  serverCommand?: string
): Promise<DealStoreClient> {
  const client = new DealStoreClient(serverCommand);
  await client.connect();
  return client;
}
