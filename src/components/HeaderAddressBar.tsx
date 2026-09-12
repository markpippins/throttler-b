import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  HardDrive,
  Folder,
  FolderOpen,
  Copy,
  Check,
  History,
  Edit3,
  Search,
  X,
  CornerDownLeft,
  Star,
  Columns,
  ExternalLink,
} from 'lucide-react';
import { FileIcon } from './FileIcon';

export interface HeaderAddressBarProps {
  currentPath: string[];
  canGoBack?: boolean;
  canGoForward?: boolean;
  onGoBack?: () => void;
  onGoForward?: () => void;
  onGoUp?: () => void;
  onNavigate: (newPath: string[]) => void;
  onOpenInNewPane?: (path: string[]) => void;
  onRefresh: () => void;
  historyStack?: string[][];
  historyIndex?: number;
  getSubfolders?: (path: string[]) => { name: string; type: string }[];
  onDropOnBreadcrumb?: (destPath: string[], itemNames: string[], e?: React.DragEvent) => void;
  onNotify?: (type: 'info' | 'success' | 'warning' | 'error', text: string) => void;
  isStarred?: boolean;
  onToggleStar?: (path?: string[]) => void;
}

export const HeaderAddressBar: React.FC<HeaderAddressBarProps> = ({
  currentPath,
  canGoBack = false,
  canGoForward = false,
  onGoBack,
  onGoForward,
  onGoUp,
  onNavigate,
  onOpenInNewPane,
  onRefresh,
  historyStack = [],
  historyIndex = 0,
  getSubfolders,
  onDropOnBreadcrumb,
  onNotify,
  isStarred = false,
  onToggleStar,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [addressInput, setAddressInput] = useState(currentPath.join('/'));
  const [copied, setCopied] = useState(false);
  const [activeDropdownIndex, setActiveDropdownIndex] = useState<number | null>(null);
  const [folderSearchQuery, setFolderSearchQuery] = useState('');
  const [highlightedFolderIndex, setHighlightedFolderIndex] = useState<number>(0);
  const [showHistoryMenu, setShowHistoryMenu] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Breadcrumb segment right-click context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    path: string[];
    name: string;
  } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const folderSearchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const historyMenuRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Sync address input with currentPath when path changes
  useEffect(() => {
    setAddressInput(currentPath.join('/'));
  }, [currentPath]);

  // Focus and select input text when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Focus folder search input when dropdown opens
  useEffect(() => {
    if (activeDropdownIndex !== null) {
      setFolderSearchQuery('');
      setHighlightedFolderIndex(0);
      // Small timeout to ensure DOM rendered
      setTimeout(() => {
        if (folderSearchInputRef.current) {
          folderSearchInputRef.current.focus();
        }
      }, 50);
    }
  }, [activeDropdownIndex]);

  // Close menus when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setActiveDropdownIndex(null);
      }
      if (
        historyMenuRef.current &&
        !historyMenuRef.current.contains(e.target as Node)
      ) {
        setShowHistoryMenu(false);
      }
      if (
        contextMenuRef.current &&
        !contextMenuRef.current.contains(e.target as Node)
      ) {
        setContextMenu(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setContextMenu(null);
        setActiveDropdownIndex(null);
        setShowHistoryMenu(false);
      }
    };
    window.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleUp = () => {
    if (onGoUp) {
      onGoUp();
    } else if (currentPath.length > 1) {
      onNavigate(currentPath.slice(0, -1));
    }
  };

  const handleBreadcrumbClick = (index: number) => {
    const segmentPath = currentPath.slice(0, index + 1);
    setActiveDropdownIndex(null);
    setIsEditing(false);
    onNavigate(segmentPath);
  };

  // Render highlighted matching folder name
  const renderHighlightedName = (name: string, query: string) => {
    if (!query.trim()) return name;
    const q = query.toLowerCase();
    const lowerName = name.toLowerCase();
    const matchIndex = lowerName.indexOf(q);
    if (matchIndex === -1) return name;

    const before = name.substring(0, matchIndex);
    const match = name.substring(matchIndex, matchIndex + q.length);
    const after = name.substring(matchIndex + q.length);

    return (
      <span>
        {before}
        <mark className="bg-amber-400/30 text-amber-500 font-bold px-0.5 rounded">
          {match}
        </mark>
        {after}
      </span>
    );
  };

  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = addressInput.trim();
    if (!trimmed) {
      setIsEditing(false);
      return;
    }
    const segments = trimmed.split('/').filter(Boolean);
    if (segments.length > 0) {
      onNavigate(segments);
    }
    setIsEditing(false);
  };

  const handleCopyPath = (e: React.MouseEvent) => {
    e.stopPropagation();
    const fullPath = '/' + currentPath.join('/');
    navigator.clipboard.writeText(fullPath).then(() => {
      setCopied(true);
      if (onNotify) onNotify('success', `Path copied: ${fullPath}`);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Drag and drop onto breadcrumb segments
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverIndex(null);

    const targetPath = currentPath.slice(0, index + 1);

    try {
      let itemNames: string[] = [];
      const dataStr =
        e.dataTransfer.getData('application/x-file-transfer') ||
        e.dataTransfer.getData('application/json');
      if (dataStr) {
        try {
          const parsed = JSON.parse(dataStr);
          if (Array.isArray(parsed.itemNames) && parsed.itemNames.length > 0) {
            itemNames = parsed.itemNames;
          }
        } catch {
          // Ignore json parse error
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
        if (onDropOnBreadcrumb) {
          onDropOnBreadcrumb(targetPath, itemNames, e);
        } else {
          onNotify?.('info', `Moved ${itemNames.length} item(s) to /${targetPath.join('/')}`);
        }
      }
    } catch (err) {
      console.error('Breadcrumb drop parse error', err);
    }
  };

  return (
    <div
      id="header-address-bar"
      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[rgb(var(--color-surface-base))] border-b border-[rgb(var(--color-border-base))] text-sm select-none"
    >
      {/* Navigation Buttons: Back, Forward, Up, History, Refresh */}
      <div className="flex items-center gap-0.5">
        <button
          id="btn-nav-back"
          onClick={onGoBack}
          disabled={!canGoBack}
          title="Back (Alt+Left)"
          className="p-1.5 rounded-md hover:bg-[rgb(var(--color-surface-hover))] disabled:opacity-30 disabled:hover:bg-transparent text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text-base))] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <button
          id="btn-nav-forward"
          onClick={onGoForward}
          disabled={!canGoForward}
          title="Forward (Alt+Right)"
          className="p-1.5 rounded-md hover:bg-[rgb(var(--color-surface-hover))] disabled:opacity-30 disabled:hover:bg-transparent text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text-base))] transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
        </button>

        <button
          id="btn-nav-up"
          onClick={handleUp}
          disabled={currentPath.length <= 1}
          title="Up to parent directory (Alt+Up / Backspace)"
          className="p-1.5 rounded-md hover:bg-[rgb(var(--color-surface-hover))] disabled:opacity-30 disabled:hover:bg-transparent text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text-base))] transition-colors"
        >
          <ArrowUp className="w-4 h-4" />
        </button>

        {/* History Dropdown */}
        {historyStack.length > 1 && (
          <div className="relative" ref={historyMenuRef}>
            <button
              id="btn-nav-history"
              onClick={() => setShowHistoryMenu(!showHistoryMenu)}
              title="Recent path history"
              className={`p-1.5 rounded-md hover:bg-[rgb(var(--color-surface-hover))] transition-colors ${
                showHistoryMenu
                  ? 'bg-[rgb(var(--color-surface-active))] text-blue-500'
                  : 'text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text-base))]'
              }`}
            >
              <History className="w-3.5 h-3.5" />
            </button>

            {showHistoryMenu && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-[rgb(var(--color-surface-base))] border border-[rgb(var(--color-border-base))] rounded-lg shadow-xl py-1 z-50 animate-in fade-in-50 duration-150">
                <div className="px-2.5 py-1 text-[11px] font-semibold text-[rgb(var(--color-text-subtle))] uppercase tracking-wider border-b border-[rgb(var(--color-border-base))] mb-1">
                  Location History
                </div>
                <div className="max-h-60 overflow-y-auto no-scrollbar">
                  {historyStack.map((hPath, idx) => {
                    const isCurrent = idx === historyIndex;
                    const pathStr = '/' + hPath.join('/');
                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          onNavigate(hPath);
                          setShowHistoryMenu(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-[rgb(var(--color-surface-hover))] transition-colors ${
                          isCurrent
                            ? 'font-semibold text-blue-500 bg-blue-500/10'
                            : 'text-[rgb(var(--color-text-base))]'
                        }`}
                      >
                        <Folder className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                        <span className="truncate flex-1 font-mono">{pathStr}</span>
                        {isCurrent && <span className="text-[10px] text-blue-500 flex-shrink-0">Current</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        <button
          id="btn-nav-refresh"
          onClick={onRefresh}
          title="Refresh view (F5)"
          className="p-1.5 rounded-md hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text-base))] transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Main Address Bar / Breadcrumb Trail Container */}
      <div
        id="breadcrumb-address-container"
        className={`flex-1 min-w-0 flex items-center bg-[rgb(var(--color-surface-input))] border rounded-lg px-2 py-0.5 shadow-inner transition-all ${
          isEditing
            ? 'border-blue-500 ring-2 ring-blue-500/20'
            : 'border-[rgb(var(--color-border-input))] hover:border-[rgb(var(--color-border-base))]'
        }`}
      >
        {isEditing ? (
          <form onSubmit={handleAddressSubmit} className="w-full flex items-center gap-1.5">
            <FolderOpen className="w-4 h-4 text-blue-500 flex-shrink-0 ml-0.5" />
            <input
              ref={inputRef}
              type="text"
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
              onBlur={() => setIsEditing(false)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setIsEditing(false);
              }}
              placeholder="Enter path (e.g. Local Session/Work/Dev)..."
              className="w-full bg-transparent text-[rgb(var(--color-text-base))] text-xs outline-none font-mono py-1"
            />
            <span className="text-[10px] text-[rgb(var(--color-text-subtle))] px-1">
              ↵ Enter to jump
            </span>
          </form>
        ) : (
          <div
            id="breadcrumb-trail-wrapper"
            onDoubleClick={(e) => {
              const target = e.target as HTMLElement;
              if (target.id === 'breadcrumb-trail-wrapper' || target.id === 'breadcrumb-trailing-space') {
                setIsEditing(true);
              }
            }}
            className="flex-1 flex items-center gap-0.5 overflow-x-auto no-scrollbar py-0.5 min-h-[28px]"
          >
            {/* Breadcrumb Segments */}
            {currentPath.map((segment, index) => {
              const isRoot = index === 0;
              const isLast = index === currentPath.length - 1;
              const segmentPath = currentPath.slice(0, index + 1);
              const pathTooltip = '/' + segmentPath.join('/');
              const isDragOver = dragOverIndex === index;
              const subfolders = getSubfolders ? getSubfolders(segmentPath) : [];
              const isDropdownOpen = activeDropdownIndex === index;

              return (
                <div
                  key={index}
                  className="flex items-center flex-shrink-0 group/segment relative"
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                >
                  {/* Chevron separator */}
                  {index > 0 && (
                    <ChevronRight className="w-3.5 h-3.5 text-[rgb(var(--color-text-subtle))] flex-shrink-0 mx-0.5 opacity-60" />
                  )}

                  {/* Segment pill container */}
                  <div
                    className={`flex items-center rounded-md transition-all duration-150 ${
                      isDragOver
                        ? 'bg-blue-500/20 ring-2 ring-blue-500 border border-blue-400'
                        : isLast
                        ? 'bg-[rgb(var(--color-surface-active))] text-[rgb(var(--color-text-base))]'
                        : 'text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text-base))] hover:bg-[rgb(var(--color-surface-hover))]'
                    }`}
                  >
                    {/* Breadcrumb Jump Button */}
                    <button
                      id={`breadcrumb-segment-${index}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBreadcrumbClick(index);
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setActiveDropdownIndex(null);
                        setContextMenu({
                          x: e.clientX,
                          y: e.clientY,
                          path: segmentPath,
                          name: segment,
                        });
                      }}
                      title={`Jump to ${pathTooltip}${isLast ? ' (Current folder)' : ''} — Right click for options`}
                      className={`flex items-center gap-1.5 px-2 py-1 text-xs rounded-l-md font-medium transition-colors ${
                        isLast ? 'font-semibold' : ''
                      }`}
                    >
                      {isRoot ? (
                        <HardDrive className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                      ) : isLast ? (
                        <FolderOpen className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                      ) : (
                        <Folder className="w-3.5 h-3.5 text-amber-500/80 flex-shrink-0" />
                      )}
                      <span className="truncate max-w-[150px]">{segment}</span>
                    </button>

                    {/* Subfolder dropdown toggle */}
                    {subfolders.length > 0 && (
                      <div className="relative" ref={isDropdownOpen ? dropdownRef : undefined}>
                        <button
                          id={`btn-breadcrumb-dropdown-${index}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveDropdownIndex(isDropdownOpen ? null : index);
                          }}
                          title={`Browse & search subfolders in ${segment}`}
                          className={`p-1 pr-1.5 rounded-r-md hover:bg-[rgb(var(--color-surface-hover))] transition-colors text-[rgb(var(--color-text-subtle))] hover:text-[rgb(var(--color-text-base))] ${
                            isDropdownOpen ? 'bg-[rgb(var(--color-surface-hover))] text-blue-500' : ''
                          }`}
                        >
                          <ChevronDown className="w-3 h-3" />
                        </button>

                        {/* Subdirectories dropdown menu with Search */}
                        {isDropdownOpen && (() => {
                          const q = folderSearchQuery.trim().toLowerCase();
                          const filteredSubfolders = q
                            ? subfolders.filter((f) => f.name.toLowerCase().includes(q))
                            : subfolders;

                          const handleFolderKeyDown = (e: React.KeyboardEvent) => {
                            if (e.key === 'ArrowDown') {
                              e.preventDefault();
                              setHighlightedFolderIndex((prev) =>
                                filteredSubfolders.length > 0
                                  ? (prev + 1) % filteredSubfolders.length
                                  : 0
                              );
                            } else if (e.key === 'ArrowUp') {
                              e.preventDefault();
                              setHighlightedFolderIndex((prev) =>
                                filteredSubfolders.length > 0
                                  ? (prev - 1 + filteredSubfolders.length) % filteredSubfolders.length
                                  : 0
                              );
                            } else if (e.key === 'Enter') {
                              e.preventDefault();
                              if (filteredSubfolders.length > 0 && filteredSubfolders[highlightedFolderIndex]) {
                                setActiveDropdownIndex(null);
                                onNavigate([...segmentPath, filteredSubfolders[highlightedFolderIndex].name]);
                              } else {
                                setActiveDropdownIndex(null);
                                onNavigate(segmentPath);
                              }
                            } else if (e.key === 'Escape') {
                              e.preventDefault();
                              setActiveDropdownIndex(null);
                            }
                          };

                          return (
                            <div
                              className="absolute top-full left-0 mt-1 w-64 bg-[rgb(var(--color-surface-base))] border border-[rgb(var(--color-border-base))] rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in-50 duration-150 overflow-hidden"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {/* Header with Jump to folder option and Open in New Pane */}
                              <div className="flex items-center justify-between px-3 py-1 border-b border-[rgb(var(--color-border-base))] mb-1 text-[11px] text-[rgb(var(--color-text-subtle))] gap-1">
                                <div className="font-semibold truncate max-w-[90px]" title={`/${segmentPath.join('/')}`}>
                                  /{segmentPath.join('/')}
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  {onOpenInNewPane && (
                                    <button
                                      onClick={() => {
                                        setActiveDropdownIndex(null);
                                        onOpenInNewPane(segmentPath);
                                      }}
                                      title="Open this folder in second pane (Split View)"
                                      className="text-[10px] text-blue-500 hover:underline flex items-center gap-1 font-medium"
                                    >
                                      <Columns className="w-2.5 h-2.5" />
                                      <span>Split Pane</span>
                                    </button>
                                  )}
                                  <button
                                    onClick={() => {
                                      setActiveDropdownIndex(null);
                                      onNavigate(segmentPath);
                                    }}
                                    title="Jump directly to this folder"
                                    className="text-[10px] text-blue-500 hover:underline flex items-center gap-1 font-medium"
                                  >
                                    <span>Go</span>
                                    <CornerDownLeft className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              </div>

                              {/* Search subfolders input */}
                              <div className="px-2 py-1">
                                <div className="flex items-center gap-1.5 px-2 py-1 bg-[rgb(var(--color-surface-input))] border border-[rgb(var(--color-border-input))] rounded-md text-xs focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/20">
                                  <Search className="w-3.5 h-3.5 text-[rgb(var(--color-text-subtle))] flex-shrink-0" />
                                  <input
                                    ref={folderSearchInputRef}
                                    type="text"
                                    value={folderSearchQuery}
                                    onChange={(e) => {
                                      setFolderSearchQuery(e.target.value);
                                      setHighlightedFolderIndex(0);
                                    }}
                                    onKeyDown={handleFolderKeyDown}
                                    placeholder={`Filter ${subfolders.length} subfolder${subfolders.length === 1 ? '' : 's'}...`}
                                    className="w-full bg-transparent text-[rgb(var(--color-text-base))] text-xs outline-none placeholder:text-[rgb(var(--color-text-subtle))]"
                                  />
                                  {folderSearchQuery && (
                                    <button
                                      onClick={() => {
                                        setFolderSearchQuery('');
                                        setHighlightedFolderIndex(0);
                                        folderSearchInputRef.current?.focus();
                                      }}
                                      className="text-[rgb(var(--color-text-subtle))] hover:text-[rgb(var(--color-text-base))]"
                                      title="Clear search"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Filtered Subfolders List */}
                              <div className="max-h-52 overflow-y-auto no-scrollbar px-1 py-0.5">
                                {filteredSubfolders.length === 0 ? (
                                  <div className="px-3 py-3 text-center text-xs text-[rgb(var(--color-text-subtle))]">
                                    <p className="font-medium text-[rgb(var(--color-text-muted))]">
                                      No matching folders
                                    </p>
                                    <p className="text-[10px] mt-0.5">
                                      No subfolders match "{folderSearchQuery}"
                                    </p>
                                    <button
                                      onClick={() => {
                                        setFolderSearchQuery('');
                                        folderSearchInputRef.current?.focus();
                                      }}
                                      className="mt-1.5 text-[10px] text-blue-500 hover:underline"
                                    >
                                      Reset filter
                                    </button>
                                  </div>
                                ) : (
                                  filteredSubfolders.map((folder, sIdx) => {
                                    const isCurrentChild =
                                      index < currentPath.length - 1 &&
                                      currentPath[index + 1] === folder.name;
                                    const isHighlighted = sIdx === highlightedFolderIndex;
                                    const subfolderPath = [...segmentPath, folder.name];

                                    return (
                                      <div
                                        key={sIdx}
                                        onMouseEnter={() => setHighlightedFolderIndex(sIdx)}
                                        onContextMenu={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          setActiveDropdownIndex(null);
                                          setContextMenu({
                                            x: e.clientX,
                                            y: e.clientY,
                                            path: subfolderPath,
                                            name: folder.name,
                                          });
                                        }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveDropdownIndex(null);
                                          onNavigate(subfolderPath);
                                        }}
                                        className={`group/subitem w-full text-left px-2.5 py-1.5 text-xs flex items-center gap-2 rounded-md transition-colors cursor-pointer ${
                                          isHighlighted
                                            ? 'bg-blue-500/10 text-blue-500 font-medium'
                                            : isCurrentChild
                                            ? 'font-semibold text-blue-500 bg-[rgb(var(--color-surface-hover))]'
                                            : 'text-[rgb(var(--color-text-base))] hover:bg-[rgb(var(--color-surface-hover))]'
                                        }`}
                                      >
                                        <FileIcon nodeOrName={folder.name} isFolder={true} size="xs" className="w-3.5 h-3.5 flex-shrink-0" />
                                        <span className="truncate flex-1">
                                          {renderHighlightedName(folder.name, folderSearchQuery)}
                                        </span>
                                        {isCurrentChild && (
                                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                                        )}
                                        {onOpenInNewPane && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setActiveDropdownIndex(null);
                                              onOpenInNewPane(subfolderPath);
                                            }}
                                            title="Open in new pane (Split View)"
                                            className="opacity-0 group-hover/subitem:opacity-100 p-1 hover:bg-blue-500/20 rounded text-[rgb(var(--color-text-subtle))] hover:text-blue-500 transition-all flex-shrink-0"
                                          >
                                            <Columns className="w-3 h-3" />
                                          </button>
                                        )}
                                      </div>
                                    );
                                  })
                                )}
                              </div>

                              {/* Footer count indicator */}
                              <div className="px-3 py-1 border-t border-[rgb(var(--color-border-base))] text-[10px] text-[rgb(var(--color-text-subtle))] flex items-center justify-between">
                                <span>
                                  {folderSearchQuery.trim()
                                    ? `${filteredSubfolders.length} of ${subfolders.length} matching`
                                    : `${subfolders.length} subfolders`}
                                </span>
                                <span className="opacity-75">↵ to select</span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Click-to-edit trailing spacer */}
            <div
              id="breadcrumb-trailing-space"
              title="Click whitespace to edit path"
              className="flex-1 min-w-[24px] self-stretch cursor-text"
              onClick={() => setIsEditing(true)}
            />
          </div>
        )}

        {/* Right utility actions inside the address bar */}
        <div className="flex items-center gap-1 ml-auto pl-1">
          {/* Star / Bookmark directory button */}
          <button
            id="btn-star-path"
            onClick={(e) => {
              e.stopPropagation();
              if (onToggleStar) onToggleStar();
            }}
            title={
              isStarred
                ? `Remove /${currentPath.join('/')} from Starred folders`
                : `Star /${currentPath.join('/')} for Quick Access in sidebar`
            }
            className={`p-1 rounded transition-colors ${
              isStarred
                ? 'text-amber-500 hover:text-amber-600 bg-amber-400/10'
                : 'text-[rgb(var(--color-text-subtle))] hover:text-amber-500 hover:bg-[rgb(var(--color-surface-hover))]'
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${isStarred ? 'fill-amber-400 text-amber-500' : ''}`} />
          </button>

          {/* Copy full path button */}
          <button
            id="btn-copy-path"
            onClick={handleCopyPath}
            title={copied ? 'Copied to clipboard!' : `Copy path (/${currentPath.join('/')})`}
            className="p-1 rounded text-[rgb(var(--color-text-subtle))] hover:text-[rgb(var(--color-text-base))] hover:bg-[rgb(var(--color-surface-hover))] transition-colors"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Toggle manual text edit button */}
          <button
            id="btn-edit-path"
            onClick={() => setIsEditing(!isEditing)}
            title={isEditing ? 'View breadcrumbs' : 'Edit path as text'}
            className={`p-1 rounded transition-colors ${
              isEditing
                ? 'text-blue-500 bg-blue-500/10'
                : 'text-[rgb(var(--color-text-subtle))] hover:text-[rgb(var(--color-text-base))] hover:bg-[rgb(var(--color-surface-hover))]'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Floating Breadcrumb Context Menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          id="breadcrumb-context-menu"
          style={{
            position: 'fixed',
            top: Math.min(contextMenu.y, window.innerHeight - 200),
            left: Math.min(contextMenu.x, window.innerWidth - 240),
            zIndex: 100,
          }}
          className="w-60 bg-[rgb(var(--color-surface-base))] border border-[rgb(var(--color-border-base))] rounded-xl shadow-2xl py-1 animate-in fade-in-50 zoom-in-95 duration-100 select-none overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Menu Header with Path */}
          <div className="px-3 py-1.5 border-b border-[rgb(var(--color-border-base))] mb-1 flex items-center gap-2 bg-[rgb(var(--color-surface-muted))]/40">
            <Folder className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
            <span className="text-[11px] font-mono font-medium text-[rgb(var(--color-text-base))] truncate flex-1">
              /{contextMenu.path.join('/')}
            </span>
          </div>

          {/* Open in current pane */}
          <button
            id="breadcrumb-ctx-open"
            onClick={() => {
              onNavigate(contextMenu.path);
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2.5 hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-base))] transition-colors"
          >
            <FolderOpen className="w-4 h-4 text-blue-500 flex-shrink-0" />
            <span className="font-medium">Open in Current Pane</span>
          </button>

          {/* Open in New Pane (Dual-Pane Split View) */}
          {onOpenInNewPane && (
            <button
              id="breadcrumb-ctx-open-new-pane"
              onClick={() => {
                onOpenInNewPane(contextMenu.path);
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2.5 hover:bg-blue-500/10 hover:text-blue-500 text-[rgb(var(--color-text-base))] transition-colors group"
            >
              <Columns className="w-4 h-4 text-blue-500 flex-shrink-0 group-hover:scale-110 transition-transform" />
              <div className="flex flex-col">
                <span className="font-medium">Open in New Pane</span>
                <span className="text-[10px] text-[rgb(var(--color-text-subtle))]">
                  Switch to dual-pane & browse here
                </span>
              </div>
            </button>
          )}

          <div className="h-px bg-[rgb(var(--color-border-base))] my-1" />

          {/* Bookmark / Quick Access Star */}
          {onToggleStar && (
            <button
              id="breadcrumb-ctx-star"
              onClick={() => {
                onToggleStar(contextMenu.path);
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2.5 hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-base))] transition-colors"
            >
              <Star className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <span>Toggle Star / Quick Access</span>
            </button>
          )}

          {/* Copy full path */}
          <button
            id="breadcrumb-ctx-copy-path"
            onClick={() => {
              const fullPath = '/' + contextMenu.path.join('/');
              navigator.clipboard.writeText(fullPath).then(() => {
                onNotify?.('success', `Path copied: ${fullPath}`);
                setContextMenu(null);
              });
            }}
            className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2.5 hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-base))] transition-colors"
          >
            <Copy className="w-4 h-4 text-[rgb(var(--color-text-subtle))] flex-shrink-0" />
            <span>Copy Full Path</span>
          </button>
        </div>
      )}
    </div>
  );
};
