#!/usr/bin/env node
/**
 * Scout MCP Bridge Server
 *
 * PERFORMANCE OPTIMIZATION:
 * This bridge eliminates subprocess overhead by keeping Scout's SDK loaded in memory
 * and accepting JSON-RPC requests via stdin/stdout. This is ~10-100x faster than
 * spawning a new process for each query.
 *
 * ARCHITECTURE:
 * - Runs as a persistent Node.js process
 * - Imports Scout's TypeScript SDK directly (no CLI overhead)
 * - Communicates via JSON-RPC over stdin/stdout
 * - Handles queries, agent invocations, and agent listing
 *
 * PROTOCOL:
 * Request:  {"id": 1, "method": "query"|"agent.invoke"|"agent.list", "params": {...}}
 * Response: {"id": 1, "result": {...}} OR {"id": 1, "error": {...}}
 */

import { createInterface } from 'readline';
import { CeregrepClient as ScoutClient } from 'swarm-scout/sdk';
import { getTools, getConfig } from 'swarm-scout';
// Use relative imports for non-exported modules (bridge is in Scout repo)
// Path: mcp-server/scout_mcp/bridge/ -> scout/ (3 levels up)
import { getAgent, listAgents } from '../../../dist/agents/index.js';
import { createAgentClientConfig } from '../../../dist/agents/config-merger.js';

// Global Scout client instance (initialized lazily)
let scoutClient = null;

/**
 * Initialize Scout client with default tools
 * OPTIMIZATION: Client is initialized once and reused for all queries
 */
async function getScoutClient() {
  if (!scoutClient) {
    scoutClient = new ScoutClient();
    await scoutClient.initialize();
  }
  return scoutClient;
}

/**
 * Handle query request
 * @param {Object} params - {query: string, cwd?: string, model?: string, verbose?: boolean, timeout?: number}
 */
async function handleQuery(params) {
  const { query, cwd, model, verbose, timeout } = params;

  if (!query) {
    throw new Error('query parameter is required');
  }

  // Change working directory if specified
  const originalCwd = process.cwd();
  if (cwd) {
    process.chdir(cwd);
  }

  try {
    // Get Scout client
    const client = await getScoutClient();

    // Set model if specified
    if (model) {
      client.setModel(model);
    }

    // Execute query with timeout
    const timeoutMs = timeout ? timeout * 1000 : 300000; // Default 5 minutes
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), timeoutMs);

    try {
      // Collect all messages
      const messages = [];
      for await (const message of client.queryStream([], query, {
        verbose: verbose || false,
        abortController,
        dangerouslySkipPermissions: true,
      })) {
        messages.push(message);
      }

      clearTimeout(timeoutId);

      // Extract final text response from assistant messages
      let output = '';
      for (const message of messages) {
        if (message.type === 'assistant') {
          const content = message.message.content;
          if (Array.isArray(content)) {
            for (const block of content) {
              if (block.type === 'text') {
                output += block.text + '\n';
              }
            }
          } else if (typeof content === 'string') {
            output += content + '\n';
          }
        }
      }

      return {
        output: output.trim(),
        messages, // Include full message history for debugging
      };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error(`Scout query timed out after ${timeout}s`);
      }
      throw error;
    }
  } finally {
    // Restore original working directory
    if (cwd) {
      process.chdir(originalCwd);
    }
  }
}

/**
 * Handle agent invoke request
 * @param {Object} params - {agentId: string, prompt: string, cwd?: string, model?: string, verbose?: boolean}
 */
async function handleAgentInvoke(params) {
  const { agentId, prompt, cwd, model, verbose } = params;

  if (!agentId || !prompt) {
    throw new Error('agentId and prompt parameters are required');
  }

  // Change working directory if specified
  const originalCwd = process.cwd();
  if (cwd) {
    process.chdir(cwd);
  }

  try {
    // Load agent config
    const agent = await getAgent(agentId);
    if (!agent) {
      throw new Error(`Agent "${agentId}" not found`);
    }

    // Load tools and config
    const tools = await getTools(true);
    const baseConfig = getConfig();

    // Merge agent config with base config
    const clientConfig = createAgentClientConfig(
      baseConfig,
      agent.config,
      tools
    );

    // Apply overrides
    if (model) clientConfig.model = model;
    if (verbose) clientConfig.verbose = true;
    clientConfig.dangerouslySkipPermissions = true;

    // Create client with agent config
    const client = new ScoutClient(clientConfig);
    await client.initialize();

    // Collect all messages
    const messages = [];
    for await (const message of client.queryStream([], prompt, clientConfig)) {
      messages.push(message);
    }

    // Extract final text response from assistant messages
    let output = '';
    for (const message of messages) {
      if (message.type === 'assistant') {
        const content = message.message.content;
        if (Array.isArray(content)) {
          for (const block of content) {
            if (block.type === 'text') {
              output += block.text + '\n';
            }
          }
        } else if (typeof content === 'string') {
          output += content + '\n';
        }
      }
    }

    return {
      output: output.trim(),
      messages, // Include full message history for debugging
    };
  } finally {
    // Restore original working directory
    if (cwd) {
      process.chdir(originalCwd);
    }
  }
}

/**
 * Handle agent list request
 * @param {Object} params - {cwd?: string}
 */
async function handleAgentList(params) {
  const { cwd } = params || {};

  // Change working directory if specified
  const originalCwd = process.cwd();
  if (cwd) {
    process.chdir(cwd);
  }

  try {
    const agents = await listAgents();

    // Combine global and project agents with metadata
    const result = {
      global: agents.global.map(a => ({
        id: a.id,
        name: a.name,
        description: a.description,
      })),
      project: agents.project.map(a => ({
        id: a.id,
        name: a.name,
        description: a.description,
      })),
    };

    return result;
  } finally {
    // Restore original working directory
    if (cwd) {
      process.chdir(originalCwd);
    }
  }
}

/**
 * Process JSON-RPC request
 */
async function processRequest(request) {
  const { id, method, params } = request;

  try {
    let result;

    switch (method) {
      case 'query':
        result = await handleQuery(params);
        break;

      case 'agent.invoke':
        result = await handleAgentInvoke(params);
        break;

      case 'agent.list':
        result = await handleAgentList(params);
        break;

      case 'ping':
        result = { status: 'ok' };
        break;

      default:
        throw new Error(`Unknown method: ${method}`);
    }

    return { id, result };
  } catch (error) {
    return {
      id,
      error: {
        message: error.message,
        stack: error.stack,
      },
    };
  }
}

/**
 * Main bridge server loop
 */
async function main() {
  // Write ready signal to stderr (stdout is for JSON-RPC)
  console.error('[Scout Bridge] Ready - accepting JSON-RPC requests on stdin');

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  rl.on('line', async (line) => {
    try {
      const request = JSON.parse(line);
      const response = await processRequest(request);
      // Write response to stdout (one line per response)
      console.log(JSON.stringify(response));
    } catch (error) {
      // Invalid JSON or processing error
      console.log(JSON.stringify({
        id: null,
        error: {
          message: `Bridge error: ${error.message}`,
          stack: error.stack,
        },
      }));
    }
  });

  // Handle graceful shutdown
  process.on('SIGTERM', () => {
    console.error('[Scout Bridge] Shutting down gracefully...');
    rl.close();
    process.exit(0);
  });

  process.on('SIGINT', () => {
    console.error('[Scout Bridge] Interrupted - shutting down...');
    rl.close();
    process.exit(0);
  });
}

// Start the bridge server
main().catch((error) => {
  console.error('[Scout Bridge] Fatal error:', error);
  process.exit(1);
});
