/**
 * Simplified shell execution utility
 * Based on PersistentShell from swarm-client
 */

import { spawn, type ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import { join } from 'path';

export type ExecResult = {
  stdout: string;
  stderr: string;
  code: number;
  interrupted: boolean;
};

type QueuedCommand = {
  command: string;
  abortSignal?: AbortSignal;
  timeout?: number;
  resolve: (result: ExecResult) => void;
  reject: (error: Error) => void;
};

const TEMPFILE_PREFIX = os.tmpdir() + '/ceregrep-';
const DEFAULT_TIMEOUT = 120000; // 2 minutes

/**
 * Persistent shell for executing bash commands
 */
export class PersistentShell {
  private static instance: PersistentShell | null = null;
  private commandQueue: QueuedCommand[] = [];
  private isExecuting: boolean = false;
  private shell: ChildProcess;
  private isAlive: boolean = true;
  private statusFile: string;
  private stdoutFile: string;
  private stderrFile: string;
  private cwdFile: string;
  private cwd: string;

  constructor(cwd: string) {
    const binShell = process.env.SHELL || '/bin/bash';
    this.shell = spawn(binShell, ['-l'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd,
      env: {
        ...process.env,
        GIT_EDITOR: 'true',
      },
    });

    this.cwd = cwd;

    this.shell.on('exit', (code, signal) => {
      if (code) {
        console.error(`Shell exited with code ${code} and signal ${signal}`);
      }
      for (const file of [this.statusFile, this.stdoutFile, this.stderrFile, this.cwdFile]) {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      }
      this.isAlive = false;
    });

    const id = Math.floor(Math.random() * 0x10000).toString(16).padStart(4, '0');
    this.statusFile = TEMPFILE_PREFIX + id + '-status';
    this.stdoutFile = TEMPFILE_PREFIX + id + '-stdout';
    this.stderrFile = TEMPFILE_PREFIX + id + '-stderr';
    this.cwdFile = TEMPFILE_PREFIX + id + '-cwd';

    for (const file of [this.statusFile, this.stdoutFile, this.stderrFile]) {
      fs.writeFileSync(file, '');
    }
    fs.writeFileSync(this.cwdFile, cwd);
  }

  static getInstance(): PersistentShell {
    if (!PersistentShell.instance || !PersistentShell.instance.isAlive) {
      PersistentShell.instance = new PersistentShell(process.cwd());
    }
    return PersistentShell.instance;
  }

  static restart() {
    if (PersistentShell.instance) {
      PersistentShell.instance.close();
      PersistentShell.instance = null;
    }
  }

  async exec(command: string, abortSignal?: AbortSignal, timeout = DEFAULT_TIMEOUT): Promise<ExecResult> {
    return new Promise((resolve, reject) => {
      this.commandQueue.push({ command, abortSignal, timeout, resolve, reject });
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.isExecuting || this.commandQueue.length === 0) {
      return;
    }

    this.isExecuting = true;
    const queued = this.commandQueue.shift()!;

    try {
      const result = await this.executeCommand(queued.command, queued.abortSignal, queued.timeout!);
      queued.resolve(result);
    } catch (error) {
      queued.reject(error as Error);
    } finally {
      this.isExecuting = false;
      this.processQueue();
    }
  }

  private async executeCommand(command: string, abortSignal?: AbortSignal, timeout?: number): Promise<ExecResult> {
    // Clear temp files
    fs.writeFileSync(this.statusFile, '');
    fs.writeFileSync(this.stdoutFile, '');
    fs.writeFileSync(this.stderrFile, '');

    // Execute command with output redirection
    const fullCommand = `(${command}) >${this.stdoutFile} 2>${this.stderrFile}; echo $? >${this.statusFile}; pwd >${this.cwdFile}\n`;
    this.shell.stdin?.write(fullCommand);

    // Wait for completion
    const startTime = Date.now();
    let interrupted = false;

    const abortListener = () => {
      interrupted = true;
      this.killChildren();
    };

    abortSignal?.addEventListener('abort', abortListener);

    // Poll for completion
    while (true) {
      await new Promise(resolve => setTimeout(resolve, 100));

      if (fs.existsSync(this.statusFile) && fs.readFileSync(this.statusFile, 'utf8').trim() !== '') {
        break;
      }

      if (interrupted || (timeout && Date.now() - startTime > timeout)) {
        interrupted = true;
        this.killChildren();
        break;
      }
    }

    abortSignal?.removeEventListener('abort', abortListener);

    const stdout = fs.readFileSync(this.stdoutFile, 'utf8');
    const stderr = fs.readFileSync(this.stderrFile, 'utf8');
    const statusStr = fs.readFileSync(this.statusFile, 'utf8').trim();
    const code = statusStr ? parseInt(statusStr, 10) : 1;

    if (fs.existsSync(this.cwdFile)) {
      this.cwd = fs.readFileSync(this.cwdFile, 'utf8').trim();
    }

    return { stdout, stderr, code, interrupted };
  }

  private killChildren() {
    // Simplified - kill all child processes
    try {
      const { execSync } = require('child_process');
      const childPids = execSync(`pgrep -P ${this.shell.pid}`)
        .toString()
        .trim()
        .split('\n')
        .filter(Boolean);

      childPids.forEach((pid: string) => {
        try {
          process.kill(Number(pid), 'SIGTERM');
        } catch (error) {
          console.error(`Failed to kill process ${pid}:`, error);
        }
      });
    } catch {
      // No children to kill
    }
  }

  async setCwd(newCwd: string): Promise<void> {
    await this.exec(`cd "${newCwd}"`);
    this.cwd = newCwd;
  }

  getCwd(): string {
    return this.cwd;
  }

  close() {
    this.shell.kill();
  }
}
