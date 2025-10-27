/**
 * Resource Loader Worker Process
 * Handles expensive file and MCP resource operations in a separate process
 * to prevent blocking the main TUI thread
 */

import { listRepoFiles, FileResource } from '../../mcp/resources.js';
import { getMCPResources } from '../../mcp/client.js';

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

/**
 * Handle messages from parent process
 */
process.on('message', async (msg: LoadResourcesMessage) => {
  if (msg.type === 'load-resources') {
    try {
      const startTime = performance.now();

      // Fetch both filesystem and MCP resources in parallel
      const [filesystemResources, mcpResources] = await Promise.all([
        listRepoFiles(msg.cwd)
          .then(files =>
            files.map(f => ({
              uri: f.uri,
              name: f.name,
              absolutePath: f.absolutePath,
            }))
          )
          .catch(() => []),
        getMCPResources()
          .then(resources =>
            resources.map(r => ({
              uri: r.uri,
              name: r.name || r.uri.split('/').pop() || r.uri,
              absolutePath: r.uri.startsWith('file://')
                ? decodeURIComponent(r.uri.slice(7))
                : r.uri,
            }))
          )
          .catch(() => []),
      ]);

      const allResources = [...filesystemResources, ...mcpResources];
      const duration = performance.now() - startTime;

      // Send response back to parent
      const response: LoadResourcesResponse = {
        type: 'resources-loaded',
        resources: allResources,
      };

      process.send?.(response);
    } catch (error) {
      const response: LoadResourcesResponse = {
        type: 'resources-loaded',
        resources: [],
        error: error instanceof Error ? error.message : String(error),
      };

      process.send?.(response);
    }
  }
});

// Keep process alive
process.on('disconnect', () => {
  process.exit(0);
});
