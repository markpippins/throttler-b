import React from 'react';
import { WidgetCatalog } from '@nexus/projection-core';
import type { CapabilityId } from '@nexus/projection-core';
import type { AbsorbedWidget, OntologicalSpaceNode, RelicArchetype } from './types';
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
} from './relics/HarvestedRelics';

class WidgetAbsorptionRegistry {
  private absorbedWidgets: Map<string, AbsorbedWidget> = new Map();
  private projectionWidgetCatalog: WidgetCatalog;

  constructor() {
    this.projectionWidgetCatalog = new WidgetCatalog();
    this.registerHarvestedRelics();
  }

  private registerHarvestedRelics(): void {
    // 1. Sparkline
    this.absorb({
      id: 'relic-sparkline',
      name: 'Sparkline Metric Monitor',
      description: 'Compact time-series monitor charting live telemetry and velocity trends.',
      archetype: 'data-vis',
      componentName: 'Sparkline',
      tags: ['telemetry', 'chart', 'metrics', 'sparkline'],
      inputs: [
        { name: 'data', type: 'number[]', defaultValue: [12, 19, 8, 15, 22, 28, 35] },
        { name: 'color', type: 'string', defaultValue: '#3b82f6' },
      ],
      endpoints: [
        { raw: 'GET /api/telemetry/timeseries', method: 'GET', signature: '/api/telemetry/timeseries' },
      ],
      capabilities: ['MetricSeries' as CapabilityId],
      code: `export default function Sparkline({ data, color }) { ... }`,
      render: (props) => React.createElement(SparklineRelic, props),
      defaultProps: {
        data: [14, 21, 19, 27, 33, 29, 42, 38, 45],
        color: '#3b82f6',
      },
    });

    // 2. Gauge
    this.absorb({
      id: 'relic-gauge',
      name: 'Circular Utilization Gauge',
      description: 'Radial meter indicating capacity, quota consumption, and load metrics.',
      archetype: 'control-surface',
      componentName: 'Gauge',
      tags: ['gauge', 'quota', 'capacity', 'performance'],
      inputs: [
        { name: 'value', type: 'number', defaultValue: 74 },
        { name: 'max', type: 'number', defaultValue: 100 },
        { name: 'label', type: 'string', defaultValue: 'utilization' },
      ],
      endpoints: [
        { raw: 'GET /api/system/utilization', method: 'GET', signature: '/api/system/utilization' },
      ],
      capabilities: ['KeyMetricMatrix' as CapabilityId],
      code: `export default function Gauge({ value, max, label }) { ... }`,
      render: (props) => React.createElement(GaugeRelic, props),
      defaultProps: {
        value: 78,
        max: 100,
        label: 'VFS Cache Usage',
        color: '#10b981',
      },
    });

    // 3. Inventory Table
    this.absorb({
      id: 'relic-inventory-table',
      name: 'Inventory & Stock Table',
      description: 'High-density entity table displaying inventory, stock balances, and allocation levels.',
      archetype: 'react-component',
      componentName: 'InventoryTable',
      tags: ['table', 'inventory', 'entities', 'catalog'],
      inputs: [{ name: 'items', type: 'InventoryItem[]' }],
      endpoints: [
        { raw: 'GET /api/inventory/items', method: 'GET', signature: '/api/inventory/items' },
      ],
      capabilities: ['EntityCollection' as CapabilityId],
      code: `export default function InventoryTable({ items }) { ... }`,
      render: (props) => React.createElement(InventoryTableRelic, props),
      defaultProps: {},
    });

    // 4. Execution State Console
    this.absorb({
      id: 'relic-execution-state',
      name: 'Nebula Execution Switchboard',
      description: 'Real-time compilation pipeline monitor displaying request states, worker leases, and run attempts.',
      archetype: 'control-surface',
      componentName: 'ExecutionStateConsole',
      tags: ['pipeline', 'leases', 'nebula', 'execution'],
      inputs: [
        { name: 'title', type: 'string' },
        { name: 'requests', type: 'object' },
        { name: 'leases', type: 'object' },
      ],
      endpoints: [
        { raw: 'GET /api/execution/state', method: 'GET', signature: '/api/execution/state' },
      ],
      capabilities: ['StatusBoard' as CapabilityId, 'WorkQueue' as CapabilityId],
      code: `export default function ExecutionStateConsole({ title, requests, leases }) { ... }`,
      render: (props) => React.createElement(ExecutionStateConsoleRelic, props),
      defaultProps: {
        title: 'Nebula Execution Switchboard',
        requests: { DRAFT: 4, COMPILED: 8, ADMITTED: 3, READY: 2 },
        leases: { ACTIVE: 2, RELEASED: 6 },
        attempts: { RUNNING: 1, SUCCEEDED: 7, FAILED: 0 },
      },
    });

    // 5. CPF Readiness Dial
    this.absorb({
      id: 'relic-cpf-readiness',
      name: 'CPF Compilation Readiness Dial',
      description: 'Multi-band promotion readiness monitor assessing intent resolution across threshold gates.',
      archetype: 'data-vis',
      componentName: 'CpfReadinessDial',
      tags: ['cpf', 'readiness', 'compiler', 'metrics'],
      inputs: [
        { name: 'threshold', type: 'number', defaultValue: 0.7 },
        { name: 'system', type: 'string', defaultValue: 'nebula-core' },
      ],
      endpoints: [
        { raw: 'GET /api/cpf/count', method: 'GET', signature: '/api/cpf/count' },
      ],
      capabilities: ['KeyMetricMatrix' as CapabilityId],
      code: `export default function CpfReadinessDial({ counts, threshold }) { ... }`,
      render: (props) => React.createElement(CpfReadinessDialRelic, props),
      defaultProps: {
        title: 'Compilation Readiness (CPF)',
        threshold: 0.75,
        system: 'throttler-vfs',
      },
    });

    // 6. Entity Counts Matrix
    this.absorb({
      id: 'relic-counts-matrix',
      name: 'Entity Schema Matrix',
      description: 'Aggregated ontological type counters across threads, requirements, propositions, and evidence.',
      archetype: 'interactive-tool',
      componentName: 'EntityCountsMatrix',
      tags: ['schema', 'entities', 'ontology', 'matrix'],
      inputs: [{ name: 'counts', type: 'object' }],
      endpoints: [
        { raw: 'GET /api/entities/counts', method: 'GET', signature: '/api/entities/counts' },
      ],
      capabilities: ['KeyMetricMatrix' as CapabilityId, 'EntityCollection' as CapabilityId],
      code: `export default function EntityCountsMatrix({ counts }) { ... }`,
      render: (props) => React.createElement(EntityCountsMatrixRelic, props),
      defaultProps: {},
    });

    // 7. Conduit Plan Kanban
    this.absorb({
      id: 'relic-plan-kanban',
      name: 'Conduit Implementation Plan Kanban',
      description: 'Multi-stage work-in-progress board tracking implementation goals, acceptance criteria, and status.',
      archetype: 'interactive-tool',
      componentName: 'ConduitPlanKanban',
      tags: ['kanban', 'plans', 'conduit', 'tasks'],
      inputs: [{ name: 'plans', type: 'ConduitPlanItem[]' }],
      endpoints: [
        { raw: 'GET /api/plans', method: 'GET', signature: '/api/plans' },
      ],
      capabilities: ['StatusBoard' as CapabilityId, 'WorkQueue' as CapabilityId],
      code: `export default function ConduitPlanKanban({ plans }) { ... }`,
      render: (props) => React.createElement(ConduitPlanKanbanRelic, props),
      defaultProps: {},
    });

    // 8. Agent Record Telemetry
    this.absorb({
      id: 'relic-agent-telemetry',
      name: 'Agent Audit Telemetry Stream',
      description: 'Chronological audit log showing multi-agent reasoning, opcodes, and governance decisions.',
      archetype: 'control-surface',
      componentName: 'AgentRecordTelemetry',
      tags: ['telemetry', 'audit', 'agents', 'log'],
      inputs: [{ name: 'records', type: 'AgentTelemetryRecord[]' }],
      endpoints: [
        { raw: 'GET /api/agent-records', method: 'GET', signature: '/api/agent-records' },
      ],
      capabilities: ['AuditStream' as CapabilityId],
      code: `export default function AgentRecordTelemetry({ records }) { ... }`,
      render: (props) => React.createElement(AgentRecordTelemetryRelic, props),
      defaultProps: {},
    });

    // 9. Cross Reference Lattice
    this.absorb({
      id: 'relic-cross-ref-lattice',
      name: 'Cross-Reference Dependency Lattice',
      description: 'Inter-entity relational mapping visualizing dependencies and causal linkages.',
      archetype: 'canvas-element',
      componentName: 'CrossReferenceLattice',
      tags: ['graph', 'lattice', 'dependencies', 'relations'],
      inputs: [{ name: 'items', type: 'LatticeEdge[]' }],
      endpoints: [
        { raw: 'GET /api/lattice/edges', method: 'GET', signature: '/api/lattice/edges' },
      ],
      capabilities: ['InspectorPanel' as CapabilityId],
      code: `export default function CrossReferenceLattice({ items }) { ... }`,
      render: (props) => React.createElement(CrossReferenceLatticeRelic, props),
      defaultProps: {},
    });

    // 10. Open Question Deliberation
    this.absorb({
      id: 'relic-open-questions',
      name: 'Open Question Deliberation Ledger',
      description: 'Deliberation ledger recording architectural inquiries, community votes, and resolution state.',
      archetype: 'interactive-tool',
      componentName: 'OpenQuestionDeliberation',
      tags: ['questions', 'deliberation', 'governance', 'voting'],
      inputs: [{ name: 'items', type: 'OpenQuestionItem[]' }],
      endpoints: [
        { raw: 'GET /api/open-questions', method: 'GET', signature: '/api/open-questions' },
      ],
      capabilities: ['WorkQueue' as CapabilityId],
      code: `export default function OpenQuestionDeliberation({ items }) { ... }`,
      render: (props) => React.createElement(OpenQuestionDeliberationRelic, props),
      defaultProps: {},
    });
  }

  public absorb(widget: AbsorbedWidget): void {
    this.absorbedWidgets.set(widget.id, widget);

    // Also register in projection-core's WidgetCatalog
    const widgetsMap = (this.projectionWidgetCatalog as any).widgets;
    if (widgetsMap instanceof Map) {
      widgetsMap.set(widget.componentName, {
        id: widget.componentName,
        name: widget.name,
        implements: widget.capabilities,
        defaultDensity: widget.archetype === 'data-vis' ? 'compact' : 'normal',
        defaultLayout:
          widget.archetype === 'control-surface'
            ? 'header'
            : widget.archetype === 'interactive-tool'
            ? 'main'
            : 'sidebar',
      });
    }
  }

  public getHarvestedWidgets(): AbsorbedWidget[] {
    return Array.from(this.absorbedWidgets.values());
  }

  public getWidgetById(id: string): AbsorbedWidget | undefined {
    return this.absorbedWidgets.get(id);
  }

  public getWidgetsByArchetype(type: RelicArchetype | 'all'): AbsorbedWidget[] {
    const list = this.getHarvestedWidgets();
    if (type === 'all') return list;
    return list.filter((w) => w.archetype === type);
  }

  public getWidgetsByCapability(cap: CapabilityId): AbsorbedWidget[] {
    return this.getHarvestedWidgets().filter((w) => w.capabilities.includes(cap));
  }

  public getProjectionCatalog(): WidgetCatalog {
    return this.projectionWidgetCatalog;
  }

  // --- Ontological Space Map ---
  public getOntologicalTree(): OntologicalSpaceNode[] {
    return [
      {
        id: 'onto-root',
        path: ['ontology', 'surface-ui'],
        title: 'Surface UI Projection Portal',
        description: 'Ontological gateway recomposing Throttler interface using projection-core and harvested surface relics.',
        iconName: 'Layers',
        category: 'inventory',
        associatedWidgetIds: ['relic-sparkline', 'relic-gauge', 'relic-execution-state'],
      },
      {
        id: 'onto-relics',
        path: ['ontology', 'surface-ui', 'relics'],
        title: 'Harvested Relics Inventory',
        description: 'Catalog of 10 absorbed UI components, data visualizers, control surfaces, and tools.',
        iconName: 'Boxes',
        category: 'inventory',
        associatedWidgetIds: Array.from(this.absorbedWidgets.keys()),
      },
      {
        id: 'onto-viewspec',
        path: ['ontology', 'surface-ui', 'viewspec'],
        title: 'ViewSpec Spatial Switchboard',
        description: 'DesignIR compiler synthesizing multi-surface layouts and binding live contracts.',
        iconName: 'Layout',
        category: 'compiler',
        associatedWidgetIds: ['relic-execution-state', 'relic-plan-kanban', 'relic-agent-telemetry'],
      },
      {
        id: 'onto-governance',
        path: ['ontology', 'surface-ui', 'governance'],
        title: 'Governance & SolScript Workbench',
        description: 'Live admission receipts, SolScript doctrine verification, and Keychain checkpoint lineage.',
        iconName: 'ShieldCheck',
        category: 'governance',
        associatedWidgetIds: ['relic-cpf-readiness', 'relic-open-questions'],
      },
      {
        id: 'onto-projection',
        path: ['ontology', 'surface-ui', 'vfs-projection'],
        title: 'VFS Ontological Projection',
        description: 'Direct ontological projection of Throttler filesystem nodes into entity schemas and live metric streams.',
        iconName: 'HardDrive',
        category: 'projection',
        associatedWidgetIds: ['relic-counts-matrix', 'relic-inventory-table', 'relic-gauge'],
      },
      {
        id: 'onto-registry',
        path: ['ontology', 'surface-ui', 'registry'],
        title: 'Angular Subfolder Widget Registry',
        description: 'Automated scanner and manifest catalog for angular/ subfolder component exports with dynamic projection-core injection.',
        iconName: 'Cpu',
        category: 'inventory',
        associatedWidgetIds: [],
      },
    ];
  }

  public resolveOntologicalNode(path: string[]): OntologicalSpaceNode | undefined {
    const joined = path.join('/');
    return this.getOntologicalTree().find((n) => n.path.join('/') === joined);
  }
}

export const widgetAbsorptionService = new WidgetAbsorptionRegistry();
