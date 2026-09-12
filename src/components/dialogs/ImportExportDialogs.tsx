import React, { useState } from 'react';
import { UploadCloud, DownloadCloud, X, Copy, Check, FileJson } from 'lucide-react';

interface ImportDialogProps {
  onImport: (jsonString: string) => boolean;
  onClose: () => void;
}

export const ImportDialog: React.FC<ImportDialogProps> = ({ onImport, onClose }) => {
  const [jsonInput, setJsonInput] = useState('');
  const [error, setError] = useState('');

  const handleImport = () => {
    setError('');
    const success = onImport(jsonInput);
    if (success) {
      onClose();
    } else {
      setError('Invalid JSON structure. Please verify the exported file system format.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setJsonInput(content);
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in text-xs">
      <div className="w-full max-w-lg bg-[rgb(var(--color-surface-dialog))] border border-[rgb(var(--color-border-base))] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[rgb(var(--color-border-base))] bg-[rgb(var(--color-surface-muted))]">
          <div className="flex items-center gap-2">
            <UploadCloud className="w-4 h-4 text-teal-500" />
            <h3 className="font-semibold text-sm text-[rgb(var(--color-text-base))]">
              Import Session Backup
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-muted))]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-3">
          <p className="text-[rgb(var(--color-text-muted))]">
            Paste a JSON export or upload a backup file to restore the virtual file tree.
          </p>

          <label className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-[rgb(var(--color-border-input))] hover:border-[rgb(var(--color-accent-text))] rounded-lg cursor-pointer transition-colors bg-[rgb(var(--color-surface-muted))]">
            <FileJson className="w-4 h-4 text-[rgb(var(--color-text-muted))]" />
            <span className="font-medium text-[rgb(var(--color-text-base))]">Choose JSON file...</span>
            <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
          </label>

          <textarea
            rows={8}
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder='{"name": "Local Session", "type": "folder", ...}'
            className="w-full p-2.5 rounded-lg bg-[rgb(var(--color-surface-input))] border border-[rgb(var(--color-border-input))] text-xs font-mono text-[rgb(var(--color-text-base))] outline-none resize-none"
          />

          {error && <p className="text-red-500 font-medium">{error}</p>}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[rgb(var(--color-border-base))]">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-[rgb(var(--color-border-base))] hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-base))]"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!jsonInput.trim()}
              onClick={handleImport}
              className="px-4 py-1.5 rounded-lg bg-[rgb(var(--color-accent-bg))] text-[rgb(var(--color-accent-text))] font-medium disabled:opacity-40 hover:opacity-90"
            >
              Restore Tree
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface ExportDialogProps {
  jsonString: string;
  onClose: () => void;
}

export const ExportDialog: React.FC<ExportDialogProps> = ({ jsonString, onClose }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `throttler-session-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in text-xs">
      <div className="w-full max-w-lg bg-[rgb(var(--color-surface-dialog))] border border-[rgb(var(--color-border-base))] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[rgb(var(--color-border-base))] bg-[rgb(var(--color-surface-muted))]">
          <div className="flex items-center gap-2">
            <DownloadCloud className="w-4 h-4 text-cyan-500" />
            <h3 className="font-semibold text-sm text-[rgb(var(--color-text-base))]">
              Export Virtual Session
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-muted))]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-3">
          <p className="text-[rgb(var(--color-text-muted))]">
            Complete hierarchical JSON backup of the current local session file tree and documents.
          </p>

          <textarea
            readOnly
            rows={10}
            value={jsonString}
            className="w-full p-2.5 rounded-lg bg-[rgb(var(--color-surface-input))] border border-[rgb(var(--color-border-input))] text-xs font-mono text-[rgb(var(--color-text-base))] outline-none resize-none"
          />

          <div className="flex items-center justify-between pt-2 border-t border-[rgb(var(--color-border-base))]">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[rgb(var(--color-border-base))] hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-base))]"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied to Clipboard!' : 'Copy JSON'}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg border border-[rgb(var(--color-border-base))] hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-base))]"
              >
                Close
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[rgb(var(--color-accent-bg))] text-[rgb(var(--color-accent-text))] font-medium hover:opacity-90"
              >
                <DownloadCloud className="w-3.5 h-3.5" />
                <span>Download .JSON</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
