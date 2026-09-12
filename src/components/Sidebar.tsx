import React, { useState } from 'react';
import { FolderTree, MessageSquare, StickyNote, HardDrive, ExternalLink, Sparkles } from 'lucide-react';
import { FolderTreeView } from './FolderTreeView';
import { ChatTab } from './ChatTab';
import { NotesTab } from './NotesTab';
import { FileSystemNode } from '../types';

interface SidebarProps {
  width: number;
  rootNode: FileSystemNode;
  currentPath: string[];
  starredPaths?: string[][];
  onToggleStarPath?: (path: string[]) => void;
  onNavigate: (path: string[]) => void;
  onRefresh: () => void;
  onCreateFolder: (path: string[], name: string) => void;
  onCreateFile: (path: string[], name: string) => void;
  onRename: (path: string[], oldName: string, newName: string) => void;
  onDelete: (path: string[], name: string) => void;
  onDropOnNode: (destPath: string[], e: React.DragEvent) => void;
  onShowProperties: (path: string[], node: FileSystemNode) => void;
  onOpenFullEditor: (content: string, title: string, path: string[]) => void;
  onOpenFloatingChat?: () => void;
  onResizeStart: (e: React.MouseEvent) => void;
  onEmptyTrash?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  width,
  rootNode,
  currentPath,
  starredPaths = [],
  onToggleStarPath,
  onNavigate,
  onRefresh,
  onCreateFolder,
  onCreateFile,
  onRename,
  onDelete,
  onDropOnNode,
  onShowProperties,
  onOpenFullEditor,
  onOpenFloatingChat,
  onResizeStart,
  onEmptyTrash,
}) => {
  const [activeTab, setActiveTab] = useState<'tree' | 'chat' | 'notes'>('tree');

  return (
    <div
      style={{ width: `${width}px` }}
      className="relative flex flex-col h-full bg-[rgb(var(--color-surface-base))] border-r border-[rgb(var(--color-border-base))] select-none flex-shrink-0 z-10"
    >
      {/* Sidebar Header Tabs */}
      <div className="flex items-center justify-between border-b border-[rgb(var(--color-border-base))] bg-[rgb(var(--color-surface-muted))] px-1 pt-1 gap-1">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('tree')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-t-md font-medium border-t border-x transition-colors ${
              activeTab === 'tree'
                ? 'bg-[rgb(var(--color-surface-base))] border-[rgb(var(--color-border-base))] text-[rgb(var(--color-accent-text))]'
                : 'border-transparent text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text-base))]'
            }`}
          >
            <FolderTree className="w-3.5 h-3.5" />
            <span>Explorer</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('chat');
              if (onOpenFloatingChat) onOpenFloatingChat();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-t-md font-medium border-t border-x transition-colors ${
              activeTab === 'chat'
                ? 'bg-[rgb(var(--color-surface-base))] border-[rgb(var(--color-border-base))] text-[rgb(var(--color-accent-text))]'
                : 'border-transparent text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text-base))]'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>AI Chat</span>
          </button>

          <button
            onClick={() => setActiveTab('notes')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-t-md font-medium border-t border-x transition-colors ${
              activeTab === 'notes'
                ? 'bg-[rgb(var(--color-surface-base))] border-[rgb(var(--color-border-base))] text-[rgb(var(--color-accent-text))]'
                : 'border-transparent text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text-base))]'
            }`}
          >
            <StickyNote className="w-3.5 h-3.5" />
            <span>Notes</span>
          </button>
        </div>

        {onOpenFloatingChat && (
          <button
            onClick={onOpenFloatingChat}
            title="Open Floating AI Chat Window"
            className="p-1 mb-1 mr-1 text-[rgb(var(--color-text-subtle))] hover:text-purple-400 hover:bg-[rgb(var(--color-surface-hover))] rounded transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'tree' && (
          <FolderTreeView
            rootNode={rootNode}
            currentPath={currentPath}
            starredPaths={starredPaths}
            onToggleStarPath={onToggleStarPath}
            onNavigate={onNavigate}
            onRefresh={onRefresh}
            onCreateFolder={onCreateFolder}
            onCreateFile={onCreateFile}
            onRename={onRename}
            onDelete={onDelete}
            onDropOnNode={onDropOnNode}
            onShowProperties={onShowProperties}
            onEmptyTrash={onEmptyTrash}
          />
        )}

        {activeTab === 'chat' && (
          <div className="flex flex-col h-full">
            {onOpenFloatingChat && (
              <div className="px-3 py-1.5 bg-purple-500/10 border-b border-purple-500/20 flex items-center justify-between text-[11px] text-purple-400">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Floating window available
                </span>
                <button
                  onClick={onOpenFloatingChat}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-600 text-white text-[10px] font-medium hover:bg-purple-500 transition-colors"
                >
                  <ExternalLink className="w-2.5 h-2.5" /> Pop Out
                </button>
              </div>
            )}
            <div className="flex-1 overflow-hidden">
              <ChatTab />
            </div>
          </div>
        )}

        {activeTab === 'notes' && (
          <NotesTab
            currentPath={currentPath}
            onOpenFullEditor={onOpenFullEditor}
          />
        )}
      </div>

      {/* Drag Resize Handle */}
      <div
        onMouseDown={onResizeStart}
        className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-[rgb(var(--color-accent-text))] transition-colors z-20"
      />
    </div>
  );
};
