/**
 * SOLScript Semantic Evaluator
 * Evaluates deterministic `check` guards over a pinned read-set.
 * Authoritatively constructs and authorizes typed invocation requests.
 * Delegates guard evaluation via the SolScript ResolutionInterpreter.
 */

import {
  ResolutionInterpreter,
  Entity,
  Concept,
  Rule,
} from '@nexus/solscript';
import { RENAME_ITEM_GUARDS } from '../aegis/registry';
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
  public readonly interpreter: ResolutionInterpreter;

  constructor(
    private storagePort: SolStoragePort,
    interpreter?: ResolutionInterpreter
  ) {
    this.interpreter = interpreter ?? new ResolutionInterpreter();
    this.initInterpreter();
  }

  private initInterpreter(): void {
    // 1. Register FileMutationSubject concept and its formal attributes
    const concept: Concept = {
      id: 'concept:file_mutation_subject',
      name: 'FileMutationSubject',
      description: 'File mutation subject context for RenameItem guards',
      attributes: {
        'attr:new_name': {
          id: 'attr:new_name',
          conceptId: 'concept:file_mutation_subject',
          name: 'new_name',
          valueType: 'string',
          isStateAttribute: false,
          allowedValues: [],
        },
        'attr:old_name': {
          id: 'attr:old_name',
          conceptId: 'concept:file_mutation_subject',
          name: 'old_name',
          valueType: 'string',
          isStateAttribute: false,
          allowedValues: [],
        },
        'attr:target_exists': {
          id: 'attr:target_exists',
          conceptId: 'concept:file_mutation_subject',
          name: 'target_exists',
          valueType: 'boolean',
          isStateAttribute: false,
          allowedValues: [],
        },
        'attr:sibling_collision': {
          id: 'attr:sibling_collision',
          conceptId: 'concept:file_mutation_subject',
          name: 'sibling_collision',
          valueType: 'boolean',
          isStateAttribute: false,
          allowedValues: [],
        },
        'attr:storage_writable': {
          id: 'attr:storage_writable',
          conceptId: 'concept:file_mutation_subject',
          name: 'storage_writable',
          valueType: 'boolean',
          isStateAttribute: false,
          allowedValues: [],
        },
      },
      relationships: {},
      invariants: [],
      derivations: [],
      stateTransitions: [],
      rules: [],
    };
    this.interpreter.addConcept(concept);

    // 2. Register guard checking function bindings
    this.interpreter.registerFunction('check_valid_name_syntax', (newName: unknown) => {
      const name = typeof newName === 'string' ? newName : (newName ? String(newName) : '');
      const trimmed = name.trim();
      if (!trimmed) {
        throw new Error('Filename cannot be empty or whitespace only.');
      }
      if (ILLEGAL_CHARS_REGEX.test(trimmed)) {
        throw new Error(`Filename contains illegal characters: ${name}`);
      }
      return true;
    });

    this.interpreter.registerFunction('check_target_exists', (targetExists: unknown, oldName: unknown) => {
      if (!targetExists) {
        throw new Error(`Target item '${oldName ?? ''}' does not exist in the active directory snapshot.`);
      }
      return true;
    });

    this.interpreter.registerFunction('check_unique_sibling_name', (siblingCollision: unknown, newName: unknown) => {
      if (siblingCollision) {
        const name = typeof newName === 'string' ? newName.trim() : (newName ? String(newName).trim() : '');
        throw new Error(`A sibling item named '${name}' already exists in this folder.`);
      }
      return true;
    });

    this.interpreter.registerFunction('check_storage_writable', (storageWritable: unknown) => {
      if (!storageWritable) {
        throw new Error('Target directory or storage profile is mounted as read-only.');
      }
      return true;
    });

    // 3. Register rules on interpreter
    for (const rule of Object.values(RENAME_ITEM_GUARDS)) {
      this.interpreter.rules.set(rule.id, rule);
    }
  }

  /**
   * Deterministically evaluate all check guards for RenameItem against pinned read-set
   * by delegating to the ResolutionInterpreter.
   */
  async evaluateRename(
    interaction: RenameItemInteraction,
    pinnedReadSet: ReadSetSnapshot
  ): Promise<EvaluationOutcome> {
    const passedGuards: GuardEvaluationResult[] = [];
    const timestamp = new Date().toISOString();
    const digest = pinnedReadSet.digest;

    const newName = interaction.payload.new_name;
    const oldName = interaction.payload.old_name;
    const trimmed = newName ? newName.trim() : '';

    // Inspect pinnedReadSet and storagePort for subject attributes
    const targetNode = pinnedReadSet.nodes.find(n => n.name === oldName);
    const targetExists = Boolean(targetNode);

    // Sibling collision check (unless renaming to identical name)
    const collision = (trimmed !== oldName) && Boolean(
      pinnedReadSet.nodes.find(
        n => n.name.toLowerCase() === trimmed.toLowerCase() && (!targetNode || n.id !== targetNode.id)
      )
    );

    // Storage writable check
    const isWritable = await this.storagePort.isStorageWritable(interaction.context.source_path);

    // Build the SolScript Entity representing the subject under evaluation
    const subjectEntity: Entity = {
      id: targetNode ? targetNode.id : `subject:${interaction.subject.id || oldName}`,
      conceptId: 'concept:file_mutation_subject',
      attributes: {
        new_name: newName,
        old_name: oldName,
        target_exists: targetExists,
        sibling_collision: collision,
        storage_writable: isWritable,
      },
    };

    // Update entity in the interpreter
    this.interpreter.addEntity(subjectEntity);

    // The formal SolScript Rule objects to evaluate in deterministic sequence
    const guards: Rule[] = [
      RENAME_ITEM_GUARDS.VALID_NAME_SYNTAX,
      RENAME_ITEM_GUARDS.TARGET_EXISTS,
      RENAME_ITEM_GUARDS.UNIQUE_SIBLING_NAME,
      RENAME_ITEM_GUARDS.STORAGE_WRITABLE,
    ];

    for (const rule of guards) {
      // Delegate rule evaluation to the ResolutionInterpreter
      const [passed, checkMessage] = this.interpreter.checkRule(rule, subjectEntity);

      if (!passed) {
        const reason = this.extractReason(checkMessage);
        const refused: GuardEvaluationResult = {
          kind: 'guard-evaluation',
          guard_id: rule.id,
          condition: (rule as any).condition || rule.name,
          result: 'refused',
          reason,
          read_set_digest: digest,
          evaluator: 'solscript-evaluator',
          timestamp,
        };
        return { allowed: false, refusedGuard: refused, passedGuards };
      }

      passedGuards.push({
        kind: 'guard-evaluation',
        guard_id: rule.id,
        condition: (rule as any).condition || rule.name,
        result: 'passed',
        read_set_digest: digest,
        evaluator: 'solscript-evaluator',
        timestamp,
      });
    }

    if (!targetNode) {
      throw new Error('Unexpected state: targetNode missing after passing TARGET_EXISTS guard.');
    }

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

  private extractReason(message: string): string {
    const errorPrefixMatch = message.match(/^Rule '[^']+' (?:error|soft error): (.*)$/);
    if (errorPrefixMatch) {
      return errorPrefixMatch[1];
    }
    return message;
  }
}

