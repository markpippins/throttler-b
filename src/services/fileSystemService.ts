import { FileSystemNode, SearchResultNode, SubtreeStats } from '../types';
import { StorageService } from './storageService';
import { VfsSearchIndex, SearchOptions, IndexStats, BloomFilter } from './searchIndexService';

export { VfsSearchIndex, BloomFilter };
export type { SearchOptions, IndexStats };

const FS_STORAGE_KEY = 'file-explorer-session-fs';

export const DEFAULT_ROOT_NODE: FileSystemNode = {
  name: 'Local Session',
  type: 'folder',
  modified: '2024-05-20T10:00:00Z',
  childrenLoaded: true,
  children: [
    {
      name: 'Documents',
      type: 'folder',
      modified: '2024-05-20T09:00:00Z',
      children: [
        {
          name: 'README.md',
          type: 'file',
          content: '# Documents Folder\n\nWelcome to Throttler File Explorer!\n\n- Navigate folders using tree view or dual panes\n- Edit markdown notes directly\n- Drag and drop files & folders\n- Connect to remote server brokers\n- Search and save bookmarks into folders',
          modified: '2024-05-20T09:00:00Z',
          size: 1024,
        },
        {
          name: 'project-brief.docx',
          type: 'file',
          content: 'Project brief and design specifications for Throttler.',
          modified: '2024-05-19T10:00:00Z',
          size: 14200,
          tags: ['Work', 'Urgent'],
        },
        {
          name: 'quarterly-results.xlsx',
          type: 'file',
          content: 'Q1 and Q2 metrics data.',
          modified: '2024-05-18T14:30:00Z',
          size: 28400,
          tags: ['Work'],
        },
      ],
    },
    {
      name: 'Pictures',
      type: 'folder',
      modified: '2024-05-15T11:00:00Z',
      children: [
        {
          name: 'logo.png',
          type: 'file',
          content: 'https://picsum.photos/seed/throttlerlogo/600/400',
          modified: '2024-05-15T11:00:00Z',
          size: 84000,
        },
        {
          name: 'team-photo.jpg',
          type: 'file',
          content: 'https://picsum.photos/seed/teamphoto/800/600',
          modified: '2024-05-10T18:00:00Z',
          size: 145000,
          tags: ['Personal'],
        },
      ],
    },
    {
      name: 'Work',
      type: 'folder',
      modified: '2024-05-20T10:59:00Z',
      children: [
        {
          name: 'README.md',
          type: 'file',
          content: '## Work Directory\n\nContains subdirectories for `Dev`, `Devops`, and `Resources`.',
          modified: '2024-05-20T10:59:00Z',
          size: 512,
        },
        {
          name: 'Dev',
          type: 'folder',
          modified: '2024-05-20T09:00:00Z',
          children: [
            {
              name: 'Projects',
              type: 'folder',
              modified: '2024-05-20T09:00:00Z',
              children: [
                {
                  name: 'Throttler',
                  type: 'folder',
                  modified: '2024-05-20T09:00:00Z',
                  children: [
                    {
                      name: 'package.json',
                      type: 'file',
                      content: '{\n  "name": "throttler",\n  "version": "1.0.0"\n}',
                      modified: '2024-05-20T09:00:00Z',
                      size: 256,
                    },
                    {
                      name: 'app.ts',
                      type: 'file',
                      content: 'console.log("Throttler Explorer Engine Online");',
                      modified: '2024-05-20T09:00:00Z',
                      size: 1024,
                    }
                  ],
                },
                {
                  name: 'Throttler.magnet',
                  type: 'file',
                  content: 'magnet:?xt=urn:btih:throttler-dev-source-bundle',
                  modified: '2024-05-20T09:00:00Z',
                  size: 64,
                },
                {
                  name: 'Atomix',
                  type: 'folder',
                  modified: '2024-05-18T16:20:00Z',
                  children: [
                    {
                      name: 'main.py',
                      type: 'file',
                      content: '# Atomix Service\nimport sys\nprint("Atomix Loaded")',
                      modified: '2024-05-18T16:20:00Z',
                      size: 512,
                    }
                  ],
                },
                {
                  name: 'Atomix.magnet',
                  type: 'file',
                  content: 'magnet:?xt=urn:btih:atomix-virtual-system',
                  modified: '2024-05-18T16:20:00Z',
                  size: 64,
                },
              ],
            },
            {
              name: 'Users',
              type: 'folder',
              modified: '2024-05-02T15:00:00Z',
              children: [
                {
                  name: 'j.doe',
                  type: 'folder',
                  modified: '2024-05-01T12:00:00Z',
                  children: [
                    {
                      name: 'profile.json',
                      type: 'file',
                      content: '{"user": "j.doe", "role": "Lead Architect"}',
                      modified: '2024-05-01T12:00:00Z',
                      size: 128,
                    }
                  ],
                },
                {
                  name: 's.smith',
                  type: 'folder',
                  modified: '2024-05-02T15:00:00Z',
                  children: [
                    {
                      name: 'profile.json',
                      type: 'file',
                      content: '{"user": "s.smith", "role": "Fullstack Engineer"}',
                      modified: '2024-05-02T15:00:00Z',
                      size: 128,
                    }
                  ],
                },
              ],
            },
          ],
        },
        {
          name: 'Devops',
          type: 'folder',
          modified: '2024-05-24T11:45:00Z',
          children: [
            {
              name: 'ci-pipeline.yml',
              type: 'file',
              content: 'name: CI\non: [push]\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v3\n      - run: npm test',
              modified: '2024-05-24T11:45:00Z',
              size: 2048,
            },
            {
              name: 'deploy-script.sh',
              type: 'file',
              content: '#!/bin/bash\necho "Deploying Throttler service..."\nsleep 1\necho "Deployed successfully!"',
              modified: '2024-05-23T09:30:00Z',
              size: 1024,
            },
          ],
        },
      ],
    },
    {
      name: 'Trash',
      type: 'folder',
      isTrash: true,
      modified: '2024-05-24T12:00:00Z',
      childrenLoaded: true,
      children: [],
    },
  ],
};

export function deepCloneNode(node: FileSystemNode): FileSystemNode {
  return {
    name: node.name,
    type: node.type,
    content: node.content,
    modified: node.modified,
    childrenLoaded: !!node.children,
    isServerRoot: node.isServerRoot,
    profileId: node.profileId,
    connected: node.connected,
    isMagnet: node.isMagnet,
    magnetFile: node.magnetFile,
    size: node.size,
    tags: node.tags ? [...node.tags] : undefined,
    isTrash: node.isTrash,
    originalPath: node.originalPath ? [...node.originalPath] : undefined,
    deletedAt: node.deletedAt,
    children: node.children ? node.children.map(deepCloneNode) : undefined,
  };
}

export class VirtualFileSystem {
  private root: FileSystemNode;
  private searchIndex: VfsSearchIndex = new VfsSearchIndex();

  constructor(initialRoot?: FileSystemNode) {
    if (initialRoot) {
      this.root = deepCloneNode(initialRoot);
    } else {
      const stored = StorageService.getLocalItem<FileSystemNode | null>(FS_STORAGE_KEY, null);
      this.root = stored ? deepCloneNode(stored) : deepCloneNode(DEFAULT_ROOT_NODE);
    }
    this.ensureTrashFolder();
    this.searchIndex.indexTree(this.root);
  }

  getRoot(): FileSystemNode {
    return deepCloneNode(this.root);
  }

  setRoot(newRoot: FileSystemNode): void {
    this.root = deepCloneNode(newRoot);
    this.ensureTrashFolder();
    this.persist();
  }

  ensureTrashFolder(): FileSystemNode {
    if (!this.root.children) {
      this.root.children = [];
    }
    let trashNode = this.root.children.find(c => c.name === 'Trash' || c.isTrash);
    if (!trashNode) {
      trashNode = {
        name: 'Trash',
        type: 'folder',
        isTrash: true,
        modified: new Date().toISOString(),
        children: [],
        childrenLoaded: true,
      };
      this.root.children.push(trashNode);
      this.persist();
    } else {
      trashNode.isTrash = true;
      if (!trashNode.children) {
        trashNode.children = [];
      }
    }
    return trashNode;
  }

  isTrashPath(path: string[]): boolean {
    if (!path || path.length === 0) return false;
    let segments = [...path];
    if (segments[0] === this.root.name) {
      segments = segments.slice(1);
    }
    if (segments.length > 0 && (segments[0].toLowerCase() === 'trash' || segments[0] === '.trash')) {
      return true;
    }
    const node = this.getNode(path);
    return !!node?.isTrash;
  }

  getTrashNode(): FileSystemNode {
    return deepCloneNode(this.ensureTrashFolder());
  }

  getTrashCount(): number {
    const trash = this.ensureTrashFolder();
    return trash.children ? trash.children.length : 0;
  }

  setSessionName(name: string): void {
    this.root.name = name;
    this.persist();
  }

  private persist(): void {
    StorageService.setLocalItem(FS_STORAGE_KEY, this.root);
    this.searchIndex.indexTree(this.root);
  }

  getNode(path: string[]): FileSystemNode | null {
    if (path.length === 0) return this.root;
    
    // Normalize path by skipping root name if first element matches
    let segments = [...path];
    if (segments[0] === this.root.name) {
      segments = segments.slice(1);
    }

    let current = this.root;
    for (const segment of segments) {
      if (!current.children) return null;
      const found = current.children.find(c => c.name === segment);
      if (!found) return null;
      current = found;
    }
    return current;
  }

  listChildren(path: string[]): FileSystemNode[] {
    const node = this.getNode(path);
    if (!node || node.type !== 'folder' || !node.children) return [];
    return node.children.map(deepCloneNode);
  }

  createFolder(path: string[], name: string): boolean {
    const target = this.getNode(path);
    if (!target || target.type !== 'folder') return false;
    target.children = target.children || [];
    if (target.children.some(c => c.name === name)) return false;

    target.children.push({
      name,
      type: 'folder',
      modified: new Date().toISOString(),
      children: [],
      childrenLoaded: true,
    });
    this.persist();
    return true;
  }

  createFile(path: string[], name: string, content: string = ''): boolean {
    const target = this.getNode(path);
    if (!target || target.type !== 'folder') return false;
    target.children = target.children || [];
    if (target.children.some(c => c.name === name)) return false;

    target.children.push({
      name,
      type: 'file',
      content,
      modified: new Date().toISOString(),
      size: content.length,
    });
    this.persist();
    return true;
  }

  updateFileContent(path: string[], content: string): boolean {
    const target = this.getNode(path);
    if (!target || target.type !== 'file') return false;
    target.content = content;
    target.modified = new Date().toISOString();
    target.size = content.length;
    this.persist();
    return true;
  }

  renameItem(path: string[], oldName: string, newName: string): boolean {
    const parent = this.getNode(path);
    if (!parent || !parent.children) return false;
    const item = parent.children.find(c => c.name === oldName);
    if (!item) return false;
    if (parent.children.some(c => c.name === newName && c !== item)) return false;

    item.name = newName;
    item.modified = new Date().toISOString();
    this.persist();
    return true;
  }

  updateItemProperties(
    path: string[],
    itemName: string,
    properties: {
      displayName?: string;
      imageName?: string;
      tags?: string[];
    }
  ): boolean {
    let target: FileSystemNode | null = null;
    let parentNode: FileSystemNode | null = null;

    const nodeAtPath = this.getNode(path);
    if (nodeAtPath && nodeAtPath.name === itemName) {
      target = nodeAtPath;
    } else if (nodeAtPath && nodeAtPath.children) {
      target = nodeAtPath.children.find((c) => c.name === itemName) || null;
      parentNode = nodeAtPath;
    }

    if (!target && path.length > 0 && path[path.length - 1] === itemName) {
      const parentOfPath = this.getNode(path.slice(0, -1));
      if (parentOfPath && parentOfPath.children) {
        target = parentOfPath.children.find((c) => c.name === itemName) || null;
        parentNode = parentOfPath;
      }
    }

    if (!target) return false;

    if (properties.tags !== undefined) {
      target.tags = [...properties.tags];
    }

    if (properties.displayName && properties.displayName.trim() && properties.displayName.trim() !== target.name) {
      const newName = properties.displayName.trim();
      if (!parentNode || !parentNode.children?.some((c) => c.name === newName && c !== target)) {
        target.name = newName;
      }
    }

    target.modified = new Date().toISOString();
    this.persist();
    return true;
  }

  batchTagItems(
    path: string[],
    itemNames: string[],
    action: 'add' | 'remove' | 'toggle' | 'clear',
    tag?: string
  ): { success: boolean; modifiedCount: number; actionDone: 'added' | 'removed' | 'cleared' } {
    const parent = this.getNode(path);
    if (!parent || !parent.children) {
      return { success: false, modifiedCount: 0, actionDone: 'added' };
    }

    const targetNodes = parent.children.filter((c) => itemNames.includes(c.name));
    if (targetNodes.length === 0) {
      return { success: false, modifiedCount: 0, actionDone: 'added' };
    }

    const now = new Date().toISOString();
    let modifiedCount = 0;
    let effectiveAction: 'added' | 'removed' | 'cleared' = 'added';

    if (action === 'clear') {
      effectiveAction = 'cleared';
      for (const node of targetNodes) {
        if (node.tags && node.tags.length > 0) {
          node.tags = [];
          node.modified = now;
          modifiedCount++;
        }
      }
    } else if (tag && tag.trim()) {
      const cleanTag = tag.trim();
      const normalizedTag = cleanTag.toLowerCase();

      // Check if all targeted nodes already have this tag
      const allHaveTag = targetNodes.every((n) =>
        n.tags?.some((t) => t.toLowerCase() === normalizedTag)
      );

      // If action is toggle: remove if all have it, otherwise add to all that don't have it
      const shouldRemove = action === 'remove' || (action === 'toggle' && allHaveTag);

      if (shouldRemove) {
        effectiveAction = 'removed';
        for (const node of targetNodes) {
          if (node.tags && node.tags.some((t) => t.toLowerCase() === normalizedTag)) {
            node.tags = node.tags.filter((t) => t.toLowerCase() !== normalizedTag);
            node.modified = now;
            modifiedCount++;
          }
        }
      } else {
        effectiveAction = 'added';
        for (const node of targetNodes) {
          if (!node.tags) node.tags = [];
          if (!node.tags.some((t) => t.toLowerCase() === normalizedTag)) {
            node.tags.push(cleanTag);
            node.modified = now;
            modifiedCount++;
          }
        }
      }
    }

    if (modifiedCount > 0) {
      this.persist();
    }

    return { success: true, modifiedCount, actionDone: effectiveAction };
  }

  renameTagGlobally(oldTag: string, newTag: string): number {
    const oldNorm = oldTag.trim().toLowerCase();
    const newClean = newTag.trim();
    if (!oldNorm || !newClean || oldNorm === newClean.toLowerCase()) return 0;

    let modifiedCount = 0;
    const now = new Date().toISOString();

    const traverse = (node: FileSystemNode) => {
      if (node.tags && node.tags.length > 0) {
        let changed = false;
        const newTags: string[] = [];
        for (const t of node.tags) {
          if (t.trim().toLowerCase() === oldNorm) {
            if (!newTags.some((nt) => nt.toLowerCase() === newClean.toLowerCase())) {
              newTags.push(newClean);
            }
            changed = true;
          } else {
            if (!newTags.some((nt) => nt.toLowerCase() === t.toLowerCase())) {
              newTags.push(t);
            }
          }
        }
        if (changed) {
          node.tags = newTags;
          node.modified = now;
          modifiedCount++;
        }
      }
      if (node.children) {
        for (const child of node.children) {
          traverse(child);
        }
      }
    };

    traverse(this.root);
    if (modifiedCount > 0) {
      this.persist();
    }
    return modifiedCount;
  }

  removeTagGlobally(tag: string): number {
    const targetNorm = tag.trim().toLowerCase();
    if (!targetNorm) return 0;

    let modifiedCount = 0;
    const now = new Date().toISOString();

    const traverse = (node: FileSystemNode) => {
      if (node.tags && node.tags.length > 0) {
        const initialLength = node.tags.length;
        node.tags = node.tags.filter((t) => t.trim().toLowerCase() !== targetNorm);
        if (node.tags.length !== initialLength) {
          node.modified = now;
          modifiedCount++;
        }
      }
      if (node.children) {
        for (const child of node.children) {
          traverse(child);
        }
      }
    };

    traverse(this.root);
    if (modifiedCount > 0) {
      this.persist();
    }
    return modifiedCount;
  }

  getTagUsageCount(tag: string): number {
    const targetNorm = tag.trim().toLowerCase();
    if (!targetNorm) return 0;

    let count = 0;
    const traverse = (node: FileSystemNode) => {
      if (node.tags && node.tags.some((t) => t.trim().toLowerCase() === targetNorm)) {
        count++;
      }
      if (node.children) {
        for (const child of node.children) {
          traverse(child);
        }
      }
    };

    traverse(this.root);
    return count;
  }

  moveToTrash(path: string[], itemName: string): { success: boolean; error?: string } {
    if (itemName.toLowerCase() === 'trash') {
      return { success: false, error: 'Cannot delete the Trash system folder.' };
    }
    const parent = this.getNode(path);
    if (!parent || !parent.children) {
      return { success: false, error: 'Source directory not found.' };
    }

    const itemIdx = parent.children.findIndex(c => c.name === itemName);
    if (itemIdx === -1) {
      return { success: false, error: `Item "${itemName}" not found.` };
    }

    const [item] = parent.children.splice(itemIdx, 1);
    const trash = this.ensureTrashFolder();

    // Preserve original path and store deletion timestamp
    item.originalPath = [...path];
    item.deletedAt = new Date().toISOString();

    // If item with the same name already exists in Trash, make unique name
    let targetName = item.name;
    let counter = 1;
    while (trash.children?.some(c => c.name.toLowerCase() === targetName.toLowerCase())) {
      const dotIdx = item.name.lastIndexOf('.');
      if (dotIdx > 0 && item.type === 'file') {
        const base = item.name.substring(0, dotIdx);
        const ext = item.name.substring(dotIdx);
        targetName = `${base} (${counter})${ext}`;
      } else {
        targetName = `${item.name} (${counter})`;
      }
      counter++;
    }
    item.name = targetName;

    trash.children = trash.children || [];
    trash.children.unshift(item); // Most recently deleted first
    this.persist();
    return { success: true };
  }

  restoreFromTrash(itemName: string): { success: boolean; restoredPath?: string[]; restoredName?: string; error?: string } {
    const trash = this.ensureTrashFolder();
    if (!trash.children) {
      return { success: false, error: 'Trash is empty.' };
    }

    const itemIdx = trash.children.findIndex(c => c.name === itemName);
    if (itemIdx === -1) {
      return { success: false, error: `Item "${itemName}" not found in Trash.` };
    }

    const [item] = trash.children.splice(itemIdx, 1);

    let targetPath = item.originalPath && item.originalPath.length > 0
      ? [...item.originalPath]
      : [this.root.name];

    let destNode = this.getNode(targetPath);
    if (!destNode || destNode.type !== 'folder') {
      // Recreate missing directory chain if original location was deleted
      let currentCheckPath: string[] = [];
      let ok = true;
      for (const seg of targetPath) {
        if (seg === this.root.name) {
          currentCheckPath = [seg];
          continue;
        }
        const parentNode = this.getNode(currentCheckPath);
        if (parentNode && parentNode.children) {
          let child = parentNode.children.find(c => c.name === seg && c.type === 'folder');
          if (!child) {
            parentNode.children.push({
              name: seg,
              type: 'folder',
              modified: new Date().toISOString(),
              children: [],
              childrenLoaded: true,
            });
          }
        } else {
          ok = false;
          break;
        }
        currentCheckPath.push(seg);
      }
      destNode = ok ? this.getNode(targetPath) : null;
      if (!destNode) {
        targetPath = [this.root.name];
        destNode = this.root;
      }
    }

    destNode.children = destNode.children || [];

    // Ensure unique name in destination
    let restoredName = item.name;
    let counter = 1;
    const baseCandidate = restoredName;
    while (destNode.children.some(c => c.name.toLowerCase() === restoredName.toLowerCase())) {
      const dotIdx = baseCandidate.lastIndexOf('.');
      if (dotIdx > 0 && item.type === 'file') {
        const base = baseCandidate.substring(0, dotIdx);
        const ext = baseCandidate.substring(dotIdx);
        restoredName = `${base} (Restored ${counter})${ext}`;
      } else {
        restoredName = `${baseCandidate} (Restored ${counter})`;
      }
      counter++;
    }
    item.name = restoredName;
    delete item.deletedAt;

    destNode.children.push(item);
    this.persist();
    return { success: true, restoredPath: targetPath, restoredName };
  }

  restoreAllFromTrash(): { count: number; failed: number } {
    const trash = this.ensureTrashFolder();
    if (!trash.children || trash.children.length === 0) {
      return { count: 0, failed: 0 };
    }
    const names = trash.children.map(c => c.name);
    let count = 0;
    let failed = 0;
    for (const name of names) {
      const res = this.restoreFromTrash(name);
      if (res.success) {
        count++;
      } else {
        failed++;
      }
    }
    return { count, failed };
  }

  emptyTrash(): number {
    const trash = this.ensureTrashFolder();
    const count = trash.children ? trash.children.length : 0;
    trash.children = [];
    this.persist();
    return count;
  }

  deleteItem(path: string[], itemName: string, permanent: boolean = false): boolean {
    if (itemName.toLowerCase() === 'trash' && this.isTrashPath([...path, itemName])) {
      return false; // Never delete the Trash folder itself
    }
    if (this.isTrashPath(path) || permanent) {
      const parent = this.getNode(path);
      if (!parent || !parent.children) return false;
      parent.children = parent.children.filter(c => c.name !== itemName);
      this.persist();
      return true;
    } else {
      const res = this.moveToTrash(path, itemName);
      return res.success;
    }
  }

  deleteItems(items: { path: string[]; name: string }[], permanent: boolean = false): void {
    for (const it of items) {
      this.deleteItem(it.path, it.name, permanent);
    }
  }

  reorderItems(path: string[], itemNames: string[], targetIndex: number): boolean {
    const parent = this.getNode(path);
    if (!parent || !parent.children) return false;

    const itemsToMove: FileSystemNode[] = [];
    const remaining: FileSystemNode[] = [];

    for (const child of parent.children) {
      if (itemNames.includes(child.name)) {
        itemsToMove.push(child);
      } else {
        remaining.push(child);
      }
    }

    if (itemsToMove.length === 0) return false;

    // Keep relative order of moved items
    itemsToMove.sort((a, b) => itemNames.indexOf(a.name) - itemNames.indexOf(b.name));

    const clampedIndex = Math.max(0, Math.min(targetIndex, remaining.length));
    remaining.splice(clampedIndex, 0, ...itemsToMove);
    parent.children = remaining;
    this.persist();
    return true;
  }

  moveItem(sourcePath: string[], itemName: string, destPath: string[], targetIndex?: number): boolean {
    if (itemName.toLowerCase() === 'trash' && this.isTrashPath([...sourcePath, itemName])) {
      return false; // Prevent moving the Trash system folder
    }

    const sourceParent = this.getNode(sourcePath);
    const destParent = this.getNode(destPath);
    if (!sourceParent || !sourceParent.children || !destParent || destParent.type !== 'folder') return false;

    // Prevent circular moving of a folder into its descendant
    const sourceFullPath = [...sourcePath, itemName];
    if (destPath.length >= sourceFullPath.length) {
      const isDescendant = sourceFullPath.every((seg, i) => destPath[i] === seg);
      if (isDescendant) return false;
    }

    const itemIndex = sourceParent.children.findIndex(c => c.name === itemName);
    if (itemIndex === -1) return false;

    // Same folder move -> reorder
    if (sourcePath.join('/') === destPath.join('/')) {
      if (targetIndex === undefined) return false;
      return this.reorderItems(sourcePath, [itemName], targetIndex);
    }

    destParent.children = destParent.children || [];
    const [item] = sourceParent.children.splice(itemIndex, 1);

    // If destination is Trash, record originalPath and deletedAt
    if (this.isTrashPath(destPath)) {
      item.originalPath = [...sourcePath];
      item.deletedAt = new Date().toISOString();
    } else if (this.isTrashPath(sourcePath)) {
      delete item.deletedAt;
    }

    // If destination already has an item with the same name, rename cleanly
    let finalName = item.name;
    let count = 1;
    while (destParent.children.some(c => c.name === finalName)) {
      const ext = finalName.includes('.') ? '.' + finalName.split('.').pop() : '';
      const base = ext ? finalName.slice(0, -ext.length) : finalName;
      finalName = `${base} (1)${ext}`;
      if (destParent.children.some(c => c.name === finalName)) {
        finalName = `${base} (${count++})${ext}`;
      }
    }
    item.name = finalName;
    item.modified = new Date().toISOString();

    if (targetIndex !== undefined && targetIndex >= 0 && targetIndex <= destParent.children.length) {
      destParent.children.splice(targetIndex, 0, item);
    } else {
      destParent.children.push(item);
    }

    this.persist();
    return true;
  }

  copyItem(sourcePath: string[], itemName: string, destPath: string[], targetIndex?: number): boolean {
    const sourceParent = this.getNode(sourcePath);
    const destParent = this.getNode(destPath);
    if (!sourceParent || !sourceParent.children || !destParent || destParent.type !== 'folder') return false;

    const item = sourceParent.children.find(c => c.name === itemName);
    if (!item) return false;

    destParent.children = destParent.children || [];
    let newName = item.name;
    let count = 1;
    while (destParent.children.some(c => c.name === newName)) {
      const ext = newName.includes('.') ? '.' + newName.split('.').pop() : '';
      const base = ext ? newName.slice(0, -ext.length) : newName;
      newName = `${base} (Copy ${count})${ext}`;
      count++;
    }

    const cloned = deepCloneNode(item);
    cloned.name = newName;
    cloned.modified = new Date().toISOString();

    if (targetIndex !== undefined && targetIndex >= 0 && targetIndex <= destParent.children.length) {
      destParent.children.splice(targetIndex, 0, cloned);
    } else {
      destParent.children.push(cloned);
    }

    this.persist();
    return true;
  }

  createShortcutItem(sourcePath: string[], itemName: string, destPath: string[], targetIndex?: number): boolean {
    const sourceParent = this.getNode(sourcePath);
    const destParent = this.getNode(destPath);
    if (!sourceParent || !sourceParent.children || !destParent || destParent.type !== 'folder') return false;

    const item = sourceParent.children.find(c => c.name === itemName);
    if (!item) return false;

    destParent.children = destParent.children || [];
    let newName = `${item.name} - Shortcut.lnk`;
    let count = 1;
    while (destParent.children.some(c => c.name === newName)) {
      newName = `${item.name} - Shortcut (${count++}).lnk`;
    }

    const shortcutNode: FileSystemNode = {
      name: newName,
      type: 'file',
      content: JSON.stringify({
        targetPath: [...sourcePath, item.name],
        targetType: item.type,
      }),
      modified: new Date().toISOString(),
      size: 64,
    };

    if (targetIndex !== undefined && targetIndex >= 0 && targetIndex <= destParent.children.length) {
      destParent.children.splice(targetIndex, 0, shortcutNode);
    } else {
      destParent.children.push(shortcutNode);
    }

    this.persist();
    return true;
  }

  search(query: string, options?: SearchOptions): SearchResultNode[] {
    if (!query || !query.trim()) return [];
    return this.searchIndex.search(query, options);
  }

  getSearchIndex(): VfsSearchIndex {
    return this.searchIndex;
  }

  getSearchIndexStats(): IndexStats {
    return this.searchIndex.getStats();
  }

  rebuildSearchIndex(): void {
    this.searchIndex.indexTree(this.root);
  }

  exportJson(): string {
    return JSON.stringify(this.root, null, 2);
  }

  importJson(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed && typeof parsed === 'object' && parsed.name && parsed.type) {
        this.setRoot(parsed);
        return true;
      }
    } catch (e) {
      console.error('Import failed', e);
    }
    return false;
  }

  /**
   * Calculates the recursive size of a node (folder or file) and all its descendants.
   * Traverses the full sub-tree and sums file sizes, counting files and sub-folders.
   */
  calculateSubtreeSize(pathOrNode: string[] | FileSystemNode): SubtreeStats {
    const node = Array.isArray(pathOrNode) ? this.getNode(pathOrNode) : pathOrNode;
    if (!node) {
      return { size: 0, fileCount: 0, folderCount: 0 };
    }

    if (node.type === 'file') {
      const fileSize = node.size ?? (node.content ? node.content.length : 0);
      return { size: fileSize, fileCount: 1, folderCount: 0 };
    }

    let totalSize = 0;
    let fileCount = 0;
    let folderCount = 0;

    const traverse = (curr: FileSystemNode, isRoot: boolean) => {
      if (curr.type === 'file') {
        totalSize += curr.size ?? (curr.content ? curr.content.length : 0);
        fileCount++;
      } else if (curr.type === 'folder') {
        if (!isRoot) {
          folderCount++;
        }
        if (curr.children && curr.children.length > 0) {
          for (const child of curr.children) {
            traverse(child, false);
          }
        }
      }
    };

    traverse(node, true);
    return { size: totalSize, fileCount, folderCount };
  }

  /**
   * Shorthand to get the recursive byte size of a folder or file.
   */
  getFolderSize(pathOrNode: string[] | FileSystemNode): number {
    return this.calculateSubtreeSize(pathOrNode).size;
  }

  /**
   * Calculates recursive subtree stats for all folder children directly within parentPath.
   * Returns a Map of folderName -> SubtreeStats.
   */
  getChildrenFolderSizes(parentPath: string[]): Map<string, SubtreeStats> {
    const parent = this.getNode(parentPath);
    const result = new Map<string, SubtreeStats>();
    if (!parent || !parent.children) return result;

    for (const child of parent.children) {
      if (child.type === 'folder') {
        result.set(child.name, this.calculateSubtreeSize(child));
      }
    }
    return result;
  }
}

let sharedVfsInstance: VirtualFileSystem | null = null;

export function getVfsService(): VirtualFileSystem {
  if (!sharedVfsInstance) {
    sharedVfsInstance = new VirtualFileSystem();
  }
  return sharedVfsInstance;
}

export function setVfsService(vfs: VirtualFileSystem): void {
  sharedVfsInstance = vfs;
}
