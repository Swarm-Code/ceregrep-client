# Integration Guide: keyToAnsi Utility

This guide shows how to integrate the `keyToAnsi` utility with existing TUI components.

## Quick Start

### Basic Integration

```typescript
import { useInput } from 'ink';
import { keyToAnsi } from './utils/keyToAnsi';

// In your component
useInput((input, key) => {
  const ansiSequence = keyToAnsi(input, key);
  if (ansiSequence && pty) {
    pty.write(ansiSequence);
  }
});
```

## Integrating with TerminalPanel

The existing `TerminalPanel` component can be enhanced to use `keyToAnsi` for proper terminal emulation.

### Current State Analysis

The current `TerminalPanel` at `/tui/components/TerminalPanel.tsx` has:
- Basic keyboard navigation (Ctrl+C to exit)
- PTY output display
- Cursor blinking simulation

### Integration Steps

#### 1. Import the Utility

Add to the imports section:

```typescript
import { keyToAnsi, shouldHandleInTUI } from '../utils/keyToAnsi.js';
```

#### 2. Update the useInput Handler

Replace the existing keyboard handler with:

```typescript
useInput((input, key) => {
  // First check if TUI should handle this key
  if (shouldHandleInTUI(input, key)) {
    if (key.ctrl && input === 'c') {
      // Graceful shutdown
      if (ptyRef.current) {
        ptyRef.current.kill();
      }
      if (onExit) {
        onExit();
      }
      return;
    }
  }

  // Convert to ANSI and send to PTY
  const ansiSequence = keyToAnsi(input, key);
  if (ansiSequence && ptyRef.current) {
    try {
      ptyRef.current.write(ansiSequence);
    } catch (error) {
      console.error('Failed to write to PTY:', error);
    }
  }
});
```

#### 3. Enhanced Version with Additional Features

For a more robust implementation:

```typescript
useInput((input, key) => {
  // Handle TUI-specific keys
  if (shouldHandleInTUI(input, key)) {
    if (key.ctrl && input === 'c') {
      // Allow first Ctrl+C to go to PTY, second one exits
      if (lastCtrlC && Date.now() - lastCtrlC < 1000) {
        // Double Ctrl+C within 1 second - exit
        if (ptyRef.current) {
          ptyRef.current.kill();
        }
        if (onExit) {
          onExit();
        }
        return;
      }
      setLastCtrlC(Date.now());
      // Fall through to send to PTY
    }
  }

  // Convert to ANSI sequence
  const ansiSequence = keyToAnsi(input, key);

  if (ansiSequence && ptyRef.current) {
    try {
      // Write to PTY
      ptyRef.current.write(ansiSequence);

      // Optional: Echo for debugging
      if (debugMode) {
        setDebugInfo(`Sent: ${formatAnsi(ansiSequence)}`);
      }
    } catch (error) {
      console.error('Failed to write to PTY:', error);
    }
  }
});
```

## Common Integration Patterns

### Pattern 1: Direct PTY Forwarding

Use when you want all keys to go directly to the terminal:

```typescript
useInput((input, key) => {
  const ansi = keyToAnsi(input, key);
  if (ansi) pty.write(ansi);
});
```

### Pattern 2: Selective Forwarding

Use when you want to intercept certain keys:

```typescript
useInput((input, key) => {
  // Handle special keys
  if (key.escape) {
    handleEscape();
    return;
  }

  // Forward everything else
  const ansi = keyToAnsi(input, key);
  if (ansi) pty.write(ansi);
});
```

### Pattern 3: Mode-Based Forwarding

Use when you have different modes (like vim):

```typescript
useInput((input, key) => {
  if (mode === 'command') {
    // Handle commands, don't forward
    handleCommand(input, key);
  } else {
    // Forward to PTY
    const ansi = keyToAnsi(input, key);
    if (ansi) pty.write(ansi);
  }
});
```

### Pattern 4: With Error Handling

Production-ready pattern with full error handling:

```typescript
useInput((input, key) => {
  try {
    // Check TUI handling
    if (shouldHandleInTUI(input, key)) {
      handleTUICommand(input, key);
      return;
    }

    // Convert to ANSI
    const ansiSequence = keyToAnsi(input, key);

    if (ansiSequence) {
      // Validate PTY is ready
      if (!ptyRef.current || ptyRef.current.killed) {
        console.warn('PTY not available');
        return;
      }

      // Write with error handling
      ptyRef.current.write(ansiSequence, (err) => {
        if (err) {
          console.error('PTY write error:', err);
          setError('Failed to send input to terminal');
        }
      });
    }
  } catch (error) {
    console.error('Key handling error:', error);
    setError('Key handling failed');
  }
});
```

## Testing Integration

### Manual Testing

1. **Arrow Keys**: Press arrow keys and verify cursor movement in PTY
2. **Control Keys**: Test Ctrl+C, Ctrl+D, Ctrl+L, etc.
3. **Function Keys**: Test F1-F12 if your terminal application uses them
4. **Text Input**: Type regular characters and verify they appear
5. **Modifiers**: Test Ctrl+Arrow, Alt+Arrow, Shift+Arrow

### Automated Testing

```typescript
import { simulateKeyPress } from './utils/keyToAnsi.example';

describe('TerminalPanel PTY Integration', () => {
  it('should forward arrow keys to PTY', () => {
    const mockPTY = { write: jest.fn() };
    const ansi = simulateKeyPress('', { upArrow: true });

    mockPTY.write(ansi);
    expect(mockPTY.write).toHaveBeenCalledWith('\x1b[A');
  });
});
```

## Debugging

### Enable Debug Mode

Add debug output to see what's being sent:

```typescript
useInput((input, key) => {
  const ansi = keyToAnsi(input, key);

  if (process.env.DEBUG_KEYS) {
    console.log('Input:', JSON.stringify(input));
    console.log('Key:', JSON.stringify(key));
    console.log('ANSI:', formatAnsi(ansi));
  }

  if (ansi) pty.write(ansi);
});
```

### Visual Debugging Component

```typescript
const [debugInfo, setDebugInfo] = useState('');

useInput((input, key) => {
  const ansi = keyToAnsi(input, key);
  setDebugInfo(`${input} → ${formatAnsi(ansi)}`);
  if (ansi) pty.write(ansi);
});

return (
  <Box>
    <Text color="gray">Debug: {debugInfo}</Text>
    {/* Rest of component */}
  </Box>
);
```

## Migration Guide

### From Direct Input Forwarding

**Before:**
```typescript
useInput((input, key) => {
  pty.write(input); // Wrong: doesn't handle special keys
});
```

**After:**
```typescript
useInput((input, key) => {
  const ansi = keyToAnsi(input, key);
  if (ansi) pty.write(ansi);
});
```

### From Manual ANSI Conversion

**Before:**
```typescript
useInput((input, key) => {
  if (key.upArrow) {
    pty.write('\x1b[A');
  } else if (key.downArrow) {
    pty.write('\x1b[B');
  } // ... lots more cases
});
```

**After:**
```typescript
useInput((input, key) => {
  const ansi = keyToAnsi(input, key);
  if (ansi) pty.write(ansi);
});
```

## Performance Considerations

1. **Caching**: The utility is stateless and fast - no caching needed
2. **Error Handling**: Add try-catch around PTY writes for production
3. **Throttling**: Not usually needed for keyboard input
4. **Memory**: No memory leaks - all conversions are pure functions

## Common Issues

### Issue: Backspace doesn't work

**Solution**: Some terminals expect `\x08` instead of `\x7f`. The utility uses `\x7f` (standard). If needed, customize:

```typescript
const ansi = keyToAnsi(input, key);
if (ansi === '\x7f' && needsBackspace08) {
  pty.write('\x08');
} else if (ansi) {
  pty.write(ansi);
}
```

### Issue: Function keys don't work

**Solution**: Ensure you're passing ParsedKey with `name` field:

```typescript
// Make sure key has 'name' property for function keys
if ('name' in key && key.name?.startsWith('f')) {
  const ansi = keyToAnsi(input, key);
  // ...
}
```

### Issue: Ctrl+C exits immediately

**Solution**: Use double-tap pattern or shouldHandleInTUI:

```typescript
if (shouldHandleInTUI(input, key)) {
  // Handle graceful exit
} else {
  // Forward to PTY
}
```

## Best Practices

1. **Always check for null**: `keyToAnsi` returns `null` for keys that shouldn't be sent
2. **Use error handling**: PTY writes can fail, always wrap in try-catch
3. **Validate PTY state**: Check if PTY exists and isn't killed before writing
4. **Don't suppress Ctrl+C**: Let it through to PTY for process interruption
5. **Test thoroughly**: Different terminals handle keys differently

## Further Reading

- See `README.md` for complete API reference
- See `keyToAnsi.example.tsx` for more examples
- See `keyToAnsi.test.ts` for comprehensive test cases
- Check TerminalPanel.tsx for real-world usage

## Support

For issues or questions:
1. Check the test file for expected behavior
2. Enable debug mode to see ANSI sequences
3. Verify your PTY is properly initialized
4. Check terminal compatibility (xterm, vt100, etc.)
