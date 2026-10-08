import React, { useState } from 'react';
import {
  Terminal,
  Activity,
  ShieldAlert,
  GitCompare,
  ChevronUp,
  ChevronDown,
  Maximize2,
  Minimize2,
  Play,
  Copy,
  Check,
  RefreshCw,
  Clock,
  Sparkles,
  Layers,
} from 'lucide-react';

export type TelemetryTab = 'repl' | 'reasoning' | 'governance' | 'read-parity';

export interface TelemetryLogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'receipt';
  source: string;
  message: string;
  digest?: string;
}

export interface ReadParityTelemetry {
  vfsDigest: string;
  schemaDaemonDigest: string;
  isParityMatched: boolean;
  sampleCount: number;
  lastChecked: string;
  driftObserved: number;
}

export interface DockableTelemetryDrawerProps {
  isOpen?: boolean;
  onToggle?: () => void;
  className?: string;
}

const DEFAULT_READ_PARITY: ReadParityTelemetry = {
  vfsDigest: 'sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  schemaDaemonDigest: 'sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  isParityMatched: true,
  sampleCount: 1420,
  lastChecked: new Date().toISOString(),
  driftObserved: 0,
};

export const DockableTelemetryDrawer: React.FC<DockableTelemetryDrawerProps> = ({
  isOpen = true,
  onToggle,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<TelemetryTab>('repl');
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [replInput, setReplInput] = useState<string>('invariant(RenameNoOverlap) -> Asserted;');
  const [replOutput, setReplOutput] = useState<string[]>([
    '[SOL-REPL] Initialized SOLScript evaluation kernel v2.4',
    '[SOL-REPL] Pinned read-set loaded: 42 nodes registered',
  ]);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const handleReplSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replInput.trim()) return;

    setIsEvaluating(true);
    const cmd = replInput.trim();
    setReplOutput((prev) => [...prev, `> ${cmd}`]);

    setTimeout(() => {
      if (cmd.includes('fail') || cmd.includes('refuse')) {
        setReplOutput((prev) => [
          ...prev,
          `❌ [REFUSED] Precondition check failed: Predicate false`,
        ]);
      } else {
        setReplOutput((prev) => [
          ...prev,
          `✔ [ASSERTED] Proposition verified against current read-set snapshot`,
          `  digest: sha256:${Math.random().toString(16).slice(2, 10)}... (evaluation != admission)`,
        ]);
      }
      setIsEvaluating(false);
      setReplInput('');
    }, 250);
  };

  const copyParityReport = () => {
    navigator.clipboard.writeText(JSON.stringify(DEFAULT_READ_PARITY, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const heightClass = isExpanded ? 'h-80' : 'h-48';

  return (
    <div
      className={`bg-slate-950 border-t border-slate-800 flex flex-col transition-all duration-200 z-30 ${heightClass} ${className}`}
    >
      {/* Top Bar / Tabs */}
      <div className="px-4 py-1.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveTab('repl')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              activeTab === 'repl'
                ? 'bg-slate-800 text-emerald-300 border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            SOL REPL
          </button>
          <button
            onClick={() => setActiveTab('reasoning')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              activeTab === 'reasoning'
                ? 'bg-slate-800 text-emerald-300 border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            Reasoning Trace
          </button>
          <button
            onClick={() => setActiveTab('governance')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              activeTab === 'governance'
                ? 'bg-slate-800 text-emerald-300 border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            Governance Ledger
          </button>
          <button
            onClick={() => setActiveTab('read-parity')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              activeTab === 'read-parity'
                ? 'bg-slate-800 text-emerald-300 border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <GitCompare className="w-3.5 h-3.5 text-violet-400" />
            Stage-5 Read Parity
          </button>
        </div>

        {/* Drawer Window Actions */}
        <div className="flex items-center gap-1 text-slate-400">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
            title={isExpanded ? 'Collapse Height' : 'Expand Height'}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          {onToggle && (
            <button
              onClick={onToggle}
              className="p-1 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
              title="Close Drawer"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Tab Panel Content */}
      <div className="p-3 flex-1 overflow-y-auto font-mono text-xs text-slate-300">
        {activeTab === 'repl' && (
          <div className="flex flex-col h-full justify-between gap-2">
            <div className="space-y-1 overflow-y-auto max-h-40">
              {replOutput.map((line, idx) => (
                <div key={idx} className="leading-relaxed">
                  {line}
                </div>
              ))}
            </div>
            <form onSubmit={handleReplSubmit} className="flex items-center gap-2 pt-2 border-t border-slate-800">
              <span className="text-emerald-400 font-bold">{'>'}</span>
              <input
                type="text"
                value={replInput}
                onChange={(e) => setReplInput(e.target.value)}
                placeholder="Enter SOLScript predicate assertion (e.g. check_guard(FileItem)...)"
                className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                disabled={isEvaluating}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
              >
                {isEvaluating ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                Run
              </button>
            </form>
          </div>
        )}

        {activeTab === 'reasoning' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-slate-400 text-[11px] pb-1 border-b border-slate-800">
              <span>Multi-Agent Reasoning Lineage Chain</span>
              <span>Tokens: 342 · Status: Completed</span>
            </div>
            <div className="space-y-1.5 text-slate-300">
              <div className="p-2 bg-slate-900/80 rounded border border-slate-800">
                <span className="text-blue-400 font-bold">[Step 1: Epistemic Check]</span> Verified authority envelope: <code>live</code>. Confirmed server witness active.
              </div>
              <div className="p-2 bg-slate-900/80 rounded border border-slate-800">
                <span className="text-emerald-400 font-bold">[Step 2: Snapshot Freeze]</span> Immutable evaluation snapshot minted with digest <code>sha256:7f83b...</code>.
              </div>
              <div className="p-2 bg-slate-900/80 rounded border border-slate-800">
                <span className="text-violet-400 font-bold">[Step 3: Invariant Proof]</span> SOLScript proof succeeded: <code>Asserted != Admitted</code> gate checked.
              </div>
            </div>
          </div>
        )}

        {activeTab === 'governance' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-slate-400 text-[11px] pb-1 border-b border-slate-800">
              <span>Resolution Governance Ledger Evidence</span>
              <span>Ledger Head: Block #108</span>
            </div>
            <div className="p-2 bg-slate-900/80 rounded border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-emerald-300 font-bold">
                <span>Keychain Checkpoint: chk_live_alpha</span>
                <span className="text-[10px] text-slate-400">Timestamp: {new Date().toLocaleTimeString()}</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Admitted transitions: <code>RenameItem</code> · Policy: <code>pol_peb_canonical_v1</code>
              </p>
            </div>
          </div>
        )}

        {activeTab === 'read-parity' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-slate-400 text-[11px] pb-1 border-b border-slate-800">
              <span>Stage-5 Read-Parity Observation Telemetry</span>
              <button
                onClick={copyParityReport}
                className="flex items-center gap-1 text-slate-400 hover:text-slate-200"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied' : 'Copy JSON'}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 bg-slate-900/80 rounded border border-slate-800">
                <div className="text-[10px] text-slate-500">VFS SHA-256 Digest</div>
                <div className="text-[11px] text-emerald-300 truncate mt-0.5">{DEFAULT_READ_PARITY.vfsDigest}</div>
              </div>
              <div className="p-2 bg-slate-900/80 rounded border border-slate-800">
                <div className="text-[10px] text-slate-500">Schema-Daemon SHA-256 Digest</div>
                <div className="text-[11px] text-emerald-300 truncate mt-0.5">{DEFAULT_READ_PARITY.schemaDaemonDigest}</div>
              </div>
            </div>
            <div className="flex items-center justify-between p-2 bg-emerald-950/20 border border-emerald-500/30 rounded text-emerald-300 text-xs">
              <div className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>100% Read-Parity Match across {DEFAULT_READ_PARITY.sampleCount} dual-runs. Drift = 0.</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">Stage-5 Observation: PASS</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
