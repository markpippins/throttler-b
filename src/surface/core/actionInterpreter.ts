/**
 * Governed ActionInterpreter (Phase 1 Seam Decoupling)
 *
 * Implements strict tripartite decoupling:
 * 1. Category A (ephemeral): Handled in-memory by InteractionContextStore.
 * 2. Semantic Evaluate: Freezes immutable snapshot, evaluates SOLScript rules (Asserted != Admitted).
 * 3. Category B (governed mutation): Requires explicit PEB Admission Receipt before commit.
 */

import {
  ActionCategory,
  EvaluationDisposition,
  EvaluationSnapshot,
  AdmissionReceipt,
  GovernedMutationRequest,
} from '../types';
import {
  classifyAction,
  verifyAdmissionRequirement,
  mintAdmissionReceipt,
} from './contextSnapshot';
import { EphemeralInteractionContextStore } from './interactionContextStore';

export interface ActionPayload {
  type: string;
  targetId?: string;
  parameters?: Record<string, unknown>;
  admissionReceipt?: AdmissionReceipt;
}

export interface ActionExecutionResult {
  category: ActionCategory;
  success: boolean;
  actionType: string;
  snapshot?: EvaluationSnapshot;
  evaluationDisposition?: EvaluationDisposition;
  admissionReceipt?: AdmissionReceipt;
  error?: string;
  refusalReason?: string;
  mutationCommitted?: boolean;
}

export type MutationHandler = (
  request: GovernedMutationRequest
) => Promise<{ success: boolean; result?: unknown; error?: string }>;

export class GovernedActionInterpreter {
  private mutationHandlers: Map<string, MutationHandler> = new Map();

  constructor(private contextStore: EphemeralInteractionContextStore) {}

  /**
   * Registers a backend or state mutation handler for a Category B action type.
   */
  registerMutationHandler(actionType: string, handler: MutationHandler): void {
    this.mutationHandlers.set(actionType.toLowerCase().trim(), handler);
  }

  /**
   * Dispatches and executes an action with strict classification and admission gating.
   */
  async execute(action: ActionPayload): Promise<ActionExecutionResult> {
    const category = classifyAction(action.type);

    switch (category) {
      case 'category-a-ephemeral':
        return this.executeEphemeral(action);

      case 'semantic-evaluate':
        return this.executeSemanticEvaluation(action);

      case 'category-b-governed':
        return this.executeGovernedMutation(action);

      default:
        return {
          category: 'category-a-ephemeral',
          success: false,
          actionType: action.type,
          error: `Unrecognized action category for '${action.type}'`,
        };
    }
  }

  /**
   * Category A: Ephemeral presentation gestures.
   * Handled purely in memory; zero network or governance overhead.
   */
  private executeEphemeral(action: ActionPayload): ActionExecutionResult {
    const params = action.parameters || {};

    switch (action.type.toLowerCase().trim()) {
      case 'navigate':
        if (action.targetId) {
          this.contextStore.onNavigate(action.targetId);
        }
        break;

      case 'select':
        if (action.targetId) {
          const rowIndex = typeof params.rowIndex === 'number' ? params.rowIndex : undefined;
          this.contextStore.onSelect(action.targetId, rowIndex);
        }
        break;

      case 'filter':
        this.contextStore.onFilter(params);
        break;

      case 'sort':
        if (typeof params.field === 'string') {
          const direction = params.direction === 'desc' ? 'desc' : 'asc';
          this.contextStore.onSort(params.field, direction);
        }
        break;

      case 'inspect':
        if (action.targetId) {
          this.contextStore.onFocus(action.targetId);
        }
        break;

      case 'pan':
      case 'zoom':
        if (params.pan || typeof params.zoom === 'number') {
          const current = this.contextStore.get();
          const pan = (params.pan as { x: number; y: number }) || current.viewportPan;
          const zoom = typeof params.zoom === 'number' ? params.zoom : current.zoomLevel;
          this.contextStore.onPanZoom(pan, zoom);
        }
        break;

      case 'group':
        // Assembling a visual group is purely a Category A spatial gesture (F-2).
        // It never mints authority or creates an execution boundary without an explicit admission receipt.
        if (action.targetId) {
          this.contextStore.update({
            selectedEntityId: action.targetId,
          });
        }
        break;

      default:
        // Generic ephemeral update
        this.contextStore.update({
          focusedControlId: action.targetId,
        });
        break;
    }

    return {
      category: 'category-a-ephemeral',
      success: true,
      actionType: action.type,
    };
  }

  /**
   * Semantic Evaluation: Evaluates SOLScript proposition rules.
   * Freezes an immutable snapshot; proves logical validity without admitting state.
   */
  private async executeSemanticEvaluation(action: ActionPayload): Promise<ActionExecutionResult> {
    const snapshot = this.contextStore.getSnapshot(
      action.targetId
        ? {
            actionType: action.type,
            targetId: action.targetId,
            parameters: action.parameters || {},
          }
        : undefined
    );

    // Evaluate proposition: here we simulate deterministic check
    // If target name contains forbidden chars, evaluation rejects; otherwise asserts validity.
    const targetName = String(action.parameters?.targetName || action.targetId || '');
    const isForbidden = targetName.includes('..') || targetName.includes('/') || targetName.startsWith('.');

    const disposition: EvaluationDisposition = isForbidden ? 'Rejected' : 'Asserted';

    return {
      category: 'semantic-evaluate',
      success: disposition === 'Asserted',
      actionType: action.type,
      snapshot,
      evaluationDisposition: disposition,
      refusalReason: isForbidden ? 'Proposition contains invalid path traversal tokens.' : undefined,
    };
  }

  /**
   * Category B: Governed Domain Mutation.
   * Strictly enforces: Asserted != Admitted. Requires an explicit PEB Admission Receipt.
   */
  private async executeGovernedMutation(action: ActionPayload): Promise<ActionExecutionResult> {
    const snapshot = this.contextStore.getSnapshot({
      actionType: action.type,
      targetId: action.targetId || 'unknown_target',
      parameters: action.parameters || {},
    });

    const mutationRequest: GovernedMutationRequest = {
      mutationId: `mut_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      actionType: action.type,
      targetId: action.targetId || 'unknown_target',
      parameters: action.parameters || {},
      snapshot,
      admissionReceipt: action.admissionReceipt,
    };

    // 1. Verify Admission Requirement
    const verification = verifyAdmissionRequirement(mutationRequest);
    if (!verification.allowed) {
      return {
        category: 'category-b-governed',
        success: false,
        actionType: action.type,
        snapshot,
        refusalReason: verification.violationReason,
        error: verification.violationReason,
        mutationCommitted: false,
      };
    }

    // 2. Execute through registered mutation handler
    const handler = this.mutationHandlers.get(action.type.toLowerCase().trim());
    if (!handler) {
      return {
        category: 'category-b-governed',
        success: false,
        actionType: action.type,
        snapshot,
        admissionReceipt: action.admissionReceipt,
        error: `No registered mutation handler for Category B action '${action.type}'`,
        mutationCommitted: false,
      };
    }

    try {
      const handlerResult = await handler(mutationRequest);
      return {
        category: 'category-b-governed',
        success: handlerResult.success,
        actionType: action.type,
        snapshot,
        admissionReceipt: action.admissionReceipt,
        mutationCommitted: handlerResult.success,
        error: handlerResult.error,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        category: 'category-b-governed',
        success: false,
        actionType: action.type,
        snapshot,
        admissionReceipt: action.admissionReceipt,
        error: `Mutation handler threw exception: ${msg}`,
        mutationCommitted: false,
      };
    }
  }
}
