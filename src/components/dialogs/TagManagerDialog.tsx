import React, { useState, useEffect, useRef } from 'react';
import {
  Tag,
  X,
  Plus,
  Edit2,
  Check,
  Trash2,
  RotateCcw,
  Palette,
  AlertCircle,
  Hash,
} from 'lucide-react';
import {
  TagDefinition,
  AVAILABLE_TAG_COLORS,
  useTagDefinitions,
  createTagDefinition,
  renameTagDefinition,
  changeTagColorDefinition,
  deleteTagDefinition,
  resetTagsToDefault,
  getTagColorOption,
} from '../../utils/tagUtils';
import { TagBadge } from '../TagBadge';
import { getVfsService } from '../../services/fileSystemService';

interface TagManagerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onTagRenamed?: (oldTag: string, newTag: string) => void;
  onTagDeleted?: (tag: string) => void;
}

export const TagManagerDialog: React.FC<TagManagerDialogProps> = ({
  isOpen,
  onClose,
  onTagRenamed,
  onTagDeleted,
}) => {
  const tags = useTagDefinitions();
  const vfs = getVfsService();

  // Create Tag Form State
  const [newLabel, setNewLabel] = useState('');
  const [newColorId, setNewColorId] = useState('blue');
  const [createError, setCreateError] = useState<string | null>(null);

  // Rename Tag State
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  // Color Picker Popover State (which tag is currently changing color)
  const [activeColorPickerTag, setActiveColorPickerTag] = useState<string | null>(null);

  // Delete Confirmation State
  const [deletingTag, setDeletingTag] = useState<string | null>(null);

  // Status message (e.g. "Tag renamed in 3 files")
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'info' | 'success' } | null>(null);

  const editInputRef = useRef<HTMLInputElement>(null);
  const newTagInputRef = useRef<HTMLInputElement>(null);

  // Focus input when editing starts
  useEffect(() => {
    if (editingTagId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingTagId]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeColorPickerTag) {
          setActiveColorPickerTag(null);
        } else if (editingTagId) {
          setEditingTagId(null);
          setEditError(null);
        } else if (deletingTag) {
          setDeletingTag(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeColorPickerTag, editingTagId, deletingTag, onClose]);

  if (!isOpen) return null;

  const showStatus = (text: string, type: 'info' | 'success' = 'success') => {
    setStatusMessage({ text, type });
    setTimeout(() => {
      setStatusMessage(null);
    }, 4000);
  };

  const handleCreateTag = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setCreateError(null);

    const result = createTagDefinition(newLabel, newColorId);
    if (!result.success) {
      setCreateError(result.error || 'Failed to create tag');
      return;
    }

    showStatus(`Tag "${newLabel.trim()}" created successfully!`);
    setNewLabel('');
    setCreateError(null);
    newTagInputRef.current?.focus();
  };

  const handleStartRename = (tag: TagDefinition) => {
    setEditingTagId(tag.id);
    setEditLabel(tag.label);
    setEditError(null);
    setActiveColorPickerTag(null);
    setDeletingTag(null);
  };

  const handleSaveRename = (tag: TagDefinition) => {
    setEditError(null);
    const oldName = tag.label;
    const cleanNew = editLabel.trim();

    if (!cleanNew) {
      setEditError('Tag name cannot be empty');
      return;
    }

    const result = renameTagDefinition(oldName, cleanNew);
    if (!result.success) {
      setEditError(result.error || 'Failed to rename tag');
      return;
    }

    setEditingTagId(null);
    setEditError(null);

    const fileCount = result.modifiedFileCount || 0;
    const msg = fileCount > 0
      ? `Renamed "${oldName}" to "${cleanNew}" (updated in ${fileCount} ${fileCount === 1 ? 'file' : 'files'})`
      : `Renamed tag to "${cleanNew}"`;
    showStatus(msg);

    onTagRenamed?.(oldName, cleanNew);
  };

  const handleChangeColor = (tag: TagDefinition, colorId: string) => {
    const result = changeTagColorDefinition(tag.label, colorId);
    if (result.success) {
      setActiveColorPickerTag(null);
      const color = getTagColorOption(colorId);
      showStatus(`Updated color for "${tag.label}" to ${color.name}`);
    }
  };

  const handleDeleteTag = (tag: TagDefinition) => {
    const result = deleteTagDefinition(tag.label, true);
    setDeletingTag(null);
    if (result.success) {
      const fileCount = result.removedFileCount || 0;
      const msg = fileCount > 0
        ? `Deleted "${tag.label}" and removed from ${fileCount} ${fileCount === 1 ? 'file' : 'files'}`
        : `Deleted tag "${tag.label}"`;
      showStatus(msg, 'info');
      onTagDeleted?.(tag.label);
    }
  };

  const handleResetDefaults = () => {
    if (window.confirm('Reset all labels to default preset tags (Work, Personal, Urgent, Important, Project, Review)?')) {
      resetTagsToDefault();
      showStatus('Labels reset to default presets');
    }
  };

  return (
    <div
      id="tag-manager-dialog-backdrop"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in text-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        id="tag-manager-dialog-modal"
        className="w-full max-w-lg bg-[rgb(var(--color-surface-dialog))] border border-[rgb(var(--color-border-base))] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] transition-all"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[rgb(var(--color-border-base))] bg-[rgb(var(--color-surface-muted))]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-[rgb(var(--color-text-base))]">
                Manage Tags & Colored Labels
              </h3>
              <p className="text-[11px] text-[rgb(var(--color-text-muted))]">
                Create new labels, rename, or customize tag colors across the app
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text-base))] cursor-pointer transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status Notification */}
        {statusMessage && (
          <div
            className={`px-4 py-2 text-xs font-medium flex items-center gap-2 border-b animate-fade-in ${
              statusMessage.type === 'success'
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                : 'bg-blue-500/15 border-blue-500/30 text-blue-700 dark:text-blue-300'
            }`}
          >
            <Check className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{statusMessage.text}</span>
          </div>
        )}

        <div className="p-4 flex flex-col gap-4 overflow-y-auto flex-1">
          {/* ========================================================================= */}
          {/* CREATE NEW TAG SECTION */}
          {/* ========================================================================= */}
          <div className="p-3 rounded-xl bg-[rgb(var(--color-surface-muted))]/60 border border-[rgb(var(--color-border-base))] flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[rgb(var(--color-text-base))] flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-indigo-500" />
                Create New Label
              </span>
              {newLabel.trim() && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-[rgb(var(--color-text-muted))]">Preview:</span>
                  <TagBadge tag={newLabel.trim()} size="sm" />
                </div>
              )}
            </div>

            <form onSubmit={handleCreateTag} className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    ref={newTagInputRef}
                    type="text"
                    value={newLabel}
                    onChange={(e) => {
                      setNewLabel(e.target.value);
                      if (createError) setCreateError(null);
                    }}
                    placeholder="Enter tag name (e.g. Finance, Sprint 1, Archive)..."
                    maxLength={32}
                    className="w-full px-3 py-1.5 rounded-lg bg-[rgb(var(--color-surface-input))] border border-[rgb(var(--color-border-input))] text-xs text-[rgb(var(--color-text-base))] outline-none focus:border-indigo-500 transition-colors"
                  />
                  {newLabel && (
                    <button
                      type="button"
                      onClick={() => setNewLabel('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text-base))] cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!newLabel.trim()}
                  className="px-3.5 py-1.5 rounded-lg bg-[rgb(var(--color-accent-bg))] text-[rgb(var(--color-accent-text))] font-medium text-xs hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer transition-opacity shadow-xs flex-shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Tag</span>
                </button>
              </div>

              {/* Color Swatches for New Tag */}
              <div>
                <span className="text-[10px] font-medium text-[rgb(var(--color-text-muted))] block mb-1.5">
                  Select Tag Color:
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {AVAILABLE_TAG_COLORS.map((c) => {
                    const isSelected = newColorId === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setNewColorId(c.id)}
                        title={`${c.name} color`}
                        className={`w-5 h-5 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                          c.dotClass
                        } ${
                          isSelected
                            ? 'ring-2 ring-offset-2 ring-indigo-500 ring-offset-[rgb(var(--color-surface-dialog))] scale-115 shadow-xs'
                            : 'hover:scale-110 opacity-80 hover:opacity-100'
                        }`}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {createError && (
                <div className="flex items-center gap-1.5 text-[11px] text-red-600 dark:text-red-400">
                  <AlertCircle className="w-3 h-3 flex-shrink-0" />
                  <span>{createError}</span>
                </div>
              )}
            </form>
          </div>

          {/* ========================================================================= */}
          {/* EXISTING TAGS LIST */}
          {/* ========================================================================= */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[rgb(var(--color-text-base))] flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-indigo-500" />
                Existing Tags & Labels ({tags.length})
              </span>
              <span className="text-[10px] text-[rgb(var(--color-text-muted))]">
                Click color swatch to change color, pencil to rename
              </span>
            </div>

            {tags.length === 0 ? (
              <div className="text-center py-6 text-xs text-[rgb(var(--color-text-muted))] italic bg-[rgb(var(--color-surface-muted))]/40 rounded-lg border border-[rgb(var(--color-border-base))]">
                No tags defined. Use the form above to add your first tag.
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {tags.map((tag) => {
                  const isEditing = editingTagId === tag.id;
                  const isPickingColor = activeColorPickerTag === tag.id;
                  const isConfirmingDelete = deletingTag === tag.id;
                  const usageCount = vfs?.getTagUsageCount(tag.label) ?? 0;
                  const colorOption = getTagColorOption(tag.colorId);

                  return (
                    <div
                      key={tag.id}
                      className="p-2 rounded-lg bg-[rgb(var(--color-surface-base))] border border-[rgb(var(--color-border-base))] hover:border-[rgb(var(--color-border-input))] transition-all flex flex-col gap-2 shadow-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        {/* Left Side: Tag Badge / Edit Input */}
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {/* Color Palette Button */}
                          <div className="relative flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveColorPickerTag(isPickingColor ? null : tag.id);
                                if (isEditing) setEditingTagId(null);
                                if (isConfirmingDelete) setDeletingTag(null);
                              }}
                              title={`Change color (current: ${colorOption.name})`}
                              className={`w-6 h-6 rounded-full flex items-center justify-center transition-transform cursor-pointer border border-black/10 dark:border-white/10 ${
                                colorOption.dotClass
                              } ${isPickingColor ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110 shadow-xs' : 'hover:scale-110'}`}
                            >
                              <Palette className="w-3 h-3 text-white/90 drop-shadow-xs" />
                            </button>
                          </div>

                          {/* Tag Name or Inline Edit Input */}
                          {isEditing ? (
                            <div className="flex items-center gap-1.5 flex-1 min-w-0">
                              <input
                                ref={editInputRef}
                                type="text"
                                value={editLabel}
                                onChange={(e) => {
                                  setEditLabel(e.target.value);
                                  if (editError) setEditError(null);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleSaveRename(tag);
                                  } else if (e.key === 'Escape') {
                                    setEditingTagId(null);
                                    setEditError(null);
                                  }
                                }}
                                maxLength={32}
                                className="flex-1 px-2.5 py-1 text-xs rounded bg-[rgb(var(--color-surface-input))] border border-indigo-500 text-[rgb(var(--color-text-base))] outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveRename(tag)}
                                className="p-1 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/30 cursor-pointer"
                                title="Save name"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingTagId(null);
                                  setEditError(null);
                                }}
                                className="p-1 rounded hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-muted))] cursor-pointer"
                                title="Cancel"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 min-w-0">
                              <TagBadge tag={tag.label} size="sm" />
                              <span className="text-[10px] text-[rgb(var(--color-text-muted))] flex-shrink-0">
                                {usageCount > 0 ? (
                                  <span className="font-medium text-[rgb(var(--color-text-base))]">
                                    {usageCount} {usageCount === 1 ? 'item' : 'items'}
                                  </span>
                                ) : (
                                  <span>Unused</span>
                                )}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Right Side Actions */}
                        {!isEditing && (
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {/* Rename Button */}
                            <button
                              type="button"
                              onClick={() => handleStartRename(tag)}
                              className="p-1.5 rounded-md hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text-base))] cursor-pointer transition-colors"
                              title="Rename tag"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={() => {
                                setDeletingTag(isConfirmingDelete ? null : tag.id);
                                if (isPickingColor) setActiveColorPickerTag(null);
                              }}
                              className="p-1.5 rounded-md hover:bg-red-500/10 text-[rgb(var(--color-text-muted))] hover:text-red-500 cursor-pointer transition-colors"
                              title="Delete tag"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Edit Error Message */}
                      {isEditing && editError && (
                        <div className="flex items-center gap-1.5 text-[11px] text-red-600 dark:text-red-400 pl-8">
                          <AlertCircle className="w-3 h-3 flex-shrink-0" />
                          <span>{editError}</span>
                        </div>
                      )}

                      {/* Color Picker Swatches Dropdown */}
                      {isPickingColor && (
                        <div className="mt-1 pt-2 border-t border-[rgb(var(--color-border-base))] flex flex-col gap-1.5 animate-fade-in">
                          <div className="flex items-center justify-between text-[10px] text-[rgb(var(--color-text-muted))] font-medium">
                            <span>Choose color for "{tag.label}":</span>
                            <span className="capitalize text-indigo-500 font-semibold">{colorOption.name}</span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap p-1.5 rounded-lg bg-[rgb(var(--color-surface-muted))] border border-[rgb(var(--color-border-base))]">
                            {AVAILABLE_TAG_COLORS.map((c) => {
                              const isSelected = tag.colorId === c.id;
                              return (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => handleChangeColor(tag, c.id)}
                                  title={`${c.name}`}
                                  className={`w-5 h-5 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                                    c.dotClass
                                  } ${
                                    isSelected
                                      ? 'ring-2 ring-offset-2 ring-indigo-500 scale-115 shadow-xs'
                                      : 'hover:scale-110 opacity-80 hover:opacity-100'
                                  }`}
                                >
                                  {isSelected && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Delete Confirmation Box */}
                      {isConfirmingDelete && (
                        <div className="mt-1 p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-xs flex flex-col gap-2 animate-fade-in">
                          <p className="text-red-700 dark:text-red-300 font-medium">
                            Delete tag "{tag.label}"?
                            {usageCount > 0 && (
                              <span className="block text-[11px] opacity-90 mt-0.5">
                                This will remove it from {usageCount} {usageCount === 1 ? 'file' : 'files'}.
                              </span>
                            )}
                          </p>
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setDeletingTag(null)}
                              className="px-2.5 py-1 rounded bg-[rgb(var(--color-surface-base))] border border-[rgb(var(--color-border-base))] text-[rgb(var(--color-text-base))] hover:bg-[rgb(var(--color-surface-hover))] cursor-pointer text-[11px]"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteTag(tag)}
                              className="px-2.5 py-1 rounded bg-red-600 text-white font-medium hover:bg-red-700 cursor-pointer text-[11px] shadow-xs"
                            >
                              Delete Tag
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-[rgb(var(--color-border-base))] bg-[rgb(var(--color-surface-muted))]">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 text-[11px] text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text-base))] cursor-pointer transition-colors"
            title="Reset to default tag labels and colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[rgb(var(--color-surface-base))] hover:bg-[rgb(var(--color-surface-hover))] border border-[rgb(var(--color-border-base))] text-xs font-medium text-[rgb(var(--color-text-base))] cursor-pointer transition-colors shadow-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
