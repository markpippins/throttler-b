import { 
  Concept, 
  Entity, 
  Proposition, 
  FrameDimension, 
  FrameDimensionMeaning, 
  ShrapnelField, 
  ShrapnelFieldType, 
  FieldTypeCode, 
  ShrapnelObjectInstance, 
  Rule, 
  RuleType, 
  Severity, 
  ExpressionKind, 
  Operator, 
  Disposition, 
  RepresentationMapping,
  Fact
} from '../types/sol';

export const INITIAL_FIELD_TYPES: ShrapnelFieldType[] = [
  { code: FieldTypeCode.Long, name: 'Long', description: '64-bit signed integer', pg_type: 'bigint' },
  { code: FieldTypeCode.String, name: 'String', description: 'Variable-length text (varchar/text)', pg_type: 'text' },
  { code: FieldTypeCode.Double, name: 'Double', description: 'IEEE double precision float', pg_type: 'double precision' },
  { code: FieldTypeCode.Boolean, name: 'Boolean', description: 'Boolean logical value (true/false)', pg_type: 'boolean' },
  { code: FieldTypeCode.Timestamp, name: 'Timestamp', description: 'ISO-8601 UTC timestamp', pg_type: 'timestamptz' },
  { code: FieldTypeCode.JSONB, name: 'JSONB', description: 'Arbitrary nested JSON data payload', pg_type: 'jsonb' },
  { code: FieldTypeCode.UUID, name: 'UUID', description: 'Canonical RFC 4122 Universally Unique Identifier', pg_type: 'uuid' },
];

export const INITIAL_SHRAPNEL_FIELDS: ShrapnelField[] = [
  { id: 1, property_name: 'cores', name: 'cores', label: 'CPU Cores', field_type_code: FieldTypeCode.Long, field_index: 1, is_calculated: false, provenance: 'eav' },
  { id: 2, property_name: 'uptime_s', name: 'uptime_s', label: 'Uptime (seconds)', field_type_code: FieldTypeCode.Double, field_index: 2, is_calculated: false, provenance: 'eav' },
  { id: 3, property_name: 'healthy', name: 'healthy', label: 'Healthy Flag', field_type_code: FieldTypeCode.Boolean, field_index: 3, is_calculated: false, provenance: 'eav' },
  { id: 4, property_name: 'telemetry_meta', name: 'telemetry_meta', label: 'Telemetry Metadata', field_type_code: FieldTypeCode.JSONB, field_index: 4, is_calculated: false, provenance: 'eav' },
  { id: 5, property_name: 'node_uuid', name: 'node_uuid', label: 'Hardware UUID', field_type_code: FieldTypeCode.UUID, field_index: 5, is_calculated: false, provenance: 'eav' },
  { id: 6, property_name: 'last_heartbeat', name: 'last_heartbeat', label: 'Last Heartbeat', field_type_code: FieldTypeCode.Timestamp, field_index: 6, is_calculated: false, provenance: 'eav' },
  { id: 7, property_name: 'memory_bandwidth_gbps', name: 'memory_bandwidth_gbps', label: 'RAM Bandwidth GB/s', field_type_code: FieldTypeCode.Double, field_index: 7, is_calculated: true, provenance: 'derived' },
  { id: 8, property_name: 'region_code', name: 'region_code', label: 'Cloud Region Code', field_type_code: FieldTypeCode.String, field_index: 8, is_calculated: false, provenance: 'eav' },
];

export const INITIAL_SHRAPNEL_OBJECTS: ShrapnelObjectInstance[] = [
  {
    id: 41,
    created_at: '2026-08-27T08:15:00Z',
    provenance: 'eav',
    values: {
      cores: 32,
      uptime_s: 1428500.5,
      healthy: true,
      telemetry_meta: { env: 'prod', kernel: '6.8.0-generic', numa_nodes: 2, hyperthreading: true },
      node_uuid: 'a3d8e572-9841-4cf1-8c43-85f6291a8e10',
      last_heartbeat: '2026-08-27T11:40:00Z',
      region_code: 'us-east-1'
    }
  },
  {
    id: 42,
    created_at: '2026-08-27T08:20:00Z',
    provenance: 'eav',
    values: {
      cores: 8,
      uptime_s: 94210.0,
      healthy: true,
      telemetry_meta: { env: 'prod', kernel: '6.8.0-generic', numa_nodes: 1 },
      node_uuid: 'b9f2c114-1182-4211-9a3b-2871fcae0941',
      last_heartbeat: '2026-08-27T11:39:45Z',
      region_code: 'eu-west-1'
    }
  },
  {
    id: 43,
    created_at: '2026-08-27T09:00:00Z',
    provenance: 'eav',
    values: {
      cores: 4,
      uptime_s: -3.5, // Negative uptime -> will fail invariant!
      healthy: false,
      telemetry_meta: { env: 'staging', error_flag: 'clock_skew_detected' },
      node_uuid: 'c812dd90-7714-4902-8be2-cc8910ef4129',
      last_heartbeat: '2026-08-27T10:12:00Z',
      region_code: 'us-west-2'
    }
  },
  {
    id: 44,
    created_at: '2026-08-27T10:30:00Z',
    provenance: 'eav',
    values: {
      cores: 64,
      uptime_s: 3892100.0,
      healthy: true,
      telemetry_meta: { env: 'prod', gpu_count: 4, pci_gen: 5 },
      node_uuid: 'e7149a12-8812-4011-b921-99afcc81023a',
      last_heartbeat: '2026-08-27T11:41:00Z',
      region_code: 'us-east-1'
    }
  }
];

export const INITIAL_FRAME_DIMENSIONS: FrameDimension[] = [
  {
    id: 'dim-env',
    name: 'Environment Scope',
    dimension_key: 'environment',
    description: 'Operational lifecycle environment tier governing strictness of constraints',
    allowed_values: ['prod', 'staging', 'dev', 'dr'],
    default_value: 'prod',
    provenance: 'semantic'
  },
  {
    id: 'dim-jur',
    name: 'Regulatory Jurisdiction',
    dimension_key: 'jurisdiction',
    description: 'Geographic and legal regulatory boundary (GDPR, HIPAA, FedRAMP)',
    allowed_values: ['US', 'EU', 'APAC', 'GLOBAL'],
    default_value: 'GLOBAL',
    provenance: 'semantic'
  },
  {
    id: 'dim-sec',
    name: 'Security Assurance Tier',
    dimension_key: 'security_tier',
    description: 'Required cryptographic and authorization standard',
    allowed_values: ['high', 'medium', 'standard'],
    default_value: 'standard',
    provenance: 'semantic'
  }
];

export const INITIAL_FRAME_MEANINGS: FrameDimensionMeaning[] = [
  {
    id: 'mean-prod',
    dimension_id: 'dim-env',
    value: 'prod',
    meaning_label: 'Production Grade',
    description: 'Enforces zero-downtime, minimum replica >= 2, strict hardware invariants, and active telemetry.',
    constraint_modifiers: { min_cores: 4, require_telemetry: true, require_redundancy: true },
    provenance: 'semantic'
  },
  {
    id: 'mean-eu',
    dimension_id: 'dim-jur',
    value: 'EU',
    meaning_label: 'European Union (GDPR Enforced)',
    description: 'Data residency confined to EU zones, encryption at rest mandatory, max retention 730 days.',
    constraint_modifiers: { max_retention_days: 730, mandatory_encryption: true },
    provenance: 'semantic'
  }
];

export const INITIAL_RULES: Rule[] = [
  {
    id: 'rule-host-cores',
    concept_id: 'concept-host',
    name: 'Cores Must Be Positive',
    description: 'Host CPU allocation must be strictly greater than 0',
    rule_type: RuleType.INVARIANT,
    severity: Severity.HARD,
    target_attribute: 'cores',
    error_message: 'Host core count must be greater than zero.',
    provenance: 'semantic',
    expression: {
      id: 'expr-h1',
      kind: ExpressionKind.OPERATOR,
      operator: Operator.GT,
      return_type: 'boolean',
      raw_code: 'cores > 0',
      children: [
        { id: 'expr-h1-a', kind: ExpressionKind.ATTRIBUTE_REF, return_type: 'integer', attribute_id: 'attr-host-cores' },
        { id: 'expr-h1-b', kind: ExpressionKind.LITERAL, return_type: 'integer', literal_value: 0 }
      ]
    }
  },
  {
    id: 'rule-host-uptime',
    concept_id: 'concept-host',
    name: 'Uptime Non-Negative',
    description: 'Reported system uptime in seconds cannot be negative',
    rule_type: RuleType.INVARIANT,
    severity: Severity.HARD,
    target_attribute: 'uptime_s',
    error_message: 'Uptime value indicates clock corruption or faulty counter.',
    provenance: 'semantic',
    expression: {
      id: 'expr-h2',
      kind: ExpressionKind.OPERATOR,
      operator: Operator.GTE,
      return_type: 'boolean',
      raw_code: 'uptime_s >= 0',
      children: [
        { id: 'expr-h2-a', kind: ExpressionKind.ATTRIBUTE_REF, return_type: 'float', attribute_id: 'attr-host-uptime' },
        { id: 'expr-h2-b', kind: ExpressionKind.LITERAL, return_type: 'float', literal_value: 0 }
      ]
    }
  },
  {
    id: 'rule-host-prod-capacity',
    concept_id: 'concept-host',
    name: 'Production Compute Capacity',
    description: 'In prod scope, host must have >= 8 cores and ram_gb >= 16',
    rule_type: RuleType.ASSERTION,
    severity: Severity.SOFT,
    provenance: 'semantic',
    expression: {
      id: 'expr-h3',
      kind: ExpressionKind.OPERATOR,
      operator: Operator.AND,
      return_type: 'boolean',
      raw_code: 'cores >= 8 AND ram_gb >= 16',
      children: [
        {
          id: 'expr-h3-1',
          kind: ExpressionKind.OPERATOR,
          operator: Operator.GTE,
          return_type: 'boolean',
          children: [
            { id: 'expr-h3-1a', kind: ExpressionKind.ATTRIBUTE_REF, return_type: 'integer', attribute_id: 'attr-host-cores' },
            { id: 'expr-h3-1b', kind: ExpressionKind.LITERAL, return_type: 'integer', literal_value: 8 }
          ]
        },
        {
          id: 'expr-h3-2',
          kind: ExpressionKind.OPERATOR,
          operator: Operator.GTE,
          return_type: 'boolean',
          children: [
            { id: 'expr-h3-2a', kind: ExpressionKind.ATTRIBUTE_REF, return_type: 'integer', attribute_id: 'attr-host-ram' },
            { id: 'expr-h3-2b', kind: ExpressionKind.LITERAL, return_type: 'integer', literal_value: 16 }
          ]
        }
      ]
    }
  },
  {
    id: 'rule-wr-dates',
    concept_id: 'concept-work-request',
    name: 'Temporal Consistency on Due Date',
    description: 'Due date must be chronologically after created timestamp',
    rule_type: RuleType.INVARIANT,
    severity: Severity.HARD,
    provenance: 'semantic',
    expression: {
      id: 'expr-wr1',
      kind: ExpressionKind.OPERATOR,
      operator: Operator.TEMPORAL_BEFORE,
      return_type: 'boolean',
      raw_code: 'created_at < due_date',
    }
  },
  {
    id: 'rule-data-gdpr',
    concept_id: 'concept-data-asset',
    name: 'GDPR Retention & Encryption Bound',
    description: 'Restricted assets under EU jurisdiction must have encryption enabled and retention <= 730',
    rule_type: RuleType.ASSERTION,
    severity: Severity.HARD,
    provenance: 'semantic',
    expression: {
      id: 'expr-d1',
      kind: ExpressionKind.OPERATOR,
      operator: Operator.AND,
      return_type: 'boolean',
      raw_code: 'encrypted == true AND retention_days <= 730',
    }
  }
];

export const INITIAL_CONCEPTS: Record<string, Concept> = {
  'concept-host': {
    id: 'concept-host',
    name: 'Host',
    label: 'Compute Host',
    description: 'Bare metal server or virtualized compute node substrate',
    created_at: '2026-08-20T10:00:00Z',
    provenance: 'semantic',
    frame_dimension_ids: ['dim-env', 'dim-jur'],
    attributes: {
      'attr-host-id': { id: 'attr-host-id', concept_id: 'concept-host', name: 'hostname', value_type: 'text', is_state_attribute: false, is_nullable: false, provenance: 'semantic' },
      'attr-host-cores': { id: 'attr-host-cores', concept_id: 'concept-host', name: 'cores', value_type: 'integer', is_state_attribute: false, is_nullable: false, shrapnel_field_id: 1, provenance: 'semantic' },
      'attr-host-ram': { id: 'attr-host-ram', concept_id: 'concept-host', name: 'ram_gb', value_type: 'integer', is_state_attribute: false, is_nullable: false, provenance: 'semantic' },
      'attr-host-uptime': { id: 'attr-host-uptime', concept_id: 'concept-host', name: 'uptime_s', value_type: 'float', is_state_attribute: false, is_nullable: false, shrapnel_field_id: 2, provenance: 'semantic' },
      'attr-host-status': { 
        id: 'attr-host-status', 
        concept_id: 'concept-host', 
        name: 'status', 
        value_type: 'text', 
        is_state_attribute: true, 
        allowed_values: ['PROVISIONING', 'ACTIVE', 'DEGRADED', 'DRAINING', 'TERMINATED'],
        is_nullable: false,
        provenance: 'semantic'
      },
      'attr-host-healthy': { id: 'attr-host-healthy', concept_id: 'concept-host', name: 'healthy', value_type: 'boolean', is_state_attribute: false, is_nullable: false, shrapnel_field_id: 3, provenance: 'semantic' },
      'attr-host-region': { id: 'attr-host-region', concept_id: 'concept-host', name: 'region', value_type: 'text', is_state_attribute: false, is_nullable: false, provenance: 'semantic' }
    },
    relationships: [
      { id: 'rel-h-srv', name: 'hosts_services', source_concept_id: 'concept-host', target_concept_id: 'concept-service', cardinality: '1:N', inverse_name: 'runs_on', description: 'Services actively allocated to this host', provenance: 'semantic' },
      { id: 'rel-h-pol', name: 'governed_by', source_concept_id: 'concept-host', target_concept_id: 'concept-security-policy', cardinality: 'N:1', description: 'Assigned node security policy', provenance: 'semantic' }
    ],
    invariants: [
      INITIAL_RULES[0], // Cores positive
      INITIAL_RULES[1]  // Uptime non-negative
    ],
    state_transitions: [
      { id: 'st-h1', concept_id: 'concept-host', from_state: 'PROVISIONING', to_state: 'ACTIVE', trigger_event: 'HOST_BOOT_COMPLETED', description: 'All sanity checks passed', provenance: 'semantic' },
      { id: 'st-h2', concept_id: 'concept-host', from_state: 'ACTIVE', to_state: 'DEGRADED', trigger_event: 'HEALTH_CHECK_FAILED', description: 'Consecutive heartbeat loss or invariant trip', provenance: 'semantic' },
      { id: 'st-h3', concept_id: 'concept-host', from_state: 'DEGRADED', to_state: 'ACTIVE', trigger_event: 'HEALTH_CHECK_RECOVERED', provenance: 'semantic' },
      { id: 'st-h4', concept_id: 'concept-host', from_state: 'ACTIVE', to_state: 'DRAINING', trigger_event: 'MAINTENANCE_SCHEDULED', provenance: 'semantic' },
      { id: 'st-h5', concept_id: 'concept-host', from_state: 'DRAINING', to_state: 'TERMINATED', trigger_event: 'DRAIN_COMPLETE', provenance: 'semantic' }
    ]
  },
  'concept-service': {
    id: 'concept-service',
    name: 'ServiceInstance',
    label: 'Microservice Instance',
    description: 'Active containerized service process deployed to compute topology',
    created_at: '2026-08-20T10:00:00Z',
    provenance: 'semantic',
    frame_dimension_ids: ['dim-env', 'dim-sec'],
    attributes: {
      'attr-srv-name': { id: 'attr-srv-name', concept_id: 'concept-service', name: 'service_name', value_type: 'text', is_state_attribute: false, is_nullable: false, provenance: 'semantic' },
      'attr-srv-port': { id: 'attr-srv-port', concept_id: 'concept-service', name: 'port', value_type: 'integer', is_state_attribute: false, is_nullable: false, provenance: 'semantic' },
      'attr-srv-status': { 
        id: 'attr-srv-status', 
        concept_id: 'concept-service', 
        name: 'status', 
        value_type: 'text', 
        is_state_attribute: true, 
        allowed_values: ['STARTING', 'READY', 'UNHEALTHY', 'STOPPED'],
        is_nullable: false,
        provenance: 'semantic' 
      },
      'attr-srv-replicas': { id: 'attr-srv-replicas', concept_id: 'concept-service', name: 'desired_replicas', value_type: 'integer', is_state_attribute: false, is_nullable: false, provenance: 'semantic' }
    },
    relationships: [
      { id: 'rel-srv-host', name: 'runs_on', source_concept_id: 'concept-service', target_concept_id: 'concept-host', cardinality: 'N:1', inverse_name: 'hosts_services', provenance: 'semantic' },
      { id: 'rel-srv-data', name: 'accesses_data', source_concept_id: 'concept-service', target_concept_id: 'concept-data-asset', cardinality: 'N:N', provenance: 'semantic' }
    ],
    invariants: [],
    state_transitions: [
      { id: 'st-s1', concept_id: 'concept-service', from_state: 'STARTING', to_state: 'READY', trigger_event: 'READINESS_PROBE_200', provenance: 'semantic' },
      { id: 'st-s2', concept_id: 'concept-service', from_state: 'READY', to_state: 'UNHEALTHY', trigger_event: 'PROBE_TIMEOUT', provenance: 'semantic' },
      { id: 'st-s3', concept_id: 'concept-service', from_state: 'UNHEALTHY', to_state: 'READY', trigger_event: 'PROBE_PASS', provenance: 'semantic' }
    ]
  },
  'concept-work-request': {
    id: 'concept-work-request',
    name: 'WorkRequest',
    label: 'Operational Work Request',
    description: 'Formal ticketed change request, task, or operational job',
    created_at: '2026-08-20T10:00:00Z',
    provenance: 'semantic',
    frame_dimension_ids: ['dim-env'],
    attributes: {
      'attr-wr-title': { id: 'attr-wr-title', concept_id: 'concept-work-request', name: 'title', value_type: 'text', is_state_attribute: false, is_nullable: false, provenance: 'semantic' },
      'attr-wr-status': { 
        id: 'attr-wr-status', 
        concept_id: 'concept-work-request', 
        name: 'status', 
        value_type: 'text', 
        is_state_attribute: true, 
        allowed_values: ['DRAFT', 'SUBMITTED', 'APPROVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
        is_nullable: false,
        provenance: 'semantic' 
      },
      'attr-wr-priority': { 
        id: 'attr-wr-priority', 
        concept_id: 'concept-work-request', 
        name: 'priority', 
        value_type: 'text', 
        is_state_attribute: false, 
        allowed_values: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
        is_nullable: false,
        provenance: 'semantic' 
      },
      'attr-wr-budget': { id: 'attr-wr-budget', concept_id: 'concept-work-request', name: 'budget_code', value_type: 'text', is_state_attribute: false, is_nullable: false, provenance: 'semantic' },
      'attr-wr-due': { id: 'attr-wr-due', concept_id: 'concept-work-request', name: 'due_date', value_type: 'timestamp', is_state_attribute: false, is_nullable: false, provenance: 'semantic' }
    },
    relationships: [
      { id: 'rel-wr-host', name: 'targets_host', source_concept_id: 'concept-work-request', target_concept_id: 'concept-host', cardinality: 'N:1', provenance: 'semantic' }
    ],
    invariants: [
      INITIAL_RULES[3] // Temporal date rule
    ],
    state_transitions: [
      { id: 'st-wr1', concept_id: 'concept-work-request', from_state: 'DRAFT', to_state: 'SUBMITTED', trigger_event: 'SUBMIT_ACTION', provenance: 'semantic' },
      { id: 'st-wr2', concept_id: 'concept-work-request', from_state: 'SUBMITTED', to_state: 'APPROVED', trigger_event: 'QUORUM_APPROVAL', provenance: 'semantic' },
      { id: 'st-wr3', concept_id: 'concept-work-request', from_state: 'APPROVED', to_state: 'IN_PROGRESS', trigger_event: 'START_EXECUTION', provenance: 'semantic' },
      { id: 'st-wr4', concept_id: 'concept-work-request', from_state: 'IN_PROGRESS', to_state: 'COMPLETED', trigger_event: 'VERIFICATION_PASSED', provenance: 'semantic' }
    ]
  },
  'concept-data-asset': {
    id: 'concept-data-asset',
    name: 'DataAsset',
    label: 'Managed Data Store',
    description: 'Structured database or blob storage partition subject to compliance',
    created_at: '2026-08-20T10:00:00Z',
    provenance: 'semantic',
    frame_dimension_ids: ['dim-jur', 'dim-sec'],
    attributes: {
      'attr-da-name': { id: 'attr-da-name', concept_id: 'concept-data-asset', name: 'asset_name', value_type: 'text', is_state_attribute: false, is_nullable: false, provenance: 'semantic' },
      'attr-da-class': { 
        id: 'attr-da-class', 
        concept_id: 'concept-data-asset', 
        name: 'classification', 
        value_type: 'text', 
        is_state_attribute: false, 
        allowed_values: ['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED'],
        is_nullable: false,
        provenance: 'semantic' 
      },
      'attr-da-enc': { id: 'attr-da-enc', concept_id: 'concept-data-asset', name: 'encrypted', value_type: 'boolean', is_state_attribute: false, is_nullable: false, provenance: 'semantic' },
      'attr-da-ret': { id: 'attr-da-ret', concept_id: 'concept-data-asset', name: 'retention_days', value_type: 'integer', is_state_attribute: false, is_nullable: false, provenance: 'semantic' }
    },
    relationships: [],
    invariants: [
      INITIAL_RULES[4]
    ],
    state_transitions: []
  },
  'concept-security-policy': {
    id: 'concept-security-policy',
    name: 'SecurityPolicy',
    label: 'Security & Access Policy',
    description: 'Machine-verifiable security baseline',
    created_at: '2026-08-20T10:00:00Z',
    provenance: 'semantic',
    frame_dimension_ids: ['dim-sec'],
    attributes: {
      'attr-sp-name': { id: 'attr-sp-name', concept_id: 'concept-security-policy', name: 'policy_name', value_type: 'text', is_state_attribute: false, is_nullable: false, provenance: 'semantic' },
      'attr-sp-tier': { id: 'attr-sp-tier', concept_id: 'concept-security-policy', name: 'tier', value_type: 'text', is_state_attribute: false, allowed_values: ['L1', 'L2', 'L3'], is_nullable: false, provenance: 'semantic' },
      'attr-sp-mfa': { id: 'attr-sp-mfa', concept_id: 'concept-security-policy', name: 'mfa_required', value_type: 'boolean', is_state_attribute: false, is_nullable: false, provenance: 'semantic' }
    },
    relationships: [],
    invariants: [],
    state_transitions: []
  }
};

export const INITIAL_ENTITIES: Entity[] = [
  {
    id: 'ent-host-01',
    external_id: 'host-prod-alpha-01',
    concept_id: 'concept-host',
    concept_name: 'Host',
    created_at: '2026-08-22T08:00:00Z',
    updated_at: '2026-08-27T11:30:00Z',
    provenance: 'concrete',
    shrapnel_object_id: 41,
    attributes: {
      hostname: 'host-prod-alpha-01.us-east.internal',
      cores: 32,
      ram_gb: 128,
      uptime_s: 1428500.5,
      status: 'ACTIVE',
      healthy: true,
      region: 'us-east-1'
    },
    eav_attributes: {
      kernel: '6.8.0-generic',
      numa_nodes: 2,
      hyperthreading: true,
      node_uuid: 'a3d8e572-9841-4cf1-8c43-85f6291a8e10'
    },
    context_tags: {
      environment: 'prod',
      jurisdiction: 'US',
      security_tier: 'high'
    }
  },
  {
    id: 'ent-host-02',
    external_id: 'host-prod-beta-02',
    concept_id: 'concept-host',
    concept_name: 'Host',
    created_at: '2026-08-23T09:00:00Z',
    updated_at: '2026-08-27T11:28:00Z',
    provenance: 'concrete',
    shrapnel_object_id: 42,
    attributes: {
      hostname: 'host-prod-beta-02.eu-west.internal',
      cores: 8,
      ram_gb: 32,
      uptime_s: 94210.0,
      status: 'ACTIVE',
      healthy: true,
      region: 'eu-west-1'
    },
    eav_attributes: {
      kernel: '6.8.0-generic',
      numa_nodes: 1,
      node_uuid: 'b9f2c114-1182-4211-9a3b-2871fcae0941'
    },
    context_tags: {
      environment: 'prod',
      jurisdiction: 'EU',
      security_tier: 'standard'
    }
  },
  {
    id: 'ent-host-03-faulty',
    external_id: 'host-stage-faulty-03',
    concept_id: 'concept-host',
    concept_name: 'Host',
    created_at: '2026-08-27T04:00:00Z',
    updated_at: '2026-08-27T10:00:00Z',
    provenance: 'concrete',
    shrapnel_object_id: 43,
    attributes: {
      hostname: 'host-stage-faulty-03.us-west.internal',
      cores: 4,
      ram_gb: 16,
      uptime_s: -3.5, // Negative uptime violation
      status: 'DEGRADED',
      healthy: false,
      region: 'us-west-2'
    },
    eav_attributes: {
      error_flag: 'clock_skew_detected',
      node_uuid: 'c812dd90-7714-4902-8be2-cc8910ef4129'
    },
    context_tags: {
      environment: 'staging',
      jurisdiction: 'US',
      security_tier: 'standard'
    }
  },
  {
    id: 'ent-srv-01',
    external_id: 'srv-auth-primary',
    concept_id: 'concept-service',
    concept_name: 'ServiceInstance',
    created_at: '2026-08-24T12:00:00Z',
    provenance: 'concrete',
    attributes: {
      service_name: 'auth-gateway',
      port: 8443,
      status: 'READY',
      desired_replicas: 4
    },
    context_tags: {
      environment: 'prod',
      security_tier: 'high'
    }
  },
  {
    id: 'ent-srv-02',
    external_id: 'srv-ledger-engine',
    concept_id: 'concept-service',
    concept_name: 'ServiceInstance',
    created_at: '2026-08-25T14:00:00Z',
    provenance: 'concrete',
    attributes: {
      service_name: 'ledger-engine',
      port: 9090,
      status: 'READY',
      desired_replicas: 2
    },
    context_tags: {
      environment: 'prod',
      security_tier: 'high'
    }
  },
  {
    id: 'ent-wr-01',
    external_id: 'WR-2026-0801',
    concept_id: 'concept-work-request',
    concept_name: 'WorkRequest',
    created_at: '2026-08-26T10:00:00Z',
    provenance: 'concrete',
    attributes: {
      title: 'Upgrade Kernel on US-East Host Cluster',
      status: 'SUBMITTED',
      priority: 'HIGH',
      budget_code: 'INFRA-SEC-99',
      due_date: '2026-09-01T00:00:00Z'
    },
    context_tags: {
      environment: 'prod'
    }
  },
  {
    id: 'ent-wr-02-bad-temporal',
    external_id: 'WR-2026-0802-TEMPVIOLATION',
    concept_id: 'concept-work-request',
    concept_name: 'WorkRequest',
    created_at: '2026-08-27T09:00:00Z',
    provenance: 'concrete',
    attributes: {
      title: 'Retroactive Audit Patch',
      status: 'SUBMITTED',
      priority: 'MEDIUM',
      budget_code: 'AUDIT-88',
      due_date: '2026-08-20T00:00:00Z' // Due date before created_at -> Pre-LLM Temporal Pattern catch!
    },
    context_tags: {
      environment: 'staging'
    }
  },
  {
    id: 'ent-da-01',
    external_id: 'vault-customer-pii-eu',
    concept_id: 'concept-data-asset',
    concept_name: 'DataAsset',
    created_at: '2026-08-21T00:00:00Z',
    provenance: 'concrete',
    attributes: {
      asset_name: 'customer_identities_shard_eu',
      classification: 'RESTRICTED',
      encrypted: true,
      retention_days: 365
    },
    context_tags: {
      jurisdiction: 'EU',
      security_tier: 'high'
    }
  },
  {
    id: 'ent-pol-01',
    external_id: 'pol-zero-trust-l3',
    concept_id: 'concept-security-policy',
    concept_name: 'SecurityPolicy',
    created_at: '2026-08-01T00:00:00Z',
    provenance: 'concrete',
    attributes: {
      policy_name: 'Tier-3 Zero Trust Core Node',
      tier: 'L3',
      mfa_required: true
    },
    context_tags: {
      security_tier: 'high'
    }
  }
];

export const INITIAL_FACTS: Fact[] = [
  { id: 'fact-1', entity_id: 'ent-host-01', predicate: 'hosts_services', target_id_or_value: 'ent-srv-01', is_eav: false, confidence: 1.0, asserted_at: '2026-08-24T12:00:00Z', source: 'orchestrator-sync', provenance: 'concrete' },
  { id: 'fact-2', entity_id: 'ent-host-02', predicate: 'hosts_services', target_id_or_value: 'ent-srv-02', is_eav: false, confidence: 1.0, asserted_at: '2026-08-25T14:00:00Z', source: 'orchestrator-sync', provenance: 'concrete' },
  { id: 'fact-3', entity_id: 'ent-host-01', predicate: 'governed_by', target_id_or_value: 'ent-pol-01', is_eav: false, confidence: 1.0, asserted_at: '2026-08-22T08:00:00Z', source: 'policy-attestation', provenance: 'concrete' },
  { id: 'fact-4', entity_id: 'ent-srv-01', predicate: 'accesses_data', target_id_or_value: 'ent-da-01', is_eav: false, confidence: 0.98, asserted_at: '2026-08-24T12:05:00Z', source: 'iam-role-audit', provenance: 'concrete' },
  { id: 'fact-5', entity_id: 'ent-host-01', predicate: 'numa_nodes', target_id_or_value: 2, is_eav: true, confidence: 1.0, asserted_at: '2026-08-27T08:15:00Z', source: 'shrapnel:41', provenance: 'eav' },
  { id: 'fact-6', entity_id: 'ent-host-03-faulty', predicate: 'error_flag', target_id_or_value: 'clock_skew_detected', is_eav: true, confidence: 1.0, asserted_at: '2026-08-27T09:00:00Z', source: 'shrapnel:43', provenance: 'eav' }
];

export const INITIAL_PROPOSITIONS: Proposition[] = [
  {
    id: 'prop-host01-prod-compute',
    title: 'host-prod-alpha-01 meets Production Compute Baseline',
    description: 'Asserts host has >= 8 cores and >= 16GB RAM for production workload resilience.',
    asset_concept_id: 'concept-host',
    subject_entity_id: 'ent-host-01',
    disposition: Disposition.Asserted,
    confidence: 1.0,
    assertion_rule_ids: ['rule-host-cores', 'rule-host-uptime', 'rule-host-prod-capacity'],
    frame_context: { environment: 'prod', jurisdiction: 'US' },
    last_evaluated_at: '2026-08-27T11:35:00Z',
    provenance: 'evaluated'
  },
  {
    id: 'prop-host03-integrity',
    title: 'host-stage-faulty-03 Hardware Integrity Attestation',
    description: 'Evaluates if telemetry invariants hold without clock skew or corruption.',
    asset_concept_id: 'concept-host',
    subject_entity_id: 'ent-host-03-faulty',
    disposition: Disposition.Rejected,
    confidence: 0.0,
    assertion_rule_ids: ['rule-host-cores', 'rule-host-uptime'],
    frame_context: { environment: 'staging' },
    last_evaluated_at: '2026-08-27T11:36:00Z',
    provenance: 'evaluated'
  },
  {
    id: 'prop-wr01-approval',
    title: 'WR-2026-0801 Submission Validity & Policy Clearance',
    description: 'Work request timeline conforms to scheduling horizon and budget format.',
    asset_concept_id: 'concept-work-request',
    subject_entity_id: 'ent-wr-01',
    disposition: Disposition.Asserted,
    confidence: 0.95,
    assertion_rule_ids: ['rule-wr-dates'],
    frame_context: { environment: 'prod' },
    last_evaluated_at: '2026-08-27T11:37:00Z',
    provenance: 'evaluated'
  },
  {
    id: 'prop-wr02-temporal',
    title: 'WR-2026-0802-TEMPVIOLATION Timeline Sanity',
    description: 'Checks whether completion target occurs strictly after creation timestamp.',
    asset_concept_id: 'concept-work-request',
    subject_entity_id: 'ent-wr-02-bad-temporal',
    disposition: Disposition.Disputed,
    confidence: 0.1,
    assertion_rule_ids: ['rule-wr-dates'],
    frame_context: { environment: 'staging' },
    last_evaluated_at: '2026-08-27T11:38:00Z',
    provenance: 'evaluated'
  },
  {
    id: 'prop-da01-gdpr',
    title: 'vault-customer-pii-eu GDPR Compliance Assertion',
    description: 'Verifies data residency encryption and strict 2-year retention threshold under EU scope.',
    asset_concept_id: 'concept-data-asset',
    subject_entity_id: 'ent-da-01',
    disposition: Disposition.Asserted,
    confidence: 1.0,
    assertion_rule_ids: ['rule-data-gdpr'],
    frame_context: { jurisdiction: 'EU', security_tier: 'high' },
    last_evaluated_at: '2026-08-27T11:39:00Z',
    provenance: 'evaluated'
  }
];

export const INITIAL_REPRESENTATIONS: Record<string, RepresentationMapping> = {
  'concept-host': {
    id: 'rep-host',
    concept_id: 'concept-host',
    inbound_source: {
      format: 'OWL',
      source_uri: 'http://ontology.enterprise.org/infra/Host#Host',
      axioms_count: 14,
      parsed_classes: ['InfrastructureNode', 'ComputeHost', 'HardwareAsset'],
      raw_syntax: `Class: infra:Host
  SubClassOf: infra:InfrastructureNode
  Annotations: rdfs:label "Compute Host"@en,
               rdfs:comment "Bare metal server or virtualized compute node substrate"@en
  DisjointWith: infra:NetworkSwitch
  Facts:
    infra:hasCores exactly 1 xsd:integer,
    infra:hasUptime exactly 1 xsd:double,
    infra:hasState exactly 1 infra:HostLifecycleState
`
    },
    outbound_projections: {
      TypeSpec: {
        ast_nodes: 18,
        is_synchronized: true,
        last_projected_at: '2026-08-27T11:00:00Z',
        generated_code: `import "@typespec/http";
import "@typespec/openapi";

namespace Sol.Infra;

enum HostStatus {
  PROVISIONING,
  ACTIVE,
  DEGRADED,
  DRAINING,
  TERMINATED
}

@doc("Bare metal server or virtualized compute node substrate")
model Host {
  @key id: string;
  hostname: string;
  @minValue(1) cores: int64;
  ram_gb: int32;
  @minValue(0) uptime_s: float64;
  status: HostStatus;
  healthy: boolean;
  region: string;
  
  @doc("Polymorphic EAV attributes bound via Shrapnel engine")
  eav?: Record<unknown>;
}`
      },
      CUE: {
        ast_nodes: 12,
        is_synchronized: true,
        last_projected_at: '2026-08-27T11:00:00Z',
        generated_code: `package infra

#HostStatus: "PROVISIONING" | "ACTIVE" | "DEGRADED" | "DRAINING" | "TERMINATED"

#Host: {
    id: string
    hostname: string
    cores: int & >0
    ram_gb: int & >=4
    uptime_s: number & >=0
    status: #HostStatus
    healthy: bool
    region: string
    ...
}`
      },
      TLA_PLUS: {
        ast_nodes: 24,
        is_synchronized: true,
        last_projected_at: '2026-08-27T11:00:00Z',
        generated_code: `--------------------------- MODULE HostSpecification ---------------------------
EXTENDS Integers, Sequences, TLC

CONSTANTS HostIds, Regions
VARIABLES hostState, hostUptime, hostCores

HostStatuses == {"PROVISIONING", "ACTIVE", "DEGRADED", "DRAINING", "TERMINATED"}

TypeOK == 
    /\\ hostState \\in [HostIds -> HostStatuses]
    /\\ hostCores \\in [HostIds -> Nat \\ {0}]
    /\\ hostUptime \\in [HostIds -> Nat]

Init ==
    /\\ hostState = [h \\in HostIds |-> "PROVISIONING"]
    /\\ hostCores = [h \\in HostIds |-> 32]
    /\\ hostUptime = [h \\in HostIds |-> 0]

BootComplete(h) ==
    /\\ hostState[h] = "PROVISIONING"
    /\\ hostState' = [hostState EXCEPT ![h] = "ACTIVE"]
    /\\ UNCHANGED <<hostCores, hostUptime>>

InvariantNonNegativeUptime == \\A h \\in HostIds: hostUptime[h] >= 0
=============================================================================`
      },
      JSON_LD: {
        ast_nodes: 9,
        is_synchronized: true,
        last_projected_at: '2026-08-27T11:00:00Z',
        generated_code: `{
  "@context": {
    "sol": "https://sol.spec.dev/vocab#",
    "xsd": "http://www.w3.org/2001/XMLSchema#",
    "Host": "sol:Host",
    "hostname": "sol:hostname",
    "cores": { "@id": "sol:cores", "@type": "xsd:integer" },
    "ram_gb": { "@id": "sol:ram_gb", "@type": "xsd:integer" },
    "uptime_s": { "@id": "sol:uptime_s", "@type": "xsd:double" },
    "status": "sol:status",
    "healthy": { "@id": "sol:healthy", "@type": "xsd:boolean" },
    "region": "sol:region"
  },
  "@type": "Host"
}`
      }
    }
  },
  'concept-work-request': {
    id: 'rep-wr',
    concept_id: 'concept-work-request',
    inbound_source: {
      format: 'SHACL',
      source_uri: 'http://ontology.enterprise.org/shapes/WorkRequestShape',
      axioms_count: 8,
      parsed_classes: ['WorkRequestShape', 'NodeShape'],
      raw_syntax: `ex:WorkRequestShape
  a sh:NodeShape ;
  sh:targetClass ex:WorkRequest ;
  sh:property [
    sh:path ex:priority ;
    sh:in ( "LOW" "MEDIUM" "HIGH" "CRITICAL" ) ;
    sh:minCount 1 ;
  ] ;
  sh:property [
    sh:path ex:due_date ;
    sh:datatype xsd:dateTime ;
    sh:minCount 1 ;
  ] .`
    },
    outbound_projections: {
      TypeSpec: {
        ast_nodes: 14,
        is_synchronized: true,
        last_projected_at: '2026-08-27T11:00:00Z',
        generated_code: `namespace Sol.Governance;

enum WorkRequestStatus {
  DRAFT,
  SUBMITTED,
  APPROVED,
  IN_PROGRESS,
  COMPLETED,
  CANCELLED
}

enum Priority { LOW, MEDIUM, HIGH, CRITICAL }

model WorkRequest {
  @key id: string;
  title: string;
  status: WorkRequestStatus;
  priority: Priority;
  budget_code: string;
  due_date: utcDateTime;
}`
      },
      CUE: {
        ast_nodes: 8,
        is_synchronized: true,
        last_projected_at: '2026-08-27T11:00:00Z',
        generated_code: `package governance

#Priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
#WorkRequestStatus: "DRAFT" | "SUBMITTED" | "APPROVED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"

#WorkRequest: {
    id: string
    title: string
    status: #WorkRequestStatus
    priority: #Priority
    budget_code: =~"^[A-Z]{3,6}-[A-Z]{2,4}-[0-9]{2,4}$"
    due_date: string
}`
      },
      TLA_PLUS: {
        ast_nodes: 15,
        is_synchronized: true,
        last_projected_at: '2026-08-27T11:00:00Z',
        generated_code: `------------------------ MODULE WorkRequestLifecycle ------------------------
EXTENDS FiniteSets

CONSTANTS RequestIds
VARIABLES requestState

States == {"DRAFT", "SUBMITTED", "APPROVED", "IN_PROGRESS", "COMPLETED", "CANCELLED"}

Submit(r) == 
    /\\ requestState[r] = "DRAFT"
    /\\ requestState' = [requestState EXCEPT ![r] = "SUBMITTED"]

Approve(r) ==
    /\\ requestState[r] = "SUBMITTED"
    /\\ requestState' = [requestState EXCEPT ![r] = "APPROVED"]
=============================================================================`
      },
      JSON_LD: {
        ast_nodes: 7,
        is_synchronized: true,
        last_projected_at: '2026-08-27T11:00:00Z',
        generated_code: `{
  "@context": {
    "sol": "https://sol.spec.dev/vocab#",
    "xsd": "http://www.w3.org/2001/XMLSchema#",
    "WorkRequest": "sol:WorkRequest",
    "title": "sol:title",
    "status": "sol:status",
    "priority": "sol:priority",
    "budget_code": "sol:budget_code",
    "due_date": { "@id": "sol:due_date", "@type": "xsd:dateTime" }
  },
  "@type": "WorkRequest"
}`
      }
    }
  }
};
