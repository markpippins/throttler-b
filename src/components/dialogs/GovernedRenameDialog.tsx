import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Lock,
  Unlock,
  Copy,
  Check,
  X,
  FileEdit,
  Sparkles,
  AlertTriangle,
  ArrowRight,
  Fingerprint,
  RefreshCw,
  Folder,
  FileText,
  KeyRound,
  CheckCheck,
} from 'lucide-react';
import { GovernedDirector } from '../../governance/director';
import { RenameGuardsPreview } from '../../governance/solscript/evaluator';
import { RenameItemInteraction, SHRAPNEL_REVISIONS } from '../../governance/shrapnel/types';
import { GovernedTransitionResult } from '../../governance/resolution/governance';

interface GovernedRenameDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sourcePath: string[];
  itemName: string;
  itemType?: 'file' | 'folder';
  director: GovernedDirector;
  onSuccess: (oldName: string, newName: string) => void;
}

export const GovernedRenameDialog: React.FC<GovernedRenameDialogProps> = ({
  isOpen,
  onClose,
  sourcePath,
  itemName,
  itemType = 'file',
  director,
  onSuccess,
}) => {
  const [candidateName, setCandidateName] = useState<string>(itemName);
  const [preview, setPreview] = useState<RenameGuardsPreview | null>(null);
  const [evaluating, setEvaluating] = useState<boolean>(false);
  const [executing, setExecuting] = useState<boolean>(false);
  const [executionResult, setExecutionResult] = useState<GovernedTransitionResult | null>(null);
  const [copiedDigest, setCopiedDigest] = useState<boolean>(false);
  const [copiedCheckpoint, setCopiedCheckpoint] = useState<boolean>(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Reset state when dialog opens for an item
  useEffect(() => {
    if (isOpen) {
      setCandidateName(itemName);
      setExecutionResult(null);
      setExecuting(false);
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          const dotIdx = itemName.lastIndexOf('.');
          if (dotIdx > 0) {
            inputRef.current.setSelectionRange(0, dotIdx);
          } else {
            inputRef.current.select();
          }
        }
      }, 50);
    }
  }, [isOpen, itemName]);

  // Evaluate SolScript guards whenever candidate name changes
  const runEvaluation = useCallback(
    async (targetName: string) => {
      setEvaluating(true);
      try {
        const result = await director.previewRename(sourcePath, itemName, targetName);
        setPreview(result);
      } catch (err) {
        console.error('Failed to preview SolScript rename guards:', err);
      } finally {
        setEvaluating(false);
      }
    },
    [director, sourcePath, itemName]
  );

  useEffect(() => {
    if (isOpen) {
      runEvaluation(candidateName);
    }
  }, [isOpen, candidateName, runEvaluation]);

  // Handle escape to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopy = (text: string, type: 'digest' | 'checkpoint') => {
    navigator.clipboard.writeText(text);
    if (type === 'digest') {
      setCopiedDigest(true);
      setTimeout(() => setCopiedDigest(false), 2000);
    } else {
      setCopiedCheckpoint(true);
      setTimeout(() => setCopiedCheckpoint(false), 2000);
    }
  };

  const handleExecute = async () => {
    if (!preview?.allowed || executing) return;
    setExecuting(true);

    try {
      const interaction: RenameItemInteraction = {
        interaction_id: `int:${Date.now()}`,
        interaction_type: 'RenameItem',
        interaction_type_revision: SHRAPNEL_REVISIONS.RenameItem,
        actor: { id: 'operator-1', role: 'admin' },
        subject: { id: `${sourcePath.join('/')}/${itemName}`, concept: 'File' },
        context: { pane_id: 1, source_path: sourcePath },
        payload: { old_name: itemName, new_name: candidateName.trim() },
        correlation_id: `corr:${Date.now()}`,
        timestamp: new Date().toISOString(),
      };

      const result = await director.executeRename(interaction);
      setExecutionResult(result);

      if (result.status === 'completed') {
        setTimeout(() => {
          onSuccess(itemName, candidateName.trim());
          onClose();
        }, 1200);
      }
    } catch (err) {
      console.error('Governed rename execution error:', err);
    } finally {
      setExecuting(false);
    }
  };

  // Helper scenario presets to quickly demonstrate SolScript guard reactions
  const applyPreset = (preset: 'collision' | 'illegal' | 'empty' | 'valid') => {
    if (preset === 'collision') {
      const sibling = preview?.siblings?.[0] || 'beta.txt';
      setCandidateName(sibling);
    } else if (preset === 'illegal') {
      setCandidateName(`${itemName.replace(/\.[^/.]+$/, '')}/illegal:name.txt`);
    } else if (preset === 'empty') {
      setCandidateName('   ');
    } else if (preset === 'valid') {
      const dotIdx = itemName.lastIndexOf('.');
      if (dotIdx > 0) {
        const namePart = itemName.slice(0, dotIdx);
        const ext = itemName.slice(dotIdx);
        setCandidateName(`${namePart}_governed${ext}`);
      } else {
        setCandidateName(`${itemName}_governed`);
      }
    }
  };

  const isCompleted = executionResult?.status === 'completed';
  const isRefused = executionResult?.status === 'refused' || (preview && !preview.allowed);
  const pathDisplay = sourcePath.length === 0 ? 'Root' : `/${sourcePath.join('/')}`;

  return (
    <div
      id="governed-rename-dialog-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fade-in text-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget && !executing) onClose();
      }}
    >
      <div
        id="governed-rename-dialog"
        className="w-full max-w-2xl bg-[rgb(var(--color-surface-dialog))] border border-[rgb(var(--color-border-base))] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[rgb(var(--color-border-base))] bg-[rgb(var(--color-surface-muted))]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm text-[rgb(var(--color-text-base))]">
                  Governed Action Staging: RenameItem
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  @nexus/solscript
                </span>
              </div>
              <p className="text-[11px] text-[rgb(var(--color-text-muted))] mt-0.5">
                Real-time ResolutionInterpreter check guards & Aegis constitutional transition policy
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={executing}
            title="Cancel and close (Esc)"
            className="p-1.5 rounded-lg hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-muted))] transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Target File Context */}
          <div className="p-3 rounded-lg bg-[rgb(var(--color-surface-muted))] border border-[rgb(var(--color-border-base))] flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-1.5 rounded bg-[rgb(var(--color-surface))] text-[rgb(var(--color-accent))] border border-[rgb(var(--color-border-base))]">
                {itemType === 'folder' ? <Folder className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-mono text-[rgb(var(--color-text-muted))] truncate">
                  Scope: <span className="font-semibold text-[rgb(var(--color-text-base))]">{pathDisplay}</span>
                </div>
                <div className="font-mono text-xs font-semibold text-[rgb(var(--color-text-base))] truncate">
                  Subject: {itemName}
                </div>
              </div>
            </div>

            {/* ReadSet Digest Badge */}
            {preview && (
              <div className="flex items-center gap-1.5 shrink-0">
                <div
                  title={`Pinned Read-Set Digest:\n${preview.digest}`}
                  className="flex items-center gap-1 font-mono text-[10px] px-2 py-1 rounded bg-[rgb(var(--color-surface))] border border-[rgb(var(--color-border-base))] text-[rgb(var(--color-text-muted))]"
                >
                  <Fingerprint className="w-3 h-3 text-blue-500" />
                  <span>{preview.digest.slice(0, 15)}...{preview.digest.slice(-6)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(preview.digest, 'digest')}
                  title="Copy Pinned Read-Set Digest"
                  className="p-1 rounded hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-muted))]"
                >
                  {copiedDigest ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            )}
          </div>

          {/* Interactive Candidate Input & Quick Test Presets */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="governed-rename-input" className="font-semibold text-xs text-[rgb(var(--color-text-base))] flex items-center gap-1.5">
                <FileEdit className="w-3.5 h-3.5 text-blue-500" />
                <span>Proposed New Name (Evaluated in Real-Time):</span>
              </label>
              {evaluating && (
                <span className="text-[10px] text-blue-500 flex items-center gap-1">
                  <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                  evaluating guards...
                </span>
              )}
            </div>

            <input
              id="governed-rename-input"
              ref={inputRef}
              type="text"
              value={candidateName}
              onChange={(e) => setCandidateName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && preview?.allowed && !executing) {
                  e.preventDefault();
                  handleExecute();
                }
              }}
              placeholder="Enter new item name..."
              disabled={executing || isCompleted}
              className={`w-full px-3 py-2 rounded-lg font-mono text-sm bg-[rgb(var(--color-surface))] text-[rgb(var(--color-text-base))] border transition-all focus:outline-none ${
                preview?.allowed
                  ? 'border-emerald-500/50 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20'
                  : 'border-rose-500/50 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20'
              }`}
            />

            {/* Quick Test Scenario Trigger Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] text-[rgb(var(--color-text-muted))] flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                Test Scenarios:
              </span>
              <button
                type="button"
                onClick={() => applyPreset('valid')}
                disabled={executing || isCompleted}
                className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 transition-colors"
              >
                ✔ Valid Version
              </button>
              <button
                type="button"
                onClick={() => applyPreset('collision')}
                disabled={executing || isCompleted}
                className="px-2 py-0.5 rounded text-[10px] bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 transition-colors"
              >
                ✖ Sibling Collision
              </button>
              <button
                type="button"
                onClick={() => applyPreset('illegal')}
                disabled={executing || isCompleted}
                className="px-2 py-0.5 rounded text-[10px] bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20 transition-colors"
              >
                ✖ Illegal Characters
              </button>
              <button
                type="button"
                onClick={() => applyPreset('empty')}
                disabled={executing || isCompleted}
                className="px-2 py-0.5 rounded text-[10px] bg-gray-500/10 hover:bg-gray-500/20 text-gray-600 dark:text-gray-400 border border-gray-500/20 transition-colors"
              >
                ✖ Empty Name
              </button>
            </div>
          </div>

          {/* Live SolScript Guard Matrix */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-xs text-[rgb(var(--color-text-base))] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>SolScript Evaluation Matrix ({preview?.guards.length ?? 4} Aegis Check Guards):</span>
              </h4>
              <span className="text-[10px] font-mono text-[rgb(var(--color-text-muted))]">
                {preview?.allowed ? (
                  <span className="text-emerald-500 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> 4/4 GUARDS PASSED
                  </span>
                ) : (
                  <span className="text-rose-500 font-semibold flex items-center gap-1">
                    <XCircle className="w-3 h-3" /> REFUSAL ENFORCED
                  </span>
                )}
              </span>
            </div>

            <div className="space-y-2">
              {preview?.guards.map((guard) => {
                const passed = guard.passed;
                return (
                  <div
                    key={guard.ruleId}
                    className={`p-3 rounded-lg border transition-all ${
                      passed
                        ? 'bg-emerald-500/5 border-emerald-500/20'
                        : 'bg-rose-500/5 border-rose-500/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <div
                          className={`mt-0.5 p-1 rounded flex items-center justify-center shrink-0 ${
                            passed
                              ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                              : 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {passed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-semibold text-xs text-[rgb(var(--color-text-base))]">
                              {guard.name.toUpperCase()}
                            </span>
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[rgb(var(--color-surface))] text-[rgb(var(--color-text-muted))] border border-[rgb(var(--color-border-base))]">
                              {guard.ruleId}
                            </span>
                            <span className="text-[9px] font-semibold uppercase px-1 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
                              {guard.severity}
                            </span>
                          </div>
                          <p className="text-[11px] text-[rgb(var(--color-text-muted))] mt-0.5">
                            {guard.description}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {passed ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                            <Check className="w-3 h-3" /> PASS
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-semibold text-[10px] px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                            <X className="w-3 h-3" /> REFUSED
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Feedback message */}
                    <div
                      className={`mt-2 px-2.5 py-1.5 rounded text-[11px] font-mono flex items-center gap-1.5 ${
                        passed
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                          : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 font-medium'
                      }`}
                    >
                      {passed ? (
                        <>
                          <CheckCheck className="w-3 h-3 text-emerald-500 shrink-0" />
                          <span>{guard.message}</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          <span>Refusal: {guard.message}</span>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Success / Execution Receipt Banner */}
          {executionResult && (
            <div
              className={`p-3.5 rounded-lg border text-xs space-y-2 animate-fade-in ${
                isCompleted
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-200'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold">
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-500" />
                  )}
                  <span>
                    {isCompleted
                      ? 'Transition Completed Successfully'
                      : `Transition Refused: ${executionResult.refusal_reason}`}
                  </span>
                </div>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[rgb(var(--color-surface))] border border-[rgb(var(--color-border-base))]">
                  Status: {executionResult.status}
                </span>
              </div>

              {executionResult.keychain_checkpoint && (
                <div className="p-2 rounded bg-[rgb(var(--color-surface))] border border-[rgb(var(--color-border-base))] font-mono text-[10px] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[rgb(var(--color-text-muted))] flex items-center gap-1">
                      <KeyRound className="w-3 h-3 text-amber-500" /> Keychain Checkpoint:
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopy(executionResult.keychain_checkpoint!.checkpoint_id, 'checkpoint')
                      }
                      className="hover:text-[rgb(var(--color-text-base))] flex items-center gap-1"
                    >
                      {copiedCheckpoint ? (
                        <Check className="w-2.5 h-2.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-2.5 h-2.5" />
                      )}
                      Copy ID
                    </button>
                  </div>
                  <div className="text-[rgb(var(--color-text-base))] truncate font-bold">
                    {executionResult.keychain_checkpoint.checkpoint_id}
                  </div>
                  <div className="text-[rgb(var(--color-text-muted))] text-[9px]">
                    Evidence ID: {executionResult.evidence?.evidence_id || 'recorded'} (Digest: {executionResult.keychain_checkpoint.read_set_digest.slice(0, 20)}...)
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-[rgb(var(--color-border-base))] bg-[rgb(var(--color-surface-muted))]">
          <div className="flex items-center gap-2">
            {preview?.allowed ? (
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                <Unlock className="w-3.5 h-3.5" /> Ready for authorized execution
              </span>
            ) : (
              <span className="text-[11px] text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1">
                <Lock className="w-3.5 h-3.5" /> Policy guard blocks transition
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={executing}
              className="px-3.5 py-1.5 rounded-lg border border-[rgb(var(--color-border-base))] hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-base))] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleExecute}
              disabled={!preview?.allowed || executing || isCompleted}
              className={`px-4 py-1.5 rounded-lg font-medium flex items-center gap-1.5 shadow-sm transition-all ${
                preview?.allowed && !isCompleted
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-95'
                  : 'bg-gray-400/20 text-gray-400 dark:text-gray-500 border border-gray-400/20 cursor-not-allowed opacity-60'
              }`}
            >
              {executing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Committing...</span>
                </>
              ) : isCompleted ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Renamed</span>
                </>
              ) : preview?.allowed ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Commit Governed Rename</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Execution Blocked</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
