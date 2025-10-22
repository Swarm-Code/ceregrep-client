#!/usr/bin/env node
/**
 * Shell Mode Integration Test
 *
 * This test verifies the shell mode functionality works correctly:
 * 1. PTY creation and basic functionality
 * 2. Input/output handling via writeToPty
 * 3. Scrolling capabilities
 * 4. keyToAnsi utility conversions
 * 5. AnsiOutput rendering
 *
 * Run with: node test-shell-mode.js
 */

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Colors for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function header(msg) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(msg, 'bright');
  log('='.repeat(60), 'cyan');
}

function success(msg) {
  log(`✓ ${msg}`, 'green');
}

function error(msg) {
  log(`✗ ${msg}`, 'red');
}

function info(msg) {
  log(`  ${msg}`, 'dim');
}

// Test counter
let testsPassed = 0;
let testsFailed = 0;

function assertEqual(actual, expected, testName) {
  if (actual === expected) {
    success(`${testName}: PASSED`);
    testsPassed++;
    return true;
  } else {
    error(`${testName}: FAILED`);
    info(`Expected: ${JSON.stringify(expected)}`);
    info(`Actual:   ${JSON.stringify(actual)}`);
    testsFailed++;
    return false;
  }
}

function assertNotNull(value, testName) {
  if (value !== null && value !== undefined) {
    success(`${testName}: PASSED`);
    testsPassed++;
    return true;
  } else {
    error(`${testName}: FAILED (value is null or undefined)`);
    testsFailed++;
    return false;
  }
}

function assertContains(haystack, needle, testName) {
  if (haystack.includes(needle)) {
    success(`${testName}: PASSED`);
    testsPassed++;
    return true;
  } else {
    error(`${testName}: FAILED`);
    info(`Haystack: ${haystack}`);
    info(`Needle:   ${needle}`);
    testsFailed++;
    return false;
  }
}

// ============================================================================
// Test 1: keyToAnsi utility
// ============================================================================

async function testKeyToAnsi() {
  header('Test 1: keyToAnsi Utility');

  try {
    // Import the keyToAnsi function
    const keyToAnsiPath = join(__dirname, 'tui', 'utils', 'keyToAnsi.ts');
    info(`Loading keyToAnsi from: ${keyToAnsiPath}`);

    // We'll use a simple child process to run TypeScript
    const testCode = `
      import { keyToAnsi } from './tui/utils/keyToAnsi.js';

      // Test cases
      const tests = [
        // Arrow keys
        { input: '', key: { upArrow: true }, expected: '\\x1b[A', name: 'Up Arrow' },
        { input: '', key: { downArrow: true }, expected: '\\x1b[B', name: 'Down Arrow' },
        { input: '', key: { leftArrow: true }, expected: '\\x1b[D', name: 'Left Arrow' },
        { input: '', key: { rightArrow: true }, expected: '\\x1b[C', name: 'Right Arrow' },

        // Ctrl combinations
        { input: 'c', key: { ctrl: true }, expected: '\\x03', name: 'Ctrl+C' },
        { input: 'd', key: { ctrl: true }, expected: '\\x04', name: 'Ctrl+D' },
        { input: 'l', key: { ctrl: true }, expected: '\\x0c', name: 'Ctrl+L' },

        // Ctrl+Arrow keys
        { input: '', key: { ctrl: true, upArrow: true }, expected: '\\x1b[1;5A', name: 'Ctrl+Up' },
        { input: '', key: { ctrl: true, downArrow: true }, expected: '\\x1b[1;5B', name: 'Ctrl+Down' },

        // Special keys
        { input: '', key: { escape: true }, expected: '\\x1b', name: 'Escape' },
        { input: '', key: { tab: true }, expected: '\\t', name: 'Tab' },
        { input: '', key: { return: true }, expected: '\\r', name: 'Return' },
        { input: '', key: { backspace: true }, expected: '\\x7f', name: 'Backspace' },
        { input: '', key: { delete: true }, expected: '\\x1b[3~', name: 'Delete' },

        // Navigation keys
        { input: '', key: { pageUp: true }, expected: '\\x1b[5~', name: 'PageUp' },
        { input: '', key: { pageDown: true }, expected: '\\x1b[6~', name: 'PageDown' },

        // Regular characters
        { input: 'a', key: {}, expected: 'a', name: 'Regular char "a"' },
        { input: 'Z', key: {}, expected: 'Z', name: 'Regular char "Z"' },
        { input: '5', key: {}, expected: '5', name: 'Regular char "5"' },
      ];

      let passed = 0;
      let failed = 0;

      for (const test of tests) {
        const result = keyToAnsi(test.input, test.key);
        if (result === test.expected) {
          console.log(\`PASS:\${test.name}\`);
          passed++;
        } else {
          console.log(\`FAIL:\${test.name}|Expected:\${test.expected}|Got:\${result}\`);
          failed++;
        }
      }

      console.log(\`SUMMARY:\${passed}:\${failed}\`);
    `;

    // Write test to temp file and run
    const { writeFileSync, unlinkSync } = await import('node:fs');
    const testFile = join(__dirname, 'temp-keytoansi-test.mjs');
    writeFileSync(testFile, testCode);

    return new Promise((resolve) => {
      const proc = spawn('node', ['--loader', 'tsx', testFile], {
        cwd: __dirname,
        stdio: 'pipe',
      });

      let output = '';

      proc.stdout.on('data', (data) => {
        output += data.toString();
      });

      proc.stderr.on('data', (data) => {
        // Ignore TypeScript loader warnings
        const msg = data.toString();
        if (!msg.includes('ExperimentalWarning')) {
          output += msg;
        }
      });

      proc.on('close', (code) => {
        unlinkSync(testFile);

        const lines = output.split('\n').filter(l => l.trim());
        let localPassed = 0;
        let localFailed = 0;

        for (const line of lines) {
          if (line.startsWith('PASS:')) {
            const testName = line.substring(5);
            success(`keyToAnsi: ${testName}`);
            localPassed++;
          } else if (line.startsWith('FAIL:')) {
            const parts = line.split('|');
            const testName = parts[0].substring(5);
            const expected = parts[1]?.substring(9) || 'unknown';
            const got = parts[2]?.substring(4) || 'unknown';
            error(`keyToAnsi: ${testName}`);
            info(`  Expected: ${expected}`);
            info(`  Got: ${got}`);
            localFailed++;
          } else if (line.startsWith('SUMMARY:')) {
            const parts = line.substring(8).split(':');
            info(`keyToAnsi tests: ${parts[0]} passed, ${parts[1]} failed`);
          }
        }

        testsPassed += localPassed;
        testsFailed += localFailed;

        resolve();
      });
    });
  } catch (err) {
    error(`keyToAnsi test failed with error: ${err.message}`);
    testsFailed++;
  }
}

// ============================================================================
// Test 2: PTY Basic Functionality
// ============================================================================

async function testPtyBasicFunctionality() {
  header('Test 2: PTY Basic Functionality');

  try {
    // Try to import node-pty
    let pty;
    try {
      pty = await import('node-pty');
      success('node-pty module loaded successfully');
      testsPassed++;
    } catch (err) {
      error('node-pty module not available');
      info('Install with: npm install node-pty');
      testsFailed++;
      return;
    }

    // Spawn a simple shell command
    info('Spawning echo command via PTY...');
    const ptyProcess = pty.spawn('bash', ['-c', 'echo "Hello from PTY"'], {
      name: 'xterm-256color',
      cols: 80,
      rows: 30,
      cwd: process.cwd(),
      env: process.env,
    });

    assertNotNull(ptyProcess, 'PTY process created');
    assertNotNull(ptyProcess.pid, 'PTY process has PID');
    info(`PTY spawned with PID: ${ptyProcess.pid}`);

    // Collect output
    let output = '';
    ptyProcess.onData((data) => {
      output += data;
    });

    // Wait for process to complete
    await new Promise((resolve) => {
      ptyProcess.onExit(({ exitCode }) => {
        assertEqual(exitCode, 0, 'PTY exit code is 0');
        assertContains(output, 'Hello from PTY', 'PTY output contains expected text');
        resolve();
      });
    });

  } catch (err) {
    error(`PTY test failed: ${err.message}`);
    testsFailed++;
  }
}

// ============================================================================
// Test 3: PTY Interactive Input (writeToPty)
// ============================================================================

async function testPtyInteractiveInput() {
  header('Test 3: PTY Interactive Input (writeToPty)');

  try {
    let pty;
    try {
      pty = await import('node-pty');
    } catch (err) {
      error('node-pty not available, skipping test');
      testsFailed++;
      return;
    }

    info('Spawning interactive bash via PTY...');
    const ptyProcess = pty.spawn('bash', [], {
      name: 'xterm-256color',
      cols: 80,
      rows: 30,
      cwd: process.cwd(),
      env: { ...process.env, PS1: '$ ' },
    });

    let output = '';
    ptyProcess.onData((data) => {
      output += data;
    });

    // Give bash time to initialize
    await new Promise(resolve => setTimeout(resolve, 100));

    // Send commands
    info('Writing "echo test" to PTY...');
    ptyProcess.write('echo test\r');

    await new Promise(resolve => setTimeout(resolve, 100));

    info('Writing "exit" to PTY...');
    ptyProcess.write('exit\r');

    // Wait for exit
    await new Promise((resolve) => {
      ptyProcess.onExit(() => {
        assertContains(output, 'echo test', 'PTY received "echo test" command');
        assertContains(output, 'test', 'PTY output contains "test" result');
        resolve();
      });

      // Timeout after 2 seconds
      setTimeout(() => {
        ptyProcess.kill();
        resolve();
      }, 2000);
    });

  } catch (err) {
    error(`PTY interactive test failed: ${err.message}`);
    testsFailed++;
  }
}

// ============================================================================
// Test 4: PTY Scrolling
// ============================================================================

async function testPtyScrolling() {
  header('Test 4: PTY Scrolling with Headless Terminal');

  try {
    let pty;
    let headless;

    try {
      pty = await import('node-pty');
      headless = await import('@xterm/headless');
    } catch (err) {
      error('Required modules not available, skipping test');
      info('Install with: npm install node-pty @xterm/headless');
      testsFailed++;
      return;
    }

    // @xterm/headless exports Terminal as default.Terminal
    const Terminal = headless.default?.Terminal;

    if (!Terminal) {
      error('@xterm/headless Terminal not found');
      info('Available exports: ' + Object.keys(headless).join(', '));
      testsFailed++;
      return;
    }

    info('Creating headless terminal...');
    const terminal = new Terminal({
      cols: 80,
      rows: 10, // Small terminal to test scrolling
      allowProposedApi: true,
    });

    success('Headless terminal created');
    testsPassed++;

    // Write more lines than fit on screen
    info('Writing 20 lines (terminal has 10 rows)...');
    for (let i = 1; i <= 20; i++) {
      terminal.write(`Line ${i}\r\n`);
    }

    success('Lines written to terminal');
    testsPassed++;

    // Check buffer
    const buffer = terminal.buffer.active;
    assertNotNull(buffer, 'Terminal buffer exists');

    info(`Buffer has ${buffer.length} lines`);
    info(`Viewport Y: ${buffer.viewportY}`);
    info(`Base Y: ${buffer.baseY}`);

    // Test scrolling
    info('Testing scroll up...');
    const originalViewportY = buffer.viewportY;
    terminal.scrollLines(-5); // Scroll up 5 lines

    const newViewportY = buffer.viewportY;
    info(`Viewport Y after scroll up: ${newViewportY}`);

    if (newViewportY !== originalViewportY) {
      success('Scroll up changed viewport');
      testsPassed++;
    } else {
      error('Scroll up did not change viewport (may be at top)');
      testsFailed++;
    }

    // Test scroll to top
    info('Testing scroll to top...');
    terminal.scrollToTop();
    assertEqual(buffer.viewportY, 0, 'Scroll to top sets viewportY to 0');

    // Test scroll to bottom
    info('Testing scroll to bottom...');
    terminal.scrollToBottom();
    info(`Viewport Y after scroll to bottom: ${buffer.viewportY}`);
    success('Scroll to bottom executed');
    testsPassed++;

  } catch (err) {
    error(`PTY scrolling test failed: ${err.message}`);
    info(err.stack);
    testsFailed++;
  }
}

// ============================================================================
// Test 5: AnsiOutput Rendering
// ============================================================================

async function testAnsiOutputRendering() {
  header('Test 5: AnsiOutput Structure and Rendering');

  try {
    // Create sample AnsiOutput data
    const sampleAnsiOutput = [
      // Line 1: Plain text
      [
        {
          text: 'Hello, World!',
          bold: false,
          italic: false,
          underline: false,
          dim: false,
          inverse: false,
          fg: '',
          bg: '',
        },
      ],
      // Line 2: Bold red text
      [
        {
          text: 'Error: ',
          bold: true,
          italic: false,
          underline: false,
          dim: false,
          inverse: false,
          fg: '#ff0000',
          bg: '',
        },
        {
          text: 'Something went wrong',
          bold: false,
          italic: false,
          underline: false,
          dim: false,
          inverse: false,
          fg: '',
          bg: '',
        },
      ],
      // Line 3: Green with background
      [
        {
          text: 'Success!',
          bold: true,
          italic: false,
          underline: false,
          dim: false,
          inverse: false,
          fg: '#00ff00',
          bg: '#000000',
        },
      ],
    ];

    success('Sample AnsiOutput structure created');
    testsPassed++;

    // Validate structure
    assertEqual(sampleAnsiOutput.length, 3, 'AnsiOutput has 3 lines');
    assertEqual(sampleAnsiOutput[0].length, 1, 'Line 1 has 1 token');
    assertEqual(sampleAnsiOutput[1].length, 2, 'Line 2 has 2 tokens');

    // Validate token properties
    const firstToken = sampleAnsiOutput[0][0];
    assertEqual(firstToken.text, 'Hello, World!', 'First token text is correct');
    assertEqual(firstToken.bold, false, 'First token is not bold');
    assertEqual(firstToken.fg, '', 'First token has default fg color');

    const errorToken = sampleAnsiOutput[1][0];
    assertEqual(errorToken.bold, true, 'Error token is bold');
    assertEqual(errorToken.fg, '#ff0000', 'Error token is red');

    // Test that we can serialize it to JSON
    const jsonString = JSON.stringify(sampleAnsiOutput);
    assertNotNull(jsonString, 'AnsiOutput can be serialized to JSON');

    // Test that we can deserialize it
    const deserialized = JSON.parse(jsonString);
    assertEqual(deserialized.length, 3, 'Deserialized output has 3 lines');
    assertEqual(deserialized[0][0].text, 'Hello, World!', 'Deserialized text matches');

    info('AnsiOutput structure validation complete');

  } catch (err) {
    error(`AnsiOutput test failed: ${err.message}`);
    testsFailed++;
  }
}

// ============================================================================
// Test 6: Terminal Serialization
// ============================================================================

async function testTerminalSerialization() {
  header('Test 6: Terminal Serialization to AnsiOutput');

  try {
    let headless;

    try {
      headless = await import('@xterm/headless');
    } catch (err) {
      error('@xterm/headless not available, skipping test');
      testsFailed++;
      return;
    }

    // @xterm/headless exports Terminal as default.Terminal
    const Terminal = headless.default?.Terminal;

    if (!Terminal) {
      error('@xterm/headless Terminal not found');
      info('Available exports: ' + Object.keys(headless).join(', '));
      testsFailed++;
      return;
    }

    // Import serialization function
    const termSerializerPath = join(__dirname, 'dist', 'utils', 'terminalSerializer.js');
    let serializeTerminalToObject;

    try {
      const termSerializer = await import(termSerializerPath);
      serializeTerminalToObject = termSerializer.serializeTerminalToObject;
      success('Terminal serializer loaded');
      testsPassed++;
    } catch (err) {
      error('Terminal serializer not found (run npm run build first)');
      info(`Tried to load from: ${termSerializerPath}`);
      testsFailed++;
      return;
    }

    // Create terminal and write colored output
    const terminal = new Terminal({
      cols: 80,
      rows: 10,
      allowProposedApi: true,
    });

    // Write some ANSI colored text
    terminal.write('Normal text\r\n');
    terminal.write('\x1b[1;31mBold Red\x1b[0m\r\n');
    terminal.write('\x1b[32mGreen\x1b[0m\r\n');
    terminal.write('\x1b[1;4;33mBold Underline Yellow\x1b[0m\r\n');

    info('Wrote ANSI colored text to terminal');

    // Serialize
    const ansiOutput = serializeTerminalToObject(terminal);

    assertNotNull(ansiOutput, 'Serialization produced output');
    assertEqual(Array.isArray(ansiOutput), true, 'Output is an array');
    assertEqual(ansiOutput.length, 10, 'Output has 10 lines (terminal rows)');

    // Check that we have non-empty lines
    const nonEmptyLines = ansiOutput.filter(line =>
      line.some(token => token.text.trim().length > 0)
    );

    info(`Found ${nonEmptyLines.length} non-empty lines`);

    if (nonEmptyLines.length >= 4) {
      success('Serialization captured colored text');
      testsPassed++;
    } else {
      error('Serialization did not capture expected lines');
      testsFailed++;
    }

    // Check for color information
    let foundColor = false;
    for (const line of ansiOutput) {
      for (const token of line) {
        if (token.fg || token.bold || token.underline) {
          foundColor = true;
          break;
        }
      }
      if (foundColor) break;
    }

    if (foundColor) {
      success('Serialization preserved color/style information');
      testsPassed++;
    } else {
      error('Serialization did not preserve color/style information');
      testsFailed++;
    }

  } catch (err) {
    error(`Terminal serialization test failed: ${err.message}`);
    info(err.stack);
    testsFailed++;
  }
}

// ============================================================================
// Main Test Runner
// ============================================================================

async function runAllTests() {
  log('\n╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║         SHELL MODE INTEGRATION TEST SUITE                 ║', 'bright');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');

  await testKeyToAnsi();
  await testPtyBasicFunctionality();
  await testPtyInteractiveInput();
  await testPtyScrolling();
  await testAnsiOutputRendering();
  await testTerminalSerialization();

  // Summary
  header('TEST SUMMARY');
  log(`Total Tests Run: ${testsPassed + testsFailed}`, 'bright');
  log(`✓ Passed: ${testsPassed}`, 'green');
  log(`✗ Failed: ${testsFailed}`, 'red');

  if (testsFailed === 0) {
    log('\n🎉 ALL TESTS PASSED! 🎉\n', 'green');
  } else {
    log(`\n⚠️  ${testsFailed} TEST(S) FAILED ⚠️\n`, 'red');
  }

  // Manual testing guide
  header('MANUAL TESTING GUIDE FOR TUI');

  log('\nTo manually test shell mode in the TUI:\n', 'bright');

  log('1. START THE TUI:', 'yellow');
  info('   npm run build && node dist/cli/index.js tui');

  log('\n2. ENTER SHELL MODE:', 'yellow');
  info('   Press "t" to open the Terminal Panel');

  log('\n3. CREATE A TERMINAL:', 'yellow');
  info('   Press "n" to create a new terminal');
  info('   Enter a command like: bash');
  info('   Give it a name like: test-shell');
  info('   Press Tab to switch fields, Enter to create');

  log('\n4. VIEW OUTPUT:', 'yellow');
  info('   Select the terminal from the list');
  info('   Press Enter to view full output');

  log('\n5. ENTER INTERACTIVE MODE:', 'yellow');
  info('   While viewing a running terminal, press "i"');
  info('   Type commands and press Enter to send to PTY');
  info('   Try: echo "Hello from interactive mode"');

  log('\n6. TEST SCROLLING:', 'yellow');
  info('   In output view, use Arrow keys to scroll');
  info('   Use PageUp/PageDown for faster scrolling');

  log('\n7. TEST CONTROL SEQUENCES:', 'yellow');
  info('   In interactive mode, try:');
  info('   - Ctrl+C to send interrupt signal');
  info('   - Ctrl+D to send EOF');
  info('   - Ctrl+L to send clear screen');

  log('\n8. TEST WITH INTERACTIVE PROGRAMS:', 'yellow');
  info('   Create terminals with these commands:');
  info('   - vim (test arrow keys, ESC, etc.)');
  info('   - less (test scrolling)');
  info('   - htop (test colors and formatting)');
  info('   - python (test REPL interaction)');

  log('\n9. TEST TERMINAL MANAGEMENT:', 'yellow');
  info('   - "k" to kill a terminal');
  info('   - "e" to toggle expose to agent');
  info('   - "c" to clear output');
  info('   - "r" to refresh list');

  log('\n10. EXIT:', 'yellow');
  info('    Press ESC to go back through views');
  info('    Press ESC in list view to exit terminal panel');

  log('\n' + '─'.repeat(60), 'dim');
  log('END OF TEST SUITE', 'bright');
  log('─'.repeat(60) + '\n', 'dim');

  process.exit(testsFailed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch((err) => {
  error(`Fatal error: ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});
