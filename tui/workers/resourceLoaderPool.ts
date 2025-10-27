/**
 * Resource Loader Worker Pool
 * Manages worker process lifecycle and provides a clean interface for loading resources
 *
 * This pool reuses a single worker process to avoid spawning multiple processes
 * and keeps the expensive file/MCP operations off the main thread
 */

import { fork, ChildProcess } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { log } from '../utils/diagnostics.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface LoadResourcesMessage {
  type: 'load-resources';
  cwd: string;
}

interface LoadResourcesResponse {
  type: 'resources-loaded';
  resources: Array<{
    uri: string;
    name: string;
    absolutePath: string;
  }>;
  error?: string;
}

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (error: any) => void;
  timeout: NodeJS.Timeout;
}

class ResourceLoaderPool {
  private worker: ChildProcess | null = null;
  private pendingRequests = new Map<number, PendingRequest>();
  private requestId = 0;
  private initPromise: Promise<void> | null = null;
  private readonly WORKER_TIMEOUT = 30000; // 30 seconds
  private readonly WORKER_PATH = join(__dirname, 'resourceLoader.js');

  /**
   * Initialize worker process (lazy initialization)
   */
  private async initWorker(): Promise<void> {
    if (this.worker) {
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      try {
        this.worker = fork(this.WORKER_PATH, [], {
          silent: false, // Inherit stdout/stderr for debugging
          stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
        });

        this.worker.on('message', (msg: LoadResourcesResponse) => {
          log(`RESOURCE_LOADER: received ${msg.resources.length} resources`);
          // Handle response - in this case we don't track IDs since we use simple request/response
        });

        this.worker.on('error', (err) => {
          log(`RESOURCE_LOADER_ERROR: ${err.message}`);
          this.worker = null;
          this.initPromise = null;
          reject(err);
        });

        this.worker.on('exit', () => {
          log('RESOURCE_LOADER: worker exited');
          this.worker = null;
          this.initPromise = null;
        });

        resolve();
      } catch (err) {
        log(`RESOURCE_LOADER_INIT_ERROR: ${err instanceof Error ? err.message : String(err)}`);
        reject(err);
      }
    });

    return this.initPromise;
  }

  /**
   * Load resources in worker process
   */
  async loadResources(cwd: string): Promise<
    Array<{
      uri: string;
      name: string;
      absolutePath: string;
    }>
  > {
    const startTime = performance.now();

    try {
      await this.initWorker();

      if (!this.worker) {
        throw new Error('Failed to initialize resource loader worker');
      }

      return new Promise((resolve, reject) => {
        const worker = this.worker;
        if (!worker) {
          reject(new Error('Failed to initialize worker process'));
          return;
        }

        // Set timeout for this request
        const timeout = setTimeout(() => {
          log(`RESOURCE_LOADER_TIMEOUT: request took >30s`);
          reject(new Error('Resource loading timeout'));
          // Kill worker and restart on next request
          this.worker?.kill();
          this.worker = null;
          this.initPromise = null;
        }, this.WORKER_TIMEOUT);

        // Set up one-time message listener
        const handler = (msg: LoadResourcesResponse) => {
          if (msg.type === 'resources-loaded') {
            clearTimeout(timeout);
            worker.removeListener('message', handler);

            const duration = performance.now() - startTime;
            if (msg.error) {
              log(`RESOURCE_LOADER_ERROR_RESPONSE: ${msg.error} (${duration.toFixed(2)}ms)`);
              reject(new Error(msg.error));
            } else {
              log(
                `RESOURCE_LOADER_COMPLETE: ${msg.resources.length} resources (${duration.toFixed(2)}ms)`
              );
              resolve(msg.resources);
            }
          }
        };

        worker.on('message', handler);

        // Send request to worker
        log(`RESOURCE_LOADER: fetching resources from ${cwd}`);
        const msg: LoadResourcesMessage = {
          type: 'load-resources',
          cwd,
        };
        worker.send(msg);
      });
    } catch (error) {
      const duration = performance.now() - startTime;
      log(`RESOURCE_LOADER_FAILED: ${error instanceof Error ? error.message : String(error)} (${duration.toFixed(2)}ms)`);
      throw error;
    }
  }

  /**
   * Clean up worker process
   */
  shutdown(): void {
    if (this.worker) {
      this.worker.kill();
      this.worker = null;
    }
    this.initPromise = null;
    this.pendingRequests.clear();
  }

  /**
   * Restart worker process (useful for memory cleanup)
   */
  restart(): void {
    log(`RESOURCE_LOADER_RESTART: restarting worker process`);
    this.shutdown();
  }
}

// Global singleton instance
let poolInstance: ResourceLoaderPool | null = null;

export function getResourceLoaderPool(): ResourceLoaderPool {
  if (!poolInstance) {
    poolInstance = new ResourceLoaderPool();
  }
  return poolInstance;
}

export async function loadResourcesFromWorker(cwd: string) {
  const pool = getResourceLoaderPool();
  return pool.loadResources(cwd);
}

// Cleanup on exit
if (typeof process !== 'undefined') {
  process.on('exit', () => {
    poolInstance?.shutdown();
  });
}
