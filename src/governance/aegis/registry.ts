/**
 * Aegis State-Machine & Workflow Registry
 * Formally defines states, transitions, and deterministic check guards.
 */

import {
  Rule,
  RuleType,
  Severity,
  ExpressionKind,
} from '@nexus/solscript';

export type MutationState =
  | 'selected'
  | 'mutation-requested'
  | 'checking'
  | 'executing'
  | 'completed'
  | 'refused'
  | 'failed';

export interface GuardDefinition extends Rule {
  condition?: string;
  description?: string;
}

export interface TransitionDefinition {
  name: string;
  fromState: MutationState;
  toState: MutationState;
  requiredGuards: Rule[];
  targetCapability: string;
}

export interface AegisRegistry {
  registry_id: string;
  revision_id: string;
  transitions: Record<string, TransitionDefinition>;
}

export const RENAME_ITEM_GUARDS: Record<string, Rule & { condition: string; description: string }> = {
  VALID_NAME_SYNTAX: {
    id: 'guard:valid_name_syntax',
    name: 'valid_name_syntax',
    ruleType: RuleType.Guard,
    severity: Severity.Hard,
    notes: 'Name must not be empty, trimmed, or contain illegal characters (\\ / : * ? " < > |)',
    isRelationalCheck: false,
    conditions: [],
    expression: {
      id: 'expr:valid_name_syntax',
      kind: ExpressionKind.FunctionCall,
      functionName: 'check_valid_name_syntax',
      returnType: 'boolean',
      operands: [
        {
          id: 'expr:arg:new_name',
          kind: ExpressionKind.AttributeRef,
          attributeId: 'attr:new_name',
          returnType: 'string',
          operands: [],
        },
      ],
    },
    condition: 'valid_name_syntax',
    description: 'Name must not be empty, trimmed, or contain illegal characters (\\ / : * ? " < > |)',
  },
  TARGET_EXISTS: {
    id: 'guard:target_exists',
    name: 'target_exists',
    ruleType: RuleType.Guard,
    severity: Severity.Hard,
    notes: 'Target subject item must exist at the specified path in current read-set',
    isRelationalCheck: false,
    conditions: [],
    expression: {
      id: 'expr:target_exists',
      kind: ExpressionKind.FunctionCall,
      functionName: 'check_target_exists',
      returnType: 'boolean',
      operands: [
        {
          id: 'expr:arg:target_exists',
          kind: ExpressionKind.AttributeRef,
          attributeId: 'attr:target_exists',
          returnType: 'boolean',
          operands: [],
        },
        {
          id: 'expr:arg:old_name',
          kind: ExpressionKind.AttributeRef,
          attributeId: 'attr:old_name',
          returnType: 'string',
          operands: [],
        },
      ],
    },
    condition: 'target_exists',
    description: 'Target subject item must exist at the specified path in current read-set',
  },
  UNIQUE_SIBLING_NAME: {
    id: 'guard:unique_sibling_name',
    name: 'unique_sibling_name',
    ruleType: RuleType.Guard,
    severity: Severity.Hard,
    notes: 'A sibling with the destination name must not already exist in the target directory',
    isRelationalCheck: false,
    conditions: [],
    expression: {
      id: 'expr:unique_sibling_name',
      kind: ExpressionKind.FunctionCall,
      functionName: 'check_unique_sibling_name',
      returnType: 'boolean',
      operands: [
        {
          id: 'expr:arg:sibling_collision',
          kind: ExpressionKind.AttributeRef,
          attributeId: 'attr:sibling_collision',
          returnType: 'boolean',
          operands: [],
        },
        {
          id: 'expr:arg:new_name',
          kind: ExpressionKind.AttributeRef,
          attributeId: 'attr:new_name',
          returnType: 'string',
          operands: [],
        },
      ],
    },
    condition: 'unique_sibling_name',
    description: 'A sibling with the destination name must not already exist in the target directory',
  },
  STORAGE_WRITABLE: {
    id: 'guard:storage_writable',
    name: 'storage_writable',
    ruleType: RuleType.Guard,
    severity: Severity.Hard,
    notes: 'Target storage profile must be in a writable state',
    isRelationalCheck: false,
    conditions: [],
    expression: {
      id: 'expr:storage_writable',
      kind: ExpressionKind.FunctionCall,
      functionName: 'check_storage_writable',
      returnType: 'boolean',
      operands: [
        {
          id: 'expr:arg:storage_writable',
          kind: ExpressionKind.AttributeRef,
          attributeId: 'attr:storage_writable',
          returnType: 'boolean',
          operands: [],
        },
      ],
    },
    condition: 'storage_writable',
    description: 'Target storage profile must be in a writable state',
  },
};

export const AEGIS_FILE_MUTATION_REGISTRY: AegisRegistry = {
  registry_id: 'aegis:registry:file-mutation',
  revision_id: 'aegis:rev:file-mutation:1.0.0',
  transitions: {
    RenameItem: {
      name: 'RenameItem',
      fromState: 'selected',
      toState: 'completed',
      requiredGuards: [
        RENAME_ITEM_GUARDS.VALID_NAME_SYNTAX,
        RENAME_ITEM_GUARDS.TARGET_EXISTS,
        RENAME_ITEM_GUARDS.UNIQUE_SIBLING_NAME,
        RENAME_ITEM_GUARDS.STORAGE_WRITABLE,
      ],
      targetCapability: 'filesystem.rename',
    },
  },
};
