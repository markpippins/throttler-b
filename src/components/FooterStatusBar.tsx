import React, { useState } from 'react';
import {
  FileOperationProgress,
  FileSystemNode,
  DisplayMode,
} from '../types';
import {
  ArrowRightLeft,
  Copy,
  UploadCloud,
  Trash2,
  CheckCircle2,
  XCircle,
  X,
  Terminal,
  Sparkles,
  LayoutGrid,
  List,
  Columns,
  HardDrive,
  Info,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { SoundService } from '../services/soundService';
import { formatBytes } from '../utils/fileUtils';

interface FooterStatusBarProps {
  currentPath: string[];
  activePane: 1 | 2;
  isDualPane: boolean;
  items: FileSystemNode[];
  selectedItemNames: Set<string>;
  progress: FileOperationProgress | null;
  onCancelProgress?: () => void;
  onDismissProgress?: () => void;
  showTerminal: boolean;
  onToggleTerminal: () => void;
  showIdeaStream: boolean;
  onToggleIdeaStream: () => void;
  showDetailPane: boolean;
  onToggleDetailPane: () => void;
  showAIChat?: boolean;
  onToggleAIChat?: () => void;
  displayMode: DisplayMode;
  onChangeDisplayMode?: (mode: DisplayMode) => void;
}

export const FooterStatusBar: React.FC<FooterStatusBarProps> = ({
  currentPath,
  activePane,
  isDualPane,
  items,
  selectedItemNames,
  progress,
  onCancelProgress,
  onDismissProgress,
  showTerminal,
  onToggleTerminal,
  showIdeaStream,
  onToggleIdeaStream,
  showDetailPane,
  onToggleDetailPane,
  showAIChat,
  onToggleAIChat,
  displayMode,
  onChangeDisplayMode,
}) => {
  const totalItemsCount = items.length;
  const folderCount = items.filter((i) => i.type === 'folder').length;
  const fileCount = items.filter((i) => i.type === 'file').length;
  const totalFolderSize = items.reduce((acc, curr) => acc + (curr.size || 0), 0);

  const selectedItems = items.filter((i) => selectedItemNames.has(i.name));
  const selectedCount = selectedItems.length;
  const selectedSize = selectedItems.reduce((acc, curr) => acc + (curr.size || 0), 0);

  const [soundEnabled, setSoundEnabled] = useState(() => SoundService.isEnabled());

  const handleToggleSound = () => {
    const next = !soundEnabled;
    SoundService.setEnabled(next);
    setSoundEnabled(next);
    if (next) {
      SoundService.playMarqueeComplete(1);
    }
  };

  const pathStr = '/' + currentPath.join('/');

  return (
    <footer
      id="app-footer-statusbar"
      className="h-9 border-t border-[rgb(var(--color-border-base))] bg-[rgb(var(--color-surface-muted))]/80 backdrop-blur px-3 flex items-center justify-between text-xs text-[rgb(var(--color-text-subtle))] select-none flex-shrink-0 z-30 transition-colors"
    >
      {/* Left: Directory & Selection Statistics (or Progress when active) */}
      <div className="flex items-center gap-3 min-w-0 flex-shrink truncate">
        {/* Active Pane Indicator */}
        <div className="flex items-center gap-1.5 flex-shrink-0 font-medium text-[rgb(var(--color-text-base))]">
          <HardDrive className="w-3.5 h-3.5 text-blue-500" />
          <span className="hidden sm:inline text-[11px] opacity-80">
            {isDualPane ? `Pane ${activePane}:` : 'Location:'}
          </span>
          <span className="font-mono text-[11px] truncate max-w-[140px] md:max-w-[220px]" title={pathStr}>
            {pathStr}
          </span>
        </div>

        <div className="h-3 w-px bg-[rgb(var(--color-border-base))] flex-shrink-0" />

        {/* Directory Item Counts */}
        <div className="hidden sm:flex items-center gap-2 flex-shrink-0 text-[11px]">
          <span>
            {totalItemsCount} {totalItemsCount === 1 ? 'item' : 'items'}
          </span>
          {folderCount > 0 && <span className="opacity-70">({folderCount} folders, {fileCount} files)</span>}
          {totalFolderSize > 0 && (
            <>
              <span className="opacity-40">•</span>
              <span className="font-mono">{formatBytes(totalFolderSize)}</span>
            </>
          )}
        </div>

        {/* Selected Items info */}
        {selectedCount > 0 && (
          <>
            <div className="h-3 w-px bg-[rgb(var(--color-border-base))] flex-shrink-0" />
            <div className="flex items-center gap-1.5 text-blue-500 font-medium text-[11px] flex-shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              <span>
                {selectedCount} selected {selectedSize > 0 ? `(${formatBytes(selectedSize)})` : ''}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Center: Prominent Visual Progress Bar for File Operations */}
      {progress && (
        <div
          id="footer-file-progress-container"
          className="flex-1 max-w-xl mx-4 flex items-center gap-3 bg-[rgb(var(--color-surface-base))] border border-[rgb(var(--color-border-base))] rounded-lg px-3 py-1 shadow-md animate-in fade-in slide-in-from-bottom-2 duration-200"
        >
          {/* Operation Icon */}
          <div className="flex-shrink-0">
            {progress.status === 'completed' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 animate-bounce" />
            ) : progress.status === 'cancelled' ? (
              <XCircle className="w-4 h-4 text-rose-500" />
            ) : progress.operation === 'move' ? (
              <ArrowRightLeft className="w-4 h-4 text-blue-500 animate-spin" />
            ) : progress.operation === 'copy' ? (
              <Copy className="w-4 h-4 text-indigo-500 animate-pulse" />
            ) : progress.operation === 'upload' ? (
              <UploadCloud className="w-4 h-4 text-emerald-500 animate-pulse" />
            ) : (
              <Trash2 className="w-4 h-4 text-amber-500" />
            )}
          </div>

          {/* Progress Label & Current Item */}
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <div className="flex items-center justify-between text-[11px] leading-tight mb-1">
              <div className="flex items-center gap-1.5 truncate">
                <span className="font-semibold capitalize text-[rgb(var(--color-text-base))]">
                  {progress.operation === 'move'
                    ? 'Moving'
                    : progress.operation === 'copy'
                    ? 'Copying'
                    : progress.operation === 'upload'
                    ? 'Uploading'
                    : 'Deleting'}
                </span>
                <span className="text-[rgb(var(--color-text-subtle))]">
                  {progress.completedItems}/{progress.totalItems} items
                </span>
                {progress.currentItemName && progress.status === 'running' && (
                  <span className="font-mono text-[10px] text-blue-500 truncate max-w-[120px] md:max-w-[180px]">
                    ({progress.currentItemName})
                  </span>
                )}
                {progress.destPath && progress.status === 'running' && (
                  <span className="hidden md:inline text-[10px] text-[rgb(var(--color-text-subtle))] truncate">
                    → /{progress.destPath.join('/')}
                  </span>
                )}
              </div>

              {/* Percentage & Speed */}
              <div className="flex items-center gap-2 flex-shrink-0 font-mono text-[11px]">
                {progress.speedText && progress.status === 'running' && (
                  <span className="text-[10px] text-[rgb(var(--color-text-subtle))] hidden sm:inline">
                    {progress.speedText}
                  </span>
                )}
                <span
                  className={`font-bold ${
                    progress.status === 'completed'
                      ? 'text-emerald-500'
                      : progress.status === 'cancelled'
                      ? 'text-rose-500'
                      : 'text-blue-500'
                  }`}
                >
                  {Math.round(progress.percentage)}%
                </span>
              </div>
            </div>

            {/* Visual Progress Bar Track */}
            <div
              id="footer-progress-bar-track"
              className="w-full bg-[rgb(var(--color-surface-muted))] rounded-full h-1.5 overflow-hidden border border-[rgb(var(--color-border-base))]/40"
            >
              <div
                id="footer-progress-bar-fill"
                style={{ width: `${Math.max(0, Math.min(100, progress.percentage))}%` }}
                className={`h-full rounded-full transition-all duration-200 ease-out ${
                  progress.status === 'completed'
                    ? 'bg-emerald-500'
                    : progress.status === 'cancelled'
                    ? 'bg-rose-500'
                    : 'bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-600'
                }`}
              />
            </div>
          </div>

          {/* Action Button: Cancel or Dismiss */}
          {progress.status === 'running' ? (
            <button
              id="footer-progress-cancel-btn"
              onClick={onCancelProgress}
              title="Cancel file operation"
              className="p-1 hover:bg-[rgb(var(--color-surface-hover))] rounded-md text-[rgb(var(--color-text-subtle))] hover:text-rose-500 transition-colors flex-shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              id="footer-progress-dismiss-btn"
              onClick={onDismissProgress}
              title="Dismiss notification"
              className="p-1 hover:bg-[rgb(var(--color-surface-hover))] rounded-md text-[rgb(var(--color-text-subtle))] hover:text-[rgb(var(--color-text-base))] transition-colors flex-shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Right: Quick Tool Toggles & Layout Options */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {/* Terminal Toggle */}
        <button
          id="footer-toggle-terminal-btn"
          onClick={onToggleTerminal}
          title="Toggle Terminal Console (Ctrl + `)"
          className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
            showTerminal
              ? 'bg-blue-500/15 text-blue-500'
              : 'hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-subtle))] hover:text-[rgb(var(--color-text-base))]'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Terminal</span>
        </button>

        {/* Idea Stream Toggle */}
        <button
          id="footer-toggle-ideastream-btn"
          onClick={onToggleIdeaStream}
          title="Toggle Idea Stream & Research"
          className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
            showIdeaStream
              ? 'bg-purple-500/15 text-purple-500'
              : 'hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-subtle))] hover:text-[rgb(var(--color-text-base))]'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Idea Stream</span>
        </button>

        {/* Detail Pane Toggle */}
        <button
          id="footer-toggle-detailpane-btn"
          onClick={onToggleDetailPane}
          title="Toggle Details & Bookmarks Pane"
          className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
            showDetailPane
              ? 'bg-amber-500/15 text-amber-500'
              : 'hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-subtle))] hover:text-[rgb(var(--color-text-base))]'
          }`}
        >
          <Info className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Details</span>
        </button>

        {/* AI Assistant Toggle */}
        {onToggleAIChat && (
          <button
            id="footer-toggle-aichat-btn"
            onClick={onToggleAIChat}
            title="Toggle Floating AI Assistant (Alt+A)"
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              showAIChat
                ? 'bg-purple-500/15 text-purple-500 font-semibold'
                : 'hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-subtle))] hover:text-purple-400'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden md:inline">AI Chat</span>
          </button>
        )}

        <div className="h-3 w-px bg-[rgb(var(--color-border-base))] mx-0.5" />

        {/* Audio Effects Toggle */}
        <button
          id="footer-toggle-sound-btn"
          onClick={handleToggleSound}
          title={soundEnabled ? 'UI Sound Effects: Enabled (Click to Mute)' : 'UI Sound Effects: Muted (Click to Enable)'}
          className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
            soundEnabled
              ? 'hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-subtle))] hover:text-emerald-400'
              : 'hover:bg-[rgb(var(--color-surface-hover))] text-neutral-500 line-through opacity-60'
          }`}
        >
          {soundEnabled ? (
            <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <VolumeX className="w-3.5 h-3.5 text-neutral-400" />
          )}
          <span className="hidden lg:inline">{soundEnabled ? 'SFX' : 'Muted'}</span>
        </button>
      </div>
    </footer>
  );
};
