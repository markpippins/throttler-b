import React, { useState, useEffect, useMemo } from 'react';
import {
  Bookmark as BookmarkIcon,
  Rss,
  Trash2,
  ExternalLink,
  Search,
  ChevronDown,
  RefreshCw,
  X,
  Globe,
  Image as ImageIcon,
  Video,
  BookOpen,
  Sparkles,
  Sliders,
  Code,
  FileText,
  Copy,
  Check,
  Maximize2,
  Eye,
  FileCode,
  Folder,
  FolderOpen,
  Info,
  Edit3,
  Download,
  Share2,
  File as FileGenericIcon,
  Layers,
  ZoomIn,
  ZoomOut,
  WrapText,
  Music,
  Play,
  Volume2,
  Terminal,
  Calendar,
  HardDrive
} from 'lucide-react';
import { Bookmark, FileSystemNode, RssFeed, RssItem } from '../types';
import { FileIcon, getFileTypeDescription } from './FileIcon';
import { formatFileSize } from '../utils/fileUtils';
import { TagBadge } from './TagBadge';

export interface DetailPaneProps {
  width: number;
  currentPath: string[];
  bookmarks: Bookmark[];
  feeds: RssFeed[];
  selectedItem?: FileSystemNode | null;
  selectedItemsCount?: number;
  folderItems?: FileSystemNode[];
  onNavigate?: (path: string[]) => void;
  onOpenFile?: (item: FileSystemNode) => void;
  onOpenFullEditor?: (content: string, title: string, path: string[]) => void;
  onShowProperties?: (item: FileSystemNode) => void;
  onDeleteBookmark: (id: string) => void;
  onOpenLink: (url: string, title: string) => void;
  onManageFeeds: () => void;
  onResizeStart: (e: React.MouseEvent) => void;
  onClose: () => void;
}

// Helper to determine file classification
function getFileCategory(name: string, isFolder: boolean): 'image' | 'code' | 'text' | 'media' | 'folder' | 'other' {
  if (isFolder) return 'folder';
  const ext = name.includes('.') ? name.split('.').pop()?.toLowerCase() || '' : '';
  
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico', 'avif'].includes(ext)) {
    return 'image';
  }
  if (['ts', 'tsx', 'js', 'jsx', 'json', 'py', 'rs', 'go', 'java', 'kt', 'c', 'cpp', 'cs', 'sh', 'bash', 'zsh', 'sql', 'yaml', 'yml', 'env', 'xml', 'html', 'css', 'scss', 'less'].includes(ext)) {
    return 'code';
  }
  if (['md', 'txt', 'rtf', 'log', 'csv', 'tsv'].includes(ext)) {
    return 'text';
  }
  if (['mp3', 'wav', 'ogg', 'flac', 'mp4', 'webm', 'mkv', 'mov', 'aac'].includes(ext)) {
    return 'media';
  }
  return 'other';
}

function getLanguageLabel(name: string): string {
  const ext = name.includes('.') ? name.split('.').pop()?.toLowerCase() || '' : '';
  const map: Record<string, string> = {
    ts: 'TypeScript',
    tsx: 'TypeScript JSX',
    js: 'JavaScript',
    jsx: 'JavaScript JSX',
    json: 'JSON Data',
    py: 'Python',
    rs: 'Rust',
    go: 'Go',
    java: 'Java',
    kt: 'Kotlin',
    c: 'C Source',
    cpp: 'C++ Source',
    cs: 'C# Source',
    sh: 'Shell Script',
    bash: 'Bash Script',
    zsh: 'Zsh Script',
    sql: 'SQL Query',
    yaml: 'YAML Config',
    yml: 'YAML Config',
    env: 'Environment Config',
    xml: 'XML Document',
    html: 'HTML Document',
    css: 'CSS Stylesheet',
    scss: 'Sass / SCSS',
    less: 'Less Stylesheet',
    md: 'Markdown Document',
    txt: 'Plain Text',
    csv: 'CSV Data',
  };
  return map[ext] || 'Text Document';
}

// Light & Fast Syntax Tokenizer for clean snippet visualization
interface SyntaxToken {
  text: string;
  type: 'keyword' | 'string' | 'comment' | 'number' | 'tag' | 'punctuation' | 'plain';
}

function tokenizeLine(line: string, ext: string): SyntaxToken[] {
  if (!line) return [{ text: '', type: 'plain' }];

  // Comment line check
  const trimmed = line.trimStart();
  if (trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('--') || trimmed.startsWith('/*')) {
    return [{ text: line, type: 'comment' }];
  }

  // Regex tokens
  const tokenRegex = /(".*?"|'.*?'|`.*?`|\b(import|export|from|const|let|var|function|return|interface|type|class|if|else|for|while|switch|case|async|await|def|self|print|select|where|insert|update|delete|true|false|null|undefined|boolean|string|number)\b|<\/?[a-zA-Z0-9_\-]+.*?>|\b\d+(\.\d+)?\b|[{}\[\](),;:=>+\-*\/%&|^!~])/g;

  const tokens: SyntaxToken[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({
        text: line.substring(lastIndex, match.index),
        type: 'plain',
      });
    }

    const matchedText = match[0];
    let type: SyntaxToken['type'] = 'plain';

    if (matchedText.startsWith('"') || matchedText.startsWith("'") || matchedText.startsWith('`')) {
      type = 'string';
    } else if (/^(import|export|from|const|let|var|function|return|interface|type|class|if|else|for|while|switch|case|async|await|def|self|print|select|where|insert|update|delete|true|false|null|undefined|boolean|string|number)$/.test(matchedText)) {
      type = 'keyword';
    } else if (matchedText.startsWith('<') && matchedText.endsWith('>')) {
      type = 'tag';
    } else if (/^\d+(\.\d+)?$/.test(matchedText)) {
      type = 'number';
    } else if (/^[{}\[\](),;:=>+\-*\/%&|^!~]$/.test(matchedText)) {
      type = 'punctuation';
    }

    tokens.push({ text: matchedText, type });
    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < line.length) {
    tokens.push({
      text: line.substring(lastIndex),
      type: 'plain',
    });
  }

  return tokens;
}

export const DetailPane: React.FC<DetailPaneProps> = ({
  width,
  currentPath,
  bookmarks,
  feeds,
  selectedItem,
  selectedItemsCount = 0,
  folderItems = [],
  onNavigate,
  onOpenFile,
  onOpenFullEditor,
  onShowProperties,
  onDeleteBookmark,
  onOpenLink,
  onManageFeeds,
  onResizeStart,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'bookmarks' | 'rss'>('preview');
  const [bookmarkFilter, setBookmarkFilter] = useState('');
  const [selectedFeedId, setSelectedFeedId] = useState<string>(feeds[0]?.id || '');
  const [copiedCode, setCopiedCode] = useState(false);
  const [isWordWrap, setIsWordWrap] = useState(false);
  const [imageFitMode, setImageFitMode] = useState<'contain' | 'cover' | 'original'>('contain');
  const [imgNaturalSize, setImgNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [codeFilter, setCodeFilter] = useState('');

  // Auto-switch to preview tab when single item selected
  useEffect(() => {
    if (selectedItem) {
      setActiveTab('preview');
      setImgNaturalSize(null);
      setCodeFilter('');
    }
  }, [selectedItem?.name]);

  const currentPathString = currentPath.join('/');

  // Filter bookmarks by path prefix and search query
  const filteredBookmarks = bookmarks.filter((b) => {
    const matchesPath = b.path.startsWith(currentPathString) || currentPath.length === 1;
    if (!matchesPath) return false;
    if (!bookmarkFilter.trim()) return true;
    const q = bookmarkFilter.toLowerCase();
    return b.title.toLowerCase().includes(q) || (b.snippet && b.snippet.toLowerCase().includes(q));
  });

  // Feed Articles
  const currentFeed = feeds.find((f) => f.id === selectedFeedId) || feeds[0];
  const rssArticles: RssItem[] = currentFeed
    ? [
        {
          title: `Architecture Updates: What's new in ${currentFeed.name}`,
          source: currentFeed.name,
          date: '1 hour ago',
          snippet: 'Recent announcements detailing distributed file indexing, state reactivity, and offline cache algorithms.',
          link: currentFeed.url.startsWith('http') ? currentFeed.url : `https://${currentFeed.url}`,
        },
        {
          title: `Optimizing Virtual File Hierarchies in Modern Applications`,
          source: currentFeed.name,
          date: '5 hours ago',
          snippet: 'Deep architectural dive exploring memory efficiency, IndexedDB serialization, and stream pipes.',
          link: currentFeed.url.startsWith('http') ? currentFeed.url : `https://${currentFeed.url}`,
        },
        {
          title: `Security Best Practices for Remote Broker Services`,
          source: currentFeed.name,
          date: 'Yesterday',
          snippet: 'Guidelines for mounting remote storage buckets and managing cryptographic auth keys.',
          link: currentFeed.url.startsWith('http') ? currentFeed.url : `https://${currentFeed.url}`,
        },
      ]
    : [];

  const handleCopyCode = () => {
    if (!selectedItem?.content) return;
    navigator.clipboard.writeText(selectedItem.content);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const getBookmarkTypeIcon = (type: string) => {
    switch (type) {
      case 'web':
        return <Globe className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />;
      case 'image':
        return <ImageIcon className="w-3.5 h-3.5 text-teal-500 flex-shrink-0" />;
      case 'youtube':
        return <Video className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />;
      case 'academic':
        return <BookOpen className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />;
      case 'gemini':
        return <Sparkles className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />;
      default:
        return <BookmarkIcon className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />;
    }
  };

  // Preview Data Preparation
  const category = selectedItem ? getFileCategory(selectedItem.name, selectedItem.type === 'folder') : 'other';
  const fileExtension = selectedItem?.name.includes('.') ? selectedItem.name.split('.').pop()?.toLowerCase() || '' : '';

  // Prepare code lines
  const codeContent = selectedItem?.content ?? '';
  const lines = useMemo(() => {
    if (!codeContent) return [];
    return codeContent.split('\n');
  }, [codeContent]);

  const filteredLines = useMemo(() => {
    if (!codeFilter.trim()) {
      return lines.map((text, idx) => ({ text, lineNum: idx + 1 }));
    }
    const q = codeFilter.toLowerCase();
    return lines
      .map((text, idx) => ({ text, lineNum: idx + 1 }))
      .filter((l) => l.text.toLowerCase().includes(q));
  }, [lines, codeFilter]);

  // Image Source Resolver
  const imageSource = useMemo(() => {
    if (!selectedItem) return '';
    if (selectedItem.content && (selectedItem.content.startsWith('http') || selectedItem.content.startsWith('data:image'))) {
      return selectedItem.content;
    }
    // High-resolution fallback placeholder seed
    return `https://picsum.photos/seed/${encodeURIComponent(selectedItem.name)}/800/600`;
  }, [selectedItem]);

  return (
    <div
      style={{ width: `${width}px` }}
      className="relative flex flex-col h-full bg-[rgb(var(--color-surface-base))] border-l border-[rgb(var(--color-border-base))] text-xs select-none flex-shrink-0 z-10 shadow-sm transition-colors"
    >
      {/* Left Drag Resize Handle */}
      <div
        onMouseDown={onResizeStart}
        className="absolute top-0 left-0 w-1.5 h-full cursor-col-resize hover:bg-[rgb(var(--color-accent-text))] transition-colors z-20"
      />

      {/* Pane Header Tabs */}
      <div className="flex items-center justify-between border-b border-[rgb(var(--color-border-base))] bg-[rgb(var(--color-surface-muted))] px-2 pt-1">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('preview')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-t-md font-medium border-t border-x transition-colors relative ${
              activeTab === 'preview'
                ? 'bg-[rgb(var(--color-surface-base))] border-[rgb(var(--color-border-base))] text-[rgb(var(--color-accent-text))]'
                : 'border-transparent text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text-base))]'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Preview</span>
            {selectedItem && (
              <span className="w-1.5 h-1.5 rounded-full bg-[rgb(var(--color-accent-text))] animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('bookmarks')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-t-md font-medium border-t border-x transition-colors ${
              activeTab === 'bookmarks'
                ? 'bg-[rgb(var(--color-surface-base))] border-[rgb(var(--color-border-base))] text-[rgb(var(--color-accent-text))]'
                : 'border-transparent text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text-base))]'
            }`}
          >
            <BookmarkIcon className="w-3.5 h-3.5" />
            <span>Saved ({filteredBookmarks.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('rss')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-t-md font-medium border-t border-x transition-colors ${
              activeTab === 'rss'
                ? 'bg-[rgb(var(--color-surface-base))] border-[rgb(var(--color-border-base))] text-[rgb(var(--color-accent-text))]'
                : 'border-transparent text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text-base))]'
            }`}
          >
            <Rss className="w-3.5 h-3.5" />
            <span>RSS</span>
          </button>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-muted))]"
          title="Close details pane"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. PREVIEW TAB VIEW (THUMBNAIL & CODE SNIPPET PREVIEW) */}
      {/* ========================================================================= */}
      {activeTab === 'preview' && (
        <div className="flex-1 flex flex-col overflow-hidden bg-[rgb(var(--color-surface-base))]">
          {/* A. SINGLE ITEM SELECTED */}
          {selectedItem && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Header Info Bar */}
              <div className="p-3 border-b border-[rgb(var(--color-border-base))] bg-[rgb(var(--color-surface-muted))]/40 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileIcon
                      nodeOrName={selectedItem}
                      isFolder={selectedItem.type === 'folder'}
                      size="sm"
                      className="w-5 h-5 flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <h3 className="font-semibold text-xs text-[rgb(var(--color-text-base))] truncate" title={selectedItem.name}>
                        {selectedItem.name}
                      </h3>
                      <p className="text-[10px] text-[rgb(var(--color-text-muted))] truncate">
                        {getFileTypeDescription(selectedItem)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    {onShowProperties && (
                      <button
                        onClick={() => onShowProperties(selectedItem)}
                        className="p-1.5 rounded hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text-base))]"
                        title="View File Properties"
                      >
                        <Info className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {selectedItem.type === 'file' && onOpenFile && (
                      <button
                        onClick={() => onOpenFile(selectedItem)}
                        className="p-1.5 rounded bg-[rgb(var(--color-accent-text))]/10 hover:bg-[rgb(var(--color-accent-text))]/20 text-[rgb(var(--color-accent-text))] font-medium flex items-center gap-1"
                        title="Open in full editor"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span className="text-[10px]">Edit</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Quick File Metadata Badges */}
                <div className="flex items-center gap-2 flex-wrap text-[10px] text-[rgb(var(--color-text-subtle))]">
                  {selectedItem.type === 'file' && (
                    <span className="px-1.5 py-0.5 rounded bg-[rgb(var(--color-surface-input))] border border-[rgb(var(--color-border-input))]">
                      {formatFileSize(selectedItem.size || selectedItem.content?.length || 0)}
                    </span>
                  )}
                  {selectedItem.modified && (
                    <span className="px-1.5 py-0.5 rounded bg-[rgb(var(--color-surface-input))] border border-[rgb(var(--color-border-input))]">
                      {new Date(selectedItem.modified).toLocaleDateString()}
                    </span>
                  )}
                  {category === 'code' && (
                    <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20 font-medium">
                      {getLanguageLabel(selectedItem.name)}
                    </span>
                  )}
                  {category === 'image' && imgNaturalSize && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-medium">
                      {imgNaturalSize.width} × {imgNaturalSize.height} px
                    </span>
                  )}
                </div>
                {selectedItem.tags && selectedItem.tags.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap mt-2 pt-2 border-t border-[rgb(var(--color-border-base))]">
                    {selectedItem.tags.map((tag) => (
                      <TagBadge key={tag} tag={tag} size="xs" />
                    ))}
                  </div>
                )}
              </div>

              {/* B. IMAGE THUMBNAIL PREVIEW */}
              {category === 'image' && (
                <div className="flex-1 flex flex-col overflow-hidden p-3 gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-[rgb(var(--color-text-muted))] flex items-center gap-1">
                      <ImageIcon className="w-3.5 h-3.5 text-teal-500" />
                      Image Thumbnail Preview
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setImageFitMode(imageFitMode === 'contain' ? 'cover' : 'contain')}
                        className={`p-1 rounded text-[10px] font-medium border transition-colors ${
                          imageFitMode === 'contain'
                            ? 'bg-[rgb(var(--color-surface-hover))] border-[rgb(var(--color-border-base))] text-[rgb(var(--color-text-base))]'
                            : 'border-transparent text-[rgb(var(--color-text-muted))]'
                        }`}
                        title="Toggle Aspect Ratio Fit"
                      >
                        {imageFitMode === 'contain' ? 'Fit View' : 'Fill View'}
                      </button>

                      <button
                        onClick={() => onOpenLink(imageSource, selectedItem.name)}
                        className="p-1 rounded hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-muted))] hover:text-blue-500"
                        title="Open full size image"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Thumbnail Stage */}
                  <div className="flex-1 min-h-[180px] max-h-[360px] rounded-xl border border-[rgb(var(--color-border-base))] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[rgb(var(--color-surface-muted))] to-[rgb(var(--color-surface-input))] overflow-hidden flex items-center justify-center p-2 relative group">
                    <img
                      src={imageSource}
                      alt={selectedItem.name}
                      onLoad={(e) => {
                        const target = e.currentTarget;
                        setImgNaturalSize({
                          width: target.naturalWidth,
                          height: target.naturalHeight,
                        });
                      }}
                      className={`max-w-full max-h-full rounded-lg shadow-sm transition-all duration-200 ${
                        imageFitMode === 'contain' ? 'object-contain' : 'object-cover w-full h-full'
                      }`}
                      referrerPolicy="no-referrer"
                    />

                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded-xl backdrop-blur-xs">
                      <button
                        onClick={() => onOpenLink(imageSource, selectedItem.name)}
                        className="px-3 py-1.5 rounded-lg bg-white/90 text-black text-xs font-semibold shadow-md flex items-center gap-1.5 hover:bg-white transition-colors"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                        Full Size
                      </button>
                    </div>
                  </div>

                  {/* Image Details Card */}
                  <div className="p-2.5 rounded-lg border border-[rgb(var(--color-border-base))] bg-[rgb(var(--color-surface-muted))]/30 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[rgb(var(--color-text-muted))]">Dimensions:</span>
                      <span className="font-mono font-medium text-[rgb(var(--color-text-base))]">
                        {imgNaturalSize ? `${imgNaturalSize.width} × ${imgNaturalSize.height} px` : 'Loading size...'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[rgb(var(--color-text-muted))]">File Format:</span>
                      <span className="font-mono font-medium text-[rgb(var(--color-text-base))] uppercase">
                        {fileExtension || 'IMG'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[rgb(var(--color-text-muted))]">File Size:</span>
                      <span className="font-mono font-medium text-[rgb(var(--color-text-base))]">
                        {formatFileSize(selectedItem.size || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* C. CODE & TEXT SNIPPET PREVIEW */}
              {(category === 'code' || category === 'text') && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Code Toolbar */}
                  <div className="px-3 py-2 border-b border-[rgb(var(--color-border-base))] bg-[rgb(var(--color-surface-muted))]/30 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Code className="w-3.5 h-3.5 text-indigo-500" />
                      <span className="font-medium text-[11px] text-[rgb(var(--color-text-base))]">
                        {getLanguageLabel(selectedItem.name)}
                      </span>
                      <span className="text-[10px] text-[rgb(var(--color-text-subtle))]">
                        ({lines.length} lines)
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setIsWordWrap(!isWordWrap)}
                        className={`p-1 rounded text-[10px] border transition-colors ${
                          isWordWrap
                            ? 'bg-[rgb(var(--color-surface-hover))] border-[rgb(var(--color-border-base))] text-[rgb(var(--color-text-base))]'
                            : 'border-transparent text-[rgb(var(--color-text-muted))]'
                        }`}
                        title="Toggle Word Wrap"
                      >
                        <WrapText className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={handleCopyCode}
                        className="p-1 rounded hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text-base))] transition-colors flex items-center gap-1"
                        title="Copy Code Snippet"
                      >
                        {copiedCode ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Filter / Search within snippet if lines > 10 */}
                  {lines.length > 10 && (
                    <div className="px-2 py-1.5 border-b border-[rgb(var(--color-border-base))] bg-[rgb(var(--color-surface-base))]">
                      <div className="relative flex items-center">
                        <Search className="w-3 h-3 absolute left-2 text-[rgb(var(--color-text-subtle))]" />
                        <input
                          type="text"
                          placeholder="Filter lines in snippet..."
                          value={codeFilter}
                          onChange={(e) => setCodeFilter(e.target.value)}
                          className="w-full pl-6 pr-2 py-0.5 rounded bg-[rgb(var(--color-surface-input))] border border-[rgb(var(--color-border-input))] text-[11px] text-[rgb(var(--color-text-base))] outline-none"
                        />
                        {codeFilter && (
                          <button
                            onClick={() => setCodeFilter('')}
                            className="absolute right-1.5 p-0.5 rounded text-[rgb(var(--color-text-muted))]"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Code Lines Container */}
                  <div className="flex-1 overflow-auto p-2 bg-[rgb(var(--color-surface-input))]/60 font-mono text-[11px] select-text">
                    {lines.length === 0 || (lines.length === 1 && lines[0] === '') ? (
                      <div className="h-full flex flex-col items-center justify-center text-[rgb(var(--color-text-subtle))] p-4 text-center select-none">
                        <FileCode className="w-8 h-8 opacity-30 mb-2" />
                        <p>Empty File</p>
                        <p className="text-[10px] mt-1">Click "Edit" above to write content into this file.</p>
                      </div>
                    ) : (
                      <table className="w-full border-collapse">
                        <tbody>
                          {filteredLines.map(({ text, lineNum }) => {
                            const tokens = tokenizeLine(text, fileExtension);
                            return (
                              <tr key={lineNum} className="hover:bg-[rgb(var(--color-surface-hover))]/50 transition-colors group">
                                <td className="py-0.5 pr-3 pl-1 text-right text-[rgb(var(--color-text-subtle))]/60 select-none w-8 text-[10px] align-top font-mono border-r border-[rgb(var(--color-border-base))]/40">
                                  {lineNum}
                                </td>
                                <td
                                  className={`py-0.5 pl-3 text-[rgb(var(--color-text-base))] leading-relaxed ${
                                    isWordWrap ? 'whitespace-pre-wrap break-all' : 'whitespace-pre'
                                  }`}
                                >
                                  {tokens.map((tok, tIdx) => {
                                    let colorClass = 'text-[rgb(var(--color-text-base))]';
                                    if (tok.type === 'keyword') colorClass = 'text-blue-500 font-medium';
                                    else if (tok.type === 'string') colorClass = 'text-emerald-500';
                                    else if (tok.type === 'comment') colorClass = 'text-[rgb(var(--color-text-subtle))] italic';
                                    else if (tok.type === 'number') colorClass = 'text-amber-500';
                                    else if (tok.type === 'tag') colorClass = 'text-purple-500';
                                    else if (tok.type === 'punctuation') colorClass = 'text-[rgb(var(--color-text-muted))]';

                                    return (
                                      <span key={tIdx} className={colorClass}>
                                        {tok.text}
                                      </span>
                                    );
                                  })}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Bottom Quick Action Footer */}
                  <div className="p-2 border-t border-[rgb(var(--color-border-base))] bg-[rgb(var(--color-surface-muted))]/40 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-[rgb(var(--color-text-subtle))] font-mono">
                      {lines.length} lines • {codeContent.length} chars
                    </span>

                    {onOpenFile && (
                      <button
                        onClick={() => onOpenFile(selectedItem)}
                        className="px-2.5 py-1 rounded bg-[rgb(var(--color-accent-text))] text-white text-[11px] font-medium shadow-xs hover:opacity-90 transition-opacity flex items-center gap-1.5"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Open in Full Editor</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* D. MEDIA FILE PREVIEW */}
              {category === 'media' && (
                <div className="flex-1 flex flex-col p-4 gap-3">
                  <div className="p-4 rounded-xl border border-[rgb(var(--color-border-base))] bg-[rgb(var(--color-surface-muted))] flex flex-col items-center justify-center text-center gap-3">
                    <div className="w-14 h-14 rounded-full bg-purple-500/10 text-purple-500 flex items-center justify-center">
                      <Music className="w-7 h-7" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-xs text-[rgb(var(--color-text-base))]">{selectedItem.name}</h4>
                      <p className="text-[10px] text-[rgb(var(--color-text-muted))] mt-0.5">Media Stream File</p>
                    </div>
                    {selectedItem.content?.startsWith('http') && (
                      <audio controls className="w-full mt-2">
                        <source src={selectedItem.content} />
                        Your browser does not support audio playback.
                      </audio>
                    )}
                  </div>
                </div>
              )}

              {/* E. FOLDER / OTHER ITEM PREVIEW */}
              {category === 'folder' && (
                <div className="flex-1 flex flex-col p-4 gap-3">
                  <div className="p-4 rounded-xl border border-[rgb(var(--color-border-base))] bg-[rgb(var(--color-surface-muted))] flex flex-col items-center justify-center text-center gap-2">
                    <FolderOpen className="w-12 h-12 text-amber-500 mb-1" />
                    <h4 className="font-semibold text-sm text-[rgb(var(--color-text-base))]">{selectedItem.name}</h4>
                    <p className="text-[11px] text-[rgb(var(--color-text-muted))]">
                      Folder contains subdirectories and files
                    </p>
                    {onNavigate && (
                      <button
                        onClick={() => onNavigate([...currentPath, selectedItem.name])}
                        className="mt-2 px-3 py-1.5 rounded-lg bg-[rgb(var(--color-accent-text))] text-white text-xs font-medium shadow-xs hover:opacity-90 transition-opacity"
                      >
                        Open Directory
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* B. MULTIPLE ITEMS SELECTED */}
          {!selectedItem && selectedItemsCount > 1 && (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-[rgb(var(--color-text-muted))] gap-2">
              <Layers className="w-10 h-10 text-[rgb(var(--color-accent-text))] opacity-80 mb-1" />
              <h3 className="font-semibold text-xs text-[rgb(var(--color-text-base))]">
                {selectedItemsCount} items selected
              </h3>
              <p className="text-[11px] text-[rgb(var(--color-text-subtle))] max-w-[200px]">
                Multiple items are highlighted in the explorer pane. Select a single file to preview its thumbnail or code snippet.
              </p>
            </div>
          )}

          {/* C. NOTHING SELECTED IN CURRENT FOLDER */}
          {!selectedItem && selectedItemsCount <= 1 && (
            <div className="flex-1 flex flex-col justify-between p-4 text-[rgb(var(--color-text-muted))]">
              <div className="flex flex-col items-center justify-center flex-1 text-center p-4">
                <div className="w-12 h-12 rounded-full bg-[rgb(var(--color-surface-muted))] border border-[rgb(var(--color-border-base))] flex items-center justify-center text-[rgb(var(--color-text-subtle))] mb-3">
                  <Eye className="w-6 h-6 opacity-60" />
                </div>
                <h4 className="font-semibold text-xs text-[rgb(var(--color-text-base))] mb-1">
                  No Item Selected
                </h4>
                <p className="text-[11px] text-[rgb(var(--color-text-subtle))] max-w-[220px] leading-relaxed">
                  Select an image or code/text file in the explorer to preview thumbnails, code snippets, and metadata here.
                </p>
              </div>

              {/* Current Directory Overview Card */}
              <div className="p-3 rounded-lg border border-[rgb(var(--color-border-base))] bg-[rgb(var(--color-surface-muted))]/40 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Folder className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <span className="font-medium text-xs text-[rgb(var(--color-text-base))] truncate">
                    /{currentPath.join('/')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-[rgb(var(--color-text-subtle))] pt-1 border-t border-[rgb(var(--color-border-base))]/40">
                  <span>{folderItems.length} items in current folder</span>
                  <span>{folderItems.filter((i) => i.type === 'folder').length} folders, {folderItems.filter((i) => i.type === 'file').length} files</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. BOOKMARKS TAB VIEW */}
      {/* ========================================================================= */}
      {activeTab === 'bookmarks' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-2 border-b border-[rgb(var(--color-border-base))]">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 absolute left-2 text-[rgb(var(--color-text-subtle))]" />
              <input
                type="text"
                placeholder="Search bookmarks..."
                value={bookmarkFilter}
                onChange={(e) => setBookmarkFilter(e.target.value)}
                className="w-full pl-7 pr-2 py-1 rounded bg-[rgb(var(--color-surface-input))] border border-[rgb(var(--color-border-input))] text-xs text-[rgb(var(--color-text-base))] outline-none focus:ring-1 focus:ring-[rgb(var(--color-accent-text))]"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2">
            {filteredBookmarks.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-[rgb(var(--color-text-subtle))] text-center p-4">
                <BookmarkIcon className="w-8 h-8 opacity-30 mb-2" />
                <p>No bookmarks saved in this folder yet.</p>
                <p className="text-[10px] mt-1">Use the Idea Stream below to bookmark articles and ideas.</p>
              </div>
            ) : (
              filteredBookmarks.map((b) => (
                <div
                  key={b._id}
                  className="p-2.5 rounded-lg border border-[rgb(var(--color-border-base))] bg-[rgb(var(--color-surface-muted))] hover:shadow-sm transition-shadow group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {getBookmarkTypeIcon(b.type)}
                        <span className="font-semibold text-xs text-[rgb(var(--color-text-base))] truncate">
                          {b.title}
                        </span>
                      </div>
                      <button
                        onClick={() => onDeleteBookmark(b._id)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-red-500 hover:bg-red-500/10 transition-opacity"
                        title="Delete Bookmark"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>

                    {b.snippet && (
                      <p className="text-[11px] text-[rgb(var(--color-text-muted))] line-clamp-2 mt-0.5 leading-relaxed">
                        {b.snippet}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-[rgb(var(--color-border-base))]/40 text-[10px] text-[rgb(var(--color-text-subtle))]">
                    <span className="truncate max-w-[120px]">{b.source}</span>
                    <button
                      onClick={() => onOpenLink(b.link, b.title)}
                      className="flex items-center gap-1 text-blue-500 hover:underline"
                    >
                      <span>Open Link</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. RSS FEED TAB VIEW */}
      {/* ========================================================================= */}
      {activeTab === 'rss' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-2 border-b border-[rgb(var(--color-border-base))] flex items-center justify-between gap-2">
            <select
              value={selectedFeedId}
              onChange={(e) => setSelectedFeedId(e.target.value)}
              className="flex-1 px-2 py-1 rounded bg-[rgb(var(--color-surface-input))] border border-[rgb(var(--color-border-input))] text-xs text-[rgb(var(--color-text-base))] outline-none"
            >
              {feeds.map((feed) => (
                <option key={feed.id} value={feed.id}>
                  {feed.name}
                </option>
              ))}
            </select>

            <button
              onClick={onManageFeeds}
              title="Manage RSS Feeds"
              className="p-1 rounded hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-muted))]"
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2">
            {rssArticles.map((art, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-lg border border-[rgb(var(--color-border-base))] bg-[rgb(var(--color-surface-muted))] hover:shadow-sm transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-[10px] text-[rgb(var(--color-text-subtle))] mb-1">
                    <span>{art.source}</span>
                    <span>{art.date}</span>
                  </div>
                  <h4
                    onClick={() => onOpenLink(art.link, art.title)}
                    className="font-medium text-xs text-[rgb(var(--color-text-base))] hover:text-blue-500 cursor-pointer leading-snug"
                  >
                    {art.title}
                  </h4>
                  <p className="text-[11px] text-[rgb(var(--color-text-muted))] line-clamp-2 mt-1 leading-normal">
                    {art.snippet}
                  </p>
                </div>

                <div className="flex justify-end mt-2 pt-1.5 border-t border-[rgb(var(--color-border-base))]/40">
                  <button
                    onClick={() => onOpenLink(art.link, art.title)}
                    className="flex items-center gap-1 text-[11px] text-blue-500 hover:underline"
                  >
                    <span>Read Full Article</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
