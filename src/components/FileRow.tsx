import React, { useState } from 'react';
import {
  CheckSquare,
  Square,
  Eye,
  RotateCcw,
  Folder,
  FolderPlus,
  ShieldCheck,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import { FileSystemNode, SearchResultNode } from '../types';
import { FileIcon, getFileTypeDescription } from './FileIcon';
import { TagBadge } from './TagBadge';
import { formatFileSize } from '../utils/fileUtils';

/**
 * Normalized entity representation for surface-ui widget contract.
 * Allows FileRow to be instantiated purely from generic entity payloads.
 */
export interface FileRowEntityData {
  name: string;
  type: 'file' | 'folder';
  size?: number;
  modified?: number | string;
  tags?: string[];
  content?: string;
  originalPath?: string[];
  snippet?: string;
  path?: string[];
  governanceStatus?: 'complete' | 'drift' | 'refusal' | 'stale' | 'unattested';
}

export interface FileRowProps {
  /** The item to render (accepts FileSystemNode or normalized entity) */
  item: FileSystemNode;
  /** Row index in the current list */
  index: number;
  /** Selection state */
  isSelected: boolean;
  /** Active keyboard focus */
  isFocused?: boolean;
  /** Whether this row is currently in inline renaming mode */
  isRenaming?: boolean;
  /** Current value in the rename input */
  renameValue?: string;
  /** Whether this row is an active drag hover target */
  isHoverTarget?: boolean;
  /** Whether this row is currently being dragged */
  isDragged?: boolean;
  /** Whether the drop indicator is positioned before this row */
  isDropBefore?: boolean;
  /** Whether the drop indicator is positioned after this row */
  isDropAfter?: boolean;
  /** Folder size / file count stats if calculated */
  folderStats?: { size: number; fileCount: number; folderCount: number };
  /** Whether the container is viewing trash */
  isInTrash?: boolean;
  /** Active tag filter for highlighting matching tags */
  activeTagFilter?: string | null;
  /** Optional custom highlighted name renderer */
  renderHighlightedName?: (name: string) => React.ReactNode;
  /** Governance attestation status */
  governanceStatus?: 'complete' | 'drift' | 'refusal' | 'stale' | 'unattested';

  // --- Interaction Event Emitters (Decoupled from internal services) ---
  onSelectToggle?: (item: FileSystemNode, e: React.MouseEvent) => void;
  onClick?: (e: React.MouseEvent, item: FileSystemNode, index: number) => void;
  onDoubleClick?: (e: React.MouseEvent, item: FileSystemNode) => void;
  onContextMenu?: (e: React.MouseEvent, item: FileSystemNode) => void;
  onQuickView?: (item: FileSystemNode) => void;
  onRestore?: (item: FileSystemNode) => void;
  onTagClick?: (tag: string, e: React.MouseEvent) => void;
  onRenameChange?: (value: string) => void;
  onRenameSubmit?: () => void;
  onRenameCancel?: () => void;

  // --- Drag & Drop Event Emitters ---
  onDragStart?: (e: React.DragEvent, item: FileSystemNode) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent, item: FileSystemNode, index: number) => void;
  onDragLeave?: (e: React.DragEvent, item: FileSystemNode, index: number) => void;
  onDrop?: (e: React.DragEvent, item: FileSystemNode, index: number) => void;
}

/**
 * FileRow Component
 *
 * Standalone, harvestable relic component representing a single row in the VFS EntityCollection.
 * Decoupled from VirtualFileSystem singletons, audio drivers, or pane routing.
 */
export const FileRow: React.FC<FileRowProps> = ({
  item,
  index,
  isSelected,
  isFocused = false,
  isRenaming = false,
  renameValue = item.name,
  isHoverTarget = false,
  isDragged = false,
  isDropBefore = false,
  isDropAfter = false,
  folderStats,
  isInTrash = false,
  activeTagFilter,
  renderHighlightedName,
  governanceStatus,
  onSelectToggle,
  onClick,
  onDoubleClick,
  onContextMenu,
  onQuickView,
  onRestore,
  onTagClick,
  onRenameChange,
  onRenameSubmit,
  onRenameCancel,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
}) => {
  const searchNode = item as SearchResultNode;

  return (
    <React.Fragment key={item.name}>
      {/* Before item drop indicator line */}
      {isDropBefore && (
        <tr className="pointer-events-none">
          <td colSpan={isInTrash ? 6 : 5} className="p-0 relative h-0">
            <div className="absolute inset-x-0 -top-0.5 h-1 bg-blue-500 rounded-full z-20 shadow-[0_0_8px_rgba(59,130,246,0.9)] flex items-center justify-between">
              <div className="w-2 h-2 rounded-full bg-blue-500 ring-2 ring-white -ml-1" />
              <div className="w-2 h-2 rounded-full bg-blue-500 ring-2 ring-white -mr-1" />
            </div>
          </td>
        </tr>
      )}

      <tr
        data-item-index={index}
        role="row"
        aria-selected={isSelected}
        tabIndex={isFocused ? 0 : -1}
        draggable={!isRenaming}
        onDragStart={(e) => onDragStart?.(e, item)}
        onDragEnd={onDragEnd}
        onDragOver={(e) => onDragOver?.(e, item, index)}
        onDragLeave={(e) => onDragLeave?.(e, item, index)}
        onDrop={(e) => onDrop?.(e, item, index)}
        onClick={(e) => onClick?.(e, item, index)}
        onDoubleClick={(e) => onDoubleClick?.(e, item)}
        onContextMenu={(e) => onContextMenu?.(e, item)}
        title={
          isInTrash && item.originalPath && item.originalPath.length > 0
            ? `${item.name}\nOriginal Location: /${item.originalPath.join('/')}\nRestores to: /${item.originalPath.join('/')}/${item.name}`
            : undefined
        }
        className={`group cursor-pointer border-b border-[rgb(var(--color-border-base))]/40 transition-all ${
          isDragged
            ? 'opacity-40 bg-blue-500/10 border-dashed border-blue-400'
            : isSelected
            ? 'bg-[rgb(var(--color-accent-bg))] text-[rgb(var(--color-accent-text))] font-medium'
            : isHoverTarget
            ? 'bg-blue-500/25 ring-2 ring-blue-500 text-blue-600 font-semibold'
            : isFocused
            ? 'bg-blue-500/10 text-[rgb(var(--color-text-base))]'
            : 'hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-base))]'
        } ${
          isFocused
            ? 'ring-2 ring-blue-500 ring-offset-1 ring-offset-[rgb(var(--color-surface-base))] relative z-10'
            : ''
        }`}
      >
        {/* Selection Checkbox */}
        <td className="py-2 pl-2 w-8 text-center select-none" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={(e) => onSelectToggle?.(item, e)}
            title={isSelected ? 'Deselect item' : 'Select item'}
            className="p-1 rounded hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-subtle))] hover:text-[rgb(var(--color-text-base))] transition-colors inline-flex items-center justify-center cursor-pointer"
          >
            {isSelected ? (
              <CheckSquare className="w-3.5 h-3.5 text-blue-500" />
            ) : (
              <Square className="w-3.5 h-3.5 opacity-30 group-hover:opacity-75" />
            )}
          </button>
        </td>

        {/* Name, Icon, Tags, and Quick View */}
        <td className="py-2 pl-1 flex items-center gap-2">
          <FileIcon
            nodeOrName={item}
            isFolder={item.type === 'folder'}
            size="sm"
            className="w-4 h-4 flex-shrink-0"
          />

          {isRenaming ? (
            <input
              type="text"
              autoFocus
              value={renameValue}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => onRenameChange?.(e.target.value)}
              onBlur={onRenameSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onRenameSubmit?.();
                if (e.key === 'Escape') onRenameCancel?.();
              }}
              className="px-1 py-0.5 bg-[rgb(var(--color-surface-input))] border border-[rgb(var(--color-border-input))] rounded text-xs text-[rgb(var(--color-text-base))] outline-none"
            />
          ) : (
            <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
              <span className="truncate max-w-xs" title={item.name}>
                {renderHighlightedName ? renderHighlightedName(item.name) : item.name}
              </span>

              {/* Optional Governance Attestation Indicator */}
              {governanceStatus && (
                <span
                  className={`inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[9px] font-semibold border ${
                    governanceStatus === 'complete'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                      : governanceStatus === 'refusal'
                      ? 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                      : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                  }`}
                  title={`Governance: ${governanceStatus}`}
                >
                  {governanceStatus === 'complete' ? (
                    <ShieldCheck className="w-2.5 h-2.5 text-emerald-500" />
                  ) : governanceStatus === 'refusal' ? (
                    <XCircle className="w-2.5 h-2.5 text-rose-500" />
                  ) : (
                    <AlertTriangle className="w-2.5 h-2.5 text-amber-500" />
                  )}
                  <span>{governanceStatus}</span>
                </span>
              )}

              {/* Tags */}
              {item.tags && item.tags.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap flex-shrink-0">
                  {item.tags.map((tag) => (
                    <TagBadge
                      key={tag}
                      tag={tag}
                      size="xs"
                      onClick={(e) => onTagClick?.(tag, e)}
                      active={activeTagFilter?.toLowerCase() === tag.toLowerCase()}
                    />
                  ))}
                </div>
              )}

              {/* Search Result Path */}
              {!isInTrash && searchNode.path && (
                <span
                  className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-300 font-mono flex-shrink-0"
                  title={`Location: /${searchNode.path.join('/')}`}
                >
                  <Folder className="w-2.5 h-2.5 text-blue-400" />
                  <span className="truncate max-w-[130px]">/{searchNode.path.slice(0, -1).join('/')}</span>
                </span>
              )}

              {/* Search Result Snippet */}
              {searchNode.snippet && (
                <span
                  className="text-[10px] text-amber-600 dark:text-amber-400/90 truncate max-w-[180px] italic hidden sm:inline"
                  title={searchNode.snippet}
                >
                  "{searchNode.snippet}"
                </span>
              )}

              {/* Trash Original Location */}
              {!isInTrash && item.originalPath && (
                <span
                  className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 font-mono flex-shrink-0"
                  title={`Original location: /${item.originalPath.join('/')}`}
                >
                  <RotateCcw className="w-2.5 h-2.5 text-amber-500" />
                  <span className="truncate max-w-[120px]">/{item.originalPath.join('/')}</span>
                </span>
              )}

              {/* Quick View Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onQuickView?.(item);
                }}
                title={`Quick View "${item.name}" (Space)`}
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-subtle))] hover:text-[rgb(var(--color-accent-text))] transition-opacity cursor-pointer flex-shrink-0"
              >
                <Eye className="w-3.5 h-3.5" />
              </button>

              {/* Move into folder badge indicator */}
              {isHoverTarget && (
                <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.2 rounded bg-blue-600 text-white font-medium shadow-sm">
                  <FolderPlus className="w-3 h-3" />
                  Move into folder
                </span>
              )}
            </div>
          )}
        </td>

        {/* Trash Original Path Column */}
        {isInTrash && (
          <td
            className="py-2 text-[11px] text-[rgb(var(--color-text-muted))] font-mono max-w-[220px]"
            title={
              item.originalPath && item.originalPath.length > 0
                ? `Original Location: /${item.originalPath.join('/')}\nRestores to: /${item.originalPath.join('/')}/${item.name}`
                : 'Original location not recorded'
            }
          >
            {item.originalPath && item.originalPath.length > 0 ? (
              <div className="flex items-center gap-1.5 group/path">
                <span className="truncate text-amber-700 dark:text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded text-[10px] border border-amber-500/20 max-w-[170px] inline-block font-medium">
                  /{item.originalPath.join('/')}
                </span>
                {onRestore && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRestore(item);
                    }}
                    title={`Restore "${item.name}" back to /${item.originalPath.join('/')}`}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 transition-opacity cursor-pointer flex-shrink-0"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                )}
              </div>
            ) : (
              <span className="text-[rgb(var(--color-text-subtle))]">--</span>
            )}
          </td>
        )}

        {/* Date Modified */}
        <td className="py-2 text-[rgb(var(--color-text-muted))] text-[11px]">
          {item.modified ? new Date(item.modified).toLocaleDateString() : '--'}
        </td>

        {/* File Type Description */}
        <td
          className="py-2 text-[rgb(var(--color-text-muted))] text-[11px] truncate max-w-[140px]"
          title={
            item.type === 'folder' && folderStats
              ? `Folder (${folderStats.fileCount} ${folderStats.fileCount === 1 ? 'file' : 'files'}, ${folderStats.folderCount} subfolders)`
              : getFileTypeDescription(item)
          }
        >
          {getFileTypeDescription(item)}
        </td>

        {/* File Size */}
        <td
          className="py-2 pr-2 text-right text-[rgb(var(--color-text-muted))] text-[11px] font-mono tabular-nums"
          title={
            item.type === 'folder'
              ? folderStats
                ? `${item.name}: ${formatFileSize(folderStats.size, { detailed: true })}\n${folderStats.fileCount} ${folderStats.fileCount === 1 ? 'file' : 'files'}${folderStats.folderCount > 0 ? `, ${folderStats.folderCount} subfolders` : ''}`
                : 'Folder'
              : formatFileSize(item.size, { detailed: true })
          }
        >
          {item.type === 'file'
            ? formatFileSize(item.size)
            : folderStats
            ? formatFileSize(folderStats.size)
            : '--'}
        </td>
      </tr>

      {/* After item drop indicator line */}
      {isDropAfter && (
        <tr className="pointer-events-none">
          <td colSpan={isInTrash ? 6 : 5} className="p-0 relative h-0">
            <div className="absolute inset-x-0 -bottom-0.5 h-1 bg-blue-500 rounded-full z-20 shadow-[0_0_8px_rgba(59,130,246,0.9)] flex items-center justify-between">
              <div className="w-2 h-2 rounded-full bg-blue-500 ring-2 ring-white -ml-1" />
              <div className="w-2 h-2 rounded-full bg-blue-500 ring-2 ring-white -mr-1" />
            </div>
          </td>
        </tr>
      )}
    </React.Fragment>
  );
};
