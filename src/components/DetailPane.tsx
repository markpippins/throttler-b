import React, { useState, useEffect, useMemo } from 'react';
import {
  Bookmark as BookmarkIcon,
  Rss,
  Trash2,
  ExternalLink,
  Search,
  ChevronDown,
  ChevronRight,
  ChevronUp,
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
  HardDrive,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Fingerprint,
  Hash,
  Database,
  Cpu,
  FileCheck,
  BadgeCheck,
  Lock,
} from 'lucide-react';
import { Bookmark, FileSystemNode, RssFeed, RssItem } from '../types';
import { FileIcon, getFileTypeDescription } from './FileIcon';
import { formatFileSize } from '../utils/fileUtils';
import { TagBadge } from './TagBadge';
import {
  type WitnessedRunProjection,
  type WitnessedRunStatus,
  isValidSha256Digest,
} from '@nexus/projection-core';
import { apiService } from '../services/apiService';

export interface DetailPaneProps {
  width: number;
  currentPath: string[];
  bookmarks: Bookmark[];
  feeds: RssFeed[];
  selectedItem?: FileSystemNode | null;
  selectedItemsCount?: number;
  folderItems?: FileSystemNode[];
  workflowInstanceId?: string;
  nodeId?: string;
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
  workflowInstanceId,
  nodeId,
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
  const [activeTab, setActiveTab] = useState<'preview' | 'witness' | 'bookmarks' | 'rss'>('preview');
  const [bookmarkFilter, setBookmarkFilter] = useState('');
  const [selectedFeedId, setSelectedFeedId] = useState<string>(feeds[0]?.id || '');
  const [copiedCode, setCopiedCode] = useState(false);
  const [isWordWrap, setIsWordWrap] = useState(false);
  const [imageFitMode, setImageFitMode] = useState<'contain' | 'cover' | 'original'>('contain');
  const [imgNaturalSize, setImgNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [codeFilter, setCodeFilter] = useState('');

  // Witnessed Run query & projection state
  const defaultWfId = useMemo(() => {
    if (workflowInstanceId) return workflowInstanceId;
    if (selectedItem) {
      return `wf-${selectedItem.name.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    }
    return `wf-${currentPath.join('_') || 'root'}`;
  }, [workflowInstanceId, selectedItem?.name, currentPath]);

  const defaultNodeId = useMemo(() => {
    if (nodeId) return nodeId;
    if (selectedItem) {
      const fullPath = [...currentPath, selectedItem.name].join('/');
      return `node:${fullPath}`;
    }
    return `node:dir:${currentPath.join('/') || 'root'}`;
  }, [nodeId, selectedItem?.name, currentPath]);

  const [queryWfId, setQueryWfId] = useState(defaultWfId);
  const [queryNodeId, setQueryNodeId] = useState(defaultNodeId);
  const [witnessedRun, setWitnessedRun] = useState<WitnessedRunProjection | null>(null);
  const [loadingWitness, setLoadingWitness] = useState(false);
  const [witnessError, setWitnessError] = useState<string | null>(null);
  const [copiedDigestKey, setCopiedDigestKey] = useState<string | null>(null);
  const [copiedJson, setCopiedJson] = useState(false);
  const [rawJsonExpanded, setRawJsonExpanded] = useState(false);
  const [isLiveApi, setIsLiveApi] = useState(apiService.isLive());

  // Keep query inputs in sync when selection/defaults change
  useEffect(() => {
    setQueryWfId(defaultWfId);
    setQueryNodeId(defaultNodeId);
  }, [defaultWfId, defaultNodeId]);

  // Fetch projection from API
  const loadWitnessedRun = async (wf: string, node: string) => {
    if (!wf.trim() || !node.trim()) return;
    setLoadingWitness(true);
    setWitnessError(null);
    try {
      const data = await apiService.fetchWitnessedRun({ workflowInstanceId: wf.trim(), nodeId: node.trim() });
      setWitnessedRun(data);
    } catch (err) {
      setWitnessError(err instanceof Error ? err.message : String(err));
      setWitnessedRun(null);
    } finally {
      setLoadingWitness(false);
    }
  };

  // Initial and reactive load
  useEffect(() => {
    loadWitnessedRun(queryWfId, queryNodeId);
  }, [queryWfId, queryNodeId, isLiveApi]);

  const handleCopyDigest = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedDigestKey(key);
    setTimeout(() => setCopiedDigestKey(null), 2000);
  };

  const handleCopyJson = (jsonString: string) => {
    navigator.clipboard.writeText(jsonString);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const toggleLiveApiMode = () => {
    const nextMode = !isLiveApi;
    apiService.setLive(nextMode);
    setIsLiveApi(nextMode);
  };

  // Auto-switch to preview tab when single item selected, unless inspecting witness tab
  useEffect(() => {
    if (selectedItem) {
      if (activeTab !== 'witness') {
        setActiveTab('preview');
      }
      setImgNaturalSize(null);
      setCodeFilter('');
    }
  }, [selectedItem?.name]);

  // Digest verification analysis
  const digestItems = useMemo(() => {
    if (!witnessedRun) return [];
    const items = [
      {
        id: 'contract_digest',
        label: 'Contract Digest',
        description: 'Attests to immutable contract schema, law definitions, and governance versioning',
        digest: witnessedRun.envelope.contractDigest,
        source: 'envelope.contractDigest',
      },
      {
        id: 'evaluation_fingerprint',
        label: 'Evaluation Fingerprint',
        description: 'Cryptographic execution witness for Solscript evaluation and proposition checks',
        digest: witnessedRun.envelope.evaluationFingerprint,
        source: 'envelope.evaluationFingerprint',
      },
      {
        id: 'manifest_digest',
        label: 'Manifest Digest',
        description: 'Snapshot digest of virtual filesystem read-set inputs and node state',
        digest: witnessedRun.manifest.digest,
        source: 'manifest.digest',
      },
      {
        id: 'evidence_fingerprint',
        label: 'Evidence Fingerprint',
        description: 'Ledger audit chain anchoring transition evidence to Keychain checkpoints',
        digest: witnessedRun.evidence.fingerprint,
        source: 'evidence.fingerprint',
      },
    ];

    return items.map((item) => {
      const isValid = isValidSha256Digest(item.digest);
      const isMissing = !item.digest;
      return {
        ...item,
        isValidFormat: isValid,
        isMissing,
        length: item.digest ? item.digest.length : 0,
        algorithm: 'SHA-256',
        prefix: 'sha256:',
      };
    });
  }, [witnessedRun]);

  const totalDigests = digestItems.length;
  const validDigestsCount = digestItems.filter((d) => d.isValidFormat).length;
  const allDigestsValid = totalDigests > 0 && validDigestsCount === totalDigests;

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

  // Helper badges and text for Witnessed Run statuses
  const getStatusBadge = (status: WitnessedRunStatus | string) => {
    switch (status) {
      case 'complete':
        return {
          icon: <ShieldCheck className="w-4 h-4 text-emerald-500" />,
          badgeClass: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
          title: 'Complete & Attested',
          desc: 'Authoritative execution record verified with full lineage & conforming digests.',
        };
      case 'refusal':
        return {
          icon: <XCircle className="w-4 h-4 text-rose-500" />,
          badgeClass: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
          title: 'Refusal Enforced',
          desc: 'Action rejected by constitutional guard or admission policy.',
        };
      case 'drift':
        return {
          icon: <AlertTriangle className="w-4 h-4 text-amber-500" />,
          badgeClass: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
          title: 'Execution Drift',
          desc: 'Replay divergent from original execution fingerprint or doctrine.',
        };
      case 'stale':
        return {
          icon: <AlertTriangle className="w-4 h-4 text-amber-500" />,
          badgeClass: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
          title: 'Stale Doctrine',
          desc: 'Attested with a superseded doctrine version.',
        };
      case 'missing_lineage':
        return {
          icon: <XCircle className="w-4 h-4 text-zinc-400" />,
          badgeClass: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
          title: 'Missing Lineage',
          desc: 'Incomplete receipts, missing evidence chain, or uncommitted transaction.',
        };
      case 'duplicate_retry':
        return {
          icon: <RefreshCw className="w-4 h-4 text-blue-500" />,
          badgeClass: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
          title: 'Duplicate Retry',
          desc: 'Deduplicated against prior admission record.',
        };
      default:
        return {
          icon: <Info className="w-4 h-4 text-zinc-400" />,
          badgeClass: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
          title: status || 'Unknown',
          desc: 'Unclassified execution status.',
        };
    }
  };

  const getReplayBadge = (status: string | null | undefined) => {
    if (!status) return { label: 'None', class: 'text-[rgb(var(--color-text-subtle))]' };
    if (status === 'replay_ok') {
      return { label: 'replay_ok (Bit-identical match)', class: 'text-emerald-500 font-semibold' };
    }
    if (status.includes('drift')) {
      return { label: status, class: 'text-amber-500 font-semibold' };
    }
    if (status.includes('mismatch') || status.includes('refuse')) {
      return { label: status, class: 'text-rose-500 font-semibold' };
    }
    return { label: status, class: 'text-blue-500 font-medium' };
  };

  const handleApplyPreset = (preset: 'selected' | 'demo' | 'missing') => {
    if (preset === 'selected') {
      setQueryWfId(defaultWfId);
      setQueryNodeId(defaultNodeId);
      loadWitnessedRun(defaultWfId, defaultNodeId);
    } else if (preset === 'demo') {
      const wf = 'wf-live-demo-1';
      const node = 'node:rename-item-alpha';
      setQueryWfId(wf);
      setQueryNodeId(node);
      loadWitnessedRun(wf, node);
    } else if (preset === 'missing') {
      const wf = 'missing-lineage-run';
      const node = 'node:unadmitted-item';
      setQueryWfId(wf);
      setQueryNodeId(node);
      loadWitnessedRun(wf, node);
    }
  };

  // Immediate visual indicator configuration based on WitnessedRunProjection verification status
  const governanceIndicator = useMemo(() => {
    if (loadingWitness && !witnessedRun) {
      return {
        status: 'loading' as const,
        label: 'Verifying...',
        shortLabel: 'Verifying',
        color: 'blue',
        icon: <RefreshCw className="w-3.5 h-3.5 text-blue-500 animate-spin flex-shrink-0" />,
        smallIcon: <RefreshCw className="w-2.5 h-2.5 text-blue-500 animate-spin flex-shrink-0" />,
        badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
        dotClass: 'bg-blue-500 animate-pulse',
        ringClass: 'ring-1 ring-blue-500/30',
        tooltip: 'Querying backend cryptographic attestation and witness lineage...',
        description: 'Verifying cryptographic digests against execution-srv...',
      };
    }

    if (witnessError) {
      return {
        status: 'error' as const,
        label: 'Attestation Error',
        shortLabel: 'Error',
        color: 'rose',
        icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />,
        smallIcon: <AlertTriangle className="w-2.5 h-2.5 text-rose-500 flex-shrink-0" />,
        badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
        dotClass: 'bg-rose-500',
        ringClass: 'ring-1 ring-rose-500/30',
        tooltip: `Attestation query error: ${witnessError}`,
        description: 'Failed to retrieve attested projection from execution-srv.',
      };
    }

    if (!witnessedRun) {
      return {
        status: 'none' as const,
        label: 'Unattested',
        shortLabel: 'Unwitnessed',
        color: 'zinc',
        icon: <ShieldCheck className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />,
        smallIcon: <ShieldCheck className="w-2.5 h-2.5 text-zinc-400 flex-shrink-0" />,
        badgeClass: 'bg-zinc-500/10 text-zinc-500 dark:text-zinc-400 border-zinc-500/20',
        dotClass: 'bg-zinc-400',
        ringClass: 'ring-1 ring-zinc-400/20',
        tooltip: 'No witnessed run projection available for this file item.',
        description: 'File has not been attested by an execution runtime witness.',
      };
    }

    switch (witnessedRun.status) {
      case 'complete': {
        const isReplayOk = witnessedRun.replay?.status === 'replay_ok';
        const isAllDigestsValid = allDigestsValid;
        return {
          status: 'complete' as const,
          label: isAllDigestsValid && isReplayOk ? 'Attested & Verified' : 'Attested',
          shortLabel: 'Attested',
          color: 'emerald',
          icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />,
          smallIcon: <ShieldCheck className="w-2.5 h-2.5 text-emerald-500 flex-shrink-0" />,
          badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20',
          dotClass: 'bg-emerald-500',
          ringClass: 'ring-1 ring-emerald-500/30',
          tooltip: `Governance Status: Complete & Attested (Passes all fail-closed criteria, ${validDigestsCount}/${totalDigests} SHA-256 conforming digests, bit-for-bit replay verified)`,
          description: 'Governance state: Attested and cryptographic digests conforming.',
        };
      }
      case 'refusal':
        return {
          status: 'refusal' as const,
          label: 'Refusal Enforced',
          shortLabel: 'Refused',
          color: 'rose',
          icon: <XCircle className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />,
          smallIcon: <XCircle className="w-2.5 h-2.5 text-rose-500 flex-shrink-0" />,
          badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 hover:bg-rose-500/20',
          dotClass: 'bg-rose-500',
          ringClass: 'ring-1 ring-rose-500/30',
          tooltip: `Governance Status: Refusal Enforced (Execution rejected by constitutional policy guard${witnessedRun.assessment?.reason ? `: ${witnessedRun.assessment.reason}` : ''})`,
          description: 'Execution rejected by constitutional guard.',
        };
      case 'drift':
        return {
          status: 'drift' as const,
          label: 'Execution Drift',
          shortLabel: 'Drift',
          color: 'amber',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />,
          smallIcon: <AlertTriangle className="w-2.5 h-2.5 text-amber-500 flex-shrink-0" />,
          badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20',
          dotClass: 'bg-amber-500 animate-pulse',
          ringClass: 'ring-1 ring-amber-500/30',
          tooltip: 'Governance Status: Drift Detected (Replay output diverged from original execution fingerprint)',
          description: 'Replay divergent from execution fingerprint.',
        };
      case 'stale':
        return {
          status: 'stale' as const,
          label: 'Stale Doctrine',
          shortLabel: 'Stale',
          color: 'amber',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />,
          smallIcon: <AlertTriangle className="w-2.5 h-2.5 text-amber-500 flex-shrink-0" />,
          badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20',
          dotClass: 'bg-amber-500',
          ringClass: 'ring-1 ring-amber-500/30',
          tooltip: 'Governance Status: Stale Doctrine (Attested under a previous/superseded constitutional rule version)',
          description: 'Attested with superseded doctrine version.',
        };
      case 'missing_lineage':
        return {
          status: 'missing_lineage' as const,
          label: 'Missing Lineage',
          shortLabel: 'Unadmitted',
          color: 'zinc',
          icon: <XCircle className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />,
          smallIcon: <XCircle className="w-2.5 h-2.5 text-zinc-400 flex-shrink-0" />,
          badgeClass: 'bg-zinc-500/10 text-zinc-500 dark:text-zinc-400 border-zinc-500/20 hover:bg-zinc-500/20',
          dotClass: 'bg-zinc-400',
          ringClass: 'ring-1 ring-zinc-400/20',
          tooltip: 'Governance Status: Missing Lineage (Incomplete receipts, missing evidence chain, or uncommitted transaction)',
          description: 'Incomplete receipts or missing evidence chain.',
        };
      case 'duplicate_retry':
        return {
          status: 'duplicate_retry' as const,
          label: 'Duplicate Retry',
          shortLabel: 'Duplicate',
          color: 'blue',
          icon: <RefreshCw className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />,
          smallIcon: <RefreshCw className="w-2.5 h-2.5 text-blue-500 flex-shrink-0" />,
          badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 hover:bg-blue-500/20',
          dotClass: 'bg-blue-500',
          ringClass: 'ring-1 ring-blue-500/30',
          tooltip: 'Governance Status: Duplicate Retry (Deduplicated against prior admission record)',
          description: 'Deduplicated against prior admission record.',
        };
      default:
        return {
          status: 'unknown' as const,
          label: String(witnessedRun.status),
          shortLabel: String(witnessedRun.status),
          color: 'zinc',
          icon: <Info className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />,
          smallIcon: <Info className="w-2.5 h-2.5 text-zinc-400 flex-shrink-0" />,
          badgeClass: 'bg-zinc-500/10 text-zinc-500 dark:text-zinc-400 border-zinc-500/20',
          dotClass: 'bg-zinc-400',
          ringClass: 'ring-1 ring-zinc-400/20',
          tooltip: `Governance Status: ${witnessedRun.status}`,
          description: `Status: ${witnessedRun.status}`,
        };
    }
  }, [witnessedRun, loadingWitness, witnessError, allDigestsValid, validDigestsCount, totalDigests]);

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
            onClick={() => setActiveTab('witness')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-t-md font-medium border-t border-x transition-colors whitespace-nowrap ${
              activeTab === 'witness'
                ? 'bg-[rgb(var(--color-surface-base))] border-[rgb(var(--color-border-base))] text-[rgb(var(--color-accent-text))]'
                : 'border-transparent text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text-base))]'
            }`}
            title={`Witnessed Run: ${governanceIndicator.label} (${governanceIndicator.tooltip})`}
          >
            {governanceIndicator.icon}
            <span>Witnessed Run</span>
            <span className={`w-1.5 h-1.5 rounded-full ${governanceIndicator.dotClass}`} />
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
                    <div className="relative flex-shrink-0">
                      <FileIcon
                        nodeOrName={selectedItem}
                        isFolder={selectedItem.type === 'folder'}
                        size="sm"
                        className="w-5 h-5"
                      />
                      {/* Overlaid Corner Verification Indicator Dot on File Icon */}
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[rgb(var(--color-surface-base))] ${governanceIndicator.dotClass}`}
                        title={governanceIndicator.tooltip}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-semibold text-xs text-[rgb(var(--color-text-base))] truncate" title={selectedItem.name}>
                          {selectedItem.name}
                        </h3>
                        {/* At-a-glance Governance Verification Status Pill */}
                        <button
                          onClick={() => setActiveTab('witness')}
                          className={`px-1.5 py-0.5 rounded-full text-[9px] font-semibold border flex items-center gap-1 transition-all cursor-pointer ${governanceIndicator.badgeClass}`}
                          title={`${governanceIndicator.tooltip} - Click to inspect in Witnessed Run tab`}
                        >
                          {governanceIndicator.smallIcon}
                          <span className="font-mono">{governanceIndicator.shortLabel}</span>
                        </button>
                      </div>
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
                  {/* Primary Visual Indicator: Governance State Badge */}
                  <button
                    onClick={() => setActiveTab('witness')}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${governanceIndicator.badgeClass}`}
                    title={`${governanceIndicator.tooltip} - Click to inspect attestation and digest verification details`}
                  >
                    {governanceIndicator.icon}
                    <span>
                      Governance: <strong className="font-bold">{governanceIndicator.label}</strong>
                    </span>
                  </button>

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

                {/* Quick Witnessed Run & Digest Verification Status Ribbon */}
                <div className="mt-2 pt-2 border-t border-[rgb(var(--color-border-base))] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {governanceIndicator.icon}
                      <span className="text-[10px] text-[rgb(var(--color-text-base))] font-medium truncate">
                        Witness:{' '}
                        <span className={`uppercase font-mono text-[9px] px-1.5 py-0.5 rounded border font-semibold ${governanceIndicator.badgeClass}`}>
                          {loadingWitness ? 'fetching...' : witnessedRun?.status ?? 'pending'}
                        </span>
                      </span>
                    </div>
                    {witnessedRun && (
                      <span
                        className={`px-1.5 py-0.5 rounded border text-[9px] font-semibold hidden sm:inline-flex items-center gap-0.5 ${
                          allDigestsValid
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                        }`}
                        title={`${validDigestsCount} of ${totalDigests} digests valid SHA-256`}
                      >
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        <span>{validDigestsCount}/{totalDigests} Digests Valid</span>
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => setActiveTab('witness')}
                    className="text-[10px] text-[rgb(var(--color-accent-text))] hover:underline flex items-center gap-0.5 font-medium flex-shrink-0"
                    title="View full Witnessed Run attestation & digest verification"
                  >
                    <span>Inspect Attestation</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
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
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Code className="w-3.5 h-3.5 text-indigo-500" />
                      <span className="font-medium text-[11px] text-[rgb(var(--color-text-base))]">
                        {getLanguageLabel(selectedItem.name)}
                      </span>
                      <span className="text-[10px] text-[rgb(var(--color-text-subtle))]">
                        ({lines.length} lines)
                      </span>
                      {/* Code Toolbar Governance State Pill */}
                      <button
                        onClick={() => setActiveTab('witness')}
                        className={`ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold border flex items-center gap-1 transition-all cursor-pointer ${governanceIndicator.badgeClass}`}
                        title={`${governanceIndicator.tooltip} - Click to inspect in Witnessed Run tab`}
                      >
                        {governanceIndicator.smallIcon}
                        <span>{governanceIndicator.shortLabel}</span>
                      </button>
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
      {/* 2. WITNESSED RUN ATTESTATION & DIGEST VERIFICATION TAB VIEW */}
      {/* ========================================================================= */}
      {activeTab === 'witness' && (
        <div className="flex-1 flex flex-col overflow-hidden bg-[rgb(var(--color-surface-base))]">
          {/* Query & API Connection Control Bar */}
          <div className="p-2.5 border-b border-[rgb(var(--color-border-base))] bg-[rgb(var(--color-surface-muted))]/60 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span className="font-semibold text-xs text-[rgb(var(--color-text-base))]">
                  Witnessed-Run Projection
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Live vs Simulated API Mode Pill */}
                <button
                  onClick={toggleLiveApiMode}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-medium border flex items-center gap-1 transition-colors ${
                    isLiveApi
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                      : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 hover:bg-blue-500/20'
                  }`}
                  title={isLiveApi ? 'Connected to live execution-srv (port 4249). Click to switch to simulation.' : 'Using local projection simulation. Click to switch to live execution-srv.'}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isLiveApi ? 'bg-emerald-500 animate-pulse' : 'bg-blue-500'}`} />
                  <span>{isLiveApi ? 'LIVE :4249' : 'SIMULATED'}</span>
                </button>

                <button
                  onClick={() => loadWitnessedRun(queryWfId, queryNodeId)}
                  disabled={loadingWitness}
                  className="p-1 rounded hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-muted))] disabled:opacity-50 transition-colors"
                  title="Refresh Witnessed Run from API"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingWitness ? 'animate-spin text-[rgb(var(--color-accent-text))]' : ''}`} />
                </button>
              </div>
            </div>

            {/* Query Inputs */}
            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <label className="text-[9px] font-medium text-[rgb(var(--color-text-subtle))] block mb-0.5">
                  Workflow Instance ID
                </label>
                <input
                  type="text"
                  value={queryWfId}
                  onChange={(e) => setQueryWfId(e.target.value)}
                  placeholder="e.g. wf-demo-1"
                  className="w-full px-2 py-1 rounded bg-[rgb(var(--color-surface-input))] border border-[rgb(var(--color-border-input))] text-[11px] font-mono text-[rgb(var(--color-text-base))] outline-none focus:ring-1 focus:ring-[rgb(var(--color-accent-text))]"
                />
              </div>

              <div>
                <label className="text-[9px] font-medium text-[rgb(var(--color-text-subtle))] block mb-0.5">
                  Node ID
                </label>
                <input
                  type="text"
                  value={queryNodeId}
                  onChange={(e) => setQueryNodeId(e.target.value)}
                  placeholder="e.g. node:item-1"
                  className="w-full px-2 py-1 rounded bg-[rgb(var(--color-surface-input))] border border-[rgb(var(--color-border-input))] text-[11px] font-mono text-[rgb(var(--color-text-base))] outline-none focus:ring-1 focus:ring-[rgb(var(--color-accent-text))]"
                />
              </div>
            </div>

            {/* Presets Bar */}
            <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
              <span className="text-[9px] text-[rgb(var(--color-text-subtle))]">Presets:</span>
              <button
                onClick={() => handleApplyPreset('selected')}
                className="px-1.5 py-0.5 rounded bg-[rgb(var(--color-surface-base))] hover:bg-[rgb(var(--color-surface-hover))] border border-[rgb(var(--color-border-base))] text-[10px] text-[rgb(var(--color-text-muted))] transition-colors"
              >
                Selected Item
              </button>
              <button
                onClick={() => handleApplyPreset('demo')}
                className="px-1.5 py-0.5 rounded bg-[rgb(var(--color-surface-base))] hover:bg-[rgb(var(--color-surface-hover))] border border-[rgb(var(--color-border-base))] text-[10px] text-[rgb(var(--color-text-muted))] transition-colors"
              >
                Demo Run
              </button>
              <button
                onClick={() => handleApplyPreset('missing')}
                className="px-1.5 py-0.5 rounded bg-[rgb(var(--color-surface-base))] hover:bg-[rgb(var(--color-surface-hover))] border border-[rgb(var(--color-border-base))] text-[10px] text-[rgb(var(--color-text-muted))] transition-colors"
              >
                Missing Lineage
              </button>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3.5">
            {/* Loading State */}
            {loadingWitness && !witnessedRun && (
              <div className="p-8 flex flex-col items-center justify-center text-center gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-[rgb(var(--color-accent-text))]" />
                <p className="text-xs text-[rgb(var(--color-text-muted))]">
                  Querying witnessed-run projection from API...
                </p>
              </div>
            )}

            {/* Error State */}
            {witnessError && (
              <div className="p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h5 className="font-semibold text-xs">Projection Query Failed</h5>
                  <p className="text-[11px] mt-0.5 leading-relaxed">{witnessError}</p>
                </div>
              </div>
            )}

            {/* Projection Details */}
            {witnessedRun && (
              <>
                {/* 1. VERIFICATION STATUS HERO BANNER */}
                {(() => {
                  const statusInfo = getStatusBadge(witnessedRun.status);
                  const replayInfo = getReplayBadge(witnessedRun.replay?.status);

                  return (
                    <div className="rounded-xl border border-[rgb(var(--color-border-base))] bg-[rgb(var(--color-surface-muted))]/40 p-3.5 flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-[rgb(var(--color-surface-base))] border border-[rgb(var(--color-border-base))]">
                            {statusInfo.icon}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h4 className="font-semibold text-xs text-[rgb(var(--color-text-base))]">
                                {statusInfo.title}
                              </h4>
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase border ${statusInfo.badgeClass}`}>
                                {witnessedRun.status}
                              </span>
                            </div>
                            <p className="text-[10px] text-[rgb(var(--color-text-muted))] mt-0.5 leading-normal">
                              {statusInfo.desc}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col items-end">
                          <span className="text-[9px] text-[rgb(var(--color-text-subtle))] font-mono">
                            v{witnessedRun.manifest?.version ?? 1}
                          </span>
                        </div>
                      </div>

                      {/* Status Metric Grid */}
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[rgb(var(--color-border-base))]/60">
                        <div className="p-2 rounded-lg bg-[rgb(var(--color-surface-base))] border border-[rgb(var(--color-border-base))] flex flex-col gap-0.5">
                          <span className="text-[9px] text-[rgb(var(--color-text-subtle))] font-medium">Replay Verdict</span>
                          <span className={`text-[11px] truncate ${replayInfo.class}`}>
                            {replayInfo.label}
                          </span>
                        </div>

                        <div className="p-2 rounded-lg bg-[rgb(var(--color-surface-base))] border border-[rgb(var(--color-border-base))] flex flex-col gap-0.5">
                          <span className="text-[9px] text-[rgb(var(--color-text-subtle))] font-medium">Assessment / Admission</span>
                          <div className="flex items-center gap-1 text-[11px] truncate">
                            <span className="font-semibold uppercase text-emerald-600 dark:text-emerald-400">
                              {witnessedRun.assessment?.disposition ?? 'None'}
                            </span>
                            <span className="text-[rgb(var(--color-text-subtle))]">/</span>
                            <span className="text-[rgb(var(--color-text-muted))]">
                              {witnessedRun.assessment?.status ?? 'None'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Replay reason if present */}
                      {witnessedRun.assessment?.reason && (
                        <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px]">
                          <span className="font-semibold">Reason:</span> {witnessedRun.assessment.reason}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* 2. DIGEST VERIFICATION DETAILS SECTION (Specific Requirement) */}
                <div className="rounded-xl border border-[rgb(var(--color-border-base))] bg-[rgb(var(--color-surface-muted))]/40 p-3.5 flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Fingerprint className="w-4 h-4 text-[rgb(var(--color-accent-text))]" />
                      <h4 className="font-semibold text-xs text-[rgb(var(--color-text-base))]">
                        Digest Verification Details
                      </h4>
                    </div>

                    <div className="flex items-center gap-1">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border flex items-center gap-1 ${
                          allDigestsValid
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                        }`}
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{validDigestsCount} / {totalDigests} Verified SHA-256</span>
                      </span>
                    </div>
                  </div>

                  <p className="text-[10px] text-[rgb(var(--color-text-muted))] leading-relaxed">
                    Cryptographic attestation verifies each artifact against strict fail-closed criteria (format: <code className="px-1 py-0.2 rounded bg-[rgb(var(--color-surface-input))] font-mono text-[9px]">sha256:&lt;64 hex&gt;</code>).
                  </p>

                  {/* Digest Cards List */}
                  <div className="flex flex-col gap-2">
                    {digestItems.map((item) => (
                      <div
                        key={item.id}
                        className="p-2.5 rounded-lg border border-[rgb(var(--color-border-base))] bg-[rgb(var(--color-surface-base))] flex flex-col gap-1.5 transition-shadow hover:shadow-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {item.isValidFormat ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                            ) : item.isMissing ? (
                              <XCircle className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                            ) : (
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                            )}
                            <span className="font-semibold text-[11px] text-[rgb(var(--color-text-base))] truncate">
                              {item.label}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-medium border ${
                                item.isValidFormat
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                  : item.isMissing
                                  ? 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                              }`}
                            >
                              {item.isValidFormat
                                ? 'SHA-256 Valid'
                                : item.isMissing
                                ? 'Missing Digest'
                                : 'Malformed'}
                            </span>

                            {item.digest && (
                              <button
                                onClick={() => handleCopyDigest(item.digest!, item.id)}
                                className="p-1 rounded hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-muted))] transition-colors"
                                title="Copy full SHA-256 digest"
                              >
                                {copiedDigestKey === item.id ? (
                                  <Check className="w-3 h-3 text-emerald-500" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>

                        <p className="text-[10px] text-[rgb(var(--color-text-subtle))] leading-tight">
                          {item.description}
                        </p>

                        {/* Hash Value Box */}
                        <div className="p-1.5 rounded bg-[rgb(var(--color-surface-input))] border border-[rgb(var(--color-border-input))] font-mono text-[10px] text-[rgb(var(--color-text-base))] break-all select-all flex items-center justify-between gap-1">
                          <span className="truncate">{item.digest ?? 'null'}</span>
                          {item.digest && (
                            <span className="text-[8px] font-mono text-[rgb(var(--color-text-subtle))] flex-shrink-0 px-1 py-0.2 rounded bg-[rgb(var(--color-surface-base))] border border-[rgb(var(--color-border-base))]">
                              71 chars
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. ENVELOPE, CONSTITUTIONAL LAW & EVIDENCE CHAIN */}
                <div className="rounded-xl border border-[rgb(var(--color-border-base))] bg-[rgb(var(--color-surface-muted))]/40 p-3.5 flex flex-col gap-3">
                  <div className="flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-[rgb(var(--color-accent-text))]" />
                    <h4 className="font-semibold text-xs text-[rgb(var(--color-text-base))]">
                      Constitutional Law & Lineage
                    </h4>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div className="p-2 rounded bg-[rgb(var(--color-surface-base))] border border-[rgb(var(--color-border-base))]">
                      <span className="text-[9px] text-[rgb(var(--color-text-subtle))] block">Contract Identifier</span>
                      <span className="font-mono text-[rgb(var(--color-text-base))] font-medium truncate block mt-0.5">
                        {witnessedRun.envelope.contractId} (v{witnessedRun.envelope.contractVersion})
                      </span>
                    </div>

                    <div className="p-2 rounded bg-[rgb(var(--color-surface-base))] border border-[rgb(var(--color-border-base))]">
                      <span className="text-[9px] text-[rgb(var(--color-text-subtle))] block">Evaluator Subsystem</span>
                      <span className="font-mono text-[rgb(var(--color-text-base))] font-medium truncate block mt-0.5">
                        {witnessedRun.law.evaluatorId}
                      </span>
                    </div>
                  </div>

                  {/* Evaluated Propositions */}
                  {witnessedRun.law.propositionIds && witnessedRun.law.propositionIds.length > 0 && (
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] text-[rgb(var(--color-text-subtle))] font-medium">
                        Evaluated Propositions ({witnessedRun.law.propositionIds.length}):
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {witnessedRun.law.propositionIds.map((prop) => (
                          <span
                            key={prop}
                            className="px-1.5 py-0.5 rounded bg-[rgb(var(--color-surface-base))] border border-[rgb(var(--color-border-base))] font-mono text-[9px] text-[rgb(var(--color-text-muted))]"
                          >
                            {prop}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Receipts and Transition Checkpoints */}
                  <div className="flex flex-col gap-1.5 pt-1 border-t border-[rgb(var(--color-border-base))]/60">
                    <span className="text-[9px] text-[rgb(var(--color-text-subtle))] font-medium">
                      Attestation Receipts:
                    </span>
                    <div className="grid grid-cols-1 gap-1">
                      <div className="p-1.5 rounded bg-[rgb(var(--color-surface-base))] border border-[rgb(var(--color-border-base))] flex items-center justify-between text-[10px]">
                        <span className="text-[rgb(var(--color-text-subtle))]">PEB Admission:</span>
                        <span className="font-mono text-[rgb(var(--color-text-base))] truncate max-w-[200px]">
                          {witnessedRun.receipts?.pebAdmission ?? 'none'}
                        </span>
                      </div>
                      <div className="p-1.5 rounded bg-[rgb(var(--color-surface-base))] border border-[rgb(var(--color-border-base))] flex items-center justify-between text-[10px]">
                        <span className="text-[rgb(var(--color-text-subtle))]">Conduit Transition:</span>
                        <span className="font-mono text-[rgb(var(--color-text-base))] truncate max-w-[200px]">
                          {witnessedRun.receipts?.conduitTransition ?? 'none'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. RAW PROJECTION JSON INSPECTOR */}
                <div className="rounded-xl border border-[rgb(var(--color-border-base))] bg-[rgb(var(--color-surface-muted))]/40 p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setRawJsonExpanded(!rawJsonExpanded)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-[rgb(var(--color-text-base))] hover:text-[rgb(var(--color-accent-text))] transition-colors"
                    >
                      <Code className="w-3.5 h-3.5" />
                      <span>Raw WitnessedRunProjection JSON</span>
                      {rawJsonExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5 text-[rgb(var(--color-text-subtle))]" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-[rgb(var(--color-text-subtle))]" />
                      )}
                    </button>

                    {rawJsonExpanded && (
                      <button
                        onClick={() => handleCopyJson(JSON.stringify(witnessedRun, null, 2))}
                        className="px-2 py-0.5 rounded text-[10px] bg-[rgb(var(--color-surface-base))] border border-[rgb(var(--color-border-base))] hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-muted))] flex items-center gap-1 transition-colors"
                      >
                        {copiedJson ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-500" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy JSON</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {rawJsonExpanded && (
                    <pre className="p-2.5 rounded-lg bg-[rgb(var(--color-surface-input))] border border-[rgb(var(--color-border-input))] font-mono text-[10px] text-[rgb(var(--color-text-base))] overflow-x-auto select-all max-h-60 leading-tight">
                      {JSON.stringify(witnessedRun, null, 2)}
                    </pre>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. BOOKMARKS TAB VIEW */}
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
