import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  MoveRight,
  Copy,
  Folder,
  File,
  X,
  ArrowRight,
  ShieldAlert,
  Check,
} from 'lucide-react';

interface ConfirmBatchOperationDialogProps {
  isOpen: boolean;
  operation: 'move' | 'copy';
  itemNames: string[];
  sourcePath: string[];
  destPath: string[];
  threshold: number;
  onConfirm: (dontAskAgain: boolean) => void;
  onCancel: () => void;
}

export const ConfirmBatchOperationDialog: React.FC<ConfirmBatchOperationDialogProps> = ({
  isOpen,
  operation,
  itemNames,
  sourcePath,
  destPath,
  threshold,
  onConfirm,
  onCancel,
}) => {
  const [dontAskAgain, setDontAskAgain] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      } else if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        // Only submit on Enter if not focused on an input
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' || target.getAttribute('type') === 'checkbox') {
          e.preventDefault();
          onConfirm(dontAskAgain);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel, onConfirm, dontAskAgain]);

  if (!isOpen) return null;

  const isMove = operation === 'move';
  const totalCount = itemNames.length;
  const filteredItems = searchFilter.trim()
    ? itemNames.filter((name) => name.toLowerCase().includes(searchFilter.toLowerCase().trim()))
    : itemNames;

  const sourceDisplay = sourcePath.length === 0 ? 'Root' : `/${sourcePath.join('/')}`;
  const destDisplay = destPath.length === 0 ? 'Root' : `/${destPath.join('/')}`;

  return (
    <div
      id="confirm-batch-operation-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in text-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        className="w-full max-w-lg bg-[rgb(var(--color-surface-dialog))] border border-[rgb(var(--color-border-base))] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[rgb(var(--color-border-base))] bg-[rgb(var(--color-surface-muted))]">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-1.5 rounded-lg flex items-center justify-center ${
                isMove
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                  : 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
              }`}
            >
              {isMove ? <MoveRight className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="font-semibold text-sm text-[rgb(var(--color-text-base))] flex items-center gap-2">
                <span>{isMove ? 'Confirm Large Batch Move' : 'Confirm Large Batch Copy'}</span>
                <span className="text-[10px] font-mono font-normal px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  {totalCount} items
                </span>
              </h3>
            </div>
          </div>
          <button
            onClick={onCancel}
            title="Cancel and close (Esc)"
            className="p-1 rounded-lg hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-muted))] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 flex flex-col gap-4 overflow-y-auto">
          {/* Warning Banner */}
          <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 flex items-start gap-3">
            <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1 text-[11px] text-[rgb(var(--color-text-base))]">
              <span className="font-semibold">Accidental Data Shift Prevention:</span> You are about to{' '}
              <span className="font-semibold underline decoration-amber-500/50">
                {isMove ? 'move' : 'copy'} {totalCount} items
              </span>
              . This exceeds your safety batch threshold of {threshold} items.
            </div>
          </div>

          {/* Transfer Route Visual Card */}
          <div className="p-3 rounded-lg border border-[rgb(var(--color-border-base))] bg-[rgb(var(--color-surface-muted))] flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase font-bold text-[rgb(var(--color-text-subtle))] tracking-wider mb-0.5">
                From Location
              </div>
              <div className="font-mono text-xs font-semibold text-[rgb(var(--color-text-base))] truncate" title={sourceDisplay}>
                {sourceDisplay}
              </div>
            </div>

            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[rgb(var(--color-surface-base))] border border-[rgb(var(--color-border-base))] text-[rgb(var(--color-accent-text))] shrink-0 shadow-2xs">
              <ArrowRight className="w-4 h-4" />
            </div>

            <div className="flex-1 min-w-0 text-right">
              <div className="text-[10px] uppercase font-bold text-[rgb(var(--color-text-subtle))] tracking-wider mb-0.5">
                Target Location
              </div>
              <div className="font-mono text-xs font-semibold text-[rgb(var(--color-text-base))] truncate" title={destDisplay}>
                {destDisplay}
              </div>
            </div>
          </div>

          {/* Items List Preview */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-medium text-[rgb(var(--color-text-muted))]">
                Batch Contents ({totalCount} {totalCount === 1 ? 'item' : 'items'})
              </span>
              {totalCount > 6 && (
                <input
                  type="text"
                  placeholder="Filter items..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="px-2 py-0.5 text-[11px] rounded border border-[rgb(var(--color-border-input))] bg-[rgb(var(--color-surface-input))] text-[rgb(var(--color-text-base))] outline-none w-32 focus:w-44 transition-all"
                />
              )}
            </div>

            <div className="border border-[rgb(var(--color-border-base))] rounded-lg bg-[rgb(var(--color-surface-base))] max-h-48 overflow-y-auto divide-y divide-[rgb(var(--color-border-base))]/40">
              {filteredItems.length === 0 ? (
                <div className="p-3 text-center text-[11px] text-[rgb(var(--color-text-muted))] italic">
                  No items match filter &quot;{searchFilter}&quot;
                </div>
              ) : (
                filteredItems.map((name) => {
                  const isProbablyFolder = !name.includes('.') || name.endsWith('/');
                  return (
                    <div
                      key={name}
                      className="px-3 py-1.5 flex items-center justify-between gap-2 hover:bg-[rgb(var(--color-surface-hover))] transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {isProbablyFolder ? (
                          <Folder className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        ) : (
                          <File className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        )}
                        <span className="font-mono text-[11px] text-[rgb(var(--color-text-base))] truncate" title={name}>
                          {name}
                        </span>
                      </div>
                      <span className="text-[10px] text-[rgb(var(--color-text-subtle))] shrink-0 font-mono">
                        {isProbablyFolder ? 'folder' : name.split('.').pop() || 'file'}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* User Preference Quick Setting */}
          <div className="pt-2 border-t border-[rgb(var(--color-border-base))] flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text-base))]">
              <input
                type="checkbox"
                checked={dontAskAgain}
                onChange={(e) => setDontAskAgain(e.target.checked)}
                className="rounded border-[rgb(var(--color-border-input))] accent-indigo-500 cursor-pointer"
              />
              <span>Don&apos;t ask again for large batches</span>
            </label>
            <span className="text-[10px] text-[rgb(var(--color-text-subtle))]">
              Configurable in Preferences
            </span>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-3 border-t border-[rgb(var(--color-border-base))] bg-[rgb(var(--color-surface-muted))]">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-1.5 rounded-lg border border-[rgb(var(--color-border-base))] hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-base))] font-medium transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(dontAskAgain)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-white font-medium transition-opacity hover:opacity-90 shadow-sm cursor-pointer ${
              isMove ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isMove ? <MoveRight className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>
              {isMove ? `Move ${totalCount} Items` : `Copy ${totalCount} Items`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
