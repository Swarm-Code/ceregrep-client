/**
 * MCP Manager Component (Redesigned)
 * Arrow-key navigable MCP server management
 */

import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import {
  listMCPServers,
  testMCPServer,
  disconnectAllServers,
  connectToAllServers,
  getMCPTools
} from '../../mcp/client.js';
import { MCPServerConfig } from '../../config/schema.js';
import { getCurrentProjectConfig, saveCurrentProjectConfig } from '../../config/loader.js';
import { SelectList, SelectListItem, SelectListAction } from './common/SelectList.js';
import { FormEditor, FormField } from './common/FormEditor.js';
import { Modal } from './common/Modal.js';

interface MCPManagerProps {
  onCancel: () => void;
  onServerChange?: () => void;
}

// Color constants
const CYAN = '#22D3EE';
const WHITE = '#FFFFFF';
const DIM_WHITE = '#9CA3AF';
const GREEN = '#10B981';
const RED = '#EF4444';
const YELLOW = '#F59E0B';
const PURPLE = '#A855F7';

type View = 'list' | 'add' | 'edit' | 'tools';
type ServerType = 'stdio' | 'sse';

interface ServerStatus {
  name: string;
  config: MCPServerConfig;
  status: 'connected' | 'failed';
  error?: string;
  toolCount?: number;
}

interface ModalState {
  show: boolean;
  type: 'confirm' | 'alert' | 'error' | 'success';
  title: string;
  message: string;
  onConfirm?: () => void;
}

export const MCPManager: React.FC<MCPManagerProps> = ({ onCancel, onServerChange }) => {
  const [view, setView] = useState<View>('list');
  const [servers, setServers] = useState<ServerStatus[]>([]);
  const [selectedServerName, setSelectedServerName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [tools, setTools] = useState<any[]>([]);
  const [modal, setModal] = useState<ModalState>({
    show: false,
    type: 'alert',
    title: '',
    message: '',
  });

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

  const handleListAction = async (key: string, item?: SelectListItem, index?: number) => {
    switch (key.toLowerCase()) {
      case 'a': // Add new server
        setView('add');
        break;

      case 'd': // Delete server
        if (item) {
          setModal({
            show: true,
            type: 'confirm',
            title: 'Delete Server',
            message: `Are you sure you want to delete "${item.label}"?`,
            onConfirm: () => deleteServer(item.id),
          });
        }
        break;

      case 't': // Toggle server enabled/disabled
        if (item) {
          toggleServer(item.id);
        }
        break;

      case 'o': // Configure tools
        if (item && item.id !== '__add__') {
          setSelectedServerName(item.id);
          setView('tools');
        }
        break;

      case 'c': // Test connection
        if (item && item.id !== '__add__') {
          testServer(item.id);
        }
        break;

      case 'r': // Refresh/reload
        loadServers();
        break;

      case 'q': // Quit
        onCancel();
        break;
    }
  };

  const handleSelectServer = (item: SelectListItem) => {
    setSelectedServerName(item.id);
    setView('edit');
  };

  const deleteServer = async (serverName: string) => {
    const config = getCurrentProjectConfig();
    if (config.mcpServers) {
      delete config.mcpServers[serverName];
      saveCurrentProjectConfig(config);
      await loadServers();
      setModal({ ...modal, show: false });
      setMessage(`Server "${serverName}" deleted`);
      setTimeout(() => setMessage(null), 2000);
      onServerChange?.();
    }
  };

  const toggleServer = async (serverName: string) => {
    const config = getCurrentProjectConfig();
    if (config.mcpServers?.[serverName]) {
      config.mcpServers[serverName] = {
        ...config.mcpServers[serverName],
        disabled: !config.mcpServers[serverName].disabled,
      };
      saveCurrentProjectConfig(config);
      await loadServers();
      setMessage(`Server "${serverName}" ${config.mcpServers[serverName].disabled ? 'disabled' : 'enabled'}`);
      setTimeout(() => setMessage(null), 2000);
      onServerChange?.();
    }
  };

  const addServer = async (values: Record<string, any>) => {
    const config = getCurrentProjectConfig();
    if (!config.mcpServers) {
      config.mcpServers = {};
    }

    // Check if server already exists
    if (config.mcpServers[values.name]) {
      setModal({
        show: true,
        type: 'error',
        title: 'Error',
        message: `Server "${values.name}" already exists`,
        onConfirm: () => setModal({ ...modal, show: false }),
      });
      return;
    }

    // Create server config based on type
    const serverConfig: MCPServerConfig = values.type === 'stdio'
      ? {
          type: 'stdio',
          command: values.command,
          args: values.args ? values.args.split(' ').filter(Boolean) : [],
          env: {},
          disabled: false,
          disabledTools: [],
        }
      : {
          type: 'sse',
          url: values.url,
          headers: {},
          disabled: false,
          disabledTools: [],
        };

    config.mcpServers[values.name] = serverConfig;
    saveCurrentProjectConfig(config);
    await loadServers();
    setView('list');
    setMessage(`Server "${values.name}" added successfully`);
    setTimeout(() => setMessage(null), 2000);
    onServerChange?.();
  };

  const updateServer = async (values: Record<string, any>) => {
    if (!selectedServerName) return;

    const config = getCurrentProjectConfig();
    if (!config.mcpServers?.[selectedServerName]) return;

    // Update server config
    const serverConfig: MCPServerConfig = values.type === 'stdio'
      ? {
          type: 'stdio',
          command: values.command,
          args: values.args ? values.args.split(' ').filter(Boolean) : [],
          env: config.mcpServers[selectedServerName].type === 'stdio'
            ? config.mcpServers[selectedServerName].env || {}
            : {},
          disabled: config.mcpServers[selectedServerName].disabled ?? false,
          disabledTools: config.mcpServers[selectedServerName].disabledTools ?? [],
        }
      : {
          type: 'sse',
          url: values.url,
          headers: config.mcpServers[selectedServerName].type === 'sse'
            ? config.mcpServers[selectedServerName].headers || {}
            : {},
          disabled: config.mcpServers[selectedServerName].disabled ?? false,
          disabledTools: config.mcpServers[selectedServerName].disabledTools ?? [],
        };

    config.mcpServers[selectedServerName] = serverConfig;
    saveCurrentProjectConfig(config);
    await loadServers();
    setView('list');
    setMessage(`Server "${selectedServerName}" updated`);
    setTimeout(() => setMessage(null), 2000);
    onServerChange?.();
  };

  const toggleTool = async (toolName: string) => {
    if (!selectedServerName) return;

    const config = getCurrentProjectConfig();
    if (!config.mcpServers?.[selectedServerName]) return;

    const server = config.mcpServers[selectedServerName];
    const disabledTools = server.disabledTools ?? [];
    const toolIndex = disabledTools.indexOf(toolName);

    if (toolIndex === -1) {
      // Tool is currently enabled, disable it
      server.disabledTools = [...disabledTools, toolName];
    } else {
      // Tool is currently disabled, enable it
      server.disabledTools = disabledTools.filter((t) => t !== toolName);
    }

    saveCurrentProjectConfig(config);
    await loadServers();
    setMessage(`Tool "${toolName}" ${toolIndex === -1 ? 'disabled' : 'enabled'}`);
    setTimeout(() => setMessage(null), 2000);
    onServerChange?.();
  };

  const testServer = async (serverName: string) => {
    const config = getCurrentProjectConfig();
    const serverConfig = config.mcpServers?.[serverName];

    if (!serverConfig) {
      setModal({
        show: true,
        type: 'error',
        title: 'Server Not Found',
        message: `Server "${serverName}" not found in configuration.`,
        onConfirm: () => setModal({ ...modal, show: false }),
      });
      return;
    }

    setLoading(true);
    setMessage(`Testing connection to "${serverName}"...`);

    try {
      const result = await testMCPServer(serverName, serverConfig);

      if (result.success) {
        setModal({
          show: true,
          type: 'success',
          title: 'Connection Successful',
          message: `Successfully connected to "${serverName}".\n\nTools available: ${result.toolCount || 0}`,
          onConfirm: () => setModal({ ...modal, show: false }),
        });
      } else {
        setModal({
          show: true,
          type: 'error',
          title: 'Connection Failed',
          message: `Failed to connect to "${serverName}".\n\nError: ${result.message || 'Unknown error'}`,
          onConfirm: () => setModal({ ...modal, show: false }),
        });
      }
    } catch (error) {
      setModal({
        show: true,
        type: 'error',
        title: 'Connection Failed',
        message: `Failed to test connection to "${serverName}".\n\nError: ${error instanceof Error ? error.message : String(error)}`,
        onConfirm: () => setModal({ ...modal, show: false }),
      });
    }

    setLoading(false);
    setMessage(null);
  };

  // Convert servers to SelectList items
  const getServerListItems = (): SelectListItem[] => {
    const items: SelectListItem[] = servers.map((server) => {
      const isDisabled = server.config.disabled;
      const isConnected = server.status === 'connected';
      const toolCount = server.toolCount || 0;
      const disabledToolCount = server.config.disabledTools?.length || 0;

      return {
        id: server.name,
        label: server.name,
        description: isDisabled ? 'Disabled' : `${toolCount} tools${disabledToolCount > 0 ? `, ${disabledToolCount} disabled` : ''}`,
        status: isDisabled ? 'inactive' : isConnected ? 'active' : 'error',
        statusText: isDisabled ? '' : isConnected ? '✓ Connected' : '✗ Disconnected',
        badge: server.config.type.toUpperCase(),
      };
    });

    // Add "Add new server" item
    items.push({
      id: '__add__',
      label: '+ Add New Server',
      icon: '',
    });

    return items;
  };

  const listActions: SelectListAction[] = [
    { key: '↑↓', label: '↑↓', description: 'Navigate' },
    { key: 'Enter', label: 'Enter', description: 'View/Edit' },
    { key: 'A', label: 'A', description: 'Add' },
    { key: 'O', label: 'O', description: 'Tools' },
    { key: 'C', label: 'C', description: 'Test' },
    { key: 'T', label: 'T', description: 'Toggle' },
    { key: 'D', label: 'D', description: 'Delete' },
    { key: 'R', label: 'R', description: 'Refresh' },
    { key: 'Q', label: 'Q', description: 'Back' },
  ];

  // Render based on view
  if (loading && servers.length === 0) {
    return (
      <Box>
        <Text color={CYAN} bold>
          ◉ Loading MCP servers...
        </Text>
      </Box>
    );
  }

  if (modal.show) {
    return (
      <Modal
        type={modal.type}
        title={modal.title}
        message={modal.message}
        onConfirm={modal.onConfirm || (() => setModal({ ...modal, show: false }))}
        onCancel={() => setModal({ ...modal, show: false })}
      />
    );
  }

  if (view === 'list') {
    return (
      <Box flexDirection="column">
        {message && (
          <Box marginBottom={1}>
            <Text color={CYAN}>ℹ {message}</Text>
          </Box>
        )}
        <SelectList
          title="MCP SERVERS"
          items={getServerListItems()}
          actions={listActions}
          onSelect={(item) => {
            if (item.id === '__add__') {
              setView('add');
            } else {
              handleSelectServer(item);
            }
          }}
          onAction={handleListAction}
          onCancel={onCancel}
        />
      </Box>
    );
  }

  if (view === 'add') {
    const addFields: FormField[] = [
      {
        name: 'name',
        label: 'Server Name',
        type: 'text',
        value: '',
        required: true,
        placeholder: 'e.g., my-mcp-server',
        validation: (value) => {
          if (!value) return 'Server name is required';
          if (!/^[a-z0-9-]+$/.test(value)) return 'Only lowercase letters, numbers, and hyphens allowed';
          return null;
        },
      },
      {
        name: 'type',
        label: 'Server Type',
        type: 'radio',
        value: 'stdio',
        required: true,
        options: [
          { label: 'stdio (Process)', value: 'stdio' },
          { label: 'sse (HTTP)', value: 'sse' },
        ],
      },
      {
        name: 'command',
        label: 'Command (stdio only)',
        type: 'text',
        value: '',
        placeholder: 'e.g., npx -y @modelcontextprotocol/server-filesystem',
      },
      {
        name: 'args',
        label: 'Arguments (stdio only, space-separated)',
        type: 'text',
        value: '',
        placeholder: 'e.g., /path/to/directory',
      },
      {
        name: 'url',
        label: 'URL (sse only)',
        type: 'text',
        value: '',
        placeholder: 'e.g., http://localhost:3000',
      },
    ];

    return (
      <FormEditor
        title="ADD MCP SERVER"
        fields={addFields}
        onSubmit={addServer}
        onCancel={() => setView('list')}
      />
    );
  }

  if (view === 'edit' && selectedServerName) {
    const server = servers.find((s) => s.name === selectedServerName);
    if (!server) {
      setView('list');
      return null;
    }

    const editFields: FormField[] = [
      {
        name: 'type',
        label: 'Server Type',
        type: 'radio',
        value: server.config.type,
        required: true,
        options: [
          { label: 'stdio (Process)', value: 'stdio' },
          { label: 'sse (HTTP)', value: 'sse' },
        ],
      },
    ];

    if (server.config.type === 'stdio') {
      editFields.push(
        {
          name: 'command',
          label: 'Command',
          type: 'text',
          value: server.config.command || '',
          required: true,
          placeholder: 'e.g., npx -y @modelcontextprotocol/server-filesystem',
        },
        {
          name: 'args',
          label: 'Arguments (space-separated)',
          type: 'text',
          value: server.config.args?.join(' ') || '',
          placeholder: 'e.g., /path/to/directory',
        }
      );
    } else {
      editFields.push({
        name: 'url',
        label: 'URL',
        type: 'text',
        value: server.config.url || '',
        required: true,
        placeholder: 'e.g., http://localhost:3000',
      });
    }

    return (
      <FormEditor
        title={`EDIT MCP SERVER: ${selectedServerName}`}
        fields={editFields}
        onSubmit={updateServer}
        onCancel={() => setView('list')}
      />
    );
  }

  if (view === 'tools' && selectedServerName) {
    const server = servers.find((s) => s.name === selectedServerName);
    if (!server) {
      setView('list');
      return null;
    }

    // Get tools for this server
    const serverTools = tools.filter((tool) => {
      // Check if tool belongs to this server
      const toolServerName = tool.server || tool.serverName;
      return toolServerName === selectedServerName;
    });

    const disabledTools = server.config.disabledTools ?? [];

    const toolsListItems: SelectListItem[] = serverTools.map((tool) => {
      const isDisabled = disabledTools.includes(tool.name);
      return {
        id: tool.name,
        label: tool.name,
        description: tool.description || 'No description',
        status: isDisabled ? 'inactive' : 'active',
        statusText: isDisabled ? '☐ Disabled' : '☑ Enabled',
      };
    });

    const toolsActions: SelectListAction[] = [
      { key: '↑↓', label: '↑↓', description: 'Navigate' },
      { key: 'Space', label: 'Space', description: 'Toggle' },
      { key: 'Q', label: 'Q', description: 'Back' },
    ];

    return (
      <Box flexDirection="column">
        {message && (
          <Box marginBottom={1}>
            <Text color={CYAN}>ℹ {message}</Text>
          </Box>
        )}
        <SelectList
          title={`TOOLS: ${selectedServerName}`}
          items={toolsListItems}
          actions={toolsActions}
          emptyMessage="No tools available for this server"
          onSelect={(item) => {
            // Toggle tool on select
            toggleTool(item.id);
          }}
          onAction={(key, item) => {
            if (key === ' ' && item) {
              // Space to toggle
              toggleTool(item.id);
            } else if (key.toLowerCase() === 'q') {
              setView('list');
              setSelectedServerName(null);
            }
          }}
          onCancel={() => {
            setView('list');
            setSelectedServerName(null);
          }}
        />
      </Box>
    );
  }

  return null;
};
