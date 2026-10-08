/**
 * Context Snapshot & Epistemic Authority Engine (Phase 1 Seam Decoupling)
 *
 * Enforces:
 * 1. Separation of Assessment from Admission Authority (Asserted != Admitted).
 * 2. Immutable freeze of ephemeral UI context prior to SOLScript rule evaluation.
 * 3. Authority envelope derivation strictly via: Envelope × ServerStatus × RefusalReason.
 * 4. Mutation classification: Category A (ephemeral) vs Category B (governed).
 */

import {
  EphemeralUIContext,
  EvaluationSnapshot,
  EpistemicEnvelope,
  WitnessedServerStatus,
  VisualTreatment,
  ActionCategory,
  GovernedMutationRequest,
  AdmissionReceipt,
} from '../types';
import { computeSha256DigestSync } from '../../governance/adapters/throttlerVfsAdapter';

/**
 * Deep freezes an object to guarantee immutability.
 */
function deepFreeze<T>(obj: T): Readonly<T> {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  Object.freeze(obj);
  for (const key of Object.keys(obj)) {
    const val = (obj as Record<string, unknown>)[key];
    if (val !== null && typeof val === 'object' && !Object.isFrozen(val)) {
      deepFreeze(val);
    }
  }
  return obj as Readonly<T>;
}

/**
 * Derives the visual treatment based on the ratified keying matrix:
 * Visual Treatment <- Envelope × ServerStatus × RefusalReason
 *
 * Invariant (F-1): Envelope controls provenance/gating only.
 * `live` means server-anchored and current; it NEVER means "healthy."
 * A live-anchored refusal keeps the blocking refusal treatment and verbatim predicate.
 */
export function deriveVisualTreatment(
  envelope: EpistemicEnvelope,
  serverStatus: WitnessedServerStatus,
  refusalReason?: string
): VisualTreatment {
  // 1. Refusal is authoritative and live, but strictly BLOCKING with managed rose treatment
  if (serverStatus === 'refusal') {
    return {
      envelope: 'live',
      serverStatus: 'refusal',
      statusBadge: 'REFUSED (LIVE)',
      badgeTone: 'rose',
      borderStyle: 'border-rose-500/40 bg-rose-950/20 text-rose-300',
      glyph: '🛑',
      isBlocking: true,
      refusalPredicate: refusalReason || 'Guard proposition evaluation rejected by doctrine.',
      caption: `LIVE · server-witnessed refusal · predicate=${refusalReason || 'doctrine_refusal'}`,
    };
  }

  // 2. Demo / Fixture (explicitly non-authoritative)
  if (envelope === 'demo') {
    return {
      envelope: 'demo',
      serverStatus: 'unknown',
      statusBadge: 'DEMO · FIXTURE',
      badgeTone: 'violet',
      borderStyle: 'border-dashed border-violet-500/40 bg-violet-950/20 text-violet-300',
      glyph: '🧪',
      isBlocking: false,
      caption: 'DEMO · fixture · non-authoritative',
    };
  }

  // 3. Complete (Authoritative & healthy)
  if (envelope === 'live' && serverStatus === 'complete') {
    return {
      envelope: 'live',
      serverStatus: 'complete',
      statusBadge: 'LIVE',
      badgeTone: 'emerald',
      borderStyle: 'border-emerald-500/30 bg-emerald-950/10 text-emerald-300',
      glyph: '🟢',
      isBlocking: false,
      caption: 'LIVE · server-witnessed · current',
    };
  }

  // 4. Missing Lineage -> UNKNOWN (Ontologist ruling: unverifiable provenance cannot gate as degraded)
  if (serverStatus === 'missing_lineage' || envelope === 'unknown') {
    return {
      envelope: 'unknown',
      serverStatus: serverStatus === 'missing_lineage' ? 'missing_lineage' : 'unknown',
      statusBadge: 'UNKNOWN LINEAGE',
      badgeTone: 'neutral',
      borderStyle: 'border-dashed border-slate-500/40 bg-slate-900/40 text-slate-400',
      glyph: '⚪',
      isBlocking: true,
      caption: 'UNKNOWN · unverifiable lineage · indeterminate provenance',
    };
  }

  // 5. Degraded variations (stale, drift, duplicate_retry)
  if (serverStatus === 'stale') {
    return {
      envelope: 'degraded',
      serverStatus: 'stale',
      statusBadge: 'STALE',
      badgeTone: 'amber',
      borderStyle: 'border-amber-500/40 bg-amber-950/20 text-amber-300',
      glyph: '⚠️',
      isBlocking: false,
      caption: 'DEGRADED · freshness threshold exceeded · server-derived',
    };
  }

  if (serverStatus === 'drift') {
    return {
      envelope: 'degraded',
      serverStatus: 'drift',
      statusBadge: 'DRIFT DETECTED',
      badgeTone: 'amber',
      borderStyle: 'border-amber-500/40 bg-amber-950/20 text-amber-300',
      glyph: '⚠️',
      isBlocking: false,
      caption: 'DEGRADED · baseline drift detected · verification required',
    };
  }

  if (serverStatus === 'duplicate_retry') {
    return {
      envelope: 'degraded',
      serverStatus: 'duplicate_retry',
      statusBadge: 'RETRYING',
      badgeTone: 'amber',
      borderStyle: 'border-dotted border-amber-500/40 bg-amber-950/20 text-amber-300',
      glyph: '🔄',
      isBlocking: false,
      caption: 'DEGRADED · idempotency retry in-flight',
    };
  }

  // Default fallback to unknown
  return {
    envelope: 'unknown',
    serverStatus: 'unknown',
    statusBadge: 'UNKNOWN',
    badgeTone: 'neutral',
    borderStyle: 'border-slate-700 bg-slate-900/30 text-slate-400',
    glyph: '❓',
    isBlocking: false,
    caption: 'UNKNOWN · status unmeasured',
  };
}

/**
 * Classifies an action type into its strict architectural category:
 * - Category A: Ephemeral presentation gestures (never mints authority, zero governance overhead).
 * - Semantic Evaluate: Read-only SOLScript proposition checks.
 * - Category B: Governed domain mutation (requires explicit PEB admission affordance & receipt).
 */
export function classifyAction(actionType: string): ActionCategory {
  const normalized = actionType.toLowerCase().trim();

  // Category A: Ephemeral gestures (tabs, pan, zoom, select, filter, sort, visual group drag)
  const categoryAActions = new Set([
    'navigate',
    'select',
    'filter',
    'sort',
    'inspect',
    'pan',
    'zoom',
    'group', // Dragging a container around items assembles a visual group (F-2)
    'acknowledge',
    'dismiss',
    'compare',
    'drilldown',
  ]);

  if (categoryAActions.has(normalized)) {
    return 'category-a-ephemeral';
  }

  // Semantic Evaluation (read-only proposition evaluations)
  const semanticEvalActions = new Set([
    'evaluate',
    'check_guard',
    'preview_rename',
    'validate_proposition',
    'verify_lineage',
  ]);

  if (semanticEvalActions.has(normalized)) {
    return 'semantic-evaluate';
  }

  // Category B: Governed mutations
  return 'category-b-governed';
}

/**
 * Creates an immutable, deep-frozen EvaluationSnapshot.
 * Freezes the ephemeral UI context and proposed mutation before sending to SOLScript.
 */
export function createEvaluationSnapshot(
  uiContext: EphemeralUIContext,
  proposedMutation?: {
    actionType: string;
    targetId: string;
    parameters: Record<string, unknown>;
  },
  envelope: EpistemicEnvelope = 'live'
): EvaluationSnapshot {
  const capturedAt = new Date().toISOString();
  const snapshotId = `snap_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  // Create a clean, cloned payload for deterministic hashing
  const rawDigestPayload = {
    snapshotId,
    capturedAt,
    uiContext: {
      activeSurfaceId: uiContext.activeSurfaceId,
      focusedControlId: uiContext.focusedControlId,
      selectedEntityId: uiContext.selectedEntityId,
      selectedRowIndex: uiContext.selectedRowIndex,
      viewportPan: uiContext.viewportPan,
      zoomLevel: uiContext.zoomLevel,
    },
    proposedMutation: proposedMutation
      ? {
          actionType: proposedMutation.actionType,
          targetId: proposedMutation.targetId,
          parameters: proposedMutation.parameters,
        }
      : undefined,
  };

  const clientDigest = computeSha256DigestSync(JSON.stringify(rawDigestPayload));

  const snapshot: EvaluationSnapshot = {
    snapshotId,
    capturedAt,
    clientDigest,
    uiContext: deepFreeze({ ...uiContext }),
    proposedMutation: proposedMutation ? deepFreeze({ ...proposedMutation }) : undefined,
    stateEnvelope: envelope,
  };

  return deepFreeze(snapshot);
}

/**
 * Enforces the Invariant Seam:
 * Evaluates whether a Governed Mutation is permitted to execute.
 *
 * Invariant Rule:
 * 1. Category B actions MUST have an explicit, valid AdmissionReceipt.
 * 2. Asserted != Admitted: Even if SOLScript returns 'Asserted', admission is rejected
 *    if the PEB Governance Director did not issue an admitted receipt.
 */
export function verifyAdmissionRequirement(
  request: GovernedMutationRequest
): { allowed: boolean; violationReason?: string } {
  const category = classifyAction(request.actionType);

  // Category A does not require admission receipts
  if (category === 'category-a-ephemeral') {
    return { allowed: true };
  }

  // Category B MUST have an admission receipt
  if (!request.admissionReceipt) {
    return {
      allowed: false,
      violationReason: `[SEAM VIOLATION] Category-B mutation '${request.actionType}' attempted without an explicit PEB Admission Receipt. Asserted != Admitted.`,
    };
  }

  if (!request.admissionReceipt.admitted) {
    return {
      allowed: false,
      violationReason: `[ADMISSION WITHHELD] PEB Governance Director refused admission for '${request.actionType}': ${
        request.admissionReceipt.refusalReason || 'Policy check failed.'
      }`,
    };
  }

  // Verify that the receipt matches the snapshot digest
  if (request.admissionReceipt.snapshotDigest !== request.snapshot.clientDigest) {
    return {
      allowed: false,
      violationReason: `[DIGEST MISMATCH] Admission receipt digest '${request.admissionReceipt.snapshotDigest}' does not match client snapshot digest '${request.snapshot.clientDigest}'.`,
    };
  }

  return { allowed: true };
}

/**
 * Mints an admission receipt from the PEB Governance Director.
 */
export function mintAdmissionReceipt(params: {
  snapshot: EvaluationSnapshot;
  doctrinePolicyId: string;
  admitted: boolean;
  refusalReason?: string;
}): AdmissionReceipt {
  const receiptId = `rcpt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const issuedAt = new Date().toISOString();
  const evaluationDisposition = params.admitted ? 'Asserted' : 'Rejected';

  const signaturePayload = `${receiptId}:${params.snapshot.clientDigest}:${params.doctrinePolicyId}:${params.admitted}`;
  const signature = computeSha256DigestSync(signaturePayload);

  return deepFreeze({
    receiptId,
    issuedAt,
    evaluationDisposition,
    snapshotDigest: params.snapshot.clientDigest,
    doctrinePolicyId: params.doctrinePolicyId,
    signature,
    admitted: params.admitted,
    refusalReason: params.refusalReason,
  });
}
