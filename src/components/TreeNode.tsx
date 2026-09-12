import React, { useState } from 'react';
import {
  ChevronRight,
  ChevronDown,
  HardDrive,
  Server,
  MoreVertical,
  Layers
} from 'lucide-react';
import { FileSystemNode } from '../types';
import { FileIcon } from './FileIcon';

interface TreeNodeProps {
  node: FileSystemNode;
  path: string[];
  currentPath: string[];
  onNavigate: (path: string[]) => void;
  onContextMenu: (e: React.MouseEvent, node: FileSystemNode, path: string[]) => void;
  onDropOnNode: (destPath: string[], e: React.DragEvent) => void;
}

export const TreeNode: React.FC<TreeNodeProps> = ({
  node,
  path,
  currentPath,
  onNavigate,
  onContextMenu,
  onDropOnNode,
}) => {
  const [isOpen, setIsOpen] = useState(
    path.length <= 2 || currentPath.slice(0, path.length).join('/') === path.join('/')
  );
  const [isDragOver, setIsDragOver] = useState(false);

  const isFolder = node.type === 'folder';
  const isSelected = currentPath.join('/') === path.join('/');
  const isRoot = path.length === 1;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isFolder) {
      onNavigate(path);
      setIsOpen(true);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (isFolder) {
      e.preventDefault();
      e.stopPropagation();
      if (e.ctrlKey || e.metaKey) {
        e.dataTransfer.dropEffect = 'copy';
      } else if (e.altKey) {
        e.dataTransfer.dropEffect = 'link';
      } else {
        e.dataTransfer.dropEffect = 'move';
      }
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    if (isFolder) {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      onDropOnNode(path, e);
    }
  };

  const getNodeIcon = () => {
    if (node.isServerRoot) {
      return <Server className="w-4 h-4 text-emerald-500 flex-shrink-0" />;
    }
    if (isRoot) {
      return <HardDrive className="w-4 h-4 text-blue-500 flex-shrink-0" />;
    }
    return (
      <FileIcon
        nodeOrName={node}
        isFolder={isFolder}
        isOpen={isOpen}
        size="xs"
        className="w-4 h-4 flex-shrink-0"
      />
    );
  };

  return (
    <div className="select-none text-xs">
      <div
        onClick={handleClick}
        onContextMenu={(e) => {
          e.preventDefault();
          onContextMenu(e, node, path);
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`group flex items-center gap-1.5 py-1 px-2 rounded-md cursor-pointer transition-colors ${
          isSelected
            ? 'bg-[rgb(var(--color-accent-bg))] text-[rgb(var(--color-accent-text))] font-medium'
            : isDragOver
            ? 'bg-[rgb(var(--color-surface-hover))] ring-1 ring-blue-500'
            : 'hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-base))]'
        }`}
      >
        {isFolder && node.children && node.children.length > 0 ? (
          <button
            onClick={handleToggle}
            className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 text-[rgb(var(--color-text-subtle))]"
          >
            {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>
        ) : (
          <span className="w-4" />
        )}

        {getNodeIcon()}

        <span className="truncate flex-1">{node.name}</span>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onContextMenu(e, node, path);
          }}
          className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 text-[rgb(var(--color-text-subtle))]"
        >
          <MoreVertical className="w-3 h-3" />
        </button>
      </div>

      {isFolder && isOpen && node.children && (
        <div className="pl-3.5 ml-1.5 border-l border-[rgb(var(--color-border-base))] flex flex-col gap-0.5 mt-0.5">
          {node.children.map((child) => (
            <TreeNode
              key={child.name}
              node={child}
              path={[...path, child.name]}
              currentPath={currentPath}
              onNavigate={onNavigate}
              onContextMenu={onContextMenu}
              onDropOnNode={onDropOnNode}
            />
          ))}
        </div>
      )}
    </div>
  );
};
