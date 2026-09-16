/**
 * Aegis State-Machine & Workflow Registry
 * Formally defines states, transitions, and deterministic check guards.
 */

export type MutationState =
  | 'selected'
  | 'mutation-requested'
  | 'checking'
  | 'executing'
  | 'completed'
  | 'refused'
  | 'failed';

export interface GuardDefinition {
  id: string;
  condition: string;
  description: string;
  severity: 'HARD' | 'SOFT';
}

export interface TransitionDefinition {
  name: string;
  fromState: MutationState;
  toState: MutationState;
  requiredGuards: GuardDefinition[];
  targetCapability: string;
}

export interface AegisRegistry {
  registry_id: string;
  revision_id: string;
  transitions: Record<string, TransitionDefinition>;
}

export const RENAME_ITEM_GUARDS: Record<string, GuardDefinition> = {
  VALID_NAME_SYNTAX: {
    id: 'guard:valid_name_syntax',
    condition: 'valid_name_syntax',
    description: 'Name must not be empty, trimmed, or contain illegal characters (\\ / : * ? " < > |)',
    severity: 'HARD',
  },
  TARGET_EXISTS: {
    id: 'guard:target_exists',
    condition: 'target_exists',
    description: 'Target subject item must exist at the specified path in current read-set',
    severity: 'HARD',
  },
  UNIQUE_SIBLING_NAME: {
    id: 'guard:unique_sibling_name',
    condition: 'unique_sibling_name',
    description: 'A sibling with the destination name must not already exist in the target directory',
    severity: 'HARD',
  },
  STORAGE_WRITABLE: {
    id: 'guard:storage_writable',
    condition: 'storage_writable',
    description: 'Target storage profile must be in a writable state',
    severity: 'HARD',
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
