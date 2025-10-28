/**
 * Agent Manager Component
 * Arrow-key navigable agent management for global and project scopes
 */

import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import {
  listAgents,
  createAgent,
  updateAgent,
  deleteAgent,
  getAgent,
  AgentScope,
} from '../../agents/manager.js';
import { AgentConfig } from '../../agents/schema.js';
import { SelectList, SelectListItem, SelectListAction } from './common/SelectList.js';
import { FormEditor, FormField } from './common/FormEditor.js';
import { Modal } from './common/Modal.js';
import { getMCPTools } from '../../mcp/client.js';

interface AgentManagerProps {
  currentAgentId?: string | undefined;
  onSwitchAgent?: (agentId: string | undefined) => void;
  onCancel: () => void;
  onAgentChange?: () => void;
}

// Color constants
const CYAN = '#22D3EE';
const WHITE = '#FFFFFF';
const DIM_WHITE = '#9CA3AF';
const GREEN = '#10B981';
const RED = '#EF4444';
const YELLOW = '#F59E0B';
const PURPLE = '#A855F7';
const BLUE = '#4169E1';

type View = 'list' | 'add' | 'edit' | 'tools' | 'mcpServers' | 'systemPrompt';

interface AgentWithScopeInfo {
  config: AgentConfig;
  scope: AgentScope;
}

interface ModalState {
  show: boolean;
  type: 'confirm' | 'alert' | 'error' | 'success';
  title: string;
  message: string;
  onConfirm?: () => void;
}

export const AgentManager: React.FC<AgentManagerProps> = ({ currentAgentId, onSwitchAgent, onCancel, onAgentChange }) => {
  const [view, setView] = useState<View>('list');
  const [globalAgents, setGlobalAgents] = useState<AgentConfig[]>([]);
  const [projectAgents, setProjectAgents] = useState<AgentConfig[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [selectedScope, setSelectedScope] = useState<AgentScope | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>({
    show: false,
    type: 'alert',
    title: '',
    message: '',
  });
  const [mcpTools, setMcpTools] = useState<any[]>([]);

  // Load agents on mount
  useEffect(() => {
    loadAgents();
  }, []);

  // Handle keyboard input for system prompt view
  useInput((input, key) => {
    if (view === 'systemPrompt') {
      if (key.escape || input.toLowerCase() === 'q') {
        setView('list');
        setSelectedAgentId(null);
      }
    }
  });

  const loadAgents = async () => {
    setLoading(true);
    try {
      const agents = await listAgents();
      setGlobalAgents(agents.global);
      setProjectAgents(agents.project);

      // Load MCP tools
      const tools = await getMCPTools();
      setMcpTools(tools);
    } catch (error) {
      setMessage(`Error loading agents: ${error instanceof Error ? error.message : String(error)}`);
    }
    setLoading(false);
  };

  // Helper function to extract the real agent ID from the list item ID
  // List items have format "id__global" or "id__project" to ensure unique keys
  const getAgentId = (itemId: string): string => {
    if (itemId === '__add__') return itemId;
    // Remove the scope suffix if present
    return itemId.replace(/__(?:global|project)$/, '');
  };

  const handleListAction = async (key: string, item?: SelectListItem, index?: number) => {
    switch (key.toLowerCase()) {
      case 'a': // Add new agent
        setView('add');
        break;

      case 'd': // Delete agent
        if (item && item.id !== '__add__') {
          const agentId = getAgentId(item.id);
          setModal({
            show: true,
            type: 'confirm',
            title: 'Delete Agent',
            message: `Are you sure you want to delete "${item.label}"?`,
            onConfirm: () => deleteAgentHandler(agentId),
          });
        }
        break;

      case 'e': // Export agent
        if (item && item.id !== '__add__') {
          const agentId = getAgentId(item.id);
          exportAgentHandler(agentId);
        }
        break;

      case 'i': // Import agent
        setView('add'); // For now, just go to add view
        // TODO: Implement file picker for import
        setMessage('Import feature: Use add form, then manually paste JSON config');
        setTimeout(() => setMessage(null), 3000);
        break;

      case 'p': // Edit system prompt
        if (item && item.id !== '__add__') {
          const agentId = getAgentId(item.id);
          const isGlobal = globalAgents.some(a => a.id === agentId);
          setSelectedAgentId(agentId);
          setSelectedScope(isGlobal ? 'global' : 'project');
          setView('systemPrompt');
        }
        break;

      case 't': // Configure tools
        if (item && item.id !== '__add__') {
          const agentId = getAgentId(item.id);
          const isGlobal = globalAgents.some(a => a.id === agentId);
          setSelectedAgentId(agentId);
          setSelectedScope(isGlobal ? 'global' : 'project');
          setView('tools');
        }
        break;

      case 'm': // Configure MCP servers
        if (item && item.id !== '__add__') {
          const agentId = getAgentId(item.id);
          const isGlobal = globalAgents.some(a => a.id === agentId);
          setSelectedAgentId(agentId);
          setSelectedScope(isGlobal ? 'global' : 'project');
          setView('mcpServers');
        }
        break;

      case 'r': // Refresh/reload
        loadAgents();
        break;

      case 'q': // Quit
        onCancel();
        break;
    }
  };

  const handleSelectAgent = (item: SelectListItem) => {
    if (item.id === '__add__') {
      setView('add');
      return;
    }

    const agentId = getAgentId(item.id);
    // Check if this is the currently active agent
    const isActive = agentId === currentAgentId;

    if (isActive) {
      // Active agent: go to edit view
      const isGlobal = globalAgents.some(a => a.id === agentId);
      setSelectedAgentId(agentId);
      setSelectedScope(isGlobal ? 'global' : 'project');
      setView('edit');
    } else {
      // Inactive agent: switch to it
      if (onSwitchAgent) {
        onSwitchAgent(agentId);
        setMessage(`Switched to agent: ${item.label}`);
        setTimeout(() => setMessage(null), 2000);
        // Stay in list view to show new active state
      }
    }
  };

  const deleteAgentHandler = async (agentId: string) => {
    try {
      await deleteAgent(agentId);
      await loadAgents();
      setModal({ ...modal, show: false });
      setMessage(`Agent "${agentId}" deleted`);
      setTimeout(() => setMessage(null), 2000);
      onAgentChange?.();
    } catch (error) {
      setModal({
        show: true,
        type: 'error',
        title: 'Delete Failed',
        message: `Failed to delete agent: ${error instanceof Error ? error.message : String(error)}`,
        onConfirm: () => setModal({ ...modal, show: false }),
      });
    }
  };

  const exportAgentHandler = async (agentId: string) => {
    try {
      const agent = await getAgent(agentId);
      if (!agent) {
        setModal({
          show: true,
          type: 'error',
          title: 'Export Failed',
          message: `Agent "${agentId}" not found.`,
          onConfirm: () => setModal({ ...modal, show: false }),
        });
        return;
      }

      const exportPath = `./${agentId}.agent.json`;
      const fs = await import('fs/promises');
      await fs.writeFile(exportPath, JSON.stringify(agent.config, null, 2), 'utf-8');

      setModal({
        show: true,
        type: 'success',
        title: 'Export Successful',
        message: `Agent "${agentId}" exported to:\n${exportPath}`,
        onConfirm: () => setModal({ ...modal, show: false }),
      });
    } catch (error) {
      setModal({
        show: true,
        type: 'error',
        title: 'Export Failed',
        message: `Failed to export agent: ${error instanceof Error ? error.message : String(error)}`,
        onConfirm: () => setModal({ ...modal, show: false }),
      });
    }
  };

  const addAgentHandler = async (values: Record<string, any>) => {
    try {
      const scope: AgentScope = values.scope;
      await createAgent(
        {
          id: values.id,
          name: values.name,
          description: values.description,
          systemPrompt: values.systemPrompt || '# Agent System Prompt\n\nWrite your system prompt here...',
          systemPromptMode: values.systemPromptMode || 'replace',
          tools: {},
          mcpServers: {},
        },
        scope,
        process.cwd()
      );
      await loadAgents();
      setView('list');
      setMessage(`Agent "${values.name}" created successfully`);
      setTimeout(() => setMessage(null), 2000);
      onAgentChange?.();
    } catch (error) {
      setModal({
        show: true,
        type: 'error',
        title: 'Create Failed',
        message: `Failed to create agent: ${error instanceof Error ? error.message : String(error)}`,
        onConfirm: () => setModal({ ...modal, show: false }),
      });
    }
  };

  const updateAgentHandler = async (values: Record<string, any>) => {
    if (!selectedAgentId) return;

    try {
      await updateAgent(selectedAgentId, {
        name: values.name,
        description: values.description,
        systemPromptMode: values.systemPromptMode,
      });
      await loadAgents();
      setView('list');
      setMessage(`Agent "${selectedAgentId}" updated`);
      setTimeout(() => setMessage(null), 2000);
      onAgentChange?.();
    } catch (error) {
      setModal({
        show: true,
        type: 'error',
        title: 'Update Failed',
        message: `Failed to update agent: ${error instanceof Error ? error.message : String(error)}`,
        onConfirm: () => setModal({ ...modal, show: false }),
      });
    }
  };

  // Convert agents to SelectList items
  const getAgentListItems = (): SelectListItem[] => {
    const items: SelectListItem[] = [];

    // Track seen agent IDs to prevent duplicates (project scope takes precedence)
    const seenIds = new Set<string>();

    // Add project agents first (they take precedence over global)
    projectAgents.forEach((agent) => {
      seenIds.add(agent.id);
      const isActive = agent.id === currentAgentId;
      items.push({
        id: `${agent.id}__project`,  // Unique key combining ID and scope
        label: agent.name,
        description: agent.description,
        badge: isActive ? 'ACTIVE' : 'PROJECT',
        icon: isActive ? '●' : '',
        status: isActive ? 'active' : undefined,
      });
    });

    // Add global agents (skip if already in project)
    globalAgents.forEach((agent) => {
      if (!seenIds.has(agent.id)) {
        const isActive = agent.id === currentAgentId;
        items.push({
          id: `${agent.id}__global`,  // Unique key combining ID and scope
          label: agent.name,
          description: agent.description,
          badge: isActive ? 'ACTIVE' : 'GLOBAL',
          icon: isActive ? '●' : '',
          status: isActive ? 'active' : undefined,
        });
      }
    });

    // Add "Add new agent" item
    items.push({
      id: '__add__',
      label: '+ Add New Agent',
      icon: '',
    });

    return items;
  };

  const listActions: SelectListAction[] = [
    { key: '↑↓', label: '↑↓', description: 'Navigate' },
    { key: 'Enter', label: 'Enter', description: 'Switch/Edit' },
    { key: 'A', label: 'A', description: 'Add' },
    { key: 'P', label: 'P', description: 'Prompt' },
    { key: 'T', label: 'T', description: 'Tools' },
    { key: 'M', label: 'M', description: 'MCPs' },
    { key: 'D', label: 'D', description: 'Delete' },
    { key: 'E', label: 'E', description: 'Export' },
    { key: 'I', label: 'I', description: 'Import' },
    { key: 'R', label: 'R', description: 'Refresh' },
    { key: 'Q', label: 'Q', description: 'Back' },
  ];

  // Render based on view
  if (loading && globalAgents.length === 0 && projectAgents.length === 0) {
    return (
      <Box>
        <Text color={CYAN} bold>
          ◉ Loading agents...
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
          title="AGENTS"
          items={getAgentListItems()}
          actions={listActions}
          onSelect={handleSelectAgent}
          onAction={handleListAction}
          onCancel={onCancel}
        />
      </Box>
    );
  }

  if (view === 'add') {
    const addFields: FormField[] = [
      {
        name: 'id',
        label: 'Agent ID',
        type: 'text',
        value: '',
        required: true,
        placeholder: 'e.g., my-custom-agent',
        validation: (value) => {
          if (!value) return 'Agent ID is required';
          if (!/^[a-z0-9-]+$/.test(value)) return 'Only lowercase letters, numbers, and hyphens allowed';
          return null;
        },
      },
      {
        name: 'name',
        label: 'Agent Name',
        type: 'text',
        value: '',
        required: true,
        placeholder: 'e.g., My Custom Agent',
      },
      {
        name: 'description',
        label: 'Description',
        type: 'text',
        value: '',
        required: true,
        placeholder: 'e.g., A specialized agent for...',
      },
      {
        name: 'scope',
        label: 'Scope',
        type: 'radio',
        value: 'project',
        required: true,
        options: [
          { label: 'Project (current project only)', value: 'project' },
          { label: 'Global (all projects)', value: 'global' },
        ],
      },
      {
        name: 'systemPromptMode',
        label: 'System Prompt Mode',
        type: 'radio',
        value: 'replace',
        required: true,
        options: [
          { label: 'Replace (override base prompt)', value: 'replace' },
          { label: 'Append (add to base prompt)', value: 'append' },
        ],
      },
    ];

    return (
      <FormEditor
        title="ADD AGENT"
        fields={addFields}
        onSubmit={addAgentHandler}
        onCancel={() => setView('list')}
      />
    );
  }

  if (view === 'edit' && selectedAgentId) {
    const agent = [...globalAgents, ...projectAgents].find((a) => a.id === selectedAgentId);
    if (!agent) {
      setView('list');
      return null;
    }

    const editFields: FormField[] = [
      {
        name: 'name',
        label: 'Agent Name',
        type: 'text',
        value: agent.name,
        required: true,
      },
      {
        name: 'description',
        label: 'Description',
        type: 'text',
        value: agent.description,
        required: true,
      },
      {
        name: 'systemPromptMode',
        label: 'System Prompt Mode',
        type: 'radio',
        value: agent.systemPromptMode,
        required: true,
        options: [
          { label: 'Replace (override base prompt)', value: 'replace' },
          { label: 'Append (add to base prompt)', value: 'append' },
        ],
      },
    ];

    return (
      <FormEditor
        title={`EDIT AGENT: ${agent.name}`}
        fields={editFields}
        onSubmit={updateAgentHandler}
        onCancel={() => setView('list')}
      />
    );
  }

  // System prompt editor view
  if (view === 'systemPrompt' && selectedAgentId) {
    const agent = [...globalAgents, ...projectAgents].find((a) => a.id === selectedAgentId);
    if (!agent) {
      setView('list');
      return null;
    }

    const lines = agent.systemPrompt.split('\n');
    const lineCount = lines.length;
    const charCount = agent.systemPrompt.length;

    return (
      <Box flexDirection="column">
        {message && (
          <Box marginBottom={1}>
            <Text color={CYAN}>ℹ {message}</Text>
          </Box>
        )}
        <Box marginBottom={1}>
          <Text bold color={PURPLE}>
            SYSTEM PROMPT: {agent.name}
          </Text>
        </Box>
        <Box
          flexDirection="column"
          borderStyle="single"
          borderColor={CYAN}
          paddingX={1}
          paddingY={1}
          marginBottom={1}
        >
          <Box marginBottom={1}>
            <Text color={DIM_WHITE}>
              Lines: {lineCount} │ Characters: {charCount}
            </Text>
          </Box>
          <Box flexDirection="column">
            {lines.slice(0, 15).map((line, idx) => (
              <Text key={idx} color={WHITE}>
                {line || ' '}
              </Text>
            ))}
            {lines.length > 15 && (
              <Text color={DIM_WHITE} dimColor>
                ... ({lines.length - 15} more lines)
              </Text>
            )}
          </Box>
        </Box>
        <Box marginTop={1}>
          <Text color={DIM_WHITE} dimColor>
            <Text bold color={CYAN}>Note:</Text> System prompt editing via external editor not yet implemented. │{' '}
            <Text bold color={CYAN}>Q</Text> Back
          </Text>
        </Box>
      </Box>
    );
  }

  // Tools configuration view
  if (view === 'tools' && selectedAgentId) {
    const agent = [...globalAgents, ...projectAgents].find((a) => a.id === selectedAgentId);
    if (!agent) {
      setView('list');
      return null;
    }

    // Get all available built-in tools
    const builtInTools = [
      'Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep',
      'TodoWrite', 'Task', 'WebFetch', 'WebSearch'
    ];

    const toolsListItems: SelectListItem[] = [];

    // Add built-in tools
    builtInTools.forEach((toolName) => {
      const isEnabled = agent.tools[toolName] !== false;
      toolsListItems.push({
        id: toolName,
        label: toolName,
        description: 'Built-in tool',
        status: isEnabled ? 'active' : 'inactive',
        statusText: isEnabled ? '☑ Enabled' : '☐ Disabled',
        badge: 'BUILTIN',
      });
    });

    // Add MCP tools
    mcpTools.forEach((tool) => {
      const serverName = tool.server || tool.serverName;
      if (!serverName) {
        console.warn(`MCP tool ${tool.name} missing server name, skipping`);
        return;
      }
      const toolKey = `mcp__${serverName}__${tool.name}`;
      const isEnabled = agent.tools[toolKey] !== false;
      toolsListItems.push({
        id: toolKey,
        label: tool.name,
        description: tool.description || `From ${serverName}`,
        status: isEnabled ? 'active' : 'inactive',
        statusText: isEnabled ? '☑ Enabled' : '☐ Disabled',
        badge: serverName.toUpperCase(),
      });
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
          title={`TOOLS: ${agent.name}`}
          items={toolsListItems}
          actions={toolsActions}
          emptyMessage="No tools available"
          onSelect={async (item) => {
            // Toggle tool on select
            const currentlyEnabled = agent.tools[item.id] !== false;
            try {
              await updateAgent(selectedAgentId, {
                tools: {
                  ...agent.tools,
                  [item.id]: !currentlyEnabled,
                },
              });
              await loadAgents();
              setMessage(`Tool "${item.label}" ${currentlyEnabled ? 'disabled' : 'enabled'}`);
              setTimeout(() => setMessage(null), 2000);
            } catch (error) {
              setMessage(`Error: ${error instanceof Error ? error.message : String(error)}`);
              setTimeout(() => setMessage(null), 3000);
            }
          }}
          onAction={(key, item) => {
            if (key === ' ' && item) {
              // Space to toggle - same as onSelect
              const currentlyEnabled = agent.tools[item.id] !== false;
              updateAgent(selectedAgentId, {
                tools: {
                  ...agent.tools,
                  [item.id]: !currentlyEnabled,
                },
              }).then(async () => {
                await loadAgents();
                setMessage(`Tool "${item.label}" ${currentlyEnabled ? 'disabled' : 'enabled'}`);
                setTimeout(() => setMessage(null), 2000);
              }).catch((error) => {
                setMessage(`Error: ${error instanceof Error ? error.message : String(error)}`);
                setTimeout(() => setMessage(null), 3000);
              });
            } else if (key.toLowerCase() === 'q') {
              setView('list');
              setSelectedAgentId(null);
            }
          }}
          onCancel={() => {
            setView('list');
            setSelectedAgentId(null);
          }}
        />
      </Box>
    );
  }

  // MCP servers configuration view
  if (view === 'mcpServers' && selectedAgentId) {
    const agent = [...globalAgents, ...projectAgents].find((a) => a.id === selectedAgentId);
    if (!agent) {
      setView('list');
      return null;
    }

    // Get all MCP servers from mcpTools
    const uniqueServers = Array.from(new Set(mcpTools.map(t => t.server || t.serverName).filter(Boolean)));

    const mcpListItems: SelectListItem[] = uniqueServers.map((serverName) => {
      const serverConfig = agent.mcpServers[serverName];
      const isEnabled = serverConfig?.enabled !== false;
      const toolsForServer = mcpTools.filter(t => (t.server || t.serverName) === serverName);

      return {
        id: serverName,
        label: serverName,
        description: `${toolsForServer.length} tools available`,
        status: isEnabled ? 'active' : 'inactive',
        statusText: isEnabled ? '☑ Enabled' : '☐ Disabled',
      };
    });

    const mcpActions: SelectListAction[] = [
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
          title={`MCP SERVERS: ${agent.name}`}
          items={mcpListItems}
          actions={mcpActions}
          emptyMessage="No MCP servers available"
          onSelect={async (item) => {
            // Toggle server on select
            const currentConfig = agent.mcpServers[item.id] || { enabled: true, disabledTools: [] };
            const currentlyEnabled = currentConfig.enabled !== false;

            try {
              await updateAgent(selectedAgentId, {
                mcpServers: {
                  ...agent.mcpServers,
                  [item.id]: {
                    enabled: !currentlyEnabled,
                    disabledTools: currentConfig.disabledTools || [],
                  },
                },
              });
              await loadAgents();
              setMessage(`MCP server "${item.label}" ${currentlyEnabled ? 'disabled' : 'enabled'}`);
              setTimeout(() => setMessage(null), 2000);
            } catch (error) {
              setMessage(`Error: ${error instanceof Error ? error.message : String(error)}`);
              setTimeout(() => setMessage(null), 3000);
            }
          }}
          onAction={(key, item) => {
            if (key === ' ' && item) {
              // Space to toggle - same as onSelect
              const currentConfig = agent.mcpServers[item.id] || { enabled: true, disabledTools: [] };
              const currentlyEnabled = currentConfig.enabled !== false;

              updateAgent(selectedAgentId, {
                mcpServers: {
                  ...agent.mcpServers,
                  [item.id]: {
                    enabled: !currentlyEnabled,
                    disabledTools: currentConfig.disabledTools || [],
                  },
                },
              }).then(async () => {
                await loadAgents();
                setMessage(`MCP server "${item.label}" ${currentlyEnabled ? 'disabled' : 'enabled'}`);
                setTimeout(() => setMessage(null), 2000);
              }).catch((error) => {
                setMessage(`Error: ${error instanceof Error ? error.message : String(error)}`);
                setTimeout(() => setMessage(null), 3000);
              });
            } else if (key.toLowerCase() === 'q') {
              setView('list');
              setSelectedAgentId(null);
            }
          }}
          onCancel={() => {
            setView('list');
            setSelectedAgentId(null);
          }}
        />
      </Box>
    );
  }

  return null;
};
