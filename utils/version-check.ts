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
  isDeprecated?: boolean;
  packageName?: string;
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
 * Get local package info (version and name) from package.json
 */
export function getLocalPackageInfo(): { version: string; name: string } {
  try {
    // Try multiple locations to find package.json
    // IMPORTANT: Check scout's own package.json BEFORE process.cwd()
    const possiblePaths = [
      // Scout's own package.json (relative to this file in dist/utils)
      path.dirname(new URL(import.meta.url).pathname).replace(/dist\/utils$/, 'package.json'),
      // Global installations
      path.join(process.env.HOME || '/tmp', '.local', 'lib', 'node_modules', 'swarm-scout', 'package.json'),
      '/usr/local/lib/node_modules/swarm-scout/package.json',
      path.join(process.env.HOME || '/tmp', '.local', 'lib', 'node_modules', 'ceregrep', 'package.json'),
      '/usr/local/lib/node_modules/ceregrep/package.json',
      // LAST RESORT: Current directory (may not be scout's package.json!)
      path.join(process.cwd(), 'package.json'),
      path.join(process.cwd(), '..', 'package.json'),
    ];

    for (const filePath of possiblePaths) {
      if (fs.existsSync(filePath)) {
        const pkg = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        if (pkg.version) {
          return { version: pkg.version, name: pkg.name || 'unknown' };
        }
      }
    }

    return { version: 'unknown', name: 'unknown' };
  } catch (error) {
    return { version: 'unknown', name: 'unknown' };
  }
}

/**
 * Get local ceregrep version from package.json (legacy function)
 */
export function getLocalVersion(): string {
  return getLocalPackageInfo().version;
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

    // Get the current package name dynamically
    const { name: packageName } = getLocalPackageInfo();

    // Fetch from npm registry using the dynamic package name
    https
      .get(`https://registry.npmjs.org/${packageName}/latest`, (res) => {
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
  const { version: current, name: packageName } = getLocalPackageInfo();
  const latest = await getRemoteVersion();

  // Check if using deprecated 'ceregrep' package name
  const isDeprecated = packageName === 'ceregrep';

  if (current === 'unknown' || latest === 'unknown') {
    return {
      current,
      latest,
      isOutdated: false,
      isDeprecated,
      packageName,
    };
  }

  const isOutdated = compareVersions(current, latest) < 0;

  return {
    current,
    latest,
    isOutdated,
    changesSummary: getChangesSummary(current, latest),
    isDeprecated,
    packageName,
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
  // Show deprecation notice for old 'ceregrep' package
  if (versionInfo.isDeprecated) {
    const lines = [
      '\n╔════════════════════════════════════════════════════════════╗',
      '║       ⚠️  PACKAGE MOVED - ACTION REQUIRED ⚠️                ║',
      '╠════════════════════════════════════════════════════════════╣',
      '║  The "ceregrep" package has been renamed to "swarm-scout" ║',
      '║                                                            ║',
      '║  This package is no longer maintained.                    ║',
      '║  Please migrate to the new package for updates & support. ║',
      '╠════════════════════════════════════════════════════════════╣',
      '║  📦 Migration Steps:                                       ║',
      '║                                                            ║',
      '║  1. Uninstall old package:                                ║',
      '║     npm uninstall -g ceregrep                             ║',
      '║                                                            ║',
      '║  2. Install new package:                                  ║',
      '║     npm install -g swarm-scout                            ║',
      '║                                                            ║',
      '║  3. Use new command:                                      ║',
      '║     scout [command]    (was: ceregrep [command])          ║',
      '╠════════════════════════════════════════════════════════════╣',
      '║  💡 All functionality remains the same!                    ║',
      '║     Your configs (.ceregrep.json) will still work.        ║',
      '╚════════════════════════════════════════════════════════════╝\n',
    ];
    return lines.join('\n');
  }

  // Regular update notification for swarm-scout
  if (!versionInfo.isOutdated) {
    return '';
  }

  const lines = [
    '\n╔════════════════════════════════════════════════════════════╗',
    '║          🎉 New version of swarm-scout available! 🎉       ║',
    '╠════════════════════════════════════════════════════════════╣',
    `║  Current: ${versionInfo.current.padEnd(50)} ║`,
    `║  Latest:  ${versionInfo.latest.padEnd(50)} ║`,
  ];

  if (versionInfo.changesSummary) {
    lines.push('╠════════════════════════════════════════════════════════════╣');
    lines.push(`║  ${versionInfo.changesSummary.padEnd(56)} ║`);
  }

  lines.push('╠════════════════════════════════════════════════════════════╣');
  lines.push('║  Run: scout update                                         ║');
  lines.push('║  Or:  npm install -g swarm-scout@latest                   ║');
  lines.push('╚════════════════════════════════════════════════════════════╝\n');

  return lines.join('\n');
}
