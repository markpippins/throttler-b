/**
 * Resolution & Keychains Governance
 * Maintains identity, evidence chains, valid-time/record-time, and Keychains snapshots.
 */

import { GuardEvaluationResult } from '../solscript/evaluator';
import { ExecutionReceipt } from '../vision/executor';
import { MutationState } from '../aegis/registry';

export interface ResolutionEvidence {
  evidence_id: string;
  interaction_id: string;
  correlation_id: string;
  subject_id: string;
  guards: GuardEvaluationResult[];
  receipt?: ExecutionReceipt;
  read_set_digest: string;
  fingerprint?: string;
  recorded_at: string;
}

export interface KeychainsCheckpoint {
  checkpoint_id: string;
  transition: string;
  from_state: MutationState;
  to_state: MutationState;
  read_set_digest: string;
  evidence_id: string;
  created_at: string;
}

export interface GovernedTransitionResult {
  status: 'completed' | 'refused' | 'failed';
  from_state: MutationState;
  to_state: MutationState;
  guards: GuardEvaluationResult[];
  refusal_reason?: string;
  execution_receipt?: ExecutionReceipt;
  evidence?: ResolutionEvidence;
  keychain_checkpoint?: KeychainsCheckpoint;
}

export class ResolutionGovernanceLedger {
  private evidenceLog: ResolutionEvidence[] = [];
  private checkpoints: KeychainsCheckpoint[] = [];

  recordEvidence(
    interactionId: string,
    correlationId: string,
    subjectId: string,
    readSetDigest: string,
    guards: GuardEvaluationResult[],
    receipt?: ExecutionReceipt
  ): ResolutionEvidence {
    const evidence: ResolutionEvidence = {
      evidence_id: `evi:${Date.now()}:${Math.random().toString(36).substring(2, 7)}`,
      interaction_id: interactionId,
      correlation_id: correlationId,
      subject_id: subjectId,
      guards,
      receipt,
      read_set_digest: readSetDigest,
      fingerprint: readSetDigest,
      recorded_at: new Date().toISOString(),
    };
    this.evidenceLog.push(evidence);
    return evidence;
  }

  createKeychainsCheckpoint(
    transition: string,
    fromState: MutationState,
    toState: MutationState,
    readSetDigest: string,
    evidenceId: string
  ): KeychainsCheckpoint {
    const checkpoint: KeychainsCheckpoint = {
      checkpoint_id: `kc:${Date.now()}:${Math.random().toString(36).substring(2, 7)}`,
      transition,
      from_state: fromState,
      to_state: toState,
      read_set_digest: readSetDigest,
      evidence_id: evidenceId,
      created_at: new Date().toISOString(),
    };
    this.checkpoints.push(checkpoint);
    return checkpoint;
  }

  getRecentEvidence(): ResolutionEvidence[] {
    return [...this.evidenceLog];
  }

  getRecentCheckpoints(): KeychainsCheckpoint[] {
    return [...this.checkpoints];
  }
}
