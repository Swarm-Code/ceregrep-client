/**
 * MCP Manager Component
 * Manage MCP servers and tools dynamically
 */

import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import {
  listMCPServers,
  testMCPServer,
  disconnectAllServers,
  connectToAllServers,
  getMCPTools
} from '../../mcp/client.js';
import { MCPServerConfig } from '../../config/schema.js';
import { getCurrentProjectConfig, saveCurrentProjectConfig } from '../../config/loader.js';

interface MCPManagerProps {
  onCancel: () => void;
  onServerChange?: () => void;
}

// Force exact colors
const CYAN = '#22D3EE';
const WHITE = '#FFFFFF';
const DIM_WHITE = '#9CA3AF';
const GREEN = '#10B981';
const RED = '#EF4444';
const YELLOW = '#F59E0B';
const PURPLE = '#A855F7';

type View = 'list' | 'add' | 'add-type' | 'test' | 'tools';
type ServerType = 'stdio' | 'sse';

interface ServerStatus {
  name: string;
  config: MCPServerConfig;
  status: 'connected' | 'failed';
  error?: string;
  toolCount?: number;
}

interface NewServerData {
  name: string;
  type: ServerType;
  command: string;
  args: string[];
  url: string;
  env: Record<string, string>;
}

export const MCPManager: React.FC<MCPManagerProps> = ({ onCancel, onServerChange }) => {
  const [view, setView] = useState<View>('list');
  const [servers, setServers] = useState<ServerStatus[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<{ [key: string]: string }>({});
  const [tools, setTools] = useState<any[]>([]);
  const [selectedServer, setSelectedServer] = useState<string | null>(null);
  const [selectedToolIndex, setSelectedToolIndex] = useState(0);
  const [toolDescriptions, setToolDescriptions] = useState<{ [key: string]: string }>({});
  const [loadedDescriptionsFor, setLoadedDescriptionsFor] = useState<Set<string>>(new Set());
  const [loadingDescriptions, setLoadingDescriptions] = useState(false);
  const [expandedTool, setExpandedTool] = useState<string | null>(null);
  const [newServer, setNewServer] = useState<NewServerData>({
    name: '',
    type: 'stdio',
    command: '',
    args: [],
    url: '',
    env: {},
  });
  const [inputField, setInputField] = useState<'name' | 'command' | 'args' | 'url'>('name');
  const [inputValue, setInputValue] = useState('');

  // Load servers on mount
  useEffect(() => {
    loadServers();
  }, []);

  const loadServers = async () => {
    setLoading(true);
    try {
      const serverList = await listMCPServers();
      setServers(serverList);

      // Load tools
      const mcpTools = await getMCPTools();
      setTools(mcpTools);
    } catch (error) {
      setMessage(`Error loading servers: ${error instanceof Error ? error.message : String(error)}`);
    }
    setLoading(false);
  };

  // Load tool descriptions when entering tools view
  const loadToolDescriptions = async (serverName: string) => {
    // Check if descriptions already loaded for this server
    if (loadedDescriptionsFor.has(serverName) || loadingDescriptions) {
      return;
    }

    setLoadingDescriptions(true);
    const filteredTools = tools.filter(tool => tool.name.startsWith(`mcp__${serverName}__`));
    const descriptions: { [key: string]: string } = {};

    for (const tool of filteredTools) {
      try {
        const desc = await tool.description();
        descriptions[tool.name] = desc;
      } catch (error) {
        descriptions[tool.name] = 'Description not available';
      }
    }

    setToolDescriptions(prev => ({ ...prev, ...descriptions }));
    setLoadedDescriptionsFor(prev => new Set([...prev, serverName]));
    setLoadingDescriptions(false);
  };

  const testServer = async (name: string) => {
    setLoading(true);
    setMessage(`Testing ${name}...`);

    try {
      const server = servers.find(s => s.name === name);
      if (!server) {
        setMessage(`Server ${name} not found`);
        return;
      }

      const result = await testMCPServer(name, server.config);
      setTestResults(prev => ({
        ...prev,
        [name]: result.success ? `✓ ${result.message}` : `✗ ${result.message}`,
      }));
      setMessage(result.success ? `✓ ${name}: ${result.message}` : `✗ ${name}: ${result.message}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      setTestResults(prev => ({
        ...prev,
        [name]: `✗ ${errorMsg}`,
      }));
      setMessage(`✗ ${name}: ${errorMsg}`);
    }

    setLoading(false);
  };

  const toggleServer = async (name: string) => {
    const config = getCurrentProjectConfig();
    if (!config.mcpServers?.[name]) return;

    config.mcpServers[name].disabled = !config.mcpServers[name].disabled;
    saveCurrentProjectConfig(config);

    setMessage(`${name} ${config.mcpServers[name].disabled ? 'disabled' : 'enabled'}`);

    // Reconnect to apply changes
    await disconnectAllServers();
    await loadServers();

    if (onServerChange) {
      onServerChange();
    }
  };

  const toggleTool = async (serverName: string, toolName: string) => {
    const config = getCurrentProjectConfig();
    if (!config.mcpServers?.[serverName]) return;

    const server = config.mcpServers[serverName];
    if (!server.disabledTools) {
      server.disabledTools = [];
    }

    const toolIndex = server.disabledTools.indexOf(toolName);
    if (toolIndex === -1) {
      server.disabledTools.push(toolName);
      setMessage(`Disabled tool: ${toolName}`);
    } else {
      server.disabledTools.splice(toolIndex, 1);
      setMessage(`Enabled tool: ${toolName}`);
    }

    saveCurrentProjectConfig(config);

    // Reconnect to apply changes
    await disconnectAllServers();
    await loadServers();

    if (onServerChange) {
      onServerChange();
    }
  };

  const removeServer = async (name: string) => {
    const config = getCurrentProjectConfig();
    if (!config.mcpServers?.[name]) return;

    delete config.mcpServers[name];
    saveCurrentProjectConfig(config);

    setMessage(`Removed server: ${name}`);

    // Reconnect to apply changes
    await disconnectAllServers();
    await loadServers();

    if (onServerChange) {
      onServerChange();
    }
  };

  const addServer = async () => {
    const config = getCurrentProjectConfig();
    if (!config.mcpServers) {
      config.mcpServers = {};
    }

    // Check if server already exists
    if (config.mcpServers[newServer.name]) {
      setMessage(`Error: Server ${newServer.name} already exists`);
      return;
    }

    // Build server config
    let serverConfig: MCPServerConfig;
    if (newServer.type === 'stdio') {
      serverConfig = {
        type: 'stdio',
        command: newServer.command,
        args: newServer.args,
        env: Object.keys(newServer.env).length > 0 ? newServer.env : undefined,
        disabled: false,
        disabledTools: [],
      } as any;
    } else {
      serverConfig = {
        type: 'sse',
        url: newServer.url,
        disabled: false,
        disabledTools: [],
      } as any;
    }

    // Test the server first
    setLoading(true);
    setMessage(`Testing ${newServer.name}...`);

    try {
      const testResult = await testMCPServer(newServer.name, serverConfig);

      if (!testResult.success) {
        setMessage(`✗ Test failed: ${testResult.message}`);
        setLoading(false);
        return;
      }

      // Add to config
      config.mcpServers[newServer.name] = serverConfig;
      saveCurrentProjectConfig(config);

      setMessage(`✓ Added server: ${newServer.name} (${testResult.toolCount || 0} tools)`);

      // Reset form
      setNewServer({
        name: '',
        type: 'stdio',
        command: '',
        args: [],
        url: '',
        env: {},
      });
      setInputValue('');
      setInputField('name');
      setView('list');

      // Reconnect to apply changes
      await disconnectAllServers();
      await loadServers();

      if (onServerChange) {
        onServerChange();
      }
    } catch (error) {
      setMessage(`✗ Error: ${error instanceof Error ? error.message : String(error)}`);
    }

    setLoading(false);
  };

  // Keyboard navigation
  useInput((input, key) => {
    if (view === 'list') {
      if (key.upArrow && selectedIndex > 0) {
        setSelectedIndex(selectedIndex - 1);
      } else if (key.downArrow && selectedIndex < servers.length) {
        setSelectedIndex(selectedIndex + 1);
      } else if (key.return) {
        if (selectedIndex === servers.length) {
          // "Add new server" option selected
          setView('add-type');
        } else if (servers[selectedIndex]) {
          testServer(servers[selectedIndex].name);
        }
      } else if (input === 'a') {
        // Press 'a' to add new server
        setView('add-type');
      } else if (input === 't' && servers[selectedIndex]) {
        // Toggle server enable/disable
        toggleServer(servers[selectedIndex].name);
      } else if (input === 'd' && servers[selectedIndex]) {
        // Show tools for server
        const serverName = servers[selectedIndex].name;
        setSelectedServer(serverName);
        setSelectedToolIndex(0);
        setView('tools');
        // Load tool descriptions asynchronously
        loadToolDescriptions(serverName);
      } else if (input === 'r' && servers[selectedIndex]) {
        // Remove server
        removeServer(servers[selectedIndex].name);
      } else if (key.escape || input === 'q') {
        onCancel();
      }
    } else if (view === 'add-type') {
      if (input === '1') {
        setNewServer({ ...newServer, type: 'stdio' });
        setView('add');
        setInputField('name');
      } else if (input === '2') {
        setNewServer({ ...newServer, type: 'sse' });
        setView('add');
        setInputField('name');
      } else if (key.escape || input === 'q') {
        setView('list');
      }
    } else if (view === 'add') {
      if (key.escape) {
        setView('list');
        setNewServer({
          name: '',
          type: 'stdio',
          command: '',
          args: [],
          url: '',
          env: {},
        });
        setInputValue('');
        setInputField('name');
      }
      // Arrow keys to navigate between fields (when not typing)
      if (key.downArrow || key.upArrow) {
        const fields = newServer.type === 'stdio' ? ['name', 'command', 'args'] : ['name', 'url'];
        const currentIndex = fields.indexOf(inputField);

        if (key.downArrow && currentIndex < fields.length - 1) {
          setInputField(fields[currentIndex + 1] as any);
          setInputValue('');
        } else if (key.upArrow && currentIndex > 0) {
          setInputField(fields[currentIndex - 1] as any);
          setInputValue('');
        }
      }
      // Ctrl+S to submit form
      if (key.ctrl && input === 's') {
        addServer();
      }
    } else if (view === 'tools') {
      if (!selectedServer) return;

      const filteredTools = tools.filter(tool => tool.name.startsWith(`mcp__${selectedServer}__`));

      if (key.upArrow && selectedToolIndex > 0) {
        setSelectedToolIndex(selectedToolIndex - 1);
      } else if (key.downArrow && selectedToolIndex < filteredTools.length - 1) {
        setSelectedToolIndex(selectedToolIndex + 1);
      } else if (input === ' ' && filteredTools[selectedToolIndex]) {
        // Toggle tool on Space
        const tool = filteredTools[selectedToolIndex];
        const toolShortName = tool.name.replace(`mcp__${selectedServer}__`, '');
        toggleTool(selectedServer, toolShortName);
      } else if ((key.return || input === 'i') && filteredTools[selectedToolIndex]) {
        // Expand/collapse description on Enter or 'i'
        const tool = filteredTools[selectedToolIndex];
        setExpandedTool(expandedTool === tool.name ? null : tool.name);
      } else if (key.escape || input === 'q') {
        setView('list');
        setSelectedServer(null);
        setSelectedToolIndex(0);
        // Keep toolDescriptions cached for faster re-entry
      }
    }
  });

  // Get terminal width for lines
  const width = process.stdout.columns || 80;
  const line = '─'.repeat(width);

  return (
    <Box flexDirection="column">
      <Text bold color={PURPLE}>MCP: {selectedServer || 'Server Manager'}</Text>
      {loading && <Text color={YELLOW}>Loading...</Text>}
      {message && <Text color={message.startsWith('✓') ? GREEN : message.startsWith('✗') ? RED : CYAN}>{message}</Text>}

      {view === 'list' && (
        <Box flexDirection="column">
          <Text color={CYAN}>
            Servers ({servers.length}) - ↑↓ navigate, Enter test, A add, T toggle, D tools, R remove, Q quit
          </Text>

          {servers.length === 0 ? (
            <Text color={DIM_WHITE}>No MCP servers configured</Text>
          ) : (
            servers.map((server, index) => {
              const isSelected = index === selectedIndex;
              const statusColor = server.status === 'connected' ? GREEN : RED;
              const statusText = server.status === 'connected' ? '●' : '○';
              const disabledText = server.config.disabled ? ' [DISABLED]' : '';
              const testResult = testResults[server.name];

              return (
                <Box key={server.name} marginY={0}>
                  <Text color={isSelected ? CYAN : WHITE} bold={isSelected}>
                    {isSelected ? '▶ ' : '  '}
                    <Text color={statusColor}>{statusText}</Text> {server.name}{disabledText}
                  </Text>
                  {testResult && (
                    <Text color={DIM_WHITE}> - {testResult}</Text>
                  )}
                  {server.config.disabledTools && server.config.disabledTools.length > 0 && (
                    <Text color={YELLOW}> ({server.config.disabledTools.length} tools disabled)</Text>
                  )}
                </Box>
              );
            })
          )}

          <Box marginTop={1}>
            <Text color={selectedIndex === servers.length ? CYAN : PURPLE} bold={selectedIndex === servers.length}>
              {selectedIndex === servers.length ? '▶ ' : '  '}+ Add new server
            </Text>
          </Box>
        </Box>
      )}

      {view === 'tools' && selectedServer && (() => {
        const config = getCurrentProjectConfig();
        const server = config.mcpServers?.[selectedServer];
        const filteredTools = tools.filter(tool => tool.name.startsWith(`mcp__${selectedServer}__`));
        const selectedTool = filteredTools[selectedToolIndex];

        // Calculate scrolling window for tools list
        const VISIBLE_TOOLS = 10;
        const getVisibleWindow = (selectedIdx: number, totalTools: number) => {
          const halfWindow = Math.floor(VISIBLE_TOOLS / 2);
          let start = Math.max(0, selectedIdx - halfWindow);
          let end = Math.min(totalTools, start + VISIBLE_TOOLS);
          if (end - start < VISIBLE_TOOLS) {
            start = Math.max(0, end - VISIBLE_TOOLS);
          }
          return { start, end };
        };

        const window = getVisibleWindow(selectedToolIndex, filteredTools.length);
        const visibleTools = filteredTools.slice(window.start, window.end);

        // Get selected tool details
        const selectedToolShortName = selectedTool ? selectedTool.name.replace(`mcp__${selectedServer}__`, '') : '';
        const isSelectedDisabled = server?.disabledTools?.includes(selectedToolShortName) || false;
        const selectedToolDescription = selectedTool
          ? (toolDescriptions[selectedTool.name] || (loadingDescriptions ? 'Loading...' : 'No description available'))
          : '';

        // Split description into sections - filter out empty lines
        const descriptionLines = selectedToolDescription.split('\n').filter(line => line.trim().length > 0 || line === '');

        // Calculate pane widths (25% left, 75% right)
        const leftPaneWidth = Math.floor(width * 0.25);
        const rightPaneWidth = width - leftPaneWidth - 2; // -2 for spacing

        return (
          <Box flexDirection="column">
            <Text color={DIM_WHITE}>↑↓ navigate, Space toggle, Enter/i expand, Q quit</Text>
            {loadingDescriptions && <Text color={YELLOW}>Loading descriptions...</Text>}

            <Box flexDirection="row">
              {/* Left pane - Tool list */}
              <Box flexDirection="column" width={leftPaneWidth} marginRight={2}>
                <Text color={PURPLE} bold>Tools</Text>
                {visibleTools.map((tool, idx) => {
                  const actualIndex = window.start + idx;
                  const isSelected = actualIndex === selectedToolIndex;
                  const toolShortName = tool.name.replace(`mcp__${selectedServer}__`, '');
                  const isDisabled = server?.disabledTools?.includes(toolShortName) || false;

                  // Truncate tool name if too long
                  const maxNameLength = leftPaneWidth - 6;
                  const displayName = toolShortName.length > maxNameLength
                    ? toolShortName.slice(0, maxNameLength - 3) + '...'
                    : toolShortName;

                  return (
                    <Box key={tool.name}>
                      <Text color={isSelected ? CYAN : (isDisabled ? DIM_WHITE : WHITE)} bold={isSelected}>
                        {isSelected ? '▶ ' : '  '}
                        <Text color={isDisabled ? DIM_WHITE : GREEN}>{isDisabled ? '○' : '●'}</Text>
                        {' '}{displayName}
                      </Text>
                    </Box>
                  );
                })}
              </Box>

              {/* Right pane - Tool details */}
              <Box flexDirection="column" width={rightPaneWidth}>
                {selectedTool ? (
                  <>
                    <Text color={CYAN} bold>{selectedToolShortName} <Text color={isSelectedDisabled ? RED : GREEN}>{isSelectedDisabled ? '[OFF]' : '[ON]'}</Text></Text>
                    <Box flexDirection="column">
                      {(() => {
                        const isExpanded = expandedTool === selectedTool.name;

                        // Separate description from parameters
                        const paramStartIdx = descriptionLines.findIndex(line =>
                          line.startsWith('Required parameters:') || line.startsWith('Parameters:')
                        );

                        const descLines = paramStartIdx >= 0 ? descriptionLines.slice(0, paramStartIdx) : descriptionLines;
                        const paramLines = paramStartIdx >= 0 ? descriptionLines.slice(paramStartIdx) : [];

                        // Truncate description if not expanded
                        const displayDescLines = isExpanded ? descLines : descLines.slice(0, 2);
                        const isTruncated = descLines.length > 2 && !isExpanded;

                        return (
                          <>
                            {/* Description */}
                            {displayDescLines.map((line, idx) => {
                              if (line.trim().length === 0) return null;

                              // Simple truncation for long lines
                              const displayLine = line.length > rightPaneWidth
                                ? line.slice(0, rightPaneWidth - 3) + '...'
                                : line;

                              return (
                                <Text key={idx} color={WHITE}>
                                  {displayLine}
                                </Text>
                              );
                            })}

                            {/* Truncation indicator */}
                            {isTruncated && (
                              <Text color={DIM_WHITE}>... <Text color={CYAN}>Press Enter/i for more</Text></Text>
                            )}

                            {/* Parameters - only show if expanded */}
                            {isExpanded && paramLines.length > 0 && (
                              <>
                                <Text color={DIM_WHITE}>─────</Text>
                                {paramLines.map((line, idx) => {
                                  if (line.trim().length === 0) return null;

                                  const isHeader = line.startsWith('Required parameters:') || line.startsWith('Parameters:');
                                  const isParameter = line.startsWith('- ');

                                  // Truncate long parameter descriptions
                                  const displayLine = line.length > rightPaneWidth
                                    ? line.slice(0, rightPaneWidth - 3) + '...'
                                    : line;

                                  return (
                                    <Text key={`param-${idx}`} color={isHeader ? PURPLE : isParameter ? CYAN : DIM_WHITE}>
                                      {displayLine}
                                    </Text>
                                  );
                                })}
                              </>
                            )}

                            {/* Show parameter summary if collapsed */}
                            {!isExpanded && paramLines.length > 0 && (
                              <Text color={DIM_WHITE}>
                                Parameters: {paramLines.filter(l => l.startsWith('- ')).length} available
                              </Text>
                            )}
                          </>
                        );
                      })()}
                    </Box>
                  </>
                ) : (
                  <Text color={DIM_WHITE}>No tool selected</Text>
                )}
              </Box>
            </Box>
          </Box>
        );
      })()}

      {view === 'add-type' && (
        <Box flexDirection="column">
          <Text color={CYAN}>Select Server Type - Esc to cancel</Text>
          <Text color={WHITE}>1. stdio - Local command (node, python, etc.)</Text>
          <Text color={WHITE}>2. sse - HTTP/SSE server</Text>
        </Box>
      )}

      {view === 'add' && (
        <Box flexDirection="column">
          <Text color={CYAN}>Add New {newServer.type.toUpperCase()} Server - ↑↓ navigate, Ctrl+S submit, Esc cancel</Text>
          <Box>
            <Text color={inputField === 'name' ? CYAN : DIM_WHITE} bold={inputField === 'name'}>
              {inputField === 'name' ? '▶ ' : '  '}Name:
            </Text>
            {inputField === 'name' ? (
              <TextInput
                value={inputValue}
                onChange={(val) => setInputValue(val)}
                onSubmit={(val) => {
                  setNewServer({ ...newServer, name: val });
                  setInputValue('');
                  if (newServer.type === 'stdio') {
                    setInputField('command');
                  } else {
                    setInputField('url');
                  }
                }}
              />
            ) : (
              <Text color={WHITE}>{newServer.name || '(empty)'}</Text>
            )}
          </Box>

          {newServer.type === 'stdio' && (
            <>
              <Box>
                <Text color={inputField === 'command' ? CYAN : DIM_WHITE} bold={inputField === 'command'}>
                  {inputField === 'command' ? '▶ ' : '  '}Command:
                </Text>
                {inputField === 'command' ? (
                  <TextInput
                    value={inputValue}
                    onChange={(val) => setInputValue(val)}
                    onSubmit={(val) => {
                      setNewServer({ ...newServer, command: val });
                      setInputValue('');
                      setInputField('args');
                    }}
                  />
                ) : (
                  <Text color={WHITE}>{newServer.command || '(empty)'}</Text>
                )}
              </Box>

              <Box>
                <Text color={inputField === 'args' ? CYAN : DIM_WHITE} bold={inputField === 'args'}>
                  {inputField === 'args' ? '▶ ' : '  '}Args:
                </Text>
                {inputField === 'args' ? (
                  <TextInput
                    value={inputValue}
                    onChange={(val) => setInputValue(val)}
                    onSubmit={(val) => {
                      const args = val.trim() ? val.split(',').map(a => a.trim()) : [];
                      setNewServer({ ...newServer, args });
                      setInputValue('');
                      addServer();
                    }}
                  />
                ) : (
                  <Text color={WHITE}>{newServer.args.length > 0 ? newServer.args.join(', ') : '(none)'}</Text>
                )}
              </Box>
            </>
          )}

          {newServer.type === 'sse' && (
            <Box>
              <Text color={inputField === 'url' ? CYAN : DIM_WHITE} bold={inputField === 'url'}>
                {inputField === 'url' ? '▶ ' : '  '}URL:
              </Text>
              {inputField === 'url' ? (
                <TextInput
                  value={inputValue}
                  onChange={(val) => setInputValue(val)}
                  onSubmit={(val) => {
                    setNewServer({ ...newServer, url: val });
                    setInputValue('');
                    addServer();
                  }}
                />
              ) : (
                <Text color={WHITE}>{newServer.url || '(empty)'}</Text>
              )}
            </Box>
          )}

          <Text color={DIM_WHITE}>
              {inputField === 'name' && 'Enter server name (e.g., my-server)'}
              {inputField === 'command' && 'Enter command (e.g., node, python3, npx)'}
              {inputField === 'args' && 'Enter comma-separated args (e.g., server.js, --port, 8080) or leave empty'}
              {inputField === 'url' && 'Enter SSE server URL (e.g., http://localhost:3000/sse)'}
          </Text>
        </Box>
      )}
    </Box>
  );
};
