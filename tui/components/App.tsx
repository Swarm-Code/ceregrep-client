/**
 * Main TUI App Component
 * Claude Code replacement interface
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { MessageList } from './MessageList.js';
import { InputBox } from './InputBox.js';
import { StatusBar } from './StatusBar.js';
import { Header } from './Header.js';
import { ConversationList } from './ConversationList.js';
import { ConfigPanel, ConfigData } from './ConfigPanel.js';
import { MCPManager } from './MCPManager.js';
import { AgentManager } from './AgentManager.js';
import { MessageNavigator } from './MessageNavigator.js';
import { BranchSelector } from './BranchSelector.js';
import { PromptSearch } from './PromptSearch.js';
import { CeregrepClient } from '../../sdk/typescript/index.js';
import { Message, createUserMessage, AssistantMessage } from '../../core/messages.js';
import { getConfig, saveConfig } from '../../config/loader.js';
import { readFileResource } from '../../mcp/resources.js';
import { getTools } from '../../tools/index.js';
import { createAgentClientConfig } from '../../agents/config-merger.js';
import { getAgent, listAgents } from '../../agents/index.js';
import {
  Conversation,
  BranchedConversation,
  createConversation,
  createBranchedConversation,
  saveConversation,
  loadConversation,
  listConversations,
  addCheckpoint,
  restoreToCheckpoint,
  forkConversation,
  switchBranch,
  generateMessageId,
} from '../conversation-storage.js';
import { logConversation, logMessage } from '../logger.js';
import { getTokenStats } from '../../core/tokens.js';
import { getModeSystemPrompt } from '../mode-prompts.js';
import { getBackgroundAgent } from '../background-agent.js';
import { loadHistory, savePrompt, PromptHistoryEntry } from '../prompt-history.js';

type View = 'chat' | 'conversations' | 'agents' | 'config' | 'mcp' | 'branches' | 'promptSearch';
type AgentMode = 'PLAN' | 'ACT' | 'DEBUG';

interface AppProps {
  initialConversationId?: string;
  initialAgentId?: string;
  enableLogging?: boolean;
}

// Force exact colors (hex) to override terminal themes
const BLUE = '#4169E1';
const PURPLE = '#A855F7';
const CYAN = '#22D3EE';
const WHITE = '#FFFFFF';
const RED = '#EF4444';
const GREEN = '#10B981';
const YELLOW = '#F59E0B';
const ORANGE = '#F97316';

export const App: React.FC<AppProps> = ({ initialConversationId, initialAgentId, enableLogging }) => {
  const { exit } = useApp();
  const [view, setView] = useState<View>('chat');
  const [conversation, setConversation] = useState<BranchedConversation>(
    createBranchedConversation('New Conversation', initialAgentId)
  );
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agentId, setAgentId] = useState<string | undefined>(initialAgentId);
  const [showHelp, setShowHelp] = useState(false);
  const [client, setClient] = useState<CeregrepClient | null>(null);
  const [verboseMode, setVerboseMode] = useState(false);
  const [agentMode, setAgentMode] = useState<AgentMode>('PLAN');
  const [autoMode, setAutoMode] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [showExitHint, setShowExitHint] = useState(false);
  const [navigationIndex, setNavigationIndex] = useState<number | null>(null); // null = live mode
  const [isHistoricalView, setIsHistoricalView] = useState(false);
  const [promptHistory, setPromptHistory] = useState<PromptHistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  const [tempInput, setTempInput] = useState('');
  const abortControllerRef = useRef<AbortController | null>(null);
  const conversationStartTime = useRef<number>(Date.now());
  const lastCtrlCPress = useRef<number>(0);
  const exitHintTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [config] = useState(() => getConfig());

  // Get current branch
  const currentBranch = useMemo(() => {
    return conversation.branches.get(conversation.currentBranchId);
  }, [conversation.branches, conversation.currentBranchId]);

  // Calculate token metrics from current branch messages
  const tokenMetrics = useMemo(() => {
    const messages = currentBranch?.messages || [];
    const stats = getTokenStats(messages);
    const elapsedMinutes = (Date.now() - conversationStartTime.current) / 60000;
    const tokensPerMinute = elapsedMinutes > 0 ? stats.total / elapsedMinutes : 0;

    return {
      usage: {
        input: stats.input,
        output: stats.output,
        total: stats.total,
      },
      tokensPerMinute,
    };
  }, [currentBranch]);

  // Get model and provider info
  const modelInfo = useMemo(() => {
    const model = config.model || 'unknown';
    const provider = config.provider?.type || 'anthropic';
    return { model, provider };
  }, [config]);

  // Initialize or reinitialize client when agent changes
  useEffect(() => {
    const initClient = async () => {
      const baseConfig = getConfig();
      const tools = await getTools(true);

      let clientConfig: any;

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

      const newClient = new CeregrepClient(clientConfig);
      await newClient.initialize();
      setClient(newClient);
    };

    initClient();
  }, [agentId]);

  // Load initial conversation if provided
  useEffect(() => {
    if (initialConversationId) {
      loadConversation(initialConversationId).then(conv => {
        if (conv) {
          setConversation(conv);
          setAgentId(conv.agentId);
          // SDK is stateless - no need to sync history
        }
      });
    }
  }, [initialConversationId]);

  // Load prompt history on mount
  useEffect(() => {
    loadHistory().then(history => {
      setPromptHistory(history);
    });
  }, []);

  // Get mode color and description
  const getModeInfo = (mode: AgentMode) => {
    switch (mode) {
      case 'PLAN':
        return { color: BLUE, desc: 'Planning mode - think before acting', emoji: '📋' };
      case 'ACT':
        return { color: GREEN, desc: 'Action mode - execute the plan', emoji: '⚡' };
      case 'DEBUG':
        return { color: ORANGE, desc: 'Debug mode - detailed analysis', emoji: '🔍' };
    }
  };

  // Cycle through agent modes (Tab)
  const cycleMode = () => {
    const modes: AgentMode[] = ['PLAN', 'ACT', 'DEBUG'];
    const currentIndex = modes.indexOf(agentMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    const newMode = modes[nextIndex];
    setAgentMode(newMode);
  };

  // Toggle auto mode (Shift+Tab)
  const toggleAutoMode = () => {
    setAutoMode(!autoMode);
  };

  // Handle prompt history navigation
  const handleHistoryNavigation = (direction: 'up' | 'down') => {
    if (promptHistory.length === 0) return;

    if (direction === 'up') {
      // Going back in history (older prompts)
      if (historyIndex === null) {
        // First navigation - save current input and go to most recent
        setTempInput(inputValue);
        setHistoryIndex(0);
        setInputValue(promptHistory[0].text);
      } else if (historyIndex < promptHistory.length - 1) {
        // Move to older prompt
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setInputValue(promptHistory[newIndex].text);
      }
    } else {
      // Going forward in history (newer prompts)
      if (historyIndex !== null) {
        if (historyIndex > 0) {
          // Move to newer prompt
          const newIndex = historyIndex - 1;
          setHistoryIndex(newIndex);
          setInputValue(promptHistory[newIndex].text);
        } else {
          // At newest - restore temp input
          setHistoryIndex(null);
          setInputValue(tempInput);
        }
      }
    }
  };

  // Handle keyboard shortcuts
  useInput((input, key) => {
    // Ctrl+C: Clear input or exit if pressed twice quickly
    if (key.ctrl && input === 'c') {
      const now = Date.now();
      const timeSinceLastPress = now - lastCtrlCPress.current;

      if (timeSinceLastPress < 500) {
        // Pressed twice within 500ms - exit
        exit();
      } else {
        // First press - clear input and show exit hint
        setInputValue('');
        setShowExitHint(true);
        lastCtrlCPress.current = now;

        // Clear any existing timeout
        if (exitHintTimeoutRef.current) {
          clearTimeout(exitHintTimeoutRef.current);
        }

        // Hide hint after 2 seconds
        exitHintTimeoutRef.current = setTimeout(() => {
          setShowExitHint(false);
        }, 2000);
      }
      return;
    }

    // Ctrl+Left: Navigate to previous message
    if (key.ctrl && key.leftArrow && !isStreaming && currentBranch) {
      const currentIdx = navigationIndex ?? currentBranch.messages.length - 1;
      if (currentIdx > 0) {
        setNavigationIndex(currentIdx - 1);
        setIsHistoricalView(true);
      } else {
        setError('At start of conversation');
        setTimeout(() => setError(null), 2000);
      }
      return;
    }

    // Ctrl+Right: Navigate to next message
    if (key.ctrl && key.rightArrow && !isStreaming && currentBranch) {
      const currentIdx = navigationIndex ?? 0;
      if (navigationIndex !== null && currentIdx < currentBranch.messages.length - 1) {
        setNavigationIndex(currentIdx + 1);
      } else {
        // At end, return to live
        setNavigationIndex(null);
        setIsHistoricalView(false);
      }
      return;
    }

    // Ctrl+F: Fork at current position
    if (key.ctrl && input === 'f' && !isStreaming && currentBranch) {
      if (currentBranch.messages.length === 0) {
        setError('Cannot fork empty conversation');
        setTimeout(() => setError(null), 2000);
        return;
      }
      setError('Type /fork [name] to create a fork');
      setTimeout(() => setError(null), 3000);
      return;
    }

    // Ctrl+B: Branch selector
    if (key.ctrl && input === 'b') {
      setView(view === 'branches' ? 'chat' : 'branches');
      return;
    }

    // Ctrl+0: Return to live
    if (key.ctrl && input === '0') {
      setNavigationIndex(null);
      setIsHistoricalView(false);
      return;
    }

    // Shift+Tab to toggle auto mode
    if (key.shift && key.tab) {
      toggleAutoMode();
      return;
    }

    // Tab to cycle modes (only when NOT typing a command)
    if (key.tab && !isStreaming && !inputValue.startsWith('/')) {
      cycleMode();
      return;
    }

    // Ctrl+L to toggle conversations list
    if (key.ctrl && input === 'l') {
      setView(view === 'conversations' ? 'chat' : 'conversations');
      return; // Prevent 'l' from being added to input
    }

    // Ctrl+A to toggle agent selector
    if (key.ctrl && input === 'a') {
      setView(view === 'agents' ? 'chat' : 'agents');
      return; // Prevent 'a' from being added to input
    }

    // Ctrl+H to toggle help
    if (key.ctrl && input === 'h') {
      setShowHelp(!showHelp);
      return; // Prevent 'h' from being added to input
    }

    // Ctrl+O to toggle verbose mode
    if (key.ctrl && input === 'o') {
      setVerboseMode(!verboseMode);
      return; // Prevent 'o' from being added to input
    }

    // Ctrl+T to toggle MCP manager (T = Tools/MCP Tools)
    if (key.ctrl && input === 't') {
      setView(view === 'mcp' ? 'chat' : 'mcp');
      return; // Prevent 't' from being added to input
    }

    // Ctrl+R to search prompt history
    if (key.ctrl && input === 'r') {
      setView('promptSearch');
      return; // Prevent 'r' from being added to input
    }

    // Escape to stop/force stop agent execution
    if (key.escape && isStreaming) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        setError('Agent execution stopped by user');
        setIsStreaming(false);
      }
    }
  });

  /**
   * Handle user message submission
   */
  const handleSubmit = async (input: string, attachedFiles?: string[]) => {
    // Handle "exit" command to quit
    if (input.trim().toLowerCase() === 'exit') {
      exit();
      return;
    }

    // Handle commands
    if (input.startsWith('/')) {
      await handleCommand(input);
      return;
    }

    if (!client) {
      setError('Client not initialized');
      return;
    }

    // Create abort controller for this query
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Start streaming
    setIsStreaming(true);
    setError(null);

    try {
      // Process attached files and build message content
      let messageContent: string | any[] = input;

      if (attachedFiles && attachedFiles.length > 0) {
        // Build content array with text and document blocks
        const contentBlocks: any[] = [
          {
            type: 'text',
            text: input,
          },
        ];

        // Read and attach files
        for (const filePath of attachedFiles) {
          try {
            const { content, isInRepo } = await readFileResource(filePath);

            // Only include files that are in the repo
            if (isInRepo) {
              contentBlocks.push({
                type: 'document',
                source: {
                  type: 'text',
                  data: content,
                },
                title: filePath.split('/').pop() || filePath,
                context: `File: ${filePath}`,
              });
            } else {
              setError(`Skipped file outside repo: ${filePath}`);
            }
          } catch (err) {
            console.error(`Failed to read file ${filePath}:`, err);
            setError(`Failed to read file: ${filePath}`);
          }
        }

        messageContent = contentBlocks;
      }

      // Auto-fork if in historical mode
      if (isHistoricalView && navigationIndex !== null && currentBranch) {
        const forkName = `Fork from msg ${navigationIndex + 1}`;
        const { conversation: forked } = forkConversation(
          conversation,
          navigationIndex,
          forkName,
          'Auto-fork from historical view'
        );
        setConversation(forked);
        setIsHistoricalView(false);
        setNavigationIndex(null);
        // Update currentBranch will happen via useMemo on next render
      }

      // Get background context (git status, tool usage)
      const backgroundAgent = getBackgroundAgent();
      const bgContext = await backgroundAgent.getContext(currentBranch?.messages || []);

      // Determine actual mode (use AUTO if toggled, otherwise use current mode)
      const effectiveMode = autoMode ? 'AUTO' : agentMode;

      // Get mode-specific system prompt
      const modePrompt = getModeSystemPrompt(effectiveMode);

      // Inject background context into system prompt
      const contextLines = backgroundAgent.formatContextForPrompt(bgContext);
      const fullPrompt = [...modePrompt, ...contextLines];

      // Build query options with mode-specific prompt + background context
      const queryOptions: any = {
        abortController,
        systemPrompt: fullPrompt,
      };

      // Get current conversation messages (TUI owns this state, like Claude Code)
      const currentMessages = currentBranch?.messages || [];

      // Collection for ALL new messages from this query
      const newMessages: Message[] = [];

      // Execute query with STATELESS SDK
      // Show messages in REAL-TIME as they stream (users want to see progress!)
      for await (const message of client.queryStream(currentMessages, messageContent, queryOptions)) {
        // Add to collection
        newMessages.push(message);

        // Update state IN REAL-TIME so users can see messages as they arrive
        // This is what makes the UI feel responsive!
        setConversation(prev => {
          const branch = prev.branches.get(prev.currentBranchId);
          if (!branch) return prev;

          // Append all messages collected so far
          const updatedMessages = [...currentMessages, ...newMessages];
          const updatedBranch = { ...branch, messages: updatedMessages };
          const newBranches = new Map(prev.branches);
          newBranches.set(prev.currentBranchId, updatedBranch);

          return {
            ...prev,
            branches: newBranches,
          };
        });
      }

      // Save updated conversation
      await saveConversation(conversation);

      // Save prompt to history
      const promptText = typeof input === 'string' ? input : input;
      await savePrompt(promptText, conversation.id);
      // Reload history to get the updated list
      const updatedHistory = await loadHistory();
      setPromptHistory(updatedHistory);
      // Reset history navigation
      setHistoryIndex(null);
      setTempInput('');

      // Get the updated messages for title generation
      const updatedMessages = [...currentMessages, ...newMessages];

      // Auto-generate conversation title if this is the first user message
      const userMessageCount = updatedMessages.filter((m: Message) => m.type === 'user').length;
      if (userMessageCount === 1 && conversation.title === 'New Conversation') {
        // Generate title in the background (don't block UI)
        backgroundAgent.generateConversationTitle(updatedMessages).then(title => {
          if (title && title !== 'New Conversation') {
            setConversation(prev => ({ ...prev, title }));
            saveConversation({ ...conversation, title });
          }
        }).catch(err => {
          console.error('Error generating title:', err);
        });
      }
    } catch (err) {
      // Handle abort error gracefully
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Agent execution stopped by user');
      } else {
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
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
        // Create new conversation (TUI owns all state, SDK is stateless)
        const newConv = createBranchedConversation(args.join(' ') || 'New Conversation', agentId);
        setConversation(newConv);
        await saveConversation(newConv);
        conversationStartTime.current = Date.now(); // Reset timer
        setNavigationIndex(null);
        setIsHistoricalView(false);
        // SDK is now stateless - no need to clear history
        break;

      case '/agent':
        // Switch agent (client will be reinitialized by useEffect)
        if (args.length === 0) {
          setView('agents');
        } else {
          setAgentId(args[0]);
          setConversation(prev => ({ ...prev, agentId: args[0] }));
        }
        break;

      case '/fork':
        // Fork at current navigation point
        if (!currentBranch) {
          setError('No current branch');
          break;
        }
        if (currentBranch.messages.length === 0) {
          setError('Cannot fork empty conversation');
          break;
        }
        const forkName = args.join(' ') || `Fork ${Date.now()}`;
        const forkIndex = navigationIndex ?? currentBranch.messages.length - 1;
        try {
          const { conversation: forked, newBranchId } = forkConversation(
            conversation,
            forkIndex,
            forkName,
            'User-initiated fork'
          );
          setConversation(forked);
          await saveConversation(forked);
          setNavigationIndex(null);
          setIsHistoricalView(false);
          setError(`Forked to new branch: ${forkName}`);
          setTimeout(() => setError(null), 3000);
        } catch (err) {
          setError(err instanceof Error ? err.message : String(err));
        }
        break;

      case '/branches':
        // Show branch selector
        setView('branches');
        break;

      case '/switch':
        // Switch to different branch
        if (args.length === 0) {
          setView('branches');
        } else {
          try {
            const forked = switchBranch(conversation, args[0]);
            setConversation(forked);
            setNavigationIndex(null);
            setIsHistoricalView(false);
            await saveConversation(forked);
            // SDK is stateless - no need to manage history
          } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
          }
        }
        break;

      case '/checkpoint':
        // Create checkpoint (legacy - for backwards compatibility)
        setError('/checkpoint command deprecated - use navigation and /fork instead');
        break;

      case '/restore':
        // Restore to checkpoint (legacy)
        setError('/restore command deprecated - use /branches to switch between forks');
        break;

      case '/list':
        // Show conversations list
        setView('conversations');
        break;

      case '/mcp':
        // Show MCP manager
        setView('mcp');
        break;

      case '/config':
        // Show config panel
        setView('config');
        break;

      case '/help':
        // Toggle help
        setShowHelp(!showHelp);
        break;

      case '/compact':
        // Compact conversation history (user-initiated like Claude Code)
        if (!client || !currentBranch) {
          setError('Client not initialized or no current branch');
          break;
        }

        if (currentBranch.messages.length < 10) {
          setError('Not enough messages to compact (need at least 10)');
          break;
        }

        try {
          setIsStreaming(true);
          setError('Compacting conversation...');

          // Use SDK's compactConversation helper (matches Claude Code pattern exactly)
          // This returns ONLY the summary messages - no recent messages kept
          const compactedMessages = await client.compactConversation(
            currentBranch.messages
          );

          // Create new conversation with JUST the summary (like Claude Code)
          // Start completely fresh, don't keep recent messages

          setConversation(prev => {
            const branch = prev.branches.get(prev.currentBranchId);
            if (!branch) return prev;

            const updatedBranch = { ...branch, messages: compactedMessages };
            const newBranches = new Map(prev.branches);
            newBranches.set(prev.currentBranchId, updatedBranch);

            return {
              ...prev,
              branches: newBranches,
            };
          });

          await saveConversation(conversation);
          conversationStartTime.current = Date.now(); // Reset timer

          setError('Conversation compacted successfully');
          setTimeout(() => setError(null), 3000);
        } catch (err) {
          setError(err instanceof Error ? err.message : String(err));
        } finally {
          setIsStreaming(false);
        }
        break;

      case '/clear':
        // Clear current branch messages and client history
        setConversation(prev => {
          const branch = prev.branches.get(prev.currentBranchId);
          if (!branch) return prev;

          const updatedBranch = { ...branch, messages: [] };
          const newBranches = new Map(prev.branches);
          newBranches.set(prev.currentBranchId, updatedBranch);

          return {
            ...prev,
            branches: newBranches,
          };
        });
        conversationStartTime.current = Date.now(); // Reset timer
        setNavigationIndex(null);
        setIsHistoricalView(false);
        // SDK is stateless - no need to clear history
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
      // SDK is now stateless - TUI owns all conversation state
      // No need to sync with client as it doesn't maintain history
    }
  };

  /**
   * Handle agent selection
   */
  const handleAgentSelect = (selectedAgentId: string | undefined) => {
    setAgentId(selectedAgentId);
    // Start a new conversation when changing agents
    const newConv = createBranchedConversation('New Conversation', selectedAgentId);
    setConversation(newConv);
    setView('chat');
    setNavigationIndex(null);
    setIsHistoricalView(false);
    // Client will be reinitialized by useEffect when agentId changes
  };

  /**
   * Handle branch selection
   */
  const handleBranchSelect = async (branchId: string) => {
    try {
      const switched = switchBranch(conversation, branchId);
      setConversation(switched);
      setNavigationIndex(null);
      setIsHistoricalView(false);
      await saveConversation(switched);
      setView('chat');

      // SDK is stateless - no need to manage history
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  /**
   * Handle config save
   */
  const handleConfigSave = (newConfig: ConfigData) => {
    try {
      saveConfig(newConfig as any);
      setError('Config saved successfully');
      setView('chat');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  /**
   * Handle MCP server changes (reinitialize client with new tools)
   */
  const handleMCPServerChange = async () => {
    if (!client) return;

    // Reinitialize client to pick up new MCP servers/tools
    const baseConfig = getConfig();
    const tools = await getTools(true);

    let clientConfig: any;

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

    const newClient = new CeregrepClient(clientConfig);
    await newClient.initialize();

    // SDK is stateless - history is managed by TUI
    // No need to transfer history between clients

    setClient(newClient);
  };

  return (
    <Box flexDirection="column" width="100%" height="100%">
      {/* Header - always visible */}
      {view === 'chat' && (
        <Header
          model={modelInfo.model}
          provider={modelInfo.provider}
          cwd={process.cwd()}
          agentMode={agentMode}
          autoMode={autoMode}
          modeColor={getModeInfo(agentMode).color}
        />
      )}

      {/* Main Content */}
      <Box flexGrow={1} flexDirection="column">
        {view === 'chat' && (
          <>
            {/* Help Section */}
            {showHelp && (
              <Box marginBottom={1} padding={1}>
                <Box flexDirection="column">
                  <Text bold color={PURPLE}>BASIC COMMANDS:</Text>
                  <Text color={BLUE}>/new</Text>
                  <Text color={WHITE}>  Start a fresh conversation</Text>
                  <Text color={BLUE}>/list</Text>
                  <Text color={WHITE}>  Browse all your conversations (Ctrl+L)</Text>
                  <Text color={BLUE}>/clear</Text>
                  <Text color={WHITE}>  Clear current conversation</Text>
                  <Text color={BLUE}>/help</Text>
                  <Text color={WHITE}>  Show/hide this help (Ctrl+H)</Text>
                  <Text color={BLUE}>/exit</Text>
                  <Text color={WHITE}>  Quit the TUI (Ctrl+C twice)</Text>
                  <Text></Text>
                  <Text bold color={PURPLE}>NAVIGATION & BRANCHING:</Text>
                  <Text color={BLUE}>/fork [name]</Text>
                  <Text color={WHITE}>  Create a new branch from here</Text>
                  <Text color={BLUE}>/branches</Text>
                  <Text color={WHITE}>  View all conversation branches (Ctrl+B)</Text>
                  <Text color={CYAN}>Ctrl+← / Ctrl+→</Text>
                  <Text color={WHITE}>  Go back/forward through messages</Text>
                  <Text color={CYAN}>Ctrl+0</Text>
                  <Text color={WHITE}>  Jump to latest message</Text>
                  <Text></Text>
                  <Text bold color={PURPLE}>SETTINGS:</Text>
                  <Text color={BLUE}>/agent</Text>
                  <Text color={WHITE}>  Switch and manage AI agents (Ctrl+A)</Text>
                  <Text color={BLUE}>/config</Text>
                  <Text color={WHITE}>  Configure settings</Text>
                  <Text color={BLUE}>/mcp</Text>
                  <Text color={WHITE}>  Manage MCP tools and servers (Ctrl+T)</Text>
                  <Text></Text>
                  <Text bold color={PURPLE}>ADVANCED:</Text>
                  <Text color={BLUE}>/compact</Text>
                  <Text color={WHITE}>  Compress long conversations</Text>
                  <Text color={CYAN}>Ctrl+O</Text>
                  <Text color={WHITE}>  Toggle detailed/compact view</Text>
                  <Text color={CYAN}>Ctrl+R</Text>
                  <Text color={WHITE}>  Search prompt history</Text>
                  <Text color={CYAN}>↑/↓ Arrows</Text>
                  <Text color={WHITE}>  Navigate prompt history</Text>
                  <Text color={CYAN}>Escape</Text>
                  <Text color={WHITE}>  Stop the AI mid-response</Text>
                </Box>
              </Box>
            )}

            {/* Messages */}
            <Box flexGrow={1} flexDirection="column" marginBottom={1}>
              <MessageList
                messages={
                  navigationIndex !== null && currentBranch
                    ? currentBranch.messages.slice(0, navigationIndex + 1)
                    : (currentBranch?.messages || [])
                }
                isStreaming={isStreaming}
                verboseMode={verboseMode}
              />
            </Box>

            {/* Message Navigator - show if historical mode or multiple branches */}
            {(isHistoricalView || (conversation.branches.size > 1)) && currentBranch && (
              <MessageNavigator
                currentIndex={navigationIndex ?? currentBranch.messages.length - 1}
                totalMessages={currentBranch.messages.length}
                branchName={currentBranch.name}
                isHistorical={isHistoricalView}
                canNavigateBack={
                  (navigationIndex ?? currentBranch.messages.length - 1) > 0
                }
                canNavigateForward={
                  navigationIndex !== null &&
                  navigationIndex < currentBranch.messages.length - 1
                }
                onNavigateBack={() => {
                  const currentIdx = navigationIndex ?? currentBranch.messages.length - 1;
                  if (currentIdx > 0) {
                    setNavigationIndex(currentIdx - 1);
                    setIsHistoricalView(true);
                  }
                }}
                onNavigateForward={() => {
                  const currentIdx = navigationIndex ?? 0;
                  if (navigationIndex !== null && currentIdx < currentBranch.messages.length - 1) {
                    setNavigationIndex(currentIdx + 1);
                  } else {
                    setNavigationIndex(null);
                    setIsHistoricalView(false);
                  }
                }}
                onFork={() => {
                  setError('Type /fork [name] to create a fork');
                  setTimeout(() => setError(null), 3000);
                }}
                onReturnToLive={() => {
                  setNavigationIndex(null);
                  setIsHistoricalView(false);
                }}
              />
            )}

            {/* Error Display */}
            {error && (
              <Box marginBottom={1}>
                <Text bold color={RED}>⚠ {error}</Text>
              </Box>
            )}

            {/* Input Box */}
            <InputBox
              onSubmit={handleSubmit}
              disabled={isStreaming}
              modeColor={getModeInfo(agentMode).color}
              value={inputValue}
              onChange={setInputValue}
              onNavigateHistory={handleHistoryNavigation}
            />
          </>
        )}

        {view === 'conversations' && (
          <ConversationList
            onSelect={handleConversationSelect}
            onCancel={() => setView('chat')}
          />
        )}

        {view === 'agents' && (
          <AgentManager
            currentAgentId={agentId}
            onSwitchAgent={handleAgentSelect}
            onCancel={() => setView('chat')}
            onAgentChange={() => {
              // Reload agents list if needed
            }}
          />
        )}

        {view === 'config' && (
          <ConfigPanel
            currentConfig={config as ConfigData}
            onSave={handleConfigSave}
            onCancel={() => setView('chat')}
          />
        )}

        {view === 'mcp' && (
          <MCPManager
            onCancel={() => setView('chat')}
            onServerChange={handleMCPServerChange}
          />
        )}

        {view === 'branches' && (
          <BranchSelector
            conversation={conversation}
            onSelect={handleBranchSelect}
            onCancel={() => setView('chat')}
          />
        )}

        {view === 'promptSearch' && (
          <PromptSearch
            prompts={promptHistory}
            onSelect={(text) => {
              setInputValue(text);
              setView('chat');
            }}
            onCancel={() => setView('chat')}
          />
        )}
      </Box>

      {/* Status Bar - at bottom */}
      <StatusBar
        agentId={agentId}
        conversationTitle={conversation.title}
        isStreaming={isStreaming}
        view={view}
        tokenUsage={tokenMetrics.usage}
        tokensPerMinute={tokenMetrics.tokensPerMinute}
        model={modelInfo.model}
        provider={modelInfo.provider}
        agentMode={agentMode}
        autoMode={autoMode}
        modeColor={getModeInfo(agentMode).color}
        showExitHint={showExitHint}
      />
    </Box>
  );
};
