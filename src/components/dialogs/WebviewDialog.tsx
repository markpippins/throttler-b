import React from 'react';
import { Globe, X, ExternalLink, RefreshCw } from 'lucide-react';

interface WebviewDialogProps {
  url: string;
  title: string;
  onClose: () => void;
}

export const WebviewDialog: React.FC<WebviewDialogProps> = ({ url, title, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in text-xs">
      <div className="w-full max-w-4xl h-[85vh] bg-[rgb(var(--color-surface-dialog))] border border-[rgb(var(--color-border-base))] rounded-xl shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[rgb(var(--color-border-base))] bg-[rgb(var(--color-surface-muted))]">
          <div className="flex items-center gap-2 min-w-0 pr-4">
            <Globe className="w-4 h-4 text-blue-500 flex-shrink-0" />
            <span className="font-semibold text-sm text-[rgb(var(--color-text-base))] truncate">
              {title}
            </span>
            <span className="text-[11px] text-[rgb(var(--color-text-subtle))] font-mono truncate hidden sm:inline">
              ({url})
            </span>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-base))] hover:text-blue-500"
            >
              <span>Open in New Tab</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-muted))]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 bg-white relative">
          <iframe
            src={url}
            title={title}
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        </div>
      </div>
    </div>
  );
};
