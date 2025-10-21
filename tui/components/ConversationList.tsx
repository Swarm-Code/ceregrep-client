/**
 * Conversation List Component
 * Displays and allows selection of saved conversations
 */

import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import { listConversations, Conversation, getConversationSummary } from '../conversation-storage.js';

interface ConversationListProps {
  onSelect: (id: string) => void;
  onCancel: () => void;
}

interface SelectItem {
  label: string;
  value: string;
}

export const ConversationList: React.FC<ConversationListProps> = ({ onSelect, onCancel }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    setLoading(true);
    const convs = await listConversations();
    setConversations(convs);
    setLoading(false);
  };

  const handleSelect = (item: SelectItem) => {
    if (item.value === '__cancel__') {
      onCancel();
    } else {
      onSelect(item.value);
    }
  };

  if (loading) {
    return (
      <Box>
        <Text color="cyan" bold>◉ Loading conversations...</Text>
      </Box>
    );
  }

  const items: SelectItem[] = [
    { label: '← Back to Chat', value: '__cancel__' },
    ...conversations.map(conv => ({
      label: formatConversationLabel(conv),
      value: conv.id,
    })),
  ];

  if (conversations.length === 0) {
    return (
      <Box flexDirection="column">
        <Text bold color="magenta">CONVERSATIONS</Text>
        <Box marginTop={1}>
          <Text color="white">No saved conversations</Text>
        </Box>
        <Box marginTop={1}>
          <Text color="blue">Press Ctrl+L to go back</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="magenta">SELECT CONVERSATION</Text>
      </Box>
      <SelectInput items={items} onSelect={handleSelect} />
    </Box>
  );
};

function formatConversationLabel(conv: Conversation): string {
  const summary = getConversationSummary(conv);
  const date = new Date(conv.updated).toLocaleString();
  const messageCount = conv.messages.length;

  return `${summary} (${messageCount} msgs, ${date})`;
}
