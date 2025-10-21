/**
 * Main TUI App Component
 * Claude Code replacement interface
 */

import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { MessageList } from './MessageList.js';
import { InputBox } from './InputBox.js';
import { StatusBar } from './StatusBar.js';
import { ConversationList } from './ConversationList.js';
import { AgentSelector } from './AgentSelector.js';
import { CeregrepClient } from '../../sdk/typescript/index.js';
import { Message, createUserMessage } from '../../core/messages.js';
import { getConfig } from '../../config/loader.js';
import { getTools } from '../../tools/index.js';
import { createAgentClientConfig } from '../../agents/config-merger.js';
import { getAgent, listAgents } from '../../agents/index.js';
import {
  Conversation,
  createConversation,
  saveConversation,
  loadConversation,
  listConversations,
  addCheckpoint,
  restoreToCheckpoint,
} from '../conversation-storage.js';

type View = 'chat' | 'conversations' | 'agents';

interface AppProps {
  initialConversationId?: string;
  initialAgentId?: string;
}

export const App: React.FC<AppProps> = ({ initialConversationId, initialAgentId }) => {
  const { exit } = useApp();
  const [view, setView] = useState<View>('chat');
  const [conversation, setConversation] = useState<Conversation>(
    createConversation('New Conversation', initialAgentId)
  );
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agentId, setAgentId] = useState<string | undefined>(initialAgentId);
  const [showHelp, setShowHelp] = useState(false);

  // Load initial conversation if provided
  useEffect(() => {
    if (initialConversationId) {
      loadConversation(initialConversationId).then(conv => {
        if (conv) {
          setConversation(conv);
          setAgentId(conv.agentId);
        }
      });
    }
  }, [initialConversationId]);

  // Handle keyboard shortcuts
  useInput((input, key) => {
    // Ctrl+C to exit
    if (key.ctrl && input === 'c') {
      exit();
    }

    // Ctrl+L to toggle conversations list
    if (key.ctrl && input === 'l') {
      setView(view === 'conversations' ? 'chat' : 'conversations');
    }

    // Ctrl+A to toggle agent selector
    if (key.ctrl && input === 'a') {
      setView(view === 'agents' ? 'chat' : 'agents');
    }

    // Ctrl+H to toggle help
    if (key.ctrl && input === 'h') {
      setShowHelp(!showHelp);
    }
  });

  /**
   * Handle user message submission
   */
  const handleSubmit = async (input: string) => {
    // Handle commands
    if (input.startsWith('/')) {
      await handleCommand(input);
      return;
    }

    // Add user message to conversation
    const userMessage = createUserMessage(input);

    const updatedConversation = {
      ...conversation,
      messages: [...conversation.messages, userMessage],
    };
    setConversation(updatedConversation);

    // Save conversation
    await saveConversation(updatedConversation);

    // Start streaming
    setIsStreaming(true);
    setError(null);

    try {
      // Load config and tools
      const baseConfig = getConfig();
      const tools = await getTools(true);

      let clientConfig: any;

      // If agent is selected, use agent config
      if (agentId) {
        const agent = await getAgent(agentId);
        if (agent) {
          clientConfig = createAgentClientConfig(baseConfig, agent.config, tools);
        } else {
          clientConfig = baseConfig;
        }
      } else {
        clientConfig = baseConfig;
      }

      // Create client
      const client = new CeregrepClient(clientConfig);

      // Stream response (the client will maintain history internally)
      const assistantMessages: Message[] = [];

      for await (const message of client.queryStream(input, clientConfig)) {
        assistantMessages.push(message);

        // Update conversation with streaming messages
        setConversation(prev => ({
          ...prev,
          messages: [...updatedConversation.messages, ...assistantMessages],
        }));
      }

      // Save final conversation
      const finalConversation = {
        ...updatedConversation,
        messages: [...updatedConversation.messages, ...assistantMessages],
      };

      setConversation(finalConversation);
      await saveConversation(finalConversation);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsStreaming(false);
    }
  };

  /**
   * Handle TUI commands
   */
  const handleCommand = async (input: string) => {
    const parts = input.split(' ');
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    switch (command) {
      case '/new':
        // Create new conversation
        const newConv = createConversation(args.join(' ') || 'New Conversation', agentId);
        setConversation(newConv);
        await saveConversation(newConv);
        break;

      case '/agent':
        // Switch agent
        if (args.length === 0) {
          setView('agents');
        } else {
          setAgentId(args[0]);
          setConversation(prev => ({ ...prev, agentId: args[0] }));
        }
        break;

      case '/checkpoint':
        // Create checkpoint
        const checkpoint = addCheckpoint(conversation, args.join(' '));
        await saveConversation(conversation);
        setError(`Checkpoint created: ${checkpoint.id}`);
        break;

      case '/restore':
        // Restore to checkpoint
        if (args.length === 0) {
          setError('Usage: /restore <checkpoint-id>');
        } else {
          try {
            const restored = restoreToCheckpoint(conversation, args[0]);
            setConversation(restored);
            await saveConversation(restored);
          } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
          }
        }
        break;

      case '/list':
        // Show conversations list
        setView('conversations');
        break;

      case '/help':
        // Toggle help
        setShowHelp(!showHelp);
        break;

      case '/clear':
        // Clear current conversation messages
        setConversation(prev => ({ ...prev, messages: [] }));
        break;

      case '/exit':
        // Exit TUI
        exit();
        break;

      default:
        setError(`Unknown command: ${command}`);
    }
  };

  /**
   * Handle conversation selection
   */
  const handleConversationSelect = async (convId: string) => {
    const conv = await loadConversation(convId);
    if (conv) {
      setConversation(conv);
      setAgentId(conv.agentId);
      setView('chat');
    }
  };

  /**
   * Handle agent selection
   */
  const handleAgentSelect = (selectedAgentId: string | undefined) => {
    setAgentId(selectedAgentId);
    setConversation(prev => ({ ...prev, agentId: selectedAgentId }));
    setView('chat');
  };

  return (
    <Box flexDirection="column" width="100%" height="100%">
      {/* Status Bar */}
      <StatusBar
        agentId={agentId}
        conversationTitle={conversation.title}
        isStreaming={isStreaming}
        view={view}
      />

      {/* Main Content */}
      <Box flexGrow={1} flexDirection="column">
        {view === 'chat' && (
          <>
            {/* Help Section */}
            {showHelp && (
              <Box marginBottom={1} borderStyle="round" borderColor="cyan" padding={1}>
                <Box flexDirection="column">
                  <Text bold color="cyan">Commands:</Text>
                  <Text>/new [title] - Create new conversation</Text>
                  <Text>/agent [id] - Switch agent</Text>
                  <Text>/checkpoint [description] - Create checkpoint</Text>
                  <Text>/restore &lt;checkpoint-id&gt; - Restore to checkpoint</Text>
                  <Text>/list - Show conversations</Text>
                  <Text>/clear - Clear current conversation</Text>
                  <Text>/help - Toggle this help</Text>
                  <Text>/exit - Exit TUI</Text>
                  <Text></Text>
                  <Text bold color="cyan">Shortcuts:</Text>
                  <Text>Ctrl+L - Toggle conversations list</Text>
                  <Text>Ctrl+A - Toggle agent selector</Text>
                  <Text>Ctrl+H - Toggle help</Text>
                  <Text>Ctrl+C - Exit</Text>
                </Box>
              </Box>
            )}

            {/* Messages */}
            <Box flexGrow={1} flexDirection="column" marginBottom={1}>
              <MessageList messages={conversation.messages} isStreaming={isStreaming} />
            </Box>

            {/* Error Display */}
            {error && (
              <Box marginBottom={1}>
                <Text color="red">Error: {error}</Text>
              </Box>
            )}

            {/* Input Box */}
            <InputBox onSubmit={handleSubmit} disabled={isStreaming} />
          </>
        )}

        {view === 'conversations' && (
          <ConversationList
            onSelect={handleConversationSelect}
            onCancel={() => setView('chat')}
          />
        )}

        {view === 'agents' && (
          <AgentSelector
            currentAgentId={agentId}
            onSelect={handleAgentSelect}
            onCancel={() => setView('chat')}
          />
        )}
      </Box>
    </Box>
  );
};
