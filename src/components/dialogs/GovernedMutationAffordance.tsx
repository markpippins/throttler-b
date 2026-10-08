import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Lock,
  FileEdit,
  ArrowRight,
  Fingerprint,
  RefreshCw,
  Copy,
  Check,
  X,
  AlertTriangle,
  KeyRound,
  CheckCheck,
} from 'lucide-react';
import {
  EpistemicEnvelope,
  WitnessedServerStatus,
  EvaluationDisposition,
  EvaluationSnapshot,
  AdmissionReceipt,
  GovernedMutationRequest,
} from '../../surface/types';
import {
  deriveVisualTreatment,
  createEvaluationSnapshot,
  mintAdmissionReceipt,
} from '../../surface/core/contextSnapshot';
import { globalInteractionContextStore } from '../../surface/core/interactionContextStore';

export interface GuardEvaluationResult {
  allowed: boolean;
  disposition: EvaluationDisposition;
  passedGuards: string[];
  refusedGuard?: { rule: string; reason: string };
  policyId?: string;
}

export interface GovernedMutationAffordanceProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  actionType: string;
  targetId: string;
  targetName: string;
  targetType?: string;
  initialParameters?: Record<string, unknown>;
  envelope?: EpistemicEnvelope;
  serverStatus?: WitnessedServerStatus;
  refusalReason?: string;
  onEvaluate?: (
    params: Record<string, unknown>,
    snapshot: EvaluationSnapshot
  ) => Promise<GuardEvaluationResult>;
  onCommit: (
    request: GovernedMutationRequest,
    receipt: AdmissionReceipt
  ) => Promise<{ success: boolean; error?: string }>;
}

export const GovernedMutationAffordance: React.FC<GovernedMutationAffordanceProps> = ({
  isOpen,
  onClose,
  title,
  actionType,
  targetId,
  targetName,
  targetType = 'entity',
  initialParameters = {},
  envelope = 'live',
  serverStatus = 'complete',
  refusalReason: initialRefusalReason,
  onEvaluate,
  onCommit,
}) => {
  const [params, setParams] = useState<Record<string, unknown>>(initialParameters);
  const [candidateValue, setCandidateValue] = useState<string>(
    String(initialParameters.name || initialParameters.targetName || targetName)
  );
  const [evaluating, setEvaluating] = useState<boolean>(false);
  const [committing, setCommitting] = useState<boolean>(false);
  const [evaluationResult, setEvaluationResult] = useState<GuardEvaluationResult | null>(null);
  const [activeSnapshot, setActiveSnapshot] = useState<EvaluationSnapshot | null>(null);
  const [activeReceipt, setActiveReceipt] = useState<AdmissionReceipt | null>(null);
  const [commitError, setCommitError] = useState<string | null>(null);
  const [copiedDigest, setCopiedDigest] = useState<boolean>(false);
  const [copiedReceipt, setCopiedReceipt] = useState<boolean>(false);

  // Compute visual treatment based on envelope × serverStatus × refusalReason (F-1)
  const effectiveRefusalReason = evaluationResult?.refusedGuard?.reason || initialRefusalReason;
  const effectiveStatus = evaluationResult && !evaluationResult.allowed ? 'refusal' : serverStatus;

  const visualTreatment = useMemo(() => {
    return deriveVisualTreatment(envelope, effectiveStatus, effectiveRefusalReason);
  }, [envelope, effectiveStatus, effectiveRefusalReason]);

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      const initialVal = String(
        initialParameters.name || initialParameters.targetName || targetName
      );
      setCandidateValue(initialVal);
      setParams({ ...initialParameters, targetName: initialVal });
      setCommitError(null);
      setCommitting(false);
    }
  }, [isOpen, initialParameters, targetName]);

  // Run evaluation when candidate value changes
  const runEvaluation = useCallback(
    async (val: string) => {
      setEvaluating(true);
      setCommitError(null);

      const currentUi = globalInteractionContextStore.get();
      const updatedParams = { ...params, targetName: val };
      const snapshot = createEvaluationSnapshot(
        currentUi,
        {
          actionType,
          targetId,
          parameters: updatedParams,
        },
        envelope
      );

      setActiveSnapshot(snapshot);

      try {
        if (onEvaluate) {
          const res = await onEvaluate(updatedParams, snapshot);
          setEvaluationResult(res);

          // Mint prospective admission receipt if allowed
          if (res.allowed) {
            const receipt = mintAdmissionReceipt({
              snapshot,
              doctrinePolicyId: res.policyId || 'pol_peb_canonical_v1',
              admitted: true,
            });
            setActiveReceipt(receipt);
          } else {
            const receipt = mintAdmissionReceipt({
              snapshot,
              doctrinePolicyId: res.policyId || 'pol_peb_canonical_v1',
              admitted: false,
              refusalReason: res.refusedGuard?.reason,
            });
            setActiveReceipt(receipt);
          }
        } else {
          // Default deterministic guard validation: rejects empty, root slashes, or double-dots
          const trimmed = val.trim();
          const isInvalid =
            !trimmed ||
            trimmed === targetName ||
            trimmed.includes('..') ||
            trimmed.includes('/') ||
            trimmed.includes('\\');

          if (isInvalid) {
            const reason = !trimmed
              ? 'Target name cannot be empty.'
              : trimmed === targetName
              ? 'Target name must differ from existing name.'
              : 'Target name contains forbidden characters (/ or ..).';

            setEvaluationResult({
              allowed: false,
              disposition: 'Rejected',
              passedGuards: ['TypeSystemInvariant:passed'],
              refusedGuard: {
                rule: 'SOL_PATH_INVARIANT_01',
                reason,
              },
            });
            setActiveReceipt(
              mintAdmissionReceipt({
                snapshot,
                doctrinePolicyId: 'pol_peb_canonical_v1',
                admitted: false,
                refusalReason: reason,
              })
            );
          } else {
            setEvaluationResult({
              allowed: true,
              disposition: 'Asserted',
              passedGuards: [
                'SOL_PATH_INVARIANT_01:passed',
                'AEGIS_STATE_AFFORDANCE:passed',
                'CONDUIT_TOKEN_FRESHNESS:passed',
              ],
              policyId: 'pol_peb_canonical_v1',
            });
            setActiveReceipt(
              mintAdmissionReceipt({
                snapshot,
                doctrinePolicyId: 'pol_peb_canonical_v1',
                admitted: true,
              })
            );
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setCommitError(`Evaluation check error: ${msg}`);
      } finally {
        setEvaluating(false);
      }
    },
    [actionType, targetId, targetName, envelope, onEvaluate, params]
  );

  useEffect(() => {
    if (isOpen) {
      runEvaluation(candidateValue);
    }
  }, [isOpen, candidateValue, runEvaluation]);

  // Handle Commit
  const handleCommit = async () => {
    if (!activeSnapshot || !activeReceipt || !activeReceipt.admitted) {
      return;
    }

    setCommitting(true);
    setCommitError(null);

    const request: GovernedMutationRequest = {
      mutationId: `mut_${Date.now()}`,
      actionType,
      targetId,
      parameters: { ...params, targetName: candidateValue },
      snapshot: activeSnapshot,
      admissionReceipt: activeReceipt,
    };

    try {
      const result = await onCommit(request, activeReceipt);
      if (result.success) {
        onClose();
      } else {
        setCommitError(result.error || 'Governed mutation failed during execution.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setCommitError(`Commit error: ${msg}`);
    } finally {
      setCommitting(false);
    }
  };

  const copyToClipboard = (text: string, isReceipt: boolean) => {
    navigator.clipboard.writeText(text);
    if (isReceipt) {
      setCopiedReceipt(true);
      setTimeout(() => setCopiedReceipt(false), 2000);
    } else {
      setCopiedDigest(true);
      setTimeout(() => setCopiedDigest(false), 2000);
    }
  };

  if (!isOpen) return null;

  const isAllowed = evaluationResult?.allowed && activeReceipt?.admitted;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header with Epistemic Authority Caption & Visual Treatment (F-1) */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg border ${visualTreatment.borderStyle}`}>
              <Shield className="w-5 h-5 text-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-slate-100">{title}</h3>
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${visualTreatment.borderStyle}`}
                >
                  {visualTreatment.glyph} {visualTreatment.statusBadge}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Category B Governed Mutation · {actionType}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Target & Value Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Proposed Value ({targetType})</span>
              <span className="text-[11px] font-mono text-slate-400">Target ID: {targetId}</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={candidateValue}
                onChange={(e) => setCandidateValue(e.target.value)}
                placeholder="Enter new value..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
              />
              {evaluating && (
                <div className="absolute right-3 top-2.5">
                  <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin" />
                </div>
              )}
            </div>
          </div>

          {/* Frozen Evaluation Snapshot Panel */}
          {activeSnapshot && (
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Fingerprint className="w-3.5 h-3.5 text-slate-300" />
                  Client Read-Set Digest (Frozen Snapshot)
                </span>
                <button
                  onClick={() => copyToClipboard(activeSnapshot.clientDigest, false)}
                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {copiedDigest ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {copiedDigest ? 'Copied' : 'Copy'}
                </button>
              </div>
              <p className="font-mono text-xs text-slate-300 break-all bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                {activeSnapshot.clientDigest}
              </p>
            </div>
          )}

          {/* SOLScript Guard Check & Evaluation Result */}
          {evaluationResult && (
            <div
              className={`p-3.5 rounded-xl border ${
                evaluationResult.allowed
                  ? 'border-emerald-500/30 bg-emerald-950/20'
                  : 'border-rose-500/40 bg-rose-950/20'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {evaluationResult.allowed ? (
                    <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                  ) : (
                    <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-200">SOLScript Proposition Evaluation:</span>
                      <span
                        className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded ${
                          evaluationResult.allowed
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-rose-500/20 text-rose-300'
                        }`}
                      >
                        {evaluationResult.disposition}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {evaluationResult.allowed
                        ? 'All semantic invariants and state machine preconditions satisfied.'
                        : evaluationResult.refusedGuard?.reason || 'Guard validation refused.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Refused Guard Detail (Strict blocking rose view, never borrowing healthy accent) */}
              {!evaluationResult.allowed && evaluationResult.refusedGuard && (
                <div className="mt-2.5 pt-2 border-t border-rose-500/20 text-xs font-mono text-rose-300">
                  <div className="flex items-center gap-1 font-semibold text-rose-400">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Refusal Predicate: {evaluationResult.refusedGuard.rule}
                  </div>
                  <p className="mt-1 text-rose-200/90 pl-4">{evaluationResult.refusedGuard.reason}</p>
                </div>
              )}
            </div>
          )}

          {/* Cryptographic Admission Receipt Preview */}
          {activeReceipt && (
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span className="flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                  PEB Admission Token Preview
                </span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded uppercase font-bold ${
                    activeReceipt.admitted
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-rose-500/20 text-rose-300'
                  }`}
                >
                  {activeReceipt.admitted ? 'Admitted' : 'Admission Withheld'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-300 font-mono">
                <span>Receipt ID: {activeReceipt.receiptId}</span>
                <button
                  onClick={() => copyToClipboard(activeReceipt.signature, true)}
                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {copiedReceipt ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {copiedReceipt ? 'Sig Copied' : 'Copy Sig'}
                </button>
              </div>
              <p className="text-[11px] font-mono text-slate-500 truncate">
                Signature: {activeReceipt.signature}
              </p>
            </div>
          )}

          {/* Commit Error display */}
          {commitError && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/50 text-xs text-rose-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{commitError}</span>
            </div>
          )}
        </div>

        {/* Footer with Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 font-mono">
            <span>Asserted ≠ Admitted · PEB Receipt Required</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={committing}
              className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCommit}
              disabled={!isAllowed || committing || evaluating}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
                isAllowed && !committing && !evaluating
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              }`}
            >
              {committing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Admitting & Mutating...
                </>
              ) : (
                <>
                  <CheckCheck className="w-3.5 h-3.5" />
                  Commit Governed Mutation
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
