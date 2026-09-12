import React, { useState, useEffect } from 'react';
import {
  Search,
  Globe,
  Image as ImageIcon,
  Video,
  BookOpen,
  Sparkles,
  BookmarkPlus,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  X,
  LayoutGrid,
  List
} from 'lucide-react';
import { BookmarkType, NewBookmark } from '../types';
import { searchIdeaStream, StreamResultItem } from '../services/streamSearchService';

interface IdeaStreamProps {
  height: number;
  currentPath: string[];
  onAddBookmark: (bookmark: NewBookmark) => void;
  onOpenLink: (url: string, title: string) => void;
  onResizeStart: (e: React.MouseEvent) => void;
  onClose: () => void;
}

export const IdeaStream: React.FC<IdeaStreamProps> = ({
  height,
  currentPath,
  onAddBookmark,
  onOpenLink,
  onResizeStart,
  onClose,
}) => {
  const currentFolderName = currentPath[currentPath.length - 1] || 'Workspace';
  const [query, setQuery] = useState(currentFolderName);
  const [activeFilters, setActiveFilters] = useState<Set<BookmarkType>>(
    new Set(['web', 'image', 'youtube', 'academic', 'gemini'])
  );
  const [results, setResults] = useState<StreamResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'tabular'>(() => {
    try {
      return (localStorage.getItem('throttler_ideastream_view') as 'cards' | 'tabular') || 'cards';
    } catch {
      return 'cards';
    }
  });

  const handleToggleViewMode = (mode: 'cards' | 'tabular') => {
    setViewMode(mode);
    try {
      localStorage.setItem('throttler_ideastream_view', mode);
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    setQuery(currentFolderName);
    performSearch(currentFolderName, activeFilters);
  }, [currentFolderName]);

  const performSearch = async (q: string, filters: Set<BookmarkType>) => {
    setIsLoading(true);
    try {
      const items = await searchIdeaStream(q, filters);
      setResults(items);
    } catch (e) {
      console.error('Failed to query idea stream', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleFilter = (type: BookmarkType) => {
    const next = new Set(activeFilters);
    if (next.has(type)) {
      if (next.size > 1) next.delete(type);
    } else {
      next.add(type);
    }
    setActiveFilters(next);
    performSearch(query, next);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(query, activeFilters);
  };

  const handleBookmarkItem = (item: StreamResultItem) => {
    onAddBookmark({
      type: item.type,
      title: item.title,
      link: item.link,
      snippet: item.snippet,
      thumbnailUrl: item.thumbnailUrl,
      source: item.source,
      authors: item.authors,
      publication: item.publication,
      channelTitle: item.channelTitle,
    });
  };

  const getItemTypeBadge = (type: BookmarkType) => {
    switch (type) {
      case 'web':
        return <span className="flex items-center gap-1 text-[10px] text-blue-500 font-medium"><Globe className="w-3 h-3" /> Web</span>;
      case 'image':
        return <span className="flex items-center gap-1 text-[10px] text-teal-500 font-medium"><ImageIcon className="w-3 h-3" /> Image</span>;
      case 'youtube':
        return <span className="flex items-center gap-1 text-[10px] text-red-500 font-medium"><Video className="w-3 h-3" /> Video</span>;
      case 'academic':
        return <span className="flex items-center gap-1 text-[10px] text-indigo-500 font-medium"><BookOpen className="w-3 h-3" /> Paper</span>;
      case 'gemini':
        return <span className="flex items-center gap-1 text-[10px] text-purple-500 font-medium"><Sparkles className="w-3 h-3" /> Gemini AI</span>;
    }
  };

  return (
    <div
      style={{ height: isCollapsed ? '32px' : `${height}px` }}
      className="relative flex flex-col bg-[rgb(var(--color-surface-base))] border-t border-[rgb(var(--color-border-base))] text-xs select-none transition-all flex-shrink-0 z-10 shadow-md"
    >
      {/* Top Drag Resize Handle */}
      {!isCollapsed && (
        <div
          onMouseDown={onResizeStart}
          className="absolute top-0 left-0 w-full h-1.5 cursor-row-resize hover:bg-[rgb(var(--color-accent-text))] transition-colors z-20"
        />
      )}

      {/* Stream Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[rgb(var(--color-surface-muted))] border-b border-[rgb(var(--color-border-base))]">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[rgb(var(--color-text-base))] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-purple-500" />
            <span>Idea & Media Stream</span>
          </span>

          {!isCollapsed && (
            <div className="hidden sm:flex items-center gap-1 ml-2">
              {(['web', 'image', 'youtube', 'academic', 'gemini'] as const).map((type) => {
                const active = activeFilters.has(type);
                return (
                  <button
                    key={type}
                    onClick={() => handleToggleFilter(type)}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider transition-colors ${
                      active
                        ? 'bg-[rgb(var(--color-accent-bg))] text-[rgb(var(--color-accent-text))]'
                        : 'text-[rgb(var(--color-text-muted))] hover:bg-[rgb(var(--color-surface-hover))]'
                    }`}
                  >
                    {type}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {!isCollapsed && (
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-1.5 flex-1 max-w-sm mx-3">
            <div className="relative w-full flex items-center">
              <Search className="w-3.5 h-3.5 absolute left-2 text-[rgb(var(--color-text-subtle))]" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search ideas, papers, images..."
                className="w-full pl-7 pr-2 py-1 rounded bg-[rgb(var(--color-surface-input))] border border-[rgb(var(--color-border-input))] text-xs text-[rgb(var(--color-text-base))] outline-none focus:ring-1 focus:ring-[rgb(var(--color-accent-text))]"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="p-1 rounded hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-muted))]"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </form>
        )}

        <div className="flex items-center gap-1.5">
          {!isCollapsed && (
            <div className="flex items-center bg-[rgb(var(--color-surface-input))] border border-[rgb(var(--color-border-input))] rounded-md p-0.5 mr-1">
              <button
                type="button"
                onClick={() => handleToggleViewMode('cards')}
                title="Card View (Horizontal feed)"
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                  viewMode === 'cards'
                    ? 'bg-[rgb(var(--color-accent-bg))] text-[rgb(var(--color-accent-text))] shadow-xs'
                    : 'text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text-base))]'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Cards</span>
              </button>
              <button
                type="button"
                onClick={() => handleToggleViewMode('tabular')}
                title="Google Search Results View (Tabular list)"
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                  viewMode === 'tabular'
                    ? 'bg-[rgb(var(--color-accent-bg))] text-[rgb(var(--color-accent-text))] shadow-xs'
                    : 'text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text-base))]'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Search Results</span>
              </button>
            </div>
          )}

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-muted))] cursor-pointer"
          >
            {isCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-muted))] cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Stream Content */}
      {!isCollapsed && (
        viewMode === 'cards' ? (
          /* Cards View */
          <div className="flex-1 overflow-x-auto overflow-y-hidden p-2 flex items-stretch gap-3">
            {isLoading ? (
              <div className="w-full flex items-center justify-center text-[rgb(var(--color-text-subtle))] gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-purple-500" />
                <span>Fetching stream items for "{query}"...</span>
              </div>
            ) : results.length === 0 ? (
              <div className="w-full flex items-center justify-center text-[rgb(var(--color-text-subtle))]">
                No results found for current query.
              </div>
            ) : (
              results.map((item) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/json', JSON.stringify({
                      type: 'stream-item',
                      item,
                    }));
                  }}
                  className="w-72 flex-shrink-0 flex flex-col justify-between p-2.5 rounded-xl border border-[rgb(var(--color-border-base))] bg-[rgb(var(--color-surface-muted))] hover:shadow-md transition-all group"
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      {getItemTypeBadge(item.type)}
                      <span className="text-[10px] text-[rgb(var(--color-text-subtle))] truncate max-w-[100px]">
                        {item.source}
                      </span>
                    </div>

                    {item.thumbnailUrl && (
                      <div className="w-full h-24 mb-2 rounded-lg overflow-hidden bg-black/5 relative">
                        <img
                          src={item.thumbnailUrl}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}

                    <h4
                      onClick={() => onOpenLink(item.link, item.title)}
                      className="font-medium text-xs text-[rgb(var(--color-text-base))] hover:text-blue-500 cursor-pointer line-clamp-2 leading-snug"
                      title={item.title}
                    >
                      {item.title}
                    </h4>

                    {item.snippet && (
                      <p className="text-[11px] text-[rgb(var(--color-text-muted))] line-clamp-2 mt-1 leading-normal">
                        {item.snippet}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 mt-2 border-t border-[rgb(var(--color-border-base))]/50">
                    <button
                      onClick={() => onOpenLink(item.link, item.title)}
                      className="flex items-center gap-1 text-[11px] text-blue-500 hover:underline cursor-pointer"
                    >
                      <span>View</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>

                    <button
                      onClick={() => handleBookmarkItem(item)}
                      title="Bookmark into current folder"
                      className="flex items-center gap-1 px-2 py-0.5 rounded bg-[rgb(var(--color-surface-hover))] hover:bg-[rgb(var(--color-accent-bg))] hover:text-[rgb(var(--color-accent-text))] text-[11px] text-[rgb(var(--color-text-base))] transition-colors cursor-pointer"
                    >
                      <BookmarkPlus className="w-3 h-3" />
                      <span>Bookmark</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          /* Tabular Google Search Results View */
          <div className="flex-1 overflow-y-auto overflow-x-auto p-0 min-h-0 bg-[rgb(var(--color-surface-base))]">
            {isLoading ? (
              <div className="w-full h-32 flex items-center justify-center text-[rgb(var(--color-text-subtle))] gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-purple-500" />
                <span>Fetching Google search results for "{query}"...</span>
              </div>
            ) : results.length === 0 ? (
              <div className="w-full h-32 flex items-center justify-center text-[rgb(var(--color-text-subtle))]">
                No results found for current query.
              </div>
            ) : (
              <table className="w-full text-left border-collapse min-w-[560px]">
                <thead className="sticky top-0 z-10 bg-[rgb(var(--color-surface-muted))] border-b border-[rgb(var(--color-border-base))] text-[10px] text-[rgb(var(--color-text-subtle))] uppercase tracking-wider font-semibold shadow-2xs">
                  <tr>
                    <th className="py-2 px-3 w-16 text-center">Type</th>
                    <th className="py-2 px-3">Google Search Result</th>
                    <th className="py-2 px-3 w-40 hidden md:table-cell">Source & Details</th>
                    <th className="py-2 px-3 w-28 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgb(var(--color-border-base))]/40">
                  {results.map((item) => (
                    <tr
                      key={item.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('application/json', JSON.stringify({
                          type: 'stream-item',
                          item,
                        }));
                      }}
                      className="hover:bg-[rgb(var(--color-surface-hover))]/60 transition-colors group cursor-default"
                    >
                      {/* Type Column */}
                      <td className="py-2.5 px-3 align-top text-center">
                        <div className="mt-0.5 inline-block">
                          {getItemTypeBadge(item.type)}
                        </div>
                      </td>

                      {/* Google Search Result Main Column */}
                      <td className="py-2.5 px-3 align-top">
                        {/* Site Emblem + URL Breadcrumb */}
                        <div className="flex items-center gap-1.5 text-[11px] leading-tight mb-1 select-none">
                          <span className="w-4 h-4 rounded-full bg-[rgb(var(--color-surface-input))] border border-[rgb(var(--color-border-base))] flex items-center justify-center text-[9px] font-bold text-[rgb(var(--color-text-muted))] flex-shrink-0">
                            {item.source.charAt(0).toUpperCase()}
                          </span>
                          <span className="font-medium text-[rgb(var(--color-text-base))] text-xs">
                            {item.source}
                          </span>
                          <span className="text-[rgb(var(--color-text-subtle))] text-[10px]">›</span>
                          <span className="text-emerald-700 dark:text-emerald-400 font-mono text-[10px] truncate max-w-xs sm:max-w-md">
                            {item.link}
                          </span>
                        </div>

                        {/* Google Blue Title Link */}
                        <h4
                          onClick={() => onOpenLink(item.link, item.title)}
                          className="font-medium text-xs sm:text-sm text-[#1a0dab] dark:text-[#8ab4f8] hover:underline cursor-pointer leading-snug inline-flex items-center gap-1 group/title"
                          title={item.title}
                        >
                          <span>{item.title}</span>
                          <ExternalLink className="w-3 h-3 opacity-0 group-hover/title:opacity-100 transition-opacity text-blue-500 flex-shrink-0" />
                        </h4>

                        {/* Google Snippet + Thumbnail */}
                        <div className="flex items-start gap-2.5 mt-1">
                          {item.thumbnailUrl && (
                            <div
                              onClick={() => onOpenLink(item.link, item.title)}
                              className="w-16 h-12 rounded overflow-hidden bg-black/5 border border-[rgb(var(--color-border-base))] flex-shrink-0 cursor-pointer hover:opacity-90 relative"
                            >
                              <img
                                src={item.thumbnailUrl}
                                alt={item.title}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                              {item.type === 'youtube' && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                                  <Video className="w-3.5 h-3.5 text-white drop-shadow" />
                                </div>
                              )}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            {item.snippet && (
                              <p className="text-[11px] text-[rgb(var(--color-text-muted))] leading-relaxed line-clamp-2">
                                {item.publishedAt && (
                                  <span className="text-[rgb(var(--color-text-subtle))] font-normal">
                                    {new Date(item.publishedAt).toLocaleDateString(undefined, {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric'
                                    })}{' '}
                                    —{' '}
                                  </span>
                                )}
                                {item.snippet}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Source & Details Column */}
                      <td className="py-2.5 px-3 align-top hidden md:table-cell">
                        <div className="text-[11px] space-y-0.5">
                          <div className="font-medium text-[rgb(var(--color-text-base))]">{item.source}</div>
                          {item.publishedAt && (
                            <div className="text-[10px] text-[rgb(var(--color-text-subtle))]">
                              {new Date(item.publishedAt).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </div>
                          )}
                          {item.authors && item.authors.length > 0 && (
                            <div className="text-[10px] text-[rgb(var(--color-text-subtle))] truncate max-w-[140px]" title={item.authors.join(', ')}>
                              By: {item.authors.join(', ')}
                            </div>
                          )}
                          {item.channelTitle && (
                            <div className="text-[10px] text-[rgb(var(--color-text-subtle))] truncate max-w-[140px]">
                              {item.channelTitle}
                            </div>
                          )}
                          {item.publication && (
                            <div className="text-[10px] text-[rgb(var(--color-text-subtle))] truncate max-w-[140px] italic">
                              {item.publication}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Actions Column */}
                      <td className="py-2.5 px-3 align-top text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleBookmarkItem(item)}
                            title="Bookmark into current folder"
                            className="flex items-center gap-1 px-2 py-1 rounded bg-[rgb(var(--color-surface-hover))] hover:bg-[rgb(var(--color-accent-bg))] hover:text-[rgb(var(--color-accent-text))] text-[11px] text-[rgb(var(--color-text-base))] transition-colors cursor-pointer"
                          >
                            <BookmarkPlus className="w-3 h-3" />
                            <span className="hidden lg:inline">Save</span>
                          </button>
                          <button
                            onClick={() => onOpenLink(item.link, item.title)}
                            title={`Open ${item.title}`}
                            className="p-1 rounded hover:bg-[rgb(var(--color-surface-hover))] text-blue-500 hover:text-blue-600 transition-colors cursor-pointer"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )
      )}
    </div>
  );
};
