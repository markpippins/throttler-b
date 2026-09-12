import React, { useState } from 'react';
import { Sliders, X, Palette, Layout, Moon, Sun, Save, Volume2, VolumeX, Play, ShieldCheck, AlertTriangle } from 'lucide-react';
import { DisplayMode } from '../../types';
import { SoundService } from '../../services/soundService';

interface PreferencesDialogProps {
  currentTheme: string;
  defaultDisplayMode: DisplayMode;
  confirmLargeBatchOperations?: boolean;
  largeBatchThreshold?: number;
  onSavePreferences: (
    theme: string,
    defaultDisplayMode: DisplayMode,
    confirmLargeBatchOperations: boolean,
    largeBatchThreshold: number
  ) => void;
  onClose: () => void;
}

export const PreferencesDialog: React.FC<PreferencesDialogProps> = ({
  currentTheme,
  defaultDisplayMode,
  confirmLargeBatchOperations = true,
  largeBatchThreshold = 10,
  onSavePreferences,
  onClose,
}) => {
  const [theme, setTheme] = useState(currentTheme);
  const [displayMode, setDisplayMode] = useState<DisplayMode>(defaultDisplayMode);
  const [soundEnabled, setSoundEnabled] = useState(() => SoundService.isEnabled());
  const [soundVolume, setSoundVolume] = useState(() => Math.round(SoundService.getVolume() * 100));
  const [confirmBatch, setConfirmBatch] = useState(confirmLargeBatchOperations);
  const [batchThreshold, setBatchThreshold] = useState(largeBatchThreshold);

  const handleSave = () => {
    SoundService.setEnabled(soundEnabled);
    SoundService.setVolume(soundVolume / 100);
    onSavePreferences(theme, displayMode, confirmBatch, Math.max(2, batchThreshold || 10));
    onClose();
  };

  const handleTestSound = () => {
    SoundService.setEnabled(soundEnabled);
    SoundService.setVolume(soundVolume / 100);
    SoundService.playMarqueeComplete(3);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in text-xs">
      <div className="w-full max-w-md bg-[rgb(var(--color-surface-dialog))] border border-[rgb(var(--color-border-base))] rounded-xl shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[rgb(var(--color-border-base))] bg-[rgb(var(--color-surface-muted))]">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-500" />
            <h3 className="font-semibold text-sm text-[rgb(var(--color-text-base))]">
              Application Preferences
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-muted))]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-4">
          <div>
            <label className="block text-[11px] font-medium text-[rgb(var(--color-text-muted))] mb-1.5">
              Visual Theme Palette
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'theme-system', name: 'System Default' },
                { id: 'theme-light', name: 'Light (Pure Clean)' },
                { id: 'theme-dark', name: 'Dark Slate' },
                { id: 'theme-nord', name: 'Nord Frost' },
                { id: 'theme-solarized', name: 'Solarized Warm' },
                { id: 'theme-midnight', name: 'Midnight Deep' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTheme(t.id)}
                  className={`flex items-center justify-between p-2.5 rounded-lg border text-left transition-colors ${
                    theme === t.id
                      ? 'border-[rgb(var(--color-accent-text))] bg-[rgb(var(--color-accent-bg))] text-[rgb(var(--color-accent-text))] font-semibold'
                      : 'border-[rgb(var(--color-border-base))] bg-[rgb(var(--color-surface-muted))] text-[rgb(var(--color-text-base))] hover:border-[rgb(var(--color-border-input))]'
                  }`}
                >
                  <span>{t.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[rgb(var(--color-text-muted))] mb-1.5">
              Default Explorer View Mode
            </label>
            <select
              value={displayMode}
              onChange={(e) => setDisplayMode(e.target.value as DisplayMode)}
              className="w-full px-3 py-2 rounded-lg bg-[rgb(var(--color-surface-input))] border border-[rgb(var(--color-border-input))] text-xs text-[rgb(var(--color-text-base))] outline-none"
            >
              <option value="grid">Grid (Cards with Big Icons)</option>
              <option value="list">List (Detailed Table with Columns)</option>
              <option value="largeIcons">Large Icons</option>
              <option value="smallIcons">Small Icons</option>
              <option value="tiles">Compact Tiles</option>
            </select>
          </div>

          <div className="p-3 rounded-lg border border-[rgb(var(--color-border-base))] bg-[rgb(var(--color-surface-muted))] flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {soundEnabled ? (
                  <Volume2 className="w-4 h-4 text-emerald-500" />
                ) : (
                  <VolumeX className="w-4 h-4 text-neutral-400" />
                )}
                <div>
                  <div className="font-medium text-[rgb(var(--color-text-base))]">UI Audio Feedback & SFX</div>
                  <div className="text-[10px] text-[rgb(var(--color-text-subtle))]">Tactile sounds on marquee lasso & file selection</div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={soundEnabled}
                  onChange={(e) => setSoundEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-neutral-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>

            {soundEnabled && (
              <div className="flex items-center justify-between gap-3 pt-1 border-t border-[rgb(var(--color-border-base))]">
                <span className="text-[11px] text-[rgb(var(--color-text-muted))]">Volume ({soundVolume}%)</span>
                <div className="flex items-center gap-2 flex-1 max-w-[200px]">
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={soundVolume}
                    onChange={(e) => setSoundVolume(parseInt(e.target.value, 10))}
                    className="w-full h-1.5 bg-[rgb(var(--color-border-input))] rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleTestSound}
                    title="Test audio cue"
                    className="px-2 py-1 rounded bg-[rgb(var(--color-surface-hover))] hover:bg-[rgb(var(--color-border-base))] text-[10px] font-medium text-[rgb(var(--color-text-base))] flex items-center gap-1"
                  >
                    <Play className="w-2.5 h-2.5 fill-current" />
                    <span>Test</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Large Batch Safety Confirmation */}
          <div className="p-3 rounded-lg border border-[rgb(var(--color-border-base))] bg-[rgb(var(--color-surface-muted))] flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className={`w-4 h-4 ${confirmBatch ? 'text-amber-500' : 'text-neutral-400'}`} />
                <div>
                  <div className="font-medium text-[rgb(var(--color-text-base))]">
                    Confirm Large Batch Move &amp; Copy
                  </div>
                  <div className="text-[10px] text-[rgb(var(--color-text-subtle))]">
                    Prevent accidental data shifts by prompting for verification
                  </div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmBatch}
                  onChange={(e) => setConfirmBatch(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-neutral-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>

            {confirmBatch && (
              <div className="flex flex-col gap-2 pt-2 border-t border-[rgb(var(--color-border-base))]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-medium text-[rgb(var(--color-text-muted))]">
                      Batch Size Threshold
                    </span>
                    <p className="text-[10px] text-[rgb(var(--color-text-subtle))]">
                      Confirm when batch exceeds this number of items
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="2"
                      max="100"
                      value={batchThreshold}
                      onChange={(e) => setBatchThreshold(Math.max(2, parseInt(e.target.value, 10) || 10))}
                      className="w-16 px-2 py-1 text-center font-mono text-xs rounded border border-[rgb(var(--color-border-input))] bg-[rgb(var(--color-surface-input))] text-[rgb(var(--color-text-base))] outline-none focus:border-amber-500"
                    />
                    <span className="text-[11px] text-[rgb(var(--color-text-muted))] font-medium">items</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-[rgb(var(--color-text-subtle))]">Presets:</span>
                  {[5, 10, 20, 50].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setBatchThreshold(preset)}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer ${
                        batchThreshold === preset
                          ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 font-semibold'
                          : 'bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text-base))] border border-[rgb(var(--color-border-base))]'
                      }`}
                    >
                      {preset} items
                    </button>
                  ))}
                </div>
              </div>
            )}
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
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[rgb(var(--color-accent-bg))] text-[rgb(var(--color-accent-text))] font-medium hover:opacity-90"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Apply Preferences</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
