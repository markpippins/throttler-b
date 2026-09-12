import React, { useState, useEffect, useRef } from 'react';
import { TreeNode } from './TreeNode';
import { FileSystemNode } from '../types';
import {
  FolderPlus,
  FilePlus,
  Edit2,
  Trash2,
  Info,
  RefreshCw,
  Star,
  Folder,
  FolderOpen,
  X,
  Sparkles
} from 'lucide-react';
import { FileIcon } from './FileIcon';

interface FolderTreeViewProps {
  rootNode: FileSystemNode;
  currentPath: string[];
  starredPaths?: string[][];
  onToggleStarPath?: (path: string[]) => void;
  onNavigate: (path: string[]) => void;
  onRefresh: () => void;
  onCreateFolder: (path: string[], name: string) => void;
  onCreateFile: (path: string[], name: string) => void;
  onRename: (path: string[], oldName: string, newName: string) => void;
  onDelete: (path: string[], name: string) => void;
  onDropOnNode: (destPath: string[], e: React.DragEvent) => void;
  onShowProperties: (path: string[], node: FileSystemNode) => void;
  onEmptyTrash?: () => void;
}

export const FolderTreeView: React.FC<FolderTreeViewProps> = ({
  rootNode,
  currentPath,
  starredPaths = [],
  onToggleStarPath,
  onNavigate,
  onRefresh,
  onCreateFolder,
  onCreateFile,
  onRename,
  onDelete,
  onDropOnNode,
  onShowProperties,
  onEmptyTrash,
}) => {
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    node: FileSystemNode;
    path: string[];
  } | null>(null);

  const [dragOverStarredIndex, setDragOverStarredIndex] = useState<number | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClose = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClose);
    return () => document.removeEventListener('mousedown', handleClose);
  }, []);

  const handleContextMenu = (e: React.MouseEvent, node: FileSystemNode, path: string[]) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      node,
      path,
    });
  };

  return (
    <div className="flex-1 overflow-y-auto p-2 select-none relative space-y-3">
      {/* Quick Access / Starred Bookmarks Section */}
      <div className="rounded-lg border border-[rgb(var(--color-border-base))] bg-[rgb(var(--color-surface-muted))]/40 p-2">
        <div className="flex items-center justify-between px-1 mb-1.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[rgb(var(--color-text-base))]">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
            <span>Quick Access</span>
          </div>
          <span className="text-[10px] text-[rgb(var(--color-text-subtle))] font-mono">
            {starredPaths.length}
          </span>
        </div>

        {starredPaths.length === 0 ? (
          <div className="px-2 py-2 text-center text-[11px] text-[rgb(var(--color-text-subtle))] border border-dashed border-[rgb(var(--color-border-base))] rounded-md">
            <span>Click the </span>
            <Star className="w-3 h-3 inline text-amber-500 fill-amber-400/40 mx-0.5 align-text-bottom" />
            <span> on the address bar to bookmark folders here</span>
          </div>
        ) : (
          <div className="space-y-0.5">
            {starredPaths.map((starPath, sIdx) => {
              const isCurrent = currentPath.join('/') === starPath.join('/');
              const folderName = starPath[starPath.length - 1] || 'Root';
              const isDragOver = dragOverStarredIndex === sIdx;

              return (
                <div
                  key={starPath.join('/') || sIdx}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (e.ctrlKey || e.metaKey) {
                      e.dataTransfer.dropEffect = 'copy';
                    } else if (e.altKey) {
                      e.dataTransfer.dropEffect = 'link';
                    } else {
                      e.dataTransfer.dropEffect = 'move';
                    }
                    setDragOverStarredIndex(sIdx);
                  }}
                  onDragLeave={() => setDragOverStarredIndex(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDragOverStarredIndex(null);
                    onDropOnNode(starPath, e);
                  }}
                  onClick={() => onNavigate(starPath)}
                  title={`/${starPath.join('/')} (Drop files to move here)`}
                  className={`group flex items-center justify-between px-2 py-1 rounded-md text-xs cursor-pointer transition-all ${
                    isDragOver
                      ? 'bg-blue-500/20 ring-2 ring-blue-500 text-blue-600 font-semibold'
                      : isCurrent
                      ? 'bg-[rgb(var(--color-accent-bg))] text-[rgb(var(--color-accent-text))] font-medium'
                      : 'hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-base))]'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <FileIcon nodeOrName={folderName} isFolder={true} size="xs" className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate text-xs">{folderName}</span>
                  </div>

                  {onToggleStarPath && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleStarPath(starPath);
                      }}
                      title="Remove from Quick Access"
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-[rgb(var(--color-text-subtle))] hover:text-red-500 hover:bg-[rgb(var(--color-surface-base))] transition-all ml-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Directory Hierarchy Tree */}
      <div className="pt-1 border-t border-[rgb(var(--color-border-base))]/60">
        <div className="px-1 mb-1 text-[10px] font-bold uppercase tracking-wider text-[rgb(var(--color-text-subtle))]">
          Directory Tree
        </div>
        <TreeNode
          node={rootNode}
          path={[rootNode.name]}
          currentPath={currentPath}
          onNavigate={onNavigate}
          onContextMenu={handleContextMenu}
          onDropOnNode={onDropOnNode}
        />
      </div>

      {contextMenu && (
        <div
          ref={menuRef}
          style={{ top: contextMenu.y, left: contextMenu.x }}
          className="fixed z-50 w-48 rounded-md shadow-2xl bg-[rgb(var(--color-surface-dialog))] border border-[rgb(var(--color-border-base))] py-1 text-xs animate-fade-in"
        >
          <div className="px-3 py-1 text-[10px] font-bold text-[rgb(var(--color-text-subtle))] truncate border-b border-[rgb(var(--color-border-base))] mb-1">
            {contextMenu.node.name}
          </div>

          {contextMenu.node.type === 'folder' && (
            <>
              {onToggleStarPath && (
                <button
                  onClick={() => {
                    onToggleStarPath(contextMenu.path);
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-base))]"
                >
                  <Star className="w-4 h-4 text-amber-500" />
                  <span>Star for Quick Access</span>
                </button>
              )}

              {contextMenu.node.type === 'folder' &&
                !contextMenu.node.isTrash &&
                contextMenu.node.name.toLowerCase() !== 'trash' && (
                  <>
                    <button
                      onClick={() => {
                        const name = prompt('Enter new folder name:');
                        if (name && name.trim()) {
                          onCreateFolder(contextMenu.path, name.trim());
                        }
                        setContextMenu(null);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-base))]"
                    >
                      <FolderPlus className="w-4 h-4 text-amber-500" />
                      <span>New Subfolder</span>
                    </button>

                    <button
                      onClick={() => {
                        const name = prompt('Enter new file name (e.g. notes.md):');
                        if (name && name.trim()) {
                          onCreateFile(contextMenu.path, name.trim());
                        }
                        setContextMenu(null);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-base))]"
                    >
                      <FilePlus className="w-4 h-4 text-blue-500" />
                      <span>New File</span>
                    </button>
                  </>
                )}
            </>
          )}

          {contextMenu.node.isTrash || contextMenu.node.name.toLowerCase() === 'trash' ? (
            onEmptyTrash && (
              <button
                onClick={() => {
                  onEmptyTrash();
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-red-500/10 text-red-500 font-medium cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Empty Trash</span>
              </button>
            )
          ) : contextMenu.path.length > 1 ? (
            <>
              <button
                onClick={() => {
                  const oldName = contextMenu.node.name;
                  const newName = prompt('Rename to:', oldName);
                  if (newName && newName.trim() && newName !== oldName) {
                    const parentPath = contextMenu.path.slice(0, -1);
                    onRename(parentPath, oldName, newName.trim());
                  }
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-base))]"
              >
                <Edit2 className="w-4 h-4 text-gray-500" />
                <span>Rename</span>
              </button>

              <button
                onClick={() => {
                  if (confirm(`Delete "${contextMenu.node.name}"?`)) {
                    const parentPath = contextMenu.path.slice(0, -1);
                    onDelete(parentPath, contextMenu.node.name);
                  }
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-[rgb(var(--color-surface-hover))] text-red-500"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            </>
          ) : null}

          <div className="border-t border-[rgb(var(--color-border-base))] my-1" />

          <button
            onClick={() => {
              onShowProperties(contextMenu.path, contextMenu.node);
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-base))]"
          >
            <Info className="w-4 h-4 text-indigo-500" />
            <span>Properties</span>
          </button>
        </div>
      )}
    </div>
  );
};
