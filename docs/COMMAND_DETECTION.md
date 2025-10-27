# Smart Command Detection

Scout TUI intelligently distinguishes between commands and file paths to avoid confusion.

## The Problem

Previously, when users typed or pasted file paths starting with `/`, Scout would treat them as commands:

```bash
# User types or pastes this:
/home/user/screenshot.png

# Scout incorrectly treats it as:
Command: /home (unknown command error!)
```

## The Solution

Scout now uses a whitelist approach for commands. Only recognized Scout commands are treated as commands:

### Known Commands
```typescript
const knownCommands = [
  '/new',        // Create new conversation
  '/agent',      // Switch agent
  '/model',      // Select AI provider
  '/permissions', // Enable/disable tools
  '/checkpoint', // Create checkpoint
  '/restore',    // Restore to checkpoint
  '/list',       // Show conversations
  '/mcp',        // Manage MCP servers
  '/compact',    // Summarize conversation
  '/clear',      // Clear conversation
  '/help',       // Toggle help
  '/exit'        // Exit TUI
];
```

### Decision Logic

```typescript
if (input.startsWith('/')) {
  // Check if it matches a known command
  const isKnownCommand = knownCommands.some(cmd => 
    input === cmd || input.startsWith(cmd + ' ')
  );
  
  if (isKnownCommand) {
    // Execute as command
    handleCommand(input);
  } else {
    // Treat as regular message (likely a file path)
    sendMessage(input);
  }
}
```

## Examples

### ✅ Correctly Detected as Commands

```bash
/help
/new My Project
/agent orchestrator
/model
/list
```

### ✅ Correctly Detected as Messages

```bash
/path/to/image.png
/home/user/screenshot.jpg
/var/log/error.log
/usr/local/bin/myapp
/api/v1/users
```

## Benefits

1. **User-Friendly**: No need to escape file paths
2. **Intuitive**: Behaves as users expect
3. **Safe**: Won't accidentally execute invalid commands
4. **Flexible**: Can discuss file paths and API routes freely

## Edge Cases

### File paths vs Commands

```bash
# Command
/help

# File path (treated as message)
/help.txt

# Command with argument
/new My Conversation

# File path (treated as message)
/new-feature/image.png
```

### URLs with leading slash

```bash
# These are treated as messages (not commands)
/api/users
/v1/posts
/static/images/logo.png
```

## Implementation Details

**Location**: `tui/components/App.tsx` in `handleSubmit` function

**Added in**: Scout TUI v1.0.1

**Related to**: Clipboard support for image pasting

## Testing

To test the command detection:

```bash
# Should work as commands
/help
/list
/model

# Should work as messages
/path/to/file.png
/home/user/image.jpg
/api/endpoint

# Should work with images
# 1. Copy image path: /home/user/screenshot.png
# 2. Paste with Ctrl+V
# 3. Should detect as image, not command
```

## Future Improvements

Potential enhancements:

- [ ] Dynamic command registration
- [ ] Command aliases support
- [ ] Custom command plugins
- [ ] Command autocomplete hints
- [ ] Command validation before execution
