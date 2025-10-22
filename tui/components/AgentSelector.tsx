/**
 * Agent Selector Component
 * Displays and allows selection of available agents
 */

import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import { listAgents, AgentWithScope } from '../../agents/index.js';

interface AgentSelectorProps {
  currentAgentId?: string;
  onSelect: (agentId: string | undefined) => void;
  onCancel: () => void;
}

interface SelectItem {
  label: string;
  value: string;
}

// Force exact colors (hex) to override terminal themes
const BLUE = '#4169E1';
const PURPLE = '#A855F7';
const CYAN = '#22D3EE';
const WHITE = '#FFFFFF';

export const AgentSelector: React.FC<AgentSelectorProps> = ({
  currentAgentId,
  onSelect,
  onCancel,
}) => {
  const [agents, setAgents] = useState<AgentWithScope[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    setLoading(true);
    const agentsList = await listAgents();
    const allAgents: AgentWithScope[] = [
      ...agentsList.global.map(a => ({ ...a, scope: 'global' as const, path: '', config: a })),
      ...agentsList.project.map(a => ({ ...a, scope: 'project' as const, path: '', config: a })),
    ];
    setAgents(allAgents);
    setLoading(false);
  };

  const handleSelect = (item: SelectItem) => {
    if (item.value === '__cancel__') {
      onCancel();
    } else if (item.value === '__none__') {
      onSelect(undefined);
    } else {
      onSelect(item.value);
    }
  };

  if (loading) {
    return (
      <Box>
        <Text color={CYAN} bold>◉ Loading agents...</Text>
      </Box>
    );
  }

  const items: SelectItem[] = [
    { label: '← Back to Chat', value: '__cancel__' },
    { label: '(No Agent - Use Default)', value: '__none__' },
    ...agents.map(agent => ({
      label: formatAgentLabel(agent, currentAgentId),
      value: agent.config.id,
    })),
  ];

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color={PURPLE}>SELECT AGENT</Text>
      </Box>
      <SelectInput items={items} onSelect={handleSelect} />
    </Box>
  );
};

function formatAgentLabel(agent: AgentWithScope, currentAgentId?: string): string {
  const isCurrent = agent.config.id === currentAgentId;
  const prefix = isCurrent ? '● ' : '  ';
  return `${prefix}${agent.config.name} (${agent.config.id}) - ${agent.config.description}`;
}
