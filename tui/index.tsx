/**
 * TUI Entry Point
 * Starts the Ink-based TUI interface
 */

import React from 'react';
import { render } from 'ink';
import { App } from './components/App.js';

export interface TUIOptions {
  conversationId?: string;
  agentId?: string;
  enableLogging?: boolean;
}

/**
 * Start the TUI
 */
export function startTUI(options: TUIOptions = {}): void {
  render(
    <App
      initialConversationId={options.conversationId}
      initialAgentId={options.agentId}
      enableLogging={options.enableLogging}
    />,
    {
      exitOnCtrlC: false, // We handle Ctrl+C manually
    }
  );
}
