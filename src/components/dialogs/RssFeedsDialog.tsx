import React, { useState } from 'react';
import { Rss, Plus, Trash2, X, Globe, Save } from 'lucide-react';
import { RssFeed } from '../../types';

interface RssFeedsDialogProps {
  feeds: RssFeed[];
  onSaveFeed: (feed: RssFeed) => void;
  onDeleteFeed: (id: string) => void;
  onClose: () => void;
}

export const RssFeedsDialog: React.FC<RssFeedsDialogProps> = ({
  feeds,
  onSaveFeed,
  onDeleteFeed,
  onClose,
}) => {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !url.trim()) return;

    onSaveFeed({
      id: Date.now().toString(),
      name: name.trim(),
      url: url.trim(),
    });
    setName('');
    setUrl('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in text-xs">
      <div className="w-full max-w-md bg-[rgb(var(--color-surface-dialog))] border border-[rgb(var(--color-border-base))] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[rgb(var(--color-border-base))] bg-[rgb(var(--color-surface-muted))]">
          <div className="flex items-center gap-2">
            <Rss className="w-4 h-4 text-amber-500" />
            <h3 className="font-semibold text-sm text-[rgb(var(--color-text-base))]">
              Manage RSS Feeds
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-muted))]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto flex flex-col gap-4">
          <form onSubmit={handleAdd} className="flex flex-col gap-2 p-3 bg-[rgb(var(--color-surface-muted))] rounded-lg border border-[rgb(var(--color-border-base))]">
            <span className="font-semibold text-[11px] text-[rgb(var(--color-text-base))]">
              Add New RSS Feed
            </span>
            <div className="flex gap-2">
              <input
                type="text"
                required
                placeholder="Feed Title (e.g. Hacker News)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 px-2.5 py-1.5 rounded bg-[rgb(var(--color-surface-input))] border border-[rgb(var(--color-border-input))] text-xs text-[rgb(var(--color-text-base))] outline-none"
              />
              <input
                type="text"
                required
                placeholder="Feed URL / Host"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="flex-1 px-2.5 py-1.5 rounded bg-[rgb(var(--color-surface-input))] border border-[rgb(var(--color-border-input))] text-xs text-[rgb(var(--color-text-base))] outline-none font-mono"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded bg-[rgb(var(--color-accent-bg))] text-[rgb(var(--color-accent-text))] font-medium hover:opacity-90 flex-shrink-0"
              >
                Add
              </button>
            </div>
          </form>

          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold text-[rgb(var(--color-text-muted))]">
              Subscribed Feeds ({feeds.length})
            </span>
            {feeds.map((feed) => (
              <div
                key={feed.id}
                className="flex items-center justify-between p-2.5 rounded-lg border border-[rgb(var(--color-border-base))] bg-[rgb(var(--color-surface-muted))]"
              >
                <div className="min-w-0 pr-2">
                  <p className="font-semibold text-xs text-[rgb(var(--color-text-base))] truncate">
                    {feed.name}
                  </p>
                  <p className="text-[11px] text-[rgb(var(--color-text-muted))] truncate font-mono">
                    {feed.url}
                  </p>
                </div>
                <button
                  onClick={() => onDeleteFeed(feed.id)}
                  className="p-1 rounded text-red-500 hover:bg-red-500/10"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="p-3 border-t border-[rgb(var(--color-border-base))] flex justify-end bg-[rgb(var(--color-surface-muted))]">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[rgb(var(--color-accent-bg))] text-[rgb(var(--color-accent-text))] font-medium"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
