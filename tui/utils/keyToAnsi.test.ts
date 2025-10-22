/**
 * Tests for keyToAnsi utility
 * Ensures proper conversion of Ink key events to ANSI escape sequences
 */

import { describe, it, expect } from '@jest/globals';
import { keyToAnsi, Key, ParsedKey, shouldHandleInTUI, isParsedKey } from './keyToAnsi.js';

describe('keyToAnsi', () => {
  // Helper to create a basic Key object with all boolean fields
  const createKey = (overrides: Partial<Key> = {}): Key => ({
    upArrow: false,
    downArrow: false,
    leftArrow: false,
    rightArrow: false,
    pageDown: false,
    pageUp: false,
    return: false,
    escape: false,
    ctrl: false,
    shift: false,
    tab: false,
    backspace: false,
    delete: false,
    meta: false,
    ...overrides,
  });

  // Helper to create a ParsedKey object
  const createParsedKey = (
    overrides: Partial<ParsedKey> = {}
  ): ParsedKey => ({
    ...createKey(),
    name: undefined,
    sequence: undefined,
    raw: undefined,
    code: undefined,
    option: false,
    ...overrides,
  });

  describe('Arrow Keys', () => {
    it('should convert up arrow to ANSI sequence', () => {
      expect(keyToAnsi('', createKey({ upArrow: true }))).toBe('\x1b[A');
    });

    it('should convert down arrow to ANSI sequence', () => {
      expect(keyToAnsi('', createKey({ downArrow: true }))).toBe('\x1b[B');
    });

    it('should convert right arrow to ANSI sequence', () => {
      expect(keyToAnsi('', createKey({ rightArrow: true }))).toBe('\x1b[C');
    });

    it('should convert left arrow to ANSI sequence', () => {
      expect(keyToAnsi('', createKey({ leftArrow: true }))).toBe('\x1b[D');
    });
  });

  describe('Control + Arrow Keys', () => {
    it('should convert Ctrl+Up to ANSI sequence', () => {
      expect(keyToAnsi('', createKey({ ctrl: true, upArrow: true }))).toBe('\x1b[1;5A');
    });

    it('should convert Ctrl+Down to ANSI sequence', () => {
      expect(keyToAnsi('', createKey({ ctrl: true, downArrow: true }))).toBe('\x1b[1;5B');
    });

    it('should convert Ctrl+Right to ANSI sequence', () => {
      expect(keyToAnsi('', createKey({ ctrl: true, rightArrow: true }))).toBe('\x1b[1;5C');
    });

    it('should convert Ctrl+Left to ANSI sequence', () => {
      expect(keyToAnsi('', createKey({ ctrl: true, leftArrow: true }))).toBe('\x1b[1;5D');
    });
  });

  describe('Alt/Meta + Arrow Keys', () => {
    it('should convert Alt+Up to ANSI sequence', () => {
      expect(keyToAnsi('', createKey({ meta: true, upArrow: true }))).toBe('\x1b[1;3A');
    });

    it('should convert Alt+Down to ANSI sequence', () => {
      expect(keyToAnsi('', createKey({ meta: true, downArrow: true }))).toBe('\x1b[1;3B');
    });

    it('should convert Alt+Right to ANSI sequence', () => {
      expect(keyToAnsi('', createKey({ meta: true, rightArrow: true }))).toBe('\x1b[1;3C');
    });

    it('should convert Alt+Left to ANSI sequence', () => {
      expect(keyToAnsi('', createKey({ meta: true, leftArrow: true }))).toBe('\x1b[1;3D');
    });
  });

  describe('Shift + Arrow Keys', () => {
    it('should convert Shift+Up to ANSI sequence', () => {
      expect(keyToAnsi('', createKey({ shift: true, upArrow: true }))).toBe('\x1b[1;2A');
    });

    it('should convert Shift+Down to ANSI sequence', () => {
      expect(keyToAnsi('', createKey({ shift: true, downArrow: true }))).toBe('\x1b[1;2B');
    });

    it('should convert Shift+Right to ANSI sequence', () => {
      expect(keyToAnsi('', createKey({ shift: true, rightArrow: true }))).toBe('\x1b[1;2C');
    });

    it('should convert Shift+Left to ANSI sequence', () => {
      expect(keyToAnsi('', createKey({ shift: true, leftArrow: true }))).toBe('\x1b[1;2D');
    });
  });

  describe('Control Key Combinations', () => {
    it('should convert Ctrl+C to interrupt signal', () => {
      expect(keyToAnsi('c', createKey({ ctrl: true }))).toBe('\x03');
    });

    it('should convert Ctrl+D to EOF signal', () => {
      expect(keyToAnsi('d', createKey({ ctrl: true }))).toBe('\x04');
    });

    it('should convert Ctrl+Z to suspend signal', () => {
      expect(keyToAnsi('z', createKey({ ctrl: true }))).toBe('\x1a');
    });

    it('should convert Ctrl+L to clear screen', () => {
      expect(keyToAnsi('l', createKey({ ctrl: true }))).toBe('\x0c');
    });

    it('should convert Ctrl+U to kill line', () => {
      expect(keyToAnsi('u', createKey({ ctrl: true }))).toBe('\x15');
    });

    it('should convert Ctrl+W to kill word', () => {
      expect(keyToAnsi('w', createKey({ ctrl: true }))).toBe('\x17');
    });

    it('should convert Ctrl+A to control character', () => {
      expect(keyToAnsi('a', createKey({ ctrl: true }))).toBe('\x01');
    });

    it('should convert Ctrl+E to control character', () => {
      expect(keyToAnsi('e', createKey({ ctrl: true }))).toBe('\x05');
    });
  });

  describe('Special Keys', () => {
    it('should convert Tab to tab character', () => {
      expect(keyToAnsi('', createKey({ tab: true }))).toBe('\t');
    });

    it('should convert Shift+Tab to reverse tab', () => {
      expect(keyToAnsi('', createKey({ shift: true, tab: true }))).toBe('\x1b[Z');
    });

    it('should convert Enter to carriage return', () => {
      expect(keyToAnsi('', createKey({ return: true }))).toBe('\r');
    });

    it('should convert Escape to ESC character', () => {
      expect(keyToAnsi('', createKey({ escape: true }))).toBe('\x1b');
    });

    it('should convert Backspace to DEL character', () => {
      expect(keyToAnsi('', createKey({ backspace: true }))).toBe('\x7f');
    });

    it('should convert Delete to ANSI sequence', () => {
      expect(keyToAnsi('', createKey({ delete: true }))).toBe('\x1b[3~');
    });
  });

  describe('Navigation Keys', () => {
    it('should convert PageUp to ANSI sequence', () => {
      expect(keyToAnsi('', createKey({ pageUp: true }))).toBe('\x1b[5~');
    });

    it('should convert PageDown to ANSI sequence', () => {
      expect(keyToAnsi('', createKey({ pageDown: true }))).toBe('\x1b[6~');
    });

    it('should convert Home to ANSI sequence', () => {
      expect(keyToAnsi('', createParsedKey({ name: 'home' }))).toBe('\x1b[H');
    });

    it('should convert End to ANSI sequence', () => {
      expect(keyToAnsi('', createParsedKey({ name: 'end' }))).toBe('\x1b[F');
    });

    it('should convert Insert to ANSI sequence', () => {
      expect(keyToAnsi('', createParsedKey({ name: 'insert' }))).toBe('\x1b[2~');
    });
  });

  describe('Function Keys', () => {
    it('should convert F1 to ANSI sequence', () => {
      expect(keyToAnsi('', createParsedKey({ name: 'f1' }))).toBe('\x1bOP');
    });

    it('should convert F2 to ANSI sequence', () => {
      expect(keyToAnsi('', createParsedKey({ name: 'f2' }))).toBe('\x1bOQ');
    });

    it('should convert F3 to ANSI sequence', () => {
      expect(keyToAnsi('', createParsedKey({ name: 'f3' }))).toBe('\x1bOR');
    });

    it('should convert F4 to ANSI sequence', () => {
      expect(keyToAnsi('', createParsedKey({ name: 'f4' }))).toBe('\x1bOS');
    });

    it('should convert F5 to ANSI sequence', () => {
      expect(keyToAnsi('', createParsedKey({ name: 'f5' }))).toBe('\x1b[15~');
    });

    it('should convert F12 to ANSI sequence', () => {
      expect(keyToAnsi('', createParsedKey({ name: 'f12' }))).toBe('\x1b[24~');
    });
  });

  describe('Alt/Meta Key Combinations', () => {
    it('should convert Alt+A to ESC+character', () => {
      expect(keyToAnsi('a', createKey({ meta: true }))).toBe('\x1ba');
    });

    it('should convert Alt+Z to ESC+character', () => {
      expect(keyToAnsi('z', createKey({ meta: true }))).toBe('\x1bz');
    });

    it('should convert Alt+1 to ESC+character', () => {
      expect(keyToAnsi('1', createKey({ meta: true }))).toBe('\x1b1');
    });
  });

  describe('Regular Characters', () => {
    it('should return regular character as-is', () => {
      expect(keyToAnsi('a', createKey())).toBe('a');
    });

    it('should return space character as-is', () => {
      expect(keyToAnsi(' ', createKey())).toBe(' ');
    });

    it('should return number as-is', () => {
      expect(keyToAnsi('5', createKey())).toBe('5');
    });

    it('should return punctuation as-is', () => {
      expect(keyToAnsi('!', createKey())).toBe('!');
    });
  });

  describe('ParsedKey with sequence', () => {
    it('should return sequence when available', () => {
      expect(keyToAnsi('', createParsedKey({ sequence: 'test' }))).toBe('test');
    });

    it('should prefer special key handling over sequence for Ctrl', () => {
      const result = keyToAnsi('c', createParsedKey({ ctrl: true, sequence: 'c' }));
      expect(result).toBe('\x03');
    });
  });

  describe('Edge Cases', () => {
    it('should return null for unknown modifier-only combinations', () => {
      expect(keyToAnsi('', createKey({ ctrl: true }))).toBeNull();
    });

    it('should handle empty input with no modifiers', () => {
      expect(keyToAnsi('', createKey())).toBeNull();
    });
  });
});

describe('shouldHandleInTUI', () => {
  const createKey = (overrides: Partial<Key> = {}): Key => ({
    upArrow: false,
    downArrow: false,
    leftArrow: false,
    rightArrow: false,
    pageDown: false,
    pageUp: false,
    return: false,
    escape: false,
    ctrl: false,
    shift: false,
    tab: false,
    backspace: false,
    delete: false,
    meta: false,
    ...overrides,
  });

  it('should return true for Ctrl+C', () => {
    expect(shouldHandleInTUI('c', createKey({ ctrl: true }))).toBe(true);
  });

  it('should return false for regular characters', () => {
    expect(shouldHandleInTUI('a', createKey())).toBe(false);
  });

  it('should return false for arrow keys', () => {
    expect(shouldHandleInTUI('', createKey({ upArrow: true }))).toBe(false);
  });
});

describe('isParsedKey', () => {
  it('should return true for ParsedKey with name', () => {
    const key: ParsedKey = {
      upArrow: false,
      downArrow: false,
      leftArrow: false,
      rightArrow: false,
      pageDown: false,
      pageUp: false,
      return: false,
      escape: false,
      ctrl: false,
      shift: false,
      tab: false,
      backspace: false,
      delete: false,
      meta: false,
      name: 'test',
    };
    expect(isParsedKey(key)).toBe(true);
  });

  it('should return true for ParsedKey with sequence', () => {
    const key: ParsedKey = {
      upArrow: false,
      downArrow: false,
      leftArrow: false,
      rightArrow: false,
      pageDown: false,
      pageUp: false,
      return: false,
      escape: false,
      ctrl: false,
      shift: false,
      tab: false,
      backspace: false,
      delete: false,
      meta: false,
      sequence: 'test',
    };
    expect(isParsedKey(key)).toBe(true);
  });

  it('should return false for basic Key', () => {
    const key: Key = {
      upArrow: false,
      downArrow: false,
      leftArrow: false,
      rightArrow: false,
      pageDown: false,
      pageUp: false,
      return: false,
      escape: false,
      ctrl: false,
      shift: false,
      tab: false,
      backspace: false,
      delete: false,
      meta: false,
    };
    expect(isParsedKey(key)).toBe(false);
  });
});
