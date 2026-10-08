/**
 * SOL (Specification, Ontology, Logic) Type Vocabulary
 * Corresponds to the Nexus resolution, semantics, and shrapnel schemas.
 */

export type ProvenanceType = 
  | 'semantic'
  | 'concrete'
  | 'eav'
  | 'derived'
  | 'evaluated'
  | 'inferred'
  | 'asserted'
  | 'projected'
  | 'imported';

export type WorkspacePersona = 'ontologist' | 'developer' | 'analyst';
export type AppTheme = 'dark' | 'steel' | 'light';
export type GraphMode = 'semantic' | 'concrete';

// ==========================================
// 1. Shrapnel EAV Value-Family System
// ==========================================

export enum FieldTypeCode {
  Long = 1,
  String = 2,
  Double = 3,
  Boolean = 4,
  Timestamp = 5,
  JSONB = 6,
  UUID = 7,
}

export type FieldTypeName = 'Long' | 'String' | 'Double' | 'Boolean' | 'Timestamp' | 'JSONB' | 'UUID';

export interface ShrapnelFieldType {
  code: FieldTypeCode;
  name: FieldTypeName;
  description: string;
  pg_type: string;
}

export interface ShrapnelField {
  id: number;
  property_name: string;
  name: string;
  label: string;
  field_type_code: FieldTypeCode;
  field_index: number;
  is_calculated: boolean;
  provenance: ProvenanceType;
}

export interface ShrapnelObjectInstance {
  id: number;
  created_at: string;
  values?: Record<string, any>;
  provenance: ProvenanceType;
}

export interface ShrapnelValueBinding {
  field_id: number;
  property_name: string;
  label: string;
  name: string;
  field_type_code: FieldTypeCode;
  value_id: number;
  bound_at: string;
  raw_value: any;
}

// ==========================================
// 2. Resolution Schema (Semantic Specification)
// ==========================================

export interface ConceptAttribute {
  id: string;
  concept_id: string;
  name: string;
  label?: string;
  value_type: 'text' | 'integer' | 'float' | 'boolean' | 'timestamp' | 'json' | 'uuid';
  is_state_attribute: boolean;
  allowed_values?: string[];
  is_nullable: boolean;
  default_value?: any;
  shrapnel_field_id?: number;
  description?: string;
  provenance: ProvenanceType;
}

export interface ConceptRelationship {
  id: string;
  name: string;
  source_concept_id: string;
  target_concept_id: string;
  cardinality: '1:1' | '1:N' | 'N:1' | 'N:N';
  inverse_name?: string;
  description?: string;
  provenance: ProvenanceType;
}

export interface ConceptStateTransition {
  id: string;
  concept_id: string;
  from_state: string;
  to_state: string;
  trigger_event: string;
  guard_rule_id?: string;
  description?: string;
  provenance: ProvenanceType;
}

export enum RuleType {
  INVARIANT = 'INVARIANT',
  ASSERTION = 'ASSERTION',
  DERIVATION = 'DERIVATION',
  CONSTRAINT = 'CONSTRAINT',
}

export enum Severity {
  HARD = 'HARD',
  SOFT = 'SOFT',
  ADVISORY = 'ADVISORY',
}

export enum ExpressionKind {
  ATTRIBUTE_REF = 'ATTRIBUTE_REF',
  LITERAL = 'LITERAL',
  OPERATOR = 'OPERATOR',
  FUNCTION = 'FUNCTION',
  FRAME_LOOKUP = 'FRAME_LOOKUP',
  SHRAPNEL_FIELD = 'SHRAPNEL_FIELD',
  INFERENCE_PREDICATE = 'INFERENCE_PREDICATE',
}

export enum Operator {
  EQ = 'EQ',
  NEQ = 'NEQ',
  GT = 'GT',
  GTE = 'GTE',
  LT = 'LT',
  LTE = 'LTE',
  AND = 'AND',
  OR = 'OR',
  NOT = 'NOT',
  IN = 'IN',
  CONTAINS = 'CONTAINS',
  REGEX_MATCH = 'REGEX_MATCH',
  TEMPORAL_BEFORE = 'TEMPORAL_BEFORE',
}

export interface Expression {
  id: string;
  kind: ExpressionKind;
  return_type: string;
  attribute_id?: string;
  shrapnel_property?: string;
  literal_value?: any;
  operator?: Operator;
  function_name?: string;
  children?: Expression[];
  raw_code?: string;
}

export interface Rule {
  id: string;
  concept_id: string;
  name: string;
  description?: string;
  rule_type: RuleType;
  severity: Severity;
  expression: Expression;
  target_attribute?: string;
  error_message?: string;
  provenance: ProvenanceType;
}

export interface Concept {
  id: string;
  name: string;
  label?: string;
  description?: string;
  parent_concept_id?: string;
  attributes: Record<string, ConceptAttribute>;
  relationships: ConceptRelationship[];
  invariants: Rule[];
  state_transitions: ConceptStateTransition[];
  frame_dimension_ids: string[];
  is_abstract?: boolean;
  created_at: string;
  provenance: ProvenanceType;
}

// ==========================================
// 3. Frames & Dimensional Contexts
// ==========================================

export interface FrameDimension {
  id: string;
  name: string;
  dimension_key: string;
  description?: string;
  allowed_values: string[];
  default_value: string;
  provenance: ProvenanceType;
}

export interface FrameDimensionMeaning {
  id: string;
  dimension_id: string;
  value: string;
  meaning_label: string;
  description?: string;
  constraint_modifiers?: Record<string, any>;
  provenance: ProvenanceType;
}

export interface FrameContext {
  environment?: 'prod' | 'staging' | 'dev' | 'dr';
  jurisdiction?: 'US' | 'EU' | 'APAC' | 'GLOBAL';
  security_tier?: 'high' | 'medium' | 'standard';
  as_of_date?: string;
  [key: string]: any;
}

// ==========================================
// 4. Concrete Entities, Facts, and Propositions
// ==========================================

export interface Entity {
  id: string;
  external_id: string;
  concept_id: string;
  concept_name: string;
  attributes: Record<string, any>;
  shrapnel_object_id?: number;
  eav_attributes?: Record<string, any>;
  context_tags?: Record<string, string>;
  created_at: string;
  updated_at?: string;
  provenance: ProvenanceType;
}

export enum Disposition {
  Asserted = 'Asserted',
  Disputed = 'Disputed',
  Rejected = 'Rejected',
  Pending = 'Pending',
  Proposed = 'Proposed',
  Stale = 'Stale',
  Retracted = 'Retracted',
}

export interface Proposition {
  id: string;
  title: string;
  description?: string;
  asset_concept_id: string;
  subject_entity_id: string;
  disposition: Disposition;
  confidence: number;
  assertion_rule_ids: string[];
  frame_context?: FrameContext;
  last_evaluated_at?: string;
  evidence_ids?: string[];
  provenance: ProvenanceType;
}

export interface Fact {
  id: string;
  entity_id: string;
  predicate: string;
  target_id_or_value: any;
  is_eav: boolean;
  confidence: number;
  asserted_at: string;
  source: string;
  provenance: ProvenanceType;
}

// ==========================================
// 5. Reasoning, Evaluation & Pre-LLM Patterns
// ==========================================

export interface PreLlmPatternResult {
  pattern_id: string;
  pattern_name: string;
  priority: number;
  confidence: number;
  executed: boolean;
  passed: boolean;
  details: string;
  findings?: Record<string, any>;
}

export interface RuleEvaluationDetail {
  rule_id: string;
  rule_name: string;
  rule_type: RuleType;
  severity: Severity;
  passed: boolean;
  reason: string;
  inputs: Record<string, any>;
  expression_trace?: string;
}

export interface EvaluationResult {
  proposition_id: string;
  title: string;
  disposition: Disposition;
  all_passed: boolean;
  context_status: 'scoped' | 'not_scoped' | 'context_required' | 'context_mismatch';
  evaluation_time_ms: number;
  database_eval_status: 'cached' | 'direct_sql_hit' | 'resolution_scan';
  rules_evaluated: RuleEvaluationDetail[];
  pre_llm_patterns: PreLlmPatternResult[];
  inference_required: boolean;
  inference_chain?: Array<{
    step: number;
    rule: string;
    premises: string[];
    conclusion: string;
    confidence: number;
  }>;
  fallback_to_llm: boolean;
  confidence_score: number;
  provenance: ProvenanceType;
}

export interface CheckEntityResult {
  entity_id: string;
  concept_id: string;
  concept_name: string;
  all_passed: boolean;
  checked_at: string;
  rules: Array<{
    rule_id: string;
    rule_name: string;
    severity: Severity;
    passed: boolean;
    reason: string;
  }>;
}

export interface ReasonEntityResult {
  entity_id: string;
  external_id: string;
  concept_id: string;
  derived_attributes: Record<string, any>;
  confidence: number;
  needs_llm: boolean;
  unknowns: string[];
  applied_patterns: string[];
  inferences: Array<{ predicate: string; value: any; confidence: number; justification: string }>;
}

// ==========================================
// 6. Projections & Inbound Converters
// ==========================================

export type InboundFormat = 'OWL' | 'RDF_TURTLE' | 'SHACL' | 'SKOS';
export type OutboundFormat = 'TypeSpec' | 'CUE' | 'TLA_PLUS' | 'JSON_LD';

export interface RepresentationMapping {
  id: string;
  concept_id: string;
  inbound_source?: {
    format: InboundFormat;
    source_uri?: string;
    raw_syntax: string;
    parsed_classes: string[];
    axioms_count: number;
  };
  outbound_projections: Record<OutboundFormat, {
    generated_code: string;
    ast_nodes: number;
    is_synchronized: boolean;
    last_projected_at: string;
  }>;
}

// ==========================================
// 7. SOLScript REPL & Grounding
// ==========================================

export interface GroundingSource {
  uri: string;
  title: string;
}

export interface GroundedAttribute {
  name: string;
  label?: string;
  value_type: 'text' | 'integer' | 'float' | 'boolean' | 'timestamp' | 'json' | 'uuid';
  shrapnel_type?: 'String' | 'Long' | 'Double' | 'Boolean' | 'Timestamp' | 'JSONB' | 'UUID';
  shrapnel_code?: number;
  description?: string;
  is_nullable: boolean;
  default_value?: any;
}

export interface GroundedInvariant {
  name: string;
  expression: string;
  severity: 'HARD' | 'SOFT' | 'ADVISORY';
  description?: string;
}

export interface GroundedRelationship {
  name: string;
  target_concept: string;
  cardinality: '1:1' | '1:N' | 'N:1' | 'N:N';
  description?: string;
}

export interface GroundedOntologyModel {
  canonical_name: string;
  identifier: string;
  namespace: string;
  taxonomy?: string;
  subclass_of?: string;
  description: string;
  sources: GroundingSource[];
  attributes: GroundedAttribute[];
  invariants: GroundedInvariant[];
  relationships: GroundedRelationship[];
  projections?: {
    typespec?: string;
    cue?: string;
    json_ld?: string;
    tla_plus?: string;
  };
  grounded_via?: string;
  live_grounded?: boolean;
}

export interface ReplHistoryItem {
  id: string;
  timestamp: string;
  input: string;
  type: 'expression' | 'query' | 'evaluate' | 'entity' | 'shrapnel' | 'project' | 'inspect' | 'help' | 'ground';
  status: 'success' | 'error';
  executionTimeMs: number;
  output: any;
  outputType: 'entity' | 'proposition' | 'graph' | 'evaluation' | 'shrapnel_object' | 'table' | 'projection' | 'primitive' | 'error' | 'grounding';
  provenance?: ProvenanceType;
  targetAddress?: {
    type: 'concept' | 'entity' | 'proposition' | 'rule' | 'shrapnel_object' | 'frame';
    id: string | number;
  };
}

// ==========================================
// 8. Visual Graph Node & Edge
// ==========================================

export interface GraphNode {
  id: string;
  label: string;
  subLabel?: string;
  kind: 'concept' | 'entity' | 'rule' | 'proposition' | 'shrapnel_object' | 'frame_dimension' | 'eav_value';
  provenance: ProvenanceType;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  mode: GraphMode;
  data: any;
  status?: 'valid' | 'violation' | 'disputed' | 'pending' | 'asserted';
  size?: number;
  highlighted?: boolean;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  kind: 'inheritance' | 'relationship' | 'instance_of' | 'evaluates' | 'asserts' | 'binds_eav' | 'transition' | 'frame_scope';
  provenance: ProvenanceType;
  dashed?: boolean;
  animated?: boolean;
}
