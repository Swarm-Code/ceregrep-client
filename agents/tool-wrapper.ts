/**
 * Agent-as-Tool Wrapper
 * Exposes ceregrep agents as invocable tools that can be called by other agents
 */

import { Tool, ToolContext } from '../core/tool.js';
import { listAgents, getAgent } from './manager.js';
import { createAgentClientConfig } from './config-merger.js';
import { getConfig } from '../config/loader.js';
import { CeregrepClient } from '../sdk/typescript/index.js';
import { extractTextContent } from '../core/messages.js';
import { z } from 'zod';
import zodToJsonSchema from 'zod-to-json-schema';

/**
 * Input schema for agent tools
 */
const AgentToolInputSchema = z.object({
  prompt: z.string().describe('The prompt/query to send to the agent'),
});

/**
 * Create a tool wrapper for a specific agent
 */
function createAgentTool(agentId: string, agentName: string, agentDescription: string): Tool {
  return {
    name: `agent__${agentId}`,

    description: async () => {
      return `Invoke the "${agentName}" agent - ${agentDescription}\n\nThis agent is a specialized AI assistant that can be invoked with a prompt. Use this when you need expertise in the agent's domain.`;
    },

    inputJSONSchema: zodToJsonSchema(AgentToolInputSchema, 'AgentToolInput') as any,

    userFacingName: () => `${agentName} (Agent)`,

    isReadOnly: () => false,

    isEnabled: async () => true,

    needsPermissions: () => true,

    async *call(input: any, context: ToolContext) {
      const { prompt } = input as z.infer<typeof AgentToolInputSchema>;

      try {
        // Load agent configuration
        const agent = await getAgent(agentId);
        if (!agent) {
          yield {
            type: 'result',
            data: { error: `Agent "${agentId}" not found` },
            resultForAssistant: `Error: Agent "${agentId}" not found. The agent may have been deleted or moved.`,
          };
          return;
        }

        // Get available tools (excluding agent tools to prevent recursion)
        const allTools = context.tools || [];
        const nonAgentTools = allTools.filter(t => !t.name.startsWith('agent__'));

        // Load base config
        const baseConfig = getConfig();

        // Merge agent config with base config
        const clientConfig = createAgentClientConfig(
          baseConfig,
          agent.config,
          nonAgentTools
        );

        // Add context options
        clientConfig.verbose = context.verbose || false;
        clientConfig.debug = context.debug || false;

        // Create client with agent configuration
        const client = new CeregrepClient(clientConfig);

        // Execute agent query with empty history (agents start fresh)
        const result = await client.query([], prompt, clientConfig);

        // Extract text content from messages
        const responseTexts: string[] = [];
        for (const message of result.messages) {
          if (message.type === 'assistant') {
            const text = extractTextContent(message);
            if (text) {
              responseTexts.push(text);
            }
          }
        }

        const response = responseTexts.join('\n\n');

        // Return result
        yield {
          type: 'result',
          data: {
            agentId,
            agentName,
            prompt,
            response,
            messageCount: result.messages.length,
          },
          resultForAssistant: `Agent "${agentName}" response:\n\n${response}`,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        yield {
          type: 'result',
          data: { error: errorMessage },
          resultForAssistant: `Error invoking agent "${agentName}": ${errorMessage}`,
        };
      }
    },

    renderResultForAssistant: (data: any) => {
      if (data.error) {
        return `Error: ${data.error}`;
      }
      if (data.response) {
        return data.response;
      }
      return JSON.stringify(data);
    },
  };
}

/**
 * Get all agent tools
 * Creates tool wrappers for all available agents (global + project)
 */
export async function getAgentTools(): Promise<Tool[]> {
  try {
    const agents = await listAgents();
    const allAgents = [...agents.global, ...agents.project];

    // Create tool wrapper for each agent
    const agentTools = allAgents.map(agent =>
      createAgentTool(agent.id, agent.name, agent.description)
    );

    return agentTools;
  } catch (error) {
    console.warn('Failed to load agent tools:', error instanceof Error ? error.message : String(error));
    return [];
  }
}

/**
 * Check if a tool is an agent tool
 */
export function isAgentTool(toolName: string): boolean {
  return toolName.startsWith('agent__');
}

/**
 * Get agent ID from agent tool name
 */
export function getAgentIdFromToolName(toolName: string): string | null {
  if (!isAgentTool(toolName)) {
    return null;
  }
  return toolName.replace('agent__', '');
}
