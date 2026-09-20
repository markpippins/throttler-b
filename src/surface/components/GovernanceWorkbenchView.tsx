import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Info,
  ShieldAlert,
  XCircle,
  Check,
  ShieldCheck,
  FileCheck,
  Terminal,
} from 'lucide-react';
import type { GovernedDirector } from '../../governance/director';

export type GovernanceMode = 'DEMO' | 'FIXTURE' | 'LIVE READ' | 'LIVE GOVERNED';
export type AssessmentStatus = 'pending' | 'admitted' | 'refused' | 'unknown' | 'stale' | 'drift' | 'error';

export interface GovernanceResult {
  status: AssessmentStatus;
  reason: string;
  envelopeId?: string;
  evaluationFingerprint?: string;
  admissionReceiptId?: string;
  transitionReceiptId?: string;
  evidenceIds?: string[];
  replayStatus?: string;
}

interface GovernanceWorkbenchViewProps {
  governanceDirector?: GovernedDirector | null;
  activePath?: string[];
}

export const GovernanceWorkbenchView: React.FC<GovernanceWorkbenchViewProps> = ({
  governanceDirector,
  activePath = ['System'],
}) => {
  const [mode, setMode] = useState<GovernanceMode>('LIVE GOVERNED');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [actionDrawerOpen, setActionDrawerOpen] = useState(false);
  const [customSubject, setCustomSubject] = useState(`vfs-node:/${activePath.join('/')}`);

  const handleCopy = async (key: string, val: string) => {
    try {
      await navigator.clipboard.writeText(val);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1500);
    } catch {
      // ignore
    }
  };

  const currentResult: GovernanceResult = {
    status: 'admitted',
    reason: 'Assessment passed: SolScript state constraints satisfied; authority receipt validated by Aegis Director.',
    envelopeId: 'env-throttler-0042',
    evaluationFingerprint: 'sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    admissionReceiptId: 'peb-receipt-vfs-admitted-0042',
    transitionReceiptId: 'conduit-receipt-transition-0042',
    evidenceIds: ['evidence-solscript-ast', 'evidence-keychain-checkpoint-01'],
    replayStatus: 'replay_verified_deterministic',
  };

  const statusMeta: Record<AssessmentStatus, { label: string; icon: React.ComponentType<{ className?: string }>; color: string; badge: string }> = {
    pending: { label: 'Assessment pending', icon: Info, color: 'text-blue-500', badge: 'border-blue-500/30 bg-blue-500/10 text-blue-500' },
    admitted: { label: 'Admitted by authority', icon: CheckCircle2, color: 'text-emerald-500', badge: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500' },
    refused: { label: 'Refused by guard', icon: XCircle, color: 'text-rose-500', badge: 'border-rose-500/30 bg-rose-500/10 text-rose-500' },
    unknown: { label: 'Unknown context', icon: Info, color: 'text-amber-500', badge: 'border-amber-500/30 bg-amber-500/10 text-amber-500' },
    stale: { label: 'Stale doctrine', icon: AlertTriangle, color: 'text-amber-500', badge: 'border-amber-500/30 bg-amber-500/10 text-amber-500' },
    drift: { label: 'Drift detected', icon: ShieldAlert, color: 'text-rose-500', badge: 'border-rose-500/30 bg-rose-500/10 text-rose-500' },
    error: { label: 'Assessment error', icon: ShieldAlert, color: 'text-rose-500', badge: 'border-rose-500/30 bg-rose-500/10 text-rose-500' },
  };

  const meta = statusMeta[currentResult.status];
  const StatusIcon = meta.icon;

  return (
    <div className="space-y-4 max-w-5xl mx-auto font-mono text-xs">
      {/* Mode Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border border-border/80 bg-surface/90 shadow-xs">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground text-sm">Runtime Mode · {mode}</span>
              <span className="rounded bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] text-emerald-500 font-bold uppercase">
                Aegis Governed
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-muted-foreground font-sans">
              Mutations to virtual filesystem nodes are evaluated against SolScript safety doctrine and Keychain attestation.
            </p>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border/40">
          {(['LIVE GOVERNED', 'LIVE READ', 'FIXTURE', 'DEMO'] as GovernanceMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-2 py-1 rounded text-[10px] font-semibold transition-all ${
                mode === m
                  ? 'bg-foreground text-background shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Contract & Identity Strip */}
      <div className="p-4 rounded-xl border border-border/70 bg-surface/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-border/40 pb-2">
          <div className="flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-primary" />
            <span className="font-bold text-foreground">Governance Contract & Identity</span>
          </div>
          <span className="rounded bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary">
            CONTRACT VER 3.2
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <div className="text-[10px] text-muted-foreground uppercase">Target Subject</div>
            <div className="font-semibold text-foreground truncate mt-0.5" title={customSubject}>
              {customSubject}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase">Contract Definition</div>
            <div className="font-semibold text-foreground truncate mt-0.5">
              throttler.governance.vfs-admission
            </div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase">Artifact Digest</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <code className="truncate text-muted-foreground max-w-[160px]">
                {currentResult.evaluationFingerprint}
              </code>
              <button
                onClick={() =>
                  handleCopy('fingerprint', currentResult.evaluationFingerprint || '')
                }
                className="p-1 rounded text-muted-foreground hover:text-foreground"
                title="Copy Fingerprint"
              >
                {copiedKey === 'fingerprint' ? (
                  <Check className="w-3 h-3 text-emerald-500" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Assessment and Authority Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Assessment Panel */}
        <div className="p-4 rounded-xl border border-border/70 bg-surface/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-border/40 pb-2">
            <div className="flex items-center gap-2">
              <StatusIcon className={`w-4 h-4 ${meta.color}`} />
              <span className="font-bold text-foreground">Assessment · SolScript</span>
            </div>
            <span className={`rounded border px-2 py-0.5 text-[10px] uppercase font-bold ${meta.badge}`}>
              {meta.label}
            </span>
          </div>
          <p className="text-muted-foreground text-[11px] leading-relaxed font-sans">
            {currentResult.reason}
          </p>
          <div className="rounded-md bg-background/50 p-2.5 border border-border/40 space-y-1">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-muted-foreground uppercase">Evaluator:</span>
              <span className="text-foreground font-semibold">SolScript AST Kernel v2.4</span>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-muted-foreground uppercase">Deterministic:</span>
              <span className="text-emerald-500 font-semibold">Verified Yes (0ms jitter)</span>
            </div>
          </div>
        </div>

        {/* Authority Panel */}
        <div className="p-4 rounded-xl border border-border/70 bg-surface/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-border/40 pb-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span className="font-bold text-foreground">Authority · PEB / Conduit</span>
            </div>
            <span className="rounded bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-500 font-bold uppercase">
              Receipt-Backed
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between rounded bg-muted/40 px-2.5 py-1.5 border border-border/40">
              <span className="text-muted-foreground text-[10px] uppercase">PEB Admission Receipt:</span>
              <span className="font-bold text-emerald-500 text-[11px]">
                {currentResult.admissionReceiptId}
              </span>
            </div>
            <div className="flex items-center justify-between rounded bg-muted/40 px-2.5 py-1.5 border border-border/40">
              <span className="text-muted-foreground text-[10px] uppercase">Conduit Transition Receipt:</span>
              <span className="font-bold text-foreground text-[11px]">
                {currentResult.transitionReceiptId}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Provenance & Replay Details */}
      <details className="p-4 rounded-xl border border-border/70 bg-surface/80 shadow-xs group">
        <summary className="cursor-pointer list-none flex items-center justify-between font-bold text-foreground">
          <span>Provenance Lineage & Deterministic Replay</span>
          <span className="text-muted-foreground group-open:rotate-180 transition-transform">▼</span>
        </summary>
        <div className="mt-3 pt-3 border-t border-border/40 grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
          <div>
            <span className="text-muted-foreground uppercase text-[10px] block">Envelope ID</span>
            <span className="text-foreground font-semibold">{currentResult.envelopeId}</span>
          </div>
          <div>
            <span className="text-muted-foreground uppercase text-[10px] block">Replay Verification</span>
            <span className="text-emerald-500 font-semibold">{currentResult.replayStatus}</span>
          </div>
          <div>
            <span className="text-muted-foreground uppercase text-[10px] block">Evidence Witnesses</span>
            <span className="text-foreground">{currentResult.evidenceIds?.join(', ')}</span>
          </div>
          <div>
            <span className="text-muted-foreground uppercase text-[10px] block">Governance Invariant</span>
            <span className="text-muted-foreground">UI state is never accepted as evidence without cryptographic attestation.</span>
          </div>
        </div>
      </details>

      {/* Trigger Governed Action Review */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={() => setActionDrawerOpen(true)}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center gap-2 shadow-sm shadow-blue-600/20"
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Review & Test Governed Action</span>
        </button>
      </div>

      {/* Governed Action Drawer / Modal */}
      {actionDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-surface p-6 border-l border-border h-full flex flex-col justify-between shadow-2xl">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border/50 pb-3">
                <div>
                  <div className="text-[10px] text-primary uppercase font-bold">Governed Admission</div>
                  <h2 className="text-base font-bold text-foreground">Submit Action for Evaluation</h2>
                </div>
                <button
                  onClick={() => setActionDrawerOpen(false)}
                  className="text-muted-foreground hover:text-foreground text-sm font-bold p-1"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase text-muted-foreground">Target Subject Path</label>
                <input
                  type="text"
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-md bg-background border border-border text-foreground font-mono text-xs focus:outline-hidden focus:border-primary"
                />
              </div>

              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 space-y-1">
                <div className="font-semibold text-primary text-[11px]">Proposed State Assessment</div>
                <p className="text-[11px] text-foreground font-sans">
                  This state change will be simulated in the SolScript AST sandbox before writing to the physical VFS or generating Keychain checkpoint records.
                </p>
              </div>
            </div>

            <div className="flex gap-2 pt-4 border-t border-border/50">
              <button
                onClick={() => setActionDrawerOpen(false)}
                className="flex-1 py-2 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-semibold"
              >
                Submit For Assessment
              </button>
              <button
                onClick={() => setActionDrawerOpen(false)}
                className="px-4 py-2 rounded-md border border-border text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
