import React, { useState } from 'react';
import { Info, X, Folder, FileText, Calendar, HardDrive, Tag, Check, Plus, Palette } from 'lucide-react';
import { FileSystemNode } from '../../types';
import { formatFileSize } from '../../utils/fileUtils';
import { getVfsService } from '../../services/fileSystemService';
import { useTagDefinitions, getTagStyle } from '../../utils/tagUtils';
import { TagBadge } from '../TagBadge';
import { TagManagerDialog } from './TagManagerDialog';

interface PropertiesDialogProps {
  item: FileSystemNode;
  path: string[];
  onSaveProperties?: (displayName: string, imageName: string, tags: string[]) => void;
  onClose: () => void;
}

export const PropertiesDialog: React.FC<PropertiesDialogProps> = ({
  item,
  path,
  onSaveProperties,
  onClose,
}) => {
  const [displayName, setDisplayName] = useState(item.name);
  const [imageName, setImageName] = useState('');
  const [tags, setTags] = useState<string[]>(item.tags ? [...item.tags] : []);
  const [customTagInput, setCustomTagInput] = useState('');
  const [isTagManagerOpen, setIsTagManagerOpen] = useState(false);

  const availableTags = useTagDefinitions();

  const vfs = getVfsService();
  const folderStats =
    item.type === 'folder' && vfs
      ? vfs.calculateSubtreeSize([...path, item.name])
      : undefined;

  const calculateFolderSize = (node: FileSystemNode): number => {
    if (node.type === 'file') return node.size || 0;
    if (!node.children || node.children.length === 0) return 0;
    return node.children.reduce((acc, child) => acc + calculateFolderSize(child), 0);
  };

  const displaySize =
    item.type === 'folder'
      ? folderStats
        ? formatFileSize(folderStats.size, { detailed: true, decimals: 2 })
        : item.children && item.children.length > 0
        ? formatFileSize(calculateFolderSize(item), { detailed: true, decimals: 2 })
        : '0 B (Empty Folder)'
      : formatFileSize(item.size, { detailed: true, decimals: 2, fallback: '0 B' });

  const toggleTag = (tagName: string) => {
    setTags((prev) =>
      prev.includes(tagName) ? prev.filter((t) => t !== tagName) : [...prev, tagName]
    );
  };

  const handleAddCustomTag = () => {
    const trimmed = customTagInput.trim();
    if (trimmed && !tags.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
      setTags((prev) => [...prev, trimmed]);
      setCustomTagInput('');
    }
  };

  const handleRemoveTag = (tagName: string) => {
    setTags((prev) => prev.filter((t) => t !== tagName));
  };

  const handleSave = () => {
    if (onSaveProperties) {
      onSaveProperties(displayName, imageName, tags);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in text-xs">
      <div className="w-full max-w-md bg-[rgb(var(--color-surface-dialog))] border border-[rgb(var(--color-border-base))] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[rgb(var(--color-border-base))] bg-[rgb(var(--color-surface-muted))]">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-indigo-500" />
            <h3 className="font-semibold text-sm text-[rgb(var(--color-text-base))]">
              Properties: {item.name}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-muted))] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-4 overflow-y-auto">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-[rgb(var(--color-surface-muted))] border border-[rgb(var(--color-border-base))]">
            {item.type === 'folder' ? (
              <Folder className="w-10 h-10 text-amber-500 flex-shrink-0" />
            ) : (
              <FileText className="w-10 h-10 text-blue-500 flex-shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <h4 className="font-bold text-sm text-[rgb(var(--color-text-base))] truncate">
                {item.name}
              </h4>
              <p className="text-[11px] text-[rgb(var(--color-text-muted))] capitalize">
                {item.type} {item.isMagnet ? '(Magnet Package)' : ''}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            <div className="flex justify-between py-1 border-b border-[rgb(var(--color-border-base))]">
              <span className="text-[rgb(var(--color-text-muted))]">Location</span>
              <span className="font-mono text-[rgb(var(--color-text-base))] truncate max-w-[240px]">
                /{path.join('/')}
              </span>
            </div>

            <div className="flex justify-between py-1 border-b border-[rgb(var(--color-border-base))]">
              <span className="text-[rgb(var(--color-text-muted))]">Size</span>
              <span className="text-[rgb(var(--color-text-base))] font-medium">{displaySize}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-[rgb(var(--color-border-base))]">
              <span className="text-[rgb(var(--color-text-muted))]">Date Modified</span>
              <span className="text-[rgb(var(--color-text-base))]">
                {item.modified ? new Date(item.modified).toLocaleString() : 'N/A'}
              </span>
            </div>

            {item.type === 'folder' && (
              <div className="flex justify-between py-1 border-b border-[rgb(var(--color-border-base))]">
                <span className="text-[rgb(var(--color-text-muted))]">Contained Items</span>
                <span className="text-[rgb(var(--color-text-base))]">
                  {folderStats
                    ? `${folderStats.fileCount} ${folderStats.fileCount === 1 ? 'file' : 'files'}, ${folderStats.folderCount} ${folderStats.folderCount === 1 ? 'subfolder' : 'subfolders'}`
                    : `${item.children ? item.children.length : 0} items`}
                </span>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* TAGGING & COLORED LABELS SECTION */}
          {/* ========================================================================= */}
          <div className="flex flex-col gap-2.5 pt-3 border-t border-[rgb(var(--color-border-base))]">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-[rgb(var(--color-text-base))] flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-indigo-500" />
                Colored Labels & Tags
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsTagManagerOpen(true)}
                  className="flex items-center gap-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 hover:underline cursor-pointer transition-colors"
                  title="Create, rename, or change tag colors in the tagging system"
                >
                  <Palette className="w-3 h-3" />
                  <span>Manage Tags</span>
                </button>
                {tags.length > 0 && (
                  <span className="text-[10px] text-[rgb(var(--color-text-muted))] font-medium">
                    • {tags.length} {tags.length === 1 ? 'label' : 'labels'}
                  </span>
                )}
              </div>
            </div>

            {/* Currently Active Assigned Labels */}
            {tags.length > 0 ? (
              <div className="flex items-center gap-1.5 flex-wrap p-2 rounded-lg bg-[rgb(var(--color-surface-muted))]/60 border border-[rgb(var(--color-border-base))] min-h-[34px]">
                {tags.map((t) => (
                  <TagBadge key={t} tag={t} size="sm" onRemove={() => handleRemoveTag(t)} />
                ))}
              </div>
            ) : (
              <div className="text-[11px] text-[rgb(var(--color-text-muted))] italic px-1 py-1">
                No labels assigned yet. Select preset labels below or enter a custom tag.
              </div>
            )}

            {/* Available Colored Labels Palette */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] text-[rgb(var(--color-text-muted))] font-medium">
                  Available Labels ({availableTags.length}):
                </span>
                <button
                  type="button"
                  onClick={() => setIsTagManagerOpen(true)}
                  className="text-[10px] text-indigo-500 hover:text-indigo-600 font-medium cursor-pointer flex items-center gap-1"
                >
                  <Palette className="w-2.5 h-2.5" />
                  <span>Customize / Edit</span>
                </button>
              </div>
              <div className="grid grid-cols-3 gap-1.5 max-h-40 overflow-y-auto pr-0.5">
                {availableTags.map((tagDef) => {
                  const style = getTagStyle(tagDef.label);
                  const isSelected = tags.some((t) => t.toLowerCase() === tagDef.label.toLowerCase());
                  return (
                    <button
                      key={tagDef.id}
                      type="button"
                      onClick={() => toggleTag(tagDef.label)}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all text-left cursor-pointer ${
                        isSelected
                          ? `${style.bgClass} ${style.textClass} ${style.borderClass} ring-1 ring-blue-500/40 shadow-xs font-semibold`
                          : 'bg-[rgb(var(--color-surface-base))] border-[rgb(var(--color-border-base))] text-[rgb(var(--color-text-base))] hover:bg-[rgb(var(--color-surface-hover))]'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${style.dotClass}`} />
                        <span className="truncate">{tagDef.label}</span>
                      </div>
                      {isSelected && <Check className="w-3 h-3 flex-shrink-0 text-current ml-1" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Add Custom Tag */}
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={customTagInput}
                  onChange={(e) => setCustomTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomTag();
                    }
                  }}
                  placeholder="Custom label name (e.g. Finance, Sprint 1)..."
                  className="w-full pl-2.5 pr-7 py-1.5 rounded-lg bg-[rgb(var(--color-surface-input))] border border-[rgb(var(--color-border-input))] text-xs text-[rgb(var(--color-text-base))] outline-none focus:border-indigo-500 transition-colors"
                />
                {customTagInput && (
                  <button
                    type="button"
                    onClick={() => setCustomTagInput('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text-base))] cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={handleAddCustomTag}
                disabled={!customTagInput.trim()}
                className="px-3 py-1.5 rounded-lg bg-[rgb(var(--color-surface-muted))] hover:bg-[rgb(var(--color-surface-hover))] border border-[rgb(var(--color-border-base))] text-xs font-medium text-[rgb(var(--color-text-base))] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          </div>

          {item.type === 'folder' && (
            <div className="flex flex-col gap-2 pt-2 border-t border-[rgb(var(--color-border-base))]">
              <div>
                <label className="block text-[11px] font-medium text-[rgb(var(--color-text-muted))] mb-1">
                  Custom Icon / Image Identifier
                </label>
                <input
                  type="text"
                  value={imageName}
                  onChange={(e) => setImageName(e.target.value)}
                  placeholder="e.g. nodejs, react, database"
                  className="w-full px-3 py-1.5 rounded-lg bg-[rgb(var(--color-surface-input))] border border-[rgb(var(--color-border-input))] text-xs text-[rgb(var(--color-text-base))] outline-none"
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[rgb(var(--color-border-base))]">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-[rgb(var(--color-border-base))] hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-base))] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 rounded-lg bg-[rgb(var(--color-accent-bg))] text-[rgb(var(--color-accent-text))] font-medium hover:opacity-90 cursor-pointer shadow-xs"
            >
              Apply & Save
            </button>
          </div>
        </div>
      </div>

      {isTagManagerOpen && (
        <TagManagerDialog
          isOpen={isTagManagerOpen}
          onClose={() => setIsTagManagerOpen(false)}
          onTagRenamed={(oldTag, newTag) => {
            setTags((prev) =>
              prev.map((t) => (t.toLowerCase() === oldTag.toLowerCase() ? newTag : t))
            );
          }}
          onTagDeleted={(deletedTag) => {
            setTags((prev) =>
              prev.filter((t) => t.toLowerCase() !== deletedTag.toLowerCase())
            );
          }}
        />
      )}
    </div>
  );
};
