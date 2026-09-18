/**
 * Throttler VFS Storage & Capability Adapter
 * Bridges Throttler's FileSystemService to the SolStoragePort and Vision capability substrate.
 */

import { VirtualFileSystem } from '../../services/fileSystemService';
import { SolStoragePort, ReadSetSnapshot, NormalizedNode } from '../solscript/port';
import { VisionExecutionSubstrate } from '../vision/executor';
import { ResolutionGovernanceLedger } from '../resolution/governance';
import { GovernedDirector } from '../director';
import { sha256Hex } from '@nexus/solscript';
import { isValidSha256Digest } from '@nexus/projection-core';

/**
 * Computes a standard sha256-prefixed hash string conforming to
 * @nexus/projection-core and the witness system: `sha256:<64 lowercase hex chars>`.
 */
export async function computeSha256Digest(content: string): Promise<string> {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.subtle?.digest) {
    try {
      const buffer = await globalThis.crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(content)
      );
      const hex = Array.from(new Uint8Array(buffer), (b) => b.toString(16).padStart(2, '0')).join('');
      const digest = `sha256:${hex}`;
      if (isValidSha256Digest(digest)) {
        return digest;
      }
    } catch {
      // Fallback to pure JS sha256Hex below
    }
  }
  return computeSha256DigestSync(content);
}

/**
 * Synchronous fallback / deterministic sha256 digest generator.
 */
export function computeSha256DigestSync(content: string): string {
  const hex = sha256Hex(content);
  return `sha256:${hex}`;
}

export class ThrottlerVfsStorageAdapter implements SolStoragePort {
  constructor(private vfs: VirtualFileSystem) {}

  async getDirectoryReadSet(path: string[]): Promise<ReadSetSnapshot> {
    const parent = this.vfs.getNode(path);
    const children = parent?.children || [];

    const nodes: NormalizedNode[] = children.map(c => ({
      id: `${path.join('/')}/${c.name}`,
      name: c.name,
      type: c.type,
      size: c.size,
      modified: c.modified || new Date().toISOString(),
      isReadOnly: false,
    }));

    // Compute a deterministic content digest over sibling names and modified dates
    // Formatted strictly as sha256:<64 hex chars> matching @nexus/projection-core / witness requirements
    const digestRaw = nodes.map(n => `${n.name}:${n.modified}`).sort().join('|');
    const digest = await computeSha256Digest(digestRaw);

    return {
      parentPath: [...path],
      nodes,
      digest,
      capturedAt: new Date().toISOString(),
    };
  }

  async isStorageWritable(path: string[]): Promise<boolean> {
    return true; // Local virtual filesystem is writable
  }
}

/**
 * Helper to bootstrap a fully wired Governed Director for Throttler VFS.
 */
export function createGovernedDirector(vfs: VirtualFileSystem): {
  director: GovernedDirector;
  ledger: ResolutionGovernanceLedger;
} {
  const storagePort = new ThrottlerVfsStorageAdapter(vfs);
  const visionSubstrate = new VisionExecutionSubstrate();
  const ledger = new ResolutionGovernanceLedger();

  // Register the real capability handler on Vision
  visionSubstrate.registerHandler(
    'filesystem.rename',
    async (params: { source_path: string[]; old_name: string; new_name: string }) => {
      const success = vfs.renameItem(params.source_path, params.old_name, params.new_name);
      if (!success) {
        throw new Error(`Underlying VFS rejected rename of '${params.old_name}' to '${params.new_name}'.`);
      }
      return { renamed: true, oldName: params.old_name, newName: params.new_name };
    }
  );

  const director = new GovernedDirector(storagePort, visionSubstrate, ledger);

  return { director, ledger };
}
