import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  FolderPlus,
  FilePlus,
  Upload,
  Scissors,
  Copy,
  ClipboardPaste,
  Edit2,
  Trash2,
  Share2,
  Search,
  X,
  ArrowDownUp,
  LayoutGrid,
  List,
  Columns,
  PanelRight,
  PanelLeft,
  Terminal,
  Compass,
  Menu,
  Check,
  ChevronDown,
  Palette,
  Server,
  Settings,
  Rss,
  Sliders,
  DownloadCloud,
  UploadCloud,
  FileText,
  Sparkles,
  Layers,
  Tag,
  RotateCcw,
  Zap,
  Folder,
} from 'lucide-react';
import { SortCriteria, DisplayMode, SortKey } from '../types';
import { PRESET_TAGS, getTagStyle, parseFilterQuery, useTagDefinitions } from '../utils/tagUtils';

interface ToolbarProps {
  canCut: boolean;
  canCopy: boolean;
  canPaste: boolean;
  canRename: boolean;
  canShare: boolean;
  canDelete: boolean;
  currentSort: SortCriteria;
  displayMode: DisplayMode;
  groupByType?: boolean;
  filterQuery: string;
  searchScope?: 'folder' | 'vfs';
  onSearchScopeChange?: (scope: 'folder' | 'vfs') => void;
  onOpenGlobalSearch?: () => void;
  activeTagFilter?: string | null;
  onTagFilterChange?: (tag: string | null) => void;
  tagCounts?: Map<string, number>;
  totalTaggedCount?: number;
  matchCount?: number;
  totalCount?: number;
  isSplitViewActive: boolean;
  isDetailPaneActive: boolean;
  isSidebarVisible: boolean;
  isTerminalVisible: boolean;
  isStreamVisible: boolean;
  isAIChatVisible?: boolean;
  currentTheme: string;
  onNewFolder: () => void;
  onNewFile: (defaultExt?: string) => void;
  onUpload: (files: FileList) => void;
  onCut: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onRename: () => void;
  onShare: () => void;
  onDelete: () => void;
  onEmptyTrash?: () => void;
  trashCount?: number;
  isInTrash?: boolean;
  onOpenTrash?: () => void;
  onRestore?: () => void;
  canRestore?: boolean;
  onSortChange: (sort: SortCriteria) => void;
  onDisplayModeChange: (mode: DisplayMode) => void;
  onGroupByTypeChange?: (groupByType: boolean) => void;
  onFilterChange: (query: string) => void;
  onToggleSplitView: () => void;
  onToggleDetailPane: () => void;
  onToggleSidebar: () => void;
  onToggleTerminal: () => void;
  onToggleStream: () => void;
  onToggleAIChat?: () => void;
  onThemeChange: (theme: string) => void;
  onOpenServerProfiles: () => void;
  onOpenLocalConfig: () => void;
  onOpenRssFeeds: () => void;
  onOpenPreferences: () => void;
  onOpenImport: () => void;
  onOpenExport: () => void;
}

const THEMES = [
  { id: 'theme-system', name: 'System Default' },
  { id: 'theme-light', name: 'Light (Pure Clean)' },
  { id: 'theme-dark', name: 'Dark Mode' },
  { id: 'theme-nord', name: 'Nord Frost' },
  { id: 'theme-solarized', name: 'Solarized Warm' },
  { id: 'theme-midnight', name: 'Midnight Blue' },
];

export const Toolbar: React.FC<ToolbarProps> = ({
  canCut,
  canCopy,
  canPaste,
  canRename,
  canShare,
  canDelete,
  currentSort,
  displayMode,
  groupByType = false,
  filterQuery,
  searchScope = 'folder',
  onSearchScopeChange,
  onOpenGlobalSearch,
  activeTagFilter = null,
  onTagFilterChange,
  tagCounts,
  totalTaggedCount = 0,
  matchCount,
  totalCount,
  isSplitViewActive,
  isDetailPaneActive,
  isSidebarVisible,
  isTerminalVisible,
  isStreamVisible,
  isAIChatVisible = true,
  currentTheme,
  onNewFolder,
  onNewFile,
  onUpload,
  onCut,
  onCopy,
  onPaste,
  onRename,
  onShare,
  onDelete,
  onEmptyTrash,
  trashCount = 0,
  isInTrash = false,
  onOpenTrash,
  onRestore,
  canRestore = false,
  onSortChange,
  onDisplayModeChange,
  onGroupByTypeChange,
  onFilterChange,
  onToggleSplitView,
  onToggleDetailPane,
  onToggleSidebar,
  onToggleTerminal,
  onToggleStream,
  onToggleAIChat,
  onThemeChange,
  onOpenServerProfiles,
  onOpenLocalConfig,
  onOpenRssFeeds,
  onOpenPreferences,
  onOpenImport,
  onOpenExport,
}) => {
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isGroupOpen, setIsGroupOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const tagDropdownRef = useRef<HTMLDivElement>(null);

  const tagDefs = useTagDefinitions();

  // Parse any tag modifiers present in the text search query
  const parsedFromQuery = useMemo(() => parseFilterQuery(filterQuery), [filterQuery]);
  const queryHasTagModifier =
    parsedFromQuery.tagModifiers.length > 0 ||
    parsedFromQuery.hasAnyTag ||
    parsedFromQuery.hasNoTag;

  // Extract custom labels present in the active directory that are not in tagDefs
  const customTags = useMemo(() => {
    if (!tagCounts) return [];
    const list: Array<{ label: string; count: number }> = [];
    tagCounts.forEach((count, label) => {
      const isDefined = tagDefs.some(
        (p) => p.label.toLowerCase() === label.toLowerCase()
      );
      if (!isDefined && count > 0) {
        list.push({ label, count });
      }
    });
    return list.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }, [tagCounts, tagDefs]);

  // Global keyboard shortcut: Ctrl+F, Cmd+F, or '/' to focus search input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.tagName === 'SELECT' ||
          (activeEl as HTMLElement).isContentEditable);

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      } else if (e.key === '/' && !isInput) {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setIsNewOpen(false);
        setIsSortOpen(false);
        setIsGroupOpen(false);
        setIsViewOpen(false);
        setIsMenuOpen(false);
        setIsThemeOpen(false);
        setIsTagDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(e.target.files);
      e.target.value = '';
    }
  };

  return (
    <div
      ref={toolbarRef}
      className="flex flex-wrap items-center justify-between gap-1.5 px-3 py-1.5 bg-[rgb(var(--color-surface-muted))] border-b border-[rgb(var(--color-border-base))] text-xs select-none shadow-sm"
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        multiple
        className="hidden"
      />

      {/* Left Action Buttons */}
      <div className="flex items-center gap-1">
        {/* Toggle Sidebar Button */}
        <button
          onClick={onToggleSidebar}
          title="Toggle Navigation Sidebar"
          className={`p-1.5 rounded transition-colors ${
            isSidebarVisible
              ? 'bg-[rgb(var(--color-accent-bg))] text-[rgb(var(--color-accent-text))]'
              : 'hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text-base))]'
          }`}
        >
          <PanelLeft className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-[rgb(var(--color-border-base))] mx-0.5" />

        {/* New Item Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsNewOpen(!isNewOpen)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-[rgb(var(--color-accent-bg))] text-[rgb(var(--color-accent-text))] font-medium hover:opacity-90 transition-opacity shadow-sm"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>New</span>
            <ChevronDown className="w-3 h-3 ml-0.5 opacity-80" />
          </button>

          {isNewOpen && (
            <div className="absolute left-0 mt-1 w-44 rounded-md shadow-xl bg-[rgb(var(--color-surface-dialog))] border border-[rgb(var(--color-border-base))] py-1 z-50 animate-fade-in">
              <button
                onClick={() => {
                  setIsNewOpen(false);
                  onNewFolder();
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-base))]"
              >
                <FolderPlus className="w-4 h-4 text-amber-500" />
                <span>Folder</span>
              </button>
              <button
                onClick={() => {
                  setIsNewOpen(false);
                  onNewFile('.md');
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-base))]"
              >
                <FileText className="w-4 h-4 text-blue-500" />
                <span>Markdown Document</span>
              </button>
              <button
                onClick={() => {
                  setIsNewOpen(false);
                  onNewFile('.txt');
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-base))]"
              >
                <FilePlus className="w-4 h-4 text-gray-500" />
                <span>Plain Text File</span>
              </button>
            </div>
          )}
        </div>

        {/* Upload Button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          title="Upload Files"
          className="flex items-center gap-1.5 px-2 py-1.5 rounded hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text-base))] transition-colors"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Upload</span>
        </button>

        <div className="h-4 w-px bg-[rgb(var(--color-border-base))] mx-0.5" />

        {/* Cut / Copy / Paste / Rename / Share / Delete */}
        <button
          onClick={onCut}
          disabled={!canCut}
          title="Cut (Ctrl+X)"
          className="p-1.5 rounded hover:bg-[rgb(var(--color-surface-hover))] disabled:opacity-30 disabled:hover:bg-transparent text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text-base))]"
        >
          <Scissors className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onCopy}
          disabled={!canCopy}
          title="Copy (Ctrl+C)"
          className="p-1.5 rounded hover:bg-[rgb(var(--color-surface-hover))] disabled:opacity-30 disabled:hover:bg-transparent text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text-base))]"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onPaste}
          disabled={!canPaste}
          title="Paste (Ctrl+V)"
          className="p-1.5 rounded hover:bg-[rgb(var(--color-surface-hover))] disabled:opacity-30 disabled:hover:bg-transparent text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text-base))]"
        >
          <ClipboardPaste className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onRename}
          disabled={!canRename}
          title="Rename (F2)"
          className="p-1.5 rounded hover:bg-[rgb(var(--color-surface-hover))] disabled:opacity-30 disabled:hover:bg-transparent text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text-base))]"
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onShare}
          disabled={!canShare}
          title="Share / Magnet Info"
          className="p-1.5 rounded hover:bg-[rgb(var(--color-surface-hover))] disabled:opacity-30 disabled:hover:bg-transparent text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text-base))]"
        >
          <Share2 className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onDelete}
          disabled={!canDelete}
          title={isInTrash ? "Permanently Delete Selected" : "Move to Trash (Delete)"}
          className="p-1.5 rounded hover:bg-[rgb(var(--color-surface-hover))] hover:text-red-500 disabled:opacity-30 disabled:hover:bg-transparent text-[rgb(var(--color-text-muted))]"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>

        {isInTrash && onRestore && (
          <button
            onClick={onRestore}
            disabled={!canRestore}
            title="Restore selected item(s) to original location"
            className="flex items-center gap-1 px-2 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Restore</span>
          </button>
        )}

        {onEmptyTrash && (
          <button
            id="toolbar-empty-trash-btn"
            onClick={onEmptyTrash}
            disabled={trashCount === 0}
            title={
              trashCount > 0
                ? `Empty Trash (${trashCount} item${trashCount === 1 ? '' : 's'})`
                : 'Empty Trash (Trash is empty)'
            }
            className={`flex items-center gap-1.5 px-2 py-1 rounded transition-colors text-xs font-medium ${
              trashCount > 0
                ? 'hover:bg-red-500/15 text-red-600 dark:text-red-400 hover:text-red-700'
                : 'text-[rgb(var(--color-text-muted))] opacity-40 hover:bg-transparent cursor-not-allowed'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Empty Trash</span>
            {trashCount > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-red-500/20 text-red-600 dark:text-red-400 font-bold leading-none">
                {trashCount}
              </span>
            )}
          </button>
        )}

        <div className="h-4 w-px bg-[rgb(var(--color-border-base))] mx-0.5" />

        {/* Sort Menu */}
        <div className="relative">
          <button
            onClick={() => setIsSortOpen(!isSortOpen)}
            title="Sort Options (Ctrl+S to cycle criteria)"
            className="flex items-center gap-1 px-2 py-1.5 rounded hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text-base))] transition-colors"
          >
            <ArrowDownUp className="w-3.5 h-3.5" />
            <span>Sort</span>
          </button>

          {isSortOpen && (
            <div className="absolute left-0 mt-1 w-48 rounded-md shadow-xl bg-[rgb(var(--color-surface-dialog))] border border-[rgb(var(--color-border-base))] py-1 z-50">
              <div className="px-3 py-1 text-[10px] font-bold text-[rgb(var(--color-text-subtle))] uppercase tracking-wider flex items-center justify-between">
                <span>Sort By</span>
                <span className="text-[9px] font-normal lowercase opacity-70">Shift+Click multi</span>
              </div>
              {(isInTrash
                ? (['name', 'originalPath', 'modified', 'size', 'type'] as const)
                : (['name', 'modified', 'size', 'type'] as const)
              ).map((key) => {
                const isPrimary = currentSort.key === key;
                const secIdx = currentSort.secondary?.findIndex((s) => s.key === key) ?? -1;
                const isSecondary = secIdx >= 0;
                const secRule = isSecondary && currentSort.secondary ? currentSort.secondary[secIdx] : null;

                return (
                  <button
                    key={key}
                    onClick={(e) => {
                      if (e.shiftKey) {
                        if (isPrimary) {
                          const nextDir = currentSort.direction === 'asc' ? 'desc' : 'asc';
                          onSortChange({ ...currentSort, direction: nextDir });
                        } else if (isSecondary && currentSort.secondary) {
                          const updated = [...currentSort.secondary];
                          const nextDir = updated[secIdx].direction === 'asc' ? 'desc' : 'asc';
                          updated[secIdx] = { ...updated[secIdx], direction: nextDir };
                          onSortChange({ ...currentSort, secondary: updated });
                        } else {
                          onSortChange({
                            ...currentSort,
                            secondary: [...(currentSort.secondary || []), { key, direction: 'asc' }],
                          });
                        }
                      } else {
                        const nextDir = isPrimary && currentSort.direction === 'asc' ? 'desc' : 'asc';
                        onSortChange({ key, direction: nextDir, secondary: undefined });
                        setIsSortOpen(false);
                      }
                    }}
                    title={`${isPrimary ? 'Primary sort' : isSecondary ? `Secondary sort #${secIdx + 2}` : 'Sort by this column'}. Hold Shift to add or toggle secondary criteria.`}
                    className="w-full flex items-center justify-between px-3 py-1.5 text-left hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-base))]"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="capitalize">{key === 'modified' ? 'Date Modified' : key === 'originalPath' ? 'Original Path' : key}</span>
                      {isSecondary && (
                        <span className="text-[8px] px-1 py-0.2 rounded bg-[rgb(var(--color-surface-base))] border border-[rgb(var(--color-border-base))] text-[rgb(var(--color-accent-text))] font-mono">
                          #{secIdx + 2}
                        </span>
                      )}
                    </div>
                    {isPrimary && (
                      <span className="text-[10px] text-[rgb(var(--color-accent-text))] font-semibold">
                        {currentSort.direction.toUpperCase()}
                      </span>
                    )}
                    {isSecondary && secRule && (
                      <span className="text-[9px] text-[rgb(var(--color-accent-text))] opacity-80 font-medium">
                        {secRule.direction.toUpperCase()}
                      </span>
                    )}
                  </button>
                );
              })}
              {currentSort.secondary && currentSort.secondary.length > 0 && (
                <div className="pt-1 mt-1 border-t border-[rgb(var(--color-border-base))] px-2">
                  <button
                    onClick={() => {
                      onSortChange({ key: currentSort.key, direction: currentSort.direction, secondary: undefined });
                      setIsSortOpen(false);
                    }}
                    className="w-full py-1 text-[10px] text-center text-[rgb(var(--color-text-muted))] hover:text-red-400 transition-colors"
                  >
                    Clear Secondary Sorts
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Group By Menu */}
        <div className="relative">
          <button
            onClick={() => setIsGroupOpen(!isGroupOpen)}
            title="Group files by type ('Folders', 'Documents', 'Images', 'Other') — Click or press Ctrl+G"
            className={`flex items-center gap-1 px-2 py-1.5 rounded transition-colors ${
              groupByType
                ? 'bg-[rgb(var(--color-accent-bg))] text-[rgb(var(--color-accent-text))] font-semibold border border-[rgb(var(--color-accent-border))] shadow-2xs'
                : 'hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text-base))]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Group</span>
            {groupByType && (
              <span className="text-[9px] px-1 py-0.2 rounded bg-[rgb(var(--color-surface-base))] text-[rgb(var(--color-accent-text))] border border-[rgb(var(--color-accent-border))] font-mono">
                Type
              </span>
            )}
          </button>

          {isGroupOpen && (
            <div className="absolute left-0 mt-1 w-52 rounded-md shadow-xl bg-[rgb(var(--color-surface-dialog))] border border-[rgb(var(--color-border-base))] py-1 z-50 animate-fade-in">
              <div className="px-3 py-1 text-[10px] font-bold text-[rgb(var(--color-text-subtle))] uppercase tracking-wider flex items-center justify-between border-b border-[rgb(var(--color-border-base))] mb-1">
                <span>Group By</span>
                <span className="text-[9px] font-mono lowercase opacity-75">Ctrl+G</span>
              </div>
              <button
                onClick={() => {
                  onGroupByTypeChange?.(false);
                  setIsGroupOpen(false);
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 text-left hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-base))]"
              >
                <span>(None)</span>
                {!groupByType && <Check className="w-3.5 h-3.5 text-[rgb(var(--color-accent-text))]" />}
              </button>
              <button
                onClick={() => {
                  onGroupByTypeChange?.(true);
                  setIsGroupOpen(false);
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 text-left hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-base))]"
              >
                <div className="flex flex-col">
                  <span className="font-medium">By Type</span>
                  <span className="text-[9px] text-[rgb(var(--color-text-subtle))]">
                    Folders, Documents, Images, Other
                  </span>
                </div>
                {groupByType && <Check className="w-3.5 h-3.5 text-[rgb(var(--color-accent-text))]" />}
              </button>
            </div>
          )}
        </div>

        {/* View Mode Menu */}
        <div className="relative">
          <button
            onClick={() => setIsViewOpen(!isViewOpen)}
            title="View Mode"
            className="flex items-center gap-1 px-2 py-1.5 rounded hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text-base))] transition-colors"
          >
            {displayMode === 'grid' ? <LayoutGrid className="w-3.5 h-3.5" /> : <List className="w-3.5 h-3.5" />}
            <span>View</span>
          </button>

          {isViewOpen && (
            <div className="absolute left-0 mt-1 w-44 rounded-md shadow-xl bg-[rgb(var(--color-surface-dialog))] border border-[rgb(var(--color-border-base))] py-1 z-50">
              {[
                { mode: 'grid' as DisplayMode, label: 'Grid / Cards', icon: <LayoutGrid className="w-4 h-4" /> },
                { mode: 'list' as DisplayMode, label: 'Detailed List', icon: <List className="w-4 h-4" /> },
                { mode: 'largeIcons' as DisplayMode, label: 'Large Icons', icon: <LayoutGrid className="w-4 h-4" /> },
                { mode: 'smallIcons' as DisplayMode, label: 'Small Icons', icon: <List className="w-4 h-4" /> },
                { mode: 'tiles' as DisplayMode, label: 'Compact Tiles', icon: <LayoutGrid className="w-4 h-4" /> },
              ].map((item) => (
                <button
                  key={item.mode}
                  onClick={() => {
                    onDisplayModeChange(item.mode);
                    setIsViewOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-left hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-base))]"
                >
                  <div className="flex items-center gap-2">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  {displayMode === item.mode && <Check className="w-3.5 h-3.5 text-[rgb(var(--color-accent-text))]" />}
                </button>
              ))}
              <div className="h-px bg-[rgb(var(--color-border-base))] my-1" />
              <button
                onClick={() => {
                  onGroupByTypeChange?.(!groupByType);
                  setIsViewOpen(false);
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 text-left hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-base))]"
              >
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[rgb(var(--color-accent-text))]" />
                  <div className="flex flex-col">
                    <span>Group by Type</span>
                    <span className="text-[9px] text-[rgb(var(--color-text-subtle))]">
                      Folders, Documents, Images, Other
                    </span>
                  </div>
                </div>
                {groupByType && <Check className="w-3.5 h-3.5 text-[rgb(var(--color-accent-text))]" />}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right Controls (Global Filter/Search, Panes Toggles, Hamburger) */}
      <div className="flex items-center gap-1.5">
        {/* Tag Filter Dropdown Button & Menu */}
        <div className="relative" ref={tagDropdownRef}>
          {activeTagFilter ? (
            <div
              id="toolbar-active-tag-filter"
              className={`flex items-center gap-1 pl-2 pr-1 py-1 rounded-md border text-xs font-medium shadow-xs transition-all ${
                activeTagFilter === '__ANY__'
                  ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30'
                  : activeTagFilter === '__NONE__'
                  ? 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30'
                  : `${getTagStyle(activeTagFilter).bgClass} ${getTagStyle(activeTagFilter).textClass} ${getTagStyle(activeTagFilter).borderClass}`
              }`}
            >
              <button
                type="button"
                id="toolbar-tag-filter-button"
                onClick={() => setIsTagDropdownOpen(!isTagDropdownOpen)}
                className="flex items-center gap-1.5 cursor-pointer hover:opacity-85 focus:outline-none"
                title={`Active tag filter: ${
                  activeTagFilter === '__ANY__'
                    ? 'Any Tag'
                    : activeTagFilter === '__NONE__'
                    ? 'Untagged'
                    : activeTagFilter
                }. Click to change.`}
              >
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    activeTagFilter === '__ANY__'
                      ? 'bg-indigo-500'
                      : activeTagFilter === '__NONE__'
                      ? 'bg-slate-400'
                      : getTagStyle(activeTagFilter).dotClass
                  }`}
                />
                <span className="font-semibold max-w-[85px] sm:max-w-[120px] truncate">
                  {activeTagFilter === '__ANY__'
                    ? 'Any Tag'
                    : activeTagFilter === '__NONE__'
                    ? 'Untagged'
                    : activeTagFilter}
                </span>
                <ChevronDown className="w-3 h-3 opacity-70" />
              </button>
              <button
                type="button"
                id="toolbar-clear-tag-filter-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onTagFilterChange?.(null);
                }}
                title="Clear tag filter"
                className="p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-current transition-colors cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              id="toolbar-tag-filter-button"
              onClick={() => setIsTagDropdownOpen(!isTagDropdownOpen)}
              title="Filter items by colored tag / label"
              className={`flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-medium transition-all cursor-pointer ${
                isTagDropdownOpen
                  ? 'bg-[rgb(var(--color-surface-hover))] border-[rgb(var(--color-border-base))] text-[rgb(var(--color-text-base))]'
                  : queryHasTagModifier
                  ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-700 dark:text-indigo-300 font-semibold'
                  : 'bg-[rgb(var(--color-surface-input))] border-[rgb(var(--color-border-input))] hover:border-[rgb(var(--color-border-base))] text-[rgb(var(--color-text-subtle))] hover:text-[rgb(var(--color-text-base))]'
              }`}
            >
              <Tag
                className={`w-3.5 h-3.5 ${
                  queryHasTagModifier ? 'text-indigo-500' : 'text-indigo-400'
                }`}
              />
              <span className="hidden sm:inline">
                {queryHasTagModifier
                  ? `Tag: ${parsedFromQuery.tagModifiers[0] || 'Modifier'}`
                  : 'Tag Filter'}
              </span>
              <ChevronDown className="w-3 h-3 opacity-70" />
            </button>
          )}

          {/* Tag Filter Dropdown Menu */}
          {isTagDropdownOpen && (
            <div
              id="toolbar-tag-filter-menu"
              className="absolute right-0 sm:right-auto sm:left-0 mt-1 w-64 rounded-lg shadow-2xl bg-[rgb(var(--color-surface-dialog))] border border-[rgb(var(--color-border-base))] py-1.5 z-50 animate-fade-in select-none"
            >
              {/* Menu Header */}
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-[rgb(var(--color-border-base))]">
                <span className="text-[11px] font-bold text-[rgb(var(--color-text-subtle))] uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-indigo-500" />
                  Filter by Tag
                </span>
                {(activeTagFilter || queryHasTagModifier) && (
                  <button
                    type="button"
                    onClick={() => {
                      onTagFilterChange?.(null);
                      if (queryHasTagModifier) {
                        onFilterChange(parsedFromQuery.textQuery);
                      }
                      setIsTagDropdownOpen(false);
                    }}
                    className="text-[10px] text-rose-500 hover:text-rose-600 hover:underline font-medium cursor-pointer"
                  >
                    Reset All
                  </button>
                )}
              </div>

              {/* Quick Options */}
              <div className="py-1">
                {/* All Items */}
                <button
                  type="button"
                  onClick={() => {
                    onTagFilterChange?.(null);
                    setIsTagDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-1.5 text-left text-xs hover:bg-[rgb(var(--color-surface-hover))] transition-colors cursor-pointer ${
                    !activeTagFilter && !queryHasTagModifier
                      ? 'bg-[rgb(var(--color-surface-hover))] font-semibold text-[rgb(var(--color-accent-text))]'
                      : 'text-[rgb(var(--color-text-base))]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full border border-[rgb(var(--color-text-subtle))] flex-shrink-0" />
                    <span>All Items (No Tag Filter)</span>
                  </div>
                  {!activeTagFilter && !queryHasTagModifier && (
                    <Check className="w-3.5 h-3.5 text-[rgb(var(--color-accent-text))]" />
                  )}
                </button>

                {/* Any Tagged Item */}
                <button
                  type="button"
                  onClick={() => {
                    onTagFilterChange?.(activeTagFilter === '__ANY__' ? null : '__ANY__');
                    setIsTagDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-1.5 text-left text-xs hover:bg-[rgb(var(--color-surface-hover))] transition-colors cursor-pointer ${
                    activeTagFilter === '__ANY__'
                      ? 'bg-[rgb(var(--color-surface-hover))] font-semibold text-indigo-600 dark:text-indigo-400'
                      : 'text-[rgb(var(--color-text-base))]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3 h-3 text-indigo-500 flex-shrink-0" />
                    <span>Any Tagged Item</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {totalTaggedCount > 0 && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-[rgb(var(--color-surface-muted))] border border-[rgb(var(--color-border-base))] text-[rgb(var(--color-text-subtle))]">
                        {totalTaggedCount}
                      </span>
                    )}
                    {activeTagFilter === '__ANY__' && (
                      <Check className="w-3.5 h-3.5 text-indigo-500" />
                    )}
                  </div>
                </button>

                {/* Untagged Items */}
                <button
                  type="button"
                  onClick={() => {
                    onTagFilterChange?.(activeTagFilter === '__NONE__' ? null : '__NONE__');
                    setIsTagDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-1.5 text-left text-xs hover:bg-[rgb(var(--color-surface-hover))] transition-colors cursor-pointer ${
                    activeTagFilter === '__NONE__'
                      ? 'bg-[rgb(var(--color-surface-hover))] font-semibold text-[rgb(var(--color-accent-text))]'
                      : 'text-[rgb(var(--color-text-base))]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full border border-dashed border-[rgb(var(--color-text-subtle))] flex-shrink-0" />
                    <span>Untagged Items Only</span>
                  </div>
                  {activeTagFilter === '__NONE__' && (
                    <Check className="w-3.5 h-3.5 text-[rgb(var(--color-accent-text))]" />
                  )}
                </button>
              </div>

              <div className="h-px bg-[rgb(var(--color-border-base))] my-1" />

              {/* Standard Colored Labels */}
              <div className="px-3 py-1 text-[10px] font-semibold text-[rgb(var(--color-text-subtle))] uppercase tracking-wider">
                Colored Labels
              </div>
              <div className="py-0.5 max-h-44 overflow-y-auto">
                {tagDefs.map((def) => {
                  const style = getTagStyle(def.label);
                  const count = tagCounts?.get(def.label) || 0;
                  const isSelected =
                    activeTagFilter?.toLowerCase() === def.label.toLowerCase() ||
                    parsedFromQuery.tagModifiers.some(
                      (m: string) => m.toLowerCase() === def.label.toLowerCase()
                    );

                  return (
                    <button
                      key={def.id}
                      type="button"
                      onClick={() => {
                        if (activeTagFilter?.toLowerCase() === def.label.toLowerCase()) {
                          onTagFilterChange?.(null);
                        } else {
                          onTagFilterChange?.(def.label);
                        }
                        setIsTagDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-1.5 text-left text-xs hover:bg-[rgb(var(--color-surface-hover))] transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[rgb(var(--color-surface-hover))] font-semibold'
                          : 'text-[rgb(var(--color-text-base))]'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-2xs ${style.dotClass}`}
                        />
                        <span className="truncate">{def.label}</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono border ${
                            count > 0
                              ? `${style.bgClass} ${style.textClass} ${style.borderClass} font-semibold`
                              : 'bg-[rgb(var(--color-surface-muted))] border-[rgb(var(--color-border-base))] text-[rgb(var(--color-text-subtle))]'
                          }`}
                        >
                          {count}
                        </span>
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-[rgb(var(--color-accent-text))]" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Custom Tags Section */}
              {customTags.length > 0 && (
                <>
                  <div className="h-px bg-[rgb(var(--color-border-base))] my-1" />
                  <div className="px-3 py-1 text-[10px] font-semibold text-[rgb(var(--color-text-subtle))] uppercase tracking-wider">
                    Custom Labels
                  </div>
                  <div className="py-0.5 max-h-32 overflow-y-auto">
                    {customTags.map((item: { label: string; count: number }) => {
                      const style = getTagStyle(item.label);
                      const isSelected =
                        activeTagFilter?.toLowerCase() === item.label.toLowerCase() ||
                        parsedFromQuery.tagModifiers.some(
                          (m: string) => m.toLowerCase() === item.label.toLowerCase()
                        );

                      return (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => {
                            if (
                              activeTagFilter?.toLowerCase() === item.label.toLowerCase()
                            ) {
                              onTagFilterChange?.(null);
                            } else {
                              onTagFilterChange?.(item.label);
                            }
                            setIsTagDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-1.5 text-left text-xs hover:bg-[rgb(var(--color-surface-hover))] transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-[rgb(var(--color-surface-hover))] font-semibold'
                              : 'text-[rgb(var(--color-text-base))]'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-2xs ${style.dotClass}`}
                            />
                            <span className="truncate">{item.label}</span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono border ${style.bgClass} ${style.textClass} ${style.borderClass} font-semibold`}
                            >
                              {item.count}
                            </span>
                            {isSelected && (
                              <Check className="w-3.5 h-3.5 text-[rgb(var(--color-accent-text))]" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Search Modifiers Quick Helper */}
              <div className="mt-1 pt-2 px-3 pb-1.5 bg-[rgb(var(--color-surface-muted))]/60 border-t border-[rgb(var(--color-border-base))] text-[10px] text-[rgb(var(--color-text-subtle))] flex flex-col gap-1.5">
                <div className="font-semibold text-[rgb(var(--color-text-base))] flex items-center justify-between">
                  <span>⚡ Search Modifiers</span>
                  <span className="text-[9px] font-normal text-[rgb(var(--color-text-subtle))]">
                    Click to add
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  {[
                    { label: 'tag:urgent', query: 'tag:urgent' },
                    { label: '#work', query: '#work' },
                    { label: '#review', query: '#review' },
                    { label: 'tag:any', query: 'tag:any' },
                  ].map((m) => (
                    <button
                      key={m.query}
                      type="button"
                      onClick={() => {
                        const newQuery = filterQuery ? `${filterQuery.trim()} ${m.query}` : m.query;
                        onFilterChange(newQuery);
                        setIsTagDropdownOpen(false);
                        searchInputRef.current?.focus();
                      }}
                      className="px-1.5 py-0.5 rounded bg-[rgb(var(--color-surface-input))] hover:bg-[rgb(var(--color-surface-hover))] text-[10px] font-mono text-[rgb(var(--color-text-base))] transition-colors cursor-pointer border border-[rgb(var(--color-border-input))]"
                      title={`Add "${m.query}" modifier to search query`}
                    >
                      +{m.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Global Real-Time Search / Filter */}
        <div className="relative flex items-center gap-1 group">
          {/* Search Scope Switcher (Folder vs Entire VFS) */}
          <button
            id="toolbar-search-scope-btn"
            type="button"
            onClick={() => onSearchScopeChange?.(searchScope === 'vfs' ? 'folder' : 'vfs')}
            title={
              searchScope === 'vfs'
                ? 'Search Scope: Entire VFS (Full-Text Index & Bloom Filter). Click to switch to Current Folder'
                : 'Search Scope: Current Folder. Click to search Entire VFS'
            }
            className={`px-1.5 py-1 rounded text-[10px] font-medium transition-colors flex items-center gap-1 cursor-pointer border shrink-0 ${
              searchScope === 'vfs'
                ? 'bg-blue-600/20 text-blue-400 border-blue-500/40 shadow-xs'
                : 'bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-muted))] border-[rgb(var(--color-border-base))] hover:text-[rgb(var(--color-text-base))]'
            }`}
          >
            {searchScope === 'vfs' ? (
              <>
                <Zap className="w-3 h-3 text-blue-400" />
                <span className="font-mono">VFS</span>
              </>
            ) : (
              <>
                <Folder className="w-3 h-3 text-amber-400" />
                <span className="font-mono">Folder</span>
              </>
            )}
          </button>

          <div className="relative flex items-center">
            <Search
              className={`w-3.5 h-3.5 absolute left-2.5 transition-colors pointer-events-none ${
                filterQuery
                  ? searchScope === 'vfs' ? 'text-blue-400' : 'text-blue-500'
                  : activeTagFilter
                  ? 'text-indigo-500'
                  : 'text-[rgb(var(--color-text-subtle))] group-hover:text-[rgb(var(--color-text-muted))]'
              }`}
            />
            <input
              id="toolbar-search-input"
              ref={searchInputRef}
              type="text"
              placeholder={searchScope === 'vfs' ? 'Search entire VFS (Bloom Filter)...' : 'Search items... (or tag:work, #urgent)'}
              value={filterQuery}
              onChange={(e) => onFilterChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.preventDefault();
                  onFilterChange('');
                  searchInputRef.current?.blur();
                } else if (e.key === 'Enter' && onOpenGlobalSearch && searchScope === 'vfs') {
                  e.preventDefault();
                  onOpenGlobalSearch();
                }
              }}
              className={`w-36 sm:w-56 pl-8 pr-16 py-1 rounded-md bg-[rgb(var(--color-surface-input))] border text-xs text-[rgb(var(--color-text-base))] placeholder:text-[rgb(var(--color-text-subtle))] transition-all focus:outline-none focus:ring-1 focus:ring-[rgb(var(--color-accent-text))] ${
                filterQuery
                  ? searchScope === 'vfs'
                    ? 'border-blue-500 ring-1 ring-blue-500/40 bg-blue-500/5'
                    : 'border-blue-500/80 ring-1 ring-blue-500/30'
                  : activeTagFilter
                  ? 'border-indigo-500/50 ring-1 ring-indigo-500/20'
                  : 'border-[rgb(var(--color-border-input))] hover:border-[rgb(var(--color-border-base))]'
              }`}
            />

            {/* Right badges & Clear action */}
            <div className="absolute right-1.5 flex items-center gap-1">
              {filterQuery || activeTagFilter ? (
                <>
                  {typeof matchCount === 'number' && typeof totalCount === 'number' && (
                    <span
                      id="toolbar-search-match-count"
                      title={`${matchCount} of ${totalCount} items matched`}
                      className={`text-[10px] px-1 py-0.2 rounded font-mono font-medium ${
                        matchCount === 0
                          ? 'bg-rose-500/20 text-rose-400'
                          : activeTagFilter && !filterQuery
                          ? 'bg-indigo-500/20 text-indigo-400'
                          : 'bg-blue-500/20 text-blue-400'
                      }`}
                    >
                      {matchCount}/{totalCount}
                    </span>
                  )}
                  {filterQuery && (
                    <button
                      id="toolbar-search-clear"
                      onClick={() => {
                        onFilterChange('');
                        searchInputRef.current?.focus();
                      }}
                      title="Clear search query (Escape)"
                      className="p-0.5 rounded-full hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-subtle))] hover:text-[rgb(var(--color-text-base))] transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </>
              ) : (
                <kbd className="hidden sm:inline-block text-[9px] font-mono px-1 py-0.2 bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-subtle))] border border-[rgb(var(--color-border-base))] rounded pointer-events-none">
                  /
                </kbd>
              )}
            </div>
          </div>

          {/* Global Search Dialog Launcher Button */}
          {onOpenGlobalSearch && (
            <button
              id="toolbar-global-search-modal-btn"
              type="button"
              onClick={onOpenGlobalSearch}
              title="Open Global Full-Text Search Dialog (Ctrl+Shift+F)"
              className="p-1.5 rounded hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-muted))] hover:text-blue-400 transition-colors cursor-pointer shrink-0"
            >
              <Sparkles className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="h-4 w-px bg-[rgb(var(--color-border-base))] mx-0.5" />

        {/* Split View Toggle */}
        <button
          onClick={onToggleSplitView}
          title="Toggle Dual Split-Pane View"
          className={`p-1.5 rounded transition-colors ${
            isSplitViewActive
              ? 'bg-[rgb(var(--color-accent-bg))] text-[rgb(var(--color-accent-text))]'
              : 'hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text-base))]'
          }`}
        >
          <Columns className="w-4 h-4" />
        </button>

        {/* Terminal / Console Toggle */}
        <button
          onClick={onToggleTerminal}
          title="Toggle Console Terminal (Ctrl+`)"
          className={`p-1.5 rounded transition-colors ${
            isTerminalVisible
              ? 'bg-[rgb(var(--color-accent-bg))] text-[rgb(var(--color-accent-text))]'
              : 'hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text-base))]'
          }`}
        >
          <Terminal className="w-4 h-4" />
        </button>

        {/* Idea Stream Toggle */}
        <button
          onClick={onToggleStream}
          title="Toggle Bottom Idea Stream"
          className={`p-1.5 rounded transition-colors ${
            isStreamVisible
              ? 'bg-[rgb(var(--color-accent-bg))] text-[rgb(var(--color-accent-text))]'
              : 'hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text-base))]'
          }`}
        >
          <Compass className="w-4 h-4" />
        </button>

        {/* Detail Pane Toggle */}
        <button
          onClick={onToggleDetailPane}
          title="Toggle Right Detail & RSS Pane"
          className={`p-1.5 rounded transition-colors ${
            isDetailPaneActive
              ? 'bg-[rgb(var(--color-accent-bg))] text-[rgb(var(--color-accent-text))]'
              : 'hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text-base))]'
          }`}
        >
          <PanelRight className="w-4 h-4" />
        </button>

        {/* AI Assistant Floating Chat Toggle */}
        {onToggleAIChat && (
          <button
            id="toolbar-toggle-ai-chat-btn"
            onClick={onToggleAIChat}
            title="Toggle Floating AI Assistant (Alt+A)"
            className={`p-1.5 rounded transition-all ${
              isAIChatVisible
                ? 'bg-purple-500/20 text-purple-400 ring-1 ring-purple-500/40'
                : 'hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-muted))] hover:text-purple-400'
            }`}
          >
            <Sparkles className="w-4 h-4" />
          </button>
        )}

        <div className="h-4 w-px bg-[rgb(var(--color-border-base))] mx-0.5" />

        {/* Hamburger Action Menu */}
        <div className="relative">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            title="Application Menu"
            className="p-1.5 rounded hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text-base))] transition-colors"
          >
            <Menu className="w-4 h-4" />
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 mt-1 w-56 rounded-md shadow-xl bg-[rgb(var(--color-surface-dialog))] border border-[rgb(var(--color-border-base))] py-1 z-50 animate-fade-in">
              <div className="px-3 py-1.5 text-[11px] font-bold text-[rgb(var(--color-text-subtle))] uppercase tracking-wider border-b border-[rgb(var(--color-border-base))]">
                Settings & Tools
              </div>

              {/* Theme Submenu */}
              <div className="relative">
                <button
                  onClick={() => setIsThemeOpen(!isThemeOpen)}
                  className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-base))]"
                >
                  <div className="flex items-center gap-2">
                    <Palette className="w-4 h-4 text-purple-500" />
                    <span>Theme Style</span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-[rgb(var(--color-text-subtle))]" />
                </button>

                {isThemeOpen && (
                  <div className="bg-[rgb(var(--color-surface-muted))] border-y border-[rgb(var(--color-border-base))] py-1">
                    {THEMES.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => {
                          onThemeChange(t.id);
                          setIsThemeOpen(false);
                          setIsMenuOpen(false);
                        }}
                        className="w-full flex items-center justify-between px-6 py-1.5 text-xs hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-base))]"
                      >
                        <span>{t.name}</span>
                        {currentTheme === t.id && <Check className="w-3 h-3 text-[rgb(var(--color-accent-text))]" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  onOpenServerProfiles();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-base))]"
              >
                <Server className="w-4 h-4 text-blue-500" />
                <span>Remote Server Profiles</span>
              </button>

              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  onOpenLocalConfig();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-base))]"
              >
                <Settings className="w-4 h-4 text-emerald-500" />
                <span>Local Session Configuration</span>
              </button>

              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  onOpenRssFeeds();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-base))]"
              >
                <Rss className="w-4 h-4 text-amber-500" />
                <span>Manage RSS Feeds</span>
              </button>

              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  onOpenPreferences();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-base))]"
              >
                <Sliders className="w-4 h-4 text-indigo-500" />
                <span>Preferences</span>
              </button>

              <div className="border-t border-[rgb(var(--color-border-base))] my-1" />

              {onOpenTrash && (
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenTrash();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-base))]"
                >
                  <div className="flex items-center gap-2">
                    <Trash2 className="w-4 h-4 text-amber-500" />
                    <span>Open Trash Folder</span>
                  </div>
                  {trashCount > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
                      {trashCount}
                    </span>
                  )}
                </button>
              )}

              {onEmptyTrash && (
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onEmptyTrash();
                  }}
                  disabled={trashCount === 0}
                  className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-red-500/10 text-red-500 disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  <div className="flex items-center gap-2">
                    <Trash2 className="w-4 h-4" />
                    <span>Empty Trash</span>
                  </div>
                  {trashCount > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-red-500/20 text-red-500">
                      {trashCount}
                    </span>
                  )}
                </button>
              )}

              <div className="border-t border-[rgb(var(--color-border-base))] my-1" />

              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  onOpenImport();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-base))]"
              >
                <UploadCloud className="w-4 h-4 text-teal-500" />
                <span>Import Session Backup</span>
              </button>

              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  onOpenExport();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-base))]"
              >
                <DownloadCloud className="w-4 h-4 text-cyan-500" />
                <span>Export Session JSON</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
