/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type * as NodePty from 'node-pty';

export type IPty = NodePty.IPty;

export interface PtyImplementation {
  module: typeof NodePty;
  name: 'node-pty' | 'lydell-node-pty';
}

/**
 * Dynamically loads the node-pty module.
 * Returns null if the module cannot be loaded (e.g., not installed or incompatible platform).
 */
export async function getPty(): Promise<PtyImplementation | null> {
  try {
    const ptyModule = await import('node-pty');
    return {
      module: ptyModule,
      name: 'node-pty',
    };
  } catch (error) {
    // node-pty might not be available on all platforms or might fail to load
    console.warn('[ceregrep] Warning: node-pty module could not be loaded:', error);
    return null;
  }
}
