/**
 * SolStoragePort & Read-Set Types
 * Schema-independent storage abstraction providing normalized contract objects.
 */

export interface NormalizedNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  size?: number;
  modified: string;
  isReadOnly?: boolean;
}

export interface ReadSetSnapshot {
  parentPath: string[];
  nodes: NormalizedNode[];
  digest: string;
  capturedAt: string;
}

export interface SolStoragePort {
  getDirectoryReadSet(path: string[]): Promise<ReadSetSnapshot>;
  isStorageWritable(path: string[]): Promise<boolean>;
}
