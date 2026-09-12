import React, { useState } from 'react';
import { LogIn, X, Key, User, Shield } from 'lucide-react';
import { ServerProfile } from '../../types';

interface LoginDialogProps {
  profile: ServerProfile;
  onLogin: (credentials: { username: string; token: string }) => void;
  onClose: () => void;
}

export const LoginDialog: React.FC<LoginDialogProps> = ({ profile, onLogin, onClose }) => {
  const [username, setUsername] = useState('admin');
  const [token, setToken] = useState('demo-token-123');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin({ username, token });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in text-xs">
      <div className="w-full max-w-sm bg-[rgb(var(--color-surface-dialog))] border border-[rgb(var(--color-border-base))] rounded-xl shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[rgb(var(--color-border-base))] bg-[rgb(var(--color-surface-muted))]">
          <div className="flex items-center gap-2">
            <LogIn className="w-4 h-4 text-blue-500" />
            <h3 className="font-semibold text-sm text-[rgb(var(--color-text-base))]">
              Connect to {profile.name}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-muted))]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-3">
          <p className="text-[11px] text-[rgb(var(--color-text-muted))]">
            Authenticate session against broker endpoint: <br />
            <span className="font-mono text-[10px] text-blue-500">{profile.brokerUrl}</span>
          </p>

          <div>
            <label className="block text-[11px] font-medium text-[rgb(var(--color-text-muted))] mb-1">
              Username / Client ID
            </label>
            <div className="relative flex items-center">
              <User className="w-3.5 h-3.5 absolute left-2.5 text-[rgb(var(--color-text-subtle))]" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[rgb(var(--color-surface-input))] border border-[rgb(var(--color-border-input))] text-xs text-[rgb(var(--color-text-base))] outline-none focus:ring-1 focus:ring-[rgb(var(--color-accent-text))]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[rgb(var(--color-text-muted))] mb-1">
              Secret Key / Auth Token
            </label>
            <div className="relative flex items-center">
              <Key className="w-3.5 h-3.5 absolute left-2.5 text-[rgb(var(--color-text-subtle))]" />
              <input
                type="password"
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[rgb(var(--color-surface-input))] border border-[rgb(var(--color-border-input))] text-xs text-[rgb(var(--color-text-base))] outline-none font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[rgb(var(--color-border-base))]">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-[rgb(var(--color-border-base))] hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-base))]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[rgb(var(--color-accent-bg))] text-[rgb(var(--color-accent-text))] font-medium hover:opacity-90"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Authenticate & Mount</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
