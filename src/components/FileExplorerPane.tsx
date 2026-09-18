import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  Folder,
  FolderOpen,
  FileText,
  FileCode,
  Image as ImageIcon,
  Layers,
  MoreVertical,
  Edit2,
  Trash2,
  Copy,
  Scissors,
  Share2,
  Info,
  FolderPlus,
  FilePlus,
  ExternalLink,
  Eye,
  ArrowUpRight,
  Search,
  SearchX,
  MoveRight,
  ArrowDownUp,
  ArrowUp,
  ArrowDown,
  CheckSquare,
  Square,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  Tag,
  Check,
  Minus,
  Plus,
  X,
  RotateCcw,
} from 'lucide-react';
import {
  FileSystemNode,
  DisplayMode,
  SortCriteria,
  SortRule,
  SortKey,
  FileTransferObject,
  FileGroupCategory,
  SubtreeStats,
  SearchResultNode,
} from '../types';
import { FileIcon, getFileTypeDescription } from './FileIcon';
import { SoundService } from '../services/soundService';
import { VirtualFileSystem, getVfsService } from '../services/fileSystemService';
import { formatFileSize } from '../utils/fileUtils';
import { groupItemsByType, GroupedItemsSection, CATEGORY_META } from '../utils/fileGrouping';
import { QuickView } from './QuickView';
import { TagBadge } from './TagBadge';
import { PRESET_TAGS, getTagStyle, matchesFilter, parseFilterQuery } from '../utils/tagUtils';
import { FileRow } from './FileRow';

interface FileExplorerPaneProps {
  paneId: number;
  isActive: boolean;
  currentPath: string[];
  items: FileSystemNode[];
  displayMode: DisplayMode;
  sortCriteria: SortCriteria;
  filterQuery: string;
  activeTagFilter?: string | null;
  onTagFilterChange?: (tag: string | null) => void;
  selectedItems: Set<string>;
  onSelectItems: (items: Set<string>) => void;
  onActivate: () => void;
  onNavigate: (newPath: string[]) => void;
  onOpenFile: (file: FileSystemNode, path: string[]) => void;
  onCreateFolder: (name: string) => void;
  onCreateFile: (name: string) => void;
  onRename: (oldName: string, newName: string) => void;
  onDelete: (names: string[]) => void;
  onCut: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onShare: (item: FileSystemNode) => void;
  onShowProperties: (item: FileSystemNode) => void;
  onMoveItems: (sourceNames: string[], destPath: string[], sourcePath?: string[], targetIndex?: number) => void;
  onCopyItems?: (sourceNames: string[], destPath: string[], sourcePath?: string[], targetIndex?: number) => void;
  onCreateShortcuts?: (sourceNames: string[], destPath: string[], sourcePath?: string[], targetIndex?: number) => void;
  onRequestDropMenu?: (sourceNames: string[], destPath: string[], sourcePath: string[], targetIndex?: number, coords?: { x: number; y: number }) => void;
  onDropItems?: (
    sourceNames: string[],
    destPath: string[],
    sourcePath?: string[],
    targetIndex?: number,
    eventOptions?: { ctrlKey: boolean; metaKey: boolean; altKey: boolean; button: number; clientX: number; clientY: number }
  ) => void;
  onUpload: (files: FileList) => void;
  onClearFilter?: () => void;
  onSortChange?: (sort: SortCriteria) => void;
  groupByType?: boolean;
  onToggleGroupByType?: () => void;
  vfsService?: VirtualFileSystem;
  onEmptyTrash?: () => void;
  onRestore?: (names?: string[]) => void;
  onBatchTag?: (
    itemNames: string[],
    tag: string,
    action?: 'add' | 'remove' | 'toggle' | 'clear'
  ) => void;
}

interface MarqueeState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  isActive: boolean;
  initialSelected: Set<string>;
  modifier: 'none' | 'shift' | 'ctrl';
}

export const FileExplorerPane: React.FC<FileExplorerPaneProps> = ({
  paneId,
  isActive,
  currentPath,
  items,
  displayMode,
  sortCriteria,
  filterQuery,
  selectedItems,
  onSelectItems,
  onActivate,
  onNavigate,
  onOpenFile,
  onCreateFolder,
  onCreateFile,
  onRename,
  onDelete,
  onCut,
  onCopy,
  onPaste,
  onShare,
  onShowProperties,
  onMoveItems,
  onCopyItems,
  onCreateShortcuts,
  onRequestDropMenu,
  onDropItems,
  onUpload,
  activeTagFilter = null,
  onTagFilterChange,
  onClearFilter,
  onSortChange,
  groupByType = false,
  onToggleGroupByType,
  vfsService,
  onEmptyTrash,
  onRestore,
  onBatchTag,
}) => {
  const isInTrash = useMemo(() => {
    if (vfsService) {
      return vfsService.isTrashPath(currentPath);
    }
    return (
      currentPath.length > 0 &&
      (currentPath[0].toLowerCase() === 'trash' ||
        currentPath[currentPath.length - 1].toLowerCase() === 'trash')
    );
  }, [vfsService, currentPath]);

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    targetItem: FileSystemNode | null;
  } | null>(null);
  const [showTagSubmenu, setShowTagSubmenu] = useState(false);
  const [isAddingCustomTag, setIsAddingCustomTag] = useState(false);
  const [customTagInput, setCustomTagInput] = useState('');

  const [collapsedGroups, setCollapsedGroups] = useState<Set<FileGroupCategory>>(new Set());

  const toggleGroupCollapse = (cat: FileGroupCategory) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const handleSelectGroup = (e: React.MouseEvent, groupItems: FileSystemNode[]) => {
    e.stopPropagation();
    onActivate();
    const groupNames = groupItems.map((it) => it.name);
    const allSelected = groupNames.length > 0 && groupNames.every((n) => selectedItems.has(n));
    const next = new Set(selectedItems);
    if (allSelected) {
      groupNames.forEach((n) => next.delete(n));
    } else {
      groupNames.forEach((n) => next.add(n));
    }
    onSelectItems(next);
    SoundService.playFileSelect();
  };

  const [renamingItem, setRenamingItem] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [isDragOverPane, setIsDragOverPane] = useState(false);
  const [hoveredDropTarget, setHoveredDropTarget] = useState<string | null>(null);
  const [dropInsertTarget, setDropInsertTarget] = useState<{ index: number; position: 'before' | 'after' } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedItems, setDraggedItems] = useState<Set<string>>(new Set());
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const [anchorIndex, setAnchorIndex] = useState<number>(0);

  // Quick View (Lightweight In-Pane File Preview) state
  const [quickViewItem, setQuickViewItem] = useState<FileSystemNode | null>(null);
  const [isQuickViewDocked, setIsQuickViewDocked] = useState<boolean>(false);

  // When docked, auto-sync preview to selected item
  useEffect(() => {
    if (isQuickViewDocked && selectedItems.size === 1) {
      const selectedName = Array.from(selectedItems)[0];
      const target = items.find((it) => it.name === selectedName);
      if (target) {
        setQuickViewItem(target);
      }
    }
  }, [selectedItems, isQuickViewDocked, items]);

  // If active quick view item is removed or folder changed, sync appropriately
  useEffect(() => {
    if (quickViewItem) {
      const stillExists = items.find((it) => it.name === quickViewItem.name);
      if (!stillExists) {
        setQuickViewItem(null);
      } else if (stillExists !== quickViewItem) {
        setQuickViewItem(stillExists);
      }
    }
  }, [items, currentPath]);

  // Marquee (lasso) selection state
  const [marquee, setMarquee] = useState<MarqueeState | null>(null);
  const marqueeRef = useRef<MarqueeState | null>(null);
  marqueeRef.current = marquee;
  const isMarqueeDraggingRef = useRef(false);
  const lastLassoCountRef = useRef(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const itemsContainerRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const selectedItemsRef = useRef(selectedItems);
  selectedItemsRef.current = selectedItems;

  const closeContextMenu = () => {
    setContextMenu(null);
    setShowTagSubmenu(false);
    setIsAddingCustomTag(false);
    setCustomTagInput('');
  };

  useEffect(() => {
    const handleClose = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        closeContextMenu();
      }
    };
    document.addEventListener('mousedown', handleClose);
    return () => document.removeEventListener('mousedown', handleClose);
  }, []);

  // Targeted items for context menu operations (single item or multi-item batch selection)
  const contextTargetNames = React.useMemo(() => {
    if (!contextMenu) return [];
    if (contextMenu.targetItem) {
      if (selectedItems.has(contextMenu.targetItem.name) && selectedItems.size > 1) {
        return Array.from(selectedItems);
      }
      return [contextMenu.targetItem.name];
    }
    if (selectedItems.size > 0) {
      return Array.from(selectedItems);
    }
    return [];
  }, [contextMenu, selectedItems]);

  const contextTargetNodes = React.useMemo(() => {
    if (contextTargetNames.length === 0) return [];
    const nameSet = new Set(contextTargetNames);
    return items.filter((it) => nameSet.has(it.name));
  }, [items, contextTargetNames]);

  const contextHasAnyTags = React.useMemo(() => {
    return contextTargetNodes.some((n) => n.tags && n.tags.length > 0);
  }, [contextTargetNodes]);

  const handleApplyBatchTag = (
    tag: string,
    action: 'add' | 'remove' | 'toggle' | 'clear' = 'toggle'
  ) => {
    if (contextTargetNames.length === 0) return;
    if (onBatchTag) {
      onBatchTag(contextTargetNames, tag, action);
    } else {
      activeVfs.batchTagItems(currentPath, contextTargetNames, action, tag);
    }
    SoundService.playFileSelect();
    closeContextMenu();
  };

  // Multi-column sort resolution helper
  const getSortRuleForColumn = (key: SortKey) => {
    if (sortCriteria.key === key) {
      return {
        isActive: true,
        direction: sortCriteria.direction || 'asc',
        rank: 1,
        isPrimary: true,
      };
    }
    if (sortCriteria.secondary && sortCriteria.secondary.length > 0) {
      const secIdx = sortCriteria.secondary.findIndex((r) => r.key === key);
      if (secIdx >= 0) {
        return {
          isActive: true,
          direction: sortCriteria.secondary[secIdx].direction || 'asc',
          rank: secIdx + 2,
          isPrimary: false,
        };
      }
    }
    return {
      isActive: false,
      direction: 'asc' as const,
      rank: 0,
      isPrimary: false,
    };
  };

  // Header click handler with Shift+Click secondary sort support
  const handleHeaderSortClick = (key: SortKey, e: React.MouseEvent) => {
    if (!onSortChange) return;

    if (e.shiftKey) {
      // Shift+Click: Multi-column sorting
      if (sortCriteria.key === key) {
        // Toggling primary sort direction while preserving secondary criteria
        const nextDir = sortCriteria.direction === 'asc' ? 'desc' : 'asc';
        onSortChange({
          ...sortCriteria,
          direction: nextDir,
        });
      } else {
        const existingSecondary = sortCriteria.secondary ? [...sortCriteria.secondary] : [];
        const secIdx = existingSecondary.findIndex((r) => r.key === key);

        if (secIdx >= 0) {
          // Toggle direction of this secondary criterion
          const currentRule = existingSecondary[secIdx];
          const nextDir = currentRule.direction === 'asc' ? 'desc' : 'asc';
          existingSecondary[secIdx] = { ...currentRule, direction: nextDir };
          onSortChange({
            ...sortCriteria,
            secondary: existingSecondary,
          });
        } else {
          // Append as a new secondary sort criterion
          onSortChange({
            ...sortCriteria,
            secondary: [...existingSecondary, { key, direction: 'asc' }],
          });
        }
      }
    } else {
      // Standard Click: Set sole primary sort and clear secondary criteria
      const isSame = sortCriteria.key === key;
      const nextDir = isSame && sortCriteria.direction === 'asc' ? 'desc' : 'asc';
      onSortChange({ key, direction: nextDir, secondary: undefined });
    }
    SoundService.playFileSelect();
  };

  const activeVfs = vfsService || getVfsService();

  // Calculate and cache recursive sub-tree sizes for folders, fetching from the VFS service
  const folderSizes = React.useMemo<Map<string, SubtreeStats>>(() => {
    const map = new Map<string, SubtreeStats>();
    if (!activeVfs) return map;

    for (const item of items) {
      if (item.type === 'folder') {
        const fullPath = [...currentPath, item.name];
        // Fetch sub-tree size directly from the VFS service
        const stats = activeVfs.calculateSubtreeSize(fullPath);
        map.set(item.name, stats);
      }
    }
    return map;
  }, [items, currentPath, activeVfs]);

  // Sort and filter items with primary and secondary criteria
  const filteredAndSortedItems = React.useMemo(() => {
    let list = [...items];

    // Filter (supports text search, search modifiers like tag:urgent / #work, and tag dropdown filter)
    if (filterQuery.trim() || activeTagFilter) {
      list = list.filter((it) => matchesFilter(it, filterQuery, activeTagFilter));
    }

    // Active sort rules chain (Primary followed by unique Secondary rules)
    const activeSortRules: SortRule[] = [
      { key: sortCriteria.key, direction: sortCriteria.direction || 'asc' },
      ...(sortCriteria.secondary || []).filter((r) => r.key !== sortCriteria.key),
    ];

    // Sort
    list.sort((a, b) => {
      // Folders always first unless sorting by size/type
      if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1;
      }

      for (const rule of activeSortRules) {
        let cmp = 0;
        if (rule.key === 'name') {
          cmp = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
        } else if (rule.key === 'modified') {
          const timeA = a.modified ? new Date(a.modified).getTime() || 0 : 0;
          const timeB = b.modified ? new Date(b.modified).getTime() || 0 : 0;
          if (timeA && timeB) {
            cmp = timeA - timeB;
          } else {
            cmp = (a.modified || '').localeCompare(b.modified || '');
          }
        } else if (rule.key === 'size') {
          const sizeA = a.type === 'file' ? (a.size || 0) : (folderSizes.get(a.name)?.size || 0);
          const sizeB = b.type === 'file' ? (b.size || 0) : (folderSizes.get(b.name)?.size || 0);
          cmp = sizeA - sizeB;
        } else if (rule.key === 'type') {
          const extA = a.name.includes('.') ? a.name.split('.').pop()!.toLowerCase() : '';
          const extB = b.name.includes('.') ? b.name.split('.').pop()!.toLowerCase() : '';
          cmp = extA.localeCompare(extB);
        } else if (rule.key === 'originalPath') {
          const pathA = a.originalPath ? a.originalPath.join('/') : '';
          const pathB = b.originalPath ? b.originalPath.join('/') : '';
          cmp = pathA.localeCompare(pathB, undefined, { numeric: true, sensitivity: 'base' });
        }

        if (cmp !== 0) {
          return rule.direction === 'asc' ? cmp : -cmp;
        }
      }

      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    });

    return list;
  }, [items, filterQuery, activeTagFilter, sortCriteria, folderSizes]);

  // Grouped sections for when groupByType is enabled
  const groupedSections = React.useMemo(() => {
    if (!groupByType) return null;
    return groupItemsByType(filteredAndSortedItems, true);
  }, [groupByType, filteredAndSortedItems]);

  // Total visible bytes accounting for recursive folder sub-tree sizes
  const totalVisibleBytesText = React.useMemo(() => {
    if (filteredAndSortedItems.length === 0) return '';
    let total = 0;
    for (const it of filteredAndSortedItems) {
      if (it.type === 'file') {
        total += it.size || 0;
      } else if (it.type === 'folder') {
        total += folderSizes.get(it.name)?.size || 0;
      }
    }
    return formatFileSize(total);
  }, [filteredAndSortedItems, folderSizes]);

  // Total bytes of currently selected items (files + recursive folders)
  const selectedBytesText = React.useMemo(() => {
    if (selectedItems.size === 0) return '';
    let total = 0;
    for (const it of filteredAndSortedItems) {
      if (selectedItems.has(it.name)) {
        if (it.type === 'file') {
          total += it.size || 0;
        } else if (it.type === 'folder') {
          total += folderSizes.get(it.name)?.size || 0;
        }
      }
    }
    return formatFileSize(total);
  }, [selectedItems, filteredAndSortedItems, folderSizes]);

  // Reset focus and anchor when path changes
  useEffect(() => {
    setFocusedIndex(0);
    setAnchorIndex(0);
    setRenamingItem(null);
  }, [currentPath]);

  // Keep focusedIndex within valid bounds when items or filters change
  useEffect(() => {
    if (filteredAndSortedItems.length === 0) {
      setFocusedIndex(0);
      setAnchorIndex(0);
    } else if (focusedIndex >= filteredAndSortedItems.length) {
      setFocusedIndex(filteredAndSortedItems.length - 1);
    }
  }, [filteredAndSortedItems.length, focusedIndex]);

  // Sync focused index if single selection from outside
  useEffect(() => {
    if (selectedItems.size === 1) {
      const selectedName = Array.from(selectedItems)[0];
      const idx = filteredAndSortedItems.findIndex((it) => it.name === selectedName);
      if (idx !== -1 && idx !== focusedIndex) {
        setFocusedIndex(idx);
      }
    }
  }, [selectedItems, filteredAndSortedItems, focusedIndex]);

  // Auto-scroll focused item into view
  useEffect(() => {
    if (isActive && focusedIndex >= 0 && itemsContainerRef.current) {
      const el = itemsContainerRef.current.querySelector(`[data-item-index="${focusedIndex}"]`);
      if (el) {
        (el as HTMLElement).scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }
    }
  }, [focusedIndex, isActive]);

  // Click Selection Logic: Supports Shift (range), Ctrl/Cmd (toggle), Ctrl+Shift (range additive)
  const handleItemClick = (e: React.MouseEvent, item: FileSystemNode, index: number) => {
    e.stopPropagation();
    onActivate();

    const isCtrlOrCmd = e.ctrlKey || e.metaKey;
    const isShift = e.shiftKey;
    const total = filteredAndSortedItems.length;

    if (isShift && isCtrlOrCmd) {
      // Ctrl/Cmd + Shift + Click: Add range between anchor and current index to the existing selection
      const names = filteredAndSortedItems.map((it) => it.name);
      const anchor =
        anchorIndex !== null && anchorIndex >= 0 && anchorIndex < total
          ? anchorIndex
          : focusedIndex >= 0 && focusedIndex < total
          ? focusedIndex
          : 0;
      const min = Math.min(anchor, index);
      const max = Math.max(anchor, index);
      const rangeNames = names.slice(min, max + 1);

      const next = new Set(selectedItems);
      rangeNames.forEach((n) => next.add(n));
      onSelectItems(next);
      setFocusedIndex(index);
      // Keep anchorIndex unchanged so subsequent Shift-clicks extend from the same anchor
    } else if (isShift) {
      // Shift + Click: Select continuous range between anchor and current index
      const names = filteredAndSortedItems.map((it) => it.name);
      const anchor =
        anchorIndex !== null && anchorIndex >= 0 && anchorIndex < total
          ? anchorIndex
          : focusedIndex >= 0 && focusedIndex < total
          ? focusedIndex
          : 0;
      const min = Math.min(anchor, index);
      const max = Math.max(anchor, index);
      const rangeNames = names.slice(min, max + 1);

      onSelectItems(new Set(rangeNames));
      setFocusedIndex(index);
      SoundService.playFileSelect();
      // Keep anchorIndex unchanged so subsequent Shift-clicks extend from the same anchor
    } else if (isCtrlOrCmd) {
      // Ctrl/Cmd + Click: Toggle individual item selection without clearing others
      const next = new Set(selectedItems);
      if (next.has(item.name)) {
        next.delete(item.name);
      } else {
        next.add(item.name);
      }
      onSelectItems(next);
      setFocusedIndex(index);
      setAnchorIndex(index);
      SoundService.playFileSelect();
    } else {
      // Normal Click: Single selection
      onSelectItems(new Set([item.name]));
      setFocusedIndex(index);
      setAnchorIndex(index);
      SoundService.playFileSelect();
    }
  };

  // Select all / Deselect all items in the current view
  const handleSelectAll = () => {
    const allNames = filteredAndSortedItems.map((it) => it.name);
    if (allNames.length === 0) return;
    const isAllSelected =
      allNames.length > 0 && allNames.every((n) => selectedItems.has(n));
    if (isAllSelected) {
      onSelectItems(new Set());
      SoundService.playFileSelect();
    } else {
      onSelectItems(new Set(allNames));
      SoundService.playMarqueeComplete(allNames.length);
    }
  };

  // Marquee (lasso) selection: Start on empty space in container
  const handleContainerMouseDown = (e: React.MouseEvent) => {
    // Only primary left button
    if (e.button !== 0) return;

    // Check if target or any ancestor is an interactive element or item card/row
    const target = e.target as HTMLElement;
    if (
      target.closest('input') ||
      target.closest('button') ||
      target.closest('a') ||
      target.closest('[data-item-index]') ||
      target.closest('[data-no-marquee]')
    ) {
      return;
    }

    onActivate();

    const isShift = e.shiftKey;
    const isCtrlOrCmd = e.ctrlKey || e.metaKey;
    const modifier: 'none' | 'shift' | 'ctrl' = isShift ? 'shift' : isCtrlOrCmd ? 'ctrl' : 'none';

    const initialState: MarqueeState = {
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY,
      isActive: false,
      initialSelected: new Set(selectedItems),
      modifier,
    };

    setMarquee(initialState);
    marqueeRef.current = initialState;
    isMarqueeDraggingRef.current = false;
    lastLassoCountRef.current = 0;
  };

  // Marquee mousemove / mouseup window listeners
  useEffect(() => {
    if (!marquee) return;

    const handleWindowMouseMove = (e: MouseEvent) => {
      const current = marqueeRef.current;
      if (!current) return;

      const dx = e.clientX - current.startX;
      const dy = e.clientY - current.startY;
      const dist = Math.hypot(dx, dy);

      const becameActive = !current.isActive && dist >= 4;
      const isActive = current.isActive || dist >= 4;
      if (isActive) {
        isMarqueeDraggingRef.current = true;
      }

      if (becameActive) {
        SoundService.playMarqueeStart();
      }

      const updated: MarqueeState = {
        ...current,
        currentX: e.clientX,
        currentY: e.clientY,
        isActive,
      };
      marqueeRef.current = updated;
      setMarquee(updated);

      if (isActive) {
        // Auto scroll container when lasso dragging near boundaries
        if (itemsContainerRef.current) {
          const containerRect = itemsContainerRef.current.getBoundingClientRect();
          const topEdgeDist = e.clientY - containerRect.top;
          const bottomEdgeDist = containerRect.bottom - e.clientY;

          if (topEdgeDist < 40 && topEdgeDist > -20) {
            itemsContainerRef.current.scrollTop -= Math.max(4, Math.round((40 - topEdgeDist) / 2));
          } else if (bottomEdgeDist < 40 && bottomEdgeDist > -20) {
            itemsContainerRef.current.scrollTop += Math.max(4, Math.round((40 - bottomEdgeDist) / 2));
          }
        }

        // Calculate intersection in viewport client coordinates
        const l = Math.min(current.startX, e.clientX);
        const t = Math.min(current.startY, e.clientY);
        const r = Math.max(current.startX, e.clientX);
        const b = Math.max(current.startY, e.clientY);

        const lassoedNames = new Set<string>();
        if (itemsContainerRef.current) {
          const itemElements = itemsContainerRef.current.querySelectorAll('[data-item-index]');
          itemElements.forEach((el) => {
            const rect = el.getBoundingClientRect();
            const intersects = !(rect.right < l || rect.left > r || rect.bottom < t || rect.top > b);
            if (intersects) {
              const idxStr = el.getAttribute('data-item-index');
              if (idxStr !== null) {
                const itemIdx = parseInt(idxStr, 10);
                const node = filteredAndSortedItems[itemIdx];
                if (node) {
                  lassoedNames.add(node.name);
                }
              }
            }
          });
        }

        // Play subtle tactile pop when selection set changes
        if (lassoedNames.size !== lastLassoCountRef.current) {
          SoundService.playItemHoverSelect(lassoedNames.size);
          lastLassoCountRef.current = lassoedNames.size;
        }

        if (current.modifier === 'shift') {
          const next = new Set(current.initialSelected);
          lassoedNames.forEach((name) => next.add(name));
          onSelectItems(next);
        } else if (current.modifier === 'ctrl') {
          const next = new Set(current.initialSelected);
          lassoedNames.forEach((name) => {
            if (current.initialSelected.has(name)) {
              next.delete(name);
            } else {
              next.add(name);
            }
          });
          onSelectItems(next);
        } else {
          onSelectItems(lassoedNames);
        }
      }
    };

    const handleWindowMouseUp = () => {
      const current = marqueeRef.current;
      if (current) {
        if (current.isActive) {
          SoundService.playMarqueeComplete(selectedItems.size);
        } else if (current.modifier === 'none') {
          // Pure click without dragging: clear selection if no modifier
          onSelectItems(new Set());
        }
      }
      setMarquee(null);
      marqueeRef.current = null;
      setTimeout(() => {
        isMarqueeDraggingRef.current = false;
      }, 50);
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [filteredAndSortedItems, marquee?.startX, marquee?.startY, marquee?.modifier, onSelectItems]);

  // Compute visual bounds of marquee rectangle relative to containerRef
  const getMarqueeBounds = () => {
    if (!marquee || !marquee.isActive || !containerRef.current) return null;
    const containerRect = containerRef.current.getBoundingClientRect();

    const clientLeft = Math.min(marquee.startX, marquee.currentX);
    const clientTop = Math.min(marquee.startY, marquee.currentY);
    const clientRight = Math.max(marquee.startX, marquee.currentX);
    const clientBottom = Math.max(marquee.startY, marquee.currentY);

    const left = Math.max(0, clientLeft - containerRect.left);
    const top = Math.max(0, clientTop - containerRect.top);
    const width = Math.min(containerRect.width - left, clientRight - clientLeft);
    const height = Math.min(containerRect.height - top, clientBottom - clientTop);

    return { left, top, width, height };
  };

  // Keyboard navigation on active pane
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.tagName === 'SELECT' ||
          (activeEl as HTMLElement).isContentEditable);
      if (isInput || renamingItem) return;

      const total = filteredAndSortedItems.length;
      if (total === 0) return;

      const currentFocus = focusedIndex >= 0 && focusedIndex < total ? focusedIndex : 0;

      const getGridCols = () => {
        if (displayMode === 'list') return 1;
        const itemEls = itemsContainerRef.current?.querySelectorAll('[data-item-index]');
        if (!itemEls || itemEls.length < 2) return 1;
        const firstTop = (itemEls[0] as HTMLElement).offsetTop;
        let cols = 0;
        for (let i = 0; i < itemEls.length; i++) {
          const el = itemEls[i] as HTMLElement;
          if (Math.abs(el.offsetTop - firstTop) <= 6) {
            cols++;
          } else {
            break;
          }
        }
        return Math.max(1, cols);
      };

      let targetIndex: number | null = null;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const cols = getGridCols();
        targetIndex = Math.min(currentFocus + cols, total - 1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const cols = getGridCols();
        targetIndex = Math.max(currentFocus - cols, 0);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        targetIndex = Math.min(currentFocus + 1, total - 1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        targetIndex = Math.max(currentFocus - 1, 0);
      } else if (e.key === 'Home') {
        e.preventDefault();
        targetIndex = 0;
      } else if (e.key === 'End') {
        e.preventDefault();
        targetIndex = total - 1;
      } else if (e.key === 'PageDown') {
        e.preventDefault();
        const cols = getGridCols();
        targetIndex = Math.min(currentFocus + cols * 4, total - 1);
      } else if (e.key === 'PageUp') {
        e.preventDefault();
        const cols = getGridCols();
        targetIndex = Math.max(currentFocus - cols * 4, 0);
      } else if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        if (quickViewItem) {
          // If quick view is active, Space closes it
          setQuickViewItem(null);
          SoundService.playFileSelect();
          return;
        }
        if (e.shiftKey) {
          // Shift + Space: Select range from anchor to focused
          const anchor =
            anchorIndex !== null && anchorIndex >= 0 && anchorIndex < total ? anchorIndex : currentFocus;
          const min = Math.min(anchor, currentFocus);
          const max = Math.max(anchor, currentFocus);
          const rangeNames = filteredAndSortedItems.slice(min, max + 1).map((it) => it.name);
          if (e.ctrlKey || e.metaKey) {
            const next = new Set(selectedItems);
            rangeNames.forEach((n) => next.add(n));
            onSelectItems(next);
          } else {
            onSelectItems(new Set(rangeNames));
          }
          SoundService.playFileSelect();
        } else if (e.ctrlKey || e.metaKey) {
          // Ctrl + Space: Toggle current focused item in/out of selection
          const itemToToggle = filteredAndSortedItems[currentFocus];
          if (itemToToggle) {
            const next = new Set(selectedItems);
            if (next.has(itemToToggle.name)) {
              next.delete(itemToToggle.name);
            } else {
              next.add(itemToToggle.name);
            }
            onSelectItems(next);
            setAnchorIndex(currentFocus);
            SoundService.playFileSelect();
          }
        } else {
          // Plain Space: Open Quick View for the focused item (or selected item)
          const target =
            selectedItems.size === 1
              ? items.find((it) => selectedItems.has(it.name))
              : filteredAndSortedItems[currentFocus] || filteredAndSortedItems[0];
          if (target) {
            setQuickViewItem(target);
            SoundService.playFileSelect();
          }
        }
        return;
      } else if (e.key === 'Escape') {
        if (quickViewItem) {
          e.preventDefault();
          setQuickViewItem(null);
          SoundService.playFileSelect();
          return;
        }
        if (selectedItems.size > 0) {
          e.preventDefault();
          onSelectItems(new Set());
          SoundService.playMarqueeComplete(0);
        }
        return;
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const itemToOpen =
          selectedItems.size === 1
            ? filteredAndSortedItems.find((it) => selectedItems.has(it.name)) || filteredAndSortedItems[currentFocus]
            : filteredAndSortedItems[currentFocus];

        if (itemToOpen) {
          const sNode = itemToOpen as SearchResultNode;
          if (itemToOpen.type === 'folder') {
            const folderPath = sNode.path && sNode.path.length > 0 ? sNode.path : [...currentPath, itemToOpen.name];
            onNavigate(folderPath);
          } else {
            const filePath = sNode.path && sNode.path.length > 0 ? sNode.path.slice(0, -1) : currentPath;
            onOpenFile(itemToOpen, filePath);
          }
        }
        return;
      } else if (e.key === 'F2') {
        e.preventDefault();
        const itemToRename =
          selectedItems.size === 1
            ? filteredAndSortedItems.find((it) => selectedItems.has(it.name)) || filteredAndSortedItems[currentFocus]
            : filteredAndSortedItems[currentFocus];
        if (itemToRename) {
          startInlineRename(itemToRename.name);
        }
        return;
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        const allNames = filteredAndSortedItems.map((it) => it.name);
        onSelectItems(new Set(allNames));
        SoundService.playMarqueeComplete(allNames.length);
        return;
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (onSortChange) {
          let nextKey: SortKey = 'name';
          if (sortCriteria.key === 'name') {
            nextKey = isInTrash ? 'originalPath' : 'modified';
          } else if (sortCriteria.key === 'originalPath') {
            nextKey = 'modified';
          } else if (sortCriteria.key === 'modified') {
            nextKey = 'size';
          } else {
            nextKey = 'name';
          }
          onSortChange({ key: nextKey, direction: sortCriteria.direction || 'asc' });
          SoundService.playFileSelect();
        }
        return;
      }

      if (targetIndex !== null) {
        const isCtrl = e.ctrlKey || e.metaKey;
        const isShift = e.shiftKey;

        if (isShift && isCtrl) {
          // Ctrl + Shift + Arrow: Expand selection range additively
          const anchor =
            anchorIndex !== null && anchorIndex >= 0 && anchorIndex < total ? anchorIndex : currentFocus;
          const min = Math.min(anchor, targetIndex);
          const max = Math.max(anchor, targetIndex);
          const rangeNames = filteredAndSortedItems.slice(min, max + 1).map((it) => it.name);
          const next = new Set(selectedItems);
          rangeNames.forEach((n) => next.add(n));
          onSelectItems(next);
          setFocusedIndex(targetIndex);
          SoundService.playFileSelect();
        } else if (isShift) {
          // Shift + Arrow: Continuous range selection from anchor
          const anchor =
            anchorIndex !== null && anchorIndex >= 0 && anchorIndex < total ? anchorIndex : currentFocus;
          const min = Math.min(anchor, targetIndex);
          const max = Math.max(anchor, targetIndex);
          const rangeNames = filteredAndSortedItems.slice(min, max + 1).map((it) => it.name);
          onSelectItems(new Set(rangeNames));
          setFocusedIndex(targetIndex);
          SoundService.playFileSelect();
        } else if (isCtrl) {
          // Ctrl + Arrow: Navigate focus only, strictly maintaining current selection states
          setFocusedIndex(targetIndex);
          SoundService.playFocusMove();
        } else {
          // Plain Arrow: Single item select and move focus
          const targetedItem = filteredAndSortedItems[targetIndex];
          onSelectItems(new Set([targetedItem.name]));
          setFocusedIndex(targetIndex);
          setAnchorIndex(targetIndex);
          SoundService.playFileSelect();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isActive,
    filteredAndSortedItems,
    focusedIndex,
    anchorIndex,
    selectedItems,
    displayMode,
    currentPath,
    renamingItem,
    sortCriteria,
    onSortChange,
    onSelectItems,
    onNavigate,
    onOpenFile,
  ]);

  // Keep focused item visible inside scroll container
  useEffect(() => {
    if (!isActive || focusedIndex < 0) return;
    const container = itemsContainerRef.current;
    if (!container) return;
    const focusedEl = container.querySelector(`[data-item-index="${focusedIndex}"]`) as HTMLElement | null;
    if (focusedEl) {
      const containerRect = container.getBoundingClientRect();
      const elRect = focusedEl.getBoundingClientRect();

      if (elRect.top < containerRect.top) {
        focusedEl.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
      } else if (elRect.bottom > containerRect.bottom) {
        focusedEl.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
      }
    }
  }, [focusedIndex, isActive]);

  const handleItemDoubleClick = (e: React.MouseEvent, item: FileSystemNode) => {
    e.stopPropagation();
    const sNode = item as SearchResultNode;
    if (item.type === 'folder') {
      const folderPath = sNode.path && sNode.path.length > 0 ? sNode.path : [...currentPath, item.name];
      onNavigate(folderPath);
    } else {
      const filePath = sNode.path && sNode.path.length > 0 ? sNode.path.slice(0, -1) : currentPath;
      onOpenFile(item, filePath);
    }
  };

  const handlePaneContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    onActivate();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      targetItem: null,
    });
  };

  const handleItemContextMenu = (e: React.MouseEvent, item: FileSystemNode) => {
    e.preventDefault();
    e.stopPropagation();
    onActivate();
    if (!selectedItems.has(item.name)) {
      onSelectItems(new Set([item.name]));
    }
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      targetItem: item,
    });
  };

  const startInlineRename = (name: string) => {
    setRenamingItem(name);
    setRenameValue(name);
    setContextMenu(null);
  };

  const finishInlineRename = () => {
    if (renamingItem && renameValue.trim() && renameValue.trim() !== renamingItem) {
      onRename(renamingItem, renameValue.trim());
    }
    setRenamingItem(null);
    setRenameValue('');
  };

  // Drag & Drop
  const handleDragStart = (e: React.DragEvent, item: FileSystemNode) => {
    const currentSelected = selectedItemsRef.current || selectedItems;

    // If the dragged item is in the current selection, drag all selected items;
    // otherwise, select this single item and drag it.
    let itemsToDragNames: string[] = [];
    if (currentSelected.has(item.name)) {
      // Gather all selected items in their visual display order
      const validItemNames = new Set(items.map((it) => it.name));
      const sortedSelected = filteredAndSortedItems
        .filter((it) => currentSelected.has(it.name))
        .map((it) => it.name);

      itemsToDragNames =
        sortedSelected.length > 0
          ? sortedSelected
          : Array.from(currentSelected).filter((name) => validItemNames.has(name));

      // Ensure the actively dragged item is always part of the dragged list
      if (!itemsToDragNames.includes(item.name)) {
        itemsToDragNames.push(item.name);
      }
    } else {
      itemsToDragNames = [item.name];
      onSelectItems(new Set([item.name]));
      setFocusedIndex(filteredAndSortedItems.findIndex((it) => it.name === item.name));
    }

    const itemsToDragNodes = items.filter((it) => itemsToDragNames.includes(it.name));

    // Construct the structured temporary transfer object of selected file paths
    const transferPayload: FileTransferObject = {
      type: 'fs-transfer',
      sourcePaneId: paneId,
      sourcePath: currentPath,
      sourcePathString: '/' + currentPath.join('/'),
      itemNames: itemsToDragNames,
      filePaths: itemsToDragNames.map((name) => [...currentPath, name]),
      pathStrings: itemsToDragNames.map((name) => '/' + [...currentPath, name].join('/')),
      itemsMeta: itemsToDragNodes.map((n) => ({
        name: n.name,
        type: n.type,
        size: n.type === 'file' ? n.size : (folderSizes.get(n.name)?.size || 0),
      })),
      count: itemsToDragNames.length,
      timestamp: Date.now(),
    };

    const serialized = JSON.stringify(transferPayload);
    e.dataTransfer.setData('application/x-file-transfer', serialized);
    e.dataTransfer.setData('application/json', serialized);
    e.dataTransfer.setData('text/plain', transferPayload.pathStrings.join('\n'));
    e.dataTransfer.setData('text/uri-list', transferPayload.pathStrings.join('\r\n'));
    e.dataTransfer.effectAllowed = 'copyMove';

    setIsDragging(true);
    setDraggedItems(new Set(itemsToDragNames));

    // Create a rich drag image ghost badge for multi-item drag feedback
    try {
      const dragGhost = document.createElement('div');
      dragGhost.style.position = 'absolute';
      dragGhost.style.top = '-9999px';
      dragGhost.style.left = '-9999px';
      dragGhost.style.pointerEvents = 'none';
      dragGhost.style.zIndex = '99999';
      dragGhost.style.display = 'flex';
      dragGhost.style.alignItems = 'center';
      dragGhost.style.gap = '8px';
      dragGhost.style.padding = '6px 12px';
      dragGhost.style.borderRadius = '10px';
      dragGhost.style.backgroundColor = 'rgba(15, 23, 42, 0.95)';
      dragGhost.style.border = '1px solid rgba(255, 255, 255, 0.2)';
      dragGhost.style.color = '#ffffff';
      dragGhost.style.boxShadow = '0 12px 28px -4px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)';
      dragGhost.style.fontFamily = 'system-ui, -apple-system, sans-serif';
      dragGhost.style.fontSize = '12px';
      dragGhost.style.fontWeight = '600';

      const count = itemsToDragNames.length;
      const displayName = count === 1 ? item.name : `${item.name} + ${count - 1} more`;

      dragGhost.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:6px;background:${count > 1 ? '#3b82f6' : item.type === 'folder' ? '#f59e0b' : '#6366f1'};color:#ffffff;font-size:11px;font-weight:700;box-shadow:0 2px 4px rgba(0,0,0,0.2);">
          ${count > 1 ? `<span>${count}</span>` : item.type === 'folder' ? '📁' : '📄'}
        </div>
        <span style="max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
          ${displayName}
        </span>
        ${count > 1 ? `<span style="font-size:10px;padding:2px 7px;border-radius:10px;background:rgba(59,130,246,0.3);border:1px solid rgba(147,197,253,0.4);color:#93c5fd;font-weight:700;">${count} items</span>` : ''}
      `;

      document.body.appendChild(dragGhost);
      e.dataTransfer.setDragImage(dragGhost, 20, 20);

      setTimeout(() => {
        if (document.body.contains(dragGhost)) {
          document.body.removeChild(dragGhost);
        }
      }, 0);
    } catch {
      // Fallback to default browser drag ghost if DOM manipulation fails
    }
  };

  const clearDragState = () => {
    setIsDragging(false);
    setDraggedItems(new Set());
    setHoveredDropTarget(null);
    setDropInsertTarget(null);
    setIsDragOverPane(false);
  };

  const handleDragEnd = () => {
    clearDragState();
  };

  const handleItemDragOver = (
    e: React.DragEvent,
    targetItem: FileSystemNode,
    idx: number,
    mode: 'grid' | 'list' | 'tile'
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.ctrlKey || e.metaKey) {
      e.dataTransfer.dropEffect = 'copy';
    } else if (e.altKey) {
      e.dataTransfer.dropEffect = 'link';
    } else {
      e.dataTransfer.dropEffect = 'move';
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const relY = e.clientY - rect.top;

    // 1. If target is a folder and not one of the currently dragged items
    if (targetItem.type === 'folder' && !draggedItems.has(targetItem.name)) {
      if (mode === 'grid') {
        // Pointer in center 60% of grid card: treat as "Move/Copy INTO folder"
        const inCenterX = relX > rect.width * 0.2 && relX < rect.width * 0.8;
        const inCenterY = relY > rect.height * 0.2 && relY < rect.height * 0.8;
        if (inCenterX && inCenterY) {
          setHoveredDropTarget(targetItem.name);
          setDropInsertTarget(null);
          return;
        }
      } else {
        // List or Tile: pointer in vertical center 50% of row: treat as "Move/Copy INTO folder"
        const inCenterY = relY > rect.height * 0.25 && relY < rect.height * 0.75;
        if (inCenterY) {
          setHoveredDropTarget(targetItem.name);
          setDropInsertTarget(null);
          return;
        }
      }
    }

    // 2. Otherwise: Treat as "Move/Reorder BETWEEN items"
    setHoveredDropTarget(null);
    if (mode === 'grid' || mode === 'tile') {
      const isBefore = relX < rect.width / 2;
      setDropInsertTarget({ index: idx, position: isBefore ? 'before' : 'after' });
    } else {
      const isBefore = relY < rect.height / 2;
      setDropInsertTarget({ index: idx, position: isBefore ? 'before' : 'after' });
    }
  };

  const handleItemDragLeave = (e: React.DragEvent, itemName: string, idx: number) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    if (
      e.clientX < rect.left ||
      e.clientX >= rect.right ||
      e.clientY < rect.top ||
      e.clientY >= rect.bottom
    ) {
      if (hoveredDropTarget === itemName) {
        setHoveredDropTarget(null);
      }
      if (dropInsertTarget && dropInsertTarget.index === idx) {
        setDropInsertTarget(null);
      }
    }
  };

  const handleItemDrop = (e: React.DragEvent, targetItem: FileSystemNode, idx: number) => {
    e.preventDefault();
    e.stopPropagation();

    const isCtrl = e.ctrlKey || e.metaKey;
    const isAlt = e.altKey;
    const isRightDrop = e.button === 2;
    const dropCoords = { x: e.clientX, y: e.clientY };

    const currentHoverTarget = hoveredDropTarget;
    const currentInsertTarget = dropInsertTarget;
    clearDragState();

    // Native browser files drop
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUpload(e.dataTransfer.files);
      return;
    }

    try {
      let itemNames: string[] = [];
      let sourcePath: string[] = currentPath;

      const raw =
        e.dataTransfer.getData('application/x-file-transfer') ||
        e.dataTransfer.getData('application/json');
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          itemNames = parsed.itemNames || [];
          sourcePath = parsed.sourcePath || currentPath;
        } catch {
          // JSON parse failed
        }
      }

      if (itemNames.length === 0) {
        const textData = e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('text/uri-list');
        if (textData) {
          itemNames = textData
            .split(/[\r\n]+/)
            .map((p) => p.trim())
            .filter(Boolean)
            .map((p) => p.split('/').filter(Boolean).pop() || p)
            .filter((n) => n && !n.includes('/'));
        }
      }

      if (itemNames.length === 0) return;

      // Case A: Dropping INTO a folder
      if (currentHoverTarget === targetItem.name && targetItem.type === 'folder') {
        const validItems = itemNames.filter((n) => n !== targetItem.name);
        if (validItems.length > 0) {
          const destPath = [...currentPath, targetItem.name];
          if (onDropItems) {
            onDropItems(validItems, destPath, sourcePath, undefined, {
              ctrlKey: isCtrl,
              metaKey: e.metaKey,
              altKey: isAlt,
              button: e.button,
              clientX: e.clientX,
              clientY: e.clientY,
            });
          } else if (isRightDrop && onRequestDropMenu) {
            onRequestDropMenu(validItems, destPath, sourcePath, undefined, dropCoords);
          } else if (isCtrl && onCopyItems) {
            onCopyItems(validItems, destPath, sourcePath);
          } else if (isAlt && onCreateShortcuts) {
            onCreateShortcuts(validItems, destPath, sourcePath);
          } else {
            onMoveItems(validItems, destPath, sourcePath);
          }
        }
        return;
      }

      // Case B: Dropping BETWEEN items (reorder within folder or insert at specific index)
      const targetIndex = currentInsertTarget
        ? currentInsertTarget.position === 'before'
          ? currentInsertTarget.index
          : currentInsertTarget.index + 1
        : idx;

      if (onDropItems) {
        onDropItems(itemNames, currentPath, sourcePath, targetIndex, {
          ctrlKey: isCtrl,
          metaKey: e.metaKey,
          altKey: isAlt,
          button: e.button,
          clientX: e.clientX,
          clientY: e.clientY,
        });
      } else if (isRightDrop && onRequestDropMenu) {
        onRequestDropMenu(itemNames, currentPath, sourcePath, targetIndex, dropCoords);
      } else if (isCtrl && onCopyItems) {
        onCopyItems(itemNames, currentPath, sourcePath, targetIndex);
      } else if (isAlt && onCreateShortcuts) {
        onCreateShortcuts(itemNames, currentPath, sourcePath, targetIndex);
      } else {
        onMoveItems(itemNames, currentPath, sourcePath, targetIndex);
      }
    } catch (err) {
      console.error('Failed to parse drag transfer data', err);
    }
  };

  const handlePaneDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      e.dataTransfer.dropEffect = 'copy';
    } else if (e.altKey) {
      e.dataTransfer.dropEffect = 'link';
    } else {
      e.dataTransfer.dropEffect = 'move';
    }
    setIsDragOverPane(true);
  };

  const handlePaneDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const isCtrl = e.ctrlKey || e.metaKey;
    const isAlt = e.altKey;
    const isRightDrop = e.button === 2;
    const dropCoords = { x: e.clientX, y: e.clientY };

    const currentInsertTarget = dropInsertTarget;
    clearDragState();

    // Native files drop
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUpload(e.dataTransfer.files);
      return;
    }

    try {
      let itemNames: string[] = [];
      let sourcePath: string[] = currentPath;

      const raw =
        e.dataTransfer.getData('application/x-file-transfer') ||
        e.dataTransfer.getData('application/json');
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          itemNames = parsed.itemNames || [];
          sourcePath = parsed.sourcePath || currentPath;
        } catch {
          // JSON parse failed
        }
      }

      if (itemNames.length === 0) {
        const textData = e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('text/uri-list');
        if (textData) {
          itemNames = textData
            .split(/[\r\n]+/)
            .map((p) => p.trim())
            .filter(Boolean)
            .map((p) => p.split('/').filter(Boolean).pop() || p)
            .filter((n) => n && !n.includes('/'));
        }
      }

      if (itemNames.length > 0) {
        const targetIndex = currentInsertTarget
          ? currentInsertTarget.position === 'before'
            ? currentInsertTarget.index
            : currentInsertTarget.index + 1
          : undefined;

        if (onDropItems) {
          onDropItems(itemNames, currentPath, sourcePath, targetIndex, {
            ctrlKey: isCtrl,
            metaKey: e.metaKey,
            altKey: isAlt,
            button: e.button,
            clientX: e.clientX,
            clientY: e.clientY,
          });
        } else if (isRightDrop && onRequestDropMenu) {
          onRequestDropMenu(itemNames, currentPath, sourcePath, targetIndex, dropCoords);
        } else if (isCtrl && onCopyItems) {
          onCopyItems(itemNames, currentPath, sourcePath, targetIndex);
        } else if (isAlt && onCreateShortcuts) {
          onCreateShortcuts(itemNames, currentPath, sourcePath, targetIndex);
        } else {
          onMoveItems(itemNames, currentPath, sourcePath, targetIndex);
        }
      }
    } catch (err) {
      console.error('Failed to parse drag transfer data', err);
    }
  };

  const getItemIcon = (item: FileSystemNode, size: 'sm' | 'md' | 'lg' = 'md') => {
    return (
      <FileIcon
        nodeOrName={item}
        isFolder={item.type === 'folder'}
        size={size}
        showBadge={true}
      />
    );
  };

  // Render highlighted matching name when filter query is active
  const renderHighlightedName = (name: string) => {
    const parsed = parseFilterQuery(filterQuery);
    const trimmedQuery = parsed.textQuery;
    if (!trimmedQuery) return name;

    const lowerName = name.toLowerCase();
    const lowerQuery = trimmedQuery.toLowerCase();

    // Collect all matching character ranges [start, end)
    const matches: [number, number][] = [];

    // 1. Match all occurrences of the full query string
    let pos = 0;
    while (pos < lowerName.length) {
      const idx = lowerName.indexOf(lowerQuery, pos);
      if (idx === -1) break;
      matches.push([idx, idx + lowerQuery.length]);
      pos = idx + Math.max(1, lowerQuery.length);
    }

    // 2. If the user typed space-separated words, also match individual terms
    const tokens = trimmedQuery
      .split(/\s+/)
      .filter((t) => t.length > 0)
      .map((t) => t.toLowerCase());

    if (tokens.length > 1) {
      for (const token of tokens) {
        let tPos = 0;
        while (tPos < lowerName.length) {
          const idx = lowerName.indexOf(token, tPos);
          if (idx === -1) break;
          matches.push([idx, idx + token.length]);
          tPos = idx + Math.max(1, token.length);
        }
      }
    }

    if (matches.length === 0) {
      return name;
    }

    // Merge overlapping or adjacent intervals
    matches.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const mergedMatches: [number, number][] = [];
    for (const [start, end] of matches) {
      if (mergedMatches.length === 0) {
        mergedMatches.push([start, end]);
      } else {
        const last = mergedMatches[mergedMatches.length - 1];
        if (start <= last[1]) {
          last[1] = Math.max(last[1], end);
        } else {
          mergedMatches.push([start, end]);
        }
      }
    }

    // Build parts wrapping matched characters in highlighted span
    const elements: React.ReactNode[] = [];
    let lastIndex = 0;

    mergedMatches.forEach(([start, end], i) => {
      if (start > lastIndex) {
        elements.push(name.substring(lastIndex, start));
      }
      elements.push(
        <span
          key={`match-${i}-${start}`}
          className="search-highlight bg-amber-400/30 text-amber-800 dark:text-amber-200 font-semibold px-0.5 rounded-xs ring-1 ring-amber-500/40 shadow-2xs inline"
        >
          {name.substring(start, end)}
        </span>
      );
      lastIndex = end;
    });

    if (lastIndex < name.length) {
      elements.push(name.substring(lastIndex));
    }

    return <span>{elements}</span>;
  };

  // Group Header Renderers
  const renderListGroupHeader = (group: GroupedItemsSection) => {
    const isCollapsed = collapsedGroups.has(group.category);
    const allGroupSelected = group.items.length > 0 && group.items.every((it) => selectedItems.has(it.item.name));
    const groupTotalBytes = group.items.reduce((acc, it) => {
      if (it.item.type === 'file') return acc + (it.item.size || 0);
      return acc + (folderSizes.get(it.item.name)?.size || 0);
    }, 0);

    return (
      <tr
        key={`group-header-row-${group.category}`}
        className="bg-[rgb(var(--color-surface-muted))]/90 backdrop-blur-xs select-none border-y border-[rgb(var(--color-border-base))] sticky top-0 z-10"
      >
        <td colSpan={isInTrash ? 6 : 5} className="py-1.5 px-2 text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleGroupCollapse(group.category);
              }}
              className="p-1 rounded hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-subtle))] hover:text-[rgb(var(--color-text-base))] transition-colors inline-flex items-center justify-center cursor-pointer"
              title={isCollapsed ? `Expand ${group.category}` : `Collapse ${group.category}`}
            >
              {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            <group.meta.icon className={`w-3.5 h-3.5 ${group.meta.colorClass}`} />
            <span className="font-bold text-[rgb(var(--color-text-base))] text-xs tracking-wide">
              {group.category}
            </span>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[rgb(var(--color-surface-base))] text-[rgb(var(--color-text-muted))] border border-[rgb(var(--color-border-base))]">
              {group.items.length} {group.items.length === 1 ? 'item' : 'items'}{groupTotalBytes > 0 ? ` • ${formatFileSize(groupTotalBytes)}` : ''}
            </span>
            <div className="flex-1 h-px bg-[rgb(var(--color-border-base))]/60 mx-1" />
            <button
              type="button"
              onClick={(e) => handleSelectGroup(e, group.items.map((it) => it.item))}
              className="text-[10px] text-[rgb(var(--color-text-subtle))] hover:text-[rgb(var(--color-accent-text))] px-2 py-0.5 rounded hover:bg-[rgb(var(--color-surface-hover))] transition-colors"
            >
              {allGroupSelected ? 'Deselect group' : 'Select group'}
            </button>
          </div>
        </td>
      </tr>
    );
  };

  const renderSectionGroupHeader = (group: GroupedItemsSection) => {
    const isCollapsed = collapsedGroups.has(group.category);
    const allGroupSelected = group.items.length > 0 && group.items.every((it) => selectedItems.has(it.item.name));
    const groupTotalBytes = group.items.reduce((acc, it) => {
      if (it.item.type === 'file') return acc + (it.item.size || 0);
      return acc + (folderSizes.get(it.item.name)?.size || 0);
    }, 0);

    return (
      <div
        key={`group-header-${group.category}`}
        onClick={() => toggleGroupCollapse(group.category)}
        className="flex items-center gap-2 pb-1.5 mb-2.5 border-b border-[rgb(var(--color-border-base))] cursor-pointer select-none group/gh hover:opacity-90 transition-opacity"
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleGroupCollapse(group.category);
          }}
          className="p-1 rounded hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-subtle))] hover:text-[rgb(var(--color-text-base))] transition-colors inline-flex items-center justify-center cursor-pointer"
          title={isCollapsed ? `Expand ${group.category}` : `Collapse ${group.category}`}
        >
          {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
        <group.meta.icon className={`w-3.5 h-3.5 ${group.meta.colorClass}`} />
        <span className="font-bold text-[rgb(var(--color-text-base))] text-xs tracking-wide">
          {group.category}
        </span>
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[rgb(var(--color-surface-base))] text-[rgb(var(--color-text-muted))] border border-[rgb(var(--color-border-base))]">
          {group.items.length} {group.items.length === 1 ? 'item' : 'items'}{groupTotalBytes > 0 ? ` • ${formatFileSize(groupTotalBytes)}` : ''}
        </span>
        <div className="flex-1 h-px bg-[rgb(var(--color-border-base))]/60 mx-1" />
        <button
          type="button"
          onClick={(e) => handleSelectGroup(e, group.items.map((it) => it.item))}
          className="text-[10px] text-[rgb(var(--color-text-subtle))] hover:text-[rgb(var(--color-accent-text))] px-2 py-0.5 rounded hover:bg-[rgb(var(--color-surface-hover))] transition-colors"
        >
          {allGroupSelected ? 'Deselect group' : 'Select group'}
        </button>
      </div>
    );
  };

  // Renderers for List, Grid, and Tile items
  const renderListItem = (item: FileSystemNode, idx: number) => {
    const isSelected = selectedItems.has(item.name);
    const isFocused = idx === focusedIndex && isActive;
    const isRenaming = renamingItem === item.name;
    const isHoverTarget = hoveredDropTarget === item.name;
    const isDragged = draggedItems.has(item.name);
    const isDropBefore = dropInsertTarget?.index === idx && dropInsertTarget.position === 'before';
    const isDropAfter = dropInsertTarget?.index === idx && dropInsertTarget.position === 'after';
    const folderStats = item.type === 'folder' ? folderSizes.get(item.name) : undefined;

    return (
      <FileRow
        key={item.name}
        item={item}
        index={idx}
        isSelected={isSelected}
        isFocused={isFocused}
        isRenaming={isRenaming}
        renameValue={renameValue}
        isHoverTarget={isHoverTarget}
        isDragged={isDragged}
        isDropBefore={isDropBefore}
        isDropAfter={isDropAfter}
        folderStats={folderStats}
        isInTrash={isInTrash}
        activeTagFilter={activeTagFilter}
        renderHighlightedName={renderHighlightedName}
        onSelectToggle={(it, e) => {
          e.stopPropagation();
          onActivate();
          const next = new Set(selectedItems);
          if (isSelected) {
            next.delete(it.name);
          } else {
            next.add(it.name);
          }
          onSelectItems(next);
          setFocusedIndex(idx);
          setAnchorIndex(idx);
          SoundService.playFileSelect();
        }}
        onClick={(e, it, i) => handleItemClick(e, it, i)}
        onDoubleClick={(e, it) => handleItemDoubleClick(e, it)}
        onContextMenu={(e, it) => handleItemContextMenu(e, it)}
        onQuickView={(it) => {
          onActivate();
          setQuickViewItem(it);
          SoundService.playFileSelect();
        }}
        onRestore={(it) => {
          onActivate();
          onRestore?.([it.name]);
        }}
        onTagClick={(tag, e) => {
          e.stopPropagation();
          onActivate();
          onTagFilterChange?.(activeTagFilter?.toLowerCase() === tag.toLowerCase() ? null : tag);
        }}
        onRenameChange={setRenameValue}
        onRenameSubmit={finishInlineRename}
        onRenameCancel={() => setRenamingItem(null)}
        onDragStart={(e, it) => handleDragStart(e, it)}
        onDragEnd={handleDragEnd}
        onDragOver={(e, it, i) => handleItemDragOver(e, it, i, 'list')}
        onDragLeave={(e, it, i) => handleItemDragLeave(e, it.name, i)}
        onDrop={(e, it, i) => handleItemDrop(e, it, i)}
      />
    );
  };

  const renderGridCard = (item: FileSystemNode, idx: number) => {
    const isSelected = selectedItems.has(item.name);
    const isFocused = idx === focusedIndex && isActive;
    const isRenaming = renamingItem === item.name;
    const isHoverTarget = hoveredDropTarget === item.name;
    const isDragged = draggedItems.has(item.name);
    const isDropBefore = dropInsertTarget?.index === idx && dropInsertTarget.position === 'before';
    const isDropAfter = dropInsertTarget?.index === idx && dropInsertTarget.position === 'after';
    const folderStats = item.type === 'folder' ? folderSizes.get(item.name) : undefined;

    return (
      <div
        key={item.name}
        data-item-index={idx}
        role="gridcell"
        aria-selected={isSelected}
        tabIndex={isFocused ? 0 : -1}
        draggable={!isRenaming}
        onDragStart={(e) => handleDragStart(e, item)}
        onDragEnd={handleDragEnd}
        onDragOver={(e) => handleItemDragOver(e, item, idx, 'grid')}
        onDragLeave={(e) => handleItemDragLeave(e, item.name, idx)}
        onDrop={(e) => handleItemDrop(e, item, idx)}
        onClick={(e) => handleItemClick(e, item, idx)}
        onDoubleClick={(e) => handleItemDoubleClick(e, item)}
        onContextMenu={(e) => handleItemContextMenu(e, item)}
        title={
          isInTrash && item.originalPath && item.originalPath.length > 0
            ? `${item.name}\nOriginal Location: /${item.originalPath.join('/')}\nRestores to: /${item.originalPath.join('/')}/${item.name}`
            : undefined
        }
        className={`group relative flex flex-col items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all min-h-[105px] ${
          isDragged
            ? 'opacity-40 ring-2 ring-dashed ring-blue-400 scale-[0.98]'
            : isSelected
            ? 'bg-[rgb(var(--color-accent-bg))] border-[rgb(var(--color-accent-text))] text-[rgb(var(--color-accent-text))] shadow-md'
            : isHoverTarget
            ? 'bg-blue-500/25 border-blue-500 ring-2 ring-blue-500 shadow-xl scale-[1.03]'
            : isFocused
            ? 'bg-blue-500/10 border-blue-400/80 text-[rgb(var(--color-text-base))] shadow-sm'
            : 'bg-[rgb(var(--color-surface-muted))] border-[rgb(var(--color-border-base))] hover:border-[rgb(var(--color-border-input))] hover:shadow-sm text-[rgb(var(--color-text-base))]'
        } ${
          isFocused
            ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-[rgb(var(--color-surface-base))] relative z-10'
            : ''
        }`}
      >
        {/* Quick View hover button */}
        {!isRenaming && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onActivate();
              setQuickViewItem(item);
              SoundService.playFileSelect();
            }}
            title={`Quick View "${item.name}" (Space)`}
            className="absolute top-1.5 right-1.5 p-1 rounded-md bg-[rgb(var(--color-surface-dialog))]/90 border border-[rgb(var(--color-border-base))] text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-accent-text))] opacity-0 group-hover:opacity-100 transition-opacity shadow-2xs cursor-pointer z-10"
          >
            <Eye className="w-3 h-3" />
          </button>
        )}
        {/* Before card drop indicator */}
        {isDropBefore && (
          <div className="absolute -left-2 inset-y-1 w-1 bg-blue-500 rounded-full z-30 shadow-[0_0_8px_rgba(59,130,246,0.9)] pointer-events-none flex flex-col justify-between items-center">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 ring-2 ring-white -mt-1 shadow-sm" />
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 ring-2 ring-white -mb-1 shadow-sm" />
          </div>
        )}
        {/* After card drop indicator */}
        {isDropAfter && (
          <div className="absolute -right-2 inset-y-1 w-1 bg-blue-500 rounded-full z-30 shadow-[0_0_8px_rgba(59,130,246,0.9)] pointer-events-none flex flex-col justify-between items-center">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 ring-2 ring-white -mt-1 shadow-sm" />
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 ring-2 ring-white -mb-1 shadow-sm" />
          </div>
        )}

        <div className="w-full flex items-center justify-center my-1">
          {getItemIcon(item, 'md')}
        </div>

        {isRenaming ? (
          <input
            type="text"
            autoFocus
            value={renameValue}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={finishInlineRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') finishInlineRename();
              if (e.key === 'Escape') setRenamingItem(null);
            }}
            className="w-full text-center px-1 py-0.5 bg-[rgb(var(--color-surface-input))] border border-[rgb(var(--color-border-input))] rounded text-xs text-[rgb(var(--color-text-base))] outline-none"
          />
        ) : (
          <div className="w-full text-center">
            <p className="text-xs font-medium truncate w-full" title={item.name}>
              {renderHighlightedName(item.name)}
            </p>
            {item.tags && item.tags.length > 0 && (
              <div className="flex items-center justify-center gap-1 flex-wrap mt-1 max-w-full px-0.5">
                {item.tags.slice(0, 2).map((tag) => (
                  <TagBadge
                    key={tag}
                    tag={tag}
                    size="xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      onActivate();
                      onTagFilterChange?.(activeTagFilter?.toLowerCase() === tag.toLowerCase() ? null : tag);
                    }}
                    active={activeTagFilter?.toLowerCase() === tag.toLowerCase()}
                  />
                ))}
                {item.tags.length > 2 && (
                  <span
                    className="text-[9px] px-1 py-0.2 rounded-full bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-muted))] border border-[rgb(var(--color-border-base))] font-medium"
                    title={item.tags.slice(2).join(', ')}
                  >
                    +{item.tags.length - 2}
                  </span>
                )}
              </div>
            )}
            {isHoverTarget ? (
              <p className="text-[10px] text-blue-500 font-bold mt-0.5 flex items-center justify-center gap-0.5">
                <FolderPlus className="w-2.5 h-2.5" /> Drop to move
              </p>
            ) : (
              <p
                className="text-[10px] text-[rgb(var(--color-text-subtle))] mt-0.5 truncate"
                title={
                  item.type === 'folder' && folderStats
                    ? `${item.name}: ${formatFileSize(folderStats.size, { detailed: true })}\n${folderStats.fileCount} ${folderStats.fileCount === 1 ? 'file' : 'files'}${folderStats.folderCount > 0 ? `, ${folderStats.folderCount} subfolders` : ''}`
                    : undefined
                }
              >
                {item.type === 'file'
                  ? formatFileSize(item.size)
                  : folderStats
                  ? `${formatFileSize(folderStats.size)}${folderStats.fileCount > 0 ? ` (${folderStats.fileCount})` : ''}`
                  : 'Folder'}
              </p>
            )}
            {isInTrash && item.originalPath && item.originalPath.length > 0 && (
              <div
                className="mt-1 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-[9px] font-mono flex items-center justify-center gap-1 max-w-full"
                title={`Original location: /${item.originalPath.join('/')}\nRestores to: /${item.originalPath.join('/')}/${item.name}`}
              >
                <RotateCcw className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                <span className="truncate">/{item.originalPath.join('/')}</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderLargeIconItem = (item: FileSystemNode, idx: number) => {
    const isSelected = selectedItems.has(item.name);
    const isFocused = idx === focusedIndex && isActive;
    const isRenaming = renamingItem === item.name;
    const isHoverTarget = hoveredDropTarget === item.name;
    const isDragged = draggedItems.has(item.name);
    const isDropBefore = dropInsertTarget?.index === idx && dropInsertTarget.position === 'before';
    const isDropAfter = dropInsertTarget?.index === idx && dropInsertTarget.position === 'after';
    const folderStats = item.type === 'folder' ? folderSizes.get(item.name) : undefined;

    return (
      <div
        key={item.name}
        data-item-index={idx}
        role="gridcell"
        aria-selected={isSelected}
        tabIndex={isFocused ? 0 : -1}
        draggable={!isRenaming}
        onDragStart={(e) => handleDragStart(e, item)}
        onDragEnd={handleDragEnd}
        onDragOver={(e) => handleItemDragOver(e, item, idx, 'grid')}
        onDragLeave={(e) => handleItemDragLeave(e, item.name, idx)}
        onDrop={(e) => handleItemDrop(e, item, idx)}
        onClick={(e) => handleItemClick(e, item, idx)}
        onDoubleClick={(e) => handleItemDoubleClick(e, item)}
        onContextMenu={(e) => handleItemContextMenu(e, item)}
        title={
          isInTrash && item.originalPath && item.originalPath.length > 0
            ? `${item.name}\nOriginal Location: /${item.originalPath.join('/')}\nRestores to: /${item.originalPath.join('/')}/${item.name}`
            : item.type === 'folder'
            ? folderStats
              ? `${item.name}: ${formatFileSize(folderStats.size, { detailed: true })}\n${folderStats.fileCount} ${folderStats.fileCount === 1 ? 'file' : 'files'}${folderStats.folderCount > 0 ? `, ${folderStats.folderCount} subfolders` : ''}`
              : `${item.name} (Folder)`
            : `${item.name} (${formatFileSize(item.size, { detailed: true })})`
        }
        className={`group relative flex flex-col items-center justify-start p-1.5 rounded-xl border transition-all min-h-[88px] h-full w-full select-none cursor-pointer ${
          isDragged
            ? 'opacity-40 ring-2 ring-dashed ring-blue-400 scale-[0.98]'
            : isSelected
            ? 'bg-[rgb(var(--color-accent-bg))] border-[rgb(var(--color-accent-text))] text-[rgb(var(--color-accent-text))] shadow-xs'
            : isHoverTarget
            ? 'bg-blue-500/25 border-blue-500 ring-2 ring-blue-500 shadow-md scale-[1.03]'
            : isFocused
            ? 'bg-blue-500/10 border-blue-400/80 text-[rgb(var(--color-text-base))] shadow-2xs'
            : 'bg-transparent border-transparent hover:bg-[rgb(var(--color-surface-hover))]/60 hover:border-[rgb(var(--color-border-base))]/40 hover:shadow-2xs text-[rgb(var(--color-text-base))]'
        } ${
          isFocused
            ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-[rgb(var(--color-surface-base))] relative z-10'
            : ''
        }`}
      >
        {/* Quick View hover button */}
        {!isRenaming && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onActivate();
              setQuickViewItem(item);
              SoundService.playFileSelect();
            }}
            title={`Quick View "${item.name}" (Space)`}
            className="absolute top-1 right-1 p-1 rounded-md bg-[rgb(var(--color-surface-dialog))]/90 border border-[rgb(var(--color-border-base))] text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-accent-text))] opacity-0 group-hover:opacity-100 transition-opacity shadow-2xs cursor-pointer z-10"
          >
            <Eye className="w-3 h-3" />
          </button>
        )}

        {/* Before item drop indicator */}
        {isDropBefore && (
          <div className="absolute -left-1.5 inset-y-1 w-1 bg-blue-500 rounded-full z-30 shadow-[0_0_8px_rgba(59,130,246,0.9)] pointer-events-none flex flex-col justify-between items-center">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 ring-2 ring-white -mt-1 shadow-sm" />
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 ring-2 ring-white -mb-1 shadow-sm" />
          </div>
        )}
        {/* After item drop indicator */}
        {isDropAfter && (
          <div className="absolute -right-1.5 inset-y-1 w-1 bg-blue-500 rounded-full z-30 shadow-[0_0_8px_rgba(59,130,246,0.9)] pointer-events-none flex flex-col justify-between items-center">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 ring-2 ring-white -mt-1 shadow-sm" />
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 ring-2 ring-white -mb-1 shadow-sm" />
          </div>
        )}

        {/* Large Icon */}
        <div className="w-full flex items-center justify-center my-0.5 flex-shrink-0">
          {getItemIcon(item, 'lg')}
        </div>

        {/* Filename with wrapping */}
        {isRenaming ? (
          <input
            type="text"
            autoFocus
            value={renameValue}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={finishInlineRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') finishInlineRename();
              if (e.key === 'Escape') setRenamingItem(null);
            }}
            className="w-full text-center px-1 py-0.5 bg-[rgb(var(--color-surface-input))] border border-[rgb(var(--color-border-input))] rounded text-xs text-[rgb(var(--color-text-base))] outline-none mt-1"
          />
        ) : (
          <div className="w-full text-center mt-1 px-0.5">
            <p className="text-xs font-medium text-center break-words [overflow-wrap:anywhere] leading-snug w-full select-none">
              {renderHighlightedName(item.name)}
            </p>
            {item.tags && item.tags.length > 0 && (
              <div className="flex items-center justify-center gap-1 flex-wrap mt-1 max-w-full">
                {item.tags.slice(0, 2).map((tag) => (
                  <TagBadge
                    key={tag}
                    tag={tag}
                    size="xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      onActivate();
                      onTagFilterChange?.(activeTagFilter?.toLowerCase() === tag.toLowerCase() ? null : tag);
                    }}
                    active={activeTagFilter?.toLowerCase() === tag.toLowerCase()}
                  />
                ))}
                {item.tags.length > 2 && (
                  <span
                    className="text-[9px] px-1 py-0.2 rounded-full bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-muted))] border border-[rgb(var(--color-border-base))] font-medium"
                    title={item.tags.slice(2).join(', ')}
                  >
                    +{item.tags.length - 2}
                  </span>
                )}
              </div>
            )}
            {isHoverTarget && item.type === 'folder' && (
              <p className="text-[10px] text-blue-500 font-bold mt-0.5 flex items-center justify-center gap-0.5">
                <FolderPlus className="w-2.5 h-2.5" /> Drop to move
              </p>
            )}
            {isInTrash && item.originalPath && item.originalPath.length > 0 && (
              <div
                className="mt-1 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-[9px] font-mono flex items-center justify-center gap-1 max-w-full truncate"
                title={`Original location: /${item.originalPath.join('/')}\nRestores to: /${item.originalPath.join('/')}/${item.name}`}
              >
                <RotateCcw className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                <span className="truncate">/{item.originalPath.join('/')}</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderTileCard = (item: FileSystemNode, idx: number) => {
    const isSelected = selectedItems.has(item.name);
    const isFocused = idx === focusedIndex && isActive;
    const isRenaming = renamingItem === item.name;
    const isHoverTarget = hoveredDropTarget === item.name;
    const isDragged = draggedItems.has(item.name);
    const isDropBefore = dropInsertTarget?.index === idx && dropInsertTarget.position === 'before';
    const isDropAfter = dropInsertTarget?.index === idx && dropInsertTarget.position === 'after';
    const folderStats = item.type === 'folder' ? folderSizes.get(item.name) : undefined;

    return (
      <div
        key={item.name}
        data-item-index={idx}
        role="gridcell"
        aria-selected={isSelected}
        tabIndex={isFocused ? 0 : -1}
        draggable={!isRenaming}
        onDragStart={(e) => handleDragStart(e, item)}
        onDragEnd={handleDragEnd}
        onDragOver={(e) => handleItemDragOver(e, item, idx, 'tile')}
        onDragLeave={(e) => handleItemDragLeave(e, item.name, idx)}
        onDrop={(e) => handleItemDrop(e, item, idx)}
        onClick={(e) => handleItemClick(e, item, idx)}
        onDoubleClick={(e) => handleItemDoubleClick(e, item)}
        onContextMenu={(e) => handleItemContextMenu(e, item)}
        title={
          isInTrash && item.originalPath && item.originalPath.length > 0
            ? `${item.name}\nOriginal Location: /${item.originalPath.join('/')}\nRestores to: /${item.originalPath.join('/')}/${item.name}`
            : undefined
        }
        className={`relative flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
          isDragged
            ? 'opacity-40 ring-2 ring-dashed ring-blue-400 scale-[0.98]'
            : isSelected
            ? 'bg-[rgb(var(--color-accent-bg))] border-[rgb(var(--color-accent-text))] text-[rgb(var(--color-accent-text))] font-medium'
            : isHoverTarget
            ? 'bg-blue-500/25 border-blue-500 ring-2 ring-blue-500 shadow-md scale-[1.02]'
            : isFocused
            ? 'bg-blue-500/10 border-blue-400/80 text-[rgb(var(--color-text-base))] shadow-sm'
            : 'bg-[rgb(var(--color-surface-muted))] border-[rgb(var(--color-border-base))] hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-base))]'
        } ${
          isFocused
            ? 'ring-2 ring-blue-500 ring-offset-1 ring-offset-[rgb(var(--color-surface-base))] relative z-10'
            : ''
        }`}
      >
        {/* Before tile drop indicator */}
        {isDropBefore && (
          <div className="absolute -left-1.5 inset-y-1 w-1 bg-blue-500 rounded-full z-30 shadow-[0_0_8px_rgba(59,130,246,0.9)] pointer-events-none flex flex-col justify-between items-center">
            <div className="w-2 h-2 rounded-full bg-blue-500 ring-2 ring-white -mt-0.5 shadow-sm" />
            <div className="w-2 h-2 rounded-full bg-blue-500 ring-2 ring-white -mb-0.5 shadow-sm" />
          </div>
        )}
        {/* After tile drop indicator */}
        {isDropAfter && (
          <div className="absolute -right-1.5 inset-y-1 w-1 bg-blue-500 rounded-full z-30 shadow-[0_0_8px_rgba(59,130,246,0.9)] pointer-events-none flex flex-col justify-between items-center">
            <div className="w-2 h-2 rounded-full bg-blue-500 ring-2 ring-white -mt-0.5 shadow-sm" />
            <div className="w-2 h-2 rounded-full bg-blue-500 ring-2 ring-white -mb-0.5 shadow-sm" />
          </div>
        )}

        {getItemIcon(item, 'sm')}
        <div className="flex-1 min-w-0">
          {isRenaming ? (
            <input
              type="text"
              autoFocus
              value={renameValue}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={finishInlineRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') finishInlineRename();
                if (e.key === 'Escape') setRenamingItem(null);
              }}
              className="w-full px-1 py-0.5 bg-[rgb(var(--color-surface-input))] border border-[rgb(var(--color-border-input))] rounded text-xs text-[rgb(var(--color-text-base))] outline-none"
            />
          ) : (
            <>
              <p className="text-xs truncate font-medium" title={item.name}>
                {renderHighlightedName(item.name)}
              </p>
              {item.tags && item.tags.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap mt-0.5">
                  {item.tags.map((tag) => (
                    <TagBadge
                      key={tag}
                      tag={tag}
                      size="xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        onActivate();
                        onTagFilterChange?.(activeTagFilter?.toLowerCase() === tag.toLowerCase() ? null : tag);
                      }}
                      active={activeTagFilter?.toLowerCase() === tag.toLowerCase()}
                    />
                  ))}
                </div>
              )}
              {isHoverTarget ? (
                <p className="text-[10px] text-blue-500 font-bold truncate">
                  Drop to move items here
                </p>
              ) : (
                <p
                  className="text-[10px] text-[rgb(var(--color-text-subtle))] truncate"
                  title={
                    item.type === 'folder' && folderStats
                      ? `${item.name}: ${formatFileSize(folderStats.size, { detailed: true })}\n${folderStats.fileCount} ${folderStats.fileCount === 1 ? 'file' : 'files'}${folderStats.folderCount > 0 ? `, ${folderStats.folderCount} subfolders` : ''}`
                      : undefined
                  }
                >
                  {item.type === 'file'
                    ? formatFileSize(item.size)
                    : folderStats
                    ? `${formatFileSize(folderStats.size)}${folderStats.fileCount > 0 ? ` (${folderStats.fileCount})` : ''}`
                    : 'Folder'}
                </p>
              )}
              {isInTrash && item.originalPath && item.originalPath.length > 0 && (
                <p
                  className="text-[10px] text-amber-700 dark:text-amber-300 font-mono truncate flex items-center gap-1 mt-0.5"
                  title={`Original location: /${item.originalPath.join('/')}\nRestores to: /${item.originalPath.join('/')}/${item.name}`}
                >
                  <RotateCcw className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                  <span className="truncate">/{item.originalPath.join('/')}</span>
                </p>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onFocus={() => onActivate()}
      onMouseDown={handleContainerMouseDown}
      onClick={(e) => {
        onActivate();
        if (isMarqueeDraggingRef.current) return;
        const target = e.target as HTMLElement;
        if (!target.closest('[data-item-index]') && !target.closest('input') && !target.closest('button')) {
          onSelectItems(new Set());
        }
      }}
      onContextMenu={handlePaneContextMenu}
      onKeyDown={(e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
          const activeEl = document.activeElement;
          const isInput =
            activeEl &&
            (activeEl.tagName === 'INPUT' ||
              activeEl.tagName === 'TEXTAREA' ||
              activeEl.tagName === 'SELECT' ||
              (activeEl as HTMLElement).isContentEditable);
          if (!isInput && !renamingItem) {
            e.preventDefault();
            handleSelectAll();
          }
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'g') {
          const activeEl = document.activeElement;
          const isInput =
            activeEl &&
            (activeEl.tagName === 'INPUT' ||
              activeEl.tagName === 'TEXTAREA' ||
              activeEl.tagName === 'SELECT' ||
              (activeEl as HTMLElement).isContentEditable);
          if (!isInput && !renamingItem && onToggleGroupByType) {
            e.preventDefault();
            onToggleGroupByType();
            SoundService.playFileSelect();
          }
        }
        if ((e.ctrlKey && e.key.toLowerCase() === 'q') || (e.altKey && e.key.toLowerCase() === 'p')) {
          const activeEl = document.activeElement;
          const isInput =
            activeEl &&
            (activeEl.tagName === 'INPUT' ||
              activeEl.tagName === 'TEXTAREA' ||
              activeEl.tagName === 'SELECT' ||
              (activeEl as HTMLElement).isContentEditable);
          if (!isInput && !renamingItem) {
            e.preventDefault();
            if (quickViewItem) {
              setQuickViewItem(null);
              SoundService.playFileSelect();
            } else {
              const itemToPreview =
                selectedItems.size === 1
                  ? items.find((it) => selectedItems.has(it.name))
                  : filteredAndSortedItems[focusedIndex] || filteredAndSortedItems[0];
              if (itemToPreview) {
                setQuickViewItem(itemToPreview);
                SoundService.playFileSelect();
              }
            }
          }
        }
      }}
      onDragOver={handlePaneDragOver}
      onDragLeave={(e) => {
        if (!containerRef.current?.contains(e.relatedTarget as Node)) {
          setIsDragOverPane(false);
        }
      }}
      onDrop={handlePaneDrop}
      className={`flex-1 flex flex-col h-full bg-[rgb(var(--color-surface-base))] overflow-hidden select-none relative focus:outline-none ${
        isActive ? 'ring-1 ring-[rgb(var(--color-accent-text))]' : ''
      } ${isDragOverPane ? 'bg-blue-500/5 ring-2 ring-blue-500' : ''}`}
    >
      {/* Visual Drop Banner when dragging over pane canvas */}
      {isDragOverPane && (
        <div className="absolute inset-x-4 top-3 z-30 pointer-events-none flex items-center justify-center animate-fade-in">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-600/90 text-white text-xs font-medium shadow-xl backdrop-blur-sm border border-blue-400/30">
            <FolderPlus className="w-4 h-4 text-blue-200" />
            <span>Drop items to move into /{currentPath.join('/')}</span>
          </div>
        </div>
      )}

      {/* Trash Folder Status Banner */}
      {isInTrash && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-3.5 py-2 flex items-center justify-between text-xs text-amber-800 dark:text-amber-200 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Trash2 className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="text-[11px] truncate">
              <strong className="font-semibold">Trash</strong> — Deleted items are safely stored here until permanently deleted or restored.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-2">
            {selectedItems.size > 0 && onRestore && (
              <button
                type="button"
                onClick={() => onRestore(Array.from(selectedItems))}
                className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-[11px] flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                title="Restore selected item(s) back to their original location"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restore Selected ({selectedItems.size})</span>
              </button>
            )}
            {selectedItems.size === 0 && items.length > 0 && onRestore && (
              <button
                type="button"
                onClick={() => onRestore()}
                className="px-2 py-1 rounded hover:bg-amber-500/20 text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                title="Restore all items back to their original locations"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restore All</span>
              </button>
            )}
            {onEmptyTrash && items.length > 0 && (
              <button
                type="button"
                onClick={onEmptyTrash}
                className="px-2.5 py-1 rounded bg-red-600 hover:bg-red-700 text-white font-medium text-[11px] flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                title="Permanently remove all items in Trash"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Empty Trash</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Items Container */}
      <div ref={itemsContainerRef} className="flex-1 overflow-y-auto p-3">
        {filteredAndSortedItems.length === 0 ? (
          items.length > 0 && (filterQuery.trim() || activeTagFilter) ? (
            <div className="h-full flex flex-col items-center justify-center text-[rgb(var(--color-text-subtle))] text-xs gap-3 p-4 text-center">
              <div className="p-3 rounded-full bg-[rgb(var(--color-surface-muted))] border border-[rgb(var(--color-border-base))]">
                <SearchX className="w-8 h-8 text-[rgb(var(--color-text-subtle))]" />
              </div>
              <div>
                <p className="font-semibold text-sm text-[rgb(var(--color-text-base))]">
                  {filterQuery.trim() && activeTagFilter
                    ? `No matches found for "${filterQuery}" with tag "${activeTagFilter === '__ANY__' ? 'Any Tag' : activeTagFilter === '__NONE__' ? 'Untagged' : activeTagFilter}"`
                    : activeTagFilter
                    ? `No matches found with tag "${activeTagFilter === '__ANY__' ? 'Any Tag' : activeTagFilter === '__NONE__' ? 'Untagged' : activeTagFilter}"`
                    : `No matches found for "${filterQuery}"`}
                </p>
                <p className="text-[11px] text-[rgb(var(--color-text-subtle))] mt-0.5">
                  0 of {items.length} items matched in /{currentPath.join('/')}
                </p>
              </div>
              {onClearFilter && (
                <button
                  type="button"
                  onClick={onClearFilter}
                  className="px-3 py-1.5 rounded-md bg-[rgb(var(--color-accent-bg))] text-[rgb(var(--color-accent-text))] text-xs font-medium hover:opacity-90 transition-opacity shadow-sm cursor-pointer"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : isInTrash ? (
            <div className="h-full flex flex-col items-center justify-center text-[rgb(var(--color-text-subtle))] text-xs gap-3 p-4 text-center">
              <div className="p-3.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                <Trash2 className="w-8 h-8 text-amber-500/70" />
              </div>
              <div>
                <p className="font-semibold text-sm text-[rgb(var(--color-text-base))]">Trash is empty</p>
                <p className="text-[11px] text-[rgb(var(--color-text-subtle))] mt-0.5 max-w-sm">
                  Deleted files and folders are moved here before permanent removal.
                </p>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-[rgb(var(--color-text-subtle))] text-xs gap-2">
              <FolderOpen className="w-10 h-10 opacity-40" />
              <p>This folder is empty</p>
              <p className="text-[10px]">Drag files here, or use the "New" button above</p>
            </div>
          )
        ) : displayMode === 'list' ? (
          /* Detailed List Table */
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[rgb(var(--color-border-base))] text-[rgb(var(--color-text-subtle))] font-medium select-none">
                <th className="pb-2 pl-2 w-8 text-center select-none" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onActivate();
                      handleSelectAll();
                    }}
                    title={
                      filteredAndSortedItems.length > 0 &&
                      filteredAndSortedItems.every((it) => selectedItems.has(it.name))
                        ? 'Deselect all (Ctrl+A)'
                        : 'Select all (Ctrl+A)'
                    }
                    className="p-1 rounded hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-subtle))] hover:text-[rgb(var(--color-text-base))] transition-colors inline-flex items-center justify-center cursor-pointer"
                  >
                    {filteredAndSortedItems.length > 0 &&
                    filteredAndSortedItems.every((it) => selectedItems.has(it.name)) ? (
                      <CheckSquare className="w-3.5 h-3.5 text-blue-500" />
                    ) : filteredAndSortedItems.some((it) => selectedItems.has(it.name)) ? (
                      <CheckSquare className="w-3.5 h-3.5 text-blue-400 opacity-70" />
                    ) : (
                      <Square className="w-3.5 h-3.5 opacity-50 hover:opacity-100" />
                    )}
                  </button>
                </th>
                <th
                  onClick={(e) => handleHeaderSortClick('name', e)}
                  title={
                    getSortRuleForColumn('name').isActive
                      ? `Sorted by Name (${getSortRuleForColumn('name').isPrimary ? 'Primary' : `Secondary #${getSortRuleForColumn('name').rank}`}, ${getSortRuleForColumn('name').direction.toUpperCase()}). Click to toggle, Shift+Click to chain secondary sort.`
                      : 'Sort by Name. Hold Shift and click to add as secondary sort criterion.'
                  }
                  className={`pb-2 pl-2 select-none group/th transition-colors ${onSortChange ? 'cursor-pointer hover:text-[rgb(var(--color-text-base))]' : ''}`}
                >
                  <div className="flex items-center gap-1">
                    <span className={getSortRuleForColumn('name').isActive ? 'font-semibold text-[rgb(var(--color-text-base))]' : ''}>Name</span>
                    {getSortRuleForColumn('name').isActive ? (
                      <div className="flex items-center gap-0.5 text-[10px] text-[rgb(var(--color-accent-text))] font-bold">
                        {getSortRuleForColumn('name').direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                        {((sortCriteria.secondary?.length || 0) > 0) && (
                          <span className="w-3.5 h-3.5 rounded-full bg-[rgb(var(--color-accent-bg))] border border-[rgb(var(--color-accent-border))] text-[8px] flex items-center justify-center font-mono leading-none shadow-2xs">
                            {getSortRuleForColumn('name').rank}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="opacity-0 group-hover/th:opacity-40 text-[9px] text-[rgb(var(--color-text-subtle))] transition-opacity">↕</span>
                    )}
                  </div>
                </th>
                {isInTrash && (
                  <th
                    onClick={(e) => handleHeaderSortClick('originalPath', e)}
                    title={
                      getSortRuleForColumn('originalPath').isActive
                        ? `Sorted by Original Path (${getSortRuleForColumn('originalPath').isPrimary ? 'Primary' : `Secondary #${getSortRuleForColumn('originalPath').rank}`}, ${getSortRuleForColumn('originalPath').direction.toUpperCase()}). Click to toggle, Shift+Click to chain secondary sort.`
                        : 'Sort by Original Path. Hold Shift and click to add as secondary sort criterion.'
                    }
                    className={`pb-2 w-52 select-none group/th transition-colors ${onSortChange ? 'cursor-pointer hover:text-[rgb(var(--color-text-base))]' : ''}`}
                  >
                    <div className="flex items-center gap-1">
                      <span className={getSortRuleForColumn('originalPath').isActive ? 'font-semibold text-[rgb(var(--color-text-base))]' : ''}>Original Path</span>
                      {getSortRuleForColumn('originalPath').isActive ? (
                        <div className="flex items-center gap-0.5 text-[10px] text-[rgb(var(--color-accent-text))] font-bold">
                          {getSortRuleForColumn('originalPath').direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                          {((sortCriteria.secondary?.length || 0) > 0) && (
                            <span className="w-3.5 h-3.5 rounded-full bg-[rgb(var(--color-accent-bg))] border border-[rgb(var(--color-accent-border))] text-[8px] flex items-center justify-center font-mono leading-none shadow-2xs">
                              {getSortRuleForColumn('originalPath').rank}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="opacity-0 group-hover/th:opacity-40 text-[9px] text-[rgb(var(--color-text-subtle))] transition-opacity">↕</span>
                      )}
                    </div>
                  </th>
                )}
                <th
                  onClick={(e) => handleHeaderSortClick('modified', e)}
                  title={
                    getSortRuleForColumn('modified').isActive
                      ? `Sorted by Date Modified (${getSortRuleForColumn('modified').isPrimary ? 'Primary' : `Secondary #${getSortRuleForColumn('modified').rank}`}, ${getSortRuleForColumn('modified').direction.toUpperCase()}). Click to toggle, Shift+Click to chain secondary sort.`
                      : 'Sort by Date Modified. Hold Shift and click to add as secondary sort criterion.'
                  }
                  className={`pb-2 w-36 select-none group/th transition-colors ${onSortChange ? 'cursor-pointer hover:text-[rgb(var(--color-text-base))]' : ''}`}
                >
                  <div className="flex items-center gap-1">
                    <span className={getSortRuleForColumn('modified').isActive ? 'font-semibold text-[rgb(var(--color-text-base))]' : ''}>Date Modified</span>
                    {getSortRuleForColumn('modified').isActive ? (
                      <div className="flex items-center gap-0.5 text-[10px] text-[rgb(var(--color-accent-text))] font-bold">
                        {getSortRuleForColumn('modified').direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                        {((sortCriteria.secondary?.length || 0) > 0) && (
                          <span className="w-3.5 h-3.5 rounded-full bg-[rgb(var(--color-accent-bg))] border border-[rgb(var(--color-accent-border))] text-[8px] flex items-center justify-center font-mono leading-none shadow-2xs">
                            {getSortRuleForColumn('modified').rank}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="opacity-0 group-hover/th:opacity-40 text-[9px] text-[rgb(var(--color-text-subtle))] transition-opacity">↕</span>
                    )}
                  </div>
                </th>
                <th
                  onClick={(e) => handleHeaderSortClick('type', e)}
                  title={
                    getSortRuleForColumn('type').isActive
                      ? `Sorted by Type (${getSortRuleForColumn('type').isPrimary ? 'Primary' : `Secondary #${getSortRuleForColumn('type').rank}`}, ${getSortRuleForColumn('type').direction.toUpperCase()}). Click to toggle, Shift+Click to chain secondary sort.`
                      : 'Sort by Type. Hold Shift and click to add as secondary sort criterion.'
                  }
                  className={`pb-2 w-36 select-none group/th transition-colors ${onSortChange ? 'cursor-pointer hover:text-[rgb(var(--color-text-base))]' : ''}`}
                >
                  <div className="flex items-center gap-1">
                    <span className={getSortRuleForColumn('type').isActive ? 'font-semibold text-[rgb(var(--color-text-base))]' : ''}>Type</span>
                    {getSortRuleForColumn('type').isActive ? (
                      <div className="flex items-center gap-0.5 text-[10px] text-[rgb(var(--color-accent-text))] font-bold">
                        {getSortRuleForColumn('type').direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                        {((sortCriteria.secondary?.length || 0) > 0) && (
                          <span className="w-3.5 h-3.5 rounded-full bg-[rgb(var(--color-accent-bg))] border border-[rgb(var(--color-accent-border))] text-[8px] flex items-center justify-center font-mono leading-none shadow-2xs">
                            {getSortRuleForColumn('type').rank}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="opacity-0 group-hover/th:opacity-40 text-[9px] text-[rgb(var(--color-text-subtle))] transition-opacity">↕</span>
                    )}
                  </div>
                </th>
                <th
                  onClick={(e) => handleHeaderSortClick('size', e)}
                  title={
                    getSortRuleForColumn('size').isActive
                      ? `Sorted by Size (${getSortRuleForColumn('size').isPrimary ? 'Primary' : `Secondary #${getSortRuleForColumn('size').rank}`}, ${getSortRuleForColumn('size').direction.toUpperCase()}). Click to toggle, Shift+Click to chain secondary sort.`
                      : 'Sort by Size. Hold Shift and click to add as secondary sort criterion.'
                  }
                  className={`pb-2 w-24 text-right pr-2 select-none group/th transition-colors ${onSortChange ? 'cursor-pointer hover:text-[rgb(var(--color-text-base))]' : ''}`}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span className={getSortRuleForColumn('size').isActive ? 'font-semibold text-[rgb(var(--color-text-base))]' : ''}>Size</span>
                    {getSortRuleForColumn('size').isActive ? (
                      <div className="flex items-center gap-0.5 text-[10px] text-[rgb(var(--color-accent-text))] font-bold">
                        {getSortRuleForColumn('size').direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                        {((sortCriteria.secondary?.length || 0) > 0) && (
                          <span className="w-3.5 h-3.5 rounded-full bg-[rgb(var(--color-accent-bg))] border border-[rgb(var(--color-accent-border))] text-[8px] flex items-center justify-center font-mono leading-none shadow-2xs">
                            {getSortRuleForColumn('size').rank}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="opacity-0 group-hover/th:opacity-40 text-[9px] text-[rgb(var(--color-text-subtle))] transition-opacity">↕</span>
                    )}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {groupByType && groupedSections ? (
                groupedSections.map((group) => {
                  const isCollapsed = collapsedGroups.has(group.category);
                  return (
                    <React.Fragment key={`group-sec-${group.category}`}>
                      {renderListGroupHeader(group)}
                      {!isCollapsed && group.items.map(({ item, globalIndex: idx }) => renderListItem(item, idx))}
                    </React.Fragment>
                  );
                })
              ) : (
                filteredAndSortedItems.map((item, idx) => renderListItem(item, idx))
              )}
            </tbody>
          </table>
        ) : displayMode === 'grid' ? (
          /* Grid View Cards */
          groupByType && groupedSections ? (
            <div className="flex flex-col gap-6">
              {groupedSections.map((group) => {
                const isCollapsed = collapsedGroups.has(group.category);
                return (
                  <div key={`group-grid-${group.category}`} className="flex flex-col">
                    {renderSectionGroupHeader(group)}
                    {!isCollapsed && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                        {group.items.map(({ item, globalIndex: idx }) => renderGridCard(item, idx))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {filteredAndSortedItems.map((item, idx) => renderGridCard(item, idx))}
            </div>
          )
        ) : displayMode === 'largeIcons' ? (
          /* Large Icons View (Cardless, compact ~half-width square default, wrapping filenames) */
          groupByType && groupedSections ? (
            <div className="flex flex-col gap-6">
              {groupedSections.map((group) => {
                const isCollapsed = collapsedGroups.has(group.category);
                return (
                  <div key={`group-large-icons-${group.category}`} className="flex flex-col">
                    {renderSectionGroupHeader(group)}
                    {!isCollapsed && (
                      <div
                        className="grid gap-2 items-stretch"
                        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(84px, 1fr))' }}
                      >
                        {group.items.map(({ item, globalIndex: idx }) => renderLargeIconItem(item, idx))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div
              className="grid gap-2 items-stretch"
              style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(84px, 1fr))' }}
            >
              {filteredAndSortedItems.map((item, idx) => renderLargeIconItem(item, idx))}
            </div>
          )
        ) : (
          /* Tiles / Small Icons View */
          groupByType && groupedSections ? (
            <div className="flex flex-col gap-6">
              {groupedSections.map((group) => {
                const isCollapsed = collapsedGroups.has(group.category);
                return (
                  <div key={`group-tile-${group.category}`} className="flex flex-col">
                    {renderSectionGroupHeader(group)}
                    {!isCollapsed && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                        {group.items.map(({ item, globalIndex: idx }) => renderTileCard(item, idx))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {filteredAndSortedItems.map((item, idx) => renderTileCard(item, idx))}
            </div>
          )
        )}
      </div>

      {/* Visual Marquee (Lasso) Selection Box */}
      {marquee && marquee.isActive && (() => {
        const bounds = getMarqueeBounds();
        if (!bounds || bounds.width <= 0 || bounds.height <= 0) return null;
        return (
          <div
            id={`marquee-lasso-pane-${paneId}`}
            className="pointer-events-none absolute z-40 border border-blue-500/90 bg-blue-500/15 backdrop-blur-[0.5px] rounded-xs shadow-sm ring-1 ring-blue-400/30"
            style={{
              left: `${bounds.left}px`,
              top: `${bounds.top}px`,
              width: `${bounds.width}px`,
              height: `${bounds.height}px`,
            }}
          >
            {/* Corner anchor indicators */}
            <div className="absolute -top-1 -left-1 w-1.5 h-1.5 bg-blue-500 rounded-xs ring-1 ring-white/50" />
            <div className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-blue-500 rounded-xs ring-1 ring-white/50" />
            <div className="absolute -bottom-1 -left-1 w-1.5 h-1.5 bg-blue-500 rounded-xs ring-1 ring-white/50" />
            <div className="absolute -bottom-1 -right-1 w-1.5 h-1.5 bg-blue-500 rounded-xs ring-1 ring-white/50" />

            {/* Live lasso count badge */}
            {selectedItems.size > 0 && bounds.width > 70 && bounds.height > 35 && (
              <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-blue-600/95 text-white text-[10px] font-bold shadow-md tracking-wider flex items-center gap-1 border border-white/20 animate-fade-in">
                <span>{selectedItems.size} selected</span>
              </div>
            )}
          </div>
        );
      })()}

      {/* Quick View Overlay (Floating Quick Look Mode) */}
      {quickViewItem && !isQuickViewDocked && (
        <div
          className="absolute inset-0 z-40 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-2 sm:p-4 animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setQuickViewItem(null);
              SoundService.playFileSelect();
            }
          }}
        >
          <QuickView
            item={quickViewItem}
            path={currentPath}
            allItems={filteredAndSortedItems}
            onClose={() => setQuickViewItem(null)}
            onOpenFile={onOpenFile}
            onNavigateToItem={(nextItem) => {
              setQuickViewItem(nextItem);
              onSelectItems(new Set([nextItem.name]));
            }}
            isDocked={false}
            onToggleDock={() => setIsQuickViewDocked(true)}
            vfsService={vfsService}
          />
        </div>
      )}

      {/* Quick View Docked Split Mode (Docked to bottom of pane) */}
      {quickViewItem && isQuickViewDocked && (
        <QuickView
          item={quickViewItem}
          path={currentPath}
          allItems={filteredAndSortedItems}
          onClose={() => setQuickViewItem(null)}
          onOpenFile={onOpenFile}
          onNavigateToItem={(nextItem) => {
            setQuickViewItem(nextItem);
            onSelectItems(new Set([nextItem.name]));
          }}
          isDocked={true}
          onToggleDock={() => setIsQuickViewDocked(false)}
          vfsService={vfsService}
        />
      )}

      {/* Pane Footer Status Bar */}
      <div className="flex items-center justify-between px-3 py-1 bg-[rgb(var(--color-surface-muted))] border-t border-[rgb(var(--color-border-base))] text-[11px] text-[rgb(var(--color-text-subtle))]">
        <div className="flex items-center gap-2 flex-wrap">
          <span>
            {filterQuery.trim() || activeTagFilter
              ? `Filtered: ${filteredAndSortedItems.length} of ${items.length} items`
              : `${items.length} items`}
          </span>
          {activeTagFilter && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-base))] border border-[rgb(var(--color-border-base))]">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              <span>
                {activeTagFilter === '__ANY__' ? 'Any Tag' : activeTagFilter === '__NONE__' ? 'Untagged' : activeTagFilter}
              </span>
              {onClearFilter && (
                <button
                  type="button"
                  onClick={onClearFilter}
                  title="Clear filter"
                  className="hover:opacity-75 cursor-pointer ml-0.5 text-[rgb(var(--color-text-muted))]"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
            </span>
          )}
          {selectedItems.size > 0 ? (
            <span className="font-semibold text-[rgb(var(--color-accent-text))]">
              ({selectedItems.size} selected{selectedBytesText ? ` • ${selectedBytesText}` : ''})
            </span>
          ) : (
            totalVisibleBytesText && (
              <span className="text-[10px] text-[rgb(var(--color-text-muted))]">
                • Total: {totalVisibleBytesText}
              </span>
            )
          )}
          {filteredAndSortedItems.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onActivate();
                handleSelectAll();
              }}
              title={
                filteredAndSortedItems.every((it) => selectedItems.has(it.name))
                  ? 'Deselect all items (Ctrl+A)'
                  : 'Select all items in current folder (Ctrl+A)'
              }
              className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[rgb(var(--color-surface-base))] hover:bg-[rgb(var(--color-surface-hover))] border border-[rgb(var(--color-border-base))] text-[10px] text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text-base))] transition-colors shadow-2xs ml-1 cursor-pointer"
            >
              {filteredAndSortedItems.every((it) => selectedItems.has(it.name)) ? (
                <>
                  <Square className="w-3 h-3 text-[rgb(var(--color-accent-text))]" />
                  <span>Deselect All</span>
                </>
              ) : (
                <>
                  <CheckSquare className="w-3 h-3 text-[rgb(var(--color-accent-text))]" />
                  <span>Select All</span>
                </>
              )}
              <kbd className="hidden sm:inline-block ml-0.5 text-[8px] font-mono px-1 py-0.2 rounded bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-subtle))] border border-[rgb(var(--color-border-base))]">
                Ctrl+A
              </kbd>
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onSortChange && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                let nextKey: SortKey = 'name';
                if (sortCriteria.key === 'name') nextKey = isInTrash ? 'originalPath' : 'modified';
                else if (sortCriteria.key === 'originalPath') nextKey = 'modified';
                else if (sortCriteria.key === 'modified') nextKey = 'size';
                else if (sortCriteria.key === 'size') nextKey = 'type';
                else nextKey = 'name';
                onSortChange({ key: nextKey, direction: sortCriteria.direction || 'asc', secondary: undefined });
                SoundService.playFileSelect();
              }}
              title={
                sortCriteria.secondary && sortCriteria.secondary.length > 0
                  ? `Sorted by ${sortCriteria.key === 'modified' ? 'Date' : sortCriteria.key === 'originalPath' ? 'Original Path' : sortCriteria.key} (${sortCriteria.direction.toUpperCase()}) then ${sortCriteria.secondary.map((s) => `${s.key === 'modified' ? 'Date' : s.key === 'originalPath' ? 'Original Path' : s.key} (${s.direction.toUpperCase()})`).join(', ')} — Click to reset or cycle`
                  : `Sorted by ${sortCriteria.key === 'modified' ? 'Date Modified' : sortCriteria.key === 'originalPath' ? 'Original Path' : sortCriteria.key.toUpperCase()} (${sortCriteria.direction.toUpperCase()}) — Click or press Ctrl+S to cycle`
              }
              className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[rgb(var(--color-surface-base))] hover:bg-[rgb(var(--color-surface-hover))] border border-[rgb(var(--color-border-base))] text-[10px] text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text-base))] transition-colors shadow-2xs"
            >
              <ArrowDownUp className="w-3 h-3 text-[rgb(var(--color-accent-text))]" />
              <span className="capitalize">{sortCriteria.key === 'modified' ? 'Date' : sortCriteria.key === 'originalPath' ? 'Original Path' : sortCriteria.key}</span>
              <span className="text-[9px] text-[rgb(var(--color-accent-text))] font-bold">
                {sortCriteria.direction === 'asc' ? '▲' : '▼'}
              </span>
              {sortCriteria.secondary && sortCriteria.secondary.length > 0 && (
                <span className="flex items-center gap-1 text-[9px] text-[rgb(var(--color-accent-text))] font-medium border-l border-[rgb(var(--color-border-base))] pl-1">
                  +{sortCriteria.secondary.map((s) => `${s.key === 'modified' ? 'Date' : s.key} ${s.direction === 'asc' ? '▲' : '▼'}`).join(', ')}
                </span>
              )}
              <kbd className="hidden sm:inline-block ml-0.5 text-[8px] font-mono px-1 py-0.2 rounded bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-subtle))] border border-[rgb(var(--color-border-base))]">
                Ctrl+S
              </kbd>
            </button>
          )}
          {onToggleGroupByType && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleGroupByType();
                SoundService.playFileSelect();
              }}
              title={`Group by Type (${groupByType ? 'Enabled: Folders, Documents, Images, Other' : 'Disabled'}) — Click or press Ctrl+G to toggle`}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] transition-colors shadow-2xs ${
                groupByType
                  ? 'bg-[rgb(var(--color-accent-bg))] border-[rgb(var(--color-accent-border))] text-[rgb(var(--color-accent-text))] font-semibold'
                  : 'bg-[rgb(var(--color-surface-base))] hover:bg-[rgb(var(--color-surface-hover))] border-[rgb(var(--color-border-base))] text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text-base))]'
              }`}
            >
              <Layers className="w-3 h-3 text-[rgb(var(--color-accent-text))]" />
              <span>Group: {groupByType ? 'Type' : 'Off'}</span>
              <kbd className="hidden sm:inline-block ml-0.5 text-[8px] font-mono px-1 py-0.2 rounded bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-subtle))] border border-[rgb(var(--color-border-base))]">
                Ctrl+G
              </kbd>
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onActivate();
              if (quickViewItem) {
                setQuickViewItem(null);
                SoundService.playFileSelect();
              } else {
                const itemToPreview =
                  selectedItems.size === 1
                    ? items.find((it) => selectedItems.has(it.name))
                    : filteredAndSortedItems[focusedIndex] || filteredAndSortedItems[0];
                if (itemToPreview) {
                  setQuickViewItem(itemToPreview);
                  SoundService.playFileSelect();
                }
              }
            }}
            title={`Quick View (Space or Ctrl+Q) — Preview file or folder without opening editor${
              quickViewItem ? ' (Active)' : ''
            }`}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] transition-colors shadow-2xs cursor-pointer ${
              quickViewItem
                ? 'bg-[rgb(var(--color-accent-bg))] border-[rgb(var(--color-accent-border))] text-[rgb(var(--color-accent-text))] font-semibold ring-1 ring-[rgb(var(--color-accent-text))]'
                : 'bg-[rgb(var(--color-surface-base))] hover:bg-[rgb(var(--color-surface-hover))] border-[rgb(var(--color-border-base))] text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text-base))]'
            }`}
          >
            <Eye className="w-3 h-3 text-[rgb(var(--color-accent-text))]" />
            <span>Quick View</span>
            <kbd className="hidden sm:inline-block ml-0.5 text-[8px] font-mono px-1 py-0.2 rounded bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-subtle))] border border-[rgb(var(--color-border-base))]">
              Space
            </kbd>
          </button>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[rgb(var(--color-surface-base))] border border-[rgb(var(--color-border-base))]">
            Pane {paneId}
          </span>
        </div>
      </div>

      {/* Context Menu Modal */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          style={{
            top: Math.min(contextMenu.y, Math.max(10, window.innerHeight - 440)),
            left: Math.min(contextMenu.x, Math.max(10, window.innerWidth - 240)),
          }}
          className="fixed z-50 w-56 rounded-lg shadow-2xl bg-[rgb(var(--color-surface-dialog))] border border-[rgb(var(--color-border-base))] py-1 text-xs animate-fade-in select-none"
        >
          {/* Header & Quick Label Row for any targeted items */}
          {contextTargetNames.length > 0 && (
            <div className="border-b border-[rgb(var(--color-border-base))] pb-1 mb-1">
              <div className="px-3 py-1 text-[10px] font-bold text-[rgb(var(--color-text-subtle))] truncate flex items-center justify-between">
                <span className="truncate max-w-[140px]">
                  {contextTargetNames.length > 1
                    ? `${contextTargetNames.length} items selected`
                    : contextTargetNames[0]}
                </span>
                {contextTargetNames.length > 1 && (
                  <span className="text-[9px] font-semibold text-indigo-500 bg-indigo-500/10 px-1.5 py-0.2 rounded">
                    Batch
                  </span>
                )}
              </div>

              {/* Quick Label Palette: 1-click batch label toggle */}
              <div className="px-3 pt-1 pb-0.5 bg-[rgb(var(--color-surface-muted))]/40">
                <div className="flex items-center justify-between text-[10px] text-[rgb(var(--color-text-subtle))] font-medium mb-1">
                  <span className="flex items-center gap-1 font-semibold text-[rgb(var(--color-text-base))]">
                    <Tag className="w-3 h-3 text-indigo-500" />
                    <span>Quick Label</span>
                  </span>
                  {contextHasAnyTags && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleApplyBatchTag('', 'clear');
                      }}
                      className="text-[9px] text-[rgb(var(--color-text-muted))] hover:text-red-500 transition-colors cursor-pointer"
                      title="Clear labels from selected items"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between gap-1 py-0.5">
                  {PRESET_TAGS.map((preset) => {
                    const allHave =
                      contextTargetNodes.length > 0 &&
                      contextTargetNodes.every((n) =>
                        n.tags?.some((t) => t.toLowerCase() === preset.label.toLowerCase())
                      );
                    const someHave = contextTargetNodes.some((n) =>
                      n.tags?.some((t) => t.toLowerCase() === preset.label.toLowerCase())
                    );
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApplyBatchTag(preset.label, 'toggle');
                        }}
                        title={`${preset.label} (${allHave ? 'Remove from all' : 'Apply to all'})`}
                        className={`w-6 h-6 rounded-full flex items-center justify-center transition-all cursor-pointer ${preset.bgClass} ${preset.borderClass} border hover:scale-115 hover:shadow-xs relative`}
                      >
                        <span className={`w-2.5 h-2.5 rounded-full ${preset.dotClass}`} />
                        {allHave && <Check className="w-3 h-3 text-current absolute stroke-[3]" />}
                        {!allHave && someHave && <Minus className="w-2.5 h-2.5 text-current absolute stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {contextMenu.targetItem ? (
            <>
              <button
                onClick={() => {
                  if (contextMenu.targetItem) {
                    setQuickViewItem(contextMenu.targetItem);
                    SoundService.playFileSelect();
                  }
                  closeContextMenu();
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 text-left hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-base))] font-medium cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-emerald-500" />
                  <span>Quick View</span>
                </div>
                <kbd className="text-[9px] font-mono text-[rgb(var(--color-text-subtle))]">Space</kbd>
              </button>

              <button
                onClick={() => {
                  if (contextMenu.targetItem) {
                    const sNode = contextMenu.targetItem as SearchResultNode;
                    if (contextMenu.targetItem.type === 'folder') {
                      const folderPath = sNode.path && sNode.path.length > 0 ? sNode.path : [...currentPath, contextMenu.targetItem.name];
                      onNavigate(folderPath);
                    } else {
                      const filePath = sNode.path && sNode.path.length > 0 ? sNode.path.slice(0, -1) : currentPath;
                      onOpenFile(contextMenu.targetItem, filePath);
                    }
                  }
                  closeContextMenu();
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-base))] cursor-pointer"
              >
                <ArrowUpRight className="w-4 h-4 text-blue-500" />
                <span>Open</span>
              </button>

              <button
                onClick={() => {
                  onCut();
                  closeContextMenu();
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-base))] cursor-pointer"
              >
                <Scissors className="w-4 h-4 text-gray-500" />
                <span>Cut</span>
              </button>

              <button
                onClick={() => {
                  onCopy();
                  closeContextMenu();
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-base))] cursor-pointer"
              >
                <Copy className="w-4 h-4 text-gray-500" />
                <span>Copy</span>
              </button>

              {contextTargetNames.length === 1 && (
                <button
                  onClick={() => {
                    startInlineRename(contextMenu.targetItem!.name);
                    closeContextMenu();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-base))] cursor-pointer"
                >
                  <Edit2 className="w-4 h-4 text-amber-500" />
                  <span>Rename</span>
                </button>
              )}

              {/* Labels & Tags Submenu Item */}
              <div
                className="relative"
                onMouseEnter={() => setShowTagSubmenu(true)}
                onMouseLeave={() => {
                  if (!isAddingCustomTag) setShowTagSubmenu(false);
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowTagSubmenu(!showTagSubmenu)}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-left hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-base))] cursor-pointer font-medium"
                >
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-indigo-500" />
                    <span>
                      {contextTargetNames.length > 1
                        ? `Labels (${contextTargetNames.length} items)`
                        : 'Labels & Tags'}
                    </span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-[rgb(var(--color-text-subtle))]" />
                </button>

                {/* Flyout Submenu */}
                {showTagSubmenu && (
                  <div
                    style={{
                      [typeof window !== 'undefined' && contextMenu.x > window.innerWidth - 480 ? 'right' : 'left']: '100%',
                      [typeof window !== 'undefined' && contextMenu.x > window.innerWidth - 480 ? 'marginRight' : 'marginLeft']: '4px',
                      top: typeof window !== 'undefined' && contextMenu.y > window.innerHeight - 360 ? '-120px' : '-4px',
                    }}
                    className="absolute z-60 w-56 rounded-lg shadow-2xl bg-[rgb(var(--color-surface-dialog))] border border-[rgb(var(--color-border-base))] py-1.5 text-xs animate-fade-in flex flex-col"
                  >
                    <div className="px-3 py-1 text-[10px] font-bold text-[rgb(var(--color-text-subtle))] border-b border-[rgb(var(--color-border-base))] mb-1 flex items-center justify-between">
                      <span>
                        {contextTargetNames.length > 1
                          ? `Apply to ${contextTargetNames.length} items`
                          : 'Apply Label'}
                      </span>
                      {contextHasAnyTags && (
                        <button
                          type="button"
                          onClick={() => handleApplyBatchTag('', 'clear')}
                          className="text-[10px] text-red-500 hover:underline cursor-pointer font-normal"
                        >
                          Clear All
                        </button>
                      )}
                    </div>

                    {/* Preset tags list */}
                    <div className="flex flex-col">
                      {PRESET_TAGS.map((preset) => {
                        const allHave =
                          contextTargetNodes.length > 0 &&
                          contextTargetNodes.every((n) =>
                            n.tags?.some((t) => t.toLowerCase() === preset.label.toLowerCase())
                          );
                        const someHave = contextTargetNodes.some((n) =>
                          n.tags?.some((t) => t.toLowerCase() === preset.label.toLowerCase())
                        );
                        return (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => handleApplyBatchTag(preset.label, 'toggle')}
                            className="w-full flex items-center justify-between px-3 py-1.5 text-left hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-base))] cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <span className={`w-2.5 h-2.5 rounded-full ${preset.dotClass}`} />
                              <span className="font-medium text-xs">{preset.label}</span>
                            </div>
                            {allHave ? (
                              <span className="text-emerald-500 flex items-center gap-0.5 text-[10px] font-bold">
                                <Check className="w-3 h-3 stroke-[3]" />
                                All
                              </span>
                            ) : someHave ? (
                              <span className="text-amber-500 flex items-center gap-0.5 text-[10px] font-medium">
                                <Minus className="w-3 h-3 stroke-[3]" />
                                Some
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>

                    {/* Custom tag input section */}
                    <div className="pt-1 mt-1 border-t border-[rgb(var(--color-border-base))]">
                      {isAddingCustomTag ? (
                        <div className="p-2 bg-[rgb(var(--color-surface-muted))]/60">
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              autoFocus
                              value={customTagInput}
                              onChange={(e) => setCustomTagInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  if (customTagInput.trim()) {
                                    handleApplyBatchTag(customTagInput.trim(), 'add');
                                    setIsAddingCustomTag(false);
                                    setCustomTagInput('');
                                  }
                                } else if (e.key === 'Escape') {
                                  setIsAddingCustomTag(false);
                                  setCustomTagInput('');
                                }
                              }}
                              placeholder="New label name..."
                              className="flex-1 px-2 py-1 rounded bg-[rgb(var(--color-surface-input))] border border-[rgb(var(--color-border-input))] text-[11px] text-[rgb(var(--color-text-base))] outline-none focus:border-indigo-500"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (customTagInput.trim()) {
                                  handleApplyBatchTag(customTagInput.trim(), 'add');
                                  setIsAddingCustomTag(false);
                                  setCustomTagInput('');
                                }
                              }}
                              disabled={!customTagInput.trim()}
                              className="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-medium disabled:opacity-40 cursor-pointer transition-colors"
                            >
                              Add
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setIsAddingCustomTag(false);
                                setCustomTagInput('');
                              }}
                              className="p-1 text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text-base))] cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setIsAddingCustomTag(true)}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-base))] cursor-pointer text-xs"
                        >
                          <Plus className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Add Custom Label...</span>
                        </button>
                      )}
                    </div>

                    {/* Clear All Labels */}
                    {contextHasAnyTags && (
                      <button
                        type="button"
                        onClick={() => handleApplyBatchTag('', 'clear')}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-red-500/10 text-red-500 cursor-pointer text-xs border-t border-[rgb(var(--color-border-base))] mt-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Clear All Labels ({contextTargetNames.length})</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={() => {
                  if (contextMenu.targetItem) onShare(contextMenu.targetItem);
                  closeContextMenu();
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-base))] cursor-pointer"
              >
                <Share2 className="w-4 h-4 text-purple-500" />
                <span>Share / Magnet Info</span>
              </button>

              {isInTrash && onRestore && (
                <button
                  onClick={() => {
                    onRestore(contextTargetNames);
                    closeContextMenu();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Restore to Original Location</span>
                </button>
              )}

              <button
                onClick={() => {
                  onDelete(contextTargetNames);
                  closeContextMenu();
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-[rgb(var(--color-surface-hover))] text-red-500 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>
                  {isInTrash ? 'Delete Permanently' : 'Delete'} {contextTargetNames.length > 1 ? `(${contextTargetNames.length})` : ''}
                </span>
              </button>

              <div className="border-t border-[rgb(var(--color-border-base))] my-1" />

              <button
                onClick={() => {
                  handleSelectAll();
                  closeContextMenu();
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 text-left hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-base))] cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <CheckCheck className="w-4 h-4 text-cyan-500" />
                  <span>Select All</span>
                </div>
                <kbd className="text-[9px] font-mono text-[rgb(var(--color-text-subtle))]">Ctrl+A</kbd>
              </button>

              <button
                onClick={() => {
                  if (contextMenu.targetItem) onShowProperties(contextMenu.targetItem);
                  closeContextMenu();
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-base))] cursor-pointer"
              >
                <Info className="w-4 h-4 text-indigo-500" />
                <span>Properties</span>
              </button>
            </>
          ) : (
            <>
              {/* If user right-clicked background with items selected, offer Labels menu */}
              {contextTargetNames.length > 0 && (
                <div
                  className="relative"
                  onMouseEnter={() => setShowTagSubmenu(true)}
                  onMouseLeave={() => {
                    if (!isAddingCustomTag) setShowTagSubmenu(false);
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setShowTagSubmenu(!showTagSubmenu)}
                    className="w-full flex items-center justify-between px-3 py-1.5 text-left hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-base))] cursor-pointer font-medium"
                  >
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-indigo-500" />
                      <span>Labels ({contextTargetNames.length} items)</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-[rgb(var(--color-text-subtle))]" />
                  </button>

                  {/* Flyout Submenu for background right click */}
                  {showTagSubmenu && (
                    <div
                      style={{
                        [typeof window !== 'undefined' && contextMenu.x > window.innerWidth - 480 ? 'right' : 'left']: '100%',
                        [typeof window !== 'undefined' && contextMenu.x > window.innerWidth - 480 ? 'marginRight' : 'marginLeft']: '4px',
                        top: typeof window !== 'undefined' && contextMenu.y > window.innerHeight - 360 ? '-120px' : '-4px',
                      }}
                      className="absolute z-60 w-56 rounded-lg shadow-2xl bg-[rgb(var(--color-surface-dialog))] border border-[rgb(var(--color-border-base))] py-1.5 text-xs animate-fade-in flex flex-col"
                    >
                      <div className="px-3 py-1 text-[10px] font-bold text-[rgb(var(--color-text-subtle))] border-b border-[rgb(var(--color-border-base))] mb-1 flex items-center justify-between">
                        <span>Apply to {contextTargetNames.length} items</span>
                        {contextHasAnyTags && (
                          <button
                            type="button"
                            onClick={() => handleApplyBatchTag('', 'clear')}
                            className="text-[10px] text-red-500 hover:underline cursor-pointer font-normal"
                          >
                            Clear All
                          </button>
                        )}
                      </div>

                      <div className="flex flex-col">
                        {PRESET_TAGS.map((preset) => {
                          const allHave =
                            contextTargetNodes.length > 0 &&
                            contextTargetNodes.every((n) =>
                              n.tags?.some((t) => t.toLowerCase() === preset.label.toLowerCase())
                            );
                          const someHave = contextTargetNodes.some((n) =>
                            n.tags?.some((t) => t.toLowerCase() === preset.label.toLowerCase())
                          );
                          return (
                            <button
                              key={preset.label}
                              type="button"
                              onClick={() => handleApplyBatchTag(preset.label, 'toggle')}
                              className="w-full flex items-center justify-between px-3 py-1.5 text-left hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-base))] cursor-pointer transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <span className={`w-2.5 h-2.5 rounded-full ${preset.dotClass}`} />
                                <span className="font-medium text-xs">{preset.label}</span>
                              </div>
                              {allHave ? (
                                <span className="text-emerald-500 flex items-center gap-0.5 text-[10px] font-bold">
                                  <Check className="w-3 h-3 stroke-[3]" />
                                  All
                                </span>
                              ) : someHave ? (
                                <span className="text-amber-500 flex items-center gap-0.5 text-[10px] font-medium">
                                  <Minus className="w-3 h-3 stroke-[3]" />
                                  Some
                                </span>
                              ) : null}
                            </button>
                          );
                        })}
                      </div>

                      {/* Custom tag input section */}
                      <div className="pt-1 mt-1 border-t border-[rgb(var(--color-border-base))]">
                        {isAddingCustomTag ? (
                          <div className="p-2 bg-[rgb(var(--color-surface-muted))]/60">
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                autoFocus
                                value={customTagInput}
                                onChange={(e) => setCustomTagInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    if (customTagInput.trim()) {
                                      handleApplyBatchTag(customTagInput.trim(), 'add');
                                      setIsAddingCustomTag(false);
                                      setCustomTagInput('');
                                    }
                                  } else if (e.key === 'Escape') {
                                    setIsAddingCustomTag(false);
                                    setCustomTagInput('');
                                  }
                                }}
                                placeholder="New label name..."
                                className="flex-1 px-2 py-1 rounded bg-[rgb(var(--color-surface-input))] border border-[rgb(var(--color-border-input))] text-[11px] text-[rgb(var(--color-text-base))] outline-none focus:border-indigo-500"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  if (customTagInput.trim()) {
                                    handleApplyBatchTag(customTagInput.trim(), 'add');
                                    setIsAddingCustomTag(false);
                                    setCustomTagInput('');
                                  }
                                }}
                                disabled={!customTagInput.trim()}
                                className="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-medium disabled:opacity-40 cursor-pointer transition-colors"
                              >
                                Add
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setIsAddingCustomTag(false);
                                  setCustomTagInput('');
                                }}
                                className="p-1 text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text-base))] cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setIsAddingCustomTag(true)}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-base))] cursor-pointer text-xs"
                          >
                            <Plus className="w-3.5 h-3.5 text-indigo-500" />
                            <span>Add Custom Label...</span>
                          </button>
                        )}
                      </div>

                      {contextHasAnyTags && (
                        <button
                          type="button"
                          onClick={() => handleApplyBatchTag('', 'clear')}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-red-500/10 text-red-500 cursor-pointer text-xs border-t border-[rgb(var(--color-border-base))] mt-0.5"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Clear All Labels ({contextTargetNames.length})</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {contextTargetNames.length > 0 && (
                <div className="border-t border-[rgb(var(--color-border-base))] my-1" />
              )}

              {isInTrash ? (
                <>
                  {onRestore && items.length > 0 && (
                    <button
                      onClick={() => {
                        onRestore();
                        closeContextMenu();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Restore All Items</span>
                    </button>
                  )}
                  {onEmptyTrash && (
                    <button
                      onClick={() => {
                        onEmptyTrash();
                        closeContextMenu();
                      }}
                      disabled={items.length === 0}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-red-500/10 text-red-500 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer font-medium"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Empty Trash</span>
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      const name = prompt('New Folder Name:');
                      if (name && name.trim()) onCreateFolder(name.trim());
                      closeContextMenu();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-base))] cursor-pointer"
                  >
                    <FolderPlus className="w-4 h-4 text-amber-500" />
                    <span>New Folder</span>
                  </button>

                  <button
                    onClick={() => {
                      const name = prompt('New File Name (e.g. notes.md):');
                      if (name && name.trim()) onCreateFile(name.trim());
                      closeContextMenu();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-base))] cursor-pointer"
                  >
                    <FilePlus className="w-4 h-4 text-blue-500" />
                    <span>New File</span>
                  </button>

                  <button
                    onClick={() => {
                      onPaste();
                      closeContextMenu();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-base))] cursor-pointer"
                  >
                    <Copy className="w-4 h-4 text-gray-500" />
                    <span>Paste</span>
                  </button>
                </>
              )}

              <div className="border-t border-[rgb(var(--color-border-base))] my-1" />

              <button
                onClick={() => {
                  handleSelectAll();
                  closeContextMenu();
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 text-left hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-base))] cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <CheckCheck className="w-4 h-4 text-cyan-500" />
                  <span>Select All</span>
                </div>
                <kbd className="text-[9px] font-mono text-[rgb(var(--color-text-subtle))]">Ctrl+A</kbd>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};
