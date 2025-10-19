/**
 * Version checking and update notification utility
 */

import fs from 'fs';
import path from 'path';
import https from 'https';

interface VersionInfo {
  current: string;
  latest: string;
  isOutdated: boolean;
  changesSummary?: string;
}

const VERSION_CACHE_FILE = path.join(process.env.HOME || '/tmp', '.ceregrep-version-cache');
const CACHE_DURATION = 3600000; // 1 hour in ms

/**
 * Parse semantic version for comparison
 */
function parseVersion(version: string): number[] {
  return version.split('.').map(v => parseInt(v, 10));
}

/**
 * Compare two semantic versions
 * Returns: -1 if v1 < v2, 0 if equal, 1 if v1 > v2
 */
function compareVersions(v1: string, v2: string): number {
  const parts1 = parseVersion(v1);
  const parts2 = parseVersion(v2);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const part1 = parts1[i] || 0;
    const part2 = parts2[i] || 0;

    if (part1 < part2) return -1;
    if (part1 > part2) return 1;
  }

  return 0;
}

/**
 * Get local ceregrep version from package.json
 */
export function getLocalVersion(): string {
  try {
    // Try multiple locations to find package.json
    const possiblePaths = [
      // Installed globally in node_modules
      path.join(process.cwd(), 'package.json'),
      path.dirname(new URL(import.meta.url).pathname).replace(/dist\/utils$/, 'package.json'),
      path.join(process.env.HOME || '/tmp', '.local', 'lib', 'node_modules', 'ceregrep', 'package.json'),
      '/usr/local/lib/node_modules/ceregrep/package.json',
      path.join(process.cwd(), '..', 'package.json'),
    ];

    for (const filePath of possiblePaths) {
      if (fs.existsSync(filePath)) {
        const pkg = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        if (pkg.version) {
          return pkg.version;
        }
      }
    }

    return 'unknown';
  } catch (error) {
    return 'unknown';
  }
}

/**
 * Get latest version from npm registry
 */
export async function getRemoteVersion(): Promise<string> {
  return new Promise((resolve) => {
    // Check cache first
    if (fs.existsSync(VERSION_CACHE_FILE)) {
      try {
        const cache = JSON.parse(fs.readFileSync(VERSION_CACHE_FILE, 'utf-8'));
        if (Date.now() - cache.timestamp < CACHE_DURATION) {
          resolve(cache.version);
          return;
        }
      } catch (error) {
        // Cache read error, continue to fetch from npm
      }
    }

    // Fetch from npm registry
    https
      .get('https://registry.npmjs.org/ceregrep/latest', (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const pkg = JSON.parse(data);
            const version = pkg.version;

            // Cache the result
            try {
              fs.writeFileSync(
                VERSION_CACHE_FILE,
                JSON.stringify({ version, timestamp: Date.now() })
              );
            } catch (error) {
              // Ignore cache write errors
            }

            resolve(version);
          } catch (error) {
            resolve('unknown');
          }
        });
      })
      .on('error', () => {
        resolve('unknown');
      });
  });
}

/**
 * Check if current version is outdated
 */
export async function checkForUpdates(): Promise<VersionInfo> {
  const current = getLocalVersion();
  const latest = await getRemoteVersion();

  if (current === 'unknown' || latest === 'unknown') {
    return {
      current,
      latest,
      isOutdated: false,
    };
  }

  const isOutdated = compareVersions(current, latest) < 0;

  return {
    current,
    latest,
    isOutdated,
    changesSummary: getChangesSummary(current, latest),
  };
}

/**
 * Get summary of changes between versions
 */
function getChangesSummary(current: string, latest: string): string {
  const versionDiff = compareVersions(current, latest);

  if (versionDiff >= 0) {
    return '';
  }

  // Parse versions to determine change type
  const currParts = parseVersion(current);
  const latestParts = parseVersion(latest);

  if (currParts[0] !== latestParts[0]) {
    return 'Major version update - breaking changes possible';
  } else if (currParts[1] !== latestParts[1]) {
    return 'Minor version update - new features included';
  } else {
    return 'Patch version update - bug fixes';
  }
}

/**
 * Format update notification
 */
export function formatUpdateNotification(versionInfo: VersionInfo): string {
  if (!versionInfo.isOutdated) {
    return '';
  }

  const lines = [
    '\n╔════════════════════════════════════════════════════════════╗',
    '║          🎉 New version of ceregrep available! 🎉          ║',
    '╠════════════════════════════════════════════════════════════╣',
    `║  Current: ${versionInfo.current.padEnd(50)} ║`,
    `║  Latest:  ${versionInfo.latest.padEnd(50)} ║`,
  ];

  if (versionInfo.changesSummary) {
    lines.push('╠════════════════════════════════════════════════════════════╣');
    lines.push(`║  ${versionInfo.changesSummary.padEnd(56)} ║`);
  }

  lines.push('╠════════════════════════════════════════════════════════════╣');
  lines.push('║  Run: ceregrep update                                      ║');
  lines.push('║  Or:  npm install -g ceregrep@latest                      ║');
  lines.push('╚════════════════════════════════════════════════════════════╝\n');

  return lines.join('\n');
}
