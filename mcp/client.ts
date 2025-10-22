/**
 * MCP Client Manager - Full implementation based on Claude Code
 * Connects to MCP servers and discovers available tools
 */

import { Tool } from '../core/tool.js';
import { MCPServerConfig, Config } from '../config/schema.js';
import { getConfig } from '../config/loader.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import {
  ListToolsResult,
  ListToolsResultSchema,
  ListResourcesResultSchema,
  ReadResourceResultSchema,
  Resource,
} from '@modelcontextprotocol/sdk/types.js';

type McpName = string;

interface ConnectedClient {
  client: Client;
  name: McpName;
  type: 'connected';
  config: MCPServerConfig;
}

interface FailedClient {
  name: McpName;
  type: 'failed';
  error: string;
}

type WrappedClient = ConnectedClient | FailedClient;

let connectedClients: WrappedClient[] | null = null;

/**
 * Connect to an MCP server via stdio or SSE
 */
async function connectToServer(
  name: McpName,
  serverConfig: MCPServerConfig
): Promise<Client> {
  const transport =
    serverConfig.type === 'sse'
      ? new SSEClientTransport(new URL(serverConfig.url))
      : new StdioClientTransport({
          command: serverConfig.command,
          args: serverConfig.args,
          env: {
            ...process.env,
            ...serverConfig.env,
          } as Record<string, string>,
          stderr: 'pipe',
        });

  const client = new Client(
    {
      name: 'ceregrep',
      version: '0.1.0',
    },
    {
      capabilities: {},
    }
  );

  // Add timeout to prevent hanging
  const CONNECTION_TIMEOUT_MS = 5000;
  const connectPromise = client.connect(transport);
  const timeoutPromise = new Promise<never>((_, reject) => {
    const timeoutId = setTimeout(() => {
      reject(
        new Error(
          `Connection to MCP server "${name}" timed out after ${CONNECTION_TIMEOUT_MS}ms`
        )
      );
    }, CONNECTION_TIMEOUT_MS);

    connectPromise.then(
      () => clearTimeout(timeoutId),
      () => clearTimeout(timeoutId)
    );
  });

  await Promise.race([connectPromise, timeoutPromise]);

  // Log stderr from server if stdio type
  if (serverConfig.type === 'stdio') {
    const stderrListener = (data: Buffer) => {
      const errorText = data.toString().trim();
      if (errorText) {
        console.error(`[MCP ${name}] ${errorText}`);
      }
    };
    (transport as StdioClientTransport).stderr?.on('data', stderrListener);
  }

  return client;
}

/**
 * Connect to all configured MCP servers
 */
export async function connectToAllServers(): Promise<WrappedClient[]> {
  if (connectedClients) {
    return connectedClients;
  }

  const config = await getConfig(process.cwd());
  const servers = config.mcpServers || {};

  connectedClients = await Promise.all(
    Object.entries(servers).map(async ([name, serverConfig]) => {
      try {
        const client = await connectToServer(name, serverConfig);
        return {
          name,
          client,
          type: 'connected' as const,
          config: serverConfig,
        };
      } catch (error) {
        return {
          name,
          type: 'failed' as const,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    })
  );

  return connectedClients;
}

/**
 * Disconnect all MCP servers and clear cache
 */
export async function disconnectAllServers(): Promise<void> {
  if (!connectedClients) return;

  await Promise.all(
    connectedClients.map(async (wrapped) => {
      if (wrapped.type === 'connected') {
        try {
          // Close with timeout to prevent hanging
          const closePromise = wrapped.client.close?.();
          if (closePromise) {
            await Promise.race([
              closePromise,
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Close timeout')), 2000)
              ),
            ]);
          }
        } catch (error) {
          if (process.env.DEBUG_MCP) {
            console.error(`Error closing ${wrapped.name}:`, error);
          }
        }
      }
    })
  );

  connectedClients = null;
}

/**
 * Get MCP tools from all connected servers
 */
export async function getMCPTools(): Promise<Tool[]> {
  const clients = await connectToAllServers();
  const tools: Tool[] = [];

  for (const wrapped of clients) {
    if (wrapped.type === 'failed') {
      if (process.env.DEBUG_MCP) {
        console.warn(`Skipping failed MCP server "${wrapped.name}": ${wrapped.error}`);
      }
      continue;
    }

    try {
      // Add timeout for tool listing to prevent hanging
      const toolListTimeoutMs = 10000; // 10 second timeout

      const getToolsPromise = (async () => {
        const capabilities = await wrapped.client.getServerCapabilities?.();
        if (!capabilities?.tools) {
          return [];
        }

        const response = await wrapped.client.request(
          { method: 'tools/list' },
          ListToolsResultSchema
        );

        return response.tools || [];
      })();

      const timeoutPromise = new Promise<never>((_, reject) => {
        const timeoutId = setTimeout(() => {
          reject(
            new Error(
              `Tool listing from MCP server "${wrapped.name}" timed out after ${toolListTimeoutMs}ms`
            )
          );
        }, toolListTimeoutMs);

        getToolsPromise.then(
          () => clearTimeout(timeoutId),
          () => clearTimeout(timeoutId)
        );
      });

      const serverTools = await Promise.race([getToolsPromise, timeoutPromise]);

      for (const tool of serverTools) {
        // Build a more explicit description with required parameters info
        const buildDescription = () => {
          let desc = tool.description ?? '';
          if (tool.inputSchema && typeof tool.inputSchema === 'object' && 'properties' in tool.inputSchema) {
            const schema = tool.inputSchema as any;
            const required = schema.required || [];
            if (required.length > 0) {
              desc += `\n\nRequired parameters: ${required.join(', ')}`;
            }
            if (schema.properties) {
              const params = Object.entries(schema.properties)
                .map(([key, value]: [string, any]) => `- ${key}: ${value.description || value.type}`)
                .join('\n');
              if (params) {
                desc += `\n\nParameters:\n${params}`;
              }
            }
          }
          return desc;
        };

        tools.push({
          name: `mcp__${wrapped.name}__${tool.name}`,
          async description() {
            return buildDescription();
          },
          async prompt() {
            return buildDescription();
          },
          inputJSONSchema: tool.inputSchema as any,
          userFacingName() {
            return `${wrapped.name}:${tool.name} (MCP)`;
          },
          isReadOnly: () => false,
          isEnabled: async () => true,
          call: async function* (input: Record<string, unknown>) {
            const MAX_RETRIES = 3;
            const RETRY_DELAY_MS = 1000;
            let lastError: Error | undefined;

            for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
              try {
                // Clean up query on retry attempts by truncating if it's too long
                let cleanedInput = input;
                if (attempt > 0 && input.query && typeof input.query === 'string') {
                  const query = input.query as string;
                  // On first retry, truncate to 1000 chars
                  // On second retry, truncate to 500 chars
                  const maxLength = attempt === 1 ? 1000 : 500;
                  if (query.length > maxLength) {
                    cleanedInput = {
                      ...input,
                      query: query.substring(0, maxLength) + '...\n\n[Query truncated due to previous error. Please try a shorter, more focused query.]'
                    };
                    if (process.env.DEBUG_MCP) {
                      console.warn(`[MCP ${wrapped.name}] Retry ${attempt}: Truncated query from ${query.length} to ${maxLength} chars`);
                    }
                  }
                }

                const result = await wrapped.client.callTool({
                  name: tool.name,
                  arguments: cleanedInput,
                });

                // Success - yield result
                yield {
                  type: 'result',
                  data: result,
                  resultForAssistant: formatMCPResult(result),
                };
                return; // Exit successfully
              } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                const errorMessage = lastError.message;

                // Check if it's a 400 error or similar request error
                const is400Error = errorMessage.includes('400') ||
                                   errorMessage.includes('Bad Request') ||
                                   errorMessage.includes('Invalid request');

                if (process.env.DEBUG_MCP) {
                  console.warn(
                    `[MCP ${wrapped.name}] Attempt ${attempt + 1}/${MAX_RETRIES} failed: ${errorMessage}`
                  );
                }

                // If this is the last attempt, throw the error
                if (attempt === MAX_RETRIES - 1) {
                  throw new Error(`Error calling MCP tool ${tool.name} after ${MAX_RETRIES} attempts: ${errorMessage}`);
                }

                // For 400 errors and request errors, retry with cleanup
                if (is400Error) {
                  if (process.env.DEBUG_MCP) {
                    console.warn(`[MCP ${wrapped.name}] Detected request error, will retry with cleaned up query...`);
                  }
                  // Wait before retry with exponential backoff
                  await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1)));
                } else {
                  // For other errors, just retry with a short delay
                  await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
                }
              }
            }

            // This should never be reached, but just in case
            throw new Error(`Error calling MCP tool ${tool.name}: ${lastError?.message || 'Unknown error'}`);
          },
          renderResultForAssistant: (data: any) => {
            if (typeof data === 'string') return data;
            if (Array.isArray(data)) {
              return data
                .map((item: any) => {
                  if (item.type === 'text') return item.text;
                  if (item.type === 'image') return '[Image]';
                  return JSON.stringify(item);
                })
                .join('\n');
            }
            return JSON.stringify(data, null, 2);
          },
        });
      }
    } catch (error) {
      console.warn(
        `Failed to get tools from MCP server "${wrapped.name}":`,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  return tools;
}

/**
 * Format MCP tool results for display
 */
function formatMCPResult(result: any): string {
  if (!result) return '';

  // Handle toolResult response
  if ('toolResult' in result && result.toolResult) {
    return String(result.toolResult);
  }

  // Handle content array response
  if (Array.isArray(result?.content)) {
    return result.content
      .map((item: any) => {
        if (item.type === 'text') return item.text;
        if (item.type === 'image') return '[Image]';
        return JSON.stringify(item);
      })
      .join('\n');
  }

  // Handle error response
  if (result.isError) {
    return `Error: ${result.error || 'Unknown error'}`;
  }

  return JSON.stringify(result);
}

/**
 * Get MCP resources from all connected servers
 */
export async function getMCPResources(): Promise<Array<Resource & { serverName: string }>> {
  const clients = await connectToAllServers();
  const resources: Array<Resource & { serverName: string }> = [];

  for (const wrapped of clients) {
    if (wrapped.type === 'failed') {
      if (process.env.DEBUG_MCP) {
        console.warn(`Skipping failed MCP server "${wrapped.name}": ${wrapped.error}`);
      }
      continue;
    }

    try {
      const capabilities = await wrapped.client.getServerCapabilities?.();
      if (!capabilities?.resources) {
        continue;
      }

      const response = await wrapped.client.request(
        { method: 'resources/list' },
        ListResourcesResultSchema
      );

      const serverResources = response.resources || [];
      for (const resource of serverResources) {
        resources.push({
          ...resource,
          serverName: wrapped.name,
        });
      }
    } catch (error) {
      if (process.env.DEBUG_MCP) {
        console.warn(
          `Failed to get resources from MCP server "${wrapped.name}":`,
          error instanceof Error ? error.message : String(error)
        );
      }
    }
  }

  return resources;
}

/**
 * Read a specific MCP resource
 */
export async function readMCPResource(
  serverName: string,
  uri: string
): Promise<{ content: string; mimeType?: string }> {
  const clients = await connectToAllServers();
  const wrapped = clients.find((c) => c.name === serverName && c.type === 'connected');

  if (!wrapped || wrapped.type !== 'connected') {
    throw new Error(`MCP server "${serverName}" is not connected`);
  }

  try {
    const response = await wrapped.client.request(
      { method: 'resources/read', params: { uri } },
      ReadResourceResultSchema
    );

    // Extract text content from the response
    const textContent = response.contents
      .filter((c: any) => c.type === 'text')
      .map((c: any) => c.text)
      .join('\n');

    return {
      content: textContent,
      mimeType: response.contents[0]?.mimeType,
    };
  } catch (error) {
    throw new Error(
      `Failed to read resource "${uri}" from server "${serverName}": ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * List all available MCP servers
 */
export async function listMCPServers(): Promise<
  Array<{ name: string; config: MCPServerConfig; status: 'connected' | 'failed'; error?: string }>
> {
  const config = await getConfig(process.cwd());
  const servers = config.mcpServers || {};
  const clients = await connectToAllServers();

  return Object.entries(servers).map(([name, serverConfig]) => {
    const wrapped = clients.find((c) => c.name === name);
    if (wrapped?.type === 'connected') {
      return { name, config: serverConfig, status: 'connected' };
    } else if (wrapped?.type === 'failed') {
      return { name, config: serverConfig, status: 'failed', error: wrapped.error };
    }
    return { name, config: serverConfig, status: 'failed', error: 'Not connected' };
  });
}

/**
 * Get status of a specific MCP server
 */
export async function getMCPServerStatus(name: McpName): Promise<'connected' | 'failed'> {
  const clients = await connectToAllServers();
  const wrapped = clients.find((c) => c.name === name);
  return wrapped?.type === 'connected' ? 'connected' : 'failed';
}

/**
 * Test connection to an MCP server
 */
export async function testMCPServer(name: McpName, serverConfig: MCPServerConfig): Promise<{
  success: boolean;
  message: string;
  toolCount?: number;
}> {
  try {
    const client = await connectToServer(name, serverConfig);
    const capabilities = await client.getServerCapabilities?.();

    if (!capabilities?.tools) {
      await client.close?.();
      return {
        success: true,
        message: 'Connected successfully (no tools capability)',
      };
    }

    const response = await client.request(
      { method: 'tools/list' },
      ListToolsResultSchema
    );

    const toolCount = response.tools?.length || 0;
    await client.close?.();

    return {
      success: true,
      message: `Connected successfully. Found ${toolCount} tools.`,
      toolCount,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}
