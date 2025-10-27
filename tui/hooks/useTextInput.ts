import { useMemo } from 'react'
import { type Key } from 'ink'
import { Cursor } from '../utils/Cursor.js'

type MaybeCursor = void | Cursor
type InputHandler = (input: string) => MaybeCursor
type InputMapper = (input: string) => MaybeCursor

function mapInput(input_map: Array<[string, InputHandler]>): InputMapper {
  return function (input: string): MaybeCursor {
    const handler = new Map(input_map).get(input) ?? (() => {})
    return handler(input)
  }
}

type UseTextInputProps = {
  value: string
  onChange: (value: string) => void
  onSubmit?: (value: string) => void
  mask?: string
  cursorChar: string
  invert: (text: string) => string
  columns: number
  externalOffset: number
  onOffsetChange: (offset: number) => void
}

type UseTextInputResult = {
  renderedValue: string
  onInput: (input: string, key: Key) => void
  offset: number
  setOffset: (offset: number) => void
}

export function useTextInput({
  value: originalValue,
  onChange,
  onSubmit,
  mask = '',
  cursorChar,
  invert,
  columns,
  externalOffset,
  onOffsetChange,
}: UseTextInputProps): UseTextInputResult {
  const offset = externalOffset
  const setOffset = onOffsetChange

  // Memoize cursor creation - this is expensive due to text wrapping calculations
  const cursor = useMemo(
    () => Cursor.fromText(originalValue, columns, offset),
    [originalValue, columns, offset]
  )

  function clear() {
    return Cursor.fromText('', columns, 0)
  }

  function handleCtrlC(): MaybeCursor {
    if (cursor.text === '') {
      return cursor
    }
    return clear()
  }

  function handleCtrlD(): MaybeCursor {
    if (cursor.text === '') {
      return cursor
    }
    // Delete forward like iPython
    return cursor.del()
  }

  const handleCtrl = mapInput([
    ['a', () => cursor.startOfLine()],
    ['b', () => cursor.left()],
    ['c', handleCtrlC],
    ['d', handleCtrlD],
    ['e', () => cursor.endOfLine()],
    ['f', () => cursor.right()],
    ['h', () => cursor.backspace()],
    ['k', () => cursor.deleteToLineEnd()],
    ['l', () => clear()],
    ['u', () => cursor.deleteToLineStart()],
    ['w', () => cursor.deleteWordBefore()],
  ])

  const handleMeta = mapInput([
    ['b', () => cursor.prevWord()],
    ['f', () => cursor.nextWord()],
    ['d', () => cursor.deleteWordAfter()],
  ])

  function handleEnter() {
    onSubmit?.(originalValue)
  }

  function onInput(input: string, key: Key): void {
    if (key.tab) {
      return // Skip Tab key processing - let completion system handle it
    }

    // Direct handling for backspace or delete
    if (
      key.backspace ||
      key.delete ||
      input === '\b' ||
      input === '\x7f' ||
      input === '\x08'
    ) {
      const nextCursor = cursor.backspace()
      if (!cursor.equals(nextCursor)) {
        setOffset(nextCursor.offset)
        if (cursor.text !== nextCursor.text) {
          onChange(nextCursor.text)
        }
      }
      return
    }

    const nextCursor = mapKey(key)(input)
    if (nextCursor) {
      if (!cursor.equals(nextCursor)) {
        setOffset(nextCursor.offset)
        if (cursor.text !== nextCursor.text) {
          onChange(nextCursor.text)
        }
      }
    }
  }

  function mapKey(key: Key): InputMapper {
    // Direct handling for backspace or delete
    if (key.backspace || key.delete) {
      return () => cursor.backspace()
    }

    switch (true) {
      case key.escape:
        return () => clear()
      case key.leftArrow && (key.ctrl || key.meta || ('fn' in key && key.fn)):
        return () => cursor.prevWord()
      case key.rightArrow && (key.ctrl || key.meta || ('fn' in key && key.fn)):
        return () => cursor.nextWord()
      case key.ctrl:
        return handleCtrl
      case 'home' in key && key.home:
        return () => cursor.startOfLine()
      case 'end' in key && key.end:
        return () => cursor.endOfLine()
      case key.pageDown:
        return () => cursor.endOfLine()
      case key.pageUp:
        return () => cursor.startOfLine()
      case key.meta:
        return handleMeta
      case key.return:
        return () => handleEnter()
      case key.upArrow:
        return () => cursor // Pass through - parent handles history
      case key.downArrow:
        return () => cursor // Pass through - parent handles history
      case key.leftArrow:
        return () => cursor.left()
      case key.rightArrow:
        return () => cursor.right()
    }
    return function (input: string) {
      switch (true) {
        // Home key
        case input == '\x1b[H' || input == '\x1b[1~':
          return cursor.startOfLine()
        // End key
        case input == '\x1b[F' || input == '\x1b[4~':
          return cursor.endOfLine()
        // Handle backspace character explicitly
        case input === '\b' || input === '\x7f' || input === '\x08':
          return cursor.backspace()
        default:
          return cursor.insert(input.replace(/\r/g, '\n'))
      }
    }
  }

  return {
    onInput,
    renderedValue: cursor.render(cursorChar, mask, invert),
    offset,
    setOffset,
  }
}
