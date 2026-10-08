/**
 * Aegis State-Machine Registry API & IDE Types
 */

export interface Registry {
  id: string;
  name: string;
  description?: string;
  version?: string;
  tla_plus_source?: string;
  tla_plus_module?: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
  is_active: boolean;
  expires_at?: string | null;
  main_concept_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Constant {
  id: string;
  registry_id: string;
  name: string;
  type: string;
  value: unknown;
  description?: string;
  constraints?: string;
  created_at: string;
  updated_at: string;
}

export interface Variable {
  id: string;
  registry_id: string;
  name: string;
  type: string;
  initial_value: unknown;
  domain?: unknown;
  description?: string;
  constraints?: string;
  attribute_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface StateGroup {
  id: string;
  registry_id: string;
  name: string;
  description?: string;
  color?: string; // 'blue' | 'purple' | 'emerald' | 'amber' | 'rose' | 'cyan' | 'slate'
  state_ids: string[];
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  collapsed?: boolean;
  created_at: string;
  updated_at: string;
}

export interface StateNode {
  id: string;
  registry_id: string;
  name: string;
  description?: string;
  variable_assignments?: Record<string, unknown>;
  constraints?: string;
  is_initial: boolean;
  is_terminal: boolean;
  concept_id?: string | null;
  attribute_value_id?: string | null;
  group_id?: string | null;
  // Visual layout properties
  x?: number;
  y?: number;
  created_at: string;
  updated_at: string;
}

export interface Transition {
  id: string;
  registry_id: string;
  name: string;
  description?: string;
  trigger?: string; // Event name or trigger expression, e.g. "VOTE_PREPARE", "TIMEOUT"
  triggers?: string[]; // Multiple triggers or alias event names
  trigger_condition?: string; // Optional trigger condition expression
  guard_expression?: string;
  constraints?: string; // Guard condition defined with boolean expression language
  action?: Record<string, unknown> | string;
  weak_fairness?: boolean;
  strong_fairness?: boolean;
  temporal_conditions?: string;
  priority?: number;
  from_state_id: string;
  to_state_id: string;
  guard_rule_id?: string | null;
  transition_rule_id?: string | null;
  state_transition_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Invariant {
  id: string;
  registry_id: string;
  name: string;
  expression: string;
  description?: string;
  is_type_invariant?: boolean;
  rule_id?: string | null;
  expression_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Property {
  id: string;
  registry_id: string;
  name: string;
  type: string;
  expression: string;
  description?: string;
  is_verified?: boolean;
  verified_at?: string | null;
  verified_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TemporalProperty {
  id: string;
  registry_id: string;
  name: string;
  operator: '[]' | '<>' | '[]<>' | '<>[]' | '~>' | 'WF' | 'SF' | string;
  expression: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface ConceptMapping {
  id: string;
  registry_id: string;
  tla_name: string;
  concept_id: string;
  mapping_type?: string;
  mapping_expression?: string;
  cardinality?: string;
  created_at: string;
  updated_at: string;
}

export interface AttributeMapping {
  id: string;
  registry_id: string;
  tla_variable: string;
  attribute_id: string;
  conversion_function?: string;
  default_value?: unknown;
  created_at: string;
  updated_at: string;
}

export interface RelationshipMapping {
  id: string;
  registry_id: string;
  tla_relationship: string;
  relationship_id: string;
  mapping_type?: string;
  constraints?: string;
  created_at: string;
  updated_at: string;
}

export interface ExecutionLogItem {
  id: string;
  registry_id: string;
  entity_id?: string;
  from_state_id?: string;
  to_state_id?: string;
  transition_id?: string;
  trigger_event?: string;
  trigger_user?: string;
  context?: Record<string, unknown>;
  created_at: string;
}

export interface ValidationErrorItem {
  code: string;
  message: string;
  target_id?: string;
}

export interface ValidationWarningItem {
  code: string;
  message: string;
  target_id?: string;
}

export interface ValidationResult {
  id: string;
  registry_id: string;
  is_valid: boolean;
  errors: ValidationErrorItem[];
  warnings: ValidationWarningItem[];
  suggestions: string[];
  validated_by?: string | null;
  validated_at: string;
}

export interface TraceStep {
  step: number;
  state_id: string;
  state_name: string;
  transition_name?: string;
  variables: Record<string, unknown>;
  action?: string;
}

export interface TraceData {
  engine: 'tlc' | 'structural';
  diameter?: number;
  total_states?: number;
  distinct_states?: number;
  violation_type?: 'deadlock' | 'invariant' | 'temporal' | null;
  violated_invariant?: string | null;
  steps: TraceStep[];
}

export interface ModelCheckResult {
  id: string;
  registry_id: string;
  property_id?: string | null;
  status: 'pass' | 'fail' | 'error' | 'unknown';
  trace: TraceData | null;
  checked_properties: string[];
  execution_time_ms: number;
  checked_by?: string | null;
  checked_at: string;
}

export type ChildResourceName =
  | 'constants'
  | 'variables'
  | 'states'
  | 'transitions'
  | 'groups'
  | 'invariants'
  | 'properties'
  | 'temporal-properties'
  | 'concept-mappings'
  | 'attribute-mappings'
  | 'relationship-mappings'
  | 'execution-log';

export interface StateSnapshot {
  id: string;
  name: string;
  stepIndex: number;
  timestamp: string;
  stateId: string;
  stateName: string;
  transitionName?: string;
  triggerEvent?: string;
  variables: Record<string, unknown>;
  description?: string;
  source: 'execution_log' | 'simulation_step' | 'manual';
  logId?: string;
}

export interface VariableDiffItem {
  key: string;
  prevVal: unknown;
  currentVal: unknown;
  hasChanged: boolean;
  type: string;
  color: 'green' | 'red' | 'none';
  deltaText: string | null;
  deltaNum: number | null;
  badgeLabel: string;
}

export interface SnapshotComparisonResult {
  snapshotA: StateSnapshot;
  snapshotB: StateSnapshot;
  variableDiffs: VariableDiffItem[];
  totalVariables: number;
  changedCount: number;
  unchangedCount: number;
  stateChanged: boolean;
  stepDifference: number;
  summary: string;
}

export interface SimStep {
  step: number;
  stateId: string;
  stateName: string;
  transitionName?: string;
  triggerEvent?: string;
  variables: Record<string, unknown>;
  timestamp: string;
}

export interface SimState {
  currentStateId: string;
  variables: Record<string, unknown>;
  history: SimStep[];
  snapshots?: StateSnapshot[];
}

export interface FullRegistryData {
  registry: Registry;
  constants: Constant[];
  variables: Variable[];
  states: StateNode[];
  transitions: Transition[];
  invariants: Invariant[];
  properties: Property[];
  temporal_properties: TemporalProperty[];
  concept_mappings: ConceptMapping[];
  attribute_mappings: AttributeMapping[];
  relationship_mappings: RelationshipMapping[];
  execution_logs: ExecutionLogItem[];
  validation_results: ValidationResult[];
  model_check_results: ModelCheckResult[];
}

export type ThemeMode = 'light' | 'dark' | 'steel';

export type NavigationTab = 'canvas' | 'simulator' | 'model-check' | 'tla' | 'api-console' | 'logs';
