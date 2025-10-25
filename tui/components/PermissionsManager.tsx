/**
 * Permissions Manager Component
 * Arrow-key navigable tool permissions management
 */

import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { SelectList, SelectListItem, SelectListAction } from './common/SelectList.js';
import { Modal } from './common/Modal.js';
import { getToolPermissions, setToolPermission, isToolEnabled } from '../../utils/permissions.js';
import { getAllTools } from '../../tools/index.js';
import { getMCPTools } from '../../mcp/client.js';
import { clearToolCache } from '../../tools/index.js';

interface PermissionsManagerProps {
  onCancel: () => void;
  onPermissionsChange?: () => void;
}

// Color constants
const CYAN = '#22D3EE';
const WHITE = '#FFFFFF';
const DIM_WHITE = '#9CA3AF';
const GREEN = '#10B981';
const RED = '#EF4444';
const YELLOW = '#F59E0B';
const PURPLE = '#A855F7';

interface ModalState {
  show: boolean;
  type: 'confirm' | 'alert' | 'error' | 'success';
  title: string;
  message: string;
  onConfirm?: () => void;
}

export const PermissionsManager: React.FC<PermissionsManagerProps> = ({ onCancel, onPermissionsChange }) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [builtInTools, setBuiltInTools] = useState<any[]>([]);
  const [mcpTools, setMcpTools] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [modal, setModal] = useState<ModalState>({
    show: false,
    type: 'alert',
    title: '',
    message: '',
  });

  // Load tools and permissions on mount
  useEffect(() => {
    loadToolsAndPermissions();
  }, []);

  const loadToolsAndPermissions = async () => {
    setLoading(true);
    try {
      // Load built-in tools
      const builtIn = getAllTools();
      setBuiltInTools(builtIn);

      // Load MCP tools
      try {
        const mcp = await getMCPTools();
        setMcpTools(mcp);
      } catch (error) {
        console.warn('Failed to load MCP tools:', error);
        setMcpTools([]);
      }

      // Load permissions
      const perms = getToolPermissions();
      setPermissions(perms);
    } catch (error) {
      setMessage(`Error loading tools: ${error instanceof Error ? error.message : String(error)}`);
    }
    setLoading(false);
  };

  const handleToggleTool = async (toolName: string) => {
    const currentlyEnabled = isToolEnabled(toolName);
    const newState = !currentlyEnabled;

    try {
      await setToolPermission(toolName, newState);

      // Update local state
      const newPermissions = { ...permissions };
      if (newState) {
        delete newPermissions[toolName];
      } else {
        newPermissions[toolName] = false;
      }
      setPermissions(newPermissions);

      // Clear tool cache to force reload
      clearToolCache();

      setMessage(`Tool "${toolName}" ${newState ? 'enabled' : 'disabled'}`);
      setTimeout(() => setMessage(null), 2000);

      // Notify parent of changes
      if (onPermissionsChange) {
        onPermissionsChange();
      }
    } catch (error) {
      setMessage(`Error: ${error instanceof Error ? error.message : String(error)}`);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const getToolListItems = (): SelectListItem[] => {
    const items: SelectListItem[] = [];

    // Add built-in tools
    builtInTools.forEach((tool) => {
      const enabled = isToolEnabled(tool.name);
      items.push({
        id: tool.name,
        label: tool.name,
        description: typeof tool.description === 'string'
          ? tool.description
          : 'Built-in tool',
        status: enabled ? 'active' : 'inactive',
        statusText: enabled ? '☑ Enabled' : '☐ Disabled',
        badge: 'BUILTIN',
      });
    });

    // Add MCP tools
    mcpTools.forEach((tool) => {
      const serverName = tool.server || tool.serverName || 'unknown';
      const toolKey = `mcp__${serverName}__${tool.name}`;
      const enabled = isToolEnabled(toolKey);

      items.push({
        id: toolKey,
        label: tool.name,
        description: tool.description || `From ${serverName}`,
        status: enabled ? 'active' : 'inactive',
        statusText: enabled ? '☑ Enabled' : '☐ Disabled',
        badge: serverName.toUpperCase(),
      });
    });

    return items;
  };

  const toolsActions: SelectListAction[] = [
    { key: '↑↓', label: '↑↓', description: 'Navigate' },
    { key: 'Space', label: 'Space', description: 'Toggle' },
    { key: 'Enter', label: 'Enter', description: 'Toggle' },
    { key: 'R', label: 'R', description: 'Refresh' },
    { key: 'Q', label: 'Q', description: 'Back' },
  ];

  // Render loading state
  if (loading && builtInTools.length === 0) {
    return (
      <Box>
        <Text color={CYAN} bold>
          ◉ Loading tools...
        </Text>
      </Box>
    );
  }

  // Render modal if shown
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

  const toolItems = getToolListItems();

  return (
    <Box flexDirection="column">
      {message && (
        <Box marginBottom={1}>
          <Text color={CYAN}>ℹ {message}</Text>
        </Box>
      )}
      <SelectList
        title="TOOL PERMISSIONS"
        items={toolItems}
        actions={toolsActions}
        emptyMessage="No tools available"
        onSelect={async (item) => {
          // Toggle tool on select
          await handleToggleTool(item.id);
        }}
        onAction={async (key, item) => {
          if ((key === ' ' || key.toLowerCase() === 'enter') && item) {
            // Space or Enter to toggle
            await handleToggleTool(item.id);
          } else if (key.toLowerCase() === 'r') {
            // Refresh
            await loadToolsAndPermissions();
            setMessage('Tools refreshed');
            setTimeout(() => setMessage(null), 2000);
          } else if (key.toLowerCase() === 'q') {
            onCancel();
          }
        }}
        onCancel={onCancel}
      />
    </Box>
  );
};
