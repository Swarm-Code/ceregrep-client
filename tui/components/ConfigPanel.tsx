/**
 * Config Panel Component
 * TUI interface for editing configuration settings
 */

import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

interface ConfigPanelProps {
  onCancel: () => void;
  onSave: (config: ConfigData) => void;
  currentConfig: ConfigData;
}

export interface ConfigData {
  model?: string;
  provider?: { type: string };
  rateLimit?: { requestsPerMinute: number };
  verbosity?: 'quiet' | 'normal' | 'verbose';
  systemPromptPath?: string;
}

// Force exact colors (hex) to override terminal themes
const BLUE = '#4169E1';
const PURPLE = '#A855F7';
const CYAN = '#22D3EE';
const WHITE = '#FFFFFF';
const RED = '#EF4444';
const GREEN = '#10B981';
const DIM_WHITE = '#9CA3AF';

type Field = 'rateLimit' | 'verbosity' | 'systemPrompt';

export const ConfigPanel: React.FC<ConfigPanelProps> = ({ onCancel, onSave, currentConfig }) => {
  const [selectedField, setSelectedField] = useState<Field>('rateLimit');
  const [rateLimit, setRateLimit] = useState(currentConfig.rateLimit?.requestsPerMinute || 60);
  const [verbosity, setVerbosity] = useState<'quiet' | 'normal' | 'verbose'>(currentConfig.verbosity || 'normal');
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Detect available editor
  const getAvailableEditor = (): 'nvim' | 'nano' | 'vi' | null => {
    try {
      execSync('which nvim', { stdio: 'ignore' });
      return 'nvim';
    } catch {
      try {
        execSync('which nano', { stdio: 'ignore' });
        return 'nano';
      } catch {
        try {
          execSync('which vi', { stdio: 'ignore' });
          return 'vi';
        } catch {
          return null;
        }
      }
    }
  };

  // Handle keyboard input
  useInput((input, key) => {
    if (editing) {
      // Editing mode
      if (key.return) {
        // Save edit
        if (selectedField === 'rateLimit') {
          const value = parseInt(editValue);
          if (!isNaN(value) && value > 0 && value <= 1000) {
            setRateLimit(value);
            setEditing(false);
            setEditValue('');
            setError(null);
          } else {
            setError('Rate limit must be between 1 and 1000');
          }
        }
      } else if (key.escape) {
        // Cancel edit
        setEditing(false);
        setEditValue('');
        setError(null);
      } else if (key.backspace || key.delete) {
        setEditValue(editValue.slice(0, -1));
      } else if (input && /^[0-9]$/.test(input)) {
        setEditValue(editValue + input);
      }
    } else {
      // Navigation mode
      if (key.escape) {
        onCancel();
      } else if (key.upArrow) {
        // Move up
        const fields: Field[] = ['rateLimit', 'verbosity', 'systemPrompt'];
        const currentIndex = fields.indexOf(selectedField);
        if (currentIndex > 0) {
          setSelectedField(fields[currentIndex - 1]);
        }
      } else if (key.downArrow) {
        // Move down
        const fields: Field[] = ['rateLimit', 'verbosity', 'systemPrompt'];
        const currentIndex = fields.indexOf(selectedField);
        if (currentIndex < fields.length - 1) {
          setSelectedField(fields[currentIndex + 1]);
        }
      } else if (key.return) {
        // Edit selected field
        if (selectedField === 'rateLimit') {
          setEditing(true);
          setEditValue(rateLimit.toString());
        } else if (selectedField === 'verbosity') {
          // Cycle verbosity
          const levels: Array<'quiet' | 'normal' | 'verbose'> = ['quiet', 'normal', 'verbose'];
          const currentIndex = levels.indexOf(verbosity);
          setVerbosity(levels[(currentIndex + 1) % levels.length]);
        } else if (selectedField === 'systemPrompt') {
          // Launch editor
          const editor = getAvailableEditor();
          if (editor) {
            launchSystemPromptEditor(editor);
          } else {
            setError('No editor found (nvim, nano, or vi)');
          }
        }
      } else if (input === 's') {
        // Save config
        saveConfig();
      }
    }
  });

  const launchSystemPromptEditor = async (editor: 'nvim' | 'nano' | 'vi') => {
    try {
      // Get system prompt file path
      const configDir = path.join(os.homedir(), '.ceregrep');
      const promptPath = path.join(configDir, 'system-prompt.txt');

      // Ensure config directory exists
      await fs.mkdir(configDir, { recursive: true });

      // Create default prompt if it doesn't exist
      if (!(await fileExists(promptPath))) {
        await fs.writeFile(promptPath, getDefaultSystemPrompt(), 'utf-8');
      }

      // Note: We can't actually launch the editor from Ink TUI
      // Instead, we'll show instructions
      setError(`Exit TUI and run: ${editor} ${promptPath}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const fileExists = async (path: string): Promise<boolean> => {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  };

  const getDefaultSystemPrompt = (): string => {
    return `You are a helpful AI assistant with access to bash and file search tools.
Use the tools available to help the user accomplish their tasks.

CRITICAL INSTRUCTION - CONTEXT AND EXPLANATION REQUIREMENTS:
- Give as much context as possible in your responses. It is ALWAYS better to add too much context than too little.
- Use file references with line numbers in the format: filename.ts:123 or path/to/file.py:456
- Explain everything in an ultra explanatory tone, assuming the user needs complete understanding.
- Include specific details: function names, variable names, code snippets, file paths with line numbers.
- When referencing code, ALWAYS include the file path and line number where it can be found.
- Provide thorough explanations of how things work, why they work that way, and what each piece does.
- Word for word: "Better to add too much context than necessary" - follow this principle strictly.

CRITICAL INSTRUCTION - MUST USE TOOLS TO GATHER INFORMATION:
- You MUST use grep to search for information before answering questions about code.
- You CANNOT rely on stored context or prior knowledge about the codebase.
- Everything must be read using tools before giving an explanation.
- This is to ensure that you do not lazily answer questions without verifying current state.
- Always grep for relevant files, read the actual code, and then provide your explanation.
- Never answer based solely on assumptions or memory - always verify with tools first.`;
  };

  const saveConfig = () => {
    const newConfig: ConfigData = {
      ...currentConfig,
      rateLimit: { requestsPerMinute: rateLimit },
      verbosity,
    };
    onSave(newConfig);
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color={PURPLE}>⚙ CONFIGURATION PANEL</Text>
      </Box>

      {/* Current model and provider info */}
      <Box marginBottom={1} flexDirection="column">
        <Text color={CYAN}>Current Settings:</Text>
        <Box paddingLeft={2}>
          <Text color={WHITE}>Model: </Text>
          <Text color={DIM_WHITE}>{currentConfig.model || 'default'}</Text>
        </Box>
        <Box paddingLeft={2}>
          <Text color={WHITE}>Provider: </Text>
          <Text color={DIM_WHITE}>{currentConfig.provider?.type || 'anthropic'}</Text>
        </Box>
      </Box>

      {/* Rate Limit */}
      <Box marginBottom={1}>
        <Text color={selectedField === 'rateLimit' ? CYAN : WHITE} bold={selectedField === 'rateLimit'}>
          {selectedField === 'rateLimit' ? '▶ ' : '  '}Rate Limit:
        </Text>
        {editing && selectedField === 'rateLimit' ? (
          <Text color={CYAN}>{editValue}_</Text>
        ) : (
          <Text color={WHITE}> {rateLimit} req/min</Text>
        )}
      </Box>

      {/* Verbosity */}
      <Box marginBottom={1}>
        <Text color={selectedField === 'verbosity' ? CYAN : WHITE} bold={selectedField === 'verbosity'}>
          {selectedField === 'verbosity' ? '▶ ' : '  '}Verbosity:
        </Text>
        <Text color={WHITE}> {verbosity}</Text>
      </Box>

      {/* System Prompt */}
      <Box marginBottom={1}>
        <Text color={selectedField === 'systemPrompt' ? CYAN : WHITE} bold={selectedField === 'systemPrompt'}>
          {selectedField === 'systemPrompt' ? '▶ ' : '  '}Edit System Prompt
        </Text>
        <Text color={DIM_WHITE}> (opens {getAvailableEditor() || 'editor'})</Text>
      </Box>

      {/* Error display */}
      {error && (
        <Box marginTop={1} marginBottom={1}>
          <Text color={RED}>⚠ {error}</Text>
        </Box>
      )}

      {/* Instructions */}
      <Box marginTop={1} flexDirection="column">
        <Text color={DIM_WHITE} dimColor>
          {editing ? (
            <>Type number, Enter to save, Esc to cancel</>
          ) : (
            <>↑↓ Navigate • Enter to edit • 's' to save • Esc to exit</>
          )}
        </Text>
      </Box>
    </Box>
  );
};
