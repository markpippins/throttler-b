import React from 'react';
import {
  Folder,
  FolderOpen,
  FolderCode,
  FolderArchive,
  FolderDown,
  FolderGit2,
  HardDrive,
  Server,
  File,
  FileText,
  FileCode,
  FileCode2,
  FileSpreadsheet,
  FileArchive,
  FileAudio,
  FileVideo,
  FileImage,
  FileJson,
  FileSliders,
  FileTerminal,
  FileCheck,
  Image as ImageIcon,
  Music,
  Video,
  Film,
  Archive,
  Package,
  Terminal,
  Database,
  Binary,
  Settings,
  Layers,
  Globe,
  Palette,
  BookOpen,
  Table,
  Cpu,
  Lock,
  Type,
  Braces,
  Sparkles,
  Download,
  Briefcase,
} from 'lucide-react';
import { FileSystemNode } from '../types';

export type FileIconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface FileTypeMeta {
  extension: string;
  label: string;
  category:
    | 'folder'
    | 'code'
    | 'image'
    | 'video'
    | 'audio'
    | 'document'
    | 'spreadsheet'
    | 'presentation'
    | 'archive'
    | 'data'
    | 'database'
    | 'script'
    | 'executable'
    | 'font'
    | 'config'
    | 'magnet'
    | 'other';
  color: string; // Tailwind text color
  bgColor: string; // Background tint
  borderColor: string; // Border color
  badgeColor: string; // Pill / badge text & bg
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
}

/**
 * Extract high-fidelity file/folder metadata based on name and node properties
 */
export function getFileMetadata(
  nodeOrName: FileSystemNode | string,
  isFolder: boolean = false,
  isOpen: boolean = false
): FileTypeMeta {
  const isNode = typeof nodeOrName === 'object' && nodeOrName !== null;
  const node = isNode ? (nodeOrName as FileSystemNode) : null;
  const rawName = isNode ? node!.name : (nodeOrName as string);
  const name = rawName.trim();
  const lowerName = name.toLowerCase();
  const isDir = isNode ? node!.type === 'folder' : isFolder;

  // 1. Special Node Flags
  if (node?.isServerRoot) {
    return {
      extension: '',
      label: 'SERVER',
      category: 'folder',
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/30',
      badgeColor: 'bg-emerald-500 text-white',
      icon: Server,
    };
  }

  if (node?.isMagnet) {
    return {
      extension: 'MAGNET',
      label: 'MAGNET',
      category: 'magnet',
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/30',
      badgeColor: 'bg-purple-500 text-white',
      icon: Layers,
    };
  }

  // 2. Folder Handlers with High-Fidelity Categories
  if (isDir) {
    if (lowerName === 'pictures' || lowerName === 'images' || lowerName === 'photos') {
      return {
        extension: '',
        label: 'IMAGES',
        category: 'folder',
        color: 'text-teal-500',
        bgColor: 'bg-teal-500/10',
        borderColor: 'border-teal-500/30',
        badgeColor: 'bg-teal-500 text-white',
        icon: isOpen ? FolderOpen : Folder,
      };
    }

    if (
      lowerName === 'dev' ||
      lowerName === 'source' ||
      lowerName === 'src' ||
      lowerName === 'repo' ||
      lowerName === 'code' ||
      lowerName === 'projects' ||
      lowerName === 'throttler'
    ) {
      return {
        extension: '',
        label: 'CODE',
        category: 'folder',
        color: 'text-indigo-500',
        bgColor: 'bg-indigo-500/10',
        borderColor: 'border-indigo-500/30',
        badgeColor: 'bg-indigo-500 text-white',
        icon: isOpen ? FolderOpen : FolderCode,
      };
    }

    if (lowerName === 'documents' || lowerName === 'docs' || lowerName === 'papers') {
      return {
        extension: '',
        label: 'DOCS',
        category: 'folder',
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/30',
        badgeColor: 'bg-blue-500 text-white',
        icon: isOpen ? FolderOpen : Folder,
      };
    }

    if (lowerName === 'music' || lowerName === 'audio' || lowerName === 'sounds') {
      return {
        extension: '',
        label: 'AUDIO',
        category: 'folder',
        color: 'text-fuchsia-500',
        bgColor: 'bg-fuchsia-500/10',
        borderColor: 'border-fuchsia-500/30',
        badgeColor: 'bg-fuchsia-500 text-white',
        icon: isOpen ? FolderOpen : Folder,
      };
    }

    if (lowerName === 'videos' || lowerName === 'movies' || lowerName === 'clips') {
      return {
        extension: '',
        label: 'VIDEO',
        category: 'folder',
        color: 'text-rose-500',
        bgColor: 'bg-rose-500/10',
        borderColor: 'border-rose-500/30',
        badgeColor: 'bg-rose-500 text-white',
        icon: isOpen ? FolderOpen : Folder,
      };
    }

    if (lowerName === 'downloads') {
      return {
        extension: '',
        label: 'DOWNLOADS',
        category: 'folder',
        color: 'text-cyan-500',
        bgColor: 'bg-cyan-500/10',
        borderColor: 'border-cyan-500/30',
        badgeColor: 'bg-cyan-500 text-white',
        icon: isOpen ? FolderOpen : FolderDown,
      };
    }

    if (lowerName === 'work' || lowerName === 'office' || lowerName === 'business') {
      return {
        extension: '',
        label: 'WORK',
        category: 'folder',
        color: 'text-amber-500',
        bgColor: 'bg-amber-500/10',
        borderColor: 'border-amber-500/30',
        badgeColor: 'bg-amber-500 text-white',
        icon: isOpen ? FolderOpen : Folder,
      };
    }

    if (lowerName === '.git' || lowerName === 'git') {
      return {
        extension: '',
        label: 'GIT',
        category: 'folder',
        color: 'text-orange-500',
        bgColor: 'bg-orange-500/10',
        borderColor: 'border-orange-500/30',
        badgeColor: 'bg-orange-500 text-white',
        icon: FolderGit2,
      };
    }

    if (lowerName === 'archives' || lowerName === 'zips' || lowerName === 'backups') {
      return {
        extension: '',
        label: 'ARCHIVE',
        category: 'folder',
        color: 'text-amber-600',
        bgColor: 'bg-amber-600/10',
        borderColor: 'border-amber-600/30',
        badgeColor: 'bg-amber-600 text-white',
        icon: isOpen ? FolderOpen : FolderArchive,
      };
    }

    // Default Folder
    return {
      extension: '',
      label: 'DIR',
      category: 'folder',
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/30',
      badgeColor: 'bg-amber-500 text-white',
      icon: isOpen ? FolderOpen : Folder,
    };
  }

  // 3. File Extensions Analysis
  const dotIdx = lowerName.lastIndexOf('.');
  const ext = dotIdx !== -1 ? lowerName.substring(dotIdx + 1) : '';

  // TypeScript / TSX
  if (ext === 'ts' || ext === 'tsx' || ext === 'mts' || ext === 'cts') {
    return {
      extension: ext.toUpperCase(),
      label: ext === 'tsx' ? 'TSX' : 'TS',
      category: 'code',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30',
      badgeColor: 'bg-[#3178c6] text-white',
      icon: FileCode2,
    };
  }

  // JavaScript / JSX
  if (ext === 'js' || ext === 'jsx' || ext === 'mjs' || ext === 'cjs') {
    return {
      extension: ext.toUpperCase(),
      label: ext === 'jsx' ? 'JSX' : 'JS',
      category: 'code',
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/30',
      badgeColor: 'bg-[#f7df1e] text-black font-bold',
      icon: FileCode,
    };
  }

  // Markdown & Documentation
  if (ext === 'md' || ext === 'markdown' || ext === 'mdx') {
    return {
      extension: ext.toUpperCase(),
      label: 'MD',
      category: 'document',
      color: 'text-sky-500',
      bgColor: 'bg-sky-500/10',
      borderColor: 'border-sky-500/30',
      badgeColor: 'bg-sky-500 text-white',
      icon: BookOpen,
    };
  }

  // JSON & JSONC
  if (ext === 'json' || ext === 'json5' || ext === 'jsonc') {
    return {
      extension: 'JSON',
      label: 'JSON',
      category: 'data',
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/30',
      badgeColor: 'bg-amber-500 text-white',
      icon: FileJson,
    };
  }

  // HTML / Web Markup
  if (ext === 'html' || ext === 'htm' || ext === 'xhtml') {
    return {
      extension: 'HTML',
      label: 'HTML',
      category: 'code',
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/30',
      badgeColor: 'bg-[#e34c26] text-white',
      icon: Globe,
    };
  }

  // CSS / SCSS / SASS / LESS
  if (ext === 'css' || ext === 'scss' || ext === 'sass' || ext === 'less' || ext === 'postcss') {
    return {
      extension: ext.toUpperCase(),
      label: ext.toUpperCase(),
      category: 'code',
      color: 'text-cyan-500',
      bgColor: 'bg-cyan-500/10',
      borderColor: 'border-cyan-500/30',
      badgeColor: 'bg-[#2965f1] text-white',
      icon: Palette,
    };
  }

  // Raster Images
  if (
    ext === 'png' ||
    ext === 'jpg' ||
    ext === 'jpeg' ||
    ext === 'gif' ||
    ext === 'webp' ||
    ext === 'bmp' ||
    ext === 'ico' ||
    ext === 'tiff' ||
    ext === 'avif'
  ) {
    return {
      extension: ext.toUpperCase(),
      label: ext.toUpperCase(),
      category: 'image',
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/30',
      badgeColor: 'bg-emerald-600 text-white',
      icon: ImageIcon,
    };
  }

  // SVG Vector Image
  if (ext === 'svg') {
    return {
      extension: 'SVG',
      label: 'SVG',
      category: 'image',
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/30',
      badgeColor: 'bg-purple-600 text-white',
      icon: Palette,
    };
  }

  // PDF Document
  if (ext === 'pdf') {
    return {
      extension: 'PDF',
      label: 'PDF',
      category: 'document',
      color: 'text-rose-500',
      bgColor: 'bg-rose-500/10',
      borderColor: 'border-rose-500/30',
      badgeColor: 'bg-[#ef4444] text-white font-bold',
      icon: FileCheck,
    };
  }

  // Word & Documents
  if (ext === 'doc' || ext === 'docx' || ext === 'odt' || ext === 'rtf') {
    return {
      extension: ext.toUpperCase(),
      label: 'DOC',
      category: 'document',
      color: 'text-blue-600',
      bgColor: 'bg-blue-600/10',
      borderColor: 'border-blue-600/30',
      badgeColor: 'bg-[#2563eb] text-white',
      icon: FileText,
    };
  }

  // Spreadsheets (Excel, CSV)
  if (ext === 'xls' || ext === 'xlsx' || ext === 'csv' || ext === 'tsv' || ext === 'ods') {
    return {
      extension: ext.toUpperCase(),
      label: ext === 'csv' ? 'CSV' : 'XLS',
      category: 'spreadsheet',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-600/10',
      borderColor: 'border-emerald-600/30',
      badgeColor: 'bg-[#16a34a] text-white',
      icon: FileSpreadsheet,
    };
  }

  // Presentations (PowerPoint, Keynote)
  if (ext === 'ppt' || ext === 'pptx' || ext === 'odp' || ext === 'key') {
    return {
      extension: ext.toUpperCase(),
      label: 'PPT',
      category: 'presentation',
      color: 'text-orange-600',
      bgColor: 'bg-orange-600/10',
      borderColor: 'border-orange-600/30',
      badgeColor: 'bg-[#ea580c] text-white',
      icon: FileText,
    };
  }

  // Audio / Sound
  if (ext === 'mp3' || ext === 'wav' || ext === 'ogg' || ext === 'flac' || ext === 'aac' || ext === 'm4a' || ext === 'wma') {
    return {
      extension: ext.toUpperCase(),
      label: 'AUDIO',
      category: 'audio',
      color: 'text-violet-500',
      bgColor: 'bg-violet-500/10',
      borderColor: 'border-violet-500/30',
      badgeColor: 'bg-violet-600 text-white',
      icon: Music,
    };
  }

  // Video / Film
  if (ext === 'mp4' || ext === 'webm' || ext === 'mkv' || ext === 'avi' || ext === 'mov' || ext === 'wmv' || ext === 'flv') {
    return {
      extension: ext.toUpperCase(),
      label: 'VIDEO',
      category: 'video',
      color: 'text-rose-500',
      bgColor: 'bg-rose-500/10',
      borderColor: 'border-rose-500/30',
      badgeColor: 'bg-rose-600 text-white',
      icon: Video,
    };
  }

  // Archives / Compressed packages
  if (ext === 'zip' || ext === 'tar' || ext === 'gz' || ext === '7z' || ext === 'rar' || ext === 'bz2' || ext === 'xz' || ext === 'tgz') {
    return {
      extension: ext.toUpperCase(),
      label: 'ZIP',
      category: 'archive',
      color: 'text-amber-600',
      bgColor: 'bg-amber-600/10',
      borderColor: 'border-amber-600/30',
      badgeColor: 'bg-amber-600 text-white',
      icon: Archive,
    };
  }

  // Python
  if (ext === 'py' || ext === 'ipynb' || ext === 'pyw') {
    return {
      extension: 'PY',
      label: 'PYTHON',
      category: 'code',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30',
      badgeColor: 'bg-[#3776ab] text-white',
      icon: FileCode,
    };
  }

  // Rust
  if (ext === 'rs') {
    return {
      extension: 'RS',
      label: 'RUST',
      category: 'code',
      color: 'text-orange-600',
      bgColor: 'bg-orange-600/10',
      borderColor: 'border-orange-600/30',
      badgeColor: 'bg-[#ea580c] text-white',
      icon: Cpu,
    };
  }

  // Go
  if (ext === 'go') {
    return {
      extension: 'GO',
      label: 'GO',
      category: 'code',
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-600/10',
      borderColor: 'border-cyan-600/30',
      badgeColor: 'bg-[#00add8] text-white',
      icon: FileCode2,
    };
  }

  // Java / Kotlin
  if (ext === 'java' || ext === 'jar' || ext === 'kt' || ext === 'kts') {
    return {
      extension: ext.toUpperCase(),
      label: ext.startsWith('kt') ? 'KT' : 'JAVA',
      category: 'code',
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/30',
      badgeColor: 'bg-[#e11d48] text-white',
      icon: FileCode,
    };
  }

  // C / C++ / C#
  if (ext === 'c' || ext === 'cpp' || ext === 'h' || ext === 'hpp' || ext === 'cs' || ext === 'cc') {
    return {
      extension: ext.toUpperCase(),
      label: ext.toUpperCase(),
      category: 'code',
      color: 'text-indigo-500',
      bgColor: 'bg-indigo-500/10',
      borderColor: 'border-indigo-500/30',
      badgeColor: 'bg-indigo-600 text-white',
      icon: FileCode,
    };
  }

  // Shell / Scripting
  if (ext === 'sh' || ext === 'bash' || ext === 'zsh' || ext === 'fish' || ext === 'bat' || ext === 'cmd' || ext === 'ps1') {
    return {
      extension: ext.toUpperCase(),
      label: 'SH',
      category: 'script',
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/30',
      badgeColor: 'bg-emerald-600 text-white',
      icon: Terminal,
    };
  }

  // Database / SQL
  if (ext === 'sql' || ext === 'db' || ext === 'sqlite' || ext === 'sqlite3' || ext === 'prisma') {
    return {
      extension: 'SQL',
      label: 'SQL',
      category: 'database',
      color: 'text-teal-600',
      bgColor: 'bg-teal-600/10',
      borderColor: 'border-teal-600/30',
      badgeColor: 'bg-[#0d9488] text-white',
      icon: Database,
    };
  }

  // YAML & Config
  if (
    ext === 'yaml' ||
    ext === 'yml' ||
    ext === 'toml' ||
    ext === 'ini' ||
    lowerName.startsWith('.env') ||
    ext === 'conf' ||
    ext === 'config'
  ) {
    return {
      extension: ext ? ext.toUpperCase() : 'ENV',
      label: 'CONF',
      category: 'config',
      color: 'text-slate-500',
      bgColor: 'bg-slate-500/10',
      borderColor: 'border-slate-500/30',
      badgeColor: 'bg-slate-600 text-white',
      icon: FileSliders,
    };
  }

  // Git specific files
  if (lowerName === '.gitignore' || lowerName === '.gitattributes' || lowerName === '.gitmodules') {
    return {
      extension: 'GIT',
      label: 'GIT',
      category: 'config',
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/30',
      badgeColor: 'bg-orange-600 text-white',
      icon: FolderGit2,
    };
  }

  // Docker
  if (lowerName === 'dockerfile' || lowerName.startsWith('docker-compose') || lowerName === '.dockerignore') {
    return {
      extension: 'DOCKER',
      label: 'DOCKER',
      category: 'config',
      color: 'text-sky-500',
      bgColor: 'bg-sky-500/10',
      borderColor: 'border-sky-500/30',
      badgeColor: 'bg-[#0284c7] text-white',
      icon: Server,
    };
  }

  // Lockfiles
  if (lowerName.endsWith('.lock') || lowerName === 'package-lock.json') {
    return {
      extension: 'LOCK',
      label: 'LOCK',
      category: 'config',
      color: 'text-slate-400',
      bgColor: 'bg-slate-400/10',
      borderColor: 'border-slate-400/30',
      badgeColor: 'bg-slate-500 text-white',
      icon: Lock,
    };
  }

  // Fonts
  if (ext === 'ttf' || ext === 'otf' || ext === 'woff' || ext === 'woff2' || ext === 'eot') {
    return {
      extension: ext.toUpperCase(),
      label: 'FONT',
      category: 'font',
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/30',
      badgeColor: 'bg-purple-500 text-white',
      icon: Type,
    };
  }

  // Executables / Binaries
  if (ext === 'exe' || ext === 'dmg' || ext === 'bin' || ext === 'iso' || ext === 'deb' || ext === 'rpm' || ext === 'apk') {
    return {
      extension: ext.toUpperCase(),
      label: 'BIN',
      category: 'executable',
      color: 'text-neutral-500',
      bgColor: 'bg-neutral-500/10',
      borderColor: 'border-neutral-500/30',
      badgeColor: 'bg-neutral-600 text-white',
      icon: Binary,
    };
  }

  // Plain Text & Log
  if (ext === 'txt' || ext === 'log' || ext === 'nfo' || ext === 'text') {
    return {
      extension: 'TXT',
      label: 'TXT',
      category: 'document',
      color: 'text-slate-400',
      bgColor: 'bg-slate-400/10',
      borderColor: 'border-slate-400/30',
      badgeColor: 'bg-slate-500 text-white',
      icon: FileText,
    };
  }

  // Default File
  return {
    extension: ext ? ext.toUpperCase() : 'FILE',
    label: ext ? ext.toUpperCase() : 'FILE',
    category: 'other',
    color: 'text-slate-400',
    bgColor: 'bg-slate-400/10',
    borderColor: 'border-slate-400/30',
    badgeColor: 'bg-slate-500 text-white',
    icon: File,
  };
}

export interface FileIconProps {
  nodeOrName: FileSystemNode | string;
  isFolder?: boolean;
  isOpen?: boolean;
  size?: FileIconSize;
  showBadge?: boolean;
  className?: string;
}

export const FileIcon: React.FC<FileIconProps> = ({
  nodeOrName,
  isFolder = false,
  isOpen = false,
  size = 'md',
  showBadge = true,
  className = '',
}) => {
  const meta = getFileMetadata(nodeOrName, isFolder, isOpen);
  const IconComponent = meta.icon;

  // 1. Extra Small Icon (e.g. tree view, compact dropdowns)
  if (size === 'xs') {
    return (
      <span className={`inline-flex items-center justify-center flex-shrink-0 ${className}`}>
        <IconComponent className={`w-3.5 h-3.5 ${meta.color}`} />
      </span>
    );
  }

  // 2. Small Icon (e.g. detailed list table, tile views, breadcrumbs)
  if (size === 'sm') {
    return (
      <span className={`relative inline-flex items-center justify-center flex-shrink-0 ${className}`}>
        <span
          className={`w-6 h-6 rounded-md flex items-center justify-center ${meta.bgColor} border ${meta.borderColor}`}
        >
          <IconComponent className={`w-3.5 h-3.5 ${meta.color}`} />
        </span>
      </span>
    );
  }

  // 3. Medium Icon (e.g. standard grid view)
  if (size === 'md') {
    return (
      <div className={`relative inline-flex flex-col items-center justify-center flex-shrink-0 ${className}`}>
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center ${meta.bgColor} border ${meta.borderColor} shadow-sm group-hover:scale-105 transition-transform duration-150`}
        >
          <IconComponent className={`w-6 h-6 ${meta.color}`} />
        </div>
        {showBadge && meta.category !== 'folder' && meta.label && (
          <span
            className={`absolute -bottom-1 -right-1 px-1 py-0.2 rounded text-[8px] font-bold uppercase tracking-wider ${meta.badgeColor} shadow-xs border border-white/20`}
          >
            {meta.label.slice(0, 4)}
          </span>
        )}
      </div>
    );
  }

  // 4. Large Icon (e.g. large icons view)
  if (size === 'lg') {
    return (
      <div className={`relative inline-flex flex-col items-center justify-center flex-shrink-0 ${className}`}>
        <div
          className={`w-16 h-16 rounded-2xl flex items-center justify-center ${meta.bgColor} border ${meta.borderColor} shadow-md group-hover:scale-105 transition-transform duration-150 relative overflow-hidden`}
        >
          {/* Subtle top glare / gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/15 to-transparent pointer-events-none" />
          <IconComponent className={`w-8 h-8 ${meta.color}`} />
        </div>
        {showBadge && meta.category !== 'folder' && meta.label && (
          <span
            className={`absolute -bottom-1.5 -right-1.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider ${meta.badgeColor} shadow-sm border border-white/30`}
          >
            {meta.label.slice(0, 5)}
          </span>
        )}
      </div>
    );
  }

  // 5. Extra Large Icon (e.g. detail pane, hero preview)
  return (
    <div className={`relative inline-flex flex-col items-center justify-center flex-shrink-0 ${className}`}>
      <div
        className={`w-20 h-20 rounded-2xl flex items-center justify-center ${meta.bgColor} border ${meta.borderColor} shadow-lg relative overflow-hidden`}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
        <IconComponent className={`w-10 h-10 ${meta.color}`} />
      </div>
      {showBadge && meta.category !== 'folder' && meta.label && (
        <span
          className={`absolute -bottom-2 -right-2 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider ${meta.badgeColor} shadow-md border border-white/40`}
        >
          {meta.label.slice(0, 5)}
        </span>
      )}
    </div>
  );
};

export function getFileTypeDescription(nodeOrName: FileSystemNode | string): string {
  const meta = getFileMetadata(nodeOrName);
  if (meta.category === 'folder') {
    return 'File folder';
  }
  if (meta.category === 'magnet') {
    return 'Distributed Magnet link';
  }
  if (meta.extension) {
    switch (meta.extension) {
      case 'TS':
      case 'TSX':
        return 'TypeScript Source';
      case 'JS':
      case 'JSX':
        return 'JavaScript Source';
      case 'MD':
        return 'Markdown Document';
      case 'JSON':
        return 'JSON Data';
      case 'HTML':
        return 'HTML Document';
      case 'CSS':
      case 'SCSS':
      case 'LESS':
        return 'Cascading Style Sheet';
      case 'PNG':
      case 'JPG':
      case 'JPEG':
      case 'GIF':
      case 'WEBP':
        return `${meta.extension} Image`;
      case 'SVG':
        return 'Scalable Vector Graphic';
      case 'PDF':
        return 'PDF Document';
      case 'DOC':
      case 'DOCX':
        return 'Word Document';
      case 'XLS':
      case 'XLSX':
      case 'CSV':
        return 'Spreadsheet Data';
      case 'PPT':
      case 'PPTX':
        return 'Presentation';
      case 'ZIP':
      case 'TAR':
      case 'GZ':
      case '7Z':
      case 'RAR':
        return 'Compressed Archive';
      case 'MP3':
      case 'WAV':
      case 'FLAC':
        return 'Audio File';
      case 'MP4':
      case 'WEBM':
      case 'MKV':
        return 'Video File';
      case 'PY':
        return 'Python Source';
      case 'RS':
        return 'Rust Source';
      case 'GO':
        return 'Go Source';
      case 'JAVA':
      case 'KT':
        return 'Java/Kotlin Source';
      case 'C':
      case 'CPP':
      case 'CS':
        return 'C/C++ Source';
      case 'SH':
      case 'BASH':
      case 'ZSH':
        return 'Shell Script';
      case 'SQL':
      case 'DB':
        return 'Database Script';
      case 'YAML':
      case 'YML':
      case 'ENV':
        return 'Configuration File';
      default:
        return `${meta.extension} File`;
    }
  }
  return 'File';
}
