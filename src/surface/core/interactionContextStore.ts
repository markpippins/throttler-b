/**
 * Ephemeral InteractionContextStore (Phase 1 Seam Decoupling)
 *
 * Invariants:
 * 1. Strictly ephemeral, in-memory state for UI interactions.
 * 2. Never emits network traffic or mutates governance ledgers.
 * 3. Never produces admission receipts or creates authority by mouse gesture.
 * 4. Freezes immutable snapshots on demand via createEvaluationSnapshot().
 */

import { EphemeralUIContext, EvaluationSnapshot, EpistemicEnvelope } from '../types';
import { createEvaluationSnapshot } from './contextSnapshot';

export type ContextListener = (ctx: Readonly<EphemeralUIContext>) => void;

export class EphemeralInteractionContextStore {
  private context: EphemeralUIContext;
  private listeners: Set<ContextListener> = new Set();

  constructor(initialSurfaceId: string = 'main') {
    this.context = {
      activeSurfaceId: initialSurfaceId,
      viewportPan: { x: 0, y: 0 },
      zoomLevel: 1.0,
      localTimestamp: Date.now(),
    };
  }

  /**
   * Retrieves the current ephemeral context (shallow copy).
   */
  get(): Readonly<EphemeralUIContext> {
    return { ...this.context };
  }

  /**
   * Subscribes to context changes.
   */
  subscribe(listener: ContextListener): () => void {
    this.listeners.add(listener);
    listener(this.get());
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Updates ephemeral context. Purely in-memory; no network calls.
   */
  update(partial: Partial<EphemeralUIContext>): void {
    this.context = {
      ...this.context,
      ...partial,
      localTimestamp: Date.now(),
    };
    this.notify();
  }

  /**
   * Resets ephemeral state while preserving the active surface.
   */
  reset(): void {
    this.context = {
      activeSurfaceId: this.context.activeSurfaceId,
      viewportPan: { x: 0, y: 0 },
      zoomLevel: 1.0,
      localTimestamp: Date.now(),
    };
    this.notify();
  }

  /**
   * Freezes and returns an immutable EvaluationSnapshot for SOLScript or governance evaluation.
   */
  getSnapshot(
    proposedMutation?: {
      actionType: string;
      targetId: string;
      parameters: Record<string, unknown>;
    },
    envelope: EpistemicEnvelope = 'live'
  ): EvaluationSnapshot {
    return createEvaluationSnapshot(this.context, proposedMutation, envelope);
  }

  // --- Convenience ephemeral action helpers (Category A) ---

  onNavigate(surfaceId: string): void {
    this.update({
      activeSurfaceId: surfaceId,
      focusedControlId: undefined,
      selectedEntityId: undefined,
      selectedRowIndex: undefined,
    });
  }

  onSelect(entityId: string, rowIndex?: number): void {
    this.update({
      selectedEntityId: entityId,
      selectedRowIndex: rowIndex,
    });
  }

  onFocus(controlId: string): void {
    this.update({ focusedControlId: controlId });
  }

  onBlur(controlId: string): void {
    if (this.context.focusedControlId === controlId) {
      this.update({ focusedControlId: undefined });
    }
  }

  onPanZoom(pan: { x: number; y: number }, zoom: number): void {
    this.update({
      viewportPan: pan,
      zoomLevel: Math.max(0.1, Math.min(5.0, zoom)),
    });
  }

  onFilter(filter: Record<string, unknown>): void {
    this.update({ activeFilter: filter });
  }

  onSort(field: string, direction: 'asc' | 'desc'): void {
    this.update({ activeSort: { field, direction } });
  }

  private notify(): void {
    const current = this.get();
    for (const listener of this.listeners) {
      try {
        listener(current);
      } catch (err) {
        console.error('[EphemeralInteractionContextStore] Listener error:', err);
      }
    }
  }
}

// Global default singleton for the surface workspace
export const globalInteractionContextStore = new EphemeralInteractionContextStore('main');
