/**
 * Key to ANSI Utility
 * Converts Ink key events to ANSI escape sequences for PTY/terminal emulation
 *
 * This utility translates high-level Ink key events into the raw ANSI escape
 * sequences that terminals expect, enabling proper terminal emulation in the TUI.
 */

/**
 * Ink Key interface - matches Ink's useInput key structure
 * This is the format provided by Ink's useInput hook
 */
export interface Key {
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

/**
 * ParsedKey interface - matches the internal key parsing structure
 * This includes additional information about the key press
 */
export interface ParsedKey extends Partial<Key> {
  name?: string;
  sequence?: string;
  raw?: string;
  code?: string;
  option?: boolean;
}

/**
 * Translates an Ink Key object into its corresponding ANSI escape sequence.
 * This is essential for sending proper control characters to a pseudo-terminal.
 *
 * The function handles:
 * - Control key combinations (Ctrl+A through Ctrl+Z)
 * - Arrow keys (Up, Down, Left, Right)
 * - Navigation keys (Home, End, PageUp, PageDown)
 * - Function keys (F1 through F12)
 * - Editing keys (Insert, Delete, Backspace)
 * - Special keys (Tab, Enter, Escape)
 * - Modifier combinations (Ctrl, Alt/Meta, Shift)
 *
 * @param input - The raw input string from the terminal
 * @param key - The Ink Key object to translate
 * @returns The ANSI escape sequence as a string, or null if the key shouldn't be sent to PTY
 *
 * @example
 * // Arrow key
 * keyToAnsi('', { upArrow: true, ... }) // returns '\x1b[A'
 *
 * @example
 * // Ctrl+C
 * keyToAnsi('c', { ctrl: true, ... }) // returns '\x03'
 *
 * @example
 * // Regular character
 * keyToAnsi('a', { ... }) // returns 'a'
 */
export function keyToAnsi(input: string, key: Key | ParsedKey): string | null {
  // Handle Control key combinations
  if (key.ctrl) {
    // Get the key name from ParsedKey if available
    const keyName = 'name' in key ? key.name : undefined;

    // Ctrl + letter (a-z)
    if (keyName && keyName.length === 1 && keyName >= 'a' && keyName <= 'z') {
      // Convert to control character (Ctrl+A = 1, Ctrl+B = 2, etc.)
      return String.fromCharCode(keyName.charCodeAt(0) - 'a'.charCodeAt(0) + 1);
    }

    // Specific Ctrl combinations
    if (input.length === 1 && input >= 'a' && input <= 'z') {
      return String.fromCharCode(input.charCodeAt(0) - 'a'.charCodeAt(0) + 1);
    }

    // Common Ctrl combinations with special handling
    switch (keyName || input.toLowerCase()) {
      case 'c':
        return '\x03'; // ETX (End of Text) - SIGINT
      case 'd':
        return '\x04'; // EOT (End of Transmission) - EOF
      case 'z':
        return '\x1a'; // SUB (Substitute) - SIGTSTP
      case 'h':
        return '\x08'; // BS (Backspace)
      case 'i':
        return '\x09'; // HT (Horizontal Tab)
      case 'j':
      case 'm':
        return '\x0d'; // CR (Carriage Return)
      case 'l':
        return '\x0c'; // FF (Form Feed) - Clear screen
      case 'u':
        return '\x15'; // NAK - Kill line
      case 'w':
        return '\x17'; // ETB - Kill word
      case '[':
        return '\x1b'; // ESC (Escape)
      case '\\':
        return '\x1c'; // FS (File Separator)
      case ']':
        return '\x1d'; // GS (Group Separator)
      case '^':
      case '6':
        return '\x1e'; // RS (Record Separator)
      case '_':
      case '/':
      case '7':
        return '\x1f'; // US (Unit Separator)
      case '?':
        return '\x7f'; // DEL (Delete)
      default:
        break;
    }

    // Handle Ctrl + Arrow keys
    if (key.upArrow) return '\x1b[1;5A';
    if (key.downArrow) return '\x1b[1;5B';
    if (key.rightArrow) return '\x1b[1;5C';
    if (key.leftArrow) return '\x1b[1;5D';
  }

  // Handle Alt/Meta key combinations
  if (key.meta) {
    const keyName = 'name' in key ? key.name : undefined;

    // Alt + Arrow keys
    if (key.upArrow) return '\x1b[1;3A';
    if (key.downArrow) return '\x1b[1;3B';
    if (key.rightArrow) return '\x1b[1;3C';
    if (key.leftArrow) return '\x1b[1;3D';

    // Alt + letter/character - prefix with ESC
    if (input) {
      return '\x1b' + input;
    }

    // Alt + special keys
    if (keyName) {
      return '\x1b' + keyName;
    }
  }

  // Handle Shift + Arrow keys (for text selection)
  if (key.shift) {
    if (key.upArrow) return '\x1b[1;2A';
    if (key.downArrow) return '\x1b[1;2B';
    if (key.rightArrow) return '\x1b[1;2C';
    if (key.leftArrow) return '\x1b[1;2D';
    if (key.tab) return '\x1b[Z'; // Shift+Tab (reverse tab)
  }

  // Arrow keys (without modifiers)
  if (key.upArrow) return '\x1b[A';
  if (key.downArrow) return '\x1b[B';
  if (key.rightArrow) return '\x1b[C';
  if (key.leftArrow) return '\x1b[D';

  // Special keys
  if (key.escape) return '\x1b';
  if (key.tab) return '\t';
  if (key.return) return '\r';
  if (key.backspace) return '\x7f'; // DEL character (most terminals)
  if (key.delete) return '\x1b[3~';

  // Navigation keys
  if (key.pageUp) return '\x1b[5~';
  if (key.pageDown) return '\x1b[6~';

  // Get key name from ParsedKey if available
  const keyName = 'name' in key ? key.name : undefined;

  // Handle additional keys by name
  if (keyName) {
    switch (keyName) {
      case 'home':
        return '\x1b[H';
      case 'end':
        return '\x1b[F';
      case 'insert':
        return '\x1b[2~';

      // Function keys F1-F12
      case 'f1':
        return '\x1bOP';
      case 'f2':
        return '\x1bOQ';
      case 'f3':
        return '\x1bOR';
      case 'f4':
        return '\x1bOS';
      case 'f5':
        return '\x1b[15~';
      case 'f6':
        return '\x1b[17~';
      case 'f7':
        return '\x1b[18~';
      case 'f8':
        return '\x1b[19~';
      case 'f9':
        return '\x1b[20~';
      case 'f10':
        return '\x1b[21~';
      case 'f11':
        return '\x1b[23~';
      case 'f12':
        return '\x1b[24~';

      // Function keys F13-F24 (extended)
      case 'f13':
        return '\x1b[25~';
      case 'f14':
        return '\x1b[26~';
      case 'f15':
        return '\x1b[28~';
      case 'f16':
        return '\x1b[29~';
      case 'f17':
        return '\x1b[31~';
      case 'f18':
        return '\x1b[32~';
      case 'f19':
        return '\x1b[33~';
      case 'f20':
        return '\x1b[34~';

      // Keypad keys
      case 'kp0':
        return '\x1bOp';
      case 'kp1':
        return '\x1bOq';
      case 'kp2':
        return '\x1bOr';
      case 'kp3':
        return '\x1bOs';
      case 'kp4':
        return '\x1bOt';
      case 'kp5':
        return '\x1bOu';
      case 'kp6':
        return '\x1bOv';
      case 'kp7':
        return '\x1bOw';
      case 'kp8':
        return '\x1bOx';
      case 'kp9':
        return '\x1bOy';

      default:
        break;
    }
  }

  // Check if we have a raw sequence from ParsedKey
  if ('sequence' in key && key.sequence) {
    // If it's not a modifier-only key, return the sequence
    if (!key.ctrl && !key.meta && !key.shift) {
      return key.sequence;
    }
  }

  // Regular character input
  if (input && !key.ctrl && !key.meta) {
    return input;
  }

  // Keys that shouldn't be sent to PTY (return null)
  // These are typically handled by the TUI itself
  return null;
}

/**
 * Helper function to determine if a key press should be handled by the TUI
 * rather than sent to the PTY
 *
 * @param input - The raw input string
 * @param key - The Ink Key object
 * @returns true if the key should be handled by TUI, false if it should go to PTY
 */
export function shouldHandleInTUI(input: string, key: Key | ParsedKey): boolean {
  // TUI should handle Ctrl+C for graceful exit
  if (key.ctrl && (input === 'c' || ('name' in key && key.name === 'c'))) {
    return true;
  }

  // Let TUI handle command shortcuts if needed
  // (Add any other TUI-specific key combinations here)

  return false;
}

/**
 * Type guard to check if a key is a ParsedKey
 */
export function isParsedKey(key: Key | ParsedKey): key is ParsedKey {
  return 'name' in key || 'sequence' in key;
}
