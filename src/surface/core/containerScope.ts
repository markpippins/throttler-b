/**
 * Unified Container Scope & Tripartite Boundary Model (Phase 2 Canvas Architecture)
 *
 * Unifies:
 * - SOL Frame Dimensions (scope of invariant reasoning)
 * - Aegis Visual Groups (state machine hierarchical grouping)
 * - Surface-UI Component Sandboxes (layout & execution boundaries)
 *
 * Implements Mechanic U-1 & Architect Condition 2:
 * Container types are strictly distinguished across at least 2 independent visual channels.
 * Admission semantics (governance-boundary) NEVER share visual channels with dev/demo (execution-sandbox).
 */

import { EpistemicEnvelope } from '../types';

export type ContainerType = 'governance-boundary' | 'execution-sandbox' | 'spatial-group';

export interface ContainerStylingChannels {
  borderStyle: string;
  surfaceTint: string;
  badgeGlyph: string;
  badgeLabel: string;
  badgeClass: string;
  authorityLevel: 'authoritative-admission' | 'isolated-sandbox' | 'ephemeral-presentation';
}

export interface UnifiedContainerScope {
  id: string;
  name: string;
  containerType: ContainerType;
  // Spatial Geometry
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  // Contained element IDs
  elementIds: string[];
  // SOL Semantic Evaluation Frame
  solFrame?: {
    scopeId: string;
    axioms: string[];
    isolatedAssumptions: boolean;
  };
  // Aegis State Container
  aegisSubStateIds?: string[];
  // Epistemic Envelope
  stateEnvelope: EpistemicEnvelope;
  // Metadata & tags
  metadata?: Record<string, unknown>;
}

/**
 * Derives multi-channel styling for container boundaries.
 * Guarantees ≥2 independent perceptual channels (REC-C1).
 */
export function getContainerStylingChannels(type: ContainerType): ContainerStylingChannels {
  switch (type) {
    case 'governance-boundary':
      return {
        // Channel 1: Double-line border with distinct steel/emerald hue
        borderStyle: 'border-2 border-double border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.15)]',
        // Channel 2: Steel tint with subtle grid overlay
        surfaceTint: 'bg-emerald-950/20 backdrop-blur-sm',
        badgeGlyph: '🛡️',
        badgeLabel: 'GOVERNANCE BOUNDARY · PEB ADMISSION REQUIRED',
        badgeClass: 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 font-mono font-bold',
        authorityLevel: 'authoritative-admission',
      };

    case 'execution-sandbox':
      return {
        // Channel 1: Dashed border with distinct amber/yellow hue
        borderStyle: 'border-2 border-dashed border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.1)]',
        // Channel 2: Amber warm tint with diagonal hazard striping feel
        surfaceTint: 'bg-amber-950/15 backdrop-blur-sm',
        badgeGlyph: '🧪',
        badgeLabel: 'EXECUTION SANDBOX · ISOLATED / DEMO',
        badgeClass: 'bg-amber-950/80 border border-amber-500/50 text-amber-300 font-mono font-bold',
        authorityLevel: 'isolated-sandbox',
      };

    case 'spatial-group':
    default:
      return {
        // Channel 1: Thin single hairline border
        borderStyle: 'border border-slate-700/60',
        // Channel 2: Neutral translucent canvas
        surfaceTint: 'bg-slate-900/40',
        badgeGlyph: '📁',
        badgeLabel: 'VISUAL GROUP · EPHEMERAL',
        badgeClass: 'bg-slate-800/80 border border-slate-700 text-slate-400 font-mono',
        authorityLevel: 'ephemeral-presentation',
      };
  }
}
