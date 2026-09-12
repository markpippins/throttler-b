export type FileType = 'folder' | 'file';

export interface FileSystemNode {
  name: string;
  type: FileType;
  children?: FileSystemNode[];
  content?: string;
  modified?: string;
  childrenLoaded?: boolean;
  isServerRoot?: boolean;
  profileId?: string;
  connected?: boolean;
  isMagnet?: boolean;
  magnetFile?: string;
  isShortcut?: boolean;
  size?: number;
  tags?: string[];
  isTrash?: boolean;
  originalPath?: string[];
  deletedAt?: string;
}

export interface SearchResultNode extends FileSystemNode {
  path: string[];
}

export interface SubtreeStats {
  size: number;
  fileCount: number;
  folderCount: number;
}

export type BookmarkType = 'web' | 'image' | 'youtube' | 'academic' | 'gemini';

export interface Bookmark {
  _id: string;
  _creationTime: number;
  path: string; // The full path string, e.g., "Local Session/Documents"
  type: BookmarkType;
  title: string;
  link: string;
  snippet?: string;
  thumbnailUrl?: string;
  source: string;
  authors?: string[];
  publication?: string;
  channelTitle?: string;
}

export type NewBookmark = Omit<Bookmark, '_id' | '_creationTime' | 'path'>;

export interface ServerProfile {
  id: string;
  name: string;
  brokerUrl: string;
  imageUrl: string;
  searchUrl?: string;
  autoConnect?: boolean;
}

export interface FolderProperties {
  path: string;
  displayName?: string;
  imageName?: string;
}

export interface Note {
  path: string;
  content: string;
}

export interface RssFeed {
  id: string;
  name: string;
  url: string;
}

export interface RssItem {
  title: string;
  source: string;
  date: string;
  snippet: string;
  link: string;
}

export type SortKey = 'name' | 'modified' | 'size' | 'type' | 'originalPath';
export type SortDirection = 'asc' | 'desc';

export interface SortRule {
  key: SortKey;
  direction: SortDirection;
}

export interface SortCriteria {
  key: SortKey;
  direction: SortDirection;
  secondary?: SortRule[];
}

export type DisplayMode = 'grid' | 'list' | 'largeIcons' | 'smallIcons' | 'tiles';

export type FileGroupCategory = 'Folders' | 'Documents' | 'Images' | 'Other';

export interface FileTransferObject {
  type: 'fs-transfer';
  sourcePaneId?: number;
  sourcePath: string[];
  sourcePathString: string;
  itemNames: string[];
  filePaths: string[][];
  pathStrings: string[];
  itemsMeta: Array<{
    name: string;
    type: 'file' | 'folder';
    size?: number;
  }>;
  count: number;
  timestamp: number;
}

export interface ToastMessage {
  id: string;
  text: string;
  type: 'info' | 'success' | 'error' | 'warning';
  duration?: number;
}

export interface FileOperationProgress {
  id: string;
  operation: 'move' | 'copy' | 'upload' | 'delete';
  sourcePath?: string[];
  destPath?: string[];
  totalItems: number;
  completedItems: number;
  currentItemName: string;
  percentage: number;
  status: 'running' | 'completed' | 'cancelled';
  speedText?: string;
  totalBytes?: number;
  processedBytes?: number;
}

