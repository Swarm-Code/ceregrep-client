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
      name: 'scout',
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
  // Always reconnect to get fresh server configuration (don't use cache)
  // This ensures we pick up config changes without restarting
  await disconnectAllServers();

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

        let lastInputForRender: Record<string, unknown> | undefined;

        tools.push({
          name: `mcp__${wrapped.name}__${tool.name}`,
          server: wrapped.name,
          serverName: wrapped.name,
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

                lastInputForRender = cleanedInput;

                const result = await wrapped.client.callTool({
                  name: tool.name,
                  arguments: cleanedInput,
                });

        // Success - yield result
                yield {
                  type: 'result',
                  data: result,
                  resultForAssistant: formatMCPResult(result, {
                    toolName: tool.name,
                    serverName: wrapped.name,
                    input: cleanedInput,
                  }),
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
            return formatMCPResult(data, {
              toolName: tool.name,
              serverName: wrapped.name,
              input: lastInputForRender,
            });
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
function formatMCPResult(
  result: any,
  context: { toolName?: string; serverName?: string; input?: Record<string, unknown> } = {}
): string {
  const wantsRaw = shouldUseRawMode(context.input);

  if (context.toolName === 'directory_tree' && !wantsRaw) {
    const summary = summarizeDirectoryTree(result, context);
    if (summary) {
      return summary;
    }
  }

  return formatResultDefault(result, { truncate: !wantsRaw });
}

type DirectoryTreeNode = {
  name: string;
  type: 'file' | 'directory';
  children?: DirectoryTreeNode[];
};

function summarizeDirectoryTree(
  result: any,
  context: { toolName?: string; serverName?: string; input?: Record<string, unknown> }
): string | null {
  const rawText = extractFirstTextContent(result);
  if (!rawText) return null;

  try {
    const root = JSON.parse(rawText) as DirectoryTreeNode;
    if (!root || typeof root !== 'object') {
      return null;
    }

    const topLevel = Array.isArray(root.children) ? root.children : [];

    const statsCache = new WeakMap<DirectoryTreeNode, DirectoryStats>();
    const getStats = (node: DirectoryTreeNode | undefined): DirectoryStats => {
      if (!node) {
        return { directories: 0, files: 0, maxDepth: 0 };
      }
      const cached = statsCache.get(node);
      if (cached) return cached;

      const isDirectory = node.type === 'directory';
      let directories = isDirectory ? 1 : 0;
      let files = node.type === 'file' ? 1 : 0;
      let maxDepth = 1;

      if (isDirectory && Array.isArray(node.children)) {
        let childMaxDepth = 0;
        for (const child of node.children) {
          const childStats = getStats(child);
          directories += childStats.directories;
          files += childStats.files;
          childMaxDepth = Math.max(childMaxDepth, childStats.maxDepth);
        }
        maxDepth = 1 + childMaxDepth;
      }

      const computed: DirectoryStats = { directories, files, maxDepth };
      statsCache.set(node, computed);
      return computed;
    };

    const totals = getStats(root);
    const rootIsDirectory = root.type === 'directory' ? 1 : 0;
    const totalDirectories = Math.max(totals.directories - rootIsDirectory, 0);
    const totalFiles = totals.files;

    const budget = computeSummaryBudget(rawText.length);
    const reserveForNotes = 200;
    const workingBudget = Math.max(0, budget - reserveForNotes);
    const approxTokens = Math.max(1, Math.round(budget / 4));

    const lines: string[] = [];
    let charCount = 0;
    let truncated = false;

    const tryAddLine = (line: string): boolean => {
      const nextCount = charCount + line.length + 1;
      if (nextCount > workingBudget) {
        truncated = true;
        return false;
      }
      lines.push(line);
      charCount = nextCount;
      return true;
    };

    const addLine = (line: string): boolean => {
      const added = tryAddLine(line);
      return added;
    };

    addLine('📁 Directory tree summary (auto-condensed)');
    addLine(
      context.serverName
        ? `Server: ${context.serverName}, tool: ${context.toolName}`
        : `Tool: ${context.toolName}`
    );
    addLine(
      `Total directories: ${totalDirectories.toLocaleString()} • Total files: ${totalFiles.toLocaleString()} • Estimated tree depth: ${Math.max(
        0,
        totals.maxDepth - 1
      )}`
    );

    const directoryEntries = topLevel
      .filter((child): child is DirectoryTreeNode => !!child && child.type === 'directory')
      .map((child) => {
        const childStats = getStats(child);
        const totalEntries = Math.max(childStats.directories - 1, 0) + childStats.files;
        return {
          node: child,
          stats: childStats,
          totalEntries,
        };
      })
      .sort((a, b) => b.totalEntries - a.totalEntries);

    const fileEntries = topLevel
      .filter((child): child is DirectoryTreeNode => !!child && child.type === 'file')
      .map((child) => child.name);

    if (directoryEntries.length > 0) {
      addLine(
        `Top-level directories (${directoryEntries.length.toLocaleString()} total, sorted by size):`
      );

      const detailScale =
        (budget - MIN_SUMMARY_CHAR_BUDGET) / (MAX_SUMMARY_CHAR_BUDGET - MIN_SUMMARY_CHAR_BUDGET);
      const normalizedScale = Math.max(0, Math.min(1, detailScale));
      const maxChildSamples = Math.max(1, Math.min(5, Math.round(normalizedScale * 4) + 1));
      const maxFileSamples = Math.max(1, Math.min(4, Math.round(normalizedScale * 3) + 1));

      for (const entry of directoryEntries) {
        if (
          !addLine(
            `  - ${entry.node.name}/ — subdirectories: ${Math.max(
              entry.stats.directories - 1,
              0
            ).toLocaleString()}, files: ${entry.stats.files.toLocaleString()}, depth: ${
              entry.stats.maxDepth - 1
            }`
          )
        ) {
          break;
        }

        if (!Array.isArray(entry.node.children) || !entry.node.children.length) {
          continue;
        }

        const childDirectories = entry.node.children
          .filter((child): child is DirectoryTreeNode => child.type === 'directory')
          .map((child) => ({
            node: child,
            stats: getStats(child),
          }))
          .sort((a, b) => {
            const aTotal = Math.max(a.stats.directories - 1, 0) + a.stats.files;
            const bTotal = Math.max(b.stats.directories - 1, 0) + b.stats.files;
            return bTotal - aTotal;
          })
          .slice(0, maxChildSamples);

        for (const child of childDirectories) {
          if (
            !addLine(
              `    • ${child.node.name}/ — subdirs: ${Math.max(
                child.stats.directories - 1,
                0
              ).toLocaleString()}, files: ${child.stats.files.toLocaleString()}, depth: ${
                child.stats.maxDepth - 1
              }`
            )
          ) {
            break;
          }
        }

        if (truncated) break;

        const childFiles = entry.node.children
          .filter((child): child is DirectoryTreeNode => child.type === 'file')
          .slice(0, maxFileSamples);

        if (childFiles.length > 0 && !truncated) {
          const fileLine = `    • files: ${childFiles
            .map((file) => file.name)
            .join(', ')}${entry.node.children.filter((child) => child.type === 'file').length > childFiles.length
            ? ' …'
            : ''}`;
          if (!addLine(fileLine)) {
            break;
          }
        }

        if (truncated) break;
      }
    }

    if (!truncated && fileEntries.length > 0) {
      const topFileSampleLimit = Math.max(
        5,
        Math.min(20, Math.round(approxTokens / 500))
      );
      addLine(
        `Top-level files (${fileEntries.length.toLocaleString()} total): ${fileEntries
          .slice(0, topFileSampleLimit)
          .join(', ')}${fileEntries.length > topFileSampleLimit ? ' …' : ''}`
      );
    }

    if (!truncated) {
      const suggestedTargets = directoryEntries.slice(0, Math.min(3, directoryEntries.length));
      if (suggestedTargets.length > 0) {
        addLine('');
        addLine('Suggested follow-ups:');
        for (const target of suggestedTargets) {
          const depthHint = Math.min(Math.max(target.stats.maxDepth - 1, 1), 4);
          const hint = `  - Narrow scan: directory_tree { "path": "${target.node.name}", "max_depth": ${depthHint} }`;
          if (!addLine(hint)) {
            break;
          }
        }
      }
    }

    if (!truncated) {
      const depthHint = Math.min(Math.max(totals.maxDepth - 1, 1), 5);
      addLine('');
      addLine(
        `Full tree omitted to stay within ~${approxTokens.toLocaleString()} tokens (~${budget.toLocaleString()} characters).`
      );
      addLine(
        `Tip: provide {"max_depth": ${depthHint}} or target specific directories for deeper dives.`
      );
    } else {
      addFinalNote(lines, budget, charCount, approxTokens);
    }

    return lines.join('\n');
  } catch (error) {
    if (process.env.DEBUG_MCP) {
      console.warn(
        '[MCP] Failed to summarize directory_tree output:',
        error instanceof Error ? error.message : String(error)
      );
    }
    return null;
  }
}

const MIN_SUMMARY_CHAR_BUDGET = 4000;
const MAX_SUMMARY_CHAR_BUDGET = 40000;
const SUMMARY_RATIO = 0.06;

function computeSummaryBudget(rawLength: number): number {
  const scaled = Math.floor(rawLength * SUMMARY_RATIO);
  return Math.max(MIN_SUMMARY_CHAR_BUDGET, Math.min(MAX_SUMMARY_CHAR_BUDGET, scaled));
}

function addFinalNote(
  lines: string[],
  budget: number,
  currentLength: number,
  approxTokens: number
) {
  const noteLines = [
    `… Additional entries omitted automatically to stay within ~${approxTokens.toLocaleString()} tokens.`,
    'Tip: provide {"max_depth": <n>} or narrow the `path` to inspect specific subtrees.',
  ];

  for (const note of noteLines) {
    while (currentLength + note.length + 1 > budget && lines.length > 0) {
      const removed = lines.pop();
      if (!removed) break;
      currentLength -= removed.length + 1;
    }

    if (currentLength + note.length + 1 <= budget) {
      lines.push(note);
      currentLength += note.length + 1;
    }
  }
}

function formatResultDefault(
  result: any,
  options: { truncate?: boolean } = {}
): string {
  const { truncate = true } = options;

  if (!result) return '';

  if ('toolResult' in result && result.toolResult) {
    return String(result.toolResult);
  }

  if (Array.isArray(result?.content)) {
    return result.content
      .map((item: any) => {
        if (item.type === 'text') return item.text;
        if (item.type === 'image') return '[Image]';
        return JSON.stringify(item);
      })
      .join('\n');
  }

  if (result.isError) {
    return `Error: ${result.error || 'Unknown error'}`;
  }

  const serialized = JSON.stringify(result);
  const MAX_LENGTH = 20000;
  if (truncate && serialized.length > MAX_LENGTH) {
    return (
      serialized.slice(0, MAX_LENGTH) +
      `\n\n[Output truncated to ${MAX_LENGTH.toLocaleString()} characters. ` +
      `Original length was ${serialized.length.toLocaleString()} characters. ` +
      `Consider requesting a narrower result if more detail is required.]`
    );
  }

  return serialized;
}

function extractFirstTextContent(result: any): string | null {
  if (!result) return null;

  if (typeof result === 'string') {
    return result;
  }

  if (typeof result.toolResult === 'string') {
    return result.toolResult;
  }

  if (Array.isArray(result?.content)) {
    for (const item of result.content) {
      if (item && item.type === 'text' && typeof item.text === 'string') {
        return item.text;
      }
    }
  }

  return null;
}

type DirectoryStats = {
  directories: number;
  files: number;
  maxDepth: number;
};

function shouldUseRawMode(input?: Record<string, unknown>): boolean {
  if (!input) return false;
  const mode = (input as Record<string, unknown> & { mode?: unknown }).mode;
  if (typeof mode === 'string' && mode.toLowerCase() === 'raw') {
    return true;
  }

  const rawFlag = (input as Record<string, unknown> & { raw?: unknown }).raw;
  if (rawFlag === true || rawFlag === 'true') {
    return true;
  }

  return false;
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
