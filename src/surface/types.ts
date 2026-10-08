import { ReactNode } from 'react';
import type { CapabilityId, DesignIR, ViewSpec } from '@nexus/projection-core';

export type RelicArchetype =
  | 'react-component'
  | 'data-vis'
  | 'interactive-tool'
  | 'control-surface'
  | 'canvas-element';

export interface RelicInput {
  name: string;
  type: string;
  defaultValue?: unknown;
}

export interface RelicEndpoint {
  raw: string;
  method: string;
  signature: string;
}

export interface AbsorbedWidget {
  id: string;
  name: string;
  description: string;
  tags: string[];
  archetype: RelicArchetype;
  componentName: string;
  inputs: RelicInput[];
  endpoints: RelicEndpoint[];
  capabilities: CapabilityId[];
  code: string;
  render: (props: Record<string, unknown>) => ReactNode;
  defaultProps?: Record<string, unknown>;
  mockData?: Record<string, unknown>;
}

export interface OntologicalSpaceNode {
  id: string;
  path: string[];
  title: string;
  description: string;
  iconName: string;
  category: 'inventory' | 'compiler' | 'governance' | 'projection';
  designIr?: DesignIR;
  viewSpec?: ViewSpec;
  associatedWidgetIds: string[];
  metadata?: Record<string, unknown>;
}

export type SurfaceRecomposedTab =
  | 'unified-toolspace'
  | 'relics'
  | 'viewspec'
  | 'governance'
  | 'vfs-projection'
  | 'registry';

/**
 * Epistemic Authority Envelope
 * Strictly controls provenance and gating only, NEVER visual health.
 */
export type EpistemicEnvelope = 'live' | 'degraded' | 'unknown' | 'demo';

/**
 * Server-Witnessed Run Status
 */
export type WitnessedServerStatus =
  | 'complete'
  | 'refusal'
  | 'stale'
  | 'drift'
  | 'duplicate_retry'
  | 'missing_lineage'
  | 'unknown';

/**
 * Visual Treatment derived from Envelope × ServerStatus × RefusalReason
 */
export interface VisualTreatment {
  envelope: EpistemicEnvelope;
  serverStatus: WitnessedServerStatus;
  statusBadge: string;
  badgeTone: 'emerald' | 'amber' | 'rose' | 'neutral' | 'violet';
  borderStyle: string;
  glyph: string;
  isBlocking: boolean;
  refusalPredicate?: string;
  caption: string;
}

/**
 * Mutation Action Classification
 */
export type ActionCategory =
  | 'category-a-ephemeral'
  | 'category-b-governed'
  | 'semantic-evaluate';

/**
 * SOLScript Evaluation Disposition (Evaluation != Admission)
 */
export type EvaluationDisposition = 'Asserted' | 'Disputed' | 'Rejected' | 'Stale';

/**
 * Ephemeral Presentation Context
 * Strictly client-side, in-memory, non-governed.
 */
export interface EphemeralUIContext {
  activeSurfaceId: string;
  focusedControlId?: string;
  selectedEntityId?: string;
  selectedRowIndex?: number;
  viewportPan: { x: number; y: number };
  zoomLevel: number;
  activeFilter?: Record<string, unknown>;
  activeSort?: { field: string; direction: 'asc' | 'desc' };
  localTimestamp: number;
}

/**
 * Immutable Evaluation Snapshot frozen before sending to SOLScript
 */
export interface EvaluationSnapshot {
  readonly snapshotId: string;
  readonly capturedAt: string;
  readonly clientDigest: string;
  readonly uiContext: Readonly<EphemeralUIContext>;
  readonly proposedMutation?: Readonly<{
    actionType: string;
    targetId: string;
    parameters: Record<string, unknown>;
  }>;
  readonly stateEnvelope: EpistemicEnvelope;
}

/**
 * Cryptographic Admission Receipt from PEB Governance Director
 */
export interface AdmissionReceipt {
  readonly receiptId: string;
  readonly issuedAt: string;
  readonly evaluationDisposition: EvaluationDisposition;
  readonly snapshotDigest: string;
  readonly doctrinePolicyId: string;
  readonly signature: string;
  readonly admitted: boolean;
  readonly refusalReason?: string;
}

/**
 * Governed Mutation Execution Request
 */
export interface GovernedMutationRequest {
  readonly mutationId: string;
  readonly actionType: string;
  readonly targetId: string;
  readonly parameters: Record<string, unknown>;
  readonly snapshot: EvaluationSnapshot;
  readonly admissionReceipt?: AdmissionReceipt;
}
