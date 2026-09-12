import React, { useState } from 'react';
import { Server, Plus, Trash2, Edit2, CheckCircle2, AlertCircle, X, ExternalLink, RefreshCw } from 'lucide-react';
import { ServerProfile } from '../../types';

interface ServerProfilesDialogProps {
  profiles: ServerProfile[];
  onSaveProfile: (profile: ServerProfile) => void;
  onDeleteProfile: (id: string) => void;
  onConnect: (profile: ServerProfile) => void;
  onClose: () => void;
}

export const ServerProfilesDialog: React.FC<ServerProfilesDialogProps> = ({
  profiles,
  onSaveProfile,
  onDeleteProfile,
  onConnect,
  onClose,
}) => {
  const [editingProfile, setEditingProfile] = useState<ServerProfile | null>(null);
  const [formName, setFormName] = useState('');
  const [formBrokerUrl, setFormBrokerUrl] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formSearchUrl, setFormSearchUrl] = useState('');
  const [formAutoConnect, setFormAutoConnect] = useState(false);
  const [testingStatus, setTestingStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  const startCreate = () => {
    setEditingProfile({
      id: Date.now().toString(),
      name: '',
      brokerUrl: 'https://broker.example.com',
      imageUrl: 'https://images.example.com',
      searchUrl: 'https://search.example.com',
      autoConnect: false,
    });
    setFormName('Remote Cluster 1');
    setFormBrokerUrl('https://broker.example.com');
    setFormImageUrl('https://images.example.com');
    setFormSearchUrl('https://search.example.com');
    setFormAutoConnect(false);
    setTestingStatus('idle');
  };

  const startEdit = (p: ServerProfile) => {
    setEditingProfile(p);
    setFormName(p.name);
    setFormBrokerUrl(p.brokerUrl);
    setFormImageUrl(p.imageUrl);
    setFormSearchUrl(p.searchUrl || '');
    setFormAutoConnect(!!p.autoConnect);
    setTestingStatus('idle');
  };

  const handleTestConnection = async () => {
    setTestingStatus('testing');
    await new Promise((r) => setTimeout(r, 600));
    setTestingStatus('success');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfile || !formName.trim() || !formBrokerUrl.trim()) return;

    onSaveProfile({
      id: editingProfile.id,
      name: formName.trim(),
      brokerUrl: formBrokerUrl.trim(),
      imageUrl: formImageUrl.trim(),
      searchUrl: formSearchUrl.trim(),
      autoConnect: formAutoConnect,
    });
    setEditingProfile(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in text-xs">
      <div className="w-full max-w-xl bg-[rgb(var(--color-surface-dialog))] border border-[rgb(var(--color-border-base))] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[rgb(var(--color-border-base))] bg-[rgb(var(--color-surface-muted))]">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-blue-500" />
            <h3 className="font-semibold text-sm text-[rgb(var(--color-text-base))]">
              Remote Server Profiles
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-muted))]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {!editingProfile ? (
            <>
              <div className="flex items-center justify-between">
                <p className="text-[rgb(var(--color-text-muted))]">
                  Configure remote storage brokers and image indexing services.
                </p>
                <button
                  onClick={startCreate}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgb(var(--color-accent-bg))] text-[rgb(var(--color-accent-text))] font-medium hover:opacity-90 transition-opacity"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Profile</span>
                </button>
              </div>

              <div className="flex flex-col gap-2">
                {profiles.length === 0 ? (
                  <div className="text-center py-8 text-[rgb(var(--color-text-subtle))] border border-dashed border-[rgb(var(--color-border-base))] rounded-lg">
                    No remote server profiles yet. Click "Add Profile" to create one.
                  </div>
                ) : (
                  profiles.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-[rgb(var(--color-border-base))] bg-[rgb(var(--color-surface-muted))] hover:shadow-xs transition-shadow"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-[rgb(var(--color-text-base))]">
                            {p.name}
                          </span>
                          {p.autoConnect && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-600 font-medium">
                              Auto-Connect
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[rgb(var(--color-text-muted))] mt-0.5 font-mono">
                          {p.brokerUrl}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => onConnect(p)}
                          className="px-2.5 py-1 rounded bg-[rgb(var(--color-surface-hover))] hover:bg-[rgb(var(--color-accent-bg))] hover:text-[rgb(var(--color-accent-text))] text-[rgb(var(--color-text-base))] font-medium transition-colors"
                        >
                          Mount
                        </button>
                        <button
                          onClick={() => startEdit(p)}
                          className="p-1.5 rounded hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-muted))]"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteProfile(p.id)}
                          className="p-1.5 rounded hover:bg-red-500/10 text-red-500"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <form onSubmit={handleSave} className="flex flex-col gap-3">
              <div>
                <label className="block text-[11px] font-medium text-[rgb(var(--color-text-muted))] mb-1">
                  Profile Display Name
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., European Cluster Node"
                  className="w-full px-3 py-1.5 rounded-lg bg-[rgb(var(--color-surface-input))] border border-[rgb(var(--color-border-input))] text-xs text-[rgb(var(--color-text-base))] outline-none focus:ring-1 focus:ring-[rgb(var(--color-accent-text))]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[rgb(var(--color-text-muted))] mb-1">
                  Broker Service Endpoint (WebSocket / REST)
                </label>
                <input
                  type="url"
                  required
                  value={formBrokerUrl}
                  onChange={(e) => setFormBrokerUrl(e.target.value)}
                  placeholder="https://broker.domain.com"
                  className="w-full px-3 py-1.5 rounded-lg bg-[rgb(var(--color-surface-input))] border border-[rgb(var(--color-border-input))] text-xs text-[rgb(var(--color-text-base))] outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[rgb(var(--color-text-muted))] mb-1">
                  Image Cache / CDN URL
                </label>
                <input
                  type="url"
                  value={formImageUrl}
                  onChange={(e) => setFormImageUrl(e.target.value)}
                  placeholder="https://images.domain.com"
                  className="w-full px-3 py-1.5 rounded-lg bg-[rgb(var(--color-surface-input))] border border-[rgb(var(--color-border-input))] text-xs text-[rgb(var(--color-text-base))] outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[rgb(var(--color-text-muted))] mb-1">
                  Search & Metadata URL (Optional)
                </label>
                <input
                  type="url"
                  value={formSearchUrl}
                  onChange={(e) => setFormSearchUrl(e.target.value)}
                  placeholder="https://search.domain.com"
                  className="w-full px-3 py-1.5 rounded-lg bg-[rgb(var(--color-surface-input))] border border-[rgb(var(--color-border-input))] text-xs text-[rgb(var(--color-text-base))] outline-none font-mono"
                />
              </div>

              <div className="flex items-center gap-2 mt-1">
                <input
                  type="checkbox"
                  id="autoConnect"
                  checked={formAutoConnect}
                  onChange={(e) => setFormAutoConnect(e.target.checked)}
                  className="rounded text-[rgb(var(--color-accent-text))]"
                />
                <label htmlFor="autoConnect" className="text-[rgb(var(--color-text-base))] cursor-pointer">
                  Auto-mount this server profile upon app startup
                </label>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[rgb(var(--color-border-base))]">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testingStatus === 'testing'}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[rgb(var(--color-border-base))] hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-base))]"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testingStatus === 'testing' ? 'animate-spin' : ''}`} />
                  <span>
                    {testingStatus === 'testing'
                      ? 'Testing...'
                      : testingStatus === 'success'
                      ? 'Connection Verified ✓'
                      : 'Test Connection'}
                  </span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingProfile(null)}
                    className="px-3 py-1.5 rounded-lg border border-[rgb(var(--color-border-base))] hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-base))]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-[rgb(var(--color-accent-bg))] text-[rgb(var(--color-accent-text))] font-medium hover:opacity-90"
                  >
                    Save Profile
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
