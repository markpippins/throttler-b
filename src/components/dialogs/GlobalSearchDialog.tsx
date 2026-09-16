import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  X,
  File,
  Folder,
  Tag,
  Clock,
  HardDrive,
  ChevronRight,
  ExternalLink,
  Copy,
  Check,
  Zap,
  Filter,
  Layers,
  Sparkles,
  ArrowUpDown,
} from 'lucide-react';
import { FileSystemNode, SearchResultNode } from '../../types';
import { VirtualFileSystem, IndexStats } from '../../services/fileSystemService';
import { FileIcon } from '../FileIcon';

interface GlobalSearchDialogProps {
  isOpen: boolean;
  vfs: VirtualFileSystem;
  initialQuery?: string;
  onClose: () => void;
  onNavigateToItem: (path: string[], fileName?: string) => void;
  onOpenFile?: (node: FileSystemNode, path: string[]) => void;
}

type FilterScope = 'all' | 'files' | 'folders' | 'content' | 'tags';

export const GlobalSearchDialog: React.FC<GlobalSearchDialogProps> = ({
  isOpen,
  vfs,
  initialQuery = '',
  onClose,
  onNavigateToItem,
  onOpenFile,
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [activeFilter, setActiveFilter] = useState<FilterScope>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [stats, setStats] = useState<IndexStats | null>(null);
  const [searchDuration, setSearchDuration] = useState<number>(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);

  // Sync initial query when opened
  useEffect(() => {
    if (isOpen) {
      setQuery(initialQuery);
      setSelectedIndex(0);
      setStats(vfs.getSearchIndexStats());
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isOpen, initialQuery, vfs]);

  // Execute full-text index search
  const rawResults = useMemo(() => {
    if (!query.trim()) return [];
    const t0 = performance.now();
    const res = vfs.search(query.trim(), {
      filterType: activeFilter === 'files' ? 'file' : activeFilter === 'folders' ? 'folder' : 'all',
      searchContent: true,
      maxResults: 60,
    });
    const t1 = performance.now();
    setSearchDuration(Math.round((t1 - t0) * 100) / 100);
    return res;
  }, [query, activeFilter, vfs]);

  // Filter based on selected tab
  const filteredResults = useMemo(() => {
    if (activeFilter === 'content') {
      return rawResults.filter((r) => r.matchField === 'content' || !!r.snippet);
    }
    if (activeFilter === 'tags') {
      return rawResults.filter((r) => r.matchField === 'tags' || (r.tags && r.tags.length > 0));
    }
    return rawResults;
  }, [rawResults, activeFilter]);

  // Reset selected index if results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredResults.length, activeFilter]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (filteredResults.length > 0 ? (prev + 1) % filteredResults.length : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (filteredResults.length > 0 ? (prev - 1 + filteredResults.length) % filteredResults.length : 0));
      } else if (e.key === 'Enter') {
        if (filteredResults.length > 0 && filteredResults[selectedIndex]) {
          e.preventDefault();
          handleSelect(filteredResults[selectedIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredResults, selectedIndex]);

  // Scroll active item into view
  useEffect(() => {
    if (resultsContainerRef.current) {
      const activeEl = resultsContainerRef.current.querySelector('[data-selected="true"]') as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  const handleSelect = (result: SearchResultNode) => {
    if (result.type === 'file' && onOpenFile) {
      onOpenFile(result, result.path);
    } else {
      // Jump to containing folder and select item
      const parentPath = result.path.slice(0, -1);
      onNavigateToItem(parentPath.length > 0 ? parentPath : result.path, result.name);
    }
    onClose();
  };

  const handleGoToLocation = (e: React.MouseEvent, result: SearchResultNode) => {
    e.stopPropagation();
    const parentPath = result.path.slice(0, -1);
    onNavigateToItem(parentPath.length > 0 ? parentPath : result.path, result.name);
    onClose();
  };

  const handleCopyPath = (e: React.MouseEvent, path: string[]) => {
    e.stopPropagation();
    const full = path.join('/');
    navigator.clipboard.writeText(full).catch(() => {});
    setCopiedPath(full);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  const handleRebuildIndex = () => {
    vfs.rebuildSearchIndex();
    setStats(vfs.getSearchIndexStats());
  };

  // Helper to highlight matched query substring in text
  const highlightText = (text: string, term: string) => {
    if (!term || !text) return text;
    const parts = text.split(new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === term.toLowerCase() ? (
            <span key={i} className="bg-amber-400/30 text-amber-200 font-semibold px-0.5 rounded">
              {part}
            </span>
          ) : (
            part
          )
        )}
      </>
    );
  };

  return (
    <div
      id="global-search-dialog-backdrop"
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-20 px-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        id="global-search-dialog-container"
        className="w-full max-w-2xl bg-[rgb(var(--color-surface-card))] border border-[rgb(var(--color-border-card))] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] text-[rgb(var(--color-text-base))] transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Search Input Bar */}
        <div className="p-3 border-b border-[rgb(var(--color-border-base))] flex items-center gap-3 bg-[rgb(var(--color-surface-base))]">
          <Search className="w-5 h-5 text-blue-500 shrink-0 ml-1" />
          <input
            id="global-search-dialog-input"
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Full-text search files, folders, code, notes, & tags across entire VFS..."
            className="w-full bg-transparent text-sm sm:text-base text-[rgb(var(--color-text-base))] placeholder:text-[rgb(var(--color-text-subtle))] focus:outline-none"
          />
          {query && (
            <button
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              className="p-1 rounded-md text-[rgb(var(--color-text-subtle))] hover:text-[rgb(var(--color-text-base))] hover:bg-[rgb(var(--color-surface-hover))] cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="px-2 py-1 text-xs text-[rgb(var(--color-text-subtle))] border border-[rgb(var(--color-border-base))] rounded hover:bg-[rgb(var(--color-surface-hover))] cursor-pointer transition-colors"
          >
            Esc
          </button>
        </div>

        {/* Filter Pills & Index Telemetry */}
        <div className="px-3 py-2 border-b border-[rgb(var(--color-border-base))] flex flex-wrap items-center justify-between gap-2 bg-[rgb(var(--color-surface-header))] text-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {(
              [
                { id: 'all', label: 'All Items' },
                { id: 'files', label: 'Files' },
                { id: 'folders', label: 'Folders' },
                { id: 'content', label: 'In Content' },
                { id: 'tags', label: 'Tags' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                id={`search-filter-tab-${tab.id}`}
                onClick={() => setActiveFilter(tab.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  activeFilter === tab.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text-base))] hover:bg-[rgb(var(--color-surface-hover))]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-[11px] text-[rgb(var(--color-text-subtle))]">
            <span className="flex items-center gap-1 font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
              <Zap className="w-3 h-3" />
              {searchDuration > 0 ? `${searchDuration}ms` : '<0.5ms'}
            </span>
            <span>
              {filteredResults.length} {filteredResults.length === 1 ? 'match' : 'matches'}
            </span>
          </div>
        </div>

        {/* Results List */}
        <div
          ref={resultsContainerRef}
          id="global-search-results-list"
          className="flex-1 overflow-y-auto divide-y divide-[rgb(var(--color-border-card))] p-1"
        >
          {filteredResults.length === 0 ? (
            <div className="py-12 px-4 text-center">
              {query.trim() ? (
                <div className="space-y-2">
                  <div className="w-10 h-10 mx-auto rounded-full bg-[rgb(var(--color-surface-hover))] flex items-center justify-center text-[rgb(var(--color-text-subtle))]">
                    <Search className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-medium text-[rgb(var(--color-text-base))]">
                    No matching files or folders found
                  </p>
                  <p className="text-xs text-[rgb(var(--color-text-subtle))] max-w-sm mx-auto">
                    The Bloom filter and inverted index scanned all file names, contents, tags, and paths in &lt;1ms.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="w-10 h-10 mx-auto rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[rgb(var(--color-text-base))]">
                      Full-Text Index across entire VFS
                    </p>
                    <p className="text-xs text-[rgb(var(--color-text-subtle))] mt-1">
                      Type any keyword, file name, extension, code fragment, or tag to search instantly.
                    </p>
                  </div>
                  {stats && (
                    <div className="inline-flex items-center gap-3 px-3 py-1.5 rounded-lg bg-[rgb(var(--color-surface-hover))] text-[11px] text-[rgb(var(--color-text-muted))] border border-[rgb(var(--color-border-base))]">
                      <span>Indexed: <strong className="text-[rgb(var(--color-text-base))]">{stats.totalDocuments} items</strong></span>
                      <span>•</span>
                      <span>Tokens: <strong className="text-[rgb(var(--color-text-base))]">{stats.totalTokens}</strong></span>
                      <span>•</span>
                      <span>Bloom Filter: <strong className="text-[rgb(var(--color-text-base))]">{stats.bloomFilterBits} bits</strong></span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            filteredResults.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const parentPath = item.path.slice(0, -1);
              const pathBreadcrumb = parentPath.join(' › ');

              return (
                <div
                  key={`${item.path.join('/')}-${idx}`}
                  id={`search-result-item-${idx}`}
                  data-selected={isSelected}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`group px-3 py-2.5 rounded-lg cursor-pointer transition-colors flex items-start gap-3 ${
                    isSelected
                      ? 'bg-blue-600/15 border border-blue-500/30'
                      : 'hover:bg-[rgb(var(--color-surface-hover))] border border-transparent'
                  }`}
                >
                  {/* File / Folder Icon */}
                  <div className="shrink-0 mt-0.5">
                    {item.type === 'folder' ? (
                      <Folder className="w-5 h-5 text-amber-400 fill-amber-400/20" />
                    ) : (
                      <FileIcon nodeOrName={item.name} size="md" />
                    )}
                  </div>

                  {/* Main Item Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-[rgb(var(--color-text-base))] truncate">
                        {highlightText(item.name, query.trim())}
                      </span>

                      {/* Match field indicator */}
                      {item.matchField && (
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                            item.matchField === 'name'
                              ? 'bg-blue-500/15 text-blue-300 border border-blue-500/20'
                              : item.matchField === 'content'
                              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/20'
                              : item.matchField === 'tags'
                              ? 'bg-purple-500/15 text-purple-300 border border-purple-500/20'
                              : 'bg-zinc-500/15 text-zinc-300'
                          }`}
                        >
                          {item.matchField === 'name'
                            ? 'Name Match'
                            : item.matchField === 'content'
                            ? 'In Content'
                            : item.matchField === 'tags'
                            ? 'In Tags'
                            : 'Path Match'}
                        </span>
                      )}

                      {/* Tags */}
                      {item.tags && item.tags.length > 0 && (
                        <div className="flex items-center gap-1">
                          {item.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-[10px] px-1.5 py-0.2 rounded-full bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-muted))] border border-[rgb(var(--color-border-base))]"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Path Breadcrumb */}
                    <div className="text-[11px] text-[rgb(var(--color-text-subtle))] truncate mt-0.5 flex items-center gap-1">
                      <span>{pathBreadcrumb || 'Root'}</span>
                    </div>

                    {/* Content Snippet if matched in content */}
                    {item.snippet && (
                      <div className="mt-1 text-xs text-[rgb(var(--color-text-muted))] bg-[rgb(var(--color-surface-base))] px-2 py-1 rounded border border-[rgb(var(--color-border-base))] font-mono text-[11px] leading-relaxed">
                        {highlightText(item.snippet, query.trim())}
                      </div>
                    )}
                  </div>

                  {/* Actions & Metadata */}
                  <div className="shrink-0 flex flex-col items-end gap-1 text-[11px] text-[rgb(var(--color-text-subtle))]">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        title="Copy full path"
                        onClick={(e) => handleCopyPath(e, item.path)}
                        className="p-1 rounded hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text-base))]"
                      >
                        {copiedPath === item.path.join('/') ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        title="Go to location"
                        onClick={(e) => handleGoToLocation(e, item)}
                        className="p-1 rounded hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text-base))]"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {item.size !== undefined && item.type === 'file' && (
                      <span>{item.size > 1024 ? `${Math.round(item.size / 1024)} KB` : `${item.size} B`}</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info and Keyboard Guide */}
        <div className="px-3 py-2 border-t border-[rgb(var(--color-border-base))] flex flex-wrap items-center justify-between gap-2 bg-[rgb(var(--color-surface-base))] text-[11px] text-[rgb(var(--color-text-subtle))]">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-[rgb(var(--color-surface-hover))] border border-[rgb(var(--color-border-base))] font-mono text-[10px]">
                ↑↓
              </kbd>{' '}
              to navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-[rgb(var(--color-surface-hover))] border border-[rgb(var(--color-border-base))] font-mono text-[10px]">
                ↵
              </kbd>{' '}
              to open
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-[rgb(var(--color-surface-hover))] border border-[rgb(var(--color-border-base))] font-mono text-[10px]">
                esc
              </kbd>{' '}
              to dismiss
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRebuildIndex}
              title="Force full re-index of the VFS"
              className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer"
            >
              Rebuild Index
            </button>
            <span>•</span>
            <span>Bloom Filter (0% False Negatives)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
