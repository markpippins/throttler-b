import React from 'react';
import type { CapabilityId } from '@nexus/projection-core';
import type { RelicArchetype } from '../types';
import type {
  WidgetManifestEntry,
  WidgetFunctionalCategory,
  SubfolderCatalogManifest,
  MasterWidgetManifest,
  ScannerOptions,
  RelicInputDescriptor,
  RelicEndpointDescriptor,
} from './manifest';
import {
  SparklineRelic,
  GaugeRelic,
  InventoryTableRelic,
  ExecutionStateConsoleRelic,
  CpfReadinessDialRelic,
  EntityCountsMatrixRelic,
  ConduitPlanKanbanRelic,
  AgentRecordTelemetryRelic,
  CrossReferenceLatticeRelic,
  OpenQuestionDeliberationRelic,
} from '../relics/HarvestedRelics';

/**
 * Known subfolders under angular/ along with their configuration and default metadata.
 */
export interface AngularSubfolderConfig {
  subfolder: string;
  path: string;
  displayName: string;
  description: string;
  version: string;
}

const REGISTERED_ANGULAR_SUBFOLDERS: Map<string, AngularSubfolderConfig> = new Map([
  [
    'surface-ui',
    {
      subfolder: 'surface-ui',
      path: 'angular/surface-ui',
      displayName: 'Surface UI Relics & Runtime',
      description: 'Canonical interactive widgets, execution consoles, telemetry monitors, and contract adapters.',
      version: '1.0.0',
    },
  ],
]);

/**
 * Register a new angular/ subfolder to be scanned as more are added.
 */
export function registerAngularSubfolder(config: AngularSubfolderConfig): void {
  REGISTERED_ANGULAR_SUBFOLDERS.set(config.subfolder, config);
}

/**
 * Discover all registered and configured angular/ subfolders.
 */
export function discoverAngularSubfolders(): AngularSubfolderConfig[] {
  return Array.from(REGISTERED_ANGULAR_SUBFOLDERS.values());
}

/**
 * Deduce or validate functional category (UI, Data, Utility) for a widget.
 */
export function inferFunctionalCategory(params: {
  componentName?: string;
  archetype?: RelicArchetype;
  capabilities?: CapabilityId[];
  tags?: string[];
  category?: WidgetFunctionalCategory;
}): WidgetFunctionalCategory {
  if (params.category) return params.category;
  const name = params.componentName || '';
  const tags = params.tags || [];
  const caps = params.capabilities || [];
  const combined = `${name} ${tags.join(' ')}`.toLowerCase();

  if (
    params.archetype === 'data-vis' ||
    caps.includes('MetricSeries' as CapabilityId) ||
    caps.includes('KeyMetricMatrix' as CapabilityId) ||
    /(?:sparkline|gauge|chart|metric|series|telemetry|matrix|stats|graph|counter|measure|timeseries)/i.test(combined)
  ) {
    return 'Data';
  }

  if (
    /(?:console|dial|readiness|guard|switchboard|audit|stream|policy|security|copilot|operator|workbench|governance|terminal|validator|tool)/i.test(combined)
  ) {
    return 'Utility';
  }

  return 'UI';
}

/**
 * Heuristic parser to extract component metadata from source code or TSX files.
 */
export function parseComponentMetadataFromSource(
  sourceText: string,
  filePath: string,
  subfolder: string
): Partial<WidgetManifestEntry> {
  // Extract export function / const Name
  const exportMatch = sourceText.match(/export\s+(?:default\s+)?(?:function|const)\s+([A-Za-z0-9_]+)/);
  const componentName = exportMatch ? exportMatch[1] : filePath.split('/').pop()?.replace(/\.[^/.]+$/, '') || 'UnknownWidget';

  // Extract API endpoint comments e.g. // API: GET /api/metrics/sparkline
  const apiMatches = Array.from(sourceText.matchAll(/\/\/\s*API:\s*([A-Z]+)\s+([^\n\r]+)/g));
  const endpoints: RelicEndpointDescriptor[] = apiMatches.map((m) => ({
    raw: m[0].replace('// API: ', '').trim(),
    method: m[1],
    signature: m[2].trim(),
  }));

  // Infer archetype from component name and code content
  let archetype: RelicArchetype = 'react-component';
  if (/(?:Sparkline|Gauge|Chart|Metric|Series|Graph)/i.test(componentName)) {
    archetype = 'data-vis';
  } else if (/(?:Console|Switchboard|Dial|Control|Panel|Director)/i.test(componentName)) {
    archetype = 'control-surface';
  } else if (/(?:Kanban|Board|Lattice|Deliberation|Tool|Editor|Sandbox)/i.test(componentName)) {
    archetype = 'interactive-tool';
  } else if (/(?:Canvas|Overlay|Stage)/i.test(componentName)) {
    archetype = 'canvas-element';
  }

  // Infer capability based on name keywords
  const capabilities: CapabilityId[] = [];
  if (/(?:Sparkline|Metric|Series|Velocity|Trend)/i.test(componentName)) {
    capabilities.push('MetricSeries' as CapabilityId);
  } else if (/(?:Gauge|Dial|Utilization|KPI|Matrix)/i.test(componentName)) {
    capabilities.push('KeyMetricMatrix' as CapabilityId);
  } else if (/(?:Inventory|Table|List|Entity|Collection)/i.test(componentName)) {
    capabilities.push('EntityCollection' as CapabilityId);
  } else if (/(?:Kanban|Pipeline|Plan|Status)/i.test(componentName)) {
    capabilities.push('StatusBoard' as CapabilityId);
  } else if (/(?:Lattice|Inspector|CrossReference)/i.test(componentName)) {
    capabilities.push('InspectorPanel' as CapabilityId);
  } else if (/(?:Telemetry|Stream|Audit|Console)/i.test(componentName)) {
    capabilities.push('AuditStream' as CapabilityId);
  } else if (/(?:Deliberation|Question|Consensus)/i.test(componentName)) {
    capabilities.push('ConsensusMatrix' as CapabilityId);
  } else {
    capabilities.push('EntityCollection' as CapabilityId);
  }

  // Extract props if destructuring syntax is present
  const propsMatch = sourceText.match(/(?:function|const)\s+[A-Za-z0-9_]+\s*(?:=\s*)?\(\s*\{([^}]+)\}/);
  const inputs: RelicInputDescriptor[] = [];
  if (propsMatch && propsMatch[1]) {
    const rawProps = propsMatch[1].split(',');
    for (const propStr of rawProps) {
      const trimmed = propStr.trim();
      if (!trimmed) continue;
      const [nameAndDefault] = trimmed.split(':');
      const [name, defaultVal] = nameAndDefault.split('=').map((s) => s.trim());
      if (name) {
        inputs.push({
          name,
          type: 'any',
          required: defaultVal === undefined,
          defaultValue: defaultVal,
        });
      }
    }
  }

  return {
    id: `${subfolder}:${componentName}`,
    name: componentName.replace(/([A-Z])/g, ' $1').trim(),
    componentName,
    exportName: sourceText.includes('export default') ? 'default' : componentName,
    subfolder,
    sourcePath: filePath,
    archetype,
    category: inferFunctionalCategory({ componentName, archetype, capabilities, tags: [subfolder, archetype, componentName.toLowerCase()] }),
    description: `Discovered component export ${componentName} located in ${filePath}`,
    capabilities,
    inputs,
    endpoints,
    tags: [subfolder, archetype, componentName.toLowerCase()],
    code: sourceText,
    projectionConfig: {
      defaultDensity: archetype === 'data-vis' ? 'compact' : 'normal',
      defaultLayout: archetype === 'control-surface' ? 'header' : archetype === 'interactive-tool' ? 'main' : 'sidebar',
      capabilities,
      variants: ['default'],
      events: ['click', 'select'],
    },
  };
}

/**
 * Catalog of canonical widgets in angular/surface-ui.
 */
function scanSurfaceUiWidgets(): WidgetManifestEntry[] {
  const widgets: WidgetManifestEntry[] = [
    // 1. Sparkline
    {
      id: 'surface-ui:Sparkline',
      name: 'Sparkline Metric Monitor',
      componentName: 'Sparkline',
      exportName: 'default',
      subfolder: 'surface-ui',
      sourcePath: 'angular/surface-ui/src/lib/seed.ts',
      archetype: 'data-vis',
      category: 'Data',
      description: 'Compact time-series monitor charting live telemetry and velocity trends.',
      capabilities: ['MetricSeries' as CapabilityId],
      tags: ['telemetry', 'chart', 'metrics', 'sparkline', 'timeseries'],
      inputs: [
        { name: 'data', type: 'number[]', required: false, defaultValue: [12, 19, 8, 15, 22, 28, 35], description: 'Array of sequential data points' },
        { name: 'color', type: 'string', required: false, defaultValue: '#3b82f6', description: 'Hex stroke color for sparkline' },
        { name: 'height', type: 'number', required: false, defaultValue: 48, description: 'Component pixel height' },
        { name: 'fill', type: 'boolean', required: false, defaultValue: true, description: 'Whether to render area gradient' },
      ],
      endpoints: [
        { raw: 'GET /api/telemetry/timeseries', method: 'GET', signature: '/api/telemetry/timeseries', description: 'Stream of real-time telemetry metrics' },
      ],
      projectionConfig: {
        defaultDensity: 'compact',
        defaultLayout: 'header',
        capabilities: ['MetricSeries' as CapabilityId],
        variants: ['line', 'area'],
        events: ['hover', 'click', 'inspect'],
      },
      code: `export default function Sparkline({ data, color = "#3b82f6" }) { ... }`,
      component: SparklineRelic,
      render: (props) => React.createElement(SparklineRelic, props),
      defaultProps: {
        data: [14, 21, 19, 27, 33, 29, 42, 38, 45],
        color: '#3b82f6',
        height: 48,
        fill: true,
      },
      mockData: { points: [14, 21, 19, 27, 33, 29, 42, 38, 45] },
    },

    // 2. Gauge
    {
      id: 'surface-ui:Gauge',
      name: 'Circular Utilization Gauge',
      componentName: 'Gauge',
      exportName: 'default',
      subfolder: 'surface-ui',
      sourcePath: 'angular/surface-ui/src/lib/seed.ts',
      archetype: 'control-surface',
      category: 'Data',
      description: 'Radial meter indicating capacity, quota consumption, and system load metrics.',
      capabilities: ['KeyMetricMatrix' as CapabilityId],
      tags: ['gauge', 'quota', 'capacity', 'performance', 'radial'],
      inputs: [
        { name: 'value', type: 'number', required: true, defaultValue: 74, description: 'Current metric gauge value' },
        { name: 'max', type: 'number', required: false, defaultValue: 100, description: 'Maximum gauge scale ceiling' },
        { name: 'label', type: 'string', required: false, defaultValue: 'utilization', description: 'Sub-label displayed beneath meter' },
        { name: 'color', type: 'string', required: false, defaultValue: '#10b981', description: 'Primary meter progress stroke' },
      ],
      endpoints: [
        { raw: 'GET /api/system/utilization', method: 'GET', signature: '/api/system/utilization', description: 'System memory, inode, and quota utilization' },
      ],
      projectionConfig: {
        defaultDensity: 'compact',
        defaultLayout: 'header',
        capabilities: ['KeyMetricMatrix' as CapabilityId],
        variants: ['radial', 'half-dial'],
        events: ['change', 'click'],
      },
      code: `export default function Gauge({ value, max = 100, label = "utilization" }) { ... }`,
      component: GaugeRelic,
      render: (props) => React.createElement(GaugeRelic, props),
      defaultProps: {
        value: 78,
        max: 100,
        label: 'VFS Cache Usage',
        color: '#10b981',
      },
      mockData: { value: 78, max: 100, label: 'Capacity' },
    },

    // 3. Inventory Table
    {
      id: 'surface-ui:InventoryTable',
      name: 'Inventory & Stock Table',
      componentName: 'InventoryTable',
      exportName: 'default',
      subfolder: 'surface-ui',
      sourcePath: 'angular/surface-ui/src/lib/seed.ts',
      archetype: 'react-component',
      category: 'UI',
      description: 'High-density entity table displaying inventory, stock balances, and allocation levels.',
      capabilities: ['EntityCollection' as CapabilityId],
      tags: ['table', 'inventory', 'entities', 'catalog', 'stock'],
      inputs: [
        { name: 'items', type: 'InventoryItem[]', required: false, description: 'Array of inventory items with stock counts and status' },
      ],
      endpoints: [
        { raw: 'GET /api/inventory/items', method: 'GET', signature: '/api/inventory/items', description: 'Retrieve paginated inventory entity items' },
      ],
      projectionConfig: {
        defaultDensity: 'normal',
        defaultLayout: 'main',
        capabilities: ['EntityCollection' as CapabilityId],
        variants: ['compact', 'detailed'],
        events: ['select', 'sort', 'filter'],
      },
      code: `export default function InventoryTable({ items = [] }) { ... }`,
      component: InventoryTableRelic,
      render: (props) => React.createElement(InventoryTableRelic, props),
      defaultProps: {},
    },

    // 4. Execution State Console
    {
      id: 'surface-ui:ExecutionStateConsole',
      name: 'Nebula Execution Switchboard',
      componentName: 'ExecutionStateConsole',
      exportName: 'default',
      subfolder: 'surface-ui',
      sourcePath: 'angular/surface-ui/src/lib/seed.ts',
      archetype: 'control-surface',
      category: 'Utility',
      description: 'Telemetry switchboard displaying execution requests, leases, and attempt states.',
      capabilities: ['KeyMetricMatrix' as CapabilityId, 'AuditStream' as CapabilityId],
      tags: ['execution', 'switchboard', 'leases', 'pipeline', 'console'],
      inputs: [
        { name: 'title', type: 'string', required: false, defaultValue: 'Nebula Execution Switchboard' },
        { name: 'requests', type: 'Record<string, number>', required: false },
        { name: 'leases', type: 'Record<string, number>', required: false },
        { name: 'attempts', type: 'Record<string, number>', required: false },
        { name: 'totalRequests', type: 'number', required: false, defaultValue: 11 },
        { name: 'activeLeases', type: 'number', required: false, defaultValue: 1 },
      ],
      endpoints: [
        { raw: 'GET /api/nebula/execution/state', method: 'GET', signature: '/api/nebula/execution/state', description: 'Pipeline execution states and active leases' },
      ],
      projectionConfig: {
        defaultDensity: 'highSalience',
        defaultLayout: 'header',
        capabilities: ['KeyMetricMatrix' as CapabilityId, 'AuditStream' as CapabilityId],
        variants: ['default', 'dense'],
        events: ['refresh', 'inspect'],
      },
      code: `export default function ExecutionStateConsole({ title, requests, leases, attempts }) { ... }`,
      component: ExecutionStateConsoleRelic,
      render: (props) => React.createElement(ExecutionStateConsoleRelic, props),
      defaultProps: {},
    },

    // 5. CPF Readiness Dial
    {
      id: 'surface-ui:CpfReadinessDial',
      name: 'CPF Readiness & Guard Dial',
      componentName: 'CpfReadinessDial',
      exportName: 'default',
      subfolder: 'surface-ui',
      sourcePath: 'angular/surface-ui/src/lib/seed.ts',
      archetype: 'control-surface',
      category: 'Utility',
      description: 'Audit readiness dial evaluating contract enforcement and policy compliance scores.',
      capabilities: ['KeyMetricMatrix' as CapabilityId],
      tags: ['readiness', 'cpf', 'compliance', 'security', 'dial'],
      inputs: [
        { name: 'score', type: 'number', required: false, defaultValue: 94 },
        { name: 'status', type: 'string', required: false, defaultValue: 'ADMITTED' },
        { name: 'violations', type: 'number', required: false, defaultValue: 0 },
      ],
      endpoints: [
        { raw: 'GET /api/cpf/readiness', method: 'GET', signature: '/api/cpf/readiness', description: 'Audit verification score and invariant violations' },
      ],
      projectionConfig: {
        defaultDensity: 'compact',
        defaultLayout: 'header',
        capabilities: ['KeyMetricMatrix' as CapabilityId],
        variants: ['standard', 'badge'],
        events: ['audit', 'click'],
      },
      code: `export default function CpfReadinessDial({ score = 94, status = "ADMITTED" }) { ... }`,
      component: CpfReadinessDialRelic,
      render: (props) => React.createElement(CpfReadinessDialRelic, props),
      defaultProps: {},
    },

    // 6. Entity Counts Matrix
    {
      id: 'surface-ui:EntityCountsMatrix',
      name: '13-Entity Schema Matrix',
      componentName: 'EntityCountsMatrix',
      exportName: 'default',
      subfolder: 'surface-ui',
      sourcePath: 'angular/surface-ui/src/lib/seed.ts',
      archetype: 'data-vis',
      category: 'Data',
      description: 'Comprehensive grid detailing entity tallies across the 13 canonical ontology schemas.',
      capabilities: ['EntityCollection' as CapabilityId, 'KeyMetricMatrix' as CapabilityId],
      tags: ['ontology', 'matrix', 'entities', 'schema', 'counts'],
      inputs: [
        { name: 'counts', type: 'Record<string, number>', required: false },
        { name: 'onSelectEntity', type: '(entity: string) => void', required: false },
      ],
      endpoints: [
        { raw: 'GET /api/ontology/entity-counts', method: 'GET', signature: '/api/ontology/entity-counts', description: 'Tallies of entities per ontology domain' },
      ],
      projectionConfig: {
        defaultDensity: 'normal',
        defaultLayout: 'main',
        capabilities: ['EntityCollection' as CapabilityId, 'KeyMetricMatrix' as CapabilityId],
        variants: ['grid', 'list'],
        events: ['select_entity', 'filter'],
      },
      code: `export default function EntityCountsMatrix({ counts, onSelectEntity }) { ... }`,
      component: EntityCountsMatrixRelic,
      render: (props) => React.createElement(EntityCountsMatrixRelic, props),
      defaultProps: {},
    },

    // 7. Conduit Plan Kanban
    {
      id: 'surface-ui:ConduitPlanKanban',
      name: 'Conduit Implementation Kanban',
      componentName: 'ConduitPlanKanban',
      exportName: 'default',
      subfolder: 'surface-ui',
      sourcePath: 'angular/surface-ui/src/lib/seed.ts',
      archetype: 'interactive-tool',
      category: 'UI',
      description: 'Interactive kanban board tracking execution plans across stages.',
      capabilities: ['StatusBoard' as CapabilityId],
      tags: ['kanban', 'plans', 'conduit', 'tasks', 'workflow'],
      inputs: [
        { name: 'plans', type: 'ConduitPlan[]', required: false },
        { name: 'onMovePlan', type: '(planId: string, targetStage: string) => void', required: false },
      ],
      endpoints: [
        { raw: 'GET /api/conduit/plans', method: 'GET', signature: '/api/conduit/plans', description: 'Plans organized by state columns' },
      ],
      projectionConfig: {
        defaultDensity: 'spacious',
        defaultLayout: 'main',
        capabilities: ['StatusBoard' as CapabilityId],
        variants: ['columns', 'cards'],
        events: ['move_plan', 'select_plan', 'drop'],
      },
      code: `export default function ConduitPlanKanban({ plans, onMovePlan }) { ... }`,
      component: ConduitPlanKanbanRelic,
      render: (props) => React.createElement(ConduitPlanKanbanRelic, props),
      defaultProps: {},
    },

    // 8. Agent Record Telemetry
    {
      id: 'surface-ui:AgentRecordTelemetry',
      name: 'Multi-Agent Telemetry Stream',
      componentName: 'AgentRecordTelemetry',
      exportName: 'default',
      subfolder: 'surface-ui',
      sourcePath: 'angular/surface-ui/src/lib/seed.ts',
      archetype: 'data-vis',
      category: 'Data',
      description: 'Continuous audit log streaming multi-agent records, tool calls, and state transitions.',
      capabilities: ['AuditStream' as CapabilityId],
      tags: ['agents', 'telemetry', 'stream', 'audit', 'logs'],
      inputs: [
        { name: 'records', type: 'AgentRecord[]', required: false },
        { name: 'filterAgent', type: 'string', required: false },
      ],
      endpoints: [
        { raw: 'GET /api/agents/telemetry/stream', method: 'GET', signature: '/api/agents/telemetry/stream', description: 'Streaming agent activity logs' },
      ],
      projectionConfig: {
        defaultDensity: 'compact',
        defaultLayout: 'footer',
        capabilities: ['AuditStream' as CapabilityId],
        variants: ['timeline', 'raw'],
        events: ['filter_agent', 'inspect_record'],
      },
      code: `export default function AgentRecordTelemetry({ records, filterAgent }) { ... }`,
      component: AgentRecordTelemetryRelic,
      render: (props) => React.createElement(AgentRecordTelemetryRelic, props),
      defaultProps: {},
    },

    // 9. Cross-Reference Lattice
    {
      id: 'surface-ui:CrossReferenceLattice',
      name: 'Ontological Dependency Lattice',
      componentName: 'CrossReferenceLattice',
      exportName: 'default',
      subfolder: 'surface-ui',
      sourcePath: 'angular/surface-ui/src/lib/seed.ts',
      archetype: 'interactive-tool',
      category: 'UI',
      description: 'Node-edge graph visualizer showing relationships between ontology concepts and VFS nodes.',
      capabilities: ['InspectorPanel' as CapabilityId],
      tags: ['graph', 'lattice', 'dependencies', 'ontology', 'inspector'],
      inputs: [
        { name: 'nodes', type: 'LatticeNode[]', required: false },
        { name: 'edges', type: 'LatticeEdge[]', required: false },
        { name: 'onSelectNode', type: '(id: string) => void', required: false },
      ],
      endpoints: [
        { raw: 'GET /api/ontology/lattice', method: 'GET', signature: '/api/ontology/lattice', description: 'Cross-reference lattice graph topology' },
      ],
      projectionConfig: {
        defaultDensity: 'normal',
        defaultLayout: 'sidebar',
        capabilities: ['InspectorPanel' as CapabilityId],
        variants: ['graph', 'list'],
        events: ['select_node', 'expand_cluster'],
      },
      code: `export default function CrossReferenceLattice({ nodes, edges, onSelectNode }) { ... }`,
      component: CrossReferenceLatticeRelic,
      render: (props) => React.createElement(CrossReferenceLatticeRelic, props),
      defaultProps: {},
    },

    // 10. Open Question Deliberation
    {
      id: 'surface-ui:OpenQuestionDeliberation',
      name: 'Deliberation & Consensus Matrix',
      componentName: 'OpenQuestionDeliberation',
      exportName: 'default',
      subfolder: 'surface-ui',
      sourcePath: 'angular/surface-ui/src/lib/seed.ts',
      archetype: 'interactive-tool',
      category: 'UI',
      description: 'Collaborative consensus tool resolving unresolved questions, proposals, and governance votes.',
      capabilities: ['ConsensusMatrix' as CapabilityId],
      tags: ['deliberation', 'consensus', 'questions', 'governance', 'votes'],
      inputs: [
        { name: 'questions', type: 'OpenQuestion[]', required: false },
        { name: 'onVote', type: '(questionId: string, option: string) => void', required: false },
      ],
      endpoints: [
        { raw: 'GET /api/governance/questions', method: 'GET', signature: '/api/governance/questions', description: 'Pending deliberation and consensus queries' },
      ],
      projectionConfig: {
        defaultDensity: 'normal',
        defaultLayout: 'main',
        capabilities: ['ConsensusMatrix' as CapabilityId],
        variants: ['cards', 'table'],
        events: ['submit_vote', 'resolve_question'],
      },
      code: `export default function OpenQuestionDeliberation({ questions, onVote }) { ... }`,
      component: OpenQuestionDeliberationRelic,
      render: (props) => React.createElement(OpenQuestionDeliberationRelic, props),
      defaultProps: {},
    },
  ];

  return widgets;
}

/**
 * Auxiliary components from angular/surface-ui/src/components/ studio and runtime
 */
function scanSurfaceUiAuxiliaryComponents(): WidgetManifestEntry[] {
  return [
    {
      id: 'surface-ui:WorkbenchSidebar',
      name: 'Workbench Navigation Sidebar',
      componentName: 'WorkbenchSidebar',
      exportName: 'WorkbenchSidebar',
      subfolder: 'surface-ui',
      sourcePath: 'angular/surface-ui/src/components/WorkbenchSidebar.tsx',
      archetype: 'control-surface',
      category: 'UI',
      description: 'Collapsible navigation sidebar indexing surface areas, tabs, and ontological roots.',
      capabilities: ['InspectorPanel' as CapabilityId],
      tags: ['navigation', 'sidebar', 'ui', 'shell'],
      inputs: [
        { name: 'activeTab', type: 'string', required: false, defaultValue: 'widgets' },
        { name: 'onTabSelect', type: '(tab: string) => void', required: false },
      ],
      endpoints: [],
      projectionConfig: {
        defaultDensity: 'normal',
        defaultLayout: 'sidebar',
        capabilities: ['InspectorPanel' as CapabilityId],
        variants: ['collapsed', 'expanded'],
        events: ['tab_change'],
      },
      defaultProps: {},
    },
    {
      id: 'surface-ui:GovernanceWorkbench',
      name: 'Aegis Governance Director Console',
      componentName: 'GovernanceWorkbench',
      exportName: 'GovernanceWorkbench',
      subfolder: 'surface-ui',
      sourcePath: 'angular/surface-ui/src/components/runtime/GovernanceWorkbench.tsx',
      archetype: 'interactive-tool',
      category: 'Utility',
      description: 'Authority inspection console verifying AST integrity, SolScript policies, and receipt chains.',
      capabilities: ['AuditStream' as CapabilityId, 'InspectorPanel' as CapabilityId],
      tags: ['governance', 'aegis', 'ast', 'solscript', 'security'],
      inputs: [
        { name: 'mode', type: 'string', required: false, defaultValue: 'LIVE GOVERNED' },
        { name: 'onEvaluate', type: '() => void', required: false },
      ],
      endpoints: [
        { raw: 'POST /api/governance/evaluate', method: 'POST', signature: '/api/governance/evaluate' },
      ],
      projectionConfig: {
        defaultDensity: 'normal',
        defaultLayout: 'main',
        capabilities: ['AuditStream' as CapabilityId, 'InspectorPanel' as CapabilityId],
        variants: ['full', 'compact'],
        events: ['audit_executed'],
      },
      defaultProps: {},
    },
    {
      id: 'surface-ui:OperatorPanel',
      name: 'Co-Pilot Operator Persona Panel',
      componentName: 'OperatorPanel',
      exportName: 'OperatorPanel',
      subfolder: 'surface-ui',
      sourcePath: 'angular/surface-ui/src/components/runtime/OperatorPanel.tsx',
      archetype: 'interactive-tool',
      category: 'Utility',
      description: 'Contextual AI operator persona observing current surface viewport and executing actions.',
      capabilities: ['InspectorPanel' as CapabilityId],
      tags: ['operator', 'copilot', 'assistant', 'ai'],
      inputs: [
        { name: 'context', type: 'Record<string, unknown>', required: false },
      ],
      endpoints: [],
      projectionConfig: {
        defaultDensity: 'compact',
        defaultLayout: 'sidebar',
        capabilities: ['InspectorPanel' as CapabilityId],
        variants: ['flyout', 'docked'],
        events: ['operator_prompt'],
      },
      defaultProps: {},
    },
  ];
}

/**
 * Scan a specific subfolder under angular/ and produce a SubfolderCatalogManifest.
 */
export function scanSubfolder(
  subfolderName: string,
  options: ScannerOptions = {}
): SubfolderCatalogManifest {
  const config = REGISTERED_ANGULAR_SUBFOLDERS.get(subfolderName) || {
    subfolder: subfolderName,
    path: `angular/${subfolderName}`,
    displayName: `${subfolderName.toUpperCase()} Component Suite`,
    description: `Discovered widgets and components in angular/${subfolderName}`,
    version: '1.0.0',
  };

  let widgets: WidgetManifestEntry[] = [];
  const sourceFilesScanned: string[] = [];

  if (subfolderName === 'surface-ui') {
    widgets = scanSurfaceUiWidgets();
    sourceFilesScanned.push('angular/surface-ui/src/lib/seed.ts');
    sourceFilesScanned.push('angular/surface-ui/src/lib/widget-types.ts');
    sourceFilesScanned.push('angular/surface-ui/src/lib/capabilities-registry.ts');

    if (options.includeAuxiliaryComponents) {
      widgets.push(...scanSurfaceUiAuxiliaryComponents());
      sourceFilesScanned.push('angular/surface-ui/src/components/WorkbenchSidebar.tsx');
      sourceFilesScanned.push('angular/surface-ui/src/components/runtime/GovernanceWorkbench.tsx');
      sourceFilesScanned.push('angular/surface-ui/src/components/runtime/OperatorPanel.tsx');
    }
  } else {
    // For newly added subfolders (e.g. analytics-ui, operator-ui)
    // Synthesize scanned entry placeholders based on name
    const genericWidget = parseComponentMetadataFromSource(
      `export default function ${subfolderName.replace(/[^a-zA-Z0-9]/g, '')}Widget() { return <div>${subfolderName}</div>; }`,
      `${config.path}/src/components/Widget.tsx`,
      subfolderName
    );
    widgets.push(genericWidget as WidgetManifestEntry);
    sourceFilesScanned.push(`${config.path}/src/components/Widget.tsx`);
  }

  // Compile capabilities and archetypes present
  const capabilitiesSet = new Set<CapabilityId>();
  const archetypesSet = new Set<RelicArchetype>();

  widgets.forEach((w) => {
    if (!w.version) {
      w.version = config.version || '1.0.0';
    }
    if (!w.category) {
      w.category = inferFunctionalCategory(w);
    }
    w.capabilities.forEach((c) => capabilitiesSet.add(c));
    archetypesSet.add(w.archetype);
  });

  return {
    subfolder: config.subfolder,
    displayName: config.displayName,
    description: config.description,
    version: config.version,
    path: config.path,
    scannedAt: new Date().toISOString(),
    widgetCount: widgets.length,
    widgets,
    capabilitiesSupported: Array.from(capabilitiesSet),
    archetypesPresent: Array.from(archetypesSet),
    sourceFilesScanned,
  };
}

/**
 * Scan all available angular/ subfolders and compile a unified MasterWidgetManifest.
 */
export function scanAngularWidgets(options: ScannerOptions = {}): MasterWidgetManifest {
  // Register any caller-provided additional subfolders
  if (options.additionalSubfolders) {
    options.additionalSubfolders.forEach((sub) => {
      registerAngularSubfolder({
        subfolder: sub.subfolder,
        path: sub.path,
        displayName: sub.displayName || sub.subfolder,
        description: `Dynamically declared subfolder ${sub.subfolder}`,
        version: '1.0.0',
      });
    });
  }

  const allSubfolderConfigs = discoverAngularSubfolders();
  const subfoldersToScan = options.targetSubfolders
    ? allSubfolderConfigs.filter((c) => options.targetSubfolders?.includes(c.subfolder))
    : allSubfolderConfigs;

  const subfoldersRecord: Record<string, SubfolderCatalogManifest> = {};
  const allWidgets: WidgetManifestEntry[] = [];
  const byId: Record<string, WidgetManifestEntry> = {};
  const byCapability: Record<string, WidgetManifestEntry[]> = {};
  const byArchetype: Record<string, WidgetManifestEntry[]> = {};
  const bySubfolder: Record<string, WidgetManifestEntry[]> = {};
  const byCategory: Record<WidgetFunctionalCategory, WidgetManifestEntry[]> = {
    UI: [],
    Data: [],
    Utility: [],
  };

  subfoldersToScan.forEach((conf) => {
    const manifest = scanSubfolder(conf.subfolder, options);
    subfoldersRecord[conf.subfolder] = manifest;
    bySubfolder[conf.subfolder] = manifest.widgets;

    manifest.widgets.forEach((widget) => {
      // Ensure category is assigned
      const category = widget.category || inferFunctionalCategory(widget);
      widget.category = category;

      allWidgets.push(widget);
      byId[widget.id] = widget;

      // Index by category
      if (!byCategory[category]) {
        byCategory[category] = [];
      }
      byCategory[category].push(widget);

      // Index by archetype
      if (!byArchetype[widget.archetype]) {
        byArchetype[widget.archetype] = [];
      }
      byArchetype[widget.archetype].push(widget);

      // Index by capability
      widget.capabilities.forEach((cap) => {
        if (!byCapability[cap]) {
          byCapability[cap] = [];
        }
        byCapability[cap].push(widget);
      });
    });
  });

  const uniqueCapabilities = Object.keys(byCapability);
  const uniqueArchetypes = Object.keys(byArchetype);

  return {
    schemaVersion: '1.0.0',
    generatedAt: new Date().toISOString(),
    subfolders: subfoldersRecord,
    allWidgets,
    byId,
    byCapability,
    byArchetype,
    bySubfolder,
    byCategory,
    stats: {
      totalSubfolders: Object.keys(subfoldersRecord).length,
      totalWidgets: allWidgets.length,
      totalCapabilities: uniqueCapabilities.length,
      totalArchetypes: uniqueArchetypes.length,
      totalCategories: Object.keys(byCategory).filter((k) => byCategory[k as WidgetFunctionalCategory].length > 0).length,
    },
  };
}
