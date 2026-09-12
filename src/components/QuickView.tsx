import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Edit3,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  Search,
  WrapText,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  FileText,
  FileCode,
  Image as ImageIcon,
  Folder,
  Code,
  ExternalLink,
  BookOpen,
  Music,
  Video,
  File as FileIconDefault,
  Layers,
  Sparkles,
  Columns,
  List,
} from 'lucide-react';
import { FileSystemNode, SubtreeStats } from '../types';
import { formatFileSize } from '../utils/fileUtils';
import { FileIcon, getFileMetadata, getFileTypeDescription } from './FileIcon';
import { SoundService } from '../services/soundService';
import { VirtualFileSystem } from '../services/fileSystemService';
import { TagBadge } from './TagBadge';

export interface QuickViewProps {
  item: FileSystemNode;
  path: string[];
  allItems: FileSystemNode[];
  onClose: () => void;
  onOpenFile?: (item: FileSystemNode, path: string[]) => void;
  onNavigateToItem?: (item: FileSystemNode) => void;
  isDocked?: boolean;
  onToggleDock?: () => void;
  vfsService?: VirtualFileSystem;
}

// Simple syntax highligher tokenizer for code and config files
function highlightCodeLine(line: string, ext: string): React.ReactNode[] {
  if (!line) return [' '];

  // Regex patterns for syntax highlighting
  const jsTsKeywords = /^(import|export|from|default|return|const|let|var|function|async|await|class|interface|type|extends|implements|if|else|switch|case|break|continue|for|while|do|try|catch|finally|throw|new|typeof|instanceof|in|of|void|null|undefined|true|false|boolean|number|string|any|never|unknown)$/;
  const pyKeywords = /^(import|from|def|class|return|if|elif|else|for|while|try|except|finally|raise|with|as|in|is|not|and|or|None|True|False|lambda|yield)$/;

  const isCode = ['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'c', 'cpp', 'cs', 'go', 'rs', 'php', 'rb', 'json', 'html', 'css', 'scss', 'sql', 'sh', 'bash', 'yaml', 'yml'].includes(ext);
  if (!isCode) {
    return [line];
  }

  // Split line into tokens preserving separators
  const tokenRegex = /(\/\/.*$|#.*$|\/\*[\s\S]*?\*\/|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`|\b\d+(?:\.\d+)?\b|[a-zA-Z_$][a-zA-Z0-9_$]*|[{}()[\].,;:+\-*/%&|^~!=<>?]+|\s+)/g;
  const matches = line.match(tokenRegex);
  if (!matches) return [line];

  return matches.map((token, idx) => {
    // Comments
    if (token.startsWith('//') || token.startsWith('#') || token.startsWith('/*')) {
      return (
        <span key={idx} className="text-emerald-600 dark:text-emerald-400 italic">
          {token}
        </span>
      );
    }
    // String literals
    if ((token.startsWith('"') && token.endsWith('"')) || (token.startsWith("'") && token.endsWith("'")) || (token.startsWith('`') && token.endsWith('`'))) {
      return (
        <span key={idx} className="text-amber-600 dark:text-amber-300">
          {token}
        </span>
      );
    }
    // Numbers
    if (/^\d+(?:\.\d+)?$/.test(token)) {
      return (
        <span key={idx} className="text-orange-600 dark:text-orange-400 font-semibold">
          {token}
        </span>
      );
    }
    // Keywords
    if (ext === 'py' ? pyKeywords.test(token) : jsTsKeywords.test(token)) {
      return (
        <span key={idx} className="text-purple-600 dark:text-purple-400 font-bold">
          {token}
        </span>
      );
    }
    // Punctuation / Operators
    if (/^[{}()[\].,;:+\-*/%&|^~!=<>?]+$/.test(token)) {
      return (
        <span key={idx} className="text-[rgb(var(--color-text-muted))]">
          {token}
        </span>
      );
    }
    return <span key={idx}>{token}</span>;
  });
}

// Lightweight Markdown Renderer Component
interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const [copiedCodeBlock, setCopiedCodeBlock] = useState<number | null>(null);

  // Parse markdown lines into structured blocks
  const blocks = useMemo(() => {
    if (!content) return [];
    const lines = content.split('\n');
    const result: Array<{
      type: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'codeblock' | 'blockquote' | 'ul' | 'ol' | 'task' | 'hr' | 'table';
      text?: string;
      items?: string[];
      tasks?: Array<{ checked: boolean; text: string }>;
      lang?: string;
      code?: string;
      rows?: string[][];
    }> = [];

    let inCodeBlock = false;
    let codeLang = '';
    let codeLines: string[] = [];

    let currentList: { type: 'ul' | 'ol' | 'task'; items: string[]; tasks?: Array<{ checked: boolean; text: string }> } | null = null;

    const flushList = () => {
      if (currentList) {
        result.push(currentList);
        currentList = null;
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Code block start / end
      if (line.trim().startsWith('```')) {
        if (!inCodeBlock) {
          flushList();
          inCodeBlock = true;
          codeLang = line.trim().slice(3).trim();
          codeLines = [];
        } else {
          inCodeBlock = false;
          result.push({
            type: 'codeblock',
            lang: codeLang || 'text',
            code: codeLines.join('\n'),
          });
          codeLines = [];
          codeLang = '';
        }
        continue;
      }

      if (inCodeBlock) {
        codeLines.push(line);
        continue;
      }

      // Horizontal Rule
      if (/^(\*{3,}|-{3,}|_{3,})$/.test(line.trim())) {
        flushList();
        result.push({ type: 'hr' });
        continue;
      }

      // Headings
      if (line.startsWith('# ')) {
        flushList();
        result.push({ type: 'h1', text: line.substring(2).trim() });
        continue;
      }
      if (line.startsWith('## ')) {
        flushList();
        result.push({ type: 'h2', text: line.substring(3).trim() });
        continue;
      }
      if (line.startsWith('### ')) {
        flushList();
        result.push({ type: 'h3', text: line.substring(4).trim() });
        continue;
      }
      if (line.startsWith('#### ')) {
        flushList();
        result.push({ type: 'h4', text: line.substring(5).trim() });
        continue;
      }

      // Blockquote
      if (line.startsWith('> ')) {
        flushList();
        result.push({ type: 'blockquote', text: line.substring(2).trim() });
        continue;
      }

      // Task List items (- [ ] or - [x])
      const taskMatch = line.match(/^[-*]\s+\[([ xX])\]\s+(.*)$/);
      if (taskMatch) {
        const checked = taskMatch[1].toLowerCase() === 'x';
        const text = taskMatch[2];
        if (currentList && currentList.type === 'task') {
          currentList.tasks?.push({ checked, text });
        } else {
          flushList();
          currentList = { type: 'task', items: [], tasks: [{ checked, text }] };
        }
        continue;
      }

      // Bullet List (- or *)
      const ulMatch = line.match(/^[-*]\s+(.*)$/);
      if (ulMatch) {
        if (currentList && currentList.type === 'ul') {
          currentList.items.push(ulMatch[1]);
        } else {
          flushList();
          currentList = { type: 'ul', items: [ulMatch[1]] };
        }
        continue;
      }

      // Ordered List (1. )
      const olMatch = line.match(/^\d+\.\s+(.*)$/);
      if (olMatch) {
        if (currentList && currentList.type === 'ol') {
          currentList.items.push(olMatch[1]);
        } else {
          flushList();
          currentList = { type: 'ol', items: [olMatch[1]] };
        }
        continue;
      }

      // Table row detection
      if (line.includes('|') && line.trim().startsWith('|') && line.trim().endsWith('|')) {
        flushList();
        const cells = line
          .split('|')
          .slice(1, -1)
          .map((c) => c.trim());

        // Check if next or previous row is divider (---)
        const isDivider = cells.every((c) => /^:?-+:?$/.test(c));
        if (!isDivider) {
          const lastBlock = result[result.length - 1];
          if (lastBlock && lastBlock.type === 'table' && lastBlock.rows) {
            lastBlock.rows.push(cells);
          } else {
            result.push({ type: 'table', rows: [cells] });
          }
        }
        continue;
      }

      // Empty line
      if (!line.trim()) {
        flushList();
        continue;
      }

      // Standard Paragraph
      flushList();
      result.push({ type: 'p', text: line });
    }

    flushList();
    if (inCodeBlock && codeLines.length > 0) {
      result.push({
        type: 'codeblock',
        lang: codeLang || 'text',
        code: codeLines.join('\n'),
      });
    }

    return result;
  }, [content]);

  // Inline formatting helper for bold, italic, inline code, and links
  const renderInline = (text: string) => {
    if (!text) return null;

    // Pattern for inline code, bold, italic, links, strikethrough
    const inlineRegex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|~~[^~]+~~|\[[^\]]+\]\([^)]+\))/g;
    const parts = text.split(inlineRegex);

    return parts.map((part, idx) => {
      // Inline code
      if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
        return (
          <code
            key={idx}
            className="px-1.5 py-0.5 rounded bg-[rgb(var(--color-surface-hover))] font-mono text-[11px] text-[rgb(var(--color-accent-text))] border border-[rgb(var(--color-border-base))]"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      // Bold
      if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
        return (
          <strong key={idx} className="font-bold text-[rgb(var(--color-text-base))]">
            {part.slice(2, -2)}
          </strong>
        );
      }
      // Italic
      if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
        return (
          <em key={idx} className="italic text-[rgb(var(--color-text-base))]">
            {part.slice(1, -1)}
          </em>
        );
      }
      // Strikethrough
      if (part.startsWith('~~') && part.endsWith('~~') && part.length > 4) {
        return (
          <span key={idx} className="line-through opacity-70">
            {part.slice(2, -2)}
          </span>
        );
      }
      // Links
      const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        return (
          <a
            key={idx}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[rgb(var(--color-accent-text))] underline underline-offset-2 hover:opacity-80 transition-opacity inline-flex items-center gap-0.5"
          >
            {linkMatch[1]}
            <ExternalLink className="w-2.5 h-2.5 inline ml-0.5" />
          </a>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  const handleCopyCode = (code: string, blockIdx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeBlock(blockIdx);
    setTimeout(() => setCopiedCodeBlock(null), 1800);
  };

  return (
    <div className="space-y-3.5 text-xs text-[rgb(var(--color-text-base))] leading-relaxed max-w-full">
      {blocks.map((block, idx) => {
        switch (block.type) {
          case 'h1':
            return (
              <h1
                key={idx}
                className="text-lg font-bold pb-2 border-b border-[rgb(var(--color-border-base))] text-[rgb(var(--color-text-base))] mt-3 flex items-center gap-2"
              >
                <span className="w-1.5 h-5 bg-[rgb(var(--color-accent-text))] rounded-full inline-block" />
                {renderInline(block.text || '')}
              </h1>
            );
          case 'h2':
            return (
              <h2
                key={idx}
                className="text-base font-semibold pb-1.5 border-b border-[rgb(var(--color-border-base))]/60 text-[rgb(var(--color-text-base))] mt-2.5"
              >
                {renderInline(block.text || '')}
              </h2>
            );
          case 'h3':
            return (
              <h3 key={idx} className="text-sm font-semibold text-[rgb(var(--color-text-base))] mt-2">
                {renderInline(block.text || '')}
              </h3>
            );
          case 'h4':
            return (
              <h4 key={idx} className="text-xs font-semibold text-[rgb(var(--color-text-muted))] uppercase tracking-wider mt-1.5">
                {renderInline(block.text || '')}
              </h4>
            );
          case 'blockquote':
            return (
              <blockquote
                key={idx}
                className="border-l-3 border-[rgb(var(--color-accent-text))] pl-3 py-1 my-1.5 bg-[rgb(var(--color-surface-hover))]/40 rounded-r text-[rgb(var(--color-text-muted))] italic"
              >
                {renderInline(block.text || '')}
              </blockquote>
            );
          case 'codeblock':
            return (
              <div
                key={idx}
                className="rounded-lg border border-[rgb(var(--color-border-base))] bg-[rgb(var(--color-surface-input))] overflow-hidden my-2.5 shadow-2xs"
              >
                <div className="flex items-center justify-between px-3 py-1.5 bg-[rgb(var(--color-surface-muted))] border-b border-[rgb(var(--color-border-base))] text-[11px] text-[rgb(var(--color-text-muted))]">
                  <span className="font-mono uppercase text-[10px] font-semibold text-[rgb(var(--color-accent-text))]">
                    {block.lang || 'code'}
                  </span>
                  <button
                    onClick={() => handleCopyCode(block.code || '', idx)}
                    className="flex items-center gap-1 hover:text-[rgb(var(--color-text-base))] text-[10px] px-1.5 py-0.5 rounded hover:bg-[rgb(var(--color-surface-hover))] transition-colors cursor-pointer"
                    title="Copy code block"
                  >
                    {copiedCodeBlock === idx ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-500" />
                        <span className="text-emerald-500">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-3 overflow-x-auto font-mono text-[11px] leading-relaxed text-[rgb(var(--color-text-base))] bg-[rgb(var(--color-surface-input))]/60">
                  <code>{block.code}</code>
                </pre>
              </div>
            );
          case 'ul':
            return (
              <ul key={idx} className="list-disc list-inside space-y-1 my-1 pl-1">
                {block.items?.map((item, itemIdx) => (
                  <li key={itemIdx} className="text-[rgb(var(--color-text-base))]">
                    {renderInline(item)}
                  </li>
                ))}
              </ul>
            );
          case 'ol':
            return (
              <ol key={idx} className="list-decimal list-inside space-y-1 my-1 pl-1">
                {block.items?.map((item, itemIdx) => (
                  <li key={itemIdx} className="text-[rgb(var(--color-text-base))]">
                    {renderInline(item)}
                  </li>
                ))}
              </ol>
            );
          case 'task':
            return (
              <div key={idx} className="space-y-1 my-1.5">
                {block.tasks?.map((t, taskIdx) => (
                  <div key={taskIdx} className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={t.checked}
                      readOnly
                      className="rounded border-[rgb(var(--color-border-input))] text-[rgb(var(--color-accent-text))] cursor-default pointer-events-none"
                    />
                    <span className={t.checked ? 'line-through opacity-60' : 'text-[rgb(var(--color-text-base))]'}>
                      {renderInline(t.text)}
                    </span>
                  </div>
                ))}
              </div>
            );
          case 'table':
            return (
              <div key={idx} className="overflow-x-auto my-2 rounded border border-[rgb(var(--color-border-base))]">
                <table className="w-full text-left text-xs border-collapse">
                  <tbody>
                    {block.rows?.map((row, rowIdx) => (
                      <tr
                        key={rowIdx}
                        className={
                          rowIdx === 0
                            ? 'bg-[rgb(var(--color-surface-muted))] font-semibold border-b border-[rgb(var(--color-border-base))]'
                            : 'border-b border-[rgb(var(--color-border-base))]/40 hover:bg-[rgb(var(--color-surface-hover))]/30'
                        }
                      >
                        {row.map((cell, cellIdx) => (
                          <td key={cellIdx} className="p-2 border-r last:border-r-0 border-[rgb(var(--color-border-base))]/40">
                            {renderInline(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case 'hr':
            return <hr key={idx} className="my-3 border-[rgb(var(--color-border-base))]" />;
          case 'p':
          default:
            return (
              <p key={idx} className="text-[rgb(var(--color-text-base))] leading-relaxed">
                {renderInline(block.text || '')}
              </p>
            );
        }
      })}
    </div>
  );
};

export const QuickView: React.FC<QuickViewProps> = ({
  item,
  path,
  allItems,
  onClose,
  onOpenFile,
  onNavigateToItem,
  isDocked = false,
  onToggleDock,
  vfsService,
}) => {
  const [viewMode, setViewMode] = useState<'preview' | 'source'>('preview');
  const [copied, setCopied] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [imageFit, setImageFit] = useState<'contain' | 'cover' | 'actual'>('contain');
  const [imgNaturalDimensions, setImgNaturalDimensions] = useState<{ width: number; height: number } | null>(null);
  const [isWordWrap, setIsWordWrap] = useState(true);
  const [codeFilter, setCodeFilter] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  // Focus trap and keyboard navigation inside Quick View
  const containerRef = useRef<HTMLDivElement>(null);

  // File metadata and categorization
  const meta = useMemo(() => getFileMetadata(item, item.type === 'folder'), [item]);
  const ext = useMemo(() => {
    if (!item.name.includes('.')) return '';
    return item.name.split('.').pop()!.toLowerCase();
  }, [item.name]);

  const isMarkdown = ['md', 'markdown', 'mdx'].includes(ext);
  const isImage = meta.category === 'image' || ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico'].includes(ext);
  const isAudio = meta.category === 'audio' || ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(ext);
  const isVideo = meta.category === 'video' || ['mp4', 'webm', 'ogg', 'mov'].includes(ext);
  const isJson = ext === 'json';
  const isSvg = ext === 'svg';
  const isCodeOrText = item.type === 'file' && !isImage && !isAudio && !isVideo;
  const isFolder = item.type === 'folder';

  // Item indexing in current folder for prev/next cycling
  const currentIndex = allItems.findIndex((it) => it.name === item.name);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < allItems.length - 1;

  const handlePrev = () => {
    if (hasPrev && onNavigateToItem) {
      onNavigateToItem(allItems[currentIndex - 1]);
      SoundService.playFileSelect();
    }
  };

  const handleNext = () => {
    if (hasNext && onNavigateToItem) {
      onNavigateToItem(allItems[currentIndex + 1]);
      SoundService.playFileSelect();
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in a search/filter input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        if (e.key === 'Escape') {
          target.blur();
        }
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        SoundService.playFileSelect();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        if (hasPrev) {
          e.preventDefault();
          handlePrev();
        }
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        if (hasNext) {
          e.preventDefault();
          handleNext();
        }
      } else if (e.key === 'e' || e.key === 'E') {
        if (onOpenFile && item.type === 'file') {
          e.preventDefault();
          onOpenFile(item, path);
          onClose();
        }
      } else if (e.key === ' ' || e.key === 'Spacebar') {
        // Spacebar toggles or closes Quick View
        e.preventDefault();
        onClose();
        SoundService.playFileSelect();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasPrev, hasNext, currentIndex, allItems, item, path, onOpenFile, onClose]);

  // Image source resolution
  const imageSource = useMemo(() => {
    if (!isImage) return '';
    if (item.content && (item.content.startsWith('http') || item.content.startsWith('data:image') || item.content.startsWith('blob:'))) {
      return item.content;
    }
    if (isSvg && item.content && item.content.includes('<svg')) {
      return `data:image/svg+xml;utf8,${encodeURIComponent(item.content)}`;
    }
    // High quality fallback placeholder
    return `https://picsum.photos/seed/${encodeURIComponent(item.name)}/800/600`;
  }, [item, isImage, isSvg]);

  // Folder sub-tree statistics
  const folderStats = useMemo<SubtreeStats | null>(() => {
    if (!isFolder || !vfsService) return null;
    return vfsService.calculateSubtreeSize([...path, item.name]);
  }, [item, path, isFolder, vfsService]);

  // Code / Text lines with filtering
  const contentString = item.content || '';
  const lines = useMemo(() => contentString.split('\n'), [contentString]);

  const filteredLines = useMemo(() => {
    if (!codeFilter.trim()) {
      return lines.map((text, idx) => ({ text, lineNum: idx + 1 }));
    }
    const q = codeFilter.toLowerCase();
    return lines
      .map((text, idx) => ({ text, lineNum: idx + 1 }))
      .filter((l) => l.text.toLowerCase().includes(q));
  }, [lines, codeFilter]);

  // Word count and read time metrics
  const wordCount = useMemo(() => {
    return contentString.trim().split(/\s+/).filter(Boolean).length;
  }, [contentString]);

  const readTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

  const handleCopyContent = () => {
    navigator.clipboard.writeText(contentString);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div
      ref={containerRef}
      id="quick-view-pane"
      className={`flex flex-col bg-[rgb(var(--color-surface-dialog))] text-[rgb(var(--color-text-base))] transition-all duration-200 overflow-hidden select-text ${
        isDocked
          ? 'h-72 border-t border-[rgb(var(--color-border-base))] shadow-inner'
          : `absolute z-40 rounded-xl border border-[rgb(var(--color-border-base))] shadow-2xl backdrop-blur-md animate-fade-in ${
              isExpanded
                ? 'inset-1.5 md:inset-3'
                : 'inset-x-3 bottom-3 top-10 sm:top-14 md:inset-x-8 md:bottom-6 md:top-16 max-w-5xl mx-auto'
            }`
      }`}
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[rgb(var(--color-border-base))] bg-[rgb(var(--color-surface-muted))]/80 select-none flex-shrink-0 gap-2">
        {/* Left: File Identity */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="flex-shrink-0">
            <FileIcon nodeOrName={item} isFolder={isFolder} size="sm" showBadge={false} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-xs text-[rgb(var(--color-text-base))] truncate" title={item.name}>
                {item.name}
              </span>
              <span
                className={`text-[9px] px-1.5 py-0.2 rounded-full font-medium flex-shrink-0 ${meta.badgeColor} border ${meta.borderColor}`}
              >
                {meta.label}
              </span>
              {item.tags && item.tags.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap">
                  {item.tags.map((t) => (
                    <TagBadge key={t} tag={t} size="xs" />
                  ))}
                </div>
              )}
            </div>
            <p className="text-[10px] text-[rgb(var(--color-text-muted))] truncate">
              {item.type === 'file'
                ? formatFileSize(item.size || contentString.length, { detailed: true })
                : folderStats
                ? `${formatFileSize(folderStats.size, { detailed: true })} • ${folderStats.fileCount} files`
                : 'Folder'}
              {item.modified ? ` • ${new Date(item.modified).toLocaleDateString()}` : ''}
            </p>
          </div>
        </div>

        {/* Center: File Carousel Navigation */}
        {allItems.length > 1 && (
          <div className="hidden sm:flex items-center gap-1 bg-[rgb(var(--color-surface-base))] px-1.5 py-0.5 rounded-lg border border-[rgb(var(--color-border-base))] text-[11px] shadow-2xs">
            <button
              onClick={handlePrev}
              disabled={!hasPrev}
              className={`p-1 rounded hover:bg-[rgb(var(--color-surface-hover))] transition-colors ${
                !hasPrev ? 'opacity-30 cursor-not-allowed' : 'text-[rgb(var(--color-text-base))] cursor-pointer'
              }`}
              title="Previous file in folder (Left Arrow)"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] text-[rgb(var(--color-text-muted))] px-1 font-mono tabular-nums select-none">
              {currentIndex + 1} / {allItems.length}
            </span>
            <button
              onClick={handleNext}
              disabled={!hasNext}
              className={`p-1 rounded hover:bg-[rgb(var(--color-surface-hover))] transition-colors ${
                !hasNext ? 'opacity-30 cursor-not-allowed' : 'text-[rgb(var(--color-text-base))] cursor-pointer'
              }`}
              title="Next file in folder (Right Arrow)"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Right: Quick View Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Markdown: Rendered vs Raw Source Tabs */}
          {isMarkdown && (
            <div className="flex items-center rounded-lg bg-[rgb(var(--color-surface-base))] p-0.5 border border-[rgb(var(--color-border-base))] mr-1">
              <button
                onClick={() => setViewMode('preview')}
                className={`px-2 py-0.5 text-[10px] rounded font-medium transition-colors cursor-pointer ${
                  viewMode === 'preview'
                    ? 'bg-[rgb(var(--color-accent-bg))] text-[rgb(var(--color-accent-text))] font-semibold shadow-2xs'
                    : 'text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text-base))]'
                }`}
              >
                Rendered
              </button>
              <button
                onClick={() => setViewMode('source')}
                className={`px-2 py-0.5 text-[10px] rounded font-medium transition-colors cursor-pointer ${
                  viewMode === 'source'
                    ? 'bg-[rgb(var(--color-accent-bg))] text-[rgb(var(--color-accent-text))] font-semibold shadow-2xs'
                    : 'text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text-base))]'
                }`}
              >
                Raw Source
              </button>
            </div>
          )}

          {/* Copy content button */}
          {item.type === 'file' && (
            <button
              onClick={handleCopyContent}
              className="p-1.5 rounded hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text-base))] transition-colors cursor-pointer"
              title="Copy file content to clipboard"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          )}

          {/* Open in full editor button */}
          {item.type === 'file' && onOpenFile && (
            <button
              onClick={() => {
                onOpenFile(item, path);
                onClose();
              }}
              className="flex items-center gap-1 px-2 py-1 rounded bg-[rgb(var(--color-accent-bg))] hover:bg-[rgb(var(--color-accent-bg))]/80 text-[rgb(var(--color-accent-text))] border border-[rgb(var(--color-accent-border))] text-[11px] font-medium transition-colors cursor-pointer shadow-2xs"
              title="Open full editor window (E)"
            >
              <Edit3 className="w-3 h-3" />
              <span className="hidden sm:inline">Open Editor</span>
              <kbd className="hidden md:inline-block ml-0.5 text-[8px] font-mono px-1 py-0.2 rounded bg-black/10 dark:bg-white/10">
                E
              </kbd>
            </button>
          )}

          {/* Dock / Float Toggle */}
          {onToggleDock && (
            <button
              onClick={onToggleDock}
              className="p-1.5 rounded hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text-base))] transition-colors cursor-pointer"
              title={isDocked ? 'Undock to floating Quick Look' : 'Dock preview to bottom'}
            >
              <Columns className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Maximize Toggle (if overlay) */}
          {!isDocked && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 rounded hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text-base))] transition-colors cursor-pointer"
              title={isExpanded ? 'Restore window size' : 'Expand window'}
            >
              {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          )}

          {/* Close button */}
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-red-500/15 text-[rgb(var(--color-text-muted))] hover:text-red-500 transition-colors cursor-pointer ml-0.5"
            title="Close Quick View (Esc or Space)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-3 bg-[rgb(var(--color-surface-base))] relative">
        {/* A. MARKDOWN PREVIEW */}
        {isMarkdown && viewMode === 'preview' && (
          <div className="max-w-3xl mx-auto py-1 px-2">
            {contentString.trim() ? (
              <MarkdownRenderer content={contentString} />
            ) : (
              <div className="py-12 text-center text-[rgb(var(--color-text-subtle))]">
                <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="font-medium text-xs">Empty Markdown Document</p>
                <p className="text-[11px] mt-1">Click "Open Editor" to add content.</p>
              </div>
            )}
          </div>
        )}

        {/* B. IMAGE PREVIEW */}
        {isImage && (
          <div className="h-full flex flex-col items-center justify-center relative min-h-[160px]">
            {/* Image Toolbar */}
            <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-[rgb(var(--color-surface-dialog))]/90 backdrop-blur-sm p-1 rounded-lg border border-[rgb(var(--color-border-base))] shadow-sm select-none">
              <button
                onClick={() => setZoomLevel((z) => Math.max(z - 25, 25))}
                className="p-1 rounded hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text-base))]"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] font-mono font-medium px-1 text-[rgb(var(--color-text-base))] min-w-[36px] text-center">
                {zoomLevel}%
              </span>
              <button
                onClick={() => setZoomLevel((z) => Math.min(z + 25, 300))}
                className="p-1 rounded hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text-base))]"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <div className="w-px h-3.5 bg-[rgb(var(--color-border-base))] mx-0.5" />
              <button
                onClick={() => {
                  setZoomLevel(100);
                  setImageFit('contain');
                }}
                className="p-1 rounded hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text-base))]"
                title="Reset Zoom"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>

            {/* Stage Container with checkerboard background for PNG/SVG */}
            <div
              className="w-full h-full flex items-center justify-center overflow-auto p-4 rounded-lg"
              style={{
                backgroundImage:
                  'radial-gradient(rgba(128, 128, 128, 0.15) 1px, transparent 1px), radial-gradient(rgba(128, 128, 128, 0.15) 1px, transparent 1px)',
                backgroundSize: '16px 16px',
                backgroundPosition: '0 0, 8px 8px',
              }}
            >
              <img
                src={imageSource}
                alt={item.name}
                onLoad={(e) => {
                  const target = e.currentTarget;
                  setImgNaturalDimensions({
                    width: target.naturalWidth,
                    height: target.naturalHeight,
                  });
                }}
                style={{
                  transform: `scale(${zoomLevel / 100})`,
                  transformOrigin: 'center center',
                  transition: 'transform 0.15s ease-out',
                }}
                className="max-h-full max-w-full object-contain rounded shadow-sm drop-shadow-md select-none"
                referrerPolicy="no-referrer"
              />
            </div>

            {/* Bottom Image Stats */}
            {imgNaturalDimensions && (
              <div className="absolute bottom-2 left-2 z-10 px-2.5 py-1 rounded bg-[rgb(var(--color-surface-dialog))]/90 backdrop-blur-sm border border-[rgb(var(--color-border-base))] text-[10px] text-[rgb(var(--color-text-muted))] flex items-center gap-2 shadow-2xs font-mono">
                <span className="font-semibold text-[rgb(var(--color-text-base))]">
                  {imgNaturalDimensions.width} × {imgNaturalDimensions.height} px
                </span>
                <span>•</span>
                <span>{((imgNaturalDimensions.width * imgNaturalDimensions.height) / 1000000).toFixed(1)} MP</span>
                <span>•</span>
                <span className="uppercase">{ext || 'IMG'}</span>
              </div>
            )}
          </div>
        )}

        {/* C. CODE / TEXT / RAW SOURCE PREVIEW */}
        {(isCodeOrText || (isMarkdown && viewMode === 'source')) && (
          <div className="h-full flex flex-col font-mono text-xs">
            {/* Filter and wrap toolbar */}
            {lines.length > 5 && (
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-[rgb(var(--color-border-base))] gap-2 select-none">
                <div className="relative flex-1 max-w-xs flex items-center">
                  <Search className="w-3 h-3 absolute left-2 text-[rgb(var(--color-text-subtle))]" />
                  <input
                    type="text"
                    placeholder="Filter lines in preview..."
                    value={codeFilter}
                    onChange={(e) => setCodeFilter(e.target.value)}
                    className="w-full pl-6 pr-2 py-1 rounded bg-[rgb(var(--color-surface-input))] border border-[rgb(var(--color-border-input))] text-[11px] text-[rgb(var(--color-text-base))] outline-none focus:ring-1 focus:ring-[rgb(var(--color-accent-text))]"
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

                <div className="flex items-center gap-2 text-[10px] text-[rgb(var(--color-text-muted))]">
                  <span>
                    {filteredLines.length} {filteredLines.length === 1 ? 'line' : 'lines'}
                  </span>
                  <button
                    onClick={() => setIsWordWrap(!isWordWrap)}
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                      isWordWrap
                        ? 'bg-[rgb(var(--color-accent-bg))] border-[rgb(var(--color-accent-border))] text-[rgb(var(--color-accent-text))] font-semibold'
                        : 'bg-[rgb(var(--color-surface-base))] border-[rgb(var(--color-border-base))] text-[rgb(var(--color-text-muted))]'
                    }`}
                    title="Toggle Word Wrap"
                  >
                    <WrapText className="w-3 h-3" />
                    <span>Wrap</span>
                  </button>
                </div>
              </div>
            )}

            {/* Code Lines Container */}
            <div className="flex-1 overflow-auto bg-[rgb(var(--color-surface-input))]/50 rounded-lg p-2 border border-[rgb(var(--color-border-base))]">
              {lines.length === 0 || (lines.length === 1 && lines[0] === '') ? (
                <div className="h-full flex flex-col items-center justify-center text-[rgb(var(--color-text-subtle))] p-6 text-center select-none">
                  <FileCode className="w-8 h-8 opacity-30 mb-2" />
                  <p>Empty File</p>
                  <p className="text-[10px] mt-1">Click "Open Editor" to add content.</p>
                </div>
              ) : (
                <table className="w-full border-collapse">
                  <tbody>
                    {filteredLines.map(({ text, lineNum }) => (
                      <tr key={lineNum} className="hover:bg-[rgb(var(--color-surface-hover))]/40 group">
                        <td className="py-0.5 pr-3 pl-1 text-right text-[rgb(var(--color-text-subtle))]/60 select-none w-8 text-[10px] align-top font-mono border-r border-[rgb(var(--color-border-base))]/40">
                          {lineNum}
                        </td>
                        <td
                          className={`py-0.5 pl-3 text-[rgb(var(--color-text-base))] leading-relaxed ${
                            isWordWrap ? 'whitespace-pre-wrap break-all' : 'whitespace-pre'
                          }`}
                        >
                          {highlightCodeLine(text, ext)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* D. AUDIO PREVIEW */}
        {isAudio && (
          <div className="h-full flex flex-col items-center justify-center gap-4 py-8 text-center select-none">
            <div className="w-16 h-16 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 shadow-inner">
              <Music className="w-8 h-8 animate-pulse" />
            </div>
            <div>
              <p className="font-semibold text-sm text-[rgb(var(--color-text-base))]">{item.name}</p>
              <p className="text-xs text-[rgb(var(--color-text-muted))] mt-0.5">
                {formatFileSize(item.size || 0, { detailed: true })}
              </p>
            </div>
            <audio controls className="w-full max-w-md rounded-lg shadow-sm" src={item.content || undefined}>
              Your browser does not support audio playback.
            </audio>
          </div>
        )}

        {/* E. VIDEO PREVIEW */}
        {isVideo && (
          <div className="h-full flex flex-col items-center justify-center p-2">
            <video
              controls
              className="max-h-full max-w-full rounded-lg shadow-lg border border-[rgb(var(--color-border-base))]"
              src={item.content || undefined}
            >
              Your browser does not support video playback.
            </video>
          </div>
        )}

        {/* F. FOLDER PREVIEW */}
        {isFolder && (
          <div className="h-full flex flex-col gap-3 p-2">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-[rgb(var(--color-surface-muted))]/60 border border-[rgb(var(--color-border-base))]">
              <div className="p-3 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <Folder className="w-8 h-8" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm text-[rgb(var(--color-text-base))] truncate">{item.name}</h3>
                <p className="text-xs text-[rgb(var(--color-text-muted))] mt-0.5">
                  {folderStats
                    ? `${formatFileSize(folderStats.size, { detailed: true })} across ${folderStats.fileCount} ${
                        folderStats.fileCount === 1 ? 'file' : 'files'
                      }${folderStats.folderCount > 0 ? ` and ${folderStats.folderCount} subfolders` : ''}`
                    : `${item.children?.length || 0} direct items`}
                </p>
              </div>
            </div>

            {/* Direct Children Listing */}
            <div className="flex-1 overflow-auto rounded-lg border border-[rgb(var(--color-border-base))]">
              <div className="px-3 py-1.5 bg-[rgb(var(--color-surface-muted))] border-b border-[rgb(var(--color-border-base))] text-[11px] font-semibold text-[rgb(var(--color-text-muted))]">
                Contained Items ({item.children?.length || 0})
              </div>
              {!item.children || item.children.length === 0 ? (
                <div className="p-6 text-center text-xs text-[rgb(var(--color-text-subtle))]">
                  Empty Directory
                </div>
              ) : (
                <div className="divide-y divide-[rgb(var(--color-border-base))]/40">
                  {item.children.map((child) => (
                    <div
                      key={child.name}
                      className="flex items-center justify-between px-3 py-1.5 hover:bg-[rgb(var(--color-surface-hover))]/40 text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <FileIcon nodeOrName={child} isFolder={child.type === 'folder'} size="xs" />
                        <span className="truncate text-[rgb(var(--color-text-base))]">{child.name}</span>
                      </div>
                      <span className="text-[10px] text-[rgb(var(--color-text-muted))] font-mono">
                        {child.type === 'file' ? formatFileSize(child.size || 0) : 'Folder'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer Bar */}
      <div className="px-3 py-1.5 border-t border-[rgb(var(--color-border-base))] bg-[rgb(var(--color-surface-muted))] flex items-center justify-between text-[10px] text-[rgb(var(--color-text-muted))] select-none flex-shrink-0">
        <div className="flex items-center gap-2 truncate">
          <span className="truncate">
            Path: /{path.join('/')}{path.length > 0 ? '/' : ''}{item.name}
          </span>
          {isMarkdown && (
            <span className="hidden sm:inline-block pl-2 border-l border-[rgb(var(--color-border-base))] text-[rgb(var(--color-text-subtle))]">
              {wordCount} words • ~{readTimeMinutes} min read
            </span>
          )}
          {isCodeOrText && (
            <span className="hidden sm:inline-block pl-2 border-l border-[rgb(var(--color-border-base))] text-[rgb(var(--color-text-subtle))]">
              {contentString.length} chars
            </span>
          )}
        </div>

        {/* Keyboard hints */}
        <div className="hidden sm:flex items-center gap-2 text-[9px] text-[rgb(var(--color-text-subtle))] font-mono">
          <span>[←/→] Prev/Next</span>
          <span>[Space/Esc] Close</span>
          {onOpenFile && item.type === 'file' && <span>[E] Edit</span>}
        </div>
      </div>
    </div>
  );
};
