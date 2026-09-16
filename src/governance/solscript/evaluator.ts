/**
 * SOLScript Semantic Evaluator
 * Evaluates deterministic `check` guards over a pinned read-set.
 * Authoritatively constructs and authorizes typed invocation requests.
 */

import { GuardDefinition, RENAME_ITEM_GUARDS } from '../aegis/registry';
import { RenameItemInteraction } from '../shrapnel/types';
import { SolStoragePort, ReadSetSnapshot } from './port';

export interface GuardEvaluationResult {
  kind: 'guard-evaluation';
  guard_id: string;
  condition: string;
  result: 'passed' | 'refused';
  reason?: string;
  read_set_digest: string;
  evaluator: 'solscript-evaluator';
  timestamp: string;
}

export interface AuthorizedInvocationRequest<T = any> {
  target: string;
  target_revision: string;
  actor: { id: string; role: string };
  subject_id: string;
  idempotency_key: string;
  correlation_id: string;
  causation_id?: string;
  parameters: T;
  authorized_at: string;
  read_set_digest: string;
}

export interface EvaluationOutcome {
  allowed: boolean;
  refusedGuard?: GuardEvaluationResult;
  passedGuards: GuardEvaluationResult[];
  invocationRequest?: AuthorizedInvocationRequest<{
    source_path: string[];
    old_name: string;
    new_name: string;
  }>;
}

const ILLEGAL_CHARS_REGEX = /[\\/:*?"<>|]/;

export class SolScriptEvaluator {
  constructor(private storagePort: SolStoragePort) {}

  /**
   * Deterministically evaluate all check guards for RenameItem against pinned read-set.
   */
  async evaluateRename(
    interaction: RenameItemInteraction,
    pinnedReadSet: ReadSetSnapshot
  ): Promise<EvaluationOutcome> {
    const passedGuards: GuardEvaluationResult[] = [];
    const timestamp = new Date().toISOString();
    const digest = pinnedReadSet.digest;

    // 1. check valid_name_syntax
    const newName = interaction.payload.new_name;
    const trimmed = newName ? newName.trim() : '';

    if (!trimmed || ILLEGAL_CHARS_REGEX.test(trimmed)) {
      const refused: GuardEvaluationResult = {
        kind: 'guard-evaluation',
        guard_id: RENAME_ITEM_GUARDS.VALID_NAME_SYNTAX.id,
        condition: RENAME_ITEM_GUARDS.VALID_NAME_SYNTAX.condition,
        result: 'refused',
        reason: !trimmed
          ? 'Filename cannot be empty or whitespace only.'
          : `Filename contains illegal characters: ${newName}`,
        read_set_digest: digest,
        evaluator: 'solscript-evaluator',
        timestamp,
      };
      return { allowed: false, refusedGuard: refused, passedGuards };
    }

    passedGuards.push({
      kind: 'guard-evaluation',
      guard_id: RENAME_ITEM_GUARDS.VALID_NAME_SYNTAX.id,
      condition: RENAME_ITEM_GUARDS.VALID_NAME_SYNTAX.condition,
      result: 'passed',
      read_set_digest: digest,
      evaluator: 'solscript-evaluator',
      timestamp,
    });

    // 2. check target_exists
    const oldName = interaction.payload.old_name;
    const targetNode = pinnedReadSet.nodes.find(n => n.name === oldName);

    if (!targetNode) {
      const refused: GuardEvaluationResult = {
        kind: 'guard-evaluation',
        guard_id: RENAME_ITEM_GUARDS.TARGET_EXISTS.id,
        condition: RENAME_ITEM_GUARDS.TARGET_EXISTS.condition,
        result: 'refused',
        reason: `Target item '${oldName}' does not exist in the active directory snapshot.`,
        read_set_digest: digest,
        evaluator: 'solscript-evaluator',
        timestamp,
      };
      return { allowed: false, refusedGuard: refused, passedGuards };
    }

    passedGuards.push({
      kind: 'guard-evaluation',
      guard_id: RENAME_ITEM_GUARDS.TARGET_EXISTS.id,
      condition: RENAME_ITEM_GUARDS.TARGET_EXISTS.condition,
      result: 'passed',
      read_set_digest: digest,
      evaluator: 'solscript-evaluator',
      timestamp,
    });

    // 3. check unique_sibling_name (unless renaming to identical name)
    if (trimmed !== oldName) {
      const collision = pinnedReadSet.nodes.find(
        n => n.name.toLowerCase() === trimmed.toLowerCase() && n.id !== targetNode.id
      );

      if (collision) {
        const refused: GuardEvaluationResult = {
          kind: 'guard-evaluation',
          guard_id: RENAME_ITEM_GUARDS.UNIQUE_SIBLING_NAME.id,
          condition: RENAME_ITEM_GUARDS.UNIQUE_SIBLING_NAME.condition,
          result: 'refused',
          reason: `A sibling item named '${trimmed}' already exists in this folder.`,
          read_set_digest: digest,
          evaluator: 'solscript-evaluator',
          timestamp,
        };
        return { allowed: false, refusedGuard: refused, passedGuards };
      }
    }

    passedGuards.push({
      kind: 'guard-evaluation',
      guard_id: RENAME_ITEM_GUARDS.UNIQUE_SIBLING_NAME.id,
      condition: RENAME_ITEM_GUARDS.UNIQUE_SIBLING_NAME.condition,
      result: 'passed',
      read_set_digest: digest,
      evaluator: 'solscript-evaluator',
      timestamp,
    });

    // 4. check storage_writable
    const isWritable = await this.storagePort.isStorageWritable(interaction.context.source_path);
    if (!isWritable) {
      const refused: GuardEvaluationResult = {
        kind: 'guard-evaluation',
        guard_id: RENAME_ITEM_GUARDS.STORAGE_WRITABLE.id,
        condition: RENAME_ITEM_GUARDS.STORAGE_WRITABLE.condition,
        result: 'refused',
        reason: 'Target directory or storage profile is mounted as read-only.',
        read_set_digest: digest,
        evaluator: 'solscript-evaluator',
        timestamp,
      };
      return { allowed: false, refusedGuard: refused, passedGuards };
    }

    passedGuards.push({
      kind: 'guard-evaluation',
      guard_id: RENAME_ITEM_GUARDS.STORAGE_WRITABLE.id,
      condition: RENAME_ITEM_GUARDS.STORAGE_WRITABLE.condition,
      result: 'passed',
      read_set_digest: digest,
      evaluator: 'solscript-evaluator',
      timestamp,
    });

    // All guards passed! Authorize typed invocation request.
    const invocationRequest: AuthorizedInvocationRequest<{
      source_path: string[];
      old_name: string;
      new_name: string;
    }> = {
      target: 'filesystem.rename',
      target_revision: 'capability:fs.rename:1.0.0',
      actor: interaction.actor,
      subject_id: targetNode.id,
      idempotency_key: `rename:${targetNode.id}:${interaction.correlation_id}`,
      correlation_id: interaction.correlation_id,
      causation_id: interaction.interaction_id,
      parameters: {
        source_path: interaction.context.source_path,
        old_name: oldName,
        new_name: trimmed,
      },
      authorized_at: timestamp,
      read_set_digest: digest,
    };

    return {
      allowed: true,
      passedGuards,
      invocationRequest,
    };
  }
}
