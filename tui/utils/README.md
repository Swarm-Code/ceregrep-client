# TUI Utilities

This directory contains utility functions for the Terminal User Interface (TUI).

## keyToAnsi.ts

A comprehensive utility for converting Ink key events to ANSI escape sequences. This is essential for proper terminal emulation and PTY interaction.

### Purpose

When building a TUI that needs to interact with pseudo-terminals (PTYs) or emulate terminal behavior, you need to convert high-level key events from Ink into the raw ANSI escape sequences that terminals expect. This utility handles that conversion.

### Features

- **Full keyboard support**: Arrow keys, function keys, navigation keys, and more
- **Modifier combinations**: Ctrl, Alt/Meta, and Shift modifiers
- **Control sequences**: Proper handling of terminal control characters (SIGINT, EOF, etc.)
- **Type-safe**: Full TypeScript support with exported interfaces
- **Comprehensive**: Handles over 40 different key combinations

### Usage

```typescript
import { keyToAnsi, Key } from './utils/keyToAnsi';
import { useInput } from 'ink';

// In your component
useInput((input, key) => {
  const ansiSequence = keyToAnsi(input, key);

  if (ansiSequence) {
    // Send to PTY or terminal emulator
    pty.write(ansiSequence);
  }
});
```

### Supported Keys

#### Arrow Keys
- Up, Down, Left, Right
- With Ctrl modifier (word/line navigation)
- With Alt modifier (special navigation)
- With Shift modifier (text selection)

#### Control Combinations
- `Ctrl+C` → SIGINT (interrupt)
- `Ctrl+D` → EOF (end of file)
- `Ctrl+Z` → SIGTSTP (suspend)
- `Ctrl+L` → Clear screen
- `Ctrl+U` → Kill line
- `Ctrl+W` → Kill word
- `Ctrl+A-Z` → Control characters

#### Function Keys
- F1 through F12
- Extended function keys F13-F20

#### Navigation Keys
- Home, End
- PageUp, PageDown
- Insert, Delete

#### Special Keys
- Tab, Shift+Tab (reverse tab)
- Enter/Return
- Escape
- Backspace

#### Alt/Meta Combinations
- Alt+Arrow keys
- Alt+character (ESC prefix)

### API Reference

#### `keyToAnsi(input: string, key: Key | ParsedKey): string | null`

Converts an Ink key event to an ANSI escape sequence.

**Parameters:**
- `input`: The raw input string from the terminal
- `key`: The Ink Key object or ParsedKey object

**Returns:**
- ANSI escape sequence string, or `null` if the key shouldn't be sent to PTY

**Example:**
```typescript
// Arrow key
keyToAnsi('', { upArrow: true, ... }) // → '\x1b[A'

// Ctrl+C
keyToAnsi('c', { ctrl: true, ... }) // → '\x03'

// Regular character
keyToAnsi('a', { ... }) // → 'a'

// Ctrl+Up (word navigation)
keyToAnsi('', { ctrl: true, upArrow: true, ... }) // → '\x1b[1;5A'
```

#### `shouldHandleInTUI(input: string, key: Key | ParsedKey): boolean`

Determines if a key press should be handled by the TUI rather than sent to the PTY.

**Parameters:**
- `input`: The raw input string
- `key`: The Ink Key object or ParsedKey object

**Returns:**
- `true` if TUI should handle the key, `false` if it should go to PTY

**Example:**
```typescript
useInput((input, key) => {
  if (shouldHandleInTUI(input, key)) {
    // Handle in TUI (e.g., exit application)
    handleTUICommand(input, key);
  } else {
    // Send to PTY
    const ansiSequence = keyToAnsi(input, key);
    if (ansiSequence) {
      pty.write(ansiSequence);
    }
  }
});
```

#### `isParsedKey(key: Key | ParsedKey): key is ParsedKey`

Type guard to check if a key is a ParsedKey with additional metadata.

### Interfaces

#### `Key`

Matches Ink's useInput key structure:

```typescript
interface Key {
  upArrow: boolean;
  downArrow: boolean;
  leftArrow: boolean;
  rightArrow: boolean;
  pageDown: boolean;
  pageUp: boolean;
  return: boolean;
  escape: boolean;
  ctrl: boolean;
  shift: boolean;
  tab: boolean;
  backspace: boolean;
  delete: boolean;
  meta: boolean;
}
```

#### `ParsedKey`

Extended key information including additional metadata:

```typescript
interface ParsedKey extends Partial<Key> {
  name?: string;      // Key name (e.g., 'f1', 'home')
  sequence?: string;  // Raw sequence
  raw?: string;       // Raw input
  code?: string;      // Key code
  option?: boolean;   // Option key (macOS)
}
```

### ANSI Escape Sequence Reference

| Key | ANSI Sequence | Hex |
|-----|---------------|-----|
| Up Arrow | `\x1b[A` | ESC [ A |
| Down Arrow | `\x1b[B` | ESC [ B |
| Right Arrow | `\x1b[C` | ESC [ C |
| Left Arrow | `\x1b[D` | ESC [ D |
| Ctrl+Up | `\x1b[1;5A` | ESC [ 1 ; 5 A |
| Alt+Up | `\x1b[1;3A` | ESC [ 1 ; 3 A |
| Shift+Up | `\x1b[1;2A` | ESC [ 1 ; 2 A |
| Home | `\x1b[H` | ESC [ H |
| End | `\x1b[F` | ESC [ F |
| Delete | `\x1b[3~` | ESC [ 3 ~ |
| PageUp | `\x1b[5~` | ESC [ 5 ~ |
| PageDown | `\x1b[6~` | ESC [ 6 ~ |
| F1 | `\x1bOP` | ESC O P |
| F5 | `\x1b[15~` | ESC [ 1 5 ~ |
| Ctrl+C | `\x03` | ETX |
| Ctrl+D | `\x04` | EOT |
| Tab | `\t` | HT |
| Shift+Tab | `\x1b[Z` | ESC [ Z |
| Enter | `\r` | CR |
| Backspace | `\x7f` | DEL |

### Implementation Notes

1. **Control Characters**: Ctrl+letter combinations are converted to control characters by computing `charCode - 'a'.charCode + 1`. This maps Ctrl+A to `\x01`, Ctrl+B to `\x02`, etc.

2. **Modifier Encoding**: Modified arrow keys use CSI sequences with modifiers:
   - `\x1b[1;2X` - Shift
   - `\x1b[1;3X` - Alt
   - `\x1b[1;5X` - Ctrl

3. **Meta/Alt Keys**: Alt combinations are typically sent as ESC followed by the character (`\x1b` + char).

4. **Function Keys**: F1-F4 use the shorter `\x1bOX` format, while F5+ use `\x1b[1X~` format.

5. **Backspace**: Returns DEL (`\x7f`) which is the standard backspace character in most terminals.

### Testing

Run the test suite:

```bash
npm test tui/utils/keyToAnsi.test.ts
```

The test suite covers:
- All arrow key combinations
- Control key sequences
- Function keys
- Navigation keys
- Modifier combinations
- Edge cases

### References

- [ANSI Escape Codes](https://en.wikipedia.org/wiki/ANSI_escape_code)
- [XTerm Control Sequences](https://invisible-island.net/xterm/ctlseqs/ctlseqs.html)
- [VT100 Reference](https://vt100.net/docs/vt100-ug/chapter3.html)
- [Ink useInput Hook](https://github.com/vadimdemedes/ink#useinputinputhandler-options)

### License

Part of ceregrep-client project.
