import { FileSystemNode, FileGroupCategory } from '../types';
import {
  Folder,
  FileText,
  Image as ImageIcon,
  Boxes,
  LucideIcon,
} from 'lucide-react';

export const FILE_GROUP_ORDER: FileGroupCategory[] = [
  'Folders',
  'Documents',
  'Images',
  'Other',
];

export interface CategoryMeta {
  category: FileGroupCategory;
  label: string;
  icon: LucideIcon;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  description: string;
}

export const CATEGORY_META: Record<FileGroupCategory, CategoryMeta> = {
  Folders: {
    category: 'Folders',
    label: 'Folders',
    icon: Folder,
    colorClass: 'text-amber-500',
    bgClass: 'bg-amber-500/10',
    borderClass: 'border-amber-500/30',
    description: 'Folders and directories',
  },
  Documents: {
    category: 'Documents',
    label: 'Documents',
    icon: FileText,
    colorClass: 'text-blue-500',
    bgClass: 'bg-blue-500/10',
    borderClass: 'border-blue-500/30',
    description: 'Office documents, PDFs, text, and code files',
  },
  Images: {
    category: 'Images',
    label: 'Images',
    icon: ImageIcon,
    colorClass: 'text-emerald-500',
    bgClass: 'bg-emerald-500/10',
    borderClass: 'border-emerald-500/30',
    description: 'Photos, raster images, and vector illustrations',
  },
  Other: {
    category: 'Other',
    label: 'Other',
    icon: Boxes,
    colorClass: 'text-purple-500',
    bgClass: 'bg-purple-500/10',
    borderClass: 'border-purple-500/30',
    description: 'Archives, audio, video, and miscellaneous files',
  },
};

const IMAGE_EXTENSIONS = new Set([
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'bmp',
  'ico',
  'svg',
  'tiff',
  'tif',
  'avif',
  'heic',
  'heif',
  'raw',
  'cr2',
  'nef',
]);

const DOCUMENT_EXTENSIONS = new Set([
  // Documents & text
  'doc',
  'docx',
  'pdf',
  'txt',
  'rtf',
  'odt',
  'pages',
  'md',
  'markdown',
  'mdx',
  'tex',
  'epub',
  'mobi',
  'log',
  // Spreadsheets & Tables
  'xls',
  'xlsx',
  'csv',
  'tsv',
  'ods',
  'numbers',
  // Presentations
  'ppt',
  'pptx',
  'odp',
  'key',
  // Structured data & config
  'json',
  'json5',
  'jsonc',
  'xml',
  'yaml',
  'yml',
  'toml',
  'ini',
  'conf',
  'cfg',
  // Code & Markup
  'html',
  'htm',
  'xhtml',
  'css',
  'scss',
  'sass',
  'less',
  'js',
  'jsx',
  'ts',
  'tsx',
  'mjs',
  'cjs',
  'py',
  'ipynb',
  'java',
  'kt',
  'kts',
  'c',
  'cpp',
  'h',
  'hpp',
  'cs',
  'go',
  'rs',
  'php',
  'rb',
  'sh',
  'bash',
  'zsh',
  'sql',
]);

export function getFileGroupCategory(item: FileSystemNode): FileGroupCategory {
  if (item.type === 'folder') {
    return 'Folders';
  }

  const ext = item.name.includes('.') ? item.name.split('.').pop()!.toLowerCase() : '';

  if (IMAGE_EXTENSIONS.has(ext)) {
    return 'Images';
  }

  if (DOCUMENT_EXTENSIONS.has(ext)) {
    return 'Documents';
  }

  return 'Other';
}

export interface GroupedItemsSection {
  category: FileGroupCategory;
  meta: CategoryMeta;
  items: Array<{
    item: FileSystemNode;
    globalIndex: number;
  }>;
}

export function groupItemsByType(
  items: FileSystemNode[],
  hideEmpty: boolean = true
): GroupedItemsSection[] {
  const groups: Record<FileGroupCategory, Array<{ item: FileSystemNode; globalIndex: number }>> = {
    Folders: [],
    Documents: [],
    Images: [],
    Other: [],
  };

  items.forEach((item, index) => {
    const cat = getFileGroupCategory(item);
    groups[cat].push({ item, globalIndex: index });
  });

  return FILE_GROUP_ORDER.map((category) => ({
    category,
    meta: CATEGORY_META[category],
    items: groups[category],
  })).filter((group) => (hideEmpty ? group.items.length > 0 : true));
}
