# Shell Mode - Quick Start Guide

## What is Shell Mode?

Shell Mode is an interactive terminal passthrough feature that activates when the AI agent runs a bash command with a PTY (pseudo-terminal). When active, your keyboard input goes directly to the running terminal process, allowing you to interact with programs like `vim`, `htop`, or any other interactive command.

## How to Use

### Entering Shell Mode

1. **Automatic**: Ask the agent to run an interactive command
   ```
   You: "run htop to check system resources"
   Agent: [Executes bash tool with htop]
   TUI: Enters shell mode automatically
   ```

2. **Visual Indicators**:
   - Green banner: `[SHELL MODE] Interactive terminal (PID: 12345) | Press Escape to exit`
   - Status bar shows: `[SHELL] PID:12345`
   - Input box disappears (input goes to terminal)

### Using Shell Mode

**All your keyboard input goes directly to the terminal:**
- Arrow keys: Navigate
- Enter: Submit commands
- Ctrl+C: Interrupt process (first press) or exit shell mode (second press within 1 second)
- Ctrl+D: Send EOF
- Ctrl+L: Clear screen
- Function keys: Work as expected
- Text: Types directly into terminal

**Example Interactive Session**:
```
You: "open vim to edit config.yaml"
[Shell mode activates]
- Type: i (insert mode)
- Edit file
- Press ESC
- Type: :wq (save and quit)
[Shell mode exits automatically]
```

### Exiting Shell Mode

**Three ways to exit:**

1. **Press Escape**: Immediate exit back to chat
   ```
   [In shell mode]
   Press: ESC
   [Returns to chat mode]
   ```

2. **Double Ctrl+C**: Quick exit (press Ctrl+C twice within 1 second)
   ```
   [In shell mode]
   Press: Ctrl+C
   Wait: < 1 second
   Press: Ctrl+C again
   [Exits shell mode]
   ```

3. **Process Completes**: Automatic exit when program finishes
   ```
   You: "run ls -la"
   [Shell mode activates]
   [Command completes]
   [Shell mode exits automatically]
   ```

## Examples

### Example 1: System Monitoring
```
You: "show me system resources with htop"

[Shell mode activates with htop]
- Use arrow keys to navigate
- Press F5 for tree view
- Press F10 or 'q' to quit
[Shell mode exits]
```

### Example 2: Text Editing
```
You: "edit README.md with nano"

[Shell mode activates with nano]
- Edit the file
- Press Ctrl+X to exit
- Press Y to confirm save
- Press Enter to confirm filename
[Shell mode exits]
```

### Example 3: Log Monitoring
```
You: "tail -f the application log"

[Shell mode activates with tail -f]
- Watch live log updates
- Press Ctrl+C to stop
[First Ctrl+C stops tail]
[Second Ctrl+C exits shell mode]
```

### Example 4: Interactive Shell
```
You: "give me a bash shell"

[Shell mode activates with bash]
- Type commands: ls, cd, pwd, etc.
- Full interactive bash session
- Type 'exit' to close shell
[Shell mode exits when bash exits]
```

## Supported Features

### ✅ Fully Supported
- **Interactive programs**: vim, nano, emacs, htop, top, etc.
- **Arrow key navigation**: Full support for cursor movement
- **Control sequences**: Ctrl+C, Ctrl+D, Ctrl+Z, Ctrl+L, etc.
- **Colors and formatting**: Full ANSI color support
- **Function keys**: F1-F12 work as expected
- **Text input**: All printable characters
- **Modifiers**: Ctrl+Arrow, Alt+Arrow, Shift+Arrow

### ⚠️ Limitations
- **No mouse support**: Terminal mouse events not captured by Ink
- **No clipboard**: Ink doesn't support system clipboard
- **Fixed size**: Terminal size based on TUI window (80x30 by default)
- **Single session**: Only one active shell at a time

## Tips & Tricks

### 1. Quick Exit Pattern
If you need to exit quickly, use the double Ctrl+C:
```
Ctrl+C, Ctrl+C (within 1 second)
```

### 2. Safe Exit
For graceful exit, use Escape:
```
ESC
```

### 3. Process Cleanup
Always let interactive processes exit normally before leaving shell mode:
```
# In htop: Press 'q'
# In vim: Type ':q' or ':wq'
# In nano: Press Ctrl+X
```

### 4. Stuck in Shell Mode?
If shell mode doesn't exit automatically:
1. Try Escape key
2. Try Ctrl+C (twice if needed)
3. Let the process complete naturally

### 5. Colors Not Showing?
Make sure your terminal supports 256 colors:
```bash
echo $TERM  # Should be xterm-256color
```

## Troubleshooting

### Problem: Shell mode doesn't activate
**Solution**: The bash tool needs to spawn a PTY. Make sure the command is interactive:
```
✅ "run htop"
✅ "edit file.txt with vim"
❌ "run ls" (non-interactive, no PTY needed)
```

### Problem: Keys not working correctly
**Solution**: Some programs expect specific terminal types. The TUI uses `xterm-256color`:
```bash
# If a program doesn't work, try:
TERM=xterm program_name
```

### Problem: Can't exit shell mode
**Solution**: Try in order:
1. Exit the program normally (e.g., 'q' for htop, ':q' for vim)
2. Press Escape
3. Press Ctrl+C twice quickly

### Problem: Output not formatted correctly
**Solution**: The program might not be using ANSI codes. Try:
```bash
# Force color output
ls --color=always
git --color=always status
```

## Advanced Usage

### Running Multiple Commands
You can run multiple interactive commands in sequence:
```
You: "first run htop, then when I'm done, run vim"
[Shell mode: htop]
- Check resources
- Press 'q' to quit
[Shell mode exits]
[Agent runs vim]
[Shell mode: vim]
- Edit file
- Type ':wq'
[Shell mode exits]
```

### Combining with Agent Actions
Use shell mode for interactive parts, let agent handle the rest:
```
You: "analyze the system, show me htop, then create a report"
[Agent analyzes]
[Shell mode: htop]
- Review resources
- Press 'q'
[Shell mode exits]
[Agent creates report]
```

### Custom Environment
The shell runs with these environment variables:
- `TERM=xterm-256color` (full color support)
- `GEMINI_CLI=1` (indicates running in CLI)
- `PAGER=cat` (for less/more compatibility)

## Keyboard Reference

### Navigation
- `↑↓←→`: Arrow keys
- `Home`: Start of line
- `End`: End of line
- `PgUp/PgDn`: Page up/down

### Control
- `Ctrl+C`: Interrupt (or exit shell mode if pressed twice)
- `Ctrl+D`: EOF
- `Ctrl+Z`: Suspend (SIGTSTP)
- `Ctrl+L`: Clear screen
- `Ctrl+U`: Kill line
- `Ctrl+W`: Kill word

### Special
- `ESC`: Exit shell mode
- `Tab`: Tab completion (if supported by program)
- `Shift+Tab`: Reverse tab
- `F1-F12`: Function keys

### Modifiers
- `Ctrl+Arrow`: Word navigation (in some programs)
- `Alt+Arrow`: Alternative navigation
- `Shift+Arrow`: Selection (in some programs)

## Best Practices

1. **Let processes exit gracefully** before leaving shell mode
2. **Use Escape for clean exits** instead of killing the process
3. **Check the shell mode indicator** to know when you're in shell mode
4. **Use interactive commands** that benefit from real-time input
5. **Monitor the status bar** for PID and shell status

## FAQ

**Q: Can I run multiple shells at once?**
A: Currently, only one shell mode session at a time. Exit the first before starting another.

**Q: Does shell mode save my session?**
A: No, each shell mode session is ephemeral. When it exits, the session is gone.

**Q: Can I scroll back through output?**
A: Currently, scrollback is not implemented. You see the current terminal viewport.

**Q: What happens if the process crashes?**
A: Shell mode automatically exits when the PTY process terminates.

**Q: Can I resize the terminal?**
A: Terminal size is fixed at 80x30 (may be configurable in future versions).

**Q: Does this work on Windows?**
A: PTY support varies on Windows. WSL recommended for best experience.

## Summary

Shell Mode provides seamless interactive terminal access within the TUI:
- **Automatic activation** when bash tool uses PTY
- **Direct keyboard input** to running process
- **Full ANSI support** for colors and formatting
- **Easy exit** with Escape or Ctrl+C
- **Auto-cleanup** when process completes

Perfect for running interactive programs like editors, monitors, and shells while maintaining the conversation context with the AI agent.
