import React, { useState, useMemo } from 'react';
import {
  DesignIRCompiler,
  DesignIR,
  ViewSpec,
  InMemoryContractStateStore,
  SimpleEventBus,
  DefaultActionInterpreter,
} from '@nexus/projection-core';
import {
  Layout,
  Layers,
  Code2,
  RefreshCw,
  Sparkles,
  Sliders,
  CheckCircle,
} from 'lucide-react';
import {
  ExecutionStateConsoleRelic,
  CpfReadinessDialRelic,
  ConduitPlanKanbanRelic,
  CrossReferenceLatticeRelic,
  AgentRecordTelemetryRelic,
  SparklineRelic,
  GaugeRelic,
  EntityCountsMatrixRelic,
  InventoryTableRelic,
} from '../relics/HarvestedRelics';

// Preset 1: Nebula Execution Switchboard IR
const EXECUTION_SWITCHBOARD_IR: DesignIR = {
  name: 'Nebula Execution Switchboard',
  roles: {
    telemetryHeader: {
      label: 'High-salience execution stats and pipeline gauges',
      capability: { id: 'KeyMetricMatrix' },
      constraints: { layoutBias: 'header' },
      density: 'highSalience',
    },
    planPipeline: {
      label: 'Kanban board of implementation plans',
      capability: { id: 'StatusBoard' },
      constraints: { layoutBias: 'main' },
      density: 'spacious',
    },
    latticeInspector: {
      label: 'Cross-reference dependency lattice',
      capability: { id: 'InspectorPanel' },
      constraints: { layoutBias: 'sidebar' },
      density: 'normal',
    },
    auditStream: {
      label: 'Continuous multi-agent telemetry stream',
      capability: { id: 'AuditStream' },
      constraints: { layoutBias: 'footer' },
      density: 'compact',
    },
  },
  interactions: [
    {
      verb: 'select',
      sourceRole: 'planPipeline',
      targetRole: 'latticeInspector',
    },
  ],
  hierarchy: {
    primaryRoles: ['telemetryHeader', 'planPipeline'],
    secondaryRoles: ['latticeInspector', 'auditStream'],
  },
};

// Preset 2: VFS Ontological Projection IR
const VFS_ONTOLOGY_IR: DesignIR = {
  name: 'Throttler VFS Projection Surface',
  roles: {
    vfsGauges: {
      label: 'Quota and node utilization radial meters',
      capability: { id: 'KeyMetricMatrix' },
      constraints: { layoutBias: 'header' },
      density: 'compact',
    },
    entityMatrix: {
      label: '13-entity schema counts and inventory balances',
      capability: { id: 'EntityCollection' },
      constraints: { layoutBias: 'main' },
      density: 'normal',
    },
    velocityStream: {
      label: 'VFS mutation velocity and latency trends',
      capability: { id: 'MetricSeries' },
      constraints: { layoutBias: 'footer' },
      density: 'compact',
    },
  },
  interactions: [],
  hierarchy: {
    primaryRoles: ['vfsGauges', 'entityMatrix'],
    secondaryRoles: ['velocityStream'],
  },
};

export const ViewSpecStudioView: React.FC = () => {
  const [selectedPreset, setSelectedPreset] = useState<'execution' | 'vfs'>('execution');
  const [activeTab, setActiveTab] = useState<'layout' | 'viewspec-json' | 'ir-spec'>('layout');
  const [selectedPlanId, setSelectedPlanId] = useState<string>('PLN-101');

  // Compile using @nexus/projection-core
  const compiledViewSpec = useMemo<ViewSpec>(() => {
    const ir = selectedPreset === 'execution' ? EXECUTION_SWITCHBOARD_IR : VFS_ONTOLOGY_IR;
    try {
      const compiler = new DesignIRCompiler();
      return compiler.compileDesignIR(ir);
    } catch (err) {
      console.error('Failed to compile DesignIR:', err);
      // Fallback empty viewspec
      return {
        id: 'fallback-vs',
        name: ir.name,
        layout: { nodes: [] },
        widgets: [],
        adapters: [],
        events: [],
      };
    }
  }, [selectedPreset]);

  return (
    <div className="space-y-4 max-w-6xl mx-auto font-mono text-xs">
      {/* Header bar with Preset Switcher & Tab selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border border-border/80 bg-surface/90 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/20">
            <Layout className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-foreground text-sm">
                Projection-Core Spatial Switchboard
              </span>
              <span className="px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold">
                DesignIR Engine v1.0
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground font-sans">
              Recomposes the application screen dynamically from declarative capability specs.
            </p>
          </div>
        </div>

        {/* Preset Selector */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border/40">
            <button
              onClick={() => setSelectedPreset('execution')}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                selectedPreset === 'execution'
                  ? 'bg-foreground text-background shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Execution Switchboard
            </button>
            <button
              onClick={() => setSelectedPreset('vfs')}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                selectedPreset === 'vfs'
                  ? 'bg-foreground text-background shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              VFS Projection Surface
            </button>
          </div>

          {/* View Tab Buttons */}
          <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border/40">
            <button
              onClick={() => setActiveTab('layout')}
              className={`px-2 py-1 rounded text-[10px] font-semibold ${
                activeTab === 'layout'
                  ? 'bg-blue-600 text-white'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Synthesized Layout
            </button>
            <button
              onClick={() => setActiveTab('viewspec-json')}
              className={`px-2 py-1 rounded text-[10px] font-semibold ${
                activeTab === 'viewspec-json'
                  ? 'bg-blue-600 text-white'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              ViewSpec AST
            </button>
            <button
              onClick={() => setActiveTab('ir-spec')}
              className={`px-2 py-1 rounded text-[10px] font-semibold ${
                activeTab === 'ir-spec'
                  ? 'bg-blue-600 text-white'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              DesignIR
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'layout' && (
        <div className="space-y-4 animate-in fade-in-50 duration-150">
          {selectedPreset === 'execution' ? (
            <>
              {/* Header Region: KeyMetricMatrix & Readiness */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ExecutionStateConsoleRelic
                  title="Nebula Execution Pipeline"
                  totalRequests={14}
                  activeLeases={2}
                />
                <CpfReadinessDialRelic
                  title="Compilation Readiness (CPF)"
                  threshold={0.75}
                  system="nebula-pipeline"
                />
              </div>

              {/* Main Workspace: 2-column layout (Plan Pipeline & Dependency Lattice) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                  <ConduitPlanKanbanRelic title="Conduit Implementation Plan Board" />
                </div>
                <div className="space-y-4">
                  <CrossReferenceLatticeRelic title="Active Dependency Lattice" />
                  <div className="rounded-xl border border-border/60 bg-surface/80 p-3.5 space-y-2">
                    <div className="text-[10px] uppercase font-bold text-muted-foreground">
                      Selected Plan State Store
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">Active Plan ID:</span>
                      <span className="font-bold text-primary">{selectedPlanId}</span>
                    </div>
                    <div className="flex gap-1.5 pt-1">
                      {['PLN-101', 'PLN-102', 'PLN-103', 'PLN-104'].map((p) => (
                        <button
                          key={p}
                          onClick={() => setSelectedPlanId(p)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            selectedPlanId === p
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted/50 text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Region: Audit Telemetry Stream */}
              <div>
                <AgentRecordTelemetryRelic title="Continuous Multi-Agent Telemetry Stream" />
              </div>
            </>
          ) : (
            <>
              {/* VFS Projection Layout */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-xl border border-border/60 bg-surface/80 p-3.5 flex flex-col justify-between">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">
                    VFS Cache Dial
                  </div>
                  <GaugeRelic value={82} label="VFS Buffer" color="#3b82f6" />
                </div>
                <div className="rounded-xl border border-border/60 bg-surface/80 p-3.5 flex flex-col justify-between">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">
                    SolScript Attestation
                  </div>
                  <GaugeRelic value={96} label="Safety Quota" color="#10b981" />
                </div>
                <div className="rounded-xl border border-border/60 bg-surface/80 p-3.5 flex flex-col justify-between">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">
                    Keychain Checkpoints
                  </div>
                  <GaugeRelic value={64} label="Checkpoint Fill" color="#f59e0b" />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <EntityCountsMatrixRelic title="VFS Ontological Node Schema Matrix" />
                <InventoryTableRelic />
              </div>

              <div className="rounded-xl border border-border/60 bg-surface/80 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">
                    Filesystem Mutation Velocity (Opcodes / sec)
                  </span>
                  <span className="text-[10px] text-muted-foreground">Rolling 60s window</span>
                </div>
                <SparklineRelic
                  data={[18, 24, 15, 30, 42, 38, 55, 48, 62, 70, 65, 84]}
                  color="#10b981"
                  height={56}
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* ViewSpec AST Tab */}
      {activeTab === 'viewspec-json' && (
        <div className="rounded-xl border border-border/70 bg-black/80 p-4 text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-[500px]">
          <pre>{JSON.stringify(compiledViewSpec, null, 2)}</pre>
        </div>
      )}

      {/* DesignIR Tab */}
      {activeTab === 'ir-spec' && (
        <div className="rounded-xl border border-border/70 bg-black/80 p-4 text-[11px] font-mono text-blue-400 overflow-x-auto max-h-[500px]">
          <pre>
            {JSON.stringify(
              selectedPreset === 'execution' ? EXECUTION_SWITCHBOARD_IR : VFS_ONTOLOGY_IR,
              null,
              2
            )}
          </pre>
        </div>
      )}
    </div>
  );
};
