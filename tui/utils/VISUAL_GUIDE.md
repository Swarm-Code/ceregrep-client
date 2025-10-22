# Visual Guide to keyToAnsi

A visual reference showing how different key presses are converted to ANSI escape sequences.

## Key Press Flow

```
┌─────────────┐
│  User Input │
│   (Ink Key) │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  keyToAnsi  │
│  Function   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│    ANSI     │
│  Sequence   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  PTY/Term   │
└─────────────┘
```

## Arrow Keys

### Basic Arrow Keys

```
┌────────┐
│   ↑    │  → \x1b[A  (ESC [ A)
└────────┘

┌────────┐
│   ↓    │  → \x1b[B  (ESC [ B)
└────────┘

┌────────┐
│   ←    │  → \x1b[D  (ESC [ D)
└────────┘

┌────────┐
│   →    │  → \x1b[C  (ESC [ C)
└────────┘
```

### With Modifiers

```
┌─────────────┐
│  Ctrl + ↑   │  → \x1b[1;5A  (ESC [ 1 ; 5 A)
└─────────────┘

┌─────────────┐
│  Alt + ↑    │  → \x1b[1;3A  (ESC [ 1 ; 3 A)
└─────────────┘

┌─────────────┐
│  Shift + ↑  │  → \x1b[1;2A  (ESC [ 1 ; 2 A)
└─────────────┘
```

## Control Keys

### Common Control Sequences

```
┌─────────────┐
│  Ctrl + C   │  → \x03  (ETX - End of Text)
└─────────────┘    Sends SIGINT to process

┌─────────────┐
│  Ctrl + D   │  → \x04  (EOT - End of Transmission)
└─────────────┘    Signals EOF

┌─────────────┐
│  Ctrl + Z   │  → \x1a  (SUB - Substitute)
└─────────────┘    Sends SIGTSTP (suspend)

┌─────────────┐
│  Ctrl + L   │  → \x0c  (FF - Form Feed)
└─────────────┘    Clears screen
```

### Line Editing

```
┌─────────────┐
│  Ctrl + U   │  → \x15  (NAK - Negative Acknowledge)
└─────────────┘    Kill line (delete from cursor to start)

┌─────────────┐
│  Ctrl + W   │  → \x17  (ETB - End of Trans. Block)
└─────────────┘    Kill word (delete previous word)

┌─────────────┐
│  Ctrl + A   │  → \x01  (SOH - Start of Heading)
└─────────────┘    Move to start of line

┌─────────────┐
│  Ctrl + E   │  → \x05  (ENQ - Enquiry)
└─────────────┘    Move to end of line
```

## Special Keys

### Tab and Enter

```
┌─────────────┐
│     Tab     │  → \x09  (HT - Horizontal Tab)
└─────────────┘    Moves to next tab stop

┌─────────────┐
│  Shift+Tab  │  → \x1b[Z  (ESC [ Z)
└─────────────┘    Reverse tab

┌─────────────┐
│    Enter    │  → \x0d  (CR - Carriage Return)
└─────────────┘    Moves to start of next line
```

### Delete Keys

```
┌─────────────┐
│  Backspace  │  → \x7f  (DEL - Delete)
└─────────────┘    Delete character before cursor

┌─────────────┐
│   Delete    │  → \x1b[3~  (ESC [ 3 ~)
└─────────────┘    Delete character after cursor
```

## Navigation Keys

```
┌─────────────┐
│    Home     │  → \x1b[H  (ESC [ H)
└─────────────┘    Move to start of line

┌─────────────┐
│     End     │  → \x1b[F  (ESC [ F)
└─────────────┘    Move to end of line

┌─────────────┐
│   Page Up   │  → \x1b[5~  (ESC [ 5 ~)
└─────────────┘    Scroll up one page

┌─────────────┐
│  Page Down  │  → \x1b[6~  (ESC [ 6 ~)
└─────────────┘    Scroll down one page

┌─────────────┐
│   Insert    │  → \x1b[2~  (ESC [ 2 ~)
└─────────────┘    Toggle insert/overwrite mode
```

## Function Keys

### F1 - F4 (Short Format)

```
┌─────────────┐
│     F1      │  → \x1bOP  (ESC O P)
└─────────────┘

┌─────────────┐
│     F2      │  → \x1bOQ  (ESC O Q)
└─────────────┘

┌─────────────┐
│     F3      │  → \x1bOR  (ESC O R)
└─────────────┘

┌─────────────┐
│     F4      │  → \x1bOS  (ESC O S)
└─────────────┘
```

### F5 - F12 (Long Format)

```
┌─────────────┐
│     F5      │  → \x1b[15~  (ESC [ 1 5 ~)
└─────────────┘

┌─────────────┐
│     F6      │  → \x1b[17~  (ESC [ 1 7 ~)
└─────────────┘

┌─────────────┐
│     F11     │  → \x1b[23~  (ESC [ 2 3 ~)
└─────────────┘

┌─────────────┐
│     F12     │  → \x1b[24~  (ESC [ 2 4 ~)
└─────────────┘
```

## Alt/Meta Combinations

```
┌─────────────┐
│   Alt + A   │  → \x1ba  (ESC a)
└─────────────┘    ESC prefix + character

┌─────────────┐
│   Alt + 1   │  → \x1b1  (ESC 1)
└─────────────┘    ESC prefix + number
```

## Control Character Map

Complete mapping for Ctrl+A through Ctrl+Z:

```
Key      | Hex    | Dec | Abbr | Name
---------|--------|-----|------|--------------------
Ctrl+@   | \x00   |   0 | NUL  | Null
Ctrl+A   | \x01   |   1 | SOH  | Start of Heading
Ctrl+B   | \x02   |   2 | STX  | Start of Text
Ctrl+C   | \x03   |   3 | ETX  | End of Text
Ctrl+D   | \x04   |   4 | EOT  | End of Transmission
Ctrl+E   | \x05   |   5 | ENQ  | Enquiry
Ctrl+F   | \x06   |   6 | ACK  | Acknowledge
Ctrl+G   | \x07   |   7 | BEL  | Bell
Ctrl+H   | \x08   |   8 | BS   | Backspace
Ctrl+I   | \x09   |   9 | HT   | Horizontal Tab
Ctrl+J   | \x0a   |  10 | LF   | Line Feed
Ctrl+K   | \x0b   |  11 | VT   | Vertical Tab
Ctrl+L   | \x0c   |  12 | FF   | Form Feed
Ctrl+M   | \x0d   |  13 | CR   | Carriage Return
Ctrl+N   | \x0e   |  14 | SO   | Shift Out
Ctrl+O   | \x0f   |  15 | SI   | Shift In
Ctrl+P   | \x10   |  16 | DLE  | Data Link Escape
Ctrl+Q   | \x11   |  17 | DC1  | Device Control 1
Ctrl+R   | \x12   |  18 | DC2  | Device Control 2
Ctrl+S   | \x13   |  19 | DC3  | Device Control 3
Ctrl+T   | \x14   |  20 | DC4  | Device Control 4
Ctrl+U   | \x15   |  21 | NAK  | Negative Acknowledge
Ctrl+V   | \x16   |  22 | SYN  | Synchronous Idle
Ctrl+W   | \x17   |  23 | ETB  | End of Trans. Block
Ctrl+X   | \x18   |  24 | CAN  | Cancel
Ctrl+Y   | \x19   |  25 | EM   | End of Medium
Ctrl+Z   | \x1a   |  26 | SUB  | Substitute
Ctrl+[   | \x1b   |  27 | ESC  | Escape
Ctrl+\   | \x1c   |  28 | FS   | File Separator
Ctrl+]   | \x1d   |  29 | GS   | Group Separator
Ctrl+^   | \x1e   |  30 | RS   | Record Separator
Ctrl+_   | \x1f   |  31 | US   | Unit Separator
```

## Modifier Number Encoding

CSI sequences use a number to encode modifiers:

```
Modifier      | Number | Example
--------------|--------|------------------
None          |   1    | \x1b[1A
Shift         |   2    | \x1b[1;2A
Alt           |   3    | \x1b[1;3A
Alt+Shift     |   4    | \x1b[1;4A
Ctrl          |   5    | \x1b[1;5A
Ctrl+Shift    |   6    | \x1b[1;6A
Ctrl+Alt      |   7    | \x1b[1;7A
Ctrl+Alt+Sft  |   8    | \x1b[1;8A
```

## Common Terminal Operations

### Cursor Movement

```
Operation              | Keys         | ANSI Sequence
-----------------------|--------------|---------------
Move cursor up         | ↑            | \x1b[A
Move cursor down       | ↓            | \x1b[B
Move cursor right      | →            | \x1b[C
Move cursor left       | ←            | \x1b[D
Move to line start     | Ctrl+A       | \x01
Move to line end       | Ctrl+E       | \x05
Move to screen top     | Home         | \x1b[H
Move to screen bottom  | End          | \x1b[F
```

### Text Editing

```
Operation              | Keys         | ANSI Sequence
-----------------------|--------------|---------------
Delete char left       | Backspace    | \x7f
Delete char right      | Delete       | \x1b[3~
Kill line (to end)     | Ctrl+K       | \x0b
Kill line (to start)   | Ctrl+U       | \x15
Kill word              | Ctrl+W       | \x17
```

### Screen Control

```
Operation              | Keys         | ANSI Sequence
-----------------------|--------------|---------------
Clear screen           | Ctrl+L       | \x0c
Scroll up              | Page Up      | \x1b[5~
Scroll down            | Page Down    | \x1b[6~
```

### Process Control

```
Operation              | Keys         | ANSI Sequence  | Signal
-----------------------|--------------|----------------|--------
Interrupt process      | Ctrl+C       | \x03           | SIGINT
End of file            | Ctrl+D       | \x04           | (EOF)
Suspend process        | Ctrl+Z       | \x1a           | SIGTSTP
```

## Visual Hex Dump Example

When you press Ctrl+Arrow Up, here's what gets sent:

```
Hex:    1B  5B  31  3B  35  41
ASCII:  ─   [   1   ;   5   A
Desc:   ESC [   1   ;   5   A
Name:   ├─CSI──┤ ├param─┤ cmd

Breakdown:
  \x1b   = ESC  (starts CSI sequence)
  [      = CSI introducer
  1      = cursor position (default)
  ;      = parameter separator
  5      = Ctrl modifier
  A      = Up arrow command
```

## Real-World Examples

### Example 1: Moving cursor in vim

```
User presses: →
ANSI sent:    \x1b[C
Vim receives: ESC [ C
Action:       Cursor moves right one character
```

### Example 2: Interrupting a running process

```
User presses: Ctrl+C
ANSI sent:    \x03
Shell receives: ETX (End of Text)
Action:       SIGINT sent to foreground process
```

### Example 3: Autocomplete in bash

```
User presses: Tab
ANSI sent:    \x09
Bash receives: HT (Horizontal Tab)
Action:       Command completion triggered
```

### Example 4: Word navigation in shell

```
User presses: Ctrl+→
ANSI sent:    \x1b[1;5C
Shell receives: ESC [ 1 ; 5 C (Ctrl+Right Arrow)
Action:       Cursor jumps to next word
```

## Terminal Response Examples

Some keys trigger terminal responses (not handled by keyToAnsi):

```
Query                  | Terminal Response
-----------------------|-------------------
Device Status          | \x1b[5n → \x1b[0n
Cursor Position        | \x1b[6n → \x1b[row;colR
Terminal ID            | \x1b[c  → \x1b[?1;2c
```

## Color Reference (Not in keyToAnsi scope)

While not handled by keyToAnsi, for reference:

```
ANSI Color Codes:
  \x1b[30m   Black text
  \x1b[31m   Red text
  \x1b[32m   Green text
  \x1b[33m   Yellow text
  \x1b[34m   Blue text
  \x1b[35m   Magenta text
  \x1b[36m   Cyan text
  \x1b[37m   White text
  \x1b[0m    Reset all
```

## Legend

```
Symbol | Meaning
-------|------------------
\x##   | Hexadecimal byte value
ESC    | Escape character (\x1b)
CSI    | Control Sequence Introducer (ESC [)
SS3    | Single Shift 3 (ESC O)
~      | Tilde (final character in some sequences)
```

## Quick Reference Card

```
┌──────────────────────────────────────────────────┐
│          keyToAnsi Quick Reference               │
├──────────────────────────────────────────────────┤
│ ARROWS:     ↑↓←→  → \x1b[A/B/D/C                 │
│ CTRL+ARR:   ^↑    → \x1b[1;5A (etc)              │
│ ALT+ARR:    ⎇↑    → \x1b[1;3A (etc)              │
│ SHIFT+ARR:  ⇧↑    → \x1b[1;2A (etc)              │
│                                                  │
│ CTRL+C:     ^C    → \x03 (SIGINT)                │
│ CTRL+D:     ^D    → \x04 (EOF)                   │
│ CTRL+Z:     ^Z    → \x1a (SIGTSTP)               │
│                                                  │
│ TAB:        ⇥     → \x09                         │
│ SHIFT+TAB:  ⇧⇥    → \x1b[Z                       │
│ ENTER:      ⏎     → \x0d                         │
│ ESC:        ⎋     → \x1b                         │
│ BKSP:       ⌫     → \x7f                         │
│ DEL:        ⌦     → \x1b[3~                      │
│                                                  │
│ HOME/END:         → \x1b[H / \x1b[F              │
│ PGUP/PGDN:        → \x1b[5~ / \x1b[6~            │
│                                                  │
│ F1-F4:            → \x1bOP/Q/R/S                 │
│ F5-F12:           → \x1b[15~..\x1b[24~           │
└──────────────────────────────────────────────────┘
```

---

This visual guide should help you understand what ANSI sequences are being generated for each key press when using the keyToAnsi utility.
