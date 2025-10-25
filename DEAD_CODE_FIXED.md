# Dead Code Analysis Report

*Generated: 2025-10-25T01:26:25.891Z*

## 📊 Summary

| Metric | Count |
|--------|-------|
| Analyzed Files | 73 |
| Total Declarations | 1502 |
| Unused Exports | 110 |
| Unused Internal | 1191 |
| Unreachable Blocks | 0 |
| Orphaned Files | 26 |

## ❌ Unused Exports

| File | Name | Kind | Line |
|------|------|------|------|
| core/tool.ts | `CommandContext` | interface | 109 |
| core/tool.ts | `Command` | interface | 113 |
| core/tool.ts | `ToolFunction` | type | 122 |
| core/tool.ts | `CreateToolOptions` | interface | 130 |
| core/tool.ts | `createTool` | function | 144 |
| core/messages.ts | `CANCEL_MESSAGE` | const | 21 |
| core/messages.ts | `REJECT_MESSAGE` | const | 23 |
| core/messages.ts | `NO_RESPONSE_REQUESTED` | const | 25 |
| core/messages.ts | `NO_CONTENT_MESSAGE` | const | 26 |
| core/messages.ts | `SYNTHETIC_ASSISTANT_MESSAGES` | const | 28 |
| core/messages.ts | `FullToolUseResult` | type | 36 |
| core/messages.ts | `createAssistantAPIErrorMessage` | function | 119 |
| core/messages.ts | `createProgressMessage` | function | 149 |
| core/messages.ts | `createToolResultStopMessage` | function | 167 |
| core/tokens.ts | `countCachedTokens` | function | 39 |
| core/tokens.ts | `calculateAutoCompactThreshold` | function | 71 |
| config/schema.ts | `MCPServerConfigSchema` | const | 8 |
| config/schema.ts | `HookConfigSchema` | const | 37 |
| config/schema.ts | `HooksSchema` | const | 49 |
| config/schema.ts | `Hooks` | type | 54 |
| core/hooks.ts | `ToolUseContext` | interface | 9 |
| core/hooks.ts | `HookResult` | interface | 17 |
| config/loader.ts | `saveGlobalConfig` | function | 134 |
| core/agent.ts | `CanUseToolFn` | type | 24 |
| core/agent.ts | `checkAutoCompact` | function | 384 |
| utils/systemEncoding.ts | `resetEncodingCache` | function | 18 |
| utils/systemEncoding.ts | `getSystemEncoding` | function | 52 |
| utils/systemEncoding.ts | `windowsCodePageToEncoding` | function | 114 |
| utils/systemEncoding.ts | `detectEncodingFromBuffer` | function | 155 |
| utils/shell-utils.ts | `ShellType` | type | 12 |
| utils/shell-utils.ts | `ShellConfiguration` | interface | 17 |
| utils/shell-utils.ts | `isWindows` | const | 68 |
| utils/terminalSerializer.ts | `ColorMode` | enum | 31 |
| utils/terminalSerializer.ts | `convertColorToHex` | function | 460 |
| services/shell-execution.ts | `ShellExecutionResult` | interface | 28 |
| services/shell-execution.ts | `ShellExecutionHandle` | interface | 48 |
| utils/tool-response-limiter.ts | `MAX_TOOL_OUTPUT_TOKENS` | const | 41 |
| utils/tool-response-limiter.ts | `formatTokenCount` | function | 149 |
| tools/bash.ts | `getActiveShellPid` | function | 246 |
| tools/bash.ts | `clearShellPid` | function | 250 |
| tools/bash.ts | `getAllActiveShellPids` | function | 254 |
| mcp/client.ts | `getMCPResources` | function | 388 |
| mcp/client.ts | `readMCPResource` | function | 434 |
| mcp/client.ts | `getMCPServerStatus` | function | 494 |
| agents/schema.ts | `SystemPromptModeSchema` | const | 11 |
| agents/schema.ts | `AgentMCPServerConfigSchema` | const | 16 |
| utils/shell.ts | `ExecResult` | type | 12 |
| llm/errors.ts | `BadRequestRetryError` | class | 9 |
| utils/version-check.ts | `getLocalPackageInfo` | function | 50 |
| utils/version-check.ts | `getRemoteVersion` | function | 92 |
| utils/permission-check.ts | `checkMCPAvailability` | function | 70 |
| tui/prompt-history.ts | `searchPrompts` | function | 111 |
| tui/prompt-history.ts | `clearHistory` | function | 128 |
| tui/mode-prompts.ts | `AgentMode` | type | 6 |
| tui/mode-prompts.ts | `getBaseSystemPrompt` | function | 8 |
| tui/mode-prompts.ts | `getModeSpecificPrompt` | function | 12 |
| tui/mode-prompts.ts | `getModeDescription` | function | 20 |
| tui/mode-prompts.ts | `getModeEmoji` | function | 33 |
| tui/conversation-storage.ts | `Checkpoint` | interface | 11 |
| tui/conversation-storage.ts | `EnhancedCheckpoint` | interface | 18 |
| tui/conversation-storage.ts | `getConversationsDir` | function | 82 |
| tui/conversation-storage.ts | `generateConversationId` | function | 102 |
| tui/conversation-storage.ts | `generateCheckpointId` | function | 109 |
| tui/conversation-storage.ts | `generateBranchId` | function | 116 |
| tui/conversation-storage.ts | `deleteConversation` | function | 223 |
| tui/conversation-storage.ts | `migrateToBranchedConversation` | function | 294 |
| tui/logger.ts | `ensureLogsDir` | function | 18 |
| tui/logger.ts | `getLogsDir` | function | 74 |
| tui/components/AnsiOutputText.tsx | `AnsiOutputText` | const | 81 |
| tui/components/AnsiOutputText.tsx | `isAnsiOutput` | function | 107 |
| tui/components/MessageList.tsx | `MessageList` | const | 33 |
| mcp/resources.ts | `getGitRoot` | function | 25 |
| mcp/resources.ts | `isFileInRepo` | function | 37 |
| mcp/resources.ts | `listRepoFiles` | function | 53 |
| tui/components/InputBox.tsx | `InputBox` | const | 46 |
| tui/components/StatusBar.tsx | `StatusBar` | const | 26 |
| tui/components/Header.tsx | `Header` | const | 28 |
| tui/components/ConversationList.tsx | `ConversationList` | const | 32 |
| tui/components/ConfigPanel.tsx | `ConfigData` | interface | 19 |
| tui/components/ConfigPanel.tsx | `ConfigPanel` | const | 38 |
| tui/components/common/SelectList.tsx | `SelectListItem` | interface | 17 |
| tui/components/common/SelectList.tsx | `SelectListAction` | interface | 27 |
| tui/components/common/SelectList.tsx | `SelectListProps` | interface | 33 |
| tui/components/common/SelectList.tsx | `SelectList` | const | 47 |
| tui/components/common/FormEditor.tsx | `FieldType` | type | 19 |
| tui/components/common/FormEditor.tsx | `FormFieldOption` | interface | 21 |
| tui/components/common/FormEditor.tsx | `FormField` | interface | 26 |
| tui/components/common/FormEditor.tsx | `FormEditorProps` | interface | 39 |
| tui/components/common/FormEditor.tsx | `FormEditor` | const | 48 |
| tui/components/common/Modal.tsx | `ModalType` | type | 17 |
| tui/components/common/Modal.tsx | `ModalProps` | interface | 19 |
| tui/components/common/Modal.tsx | `Modal` | const | 29 |
| tui/components/MCPManager.tsx | `MCPManager` | const | 54 |
| tui/components/AgentManager.tsx | `AgentManager` | const | 54 |
| tui/components/MessageNavigator.tsx | `MessageNavigator` | const | 30 |
| tui/components/BranchSelector.tsx | `BranchSelector` | const | 29 |
| tui/components/ShortcutBar.tsx | `ShortcutBar` | const | 39 |
| tui/components/TooltipHints.tsx | `TooltipHints` | const | 43 |
| tui/background-agent.ts | `BackgroundContext` | interface | 13 |
| tui/background-agent.ts | `BackgroundAgent` | class | 23 |
| tui/components/App.tsx | `App` | const | 67 |
| tui/utils/keyToAnsi.example.tsx | `SimplePTYExample` | const | 14 |
| tui/utils/keyToAnsi.example.tsx | `SmartPTYExample` | const | 32 |
| tui/utils/keyToAnsi.example.tsx | `DebugKeyExample` | const | 67 |
| tui/utils/keyToAnsi.example.tsx | `TerminalEmulatorExample` | const | 111 |
| tui/utils/keyToAnsi.example.tsx | `SelectiveForwardingExample` | const | 158 |
| tui/utils/keyToAnsi.example.tsx | `KeyMacroExample` | const | 194 |
| tui/utils/keyToAnsi.example.tsx | `TerminalPanel` | const | 241 |
| tui/utils/keyToAnsi.example.tsx | `simulateKeyPress` | function | 297 |
| tui/components/ShellInputPrompt.tsx | `ShellInputPrompt` | const | 24 |

## ⚠️ Unused Internal Declarations

| File | Name | Kind | Line |
|------|------|------|------|
| core/messages.ts | `baseCreateAssistantMessage` | function | 78 |
| core/messages.ts | `result` | const | 183 |
| core/messages.ts | `lastMessage` | const | 200 |
| core/messages.ts | `mergedContent` | const | 212 |
| core/tokens.ts | `i` | variable | 115 |
| core/tokens.ts | `message` | const | 117 |
| core/tokens.ts | `AUTO_COMPACT_THRESHOLD_RATIO` | const | 59 |
| core/tokens.ts | `DEFAULT_CONTEXT_LENGTH` | const | 64 |
| core/tokens.ts | `tokensRemaining` | const | 95 |
| core/hooks.ts | `matchesTool` | function | 28 |
| core/hooks.ts | `patterns` | const | 35 |
| core/hooks.ts | `regex` | const | 48 |
| core/hooks.ts | `executeHookCommand` | function | 59 |
| core/hooks.ts | `hookEnv` | const | 66 |
| core/hooks.ts | `envKey` | const | 75 |
| core/hooks.ts | `contextJson` | const | 84 |
| core/hooks.ts | `child` | const | 93 |
| core/hooks.ts | `stdout` | variable | 99 |
| core/hooks.ts | `stderr` | variable | 100 |
| core/hooks.ts | `matchingHooks` | const | 214 |
| core/hooks.ts | `results` | const | 169 |
| core/hooks.ts | `result` | const | 174 |
| core/hooks.ts | `parsed` | const | 188 |
| core/hooks.ts | `hookPromises` | const | 223 |
| config/loader.ts | `CONFIG_FILENAMES` | const | 11 |
| config/loader.ts | `DEPRECATED_FILENAMES` | const | 12 |
| config/loader.ts | `loadConfigFile` | function | 18 |
| config/loader.ts | `content` | const | 24 |
| config/loader.ts | `config` | const | 25 |
| config/loader.ts | `filename` | const | 26 |
| config/loader.ts | `showDeprecationWarning` | function | 37 |
| config/loader.ts | `location` | const | 38 |
| config/loader.ts | `newFilename` | const | 39 |
| config/loader.ts | `homeDir` | const | 135 |
| config/loader.ts | `result` | const | 73 |
| config/loader.ts | `globalConfig` | const | 91 |
| config/loader.ts | `projectConfig` | const | 92 |
| config/loader.ts | `mergedConfig` | const | 95 |
| config/loader.ts | `validated` | const | 106 |
| config/loader.ts | `configPath` | const | 136 |
| core/agent.ts | `fullSystemPrompt` | const | 61 |
| core/agent.ts | `compactResult` | const | 64 |
| core/agent.ts | `currentTokens` | const | 78 |
| core/agent.ts | `assistantMessage` | variable | 89 |
| core/agent.ts | `lastToolResultIndex` | variable | 112 |
| core/agent.ts | `m` | const | 114 |
| core/agent.ts | `rollbackMessages` | const | 123 |
| core/agent.ts | `toolUseMessages` | const | 160 |
| core/agent.ts | `toolResults` | const | 175 |
| core/agent.ts | `orderedToolResults` | const | 198 |
| core/agent.ts | `aContent` | const | 199 |
| core/agent.ts | `bContent` | const | 200 |
| core/agent.ts | `aIndex` | const | 201 |
| core/agent.ts | `bIndex` | const | 204 |
| core/agent.ts | `runToolsSerially` | function | 225 |
| core/agent.ts | `tool` | const | 237 |
| core/agent.ts | `hasPermission` | const | 253 |
| core/agent.ts | `config` | const | 277 |
| core/agent.ts | `toolDescription` | const | 280 |
| core/agent.ts | `preHookResult` | const | 285 |
| core/agent.ts | `finalInput` | const | 306 |
| core/agent.ts | `lastResult` | variable | 309 |
| core/agent.ts | `executionError` | variable | 310 |
| core/agent.ts | `resultContent` | const | 345 |
| core/agent.ts | `finalContent` | const | 350 |
| core/agent.ts | `safeContent` | const | 351 |
| core/agent.ts | `compactStatus` | const | 402 |
| core/agent.ts | `compactedMessages` | const | 426 |
| core/agent.ts | `COMPRESSION_PROMPT` | const | 446 |
| core/agent.ts | `messagesToSummarize` | const | 511 |
| core/agent.ts | `recentMessages` | const | 512 |
| core/agent.ts | `summaryRequest` | const | 515 |
| core/agent.ts | `summaryResponse` | const | 518 |
| tui/getPty.ts | `ptyModule` | const | 22 |
| utils/systemEncoding.ts | `cachedSystemEncoding` | variable | 13 |
| utils/systemEncoding.ts | `output` | const | 56 |
| utils/systemEncoding.ts | `match` | const | 96 |
| utils/systemEncoding.ts | `codePage` | const | 59 |
| utils/systemEncoding.ts | `env` | const | 81 |
| utils/systemEncoding.ts | `locale` | variable | 82 |
| utils/systemEncoding.ts | `map` | const | 116 |
| utils/systemEncoding.ts | `detected` | const | 157 |
| utils/shell-utils.ts | `comSpec` | const | 38 |
| utils/shell-utils.ts | `executable` | const | 40 |
| utils/textUtils.ts | `sample` | const | 22 |
| utils/terminalSerializer.ts | `Attribute` | enum | 23 |
| utils/terminalSerializer.ts | `Cell` | class | 37 |
| utils/terminalSerializer.ts | `buffer` | const | 136 |
| utils/terminalSerializer.ts | `cursorX` | const | 137 |
| utils/terminalSerializer.ts | `cursorY` | const | 138 |
| utils/terminalSerializer.ts | `defaultFg` | const | 139 |
| utils/terminalSerializer.ts | `defaultBg` | const | 140 |
| utils/terminalSerializer.ts | `result` | const | 142 |
| utils/terminalSerializer.ts | `line` | const | 145 |
| utils/terminalSerializer.ts | `currentLine` | const | 146 |
| utils/terminalSerializer.ts | `lastCell` | variable | 152 |
| utils/terminalSerializer.ts | `currentText` | variable | 153 |
| utils/terminalSerializer.ts | `cellData` | const | 156 |
| utils/terminalSerializer.ts | `cell` | const | 157 |
| utils/terminalSerializer.ts | `token` | const | 181 |
| utils/terminalSerializer.ts | `ANSI_COLORS` | const | 201 |
| utils/terminalSerializer.ts | `r` | const | 466 |
| utils/terminalSerializer.ts | `g` | const | 467 |
| utils/terminalSerializer.ts | `b` | const | 468 |
| services/shell-execution.ts | `SIGKILL_TIMEOUT_MS` | const | 24 |
| services/shell-execution.ts | `MAX_CHILD_PROCESS_BUFFER_SIZE` | const | 25 |
| services/shell-execution.ts | `ActivePty` | interface | 87 |
| services/shell-execution.ts | `getFullBufferText` | const | 92 |
| services/shell-execution.ts | `buffer` | const | 464 |
| services/shell-execution.ts | `lines` | const | 469 |
| services/shell-execution.ts | `line` | const | 491 |
| services/shell-execution.ts | `lineContent` | const | 472 |
| services/shell-execution.ts | `ptyInfo` | const | 130 |
| services/shell-execution.ts | `chunkLength` | const | 160 |
| services/shell-execution.ts | `currentLength` | const | 161 |
| services/shell-execution.ts | `newTotalLength` | const | 162 |
| services/shell-execution.ts | `charsToTrim` | const | 180 |
| services/shell-execution.ts | `truncatedBuffer` | const | 181 |
| services/shell-execution.ts | `isWindows` | const | 192 |
| services/shell-execution.ts | `spawnArgs` | const | 194 |
| services/shell-execution.ts | `child` | const | 196 |
| services/shell-execution.ts | `stdoutDecoder` | variable | 211 |
| services/shell-execution.ts | `stderrDecoder` | variable | 212 |
| services/shell-execution.ts | `stdout` | variable | 214 |
| services/shell-execution.ts | `stderr` | variable | 215 |
| services/shell-execution.ts | `stdoutTruncated` | variable | 216 |
| services/shell-execution.ts | `stderrTruncated` | variable | 217 |
| services/shell-execution.ts | `outputChunks` | const | 436 |
| services/shell-execution.ts | `exited` | variable | 438 |
| services/shell-execution.ts | `isStreamingRawContent` | variable | 440 |
| services/shell-execution.ts | `MAX_SNIFF_SIZE` | const | 441 |
| services/shell-execution.ts | `sniffedBytes` | variable | 442 |
| services/shell-execution.ts | `handleOutput` | const | 548 |
| services/shell-execution.ts | `encoding` | const | 553 |
| services/shell-execution.ts | `sniffBuffer` | const | 564 |
| services/shell-execution.ts | `decoder` | variable | 434 |
| services/shell-execution.ts | `decodedChunk` | const | 574 |
| services/shell-execution.ts | `handleExit` | const | 277 |
| services/shell-execution.ts | `separator` | const | 283 |
| services/shell-execution.ts | `combinedOutput` | variable | 284 |
| services/shell-execution.ts | `truncationMessage` | const | 288 |
| services/shell-execution.ts | `finalStrippedOutput` | const | 294 |
| services/shell-execution.ts | `abortHandler` | const | 651 |
| services/shell-execution.ts | `cleanup` | function | 350 |
| services/shell-execution.ts | `remaining` | const | 360 |
| services/shell-execution.ts | `finalBuffer` | const | 613 |
| services/shell-execution.ts | `cols` | const | 404 |
| services/shell-execution.ts | `rows` | const | 405 |
| services/shell-execution.ts | `args` | const | 407 |
| services/shell-execution.ts | `ptyProcess` | const | 409 |
| services/shell-execution.ts | `headlessTerminal` | const | 424 |
| services/shell-execution.ts | `processingChain` | variable | 433 |
| services/shell-execution.ts | `isWriting` | variable | 443 |
| services/shell-execution.ts | `hasStartedOutput` | variable | 444 |
| services/shell-execution.ts | `renderTimeout` | variable | 445 |
| services/shell-execution.ts | `renderFn` | const | 447 |
| services/shell-execution.ts | `bufferText` | const | 456 |
| services/shell-execution.ts | `newOutput` | variable | 465 |
| services/shell-execution.ts | `lastNonEmptyLine` | variable | 489 |
| services/shell-execution.ts | `trimmedOutput` | const | 507 |
| services/shell-execution.ts | `finalOutput` | const | 509 |
| services/shell-execution.ts | `render` | const | 523 |
| services/shell-execution.ts | `totalBytes` | const | 586 |
| services/shell-execution.ts | `bufferData` | const | 601 |
| services/shell-execution.ts | `finalize` | const | 611 |
| services/shell-execution.ts | `processingComplete` | const | 634 |
| services/shell-execution.ts | `abortFired` | const | 635 |
| services/shell-execution.ts | `activePty` | const | 777 |
| utils/tool-response-limiter.ts | `encoder` | variable | 14 |
| utils/tool-response-limiter.ts | `getEncoder` | function | 15 |
| utils/tool-response-limiter.ts | `enc` | const | 50 |
| utils/tool-response-limiter.ts | `tokens` | const | 57 |
| utils/tool-response-limiter.ts | `count` | const | 58 |
| utils/tool-response-limiter.ts | `estimatedTokens` | const | 94 |
| utils/tool-response-limiter.ts | `maxChars` | const | 101 |
| utils/tool-response-limiter.ts | `truncated` | const | 102 |
| utils/tool-response-limiter.ts | `totalLines` | const | 105 |
| utils/tool-response-limiter.ts | `keptLines` | const | 106 |
| utils/tool-response-limiter.ts | `message` | variable | 109 |
| tools/bash.ts | `inputSchema` | const | 23 |
| tools/bash.ts | `Output` | type | 31 |
| tools/bash.ts | `BANNED_COMMANDS` | const | 40 |
| tools/bash.ts | `activeShellPids` | const | 53 |
| tools/bash.ts | `parts` | const | 71 |
| tools/bash.ts | `baseCmd` | const | 72 |
| tools/bash.ts | `errorMessage` | variable | 86 |
| tools/bash.ts | `trimmedStdout` | variable | 91 |
| tools/bash.ts | `trimmedStderr` | const | 92 |
| tools/bash.ts | `maxTokens` | const | 96 |
| tools/bash.ts | `estimatedTokens` | const | 99 |
| tools/bash.ts | `numLines` | const | 100 |
| tools/bash.ts | `charCount` | const | 101 |
| tools/bash.ts | `hasBoth` | const | 112 |
| tools/bash.ts | `result` | const | 180 |
| tools/bash.ts | `cumulativeOutput` | variable | 119 |
| tools/bash.ts | `isBinaryStream` | variable | 120 |
| tools/bash.ts | `bytesReceived` | variable | 121 |
| tools/bash.ts | `hasAnsiOutput` | variable | 122 |
| tools/bash.ts | `cwd` | const | 126 |
| tools/bash.ts | `signal` | const | 129 |
| tools/bash.ts | `onOutputEvent` | const | 132 |
| tools/bash.ts | `shellExecutionConfig` | const | 157 |
| tools/bash.ts | `stdout` | variable | 183 |
| tools/bash.ts | `stderr` | variable | 184 |
| tools/bash.ts | `ansiOutput` | const | 188 |
| tools/bash.ts | `output` | const | 208 |
| tools/bash.ts | `formatBytes` | function | 239 |
| utils/ripgrep.ts | `execFileAsync` | const | 9 |
| utils/ripgrep.ts | `results` | const | 62 |
| tools/grep.ts | `inputSchema` | const | 18 |
| tools/grep.ts | `MAX_RESULTS` | const | 32 |
| tools/grep.ts | `Output` | type | 34 |
| tools/grep.ts | `result` | variable | 63 |
| tools/grep.ts | `maxTokens` | const | 69 |
| tools/grep.ts | `estimatedTokens` | const | 72 |
| tools/grep.ts | `start` | const | 85 |
| tools/grep.ts | `absolutePath` | const | 86 |
| tools/grep.ts | `args` | const | 90 |
| tools/grep.ts | `results` | const | 96 |
| tools/grep.ts | `stats` | const | 99 |
| tools/grep.ts | `matches` | const | 110 |
| tools/grep.ts | `timeComparison` | const | 114 |
| tools/grep.ts | `output` | const | 123 |
| mcp/client.ts | `McpName` | type | 20 |
| mcp/client.ts | `ConnectedClient` | interface | 22 |
| mcp/client.ts | `FailedClient` | interface | 29 |
| mcp/client.ts | `WrappedClient` | type | 35 |
| mcp/client.ts | `connectedClients` | variable | 37 |
| mcp/client.ts | `connectToServer` | function | 42 |
| mcp/client.ts | `transport` | const | 46 |
| mcp/client.ts | `client` | const | 509 |
| mcp/client.ts | `CONNECTION_TIMEOUT_MS` | const | 70 |
| mcp/client.ts | `connectPromise` | const | 71 |
| mcp/client.ts | `timeoutPromise` | const | 202 |
| mcp/client.ts | `timeoutId` | const | 203 |
| mcp/client.ts | `stderrListener` | const | 91 |
| mcp/client.ts | `errorText` | const | 92 |
| mcp/client.ts | `servers` | const | 477 |
| mcp/client.ts | `closePromise` | const | 148 |
| mcp/client.ts | `clients` | const | 495 |
| mcp/client.ts | `tools` | const | 174 |
| mcp/client.ts | `toolListTimeoutMs` | const | 186 |
| mcp/client.ts | `getToolsPromise` | const | 188 |
| mcp/client.ts | `capabilities` | const | 510 |
| mcp/client.ts | `response` | const | 520 |
| mcp/client.ts | `serverTools` | const | 217 |
| mcp/client.ts | `buildDescription` | const | 221 |
| mcp/client.ts | `desc` | variable | 222 |
| mcp/client.ts | `schema` | const | 224 |
| mcp/client.ts | `required` | const | 225 |
| mcp/client.ts | `params` | const | 230 |
| mcp/client.ts | `MAX_RETRIES` | const | 256 |
| mcp/client.ts | `RETRY_DELAY_MS` | const | 257 |
| mcp/client.ts | `lastError` | variable | 258 |
| mcp/client.ts | `cleanedInput` | variable | 263 |
| mcp/client.ts | `query` | const | 265 |
| mcp/client.ts | `maxLength` | const | 268 |
| mcp/client.ts | `result` | const | 280 |
| mcp/client.ts | `errorMessage` | const | 294 |
| mcp/client.ts | `is400Error` | const | 297 |
| mcp/client.ts | `formatMCPResult` | function | 358 |
| mcp/client.ts | `resources` | const | 390 |
| mcp/client.ts | `serverResources` | const | 411 |
| mcp/client.ts | `wrapped` | const | 496 |
| mcp/client.ts | `textContent` | const | 452 |
| agents/schema.ts | `result` | const | 65 |
| agents/schema.ts | `messages` | const | 92 |
| agents/schema.ts | `pathStr` | const | 93 |
| agents/schema.ts | `now` | const | 110 |
| agents/manager.ts | `ensureDir` | function | 48 |
| agents/manager.ts | `agentExistsInDir` | function | 59 |
| agents/manager.ts | `filePath` | const | 149 |
| agents/manager.ts | `readAgentConfig` | function | 72 |
| agents/manager.ts | `content` | const | 272 |
| agents/manager.ts | `parsed` | const | 273 |
| agents/manager.ts | `validation` | const | 275 |
| agents/manager.ts | `writeAgentConfig` | function | 87 |
| agents/manager.ts | `listAgentsInDir` | function | 99 |
| agents/manager.ts | `files` | const | 107 |
| agents/manager.ts | `jsonFiles` | const | 108 |
| agents/manager.ts | `configs` | const | 110 |
| agents/manager.ts | `dirPath` | const | 137 |
| agents/manager.ts | `existsInGlobal` | const | 245 |
| agents/manager.ts | `existsInProject` | const | 246 |
| agents/manager.ts | `fullConfig` | const | 148 |
| agents/manager.ts | `existing` | const | 283 |
| agents/manager.ts | `updated` | const | 168 |
| agents/manager.ts | `projectDir` | const | 243 |
| agents/manager.ts | `globalDir` | const | 242 |
| agents/manager.ts | `projectPath` | const | 194 |
| agents/manager.ts | `globalPath` | const | 207 |
| agents/manager.ts | `agent` | const | 255 |
| utils/shell.ts | `QueuedCommand` | type | 19 |
| utils/shell.ts | `TEMPFILE_PREFIX` | const | 27 |
| utils/shell.ts | `DEFAULT_TIMEOUT` | const | 28 |
| utils/shell.ts | `binShell` | const | 46 |
| utils/shell.ts | `id` | const | 70 |
| utils/shell.ts | `queued` | const | 109 |
| utils/shell.ts | `result` | const | 112 |
| utils/shell.ts | `fullCommand` | const | 129 |
| utils/shell.ts | `startTime` | const | 133 |
| utils/shell.ts | `interrupted` | variable | 134 |
| utils/shell.ts | `abortListener` | const | 136 |
| utils/shell.ts | `stdout` | const | 160 |
| utils/shell.ts | `stderr` | const | 161 |
| utils/shell.ts | `statusStr` | const | 162 |
| utils/shell.ts | `code` | const | 163 |
| utils/shell.ts | `childPids` | const | 176 |
| agents/init.ts | `__filename` | const | 13 |
| agents/init.ts | `__dirname` | const | 14 |
| agents/init.ts | `DEFAULT_TEMPLATES` | const | 19 |
| agents/init.ts | `loadTemplate` | function | 32 |
| agents/init.ts | `templatePath` | const | 33 |
| agents/init.ts | `content` | const | 34 |
| agents/init.ts | `globalDir` | const | 54 |
| agents/init.ts | `existing` | const | 109 |
| agents/init.ts | `fs` | const | 71 |
| agents/init.ts | `templates` | const | 106 |
| agents/config-merger.ts | `systemPrompt` | const | 38 |
| agents/config-merger.ts | `filteredTools` | const | 41 |
| agents/config-merger.ts | `mcpServers` | const | 44 |
| agents/config-merger.ts | `mergeSystemPrompt` | function | 59 |
| agents/config-merger.ts | `basePrompts` | const | 63 |
| agents/config-merger.ts | `filterTools` | function | 80 |
| agents/config-merger.ts | `toolEnabled` | const | 86 |
| agents/config-merger.ts | `parts` | const | 93 |
| agents/config-merger.ts | `serverName` | const | 95 |
| agents/config-merger.ts | `toolName` | const | 96 |
| agents/config-merger.ts | `serverConfig` | const | 99 |
| agents/config-merger.ts | `filterMCPServers` | function | 122 |
| agents/config-merger.ts | `filtered` | const | 126 |
| agents/config-merger.ts | `agentServerConfig` | const | 129 |
| agents/config-merger.ts | `combinedDisabledTools` | const | 137 |
| agents/config-merger.ts | `uniqueDisabledTools` | const | 143 |
| agents/config-merger.ts | `merged` | const | 165 |
| llm/anthropic.ts | `SONNET_COST_PER_MILLION_INPUT_TOKENS` | const | 13 |
| llm/anthropic.ts | `SONNET_COST_PER_MILLION_OUTPUT_TOKENS` | const | 14 |
| llm/anthropic.ts | `formatToolsForAPI` | function | 19 |
| llm/anthropic.ts | `inputSchema` | variable | 21 |
| llm/anthropic.ts | `calculateCost` | function | 44 |
| llm/anthropic.ts | `costPerMillionInput` | const | 45 |
| llm/anthropic.ts | `costPerMillionOutput` | const | 46 |
| llm/anthropic.ts | `inputCost` | const | 48 |
| llm/anthropic.ts | `outputCost` | const | 49 |
| llm/anthropic.ts | `apiKey` | const | 72 |
| llm/anthropic.ts | `anthropic` | const | 77 |
| llm/anthropic.ts | `model` | const | 82 |
| llm/anthropic.ts | `apiMessages` | const | 85 |
| llm/anthropic.ts | `apiTools` | const | 91 |
| llm/anthropic.ts | `startTime` | const | 93 |
| llm/anthropic.ts | `requestParams` | const | 97 |
| llm/anthropic.ts | `thinkingBudgetTokens` | const | 108 |
| llm/anthropic.ts | `response` | const | 115 |
| llm/anthropic.ts | `durationMs` | const | 117 |
| llm/anthropic.ts | `costUSD` | const | 118 |
| llm/anthropic.ts | `formatted` | variable | 150 |
| llm/cerebras.ts | `CEREBRAS_BASE_URL` | const | 13 |
| llm/cerebras.ts | `CEREBRAS_COST_PER_MILLION_TOKENS` | const | 14 |
| llm/cerebras.ts | `MAX_RETRIES` | const | 17 |
| llm/cerebras.ts | `BASE_DELAY_MS` | const | 18 |
| llm/cerebras.ts | `MAX_DELAY_MS` | const | 19 |
| llm/cerebras.ts | `TIMEOUT_MS_BY_ATTEMPT` | const | 22 |
| llm/cerebras.ts | `REQUEST_DELAY_MS` | const | 30 |
| llm/cerebras.ts | `lastRequestTime` | variable | 31 |
| llm/cerebras.ts | `sleep` | function | 36 |
| llm/cerebras.ts | `cleanDataForCerebras` | function | 50 |
| llm/cerebras.ts | `cleaned` | const | 212 |
| llm/cerebras.ts | `parsed` | const | 250 |
| llm/cerebras.ts | `attempts` | variable | 75 |
| llm/cerebras.ts | `pythonDictPattern` | const | 103 |
| llm/cerebras.ts | `cleanKey` | const | 162 |
| llm/cerebras.ts | `sanitizeForJSON` | function | 177 |
| llm/cerebras.ts | `normalized` | variable | 184 |
| llm/cerebras.ts | `jsonSafe` | const | 190 |
| llm/cerebras.ts | `cleanMessageForCerebras` | function | 210 |
| llm/cerebras.ts | `cleanedTc` | const | 231 |
| llm/cerebras.ts | `validateRequestJSON` | function | 281 |
| llm/cerebras.ts | `serialized` | const | 284 |
| llm/cerebras.ts | `msg` | const | 292 |
| llm/cerebras.ts | `tc` | const | 311 |
| llm/cerebras.ts | `calculateBackoffDelay` | function | 350 |
| llm/cerebras.ts | `delay` | const | 995 |
| llm/cerebras.ts | `jitter` | const | 353 |
| llm/cerebras.ts | `isRetryableError` | function | 360 |
| llm/cerebras.ts | `status` | const | 1126 |
| llm/cerebras.ts | `formatToolsForOpenAI` | function | 383 |
| llm/cerebras.ts | `inputSchema` | variable | 395 |
| llm/cerebras.ts | `refPath` | const | 408 |
| llm/cerebras.ts | `cleanedSchema` | const | 430 |
| llm/cerebras.ts | `prop` | const | 438 |
| llm/cerebras.ts | `cleanedProp` | const | 439 |
| llm/cerebras.ts | `description` | variable | 476 |
| llm/cerebras.ts | `calculateCost` | function | 499 |
| llm/cerebras.ts | `totalTokens` | const | 500 |
| llm/cerebras.ts | `now` | const | 524 |
| llm/cerebras.ts | `timeSinceLastRequest` | const | 525 |
| llm/cerebras.ts | `delayNeeded` | const | 527 |
| llm/cerebras.ts | `apiKey` | const | 532 |
| llm/cerebras.ts | `model` | const | 537 |
| llm/cerebras.ts | `apiMessages` | const | 540 |
| llm/cerebras.ts | `pendingToolResponses` | const | 553 |
| llm/cerebras.ts | `flushPendingToolResponses` | const | 556 |
| llm/cerebras.ts | `content` | const | 1079 |
| llm/cerebras.ts | `toolResults` | const | 571 |
| llm/cerebras.ts | `textContent` | const | 682 |
| llm/cerebras.ts | `tr` | const | 577 |
| llm/cerebras.ts | `toolContent` | variable | 587 |
| llm/cerebras.ts | `textStr` | const | 606 |
| llm/cerebras.ts | `userContent` | variable | 625 |
| llm/cerebras.ts | `contentArray` | const | 656 |
| llm/cerebras.ts | `toolCalls` | const | 657 |
| llm/cerebras.ts | `toolInput` | const | 670 |
| llm/cerebras.ts | `trimmedTextContent` | const | 691 |
| llm/cerebras.ts | `msgContent` | const | 693 |
| llm/cerebras.ts | `apiTools` | const | 721 |
| llm/cerebras.ts | `cleanedApiMessages` | variable | 725 |
| llm/cerebras.ts | `startTime` | const | 727 |
| llm/cerebras.ts | `timestamp` | const | 728 |
| llm/cerebras.ts | `requestParams` | variable | 733 |
| llm/cerebras.ts | `MAX_MESSAGES_TO_SEND` | const | 753 |
| llm/cerebras.ts | `originalCount` | const | 756 |
| llm/cerebras.ts | `hasSystemMessage` | const | 758 |
| llm/cerebras.ts | `systemMessages` | const | 759 |
| llm/cerebras.ts | `recentMessages` | const | 760 |
| llm/cerebras.ts | `validationResult` | const | 770 |
| llm/cerebras.ts | `failedResult` | const | 773 |
| llm/cerebras.ts | `filename` | const | 786 |
| llm/cerebras.ts | `contentPreview` | const | 1050 |
| llm/cerebras.ts | `lastError` | variable | 861 |
| llm/cerebras.ts | `response` | variable | 862 |
| llm/cerebras.ts | `timeoutForAttempt` | const | 867 |
| llm/cerebras.ts | `client` | const | 868 |
| llm/cerebras.ts | `errorType` | const | 1125 |
| llm/cerebras.ts | `contentStr` | const | 916 |
| llm/cerebras.ts | `contentLen` | const | 917 |
| llm/cerebras.ts | `hasUnescapedQuotes` | const | 924 |
| llm/cerebras.ts | `hasSingleQuotes` | const | 925 |
| llm/cerebras.ts | `hasNewlines` | const | 926 |
| llm/cerebras.ts | `hasBackslashes` | const | 927 |
| llm/cerebras.ts | `warnings` | const | 930 |
| llm/cerebras.ts | `nextTimeout` | const | 996 |
| llm/cerebras.ts | `responseFilename` | const | 1019 |
| llm/cerebras.ts | `durationMs` | const | 1028 |
| llm/cerebras.ts | `costUSD` | const | 1029 |
| llm/cerebras.ts | `choice` | const | 1073 |
| llm/cerebras.ts | `errorFilename` | const | 1130 |
| llm/cerebras.ts | `errorBody` | const | 1196 |
| llm/cerebras.ts | `enhancedError` | const | 1222 |
| llm/router.ts | `config` | const | 33 |
| llm/router.ts | `provider` | const | 36 |
| llm/router.ts | `enableThinking` | const | 39 |
| llm/router.ts | `ultrathinkMode` | const | 40 |
| sdk/typescript/index.ts | `tools` | const | 193 |
| sdk/typescript/index.ts | `model` | const | 194 |
| sdk/typescript/index.ts | `apiKey` | const | 195 |
| sdk/typescript/index.ts | `userMessage` | const | 198 |
| sdk/typescript/index.ts | `messagesForQuery` | const | 202 |
| sdk/typescript/index.ts | `systemPrompt` | const | 205 |
| sdk/typescript/index.ts | `context` | const | 228 |
| sdk/typescript/index.ts | `canUseTool` | const | 234 |
| sdk/typescript/index.ts | `toolContext` | const | 242 |
| sdk/typescript/index.ts | `queryMessages` | const | 156 |
| sdk/typescript/index.ts | `summaryPrompt` | const | 296 |
| sdk/typescript/index.ts | `summaryMessages` | const | 303 |
| sdk/typescript/index.ts | `assistantMessage` | const | 314 |
| agents/tool-wrapper.ts | `AgentToolInputSchema` | const | 18 |
| agents/tool-wrapper.ts | `createAgentTool` | function | 25 |
| agents/tool-wrapper.ts | `agent` | const | 48 |
| agents/tool-wrapper.ts | `allTools` | const | 59 |
| agents/tool-wrapper.ts | `nonAgentTools` | const | 60 |
| agents/tool-wrapper.ts | `baseConfig` | const | 63 |
| agents/tool-wrapper.ts | `clientConfig` | const | 66 |
| agents/tool-wrapper.ts | `client` | const | 77 |
| agents/tool-wrapper.ts | `result` | const | 80 |
| agents/tool-wrapper.ts | `responseTexts` | const | 83 |
| agents/tool-wrapper.ts | `text` | const | 86 |
| agents/tool-wrapper.ts | `response` | const | 93 |
| agents/tool-wrapper.ts | `errorMessage` | const | 108 |
| agents/tool-wrapper.ts | `agents` | const | 135 |
| agents/tool-wrapper.ts | `allAgents` | const | 136 |
| agents/tool-wrapper.ts | `agentTools` | const | 139 |
| tools/index.ts | `cachedTools` | variable | 11 |
| tools/index.ts | `cachedMCPTools` | variable | 12 |
| tools/index.ts | `tools` | variable | 37 |
| tools/index.ts | `mcpLoadTimeoutMs` | const | 45 |
| tools/index.ts | `mcpToolsPromise` | const | 47 |
| tools/index.ts | `timeoutPromise` | const | 49 |
| tools/index.ts | `timeoutId` | const | 50 |
| tools/index.ts | `mcpTools` | const | 63 |
| tools/index.ts | `config` | const | 68 |
| tools/index.ts | `parts` | const | 77 |
| tools/index.ts | `serverName` | const | 80 |
| tools/index.ts | `toolName` | const | 81 |
| tools/index.ts | `serverConfig` | const | 83 |
| tools/index.ts | `agentTools` | const | 109 |
| tools/index.ts | `enabledFlags` | const | 119 |
| tools/index.ts | `enabledTools` | const | 129 |
| utils/version-check.ts | `VersionInfo` | interface | 9 |
| utils/version-check.ts | `VERSION_CACHE_FILE` | const | 18 |
| utils/version-check.ts | `CACHE_DURATION` | const | 19 |
| utils/version-check.ts | `parseVersion` | function | 24 |
| utils/version-check.ts | `compareVersions` | function | 32 |
| utils/version-check.ts | `parts1` | const | 33 |
| utils/version-check.ts | `parts2` | const | 34 |
| utils/version-check.ts | `part1` | const | 37 |
| utils/version-check.ts | `part2` | const | 38 |
| utils/version-check.ts | `possiblePaths` | const | 54 |
| utils/version-check.ts | `pkg` | const | 121 |
| utils/version-check.ts | `cache` | const | 97 |
| utils/version-check.ts | `data` | variable | 113 |
| utils/version-check.ts | `version` | const | 122 |
| utils/version-check.ts | `isDeprecated` | const | 154 |
| utils/version-check.ts | `getChangesSummary` | function | 181 |
| utils/version-check.ts | `versionDiff` | const | 182 |
| utils/version-check.ts | `currParts` | const | 189 |
| utils/version-check.ts | `latestParts` | const | 190 |
| utils/version-check.ts | `lines` | const | 239 |
| utils/permission-check.ts | `PermissionCheckResult` | interface | 10 |
| utils/permission-check.ts | `scriptPath` | const | 22 |
| utils/permission-check.ts | `cliPath` | const | 30 |
| utils/permission-check.ts | `stats` | const | 38 |
| utils/permission-check.ts | `lines` | const | 104 |
| utils/permission-check.ts | `suggestion` | const | 114 |
| utils/permission-check.ts | `maxLen` | const | 115 |
| utils/doctor.ts | `DiagnosticResult` | interface | 11 |
| utils/doctor.ts | `results` | const | 22 |
| utils/doctor.ts | `checkNodeVersion` | function | 38 |
| utils/doctor.ts | `version` | const | 70 |
| utils/doctor.ts | `major` | const | 41 |
| utils/doctor.ts | `checkNpmAvailable` | function | 68 |
| utils/doctor.ts | `checkDependencies` | function | 88 |
| utils/doctor.ts | `packageJsonPath` | variable | 91 |
| utils/doctor.ts | `distPath` | const | 94 |
| utils/doctor.ts | `rootPath` | const | 101 |
| utils/doctor.ts | `currentDir` | variable | 109 |
| utils/doctor.ts | `tryPath` | const | 111 |
| utils/doctor.ts | `packageJson` | const | 128 |
| utils/doctor.ts | `deps` | const | 129 |
| utils/doctor.ts | `details` | const | 250 |
| utils/doctor.ts | `allPresent` | variable | 132 |
| utils/doctor.ts | `keyDeps` | const | 135 |
| utils/doctor.ts | `checkConfigFiles` | function | 170 |
| utils/doctor.ts | `homeDir` | const | 172 |
| utils/doctor.ts | `globalConfigPath` | const | 173 |
| utils/doctor.ts | `projectConfigPath` | const | 174 |
| utils/doctor.ts | `hasConfig` | variable | 177 |
| utils/doctor.ts | `checkConfiguration` | function | 211 |
| utils/doctor.ts | `config` | const | 213 |
| utils/doctor.ts | `checkMCPServers` | function | 247 |
| utils/doctor.ts | `servers` | const | 249 |
| utils/doctor.ts | `status` | const | 269 |
| utils/doctor.ts | `connected` | const | 268 |
| utils/doctor.ts | `message` | const | 270 |
| utils/doctor.ts | `checkTools` | function | 294 |
| utils/doctor.ts | `toolsCheckTimeoutMs` | const | 297 |
| utils/doctor.ts | `toolsPromise` | const | 299 |
| utils/doctor.ts | `tools` | const | 300 |
| utils/doctor.ts | `builtInTools` | const | 302 |
| utils/doctor.ts | `mcpTools` | const | 303 |
| utils/doctor.ts | `timeoutPromise` | const | 312 |
| utils/doctor.ts | `timeoutId` | const | 313 |
| utils/doctor.ts | `toolStats` | const | 323 |
| utils/doctor.ts | `lines` | const | 352 |
| utils/doctor.ts | `icon` | const | 359 |
| utils/doctor.ts | `statusStr` | const | 361 |
| utils/doctor.ts | `failCount` | const | 376 |
| utils/doctor.ts | `warnCount` | const | 377 |
| tui/prompt-history.ts | `MAX_HISTORY_ENTRIES` | const | 18 |
| tui/prompt-history.ts | `getHistoryFilePath` | function | 23 |
| tui/prompt-history.ts | `configDir` | const | 32 |
| tui/prompt-history.ts | `ensureConfigDir` | function | 31 |
| tui/prompt-history.ts | `historyPath` | const | 130 |
| tui/prompt-history.ts | `data` | const | 47 |
| tui/prompt-history.ts | `entries` | const | 48 |
| tui/prompt-history.ts | `history` | const | 116 |
| tui/prompt-history.ts | `entry` | const | 82 |
| tui/prompt-history.ts | `trimmedHistory` | const | 93 |
| tui/prompt-history.ts | `queryLower` | const | 117 |
| tui/conversation-storage.ts | `homeDir` | const | 83 |
| tui/conversation-storage.ts | `ensureConversationsDir` | function | 90 |
| tui/conversation-storage.ts | `dir` | const | 224 |
| tui/conversation-storage.ts | `filePath` | const | 225 |
| tui/conversation-storage.ts | `serializable` | const | 140 |
| tui/conversation-storage.ts | `content` | const | 486 |
| tui/conversation-storage.ts | `loaded` | const | 192 |
| tui/conversation-storage.ts | `files` | const | 184 |
| tui/conversation-storage.ts | `conversations` | const | 185 |
| tui/conversation-storage.ts | `conv` | variable | 195 |
| tui/conversation-storage.ts | `now` | const | 258 |
| tui/conversation-storage.ts | `mainBranch` | const | 476 |
| tui/conversation-storage.ts | `messagesWithIds` | const | 298 |
| tui/conversation-storage.ts | `msgAny` | const | 299 |
| tui/conversation-storage.ts | `enhancedCheckpoints` | const | 320 |
| tui/conversation-storage.ts | `currentBranch` | const | 352 |
| tui/conversation-storage.ts | `parentMessages` | const | 363 |
| tui/conversation-storage.ts | `uniqueBranchName` | variable | 366 |
| tui/conversation-storage.ts | `counter` | variable | 367 |
| tui/conversation-storage.ts | `newBranchId` | const | 374 |
| tui/conversation-storage.ts | `newBranch` | const | 375 |
| tui/conversation-storage.ts | `targetBranch` | const | 413 |
| tui/conversation-storage.ts | `checkpoint` | const | 450 |
| tui/conversation-storage.ts | `firstUserMessage` | const | 484 |
| tui/conversation-storage.ts | `text` | const | 495 |
| tui/logger.ts | `SWARM_CLI_DIR` | const | 12 |
| tui/logger.ts | `LOGS_DIR` | const | 13 |
| tui/logger.ts | `timestamp` | const | 33 |
| tui/logger.ts | `filename` | const | 56 |
| tui/logger.ts | `filepath` | const | 57 |
| tui/logger.ts | `line` | const | 60 |
| tui/components/AnsiOutputText.tsx | `AnsiOutputTextProps` | interface | 13 |
| tui/components/AnsiOutputText.tsx | `AnsiTokenText` | const | 25 |
| tui/components/AnsiOutputText.tsx | `styleProps` | const | 27 |
| tui/components/AnsiOutputText.tsx | `AnsiLineText` | const | 64 |
| tui/components/AnsiOutputText.tsx | `startLine` | const | 91 |
| tui/components/AnsiOutputText.tsx | `endLine` | const | 92 |
| tui/components/AnsiOutputText.tsx | `visibleLines` | const | 93 |
| tui/components/MessageList.tsx | `MessageListProps` | interface | 14 |
| tui/components/MessageList.tsx | `BLUE` | const | 21 |
| tui/components/MessageList.tsx | `PURPLE` | const | 22 |
| tui/components/MessageList.tsx | `CYAN` | const | 23 |
| tui/components/MessageList.tsx | `WHITE` | const | 24 |
| tui/components/MessageList.tsx | `DIM_WHITE` | const | 25 |
| tui/components/MessageList.tsx | `COMPACT_MAX_LINES` | const | 28 |
| tui/components/MessageList.tsx | `VERBOSE_MAX_LINES` | const | 29 |
| tui/components/MessageList.tsx | `MAX_TEXT_LENGTH` | const | 30 |
| tui/components/MessageList.tsx | `toolExecutions` | const | 35 |
| tui/components/MessageList.tsx | `executions` | const | 36 |
| tui/components/MessageList.tsx | `content` | const | 180 |
| tui/components/MessageList.tsx | `output` | const | 45 |
| tui/components/MessageList.tsx | `toolUseBlocks` | const | 185 |
| tui/components/MessageList.tsx | `existing` | const | 62 |
| tui/components/MessageList.tsx | `displayMessages` | const | 74 |
| tui/components/MessageList.tsx | `hasToolResult` | const | 79 |
| tui/components/MessageList.tsx | `pendingTools` | const | 90 |
| tui/components/MessageList.tsx | `lastTool` | const | 127 |
| tui/components/MessageList.tsx | `toolBaseName` | const | 311 |
| tui/components/MessageList.tsx | `MessageItemProps` | interface | 144 |
| tui/components/MessageList.tsx | `MessageItemWithTools` | const | 151 |
| tui/components/MessageList.tsx | `maxLines` | const | 199 |
| tui/components/MessageList.tsx | `textBlocks` | const | 184 |
| tui/components/MessageList.tsx | `execution` | const | 220 |
| tui/components/MessageList.tsx | `compactText` | const | 242 |
| tui/components/MessageList.tsx | `processedText` | variable | 244 |
| tui/components/MessageList.tsx | `charTruncated` | variable | 245 |
| tui/components/MessageList.tsx | `lines` | const | 313 |
| tui/components/MessageList.tsx | `ToolExecution` | const | 265 |
| tui/components/MessageList.tsx | `formatToolDisplay` | const | 273 |
| tui/components/MessageList.tsx | `file` | const | 330 |
| tui/components/MessageList.tsx | `cmd` | const | 289 |
| tui/components/MessageList.tsx | `shortCmd` | const | 290 |
| tui/components/MessageList.tsx | `pattern` | const | 293 |
| tui/components/MessageList.tsx | `path` | const | 294 |
| tui/components/MessageList.tsx | `firstParam` | const | 298 |
| tui/components/MessageList.tsx | `value` | const | 300 |
| tui/components/MessageList.tsx | `formatOutputSummary` | const | 308 |
| tui/components/MessageList.tsx | `outputStr` | const | 390 |
| tui/components/MessageList.tsx | `matches` | const | 333 |
| tui/components/MessageList.tsx | `displayLines` | const | 395 |
| tui/components/MessageList.tsx | `hasAnsiOutput` | const | 347 |
| tui/components/MessageList.tsx | `result` | const | 362 |
| tui/components/MessageList.tsx | `summaryLines` | const | 365 |
| tui/components/MessageList.tsx | `displayedCount` | const | 366 |
| tui/components/MessageList.tsx | `remainingLines` | const | 396 |
| tui/components/MessageList.tsx | `outputLines` | const | 391 |
| tui/components/MessageList.tsx | `maxOutputLines` | const | 394 |
| mcp/resources.ts | `execAsync` | const | 11 |
| mcp/resources.ts | `gitRoot` | const | 54 |
| mcp/resources.ts | `normalizedPath` | const | 44 |
| mcp/resources.ts | `normalizedGitRoot` | const | 45 |
| mcp/resources.ts | `files` | const | 62 |
| mcp/resources.ts | `resources` | const | 67 |
| mcp/resources.ts | `directories` | const | 68 |
| mcp/resources.ts | `uri` | const | 95 |
| mcp/resources.ts | `parts` | const | 84 |
| mcp/resources.ts | `currentPath` | variable | 85 |
| mcp/resources.ts | `allFiles` | const | 120 |
| mcp/resources.ts | `patternLower` | const | 126 |
| mcp/resources.ts | `fuzzyMatch` | const | 129 |
| mcp/resources.ts | `strLower` | const | 130 |
| mcp/resources.ts | `patternIdx` | variable | 131 |
| mcp/resources.ts | `strIdx` | variable | 132 |
| mcp/resources.ts | `matches` | const | 144 |
| mcp/resources.ts | `aName` | const | 148 |
| mcp/resources.ts | `bName` | const | 149 |
| mcp/resources.ts | `aExact` | const | 151 |
| mcp/resources.ts | `bExact` | const | 152 |
| mcp/resources.ts | `aStarts` | const | 156 |
| mcp/resources.ts | `bStarts` | const | 157 |
| mcp/resources.ts | `aContains` | const | 161 |
| mcp/resources.ts | `bContains` | const | 162 |
| mcp/resources.ts | `isInRepo` | const | 178 |
| mcp/resources.ts | `content` | const | 180 |
| mcp/resources.ts | `mimeType` | const | 181 |
| mcp/resources.ts | `getMimeType` | function | 193 |
| mcp/resources.ts | `ext` | const | 194 |
| mcp/resources.ts | `mimeTypes` | const | 196 |
| tui/components/InputBox.tsx | `InputBoxProps` | interface | 13 |
| tui/components/InputBox.tsx | `COMMANDS` | const | 25 |
| tui/components/InputBox.tsx | `BLUE` | const | 39 |
| tui/components/InputBox.tsx | `PURPLE` | const | 40 |
| tui/components/InputBox.tsx | `CYAN` | const | 41 |
| tui/components/InputBox.tsx | `WHITE` | const | 42 |
| tui/components/InputBox.tsx | `DIM_WHITE` | const | 43 |
| tui/components/InputBox.tsx | `value` | const | 65 |
| tui/components/InputBox.tsx | `setValue` | const | 66 |
| tui/components/InputBox.tsx | `handleSubmit` | const | 69 |
| tui/components/InputBox.tsx | `width` | const | 80 |
| tui/components/InputBox.tsx | `line` | const | 81 |
| tui/components/InputBox.tsx | `lineColor` | const | 84 |
| tui/components/InputBox.tsx | `fuzzyMatch` | const | 87 |
| tui/components/InputBox.tsx | `patternLower` | const | 88 |
| tui/components/InputBox.tsx | `strLower` | const | 89 |
| tui/components/InputBox.tsx | `patternIdx` | variable | 91 |
| tui/components/InputBox.tsx | `strIdx` | variable | 92 |
| tui/components/InputBox.tsx | `formatRelativeTime` | const | 105 |
| tui/components/InputBox.tsx | `now` | const | 106 |
| tui/components/InputBox.tsx | `then` | const | 107 |
| tui/components/InputBox.tsx | `diffMs` | const | 108 |
| tui/components/InputBox.tsx | `diffSec` | const | 109 |
| tui/components/InputBox.tsx | `diffMin` | const | 110 |
| tui/components/InputBox.tsx | `diffHour` | const | 111 |
| tui/components/InputBox.tsx | `diffDay` | const | 112 |
| tui/components/InputBox.tsx | `getAtMentionPattern` | const | 121 |
| tui/components/InputBox.tsx | `cursorPos` | const | 122 |
| tui/components/InputBox.tsx | `beforeCursor` | const | 123 |
| tui/components/InputBox.tsx | `lastAtIndex` | const | 327 |
| tui/components/InputBox.tsx | `pattern` | const | 130 |
| tui/components/InputBox.tsx | `atMentionPattern` | const | 138 |
| tui/components/InputBox.tsx | `debounceTimerRef` | const | 141 |
| tui/components/InputBox.tsx | `files` | const | 160 |
| tui/components/InputBox.tsx | `commandSuggestions` | const | 178 |
| tui/components/InputBox.tsx | `search` | const | 464 |
| tui/components/InputBox.tsx | `matches` | const | 223 |
| tui/components/InputBox.tsx | `aName` | const | 192 |
| tui/components/InputBox.tsx | `bName` | const | 193 |
| tui/components/InputBox.tsx | `searchLower` | const | 194 |
| tui/components/InputBox.tsx | `aStartsWith` | const | 196 |
| tui/components/InputBox.tsx | `bStartsWith` | const | 197 |
| tui/components/InputBox.tsx | `showCommandSuggestions` | const | 206 |
| tui/components/InputBox.tsx | `showFileSuggestions` | const | 207 |
| tui/components/InputBox.tsx | `promptSuggestions` | const | 210 |
| tui/components/InputBox.tsx | `query` | const | 215 |
| tui/components/InputBox.tsx | `showPromptSuggestions` | const | 231 |
| tui/components/InputBox.tsx | `VISIBLE_ITEMS` | const | 234 |
| tui/components/InputBox.tsx | `getVisibleWindow` | const | 235 |
| tui/components/InputBox.tsx | `halfWindow` | const | 237 |
| tui/components/InputBox.tsx | `start` | variable | 238 |
| tui/components/InputBox.tsx | `end` | variable | 239 |
| tui/components/InputBox.tsx | `selected` | const | 353 |
| tui/components/InputBox.tsx | `newValue` | const | 328 |
| tui/components/InputBox.tsx | `window` | const | 507 |
| tui/components/InputBox.tsx | `visibleFiles` | const | 428 |
| tui/components/InputBox.tsx | `actualIndex` | const | 513 |
| tui/components/InputBox.tsx | `isSelected` | const | 514 |
| tui/components/InputBox.tsx | `displayName` | const | 435 |
| tui/components/InputBox.tsx | `visibleCommands` | const | 455 |
| tui/components/InputBox.tsx | `cmdName` | const | 465 |
| tui/components/InputBox.tsx | `highlighted` | const | 466 |
| tui/components/InputBox.tsx | `searchIdx` | variable | 468 |
| tui/components/InputBox.tsx | `char` | const | 470 |
| tui/components/InputBox.tsx | `charLower` | const | 471 |
| tui/components/InputBox.tsx | `visiblePrompts` | const | 508 |
| tui/components/InputBox.tsx | `displayText` | const | 517 |
| tui/components/InputBox.tsx | `timeStr` | const | 521 |
| tui/components/StatusBar.tsx | `StatusBarProps` | interface | 9 |
| tui/components/StatusBar.tsx | `width` | const | 43 |
| tui/components/StatusBar.tsx | `line` | const | 44 |
| tui/components/StatusBar.tsx | `BLUE` | const | 47 |
| tui/components/StatusBar.tsx | `PURPLE` | const | 48 |
| tui/components/StatusBar.tsx | `CYAN` | const | 49 |
| tui/components/StatusBar.tsx | `WHITE` | const | 50 |
| tui/components/StatusBar.tsx | `DIM_WHITE` | const | 51 |
| tui/components/StatusBar.tsx | `formatCompact` | const | 54 |
| tui/components/StatusBar.tsx | `contextPct` | const | 61 |
| tui/components/StatusBar.tsx | `getModeDesc` | const | 64 |
| tui/components/StatusBar.tsx | `baseMode` | const | 65 |
| tui/components/Header.tsx | `require` | const | 10 |
| tui/components/Header.tsx | `HeaderProps` | interface | 13 |
| tui/components/Header.tsx | `CYAN` | const | 23 |
| tui/components/Header.tsx | `WHITE` | const | 24 |
| tui/components/Header.tsx | `DIM_WHITE` | const | 25 |
| tui/components/Header.tsx | `PURPLE` | const | 26 |
| tui/components/Header.tsx | `width` | const | 30 |
| tui/components/Header.tsx | `line` | const | 31 |
| tui/components/Header.tsx | `shortModel` | const | 34 |
| tui/components/Header.tsx | `getModeText` | const | 37 |
| tui/components/Header.tsx | `baseMode` | const | 38 |
| tui/components/ConversationList.tsx | `ConversationListProps` | interface | 18 |
| tui/components/ConversationList.tsx | `BLUE` | const | 24 |
| tui/components/ConversationList.tsx | `PURPLE` | const | 25 |
| tui/components/ConversationList.tsx | `CYAN` | const | 26 |
| tui/components/ConversationList.tsx | `WHITE` | const | 27 |
| tui/components/ConversationList.tsx | `GREEN` | const | 28 |
| tui/components/ConversationList.tsx | `YELLOW` | const | 29 |
| tui/components/ConversationList.tsx | `DIM_WHITE` | const | 30 |
| tui/components/ConversationList.tsx | `terminalHeight` | const | 44 |
| tui/components/ConversationList.tsx | `terminalWidth` | const | 45 |
| tui/components/ConversationList.tsx | `loadConversations` | const | 51 |
| tui/components/ConversationList.tsx | `convs` | const | 53 |
| tui/components/ConversationList.tsx | `selectedConv` | const | 58 |
| tui/components/ConversationList.tsx | `listOverheadLines` | const | 62 |
| tui/components/ConversationList.tsx | `availableListLines` | const | 63 |
| tui/components/ConversationList.tsx | `linesPerConversation` | const | 64 |
| tui/components/ConversationList.tsx | `maxVisibleConversations` | const | 65 |
| tui/components/ConversationList.tsx | `totalItems` | const | 68 |
| tui/components/ConversationList.tsx | `detailsOverheadLines` | const | 83 |
| tui/components/ConversationList.tsx | `availableDetailsLines` | const | 84 |
| tui/components/ConversationList.tsx | `branches` | const | 184 |
| tui/components/ConversationList.tsx | `newIndex` | const | 113 |
| tui/components/ConversationList.tsx | `selectedBranch` | const | 123 |
| tui/components/ConversationList.tsx | `switched` | const | 125 |
| tui/components/ConversationList.tsx | `handleRenameSubmit` | const | 152 |
| tui/components/ConversationList.tsx | `updated` | const | 154 |
| tui/components/ConversationList.tsx | `visibleBranches` | const | 185 |
| tui/components/ConversationList.tsx | `canScrollUp` | const | 299 |
| tui/components/ConversationList.tsx | `canScrollDown` | const | 300 |
| tui/components/ConversationList.tsx | `actualIdx` | const | 252 |
| tui/components/ConversationList.tsx | `isSelected` | const | 339 |
| tui/components/ConversationList.tsx | `isCurrent` | const | 254 |
| tui/components/ConversationList.tsx | `prefix` | const | 255 |
| tui/components/ConversationList.tsx | `visibleStartIndex` | const | 288 |
| tui/components/ConversationList.tsx | `visibleEndIndex` | const | 289 |
| tui/components/ConversationList.tsx | `ListItem` | type | 292 |
| tui/components/ConversationList.tsx | `allItems` | const | 293 |
| tui/components/ConversationList.tsx | `visibleItems` | const | 298 |
| tui/components/ConversationList.tsx | `conv` | const | 338 |
| tui/components/ConversationList.tsx | `summary` | const | 391 |
| tui/components/ConversationList.tsx | `currentBranch` | const | 395 |
| tui/components/ConversationList.tsx | `messageCount` | const | 396 |
| tui/components/ConversationList.tsx | `branchCount` | const | 397 |
| tui/components/ConversationList.tsx | `date` | const | 392 |
| tui/components/ConversationList.tsx | `now` | const | 345 |
| tui/components/ConversationList.tsx | `isToday` | const | 346 |
| tui/components/ConversationList.tsx | `dateStr` | const | 347 |
| tui/components/ConversationList.tsx | `maxSummaryLength` | const | 350 |
| tui/components/ConversationList.tsx | `truncatedSummary` | const | 351 |
| tui/components/ConversationList.tsx | `formatConversationLabel` | function | 390 |
| tui/components/ConversationList.tsx | `branchInfo` | const | 399 |
| tui/components/ConfigPanel.tsx | `ConfigPanelProps` | interface | 13 |
| tui/components/ConfigPanel.tsx | `BLUE` | const | 28 |
| tui/components/ConfigPanel.tsx | `PURPLE` | const | 29 |
| tui/components/ConfigPanel.tsx | `CYAN` | const | 30 |
| tui/components/ConfigPanel.tsx | `WHITE` | const | 31 |
| tui/components/ConfigPanel.tsx | `RED` | const | 32 |
| tui/components/ConfigPanel.tsx | `GREEN` | const | 33 |
| tui/components/ConfigPanel.tsx | `DIM_WHITE` | const | 34 |
| tui/components/ConfigPanel.tsx | `Field` | type | 36 |
| tui/components/ConfigPanel.tsx | `getAvailableEditor` | const | 47 |
| tui/components/ConfigPanel.tsx | `value` | const | 73 |
| tui/components/ConfigPanel.tsx | `fields` | const | 106 |
| tui/components/ConfigPanel.tsx | `currentIndex` | const | 119 |
| tui/components/ConfigPanel.tsx | `levels` | const | 118 |
| tui/components/ConfigPanel.tsx | `editor` | const | 123 |
| tui/components/ConfigPanel.tsx | `launchSystemPromptEditor` | const | 137 |
| tui/components/ConfigPanel.tsx | `configDir` | const | 140 |
| tui/components/ConfigPanel.tsx | `promptPath` | const | 141 |
| tui/components/ConfigPanel.tsx | `fileExists` | const | 159 |
| tui/components/ConfigPanel.tsx | `getDefaultSystemPrompt` | const | 168 |
| tui/components/ConfigPanel.tsx | `saveConfig` | const | 190 |
| tui/components/ConfigPanel.tsx | `newConfig` | const | 191 |
| tui/components/common/SelectList.tsx | `CYAN` | const | 10 |
| tui/components/common/SelectList.tsx | `WHITE` | const | 11 |
| tui/components/common/SelectList.tsx | `DIM_WHITE` | const | 12 |
| tui/components/common/SelectList.tsx | `GREEN` | const | 13 |
| tui/components/common/SelectList.tsx | `BLUE` | const | 14 |
| tui/components/common/SelectList.tsx | `PURPLE` | const | 15 |
| tui/components/common/SelectList.tsx | `filteredItems` | const | 65 |
| tui/components/common/SelectList.tsx | `selectedItem` | const | 136 |
| tui/components/common/SelectList.tsx | `getVisibleWindow` | const | 142 |
| tui/components/common/SelectList.tsx | `start` | variable | 147 |
| tui/components/common/SelectList.tsx | `end` | variable | 148 |
| tui/components/common/SelectList.tsx | `visibleItems` | const | 159 |
| tui/components/common/SelectList.tsx | `hasMore` | const | 160 |
| tui/components/common/SelectList.tsx | `getStatusColor` | const | 166 |
| tui/components/common/SelectList.tsx | `absoluteIndex` | const | 239 |
| tui/components/common/SelectList.tsx | `isSelected` | const | 240 |
| tui/components/common/FormEditor.tsx | `CYAN` | const | 11 |
| tui/components/common/FormEditor.tsx | `WHITE` | const | 12 |
| tui/components/common/FormEditor.tsx | `DIM_WHITE` | const | 13 |
| tui/components/common/FormEditor.tsx | `GREEN` | const | 14 |
| tui/components/common/FormEditor.tsx | `RED` | const | 15 |
| tui/components/common/FormEditor.tsx | `YELLOW` | const | 16 |
| tui/components/common/FormEditor.tsx | `PURPLE` | const | 17 |
| tui/components/common/FormEditor.tsx | `initial` | const | 58 |
| tui/components/common/FormEditor.tsx | `field` | const | 154 |
| tui/components/common/FormEditor.tsx | `toggleCheckbox` | const | 130 |
| tui/components/common/FormEditor.tsx | `cycleRadioOption` | const | 137 |
| tui/components/common/FormEditor.tsx | `currentIndex` | const | 139 |
| tui/components/common/FormEditor.tsx | `nextIndex` | const | 140 |
| tui/components/common/FormEditor.tsx | `updateFieldValue` | const | 147 |
| tui/components/common/FormEditor.tsx | `error` | const | 174 |
| tui/components/common/FormEditor.tsx | `handleSubmit` | const | 164 |
| tui/components/common/FormEditor.tsx | `newErrors` | const | 166 |
| tui/components/common/FormEditor.tsx | `hasErrors` | variable | 167 |
| tui/components/common/FormEditor.tsx | `renderField` | const | 189 |
| tui/components/common/FormEditor.tsx | `isFocused` | const | 190 |
| tui/components/common/FormEditor.tsx | `hasError` | const | 191 |
| tui/components/common/FormEditor.tsx | `fieldValue` | const | 192 |
| tui/components/common/FormEditor.tsx | `isSelected` | const | 248 |
| tui/components/common/Modal.tsx | `CYAN` | const | 10 |
| tui/components/common/Modal.tsx | `WHITE` | const | 11 |
| tui/components/common/Modal.tsx | `DIM_WHITE` | const | 12 |
| tui/components/common/Modal.tsx | `RED` | const | 13 |
| tui/components/common/Modal.tsx | `YELLOW` | const | 14 |
| tui/components/common/Modal.tsx | `GREEN` | const | 15 |
| tui/components/common/Modal.tsx | `getTypeColor` | const | 57 |
| tui/components/common/Modal.tsx | `getTypeIcon` | const | 70 |
| tui/components/MCPManager.tsx | `MCPManagerProps` | interface | 21 |
| tui/components/MCPManager.tsx | `CYAN` | const | 27 |
| tui/components/MCPManager.tsx | `WHITE` | const | 28 |
| tui/components/MCPManager.tsx | `DIM_WHITE` | const | 29 |
| tui/components/MCPManager.tsx | `GREEN` | const | 30 |
| tui/components/MCPManager.tsx | `RED` | const | 31 |
| tui/components/MCPManager.tsx | `YELLOW` | const | 32 |
| tui/components/MCPManager.tsx | `PURPLE` | const | 33 |
| tui/components/MCPManager.tsx | `View` | type | 35 |
| tui/components/MCPManager.tsx | `ServerType` | type | 36 |
| tui/components/MCPManager.tsx | `ServerStatus` | interface | 38 |
| tui/components/MCPManager.tsx | `ModalState` | interface | 46 |
| tui/components/MCPManager.tsx | `loadServers` | const | 73 |
| tui/components/MCPManager.tsx | `serverList` | const | 76 |
| tui/components/MCPManager.tsx | `mcpTools` | const | 80 |
| tui/components/MCPManager.tsx | `handleListAction` | const | 88 |
| tui/components/MCPManager.tsx | `handleSelectServer` | const | 135 |
| tui/components/MCPManager.tsx | `deleteServer` | const | 140 |
| tui/components/MCPManager.tsx | `config` | const | 276 |
| tui/components/MCPManager.tsx | `toggleServer` | const | 153 |
| tui/components/MCPManager.tsx | `addServer` | const | 168 |
| tui/components/MCPManager.tsx | `serverConfig` | const | 277 |
| tui/components/MCPManager.tsx | `updateServer` | const | 213 |
| tui/components/MCPManager.tsx | `toggleTool` | const | 250 |
| tui/components/MCPManager.tsx | `server` | const | 536 |
| tui/components/MCPManager.tsx | `disabledTools` | const | 549 |
| tui/components/MCPManager.tsx | `toolIndex` | const | 258 |
| tui/components/MCPManager.tsx | `testServer` | const | 275 |
| tui/components/MCPManager.tsx | `result` | const | 294 |
| tui/components/MCPManager.tsx | `getServerListItems` | const | 328 |
| tui/components/MCPManager.tsx | `items` | const | 329 |
| tui/components/MCPManager.tsx | `isDisabled` | const | 552 |
| tui/components/MCPManager.tsx | `isConnected` | const | 331 |
| tui/components/MCPManager.tsx | `toolCount` | const | 332 |
| tui/components/MCPManager.tsx | `disabledToolCount` | const | 333 |
| tui/components/MCPManager.tsx | `listActions` | const | 355 |
| tui/components/MCPManager.tsx | `addFields` | const | 417 |
| tui/components/MCPManager.tsx | `editFields` | const | 482 |
| tui/components/MCPManager.tsx | `serverTools` | const | 543 |
| tui/components/MCPManager.tsx | `toolServerName` | const | 545 |
| tui/components/MCPManager.tsx | `toolsListItems` | const | 551 |
| tui/components/MCPManager.tsx | `toolsActions` | const | 562 |
| tui/components/AgentManager.tsx | `AgentManagerProps` | interface | 22 |
| tui/components/AgentManager.tsx | `CYAN` | const | 30 |
| tui/components/AgentManager.tsx | `WHITE` | const | 31 |
| tui/components/AgentManager.tsx | `DIM_WHITE` | const | 32 |
| tui/components/AgentManager.tsx | `GREEN` | const | 33 |
| tui/components/AgentManager.tsx | `RED` | const | 34 |
| tui/components/AgentManager.tsx | `YELLOW` | const | 35 |
| tui/components/AgentManager.tsx | `PURPLE` | const | 36 |
| tui/components/AgentManager.tsx | `BLUE` | const | 37 |
| tui/components/AgentManager.tsx | `View` | type | 39 |
| tui/components/AgentManager.tsx | `AgentWithScopeInfo` | interface | 41 |
| tui/components/AgentManager.tsx | `ModalState` | interface | 46 |
| tui/components/AgentManager.tsx | `loadAgents` | const | 85 |
| tui/components/AgentManager.tsx | `agents` | const | 88 |
| tui/components/AgentManager.tsx | `tools` | const | 93 |
| tui/components/AgentManager.tsx | `handleListAction` | const | 101 |
| tui/components/AgentManager.tsx | `isGlobal` | const | 180 |
| tui/components/AgentManager.tsx | `handleSelectAgent` | const | 169 |
| tui/components/AgentManager.tsx | `isActive` | const | 325 |
| tui/components/AgentManager.tsx | `deleteAgentHandler` | const | 195 |
| tui/components/AgentManager.tsx | `exportAgentHandler` | const | 214 |
| tui/components/AgentManager.tsx | `agent` | const | 685 |
| tui/components/AgentManager.tsx | `exportPath` | const | 228 |
| tui/components/AgentManager.tsx | `fs` | const | 229 |
| tui/components/AgentManager.tsx | `addAgentHandler` | const | 250 |
| tui/components/AgentManager.tsx | `scope` | const | 252 |
| tui/components/AgentManager.tsx | `updateAgentHandler` | const | 281 |
| tui/components/AgentManager.tsx | `getAgentListItems` | const | 307 |
| tui/components/AgentManager.tsx | `items` | const | 308 |
| tui/components/AgentManager.tsx | `listActions` | const | 346 |
| tui/components/AgentManager.tsx | `addFields` | const | 404 |
| tui/components/AgentManager.tsx | `editFields` | const | 475 |
| tui/components/AgentManager.tsx | `lines` | const | 521 |
| tui/components/AgentManager.tsx | `lineCount` | const | 522 |
| tui/components/AgentManager.tsx | `charCount` | const | 523 |
| tui/components/AgentManager.tsx | `builtInTools` | const | 582 |
| tui/components/AgentManager.tsx | `toolsListItems` | const | 587 |
| tui/components/AgentManager.tsx | `isEnabled` | const | 696 |
| tui/components/AgentManager.tsx | `toolKey` | const | 604 |
| tui/components/AgentManager.tsx | `toolsActions` | const | 616 |
| tui/components/AgentManager.tsx | `currentlyEnabled` | const | 753 |
| tui/components/AgentManager.tsx | `uniqueServers` | const | 692 |
| tui/components/AgentManager.tsx | `mcpListItems` | const | 694 |
| tui/components/AgentManager.tsx | `serverConfig` | const | 695 |
| tui/components/AgentManager.tsx | `toolsForServer` | const | 697 |
| tui/components/AgentManager.tsx | `mcpActions` | const | 708 |
| tui/components/AgentManager.tsx | `currentConfig` | const | 752 |
| tui/components/MessageNavigator.tsx | `MessageNavigatorProps` | interface | 9 |
| tui/components/MessageNavigator.tsx | `BLUE` | const | 23 |
| tui/components/MessageNavigator.tsx | `PURPLE` | const | 24 |
| tui/components/MessageNavigator.tsx | `CYAN` | const | 25 |
| tui/components/MessageNavigator.tsx | `WHITE` | const | 26 |
| tui/components/MessageNavigator.tsx | `YELLOW` | const | 27 |
| tui/components/MessageNavigator.tsx | `DIM_WHITE` | const | 28 |
| tui/components/BranchSelector.tsx | `BranchSelectorProps` | interface | 11 |
| tui/components/BranchSelector.tsx | `SelectItem` | interface | 17 |
| tui/components/BranchSelector.tsx | `BLUE` | const | 23 |
| tui/components/BranchSelector.tsx | `PURPLE` | const | 24 |
| tui/components/BranchSelector.tsx | `CYAN` | const | 25 |
| tui/components/BranchSelector.tsx | `WHITE` | const | 26 |
| tui/components/BranchSelector.tsx | `GREEN` | const | 27 |
| tui/components/BranchSelector.tsx | `branchTree` | const | 35 |
| tui/components/BranchSelector.tsx | `branches` | const | 36 |
| tui/components/BranchSelector.tsx | `tree` | const | 37 |
| tui/components/BranchSelector.tsx | `mainBranch` | const | 40 |
| tui/components/BranchSelector.tsx | `addChildren` | function | 46 |
| tui/components/BranchSelector.tsx | `children` | const | 47 |
| tui/components/BranchSelector.tsx | `isLast` | const | 49 |
| tui/components/BranchSelector.tsx | `prefix` | const | 50 |
| tui/components/BranchSelector.tsx | `handleSelect` | const | 59 |
| tui/components/BranchSelector.tsx | `formatBranchLabel` | const | 68 |
| tui/components/BranchSelector.tsx | `indent` | const | 101 |
| tui/components/BranchSelector.tsx | `isCurrent` | const | 100 |
| tui/components/BranchSelector.tsx | `currentMarker` | const | 72 |
| tui/components/BranchSelector.tsx | `messageCount` | const | 73 |
| tui/components/BranchSelector.tsx | `items` | const | 78 |
| tui/components/ShortcutBar.tsx | `ShortcutBarProps` | interface | 9 |
| tui/components/ShortcutBar.tsx | `BLACK` | const | 15 |
| tui/components/ShortcutBar.tsx | `CYAN` | const | 16 |
| tui/components/ShortcutBar.tsx | `WHITE` | const | 17 |
| tui/components/ShortcutBar.tsx | `GRAY_BG` | const | 18 |
| tui/components/ShortcutBar.tsx | `Shortcut` | interface | 20 |
| tui/components/ShortcutBar.tsx | `SHORTCUTS` | const | 26 |
| tui/components/ShortcutBar.tsx | `visibleShortcuts` | const | 41 |
| tui/components/TooltipHints.tsx | `YELLOW` | const | 10 |
| tui/components/TooltipHints.tsx | `DIM_WHITE` | const | 11 |
| tui/components/TooltipHints.tsx | `DARK_YELLOW` | const | 12 |
| tui/components/TooltipHints.tsx | `Tip` | interface | 14 |
| tui/components/TooltipHints.tsx | `TIPS` | const | 19 |
| tui/components/TooltipHints.tsx | `TooltipHintsProps` | interface | 38 |
| tui/components/TooltipHints.tsx | `initialTimeout` | const | 55 |
| tui/components/TooltipHints.tsx | `hideTimeout` | const | 66 |
| tui/components/TooltipHints.tsx | `nextTipTimeout` | const | 71 |
| tui/components/TooltipHints.tsx | `showNextTip` | const | 81 |
| tui/components/TooltipHints.tsx | `unseenIndices` | const | 88 |
| tui/components/TooltipHints.tsx | `randomIndex` | const | 101 |
| tui/background-agent.ts | `execAsync` | const | 11 |
| tui/background-agent.ts | `recentMessages` | const | 72 |
| tui/background-agent.ts | `toolUses` | const | 75 |
| tui/background-agent.ts | `userMessages` | const | 104 |
| tui/background-agent.ts | `content` | const | 109 |
| tui/background-agent.ts | `result` | const | 122 |
| tui/background-agent.ts | `lastMessage` | const | 136 |
| tui/background-agent.ts | `lines` | const | 174 |
| tui/background-agent.ts | `backgroundAgentInstance` | variable | 198 |
| tui/components/App.tsx | `View` | type | 47 |
| tui/components/App.tsx | `AgentMode` | type | 48 |
| tui/components/App.tsx | `AppProps` | interface | 50 |
| tui/components/App.tsx | `BLUE` | const | 57 |
| tui/components/App.tsx | `PURPLE` | const | 58 |
| tui/components/App.tsx | `CYAN` | const | 59 |
| tui/components/App.tsx | `WHITE` | const | 60 |
| tui/components/App.tsx | `DIM_WHITE` | const | 61 |
| tui/components/App.tsx | `RED` | const | 62 |
| tui/components/App.tsx | `GREEN` | const | 63 |
| tui/components/App.tsx | `YELLOW` | const | 64 |
| tui/components/App.tsx | `ORANGE` | const | 65 |
| tui/components/App.tsx | `abortControllerRef` | const | 89 |
| tui/components/App.tsx | `conversationStartTime` | const | 90 |
| tui/components/App.tsx | `lastCtrlCPress` | const | 91 |
| tui/components/App.tsx | `exitHintTimeoutRef` | const | 92 |
| tui/components/App.tsx | `currentBranch` | const | 96 |
| tui/components/App.tsx | `tokenMetrics` | const | 101 |
| tui/components/App.tsx | `messages` | const | 102 |
| tui/components/App.tsx | `stats` | const | 103 |
| tui/components/App.tsx | `elapsedMinutes` | const | 104 |
| tui/components/App.tsx | `tokensPerMinute` | const | 105 |
| tui/components/App.tsx | `modelInfo` | const | 118 |
| tui/components/App.tsx | `model` | const | 119 |
| tui/components/App.tsx | `provider` | const | 120 |
| tui/components/App.tsx | `initClient` | const | 126 |
| tui/components/App.tsx | `baseConfig` | const | 814 |
| tui/components/App.tsx | `tools` | const | 815 |
| tui/components/App.tsx | `clientConfig` | variable | 817 |
| tui/components/App.tsx | `agent` | const | 820 |
| tui/components/App.tsx | `newClient` | const | 830 |
| tui/components/App.tsx | `getModeInfo` | const | 172 |
| tui/components/App.tsx | `cycleMode` | const | 184 |
| tui/components/App.tsx | `modes` | const | 185 |
| tui/components/App.tsx | `currentIndex` | const | 186 |
| tui/components/App.tsx | `nextIndex` | const | 187 |
| tui/components/App.tsx | `newMode` | const | 188 |
| tui/components/App.tsx | `toggleAutoMode` | const | 193 |
| tui/components/App.tsx | `handleHistoryNavigation` | const | 198 |
| tui/components/App.tsx | `newIndex` | const | 219 |
| tui/components/App.tsx | `now` | const | 235 |
| tui/components/App.tsx | `timeSinceLastPress` | const | 236 |
| tui/components/App.tsx | `currentIdx` | const | 941 |
| tui/components/App.tsx | `handleSubmit` | const | 368 |
| tui/components/App.tsx | `abortController` | const | 387 |
| tui/components/App.tsx | `messageContent` | variable | 396 |
| tui/components/App.tsx | `contentBlocks` | const | 400 |
| tui/components/App.tsx | `forkName` | const | 593 |
| tui/components/App.tsx | `backgroundAgent` | const | 451 |
| tui/components/App.tsx | `bgContext` | const | 452 |
| tui/components/App.tsx | `effectiveMode` | const | 455 |
| tui/components/App.tsx | `modePrompt` | const | 458 |
| tui/components/App.tsx | `contextLines` | const | 461 |
| tui/components/App.tsx | `fullPrompt` | const | 462 |
| tui/components/App.tsx | `queryOptions` | const | 465 |
| tui/components/App.tsx | `currentMessages` | const | 471 |
| tui/components/App.tsx | `newMessages` | const | 474 |
| tui/components/App.tsx | `branch` | const | 720 |
| tui/components/App.tsx | `updatedMessages` | const | 515 |
| tui/components/App.tsx | `updatedBranch` | const | 723 |
| tui/components/App.tsx | `newBranches` | const | 724 |
| tui/components/App.tsx | `promptText` | const | 505 |
| tui/components/App.tsx | `updatedHistory` | const | 508 |
| tui/components/App.tsx | `userMessageCount` | const | 518 |
| tui/components/App.tsx | `errorMessage` | const | 536 |
| tui/components/App.tsx | `handleCommand` | const | 556 |
| tui/components/App.tsx | `parts` | const | 557 |
| tui/components/App.tsx | `command` | const | 558 |
| tui/components/App.tsx | `args` | const | 559 |
| tui/components/App.tsx | `newConv` | const | 768 |
| tui/components/App.tsx | `forkIndex` | const | 594 |
| tui/components/App.tsx | `forked` | const | 624 |
| tui/components/App.tsx | `compactedMessages` | const | 684 |
| tui/components/App.tsx | `handleConversationSelect` | const | 751 |
| tui/components/App.tsx | `conv` | const | 752 |
| tui/components/App.tsx | `handleAgentSelect` | const | 765 |
| tui/components/App.tsx | `handleBranchSelect` | const | 779 |
| tui/components/App.tsx | `switched` | const | 781 |
| tui/components/App.tsx | `handleConfigSave` | const | 797 |
| tui/components/App.tsx | `handleMCPServerChange` | const | 810 |
| tui/utils/keyToAnsi.ts | `keyName` | const | 183 |
| tui/utils/keyToAnsi.example.tsx | `ansiSequence` | const | 271 |
| tui/utils/keyToAnsi.example.tsx | `keyInfo` | const | 75 |
| tui/utils/keyToAnsi.example.tsx | `formatAnsi` | function | 94 |
| tui/utils/keyToAnsi.example.tsx | `code` | const | 98 |
| tui/utils/keyToAnsi.example.tsx | `macros` | const | 196 |
| tui/utils/keyToAnsi.example.tsx | `macroKey` | variable | 203 |
| tui/utils/keyToAnsi.example.tsx | `TerminalPanelProps` | interface | 234 |
| tui/utils/keyToAnsi.example.tsx | `ansiSeq` | const | 252 |
| tui/utils/keyToAnsi.example.tsx | `key` | const | 301 |
| tui/components/ShellInputPrompt.tsx | `ShellInputPromptProps` | interface | 15 |
| tui/components/ShellInputPrompt.tsx | `lastCtrlCPress` | const | 29 |
| tui/components/ShellInputPrompt.tsx | `checkPty` | const | 33 |
| tui/components/ShellInputPrompt.tsx | `now` | const | 65 |
| tui/components/ShellInputPrompt.tsx | `timeSinceLastPress` | const | 66 |
| tui/components/ShellInputPrompt.tsx | `ansiSequence` | const | 81 |
| cli/stream-renderer.ts | `content` | const | 251 |
| cli/stream-renderer.ts | `toolUseBlocks` | const | 140 |
| cli/stream-renderer.ts | `textBlocks` | const | 139 |
| cli/stream-renderer.ts | `toolNames` | const | 95 |
| cli/stream-renderer.ts | `toolName` | const | 162 |
| cli/stream-renderer.ts | `input` | const | 97 |
| cli/stream-renderer.ts | `cmd` | const | 101 |
| cli/stream-renderer.ts | `pattern` | const | 106 |
| cli/stream-renderer.ts | `msg` | const | 135 |
| cli/stream-renderer.ts | `text` | const | 258 |
| cli/stream-renderer.ts | `toolInput` | const | 163 |
| cli/stream-renderer.ts | `inputPreview` | const | 166 |
| cli/stream-renderer.ts | `keys` | const | 225 |
| cli/stream-renderer.ts | `value` | const | 228 |
| cli/stream-renderer.ts | `strValue` | const | 229 |
| cli/stream-renderer.ts | `assistantMessages` | const | 242 |
| cli/stream-renderer.ts | `allTextBlocks` | const | 245 |
| cli/stream-renderer.ts | `toolsExecuted` | const | 246 |
| cli/stream-renderer.ts | `fullResponse` | const | 275 |
| cli/stream-renderer.ts | `response` | const | 295 |
| cli/stream-renderer.ts | `cachedPercent` | const | 331 |
| cli/commands/agent.ts | `agentCommand` | const | 30 |
| cli/commands/agent.ts | `renderer` | const | 45 |
| cli/commands/agent.ts | `agent` | const | 319 |
| cli/commands/agent.ts | `tools` | const | 61 |
| cli/commands/agent.ts | `baseConfig` | const | 62 |
| cli/commands/agent.ts | `clientConfig` | const | 65 |
| cli/commands/agent.ts | `client` | const | 90 |
| cli/commands/agent.ts | `allMessages` | const | 93 |
| cli/commands/agent.ts | `stats` | const | 102 |
| cli/commands/agent.ts | `agents` | const | 135 |
| cli/commands/agent.ts | `showGlobal` | const | 142 |
| cli/commands/agent.ts | `showProject` | const | 143 |
| cli/commands/agent.ts | `colors` | const | 146 |
| cli/commands/agent.ts | `color` | const | 171 |
| cli/commands/agent.ts | `enabledTools` | const | 225 |
| cli/commands/agent.ts | `enabledServers` | const | 239 |
| cli/commands/agent.ts | `outputPath` | const | 299 |
| cli/commands/agent.ts | `scope` | const | 318 |
| cli/commands/agent.ts | `result` | const | 336 |
| cli/commands/completion.ts | `completionCommand` | const | 13 |

## 📁 Orphaned Files

| File | Lines | Size |
|------|-------|------|
| llm/errors.ts | 19 | 414B |
| user-management-system/user-types.ts | 1 | 0B |
| user-management-system/user-service.ts | 1 | 0B |
| user-management-system/user-models.ts | 1 | 0B |
| user-management-system/user-decorators.ts | 1 | 0B |
| typescript-example/user-management.ts | 1 | 0B |
| typescript-example/user-management-system.ts | 1 | 0B |
| tui/components/AnsiOutputText.tsx | 117 | 2.6KB |
| tui/components/MessageList.tsx | 417 | 14.9KB |
| tui/components/InputBox.tsx | 541 | 17.4KB |
| tui/components/StatusBar.tsx | 140 | 3.7KB |
| tui/components/Header.tsx | 76 | 2.0KB |
| tui/components/ConversationList.tsx | 402 | 14.5KB |
| tui/components/ConfigPanel.tsx | 266 | 9.1KB |
| tui/components/common/SelectList.tsx | 304 | 7.8KB |
| tui/components/common/FormEditor.tsx | 310 | 8.2KB |
| tui/components/common/Modal.tsx | 129 | 2.7KB |
| tui/components/MCPManager.tsx | 604 | 17.1KB |
| tui/components/AgentManager.tsx | 787 | 23.5KB |
| tui/components/MessageNavigator.tsx | 74 | 1.9KB |
| tui/components/BranchSelector.tsx | 124 | 3.7KB |
| tui/components/ShortcutBar.tsx | 60 | 1.9KB |
| tui/components/TooltipHints.tsx | 118 | 4.0KB |
| tui/components/App.tsx | 1082 | 36.4KB |
| tui/utils/keyToAnsi.example.tsx | 325 | 7.4KB |
| tui/components/ShellInputPrompt.tsx | 100 | 2.6KB |

---

## 📝 Cleanup To-Do List

Use this checklist to track your dead code cleanup progress.

**Total Tasks:** 1327

### 🗑️ Phase 1: Remove Orphaned Files

*Priority: HIGH - These files are not imported anywhere*

- [ ] **Delete** `llm/errors.ts` *(19 lines, 414B)*
  - Reason: File is not imported by any other file
  - Verify no dynamic imports reference this file

- [ ] **Delete** `user-management-system/user-types.ts` *(1 lines, 0B)*
  - Reason: File is not imported by any other file
  - Verify no dynamic imports reference this file

- [ ] **Delete** `user-management-system/user-service.ts` *(1 lines, 0B)*
  - Reason: File is not imported by any other file
  - Verify no dynamic imports reference this file

- [ ] **Delete** `user-management-system/user-models.ts` *(1 lines, 0B)*
  - Reason: File is not imported by any other file
  - Verify no dynamic imports reference this file

- [ ] **Delete** `user-management-system/user-decorators.ts` *(1 lines, 0B)*
  - Reason: File is not imported by any other file
  - Verify no dynamic imports reference this file

- [ ] **Delete** `typescript-example/user-management.ts` *(1 lines, 0B)*
  - Reason: File is not imported by any other file
  - Verify no dynamic imports reference this file

- [ ] **Delete** `typescript-example/user-management-system.ts` *(1 lines, 0B)*
  - Reason: File is not imported by any other file
  - Verify no dynamic imports reference this file

- [ ] **Delete** `tui/components/AnsiOutputText.tsx` *(117 lines, 2.6KB)*
  - Reason: File is not imported by any other file
  - Verify no dynamic imports reference this file

- [ ] **Delete** `tui/components/MessageList.tsx` *(417 lines, 14.9KB)*
  - Reason: File is not imported by any other file
  - Verify no dynamic imports reference this file

- [ ] **Delete** `tui/components/InputBox.tsx` *(541 lines, 17.4KB)*
  - Reason: File is not imported by any other file
  - Verify no dynamic imports reference this file

- [ ] **Delete** `tui/components/StatusBar.tsx` *(140 lines, 3.7KB)*
  - Reason: File is not imported by any other file
  - Verify no dynamic imports reference this file

- [ ] **Delete** `tui/components/Header.tsx` *(76 lines, 2.0KB)*
  - Reason: File is not imported by any other file
  - Verify no dynamic imports reference this file

- [ ] **Delete** `tui/components/ConversationList.tsx` *(402 lines, 14.5KB)*
  - Reason: File is not imported by any other file
  - Verify no dynamic imports reference this file

- [ ] **Delete** `tui/components/ConfigPanel.tsx` *(266 lines, 9.1KB)*
  - Reason: File is not imported by any other file
  - Verify no dynamic imports reference this file

- [ ] **Delete** `tui/components/common/SelectList.tsx` *(304 lines, 7.8KB)*
  - Reason: File is not imported by any other file
  - Verify no dynamic imports reference this file

- [ ] **Delete** `tui/components/common/FormEditor.tsx` *(310 lines, 8.2KB)*
  - Reason: File is not imported by any other file
  - Verify no dynamic imports reference this file

- [ ] **Delete** `tui/components/common/Modal.tsx` *(129 lines, 2.7KB)*
  - Reason: File is not imported by any other file
  - Verify no dynamic imports reference this file

- [ ] **Delete** `tui/components/MCPManager.tsx` *(604 lines, 17.1KB)*
  - Reason: File is not imported by any other file
  - Verify no dynamic imports reference this file

- [ ] **Delete** `tui/components/AgentManager.tsx` *(787 lines, 23.5KB)*
  - Reason: File is not imported by any other file
  - Verify no dynamic imports reference this file

- [ ] **Delete** `tui/components/MessageNavigator.tsx` *(74 lines, 1.9KB)*
  - Reason: File is not imported by any other file
  - Verify no dynamic imports reference this file

- [ ] **Delete** `tui/components/BranchSelector.tsx` *(124 lines, 3.7KB)*
  - Reason: File is not imported by any other file
  - Verify no dynamic imports reference this file

- [ ] **Delete** `tui/components/ShortcutBar.tsx` *(60 lines, 1.9KB)*
  - Reason: File is not imported by any other file
  - Verify no dynamic imports reference this file

- [ ] **Delete** `tui/components/TooltipHints.tsx` *(118 lines, 4.0KB)*
  - Reason: File is not imported by any other file
  - Verify no dynamic imports reference this file

- [ ] **Delete** `tui/components/App.tsx` *(1082 lines, 36.4KB)*
  - Reason: File is not imported by any other file
  - Verify no dynamic imports reference this file

- [ ] **Delete** `tui/utils/keyToAnsi.example.tsx` *(325 lines, 7.4KB)*
  - Reason: File is not imported by any other file
  - Verify no dynamic imports reference this file

- [ ] **Delete** `tui/components/ShellInputPrompt.tsx` *(100 lines, 2.6KB)*
  - Reason: File is not imported by any other file
  - Verify no dynamic imports reference this file

### 📦 Phase 2: Remove Unused Exports

*Priority: MEDIUM - Clean up public API surface*


#### `core/tool.ts`

- [ ] Remove export of `CommandContext` *(interface, line 109)*
  - Either remove the declaration or make it internal (remove `export` keyword)

- [ ] Remove export of `Command` *(interface, line 113)*
  - Either remove the declaration or make it internal (remove `export` keyword)

- [ ] Remove export of `ToolFunction` *(type, line 122)*
  - Either remove the declaration or make it internal (remove `export` keyword)

- [ ] Remove export of `CreateToolOptions` *(interface, line 130)*
  - Either remove the declaration or make it internal (remove `export` keyword)

- [ ] Remove export of `createTool` *(function, line 144)*
  - Either remove the declaration or make it internal (remove `export` keyword)


#### `core/messages.ts`

- [ ] Remove export of `CANCEL_MESSAGE` *(const, line 21)*
  - Either remove the declaration or make it internal (remove `export` keyword)

- [ ] Remove export of `REJECT_MESSAGE` *(const, line 23)*
  - Either remove the declaration or make it internal (remove `export` keyword)

- [ ] Remove export of `NO_RESPONSE_REQUESTED` *(const, line 25)*
  - Either remove the declaration or make it internal (remove `export` keyword)

- [ ] Remove export of `NO_CONTENT_MESSAGE` *(const, line 26)*
  - Either remove the declaration or make it internal (remove `export` keyword)

- [ ] Remove export of `SYNTHETIC_ASSISTANT_MESSAGES` *(const, line 28)*
  - Either remove the declaration or make it internal (remove `export` keyword)

- [ ] Remove export of `FullToolUseResult` *(type, line 36)*
  - Either remove the declaration or make it internal (remove `export` keyword)

- [ ] Remove export of `createAssistantAPIErrorMessage` *(function, line 119)*
  - Either remove the declaration or make it internal (remove `export` keyword)

- [ ] Remove export of `createProgressMessage` *(function, line 149)*
  - Either remove the declaration or make it internal (remove `export` keyword)

- [ ] Remove export of `createToolResultStopMessage` *(function, line 167)*
  - Either remove the declaration or make it internal (remove `export` keyword)


#### `core/tokens.ts`

- [ ] Remove export of `countCachedTokens` *(function, line 39)*
  - Either remove the declaration or make it internal (remove `export` keyword)

- [ ] Remove export of `calculateAutoCompactThreshold` *(function, line 71)*
  - Either remove the declaration or make it internal (remove `export` keyword)


#### `config/schema.ts`

- [ ] Remove export of `MCPServerConfigSchema` *(const, line 8)*
  - Either remove the declaration or make it internal (remove `export` keyword)

- [ ] Remove export of `HookConfigSchema` *(const, line 37)*
  - Either remove the declaration or make it internal (remove `export` keyword)

- [ ] Remove export of `HooksSchema` *(const, line 49)*
  - Either remove the declaration or make it internal (remove `export` keyword)

- [ ] Remove export of `Hooks` *(type, line 54)*
  - Either remove the declaration or make it internal (remove `export` keyword)


#### `core/hooks.ts`

- [ ] Remove export of `ToolUseContext` *(interface, line 9)*
  - Either remove the declaration or make it internal (remove `export` keyword)

- [ ] Remove export of `HookResult` *(interface, line 17)*
  - Either remove the declaration or make it internal (remove `export` keyword)


#### `config/loader.ts`

- [ ] Remove export of `saveGlobalConfig` *(function, line 134)*
  - Either remove the declaration or make it internal (remove `export` keyword)


#### `core/agent.ts`

- [ ] Remove export of `CanUseToolFn` *(type, line 24)*
  - Either remove the declaration or make it internal (remove `export` keyword)

- [ ] Remove export of `checkAutoCompact` *(function, line 384)*
  - Either remove the declaration or make it internal (remove `export` keyword)


#### `utils/systemEncoding.ts`

- [ ] Remove export of `resetEncodingCache` *(function, line 18)*
  - Either remove the declaration or make it internal (remove `export` keyword)

- [ ] Remove export of `getSystemEncoding` *(function, line 52)*
  - Either remove the declaration or make it internal (remove `export` keyword)

- [ ] Remove export of `windowsCodePageToEncoding` *(function, line 114)*
  - Either remove the declaration or make it internal (remove `export` keyword)

- [ ] Remove export of `detectEncodingFromBuffer` *(function, line 155)*
  - Either remove the declaration or make it internal (remove `export` keyword)


#### `utils/shell-utils.ts`

- [ ] Remove export of `ShellType` *(type, line 12)*
  - Either remove the declaration or make it internal (remove `export` keyword)

- [ ] Remove export of `ShellConfiguration` *(interface, line 17)*
  - Either remove the declaration or make it internal (remove `export` keyword)

- [ ] Remove export of `isWindows` *(const, line 68)*
  - Either remove the declaration or make it internal (remove `export` keyword)


#### `utils/terminalSerializer.ts`

- [ ] Remove export of `ColorMode` *(enum, line 31)*
  - Either remove the declaration or make it internal (remove `export` keyword)

- [ ] Remove export of `convertColorToHex` *(function, line 460)*
  - Either remove the declaration or make it internal (remove `export` keyword)


#### `services/shell-execution.ts`

- [ ] Remove export of `ShellExecutionResult` *(interface, line 28)*
  - Either remove the declaration or make it internal (remove `export` keyword)

- [ ] Remove export of `ShellExecutionHandle` *(interface, line 48)*
  - Either remove the declaration or make it internal (remove `export` keyword)


#### `utils/tool-response-limiter.ts`

- [ ] Remove export of `MAX_TOOL_OUTPUT_TOKENS` *(const, line 41)*
  - Either remove the declaration or make it internal (remove `export` keyword)

- [ ] Remove export of `formatTokenCount` *(function, line 149)*
  - Either remove the declaration or make it internal (remove `export` keyword)


#### `tools/bash.ts`

- [ ] Remove export of `getActiveShellPid` *(function, line 246)*
  - Either remove the declaration or make it internal (remove `export` keyword)

- [ ] Remove export of `clearShellPid` *(function, line 250)*
  - Either remove the declaration or make it internal (remove `export` keyword)

- [ ] Remove export of `getAllActiveShellPids` *(function, line 254)*
  - Either remove the declaration or make it internal (remove `export` keyword)


#### `mcp/client.ts`

- [ ] Remove export of `getMCPResources` *(function, line 388)*
  - Either remove the declaration or make it internal (remove `export` keyword)

- [ ] Remove export of `readMCPResource` *(function, line 434)*
  - Either remove the declaration or make it internal (remove `export` keyword)

- [ ] Remove export of `getMCPServerStatus` *(function, line 494)*
  - Either remove the declaration or make it internal (remove `export` keyword)


#### `agents/schema.ts`

- [ ] Remove export of `SystemPromptModeSchema` *(const, line 11)*
  - Either remove the declaration or make it internal (remove `export` keyword)

- [ ] Remove export of `AgentMCPServerConfigSchema` *(const, line 16)*
  - Either remove the declaration or make it internal (remove `export` keyword)


#### `utils/shell.ts`

- [ ] Remove export of `ExecResult` *(type, line 12)*
  - Either remove the declaration or make it internal (remove `export` keyword)


#### `llm/errors.ts`

- [ ] Remove export of `BadRequestRetryError` *(class, line 9)*
  - Either remove the declaration or make it internal (remove `export` keyword)


#### `utils/version-check.ts`

- [ ] Remove export of `getLocalPackageInfo` *(function, line 50)*
  - Either remove the declaration or make it internal (remove `export` keyword)

- [ ] Remove export of `getRemoteVersion` *(function, line 92)*
  - Either remove the declaration or make it internal (remove `export` keyword)


#### `utils/permission-check.ts`

- [ ] Remove export of `checkMCPAvailability` *(function, line 70)*
  - Either remove the declaration or make it internal (remove `export` keyword)


#### `tui/prompt-history.ts`

- [ ] Remove export of `searchPrompts` *(function, line 111)*
  - Either remove the declaration or make it internal (remove `export` keyword)

- [ ] Remove export of `clearHistory` *(function, line 128)*
  - Either remove the declaration or make it internal (remove `export` keyword)


#### `tui/mode-prompts.ts`

- [ ] Remove export of `AgentMode` *(type, line 6)*
  - Either remove the declaration or make it internal (remove `export` keyword)

- [ ] Remove export of `getBaseSystemPrompt` *(function, line 8)*
  - Either remove the declaration or make it internal (remove `export` keyword)

- [ ] Remove export of `getModeSpecificPrompt` *(function, line 12)*
  - Either remove the declaration or make it internal (remove `export` keyword)

- [ ] Remove export of `getModeDescription` *(function, line 20)*
  - Either remove the declaration or make it internal (remove `export` keyword)

- [ ] Remove export of `getModeEmoji` *(function, line 33)*
  - Either remove the declaration or make it internal (remove `export` keyword)


#### `tui/conversation-storage.ts`

- [ ] Remove export of `Checkpoint` *(interface, line 11)*
  - Either remove the declaration or make it internal (remove `export` keyword)

- [ ] Remove export of `EnhancedCheckpoint` *(interface, line 18)*
  - Either remove the declaration or make it internal (remove `export` keyword)

- [ ] Remove export of `getConversationsDir` *(function, line 82)*
  - Either remove the declaration or make it internal (remove `export` keyword)

- [ ] Remove export of `generateConversationId` *(function, line 102)*
  - Either remove the declaration or make it internal (remove `export` keyword)

- [ ] Remove export of `generateCheckpointId` *(function, line 109)*
  - Either remove the declaration or make it internal (remove `export` keyword)

- [ ] Remove export of `generateBranchId` *(function, line 116)*
  - Either remove the declaration or make it internal (remove `export` keyword)

- [ ] Remove export of `deleteConversation` *(function, line 223)*
  - Either remove the declaration or make it internal (remove `export` keyword)

- [ ] Remove export of `migrateToBranchedConversation` *(function, line 294)*
  - Either remove the declaration or make it internal (remove `export` keyword)


#### `tui/logger.ts`

- [ ] Remove export of `ensureLogsDir` *(function, line 18)*
  - Either remove the declaration or make it internal (remove `export` keyword)

- [ ] Remove export of `getLogsDir` *(function, line 74)*
  - Either remove the declaration or make it internal (remove `export` keyword)


#### `tui/components/AnsiOutputText.tsx`

- [ ] Remove export of `AnsiOutputText` *(const, line 81)*
  - Either remove the declaration or make it internal (remove `export` keyword)

- [ ] Remove export of `isAnsiOutput` *(function, line 107)*
  - Either remove the declaration or make it internal (remove `export` keyword)


#### `tui/components/MessageList.tsx`

- [ ] Remove export of `MessageList` *(const, line 33)*
  - Either remove the declaration or make it internal (remove `export` keyword)


#### `mcp/resources.ts`

- [ ] Remove export of `getGitRoot` *(function, line 25)*
  - Either remove the declaration or make it internal (remove `export` keyword)

- [ ] Remove export of `isFileInRepo` *(function, line 37)*
  - Either remove the declaration or make it internal (remove `export` keyword)

- [ ] Remove export of `listRepoFiles` *(function, line 53)*
  - Either remove the declaration or make it internal (remove `export` keyword)


#### `tui/components/InputBox.tsx`

- [ ] Remove export of `InputBox` *(const, line 46)*
  - Either remove the declaration or make it internal (remove `export` keyword)


#### `tui/components/StatusBar.tsx`

- [ ] Remove export of `StatusBar` *(const, line 26)*
  - Either remove the declaration or make it internal (remove `export` keyword)


#### `tui/components/Header.tsx`

- [ ] Remove export of `Header` *(const, line 28)*
  - Either remove the declaration or make it internal (remove `export` keyword)


#### `tui/components/ConversationList.tsx`

- [ ] Remove export of `ConversationList` *(const, line 32)*
  - Either remove the declaration or make it internal (remove `export` keyword)


#### `tui/components/ConfigPanel.tsx`

- [ ] Remove export of `ConfigData` *(interface, line 19)*
  - Either remove the declaration or make it internal (remove `export` keyword)

- [ ] Remove export of `ConfigPanel` *(const, line 38)*
  - Either remove the declaration or make it internal (remove `export` keyword)


#### `tui/components/common/SelectList.tsx`

- [ ] Remove export of `SelectListItem` *(interface, line 17)*
  - Either remove the declaration or make it internal (remove `export` keyword)

- [ ] Remove export of `SelectListAction` *(interface, line 27)*
  - Either remove the declaration or make it internal (remove `export` keyword)

- [ ] Remove export of `SelectListProps` *(interface, line 33)*
  - Either remove the declaration or make it internal (remove `export` keyword)

- [ ] Remove export of `SelectList` *(const, line 47)*
  - Either remove the declaration or make it internal (remove `export` keyword)


#### `tui/components/common/FormEditor.tsx`

- [ ] Remove export of `FieldType` *(type, line 19)*
  - Either remove the declaration or make it internal (remove `export` keyword)

- [ ] Remove export of `FormFieldOption` *(interface, line 21)*
  - Either remove the declaration or make it internal (remove `export` keyword)

- [ ] Remove export of `FormField` *(interface, line 26)*
  - Either remove the declaration or make it internal (remove `export` keyword)

- [ ] Remove export of `FormEditorProps` *(interface, line 39)*
  - Either remove the declaration or make it internal (remove `export` keyword)

- [ ] Remove export of `FormEditor` *(const, line 48)*
  - Either remove the declaration or make it internal (remove `export` keyword)


#### `tui/components/common/Modal.tsx`

- [ ] Remove export of `ModalType` *(type, line 17)*
  - Either remove the declaration or make it internal (remove `export` keyword)

- [ ] Remove export of `ModalProps` *(interface, line 19)*
  - Either remove the declaration or make it internal (remove `export` keyword)

- [ ] Remove export of `Modal` *(const, line 29)*
  - Either remove the declaration or make it internal (remove `export` keyword)


#### `tui/components/MCPManager.tsx`

- [ ] Remove export of `MCPManager` *(const, line 54)*
  - Either remove the declaration or make it internal (remove `export` keyword)


#### `tui/components/AgentManager.tsx`

- [ ] Remove export of `AgentManager` *(const, line 54)*
  - Either remove the declaration or make it internal (remove `export` keyword)


#### `tui/components/MessageNavigator.tsx`

- [ ] Remove export of `MessageNavigator` *(const, line 30)*
  - Either remove the declaration or make it internal (remove `export` keyword)


#### `tui/components/BranchSelector.tsx`

- [ ] Remove export of `BranchSelector` *(const, line 29)*
  - Either remove the declaration or make it internal (remove `export` keyword)


#### `tui/components/ShortcutBar.tsx`

- [ ] Remove export of `ShortcutBar` *(const, line 39)*
  - Either remove the declaration or make it internal (remove `export` keyword)


#### `tui/components/TooltipHints.tsx`

- [ ] Remove export of `TooltipHints` *(const, line 43)*
  - Either remove the declaration or make it internal (remove `export` keyword)


#### `tui/background-agent.ts`

- [ ] Remove export of `BackgroundContext` *(interface, line 13)*
  - Either remove the declaration or make it internal (remove `export` keyword)

- [ ] Remove export of `BackgroundAgent` *(class, line 23)*
  - Either remove the declaration or make it internal (remove `export` keyword)


#### `tui/components/App.tsx`

- [ ] Remove export of `App` *(const, line 67)*
  - Either remove the declaration or make it internal (remove `export` keyword)


#### `tui/utils/keyToAnsi.example.tsx`

- [ ] Remove export of `SimplePTYExample` *(const, line 14)*
  - Either remove the declaration or make it internal (remove `export` keyword)

- [ ] Remove export of `SmartPTYExample` *(const, line 32)*
  - Either remove the declaration or make it internal (remove `export` keyword)

- [ ] Remove export of `DebugKeyExample` *(const, line 67)*
  - Either remove the declaration or make it internal (remove `export` keyword)

- [ ] Remove export of `TerminalEmulatorExample` *(const, line 111)*
  - Either remove the declaration or make it internal (remove `export` keyword)

- [ ] Remove export of `SelectiveForwardingExample` *(const, line 158)*
  - Either remove the declaration or make it internal (remove `export` keyword)

- [ ] Remove export of `KeyMacroExample` *(const, line 194)*
  - Either remove the declaration or make it internal (remove `export` keyword)

- [ ] Remove export of `TerminalPanel` *(const, line 241)*
  - Either remove the declaration or make it internal (remove `export` keyword)

- [ ] Remove export of `simulateKeyPress` *(function, line 297)*
  - Either remove the declaration or make it internal (remove `export` keyword)


#### `tui/components/ShellInputPrompt.tsx`

- [ ] Remove export of `ShellInputPrompt` *(const, line 24)*
  - Either remove the declaration or make it internal (remove `export` keyword)

### 🧹 Phase 3: Remove Unused Internal Code

*Priority: LOW - Internal cleanup*


#### `core/messages.ts` (4 unused declarations)

- [ ] Remove `baseCreateAssistantMessage` *(function, line 78)*
- [ ] Remove `result` *(const, line 183)*
- [ ] Remove `lastMessage` *(const, line 200)*
- [ ] Remove `mergedContent` *(const, line 212)*


#### `core/tokens.ts` (5 unused declarations)

- [ ] Remove `i` *(variable, line 115)*
- [ ] Remove `message` *(const, line 117)*
- [ ] Remove `AUTO_COMPACT_THRESHOLD_RATIO` *(const, line 59)*
- [ ] Remove `DEFAULT_CONTEXT_LENGTH` *(const, line 64)*
- [ ] Remove `tokensRemaining` *(const, line 95)*


#### `core/hooks.ts` (15 unused declarations)

- [ ] Remove `matchesTool` *(function, line 28)*
- [ ] Remove `patterns` *(const, line 35)*
- [ ] Remove `regex` *(const, line 48)*
- [ ] Remove `executeHookCommand` *(function, line 59)*
- [ ] Remove `hookEnv` *(const, line 66)*
- [ ] Remove `envKey` *(const, line 75)*
- [ ] Remove `contextJson` *(const, line 84)*
- [ ] Remove `child` *(const, line 93)*
- [ ] Remove `stdout` *(variable, line 99)*
- [ ] Remove `stderr` *(variable, line 100)*

*... and 5 more*



#### `config/loader.ts` (16 unused declarations)

- [ ] Remove `CONFIG_FILENAMES` *(const, line 11)*
- [ ] Remove `DEPRECATED_FILENAMES` *(const, line 12)*
- [ ] Remove `loadConfigFile` *(function, line 18)*
- [ ] Remove `content` *(const, line 24)*
- [ ] Remove `config` *(const, line 25)*
- [ ] Remove `filename` *(const, line 26)*
- [ ] Remove `showDeprecationWarning` *(function, line 37)*
- [ ] Remove `location` *(const, line 38)*
- [ ] Remove `newFilename` *(const, line 39)*
- [ ] Remove `homeDir` *(const, line 135)*

*... and 6 more*



#### `core/agent.ts` (33 unused declarations)

- [ ] Remove `fullSystemPrompt` *(const, line 61)*
- [ ] Remove `compactResult` *(const, line 64)*
- [ ] Remove `currentTokens` *(const, line 78)*
- [ ] Remove `assistantMessage` *(variable, line 89)*
- [ ] Remove `lastToolResultIndex` *(variable, line 112)*
- [ ] Remove `m` *(const, line 114)*
- [ ] Remove `rollbackMessages` *(const, line 123)*
- [ ] Remove `toolUseMessages` *(const, line 160)*
- [ ] Remove `toolResults` *(const, line 175)*
- [ ] Remove `orderedToolResults` *(const, line 198)*

*... and 23 more*



#### `utils/systemEncoding.ts` (8 unused declarations)

- [ ] Remove `cachedSystemEncoding` *(variable, line 13)*
- [ ] Remove `output` *(const, line 56)*
- [ ] Remove `match` *(const, line 96)*
- [ ] Remove `codePage` *(const, line 59)*
- [ ] Remove `env` *(const, line 81)*
- [ ] Remove `locale` *(variable, line 82)*
- [ ] Remove `map` *(const, line 116)*
- [ ] Remove `detected` *(const, line 157)*


#### `utils/terminalSerializer.ts` (19 unused declarations)

- [ ] Remove `Attribute` *(enum, line 23)*
- [ ] Remove `Cell` *(class, line 37)*
- [ ] Remove `buffer` *(const, line 136)*
- [ ] Remove `cursorX` *(const, line 137)*
- [ ] Remove `cursorY` *(const, line 138)*
- [ ] Remove `defaultFg` *(const, line 139)*
- [ ] Remove `defaultBg` *(const, line 140)*
- [ ] Remove `result` *(const, line 142)*
- [ ] Remove `line` *(const, line 145)*
- [ ] Remove `currentLine` *(const, line 146)*

*... and 9 more*



#### `services/shell-execution.ts` (64 unused declarations)

- [ ] Remove `SIGKILL_TIMEOUT_MS` *(const, line 24)*
- [ ] Remove `MAX_CHILD_PROCESS_BUFFER_SIZE` *(const, line 25)*
- [ ] Remove `ActivePty` *(interface, line 87)*
- [ ] Remove `getFullBufferText` *(const, line 92)*
- [ ] Remove `buffer` *(const, line 464)*
- [ ] Remove `lines` *(const, line 469)*
- [ ] Remove `line` *(const, line 491)*
- [ ] Remove `lineContent` *(const, line 472)*
- [ ] Remove `ptyInfo` *(const, line 130)*
- [ ] Remove `chunkLength` *(const, line 160)*

*... and 54 more*



#### `utils/tool-response-limiter.ts` (11 unused declarations)

- [ ] Remove `encoder` *(variable, line 14)*
- [ ] Remove `getEncoder` *(function, line 15)*
- [ ] Remove `enc` *(const, line 50)*
- [ ] Remove `tokens` *(const, line 57)*
- [ ] Remove `count` *(const, line 58)*
- [ ] Remove `estimatedTokens` *(const, line 94)*
- [ ] Remove `maxChars` *(const, line 101)*
- [ ] Remove `truncated` *(const, line 102)*
- [ ] Remove `totalLines` *(const, line 105)*
- [ ] Remove `keptLines` *(const, line 106)*

*... and 1 more*



#### `tools/bash.ts` (28 unused declarations)

- [ ] Remove `inputSchema` *(const, line 23)*
- [ ] Remove `Output` *(type, line 31)*
- [ ] Remove `BANNED_COMMANDS` *(const, line 40)*
- [ ] Remove `activeShellPids` *(const, line 53)*
- [ ] Remove `parts` *(const, line 71)*
- [ ] Remove `baseCmd` *(const, line 72)*
- [ ] Remove `errorMessage` *(variable, line 86)*
- [ ] Remove `trimmedStdout` *(variable, line 91)*
- [ ] Remove `trimmedStderr` *(const, line 92)*
- [ ] Remove `maxTokens` *(const, line 96)*

*... and 18 more*



#### `tools/grep.ts` (14 unused declarations)

- [ ] Remove `inputSchema` *(const, line 18)*
- [ ] Remove `MAX_RESULTS` *(const, line 32)*
- [ ] Remove `Output` *(type, line 34)*
- [ ] Remove `result` *(variable, line 63)*
- [ ] Remove `maxTokens` *(const, line 69)*
- [ ] Remove `estimatedTokens` *(const, line 72)*
- [ ] Remove `start` *(const, line 85)*
- [ ] Remove `absolutePath` *(const, line 86)*
- [ ] Remove `args` *(const, line 90)*
- [ ] Remove `results` *(const, line 96)*

*... and 4 more*



#### `mcp/client.ts` (42 unused declarations)

- [ ] Remove `McpName` *(type, line 20)*
- [ ] Remove `ConnectedClient` *(interface, line 22)*
- [ ] Remove `FailedClient` *(interface, line 29)*
- [ ] Remove `WrappedClient` *(type, line 35)*
- [ ] Remove `connectedClients` *(variable, line 37)*
- [ ] Remove `connectToServer` *(function, line 42)*
- [ ] Remove `transport` *(const, line 46)*
- [ ] Remove `client` *(const, line 509)*
- [ ] Remove `CONNECTION_TIMEOUT_MS` *(const, line 70)*
- [ ] Remove `connectPromise` *(const, line 71)*

*... and 32 more*



#### `agents/schema.ts` (4 unused declarations)

- [ ] Remove `result` *(const, line 65)*
- [ ] Remove `messages` *(const, line 92)*
- [ ] Remove `pathStr` *(const, line 93)*
- [ ] Remove `now` *(const, line 110)*


#### `agents/manager.ts` (23 unused declarations)

- [ ] Remove `ensureDir` *(function, line 48)*
- [ ] Remove `agentExistsInDir` *(function, line 59)*
- [ ] Remove `filePath` *(const, line 149)*
- [ ] Remove `readAgentConfig` *(function, line 72)*
- [ ] Remove `content` *(const, line 272)*
- [ ] Remove `parsed` *(const, line 273)*
- [ ] Remove `validation` *(const, line 275)*
- [ ] Remove `writeAgentConfig` *(function, line 87)*
- [ ] Remove `listAgentsInDir` *(function, line 99)*
- [ ] Remove `files` *(const, line 107)*

*... and 13 more*



#### `utils/shell.ts` (16 unused declarations)

- [ ] Remove `QueuedCommand` *(type, line 19)*
- [ ] Remove `TEMPFILE_PREFIX` *(const, line 27)*
- [ ] Remove `DEFAULT_TIMEOUT` *(const, line 28)*
- [ ] Remove `binShell` *(const, line 46)*
- [ ] Remove `id` *(const, line 70)*
- [ ] Remove `queued` *(const, line 109)*
- [ ] Remove `result` *(const, line 112)*
- [ ] Remove `fullCommand` *(const, line 129)*
- [ ] Remove `startTime` *(const, line 133)*
- [ ] Remove `interrupted` *(variable, line 134)*

*... and 6 more*



#### `agents/init.ts` (10 unused declarations)

- [ ] Remove `__filename` *(const, line 13)*
- [ ] Remove `__dirname` *(const, line 14)*
- [ ] Remove `DEFAULT_TEMPLATES` *(const, line 19)*
- [ ] Remove `loadTemplate` *(function, line 32)*
- [ ] Remove `templatePath` *(const, line 33)*
- [ ] Remove `content` *(const, line 34)*
- [ ] Remove `globalDir` *(const, line 54)*
- [ ] Remove `existing` *(const, line 109)*
- [ ] Remove `fs` *(const, line 71)*
- [ ] Remove `templates` *(const, line 106)*


#### `agents/config-merger.ts` (17 unused declarations)

- [ ] Remove `systemPrompt` *(const, line 38)*
- [ ] Remove `filteredTools` *(const, line 41)*
- [ ] Remove `mcpServers` *(const, line 44)*
- [ ] Remove `mergeSystemPrompt` *(function, line 59)*
- [ ] Remove `basePrompts` *(const, line 63)*
- [ ] Remove `filterTools` *(function, line 80)*
- [ ] Remove `toolEnabled` *(const, line 86)*
- [ ] Remove `parts` *(const, line 93)*
- [ ] Remove `serverName` *(const, line 95)*
- [ ] Remove `toolName` *(const, line 96)*

*... and 7 more*



#### `llm/anthropic.ts` (21 unused declarations)

- [ ] Remove `SONNET_COST_PER_MILLION_INPUT_TOKENS` *(const, line 13)*
- [ ] Remove `SONNET_COST_PER_MILLION_OUTPUT_TOKENS` *(const, line 14)*
- [ ] Remove `formatToolsForAPI` *(function, line 19)*
- [ ] Remove `inputSchema` *(variable, line 21)*
- [ ] Remove `calculateCost` *(function, line 44)*
- [ ] Remove `costPerMillionInput` *(const, line 45)*
- [ ] Remove `costPerMillionOutput` *(const, line 46)*
- [ ] Remove `inputCost` *(const, line 48)*
- [ ] Remove `outputCost` *(const, line 49)*
- [ ] Remove `apiKey` *(const, line 72)*

*... and 11 more*



#### `llm/cerebras.ts` (92 unused declarations)

- [ ] Remove `CEREBRAS_BASE_URL` *(const, line 13)*
- [ ] Remove `CEREBRAS_COST_PER_MILLION_TOKENS` *(const, line 14)*
- [ ] Remove `MAX_RETRIES` *(const, line 17)*
- [ ] Remove `BASE_DELAY_MS` *(const, line 18)*
- [ ] Remove `MAX_DELAY_MS` *(const, line 19)*
- [ ] Remove `TIMEOUT_MS_BY_ATTEMPT` *(const, line 22)*
- [ ] Remove `REQUEST_DELAY_MS` *(const, line 30)*
- [ ] Remove `lastRequestTime` *(variable, line 31)*
- [ ] Remove `sleep` *(function, line 36)*
- [ ] Remove `cleanDataForCerebras` *(function, line 50)*

*... and 82 more*



#### `llm/router.ts` (4 unused declarations)

- [ ] Remove `config` *(const, line 33)*
- [ ] Remove `provider` *(const, line 36)*
- [ ] Remove `enableThinking` *(const, line 39)*
- [ ] Remove `ultrathinkMode` *(const, line 40)*


#### `sdk/typescript/index.ts` (13 unused declarations)

- [ ] Remove `tools` *(const, line 193)*
- [ ] Remove `model` *(const, line 194)*
- [ ] Remove `apiKey` *(const, line 195)*
- [ ] Remove `userMessage` *(const, line 198)*
- [ ] Remove `messagesForQuery` *(const, line 202)*
- [ ] Remove `systemPrompt` *(const, line 205)*
- [ ] Remove `context` *(const, line 228)*
- [ ] Remove `canUseTool` *(const, line 234)*
- [ ] Remove `toolContext` *(const, line 242)*
- [ ] Remove `queryMessages` *(const, line 156)*

*... and 3 more*



#### `agents/tool-wrapper.ts` (16 unused declarations)

- [ ] Remove `AgentToolInputSchema` *(const, line 18)*
- [ ] Remove `createAgentTool` *(function, line 25)*
- [ ] Remove `agent` *(const, line 48)*
- [ ] Remove `allTools` *(const, line 59)*
- [ ] Remove `nonAgentTools` *(const, line 60)*
- [ ] Remove `baseConfig` *(const, line 63)*
- [ ] Remove `clientConfig` *(const, line 66)*
- [ ] Remove `client` *(const, line 77)*
- [ ] Remove `result` *(const, line 80)*
- [ ] Remove `responseTexts` *(const, line 83)*

*... and 6 more*



#### `tools/index.ts` (16 unused declarations)

- [ ] Remove `cachedTools` *(variable, line 11)*
- [ ] Remove `cachedMCPTools` *(variable, line 12)*
- [ ] Remove `tools` *(variable, line 37)*
- [ ] Remove `mcpLoadTimeoutMs` *(const, line 45)*
- [ ] Remove `mcpToolsPromise` *(const, line 47)*
- [ ] Remove `timeoutPromise` *(const, line 49)*
- [ ] Remove `timeoutId` *(const, line 50)*
- [ ] Remove `mcpTools` *(const, line 63)*
- [ ] Remove `config` *(const, line 68)*
- [ ] Remove `parts` *(const, line 77)*

*... and 6 more*



#### `utils/version-check.ts` (20 unused declarations)

- [ ] Remove `VersionInfo` *(interface, line 9)*
- [ ] Remove `VERSION_CACHE_FILE` *(const, line 18)*
- [ ] Remove `CACHE_DURATION` *(const, line 19)*
- [ ] Remove `parseVersion` *(function, line 24)*
- [ ] Remove `compareVersions` *(function, line 32)*
- [ ] Remove `parts1` *(const, line 33)*
- [ ] Remove `parts2` *(const, line 34)*
- [ ] Remove `part1` *(const, line 37)*
- [ ] Remove `part2` *(const, line 38)*
- [ ] Remove `possiblePaths` *(const, line 54)*

*... and 10 more*



#### `utils/permission-check.ts` (7 unused declarations)

- [ ] Remove `PermissionCheckResult` *(interface, line 10)*
- [ ] Remove `scriptPath` *(const, line 22)*
- [ ] Remove `cliPath` *(const, line 30)*
- [ ] Remove `stats` *(const, line 38)*
- [ ] Remove `lines` *(const, line 104)*
- [ ] Remove `suggestion` *(const, line 114)*
- [ ] Remove `maxLen` *(const, line 115)*


#### `utils/doctor.ts` (43 unused declarations)

- [ ] Remove `DiagnosticResult` *(interface, line 11)*
- [ ] Remove `results` *(const, line 22)*
- [ ] Remove `checkNodeVersion` *(function, line 38)*
- [ ] Remove `version` *(const, line 70)*
- [ ] Remove `major` *(const, line 41)*
- [ ] Remove `checkNpmAvailable` *(function, line 68)*
- [ ] Remove `checkDependencies` *(function, line 88)*
- [ ] Remove `packageJsonPath` *(variable, line 91)*
- [ ] Remove `distPath` *(const, line 94)*
- [ ] Remove `rootPath` *(const, line 101)*

*... and 33 more*



#### `tui/prompt-history.ts` (11 unused declarations)

- [ ] Remove `MAX_HISTORY_ENTRIES` *(const, line 18)*
- [ ] Remove `getHistoryFilePath` *(function, line 23)*
- [ ] Remove `configDir` *(const, line 32)*
- [ ] Remove `ensureConfigDir` *(function, line 31)*
- [ ] Remove `historyPath` *(const, line 130)*
- [ ] Remove `data` *(const, line 47)*
- [ ] Remove `entries` *(const, line 48)*
- [ ] Remove `history` *(const, line 116)*
- [ ] Remove `entry` *(const, line 82)*
- [ ] Remove `trimmedHistory` *(const, line 93)*

*... and 1 more*



#### `tui/conversation-storage.ts` (25 unused declarations)

- [ ] Remove `homeDir` *(const, line 83)*
- [ ] Remove `ensureConversationsDir` *(function, line 90)*
- [ ] Remove `dir` *(const, line 224)*
- [ ] Remove `filePath` *(const, line 225)*
- [ ] Remove `serializable` *(const, line 140)*
- [ ] Remove `content` *(const, line 486)*
- [ ] Remove `loaded` *(const, line 192)*
- [ ] Remove `files` *(const, line 184)*
- [ ] Remove `conversations` *(const, line 185)*
- [ ] Remove `conv` *(variable, line 195)*

*... and 15 more*



#### `tui/logger.ts` (6 unused declarations)

- [ ] Remove `SWARM_CLI_DIR` *(const, line 12)*
- [ ] Remove `LOGS_DIR` *(const, line 13)*
- [ ] Remove `timestamp` *(const, line 33)*
- [ ] Remove `filename` *(const, line 56)*
- [ ] Remove `filepath` *(const, line 57)*
- [ ] Remove `line` *(const, line 60)*


#### `tui/components/AnsiOutputText.tsx` (7 unused declarations)

- [ ] Remove `AnsiOutputTextProps` *(interface, line 13)*
- [ ] Remove `AnsiTokenText` *(const, line 25)*
- [ ] Remove `styleProps` *(const, line 27)*
- [ ] Remove `AnsiLineText` *(const, line 64)*
- [ ] Remove `startLine` *(const, line 91)*
- [ ] Remove `endLine` *(const, line 92)*
- [ ] Remove `visibleLines` *(const, line 93)*


#### `tui/components/MessageList.tsx` (49 unused declarations)

- [ ] Remove `MessageListProps` *(interface, line 14)*
- [ ] Remove `BLUE` *(const, line 21)*
- [ ] Remove `PURPLE` *(const, line 22)*
- [ ] Remove `CYAN` *(const, line 23)*
- [ ] Remove `WHITE` *(const, line 24)*
- [ ] Remove `DIM_WHITE` *(const, line 25)*
- [ ] Remove `COMPACT_MAX_LINES` *(const, line 28)*
- [ ] Remove `VERBOSE_MAX_LINES` *(const, line 29)*
- [ ] Remove `MAX_TEXT_LENGTH` *(const, line 30)*
- [ ] Remove `toolExecutions` *(const, line 35)*

*... and 39 more*



#### `mcp/resources.ts` (31 unused declarations)

- [ ] Remove `execAsync` *(const, line 11)*
- [ ] Remove `gitRoot` *(const, line 54)*
- [ ] Remove `normalizedPath` *(const, line 44)*
- [ ] Remove `normalizedGitRoot` *(const, line 45)*
- [ ] Remove `files` *(const, line 62)*
- [ ] Remove `resources` *(const, line 67)*
- [ ] Remove `directories` *(const, line 68)*
- [ ] Remove `uri` *(const, line 95)*
- [ ] Remove `parts` *(const, line 84)*
- [ ] Remove `currentPath` *(variable, line 85)*

*... and 21 more*



#### `tui/components/InputBox.tsx` (68 unused declarations)

- [ ] Remove `InputBoxProps` *(interface, line 13)*
- [ ] Remove `COMMANDS` *(const, line 25)*
- [ ] Remove `BLUE` *(const, line 39)*
- [ ] Remove `PURPLE` *(const, line 40)*
- [ ] Remove `CYAN` *(const, line 41)*
- [ ] Remove `WHITE` *(const, line 42)*
- [ ] Remove `DIM_WHITE` *(const, line 43)*
- [ ] Remove `value` *(const, line 65)*
- [ ] Remove `setValue` *(const, line 66)*
- [ ] Remove `handleSubmit` *(const, line 69)*

*... and 58 more*



#### `tui/components/StatusBar.tsx` (12 unused declarations)

- [ ] Remove `StatusBarProps` *(interface, line 9)*
- [ ] Remove `width` *(const, line 43)*
- [ ] Remove `line` *(const, line 44)*
- [ ] Remove `BLUE` *(const, line 47)*
- [ ] Remove `PURPLE` *(const, line 48)*
- [ ] Remove `CYAN` *(const, line 49)*
- [ ] Remove `WHITE` *(const, line 50)*
- [ ] Remove `DIM_WHITE` *(const, line 51)*
- [ ] Remove `formatCompact` *(const, line 54)*
- [ ] Remove `contextPct` *(const, line 61)*

*... and 2 more*



#### `tui/components/Header.tsx` (11 unused declarations)

- [ ] Remove `require` *(const, line 10)*
- [ ] Remove `HeaderProps` *(interface, line 13)*
- [ ] Remove `CYAN` *(const, line 23)*
- [ ] Remove `WHITE` *(const, line 24)*
- [ ] Remove `DIM_WHITE` *(const, line 25)*
- [ ] Remove `PURPLE` *(const, line 26)*
- [ ] Remove `width` *(const, line 30)*
- [ ] Remove `line` *(const, line 31)*
- [ ] Remove `shortModel` *(const, line 34)*
- [ ] Remove `getModeText` *(const, line 37)*

*... and 1 more*



#### `tui/components/ConversationList.tsx` (51 unused declarations)

- [ ] Remove `ConversationListProps` *(interface, line 18)*
- [ ] Remove `BLUE` *(const, line 24)*
- [ ] Remove `PURPLE` *(const, line 25)*
- [ ] Remove `CYAN` *(const, line 26)*
- [ ] Remove `WHITE` *(const, line 27)*
- [ ] Remove `GREEN` *(const, line 28)*
- [ ] Remove `YELLOW` *(const, line 29)*
- [ ] Remove `DIM_WHITE` *(const, line 30)*
- [ ] Remove `terminalHeight` *(const, line 44)*
- [ ] Remove `terminalWidth` *(const, line 45)*

*... and 41 more*



#### `tui/components/ConfigPanel.tsx` (22 unused declarations)

- [ ] Remove `ConfigPanelProps` *(interface, line 13)*
- [ ] Remove `BLUE` *(const, line 28)*
- [ ] Remove `PURPLE` *(const, line 29)*
- [ ] Remove `CYAN` *(const, line 30)*
- [ ] Remove `WHITE` *(const, line 31)*
- [ ] Remove `RED` *(const, line 32)*
- [ ] Remove `GREEN` *(const, line 33)*
- [ ] Remove `DIM_WHITE` *(const, line 34)*
- [ ] Remove `Field` *(type, line 36)*
- [ ] Remove `getAvailableEditor` *(const, line 47)*

*... and 12 more*



#### `tui/components/common/SelectList.tsx` (16 unused declarations)

- [ ] Remove `CYAN` *(const, line 10)*
- [ ] Remove `WHITE` *(const, line 11)*
- [ ] Remove `DIM_WHITE` *(const, line 12)*
- [ ] Remove `GREEN` *(const, line 13)*
- [ ] Remove `BLUE` *(const, line 14)*
- [ ] Remove `PURPLE` *(const, line 15)*
- [ ] Remove `filteredItems` *(const, line 65)*
- [ ] Remove `selectedItem` *(const, line 136)*
- [ ] Remove `getVisibleWindow` *(const, line 142)*
- [ ] Remove `start` *(variable, line 147)*

*... and 6 more*



#### `tui/components/common/FormEditor.tsx` (23 unused declarations)

- [ ] Remove `CYAN` *(const, line 11)*
- [ ] Remove `WHITE` *(const, line 12)*
- [ ] Remove `DIM_WHITE` *(const, line 13)*
- [ ] Remove `GREEN` *(const, line 14)*
- [ ] Remove `RED` *(const, line 15)*
- [ ] Remove `YELLOW` *(const, line 16)*
- [ ] Remove `PURPLE` *(const, line 17)*
- [ ] Remove `initial` *(const, line 58)*
- [ ] Remove `field` *(const, line 154)*
- [ ] Remove `toggleCheckbox` *(const, line 130)*

*... and 13 more*



#### `tui/components/common/Modal.tsx` (8 unused declarations)

- [ ] Remove `CYAN` *(const, line 10)*
- [ ] Remove `WHITE` *(const, line 11)*
- [ ] Remove `DIM_WHITE` *(const, line 12)*
- [ ] Remove `RED` *(const, line 13)*
- [ ] Remove `YELLOW` *(const, line 14)*
- [ ] Remove `GREEN` *(const, line 15)*
- [ ] Remove `getTypeColor` *(const, line 57)*
- [ ] Remove `getTypeIcon` *(const, line 70)*


#### `tui/components/MCPManager.tsx` (42 unused declarations)

- [ ] Remove `MCPManagerProps` *(interface, line 21)*
- [ ] Remove `CYAN` *(const, line 27)*
- [ ] Remove `WHITE` *(const, line 28)*
- [ ] Remove `DIM_WHITE` *(const, line 29)*
- [ ] Remove `GREEN` *(const, line 30)*
- [ ] Remove `RED` *(const, line 31)*
- [ ] Remove `YELLOW` *(const, line 32)*
- [ ] Remove `PURPLE` *(const, line 33)*
- [ ] Remove `View` *(type, line 35)*
- [ ] Remove `ServerType` *(type, line 36)*

*... and 32 more*



#### `tui/components/AgentManager.tsx` (47 unused declarations)

- [ ] Remove `AgentManagerProps` *(interface, line 22)*
- [ ] Remove `CYAN` *(const, line 30)*
- [ ] Remove `WHITE` *(const, line 31)*
- [ ] Remove `DIM_WHITE` *(const, line 32)*
- [ ] Remove `GREEN` *(const, line 33)*
- [ ] Remove `RED` *(const, line 34)*
- [ ] Remove `YELLOW` *(const, line 35)*
- [ ] Remove `PURPLE` *(const, line 36)*
- [ ] Remove `BLUE` *(const, line 37)*
- [ ] Remove `View` *(type, line 39)*

*... and 37 more*



#### `tui/components/MessageNavigator.tsx` (7 unused declarations)

- [ ] Remove `MessageNavigatorProps` *(interface, line 9)*
- [ ] Remove `BLUE` *(const, line 23)*
- [ ] Remove `PURPLE` *(const, line 24)*
- [ ] Remove `CYAN` *(const, line 25)*
- [ ] Remove `WHITE` *(const, line 26)*
- [ ] Remove `YELLOW` *(const, line 27)*
- [ ] Remove `DIM_WHITE` *(const, line 28)*


#### `tui/components/BranchSelector.tsx` (22 unused declarations)

- [ ] Remove `BranchSelectorProps` *(interface, line 11)*
- [ ] Remove `SelectItem` *(interface, line 17)*
- [ ] Remove `BLUE` *(const, line 23)*
- [ ] Remove `PURPLE` *(const, line 24)*
- [ ] Remove `CYAN` *(const, line 25)*
- [ ] Remove `WHITE` *(const, line 26)*
- [ ] Remove `GREEN` *(const, line 27)*
- [ ] Remove `branchTree` *(const, line 35)*
- [ ] Remove `branches` *(const, line 36)*
- [ ] Remove `tree` *(const, line 37)*

*... and 12 more*



#### `tui/components/ShortcutBar.tsx` (8 unused declarations)

- [ ] Remove `ShortcutBarProps` *(interface, line 9)*
- [ ] Remove `BLACK` *(const, line 15)*
- [ ] Remove `CYAN` *(const, line 16)*
- [ ] Remove `WHITE` *(const, line 17)*
- [ ] Remove `GRAY_BG` *(const, line 18)*
- [ ] Remove `Shortcut` *(interface, line 20)*
- [ ] Remove `SHORTCUTS` *(const, line 26)*
- [ ] Remove `visibleShortcuts` *(const, line 41)*


#### `tui/components/TooltipHints.tsx` (12 unused declarations)

- [ ] Remove `YELLOW` *(const, line 10)*
- [ ] Remove `DIM_WHITE` *(const, line 11)*
- [ ] Remove `DARK_YELLOW` *(const, line 12)*
- [ ] Remove `Tip` *(interface, line 14)*
- [ ] Remove `TIPS` *(const, line 19)*
- [ ] Remove `TooltipHintsProps` *(interface, line 38)*
- [ ] Remove `initialTimeout` *(const, line 55)*
- [ ] Remove `hideTimeout` *(const, line 66)*
- [ ] Remove `nextTipTimeout` *(const, line 71)*
- [ ] Remove `showNextTip` *(const, line 81)*

*... and 2 more*



#### `tui/background-agent.ts` (9 unused declarations)

- [ ] Remove `execAsync` *(const, line 11)*
- [ ] Remove `recentMessages` *(const, line 72)*
- [ ] Remove `toolUses` *(const, line 75)*
- [ ] Remove `userMessages` *(const, line 104)*
- [ ] Remove `content` *(const, line 109)*
- [ ] Remove `result` *(const, line 122)*
- [ ] Remove `lastMessage` *(const, line 136)*
- [ ] Remove `lines` *(const, line 174)*
- [ ] Remove `backgroundAgentInstance` *(variable, line 198)*


#### `tui/components/App.tsx` (80 unused declarations)

- [ ] Remove `View` *(type, line 47)*
- [ ] Remove `AgentMode` *(type, line 48)*
- [ ] Remove `AppProps` *(interface, line 50)*
- [ ] Remove `BLUE` *(const, line 57)*
- [ ] Remove `PURPLE` *(const, line 58)*
- [ ] Remove `CYAN` *(const, line 59)*
- [ ] Remove `WHITE` *(const, line 60)*
- [ ] Remove `DIM_WHITE` *(const, line 61)*
- [ ] Remove `RED` *(const, line 62)*
- [ ] Remove `GREEN` *(const, line 63)*

*... and 70 more*



#### `tui/utils/keyToAnsi.example.tsx` (9 unused declarations)

- [ ] Remove `ansiSequence` *(const, line 271)*
- [ ] Remove `keyInfo` *(const, line 75)*
- [ ] Remove `formatAnsi` *(function, line 94)*
- [ ] Remove `code` *(const, line 98)*
- [ ] Remove `macros` *(const, line 196)*
- [ ] Remove `macroKey` *(variable, line 203)*
- [ ] Remove `TerminalPanelProps` *(interface, line 234)*
- [ ] Remove `ansiSeq` *(const, line 252)*
- [ ] Remove `key` *(const, line 301)*


#### `tui/components/ShellInputPrompt.tsx` (6 unused declarations)

- [ ] Remove `ShellInputPromptProps` *(interface, line 15)*
- [ ] Remove `lastCtrlCPress` *(const, line 29)*
- [ ] Remove `checkPty` *(const, line 33)*
- [ ] Remove `now` *(const, line 65)*
- [ ] Remove `timeSinceLastPress` *(const, line 66)*
- [ ] Remove `ansiSequence` *(const, line 81)*


#### `cli/stream-renderer.ts` (21 unused declarations)

- [ ] Remove `content` *(const, line 251)*
- [ ] Remove `toolUseBlocks` *(const, line 140)*
- [ ] Remove `textBlocks` *(const, line 139)*
- [ ] Remove `toolNames` *(const, line 95)*
- [ ] Remove `toolName` *(const, line 162)*
- [ ] Remove `input` *(const, line 97)*
- [ ] Remove `cmd` *(const, line 101)*
- [ ] Remove `pattern` *(const, line 106)*
- [ ] Remove `msg` *(const, line 135)*
- [ ] Remove `text` *(const, line 258)*

*... and 11 more*



#### `cli/commands/agent.ts` (19 unused declarations)

- [ ] Remove `agentCommand` *(const, line 30)*
- [ ] Remove `renderer` *(const, line 45)*
- [ ] Remove `agent` *(const, line 319)*
- [ ] Remove `tools` *(const, line 61)*
- [ ] Remove `baseConfig` *(const, line 62)*
- [ ] Remove `clientConfig` *(const, line 65)*
- [ ] Remove `client` *(const, line 90)*
- [ ] Remove `allMessages` *(const, line 93)*
- [ ] Remove `stats` *(const, line 102)*
- [ ] Remove `agents` *(const, line 135)*

*... and 9 more*


---

## 💡 Cleanup Recommendations

1. **Start with orphaned files** - Easiest wins, clear the most LOC
2. **Review unused exports** - Reduce API surface and improve tree-shaking
3. **Remove unreachable code** - Fix logic bugs or dead branches
4. **Clean internal code** - Improve maintainability
5. **Run tests after each phase** - Ensure nothing breaks
6. **Create separate PRs** - Makes review easier

**Estimated LOC reduction:** ~6001+ lines
