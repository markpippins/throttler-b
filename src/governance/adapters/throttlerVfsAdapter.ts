/**
 * Throttler VFS Storage & Capability Adapter
 * Bridges Throttler's FileSystemService to the SolStoragePort and Vision capability substrate.
 */

import { VirtualFileSystem } from '../../services/fileSystemService';
import { SolStoragePort, ReadSetSnapshot, NormalizedNode } from '../solscript/port';
import { VisionExecutionSubstrate } from '../vision/executor';
import { ResolutionGovernanceLedger } from '../resolution/governance';
import { GovernedDirector } from '../director';

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
    const digestRaw = nodes.map(n => `${n.name}:${n.modified}`).sort().join('|');
    let hash = 0;
    for (let i = 0; i < digestRaw.length; i++) {
      hash = (hash << 5) - hash + digestRaw.charCodeAt(i);
      hash |= 0;
    }
    const digest = `sha256:${Math.abs(hash).toString(16).padStart(8, '0')}`;

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
