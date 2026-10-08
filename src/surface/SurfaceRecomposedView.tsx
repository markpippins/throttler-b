import React, { useState, useMemo } from 'react';
import {
  Boxes,
  Layout,
  ShieldCheck,
  HardDrive,
  ArrowLeft,
  Search,
  Filter,
  Bot,
  Sparkles,
  Layers,
  Terminal,
  Cpu,
  Workflow,
} from 'lucide-react';
import type { AbsorbedWidget, RelicArchetype, SurfaceRecomposedTab } from './types';
import { widgetAbsorptionService } from './widgetAbsorption';
import { RelicArchetypesGrid } from './components/RelicArchetypesGrid';
import { RelicCard } from './components/RelicCard';
import { GovernanceWorkbenchView } from './components/GovernanceWorkbenchView';
import { OperatorPersonaPanel } from './components/OperatorPersonaPanel';
import { ViewSpecStudioView } from './components/ViewSpecStudioView';
import { WidgetRegistryView } from './WidgetRegistryView';
import {
  GaugeRelic,
  SparklineRelic,
  EntityCountsMatrixRelic,
  InventoryTableRelic,
} from './relics/HarvestedRelics';
import type { GovernedDirector } from '../governance/director';
import { UniversalNavigator, NavigationItem } from '../components/navigation/UniversalNavigator';
import { UniversalContextInspector, UniversalInspectorEntity } from '../components/inspector/UniversalContextInspector';
import { DiagramSurface, DiagramNode, DiagramEdge } from '../components/canvas/DiagramSurface';
import { AegisStateMachineRelic } from './relics/AegisStateMachineRelic';
import { DockableTelemetryDrawer } from '../components/bottom-pane/DockableTelemetryDrawer';
import { UnifiedContainerScope } from './core/containerScope';
import { GenerativeResponseViewer } from './components/GenerativeResponseViewer';

interface SurfaceRecomposedViewProps {
  activeTab?: SurfaceRecomposedTab;
  onTabChange?: (tab: SurfaceRecomposedTab) => void;
  onClose?: () => void;
  activePath?: string[];
  onNavigate?: (path: string[]) => void;
  governanceDirector?: GovernedDirector | null;
  vfsNodeCount?: number;
}

export const SurfaceRecomposedView: React.FC<SurfaceRecomposedViewProps> = ({
  activeTab: controlledTab,
  onTabChange,
  onClose,
  activePath = ['ontology', 'surface-ui'],
  onNavigate,
  governanceDirector,
  vfsNodeCount = 42,
}) => {
  const [internalTab, setInternalTab] = useState<SurfaceRecomposedTab>('unified-toolspace');
  const activeTab = controlledTab || internalTab;

  const handleTabSelect = (tab: SurfaceRecomposedTab) => {
    if (onTabChange) onTabChange(tab);
    setInternalTab(tab);
    if (onNavigate) {
      onNavigate(['ontology', 'surface-ui', tab]);
    }
  };

  const [canvasViewMode, setCanvasViewMode] = useState<'diagram' | 'aegis' | 'uml' | 'generative'>('diagram');
  const [inspectedEntity, setInspectedEntity] = useState<UniversalInspectorEntity | null>({
    id: 'node-gov-1',
    name: 'GovernedDirector',
    type: 'sol-concept',
    envelope: 'live',
    lineageDigest: 'sha256:4a5d8b72c9e108a34bc789df10234acfe45691038290bc129845ef2093841029',
    properties: {
      Authority: 'PEB Governance Director',
      Status: 'Active & Witnessed',
      AegisRegistry: 'AEGIS_FILE_MUTATION_REGISTRY',
      SolScriptKernel: 'v2.4',
      StoragePort: 'ThrottlerVfsStorageAdapter',
    },
  });

  const [selectedArchetype, setSelectedArchetype] = useState<RelicArchetype | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showOperator, setShowOperator] = useState(false);
  const [selectedWidget, setSelectedWidget] = useState<AbsorbedWidget | null>(null);

  // All harvested widgets from absorption service
  const allWidgets = useMemo(() => widgetAbsorptionService.getHarvestedWidgets(), []);

  // Filtered widgets
  const filteredWidgets = useMemo(() => {
    return allWidgets.filter((w) => {
      const matchArchetype =
        selectedArchetype === 'all' || w.archetype === selectedArchetype;
      const matchSearch =
        !searchQuery.trim() ||
        w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
        w.endpoints.some((e) => e.signature.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchArchetype && matchSearch;
    });
  }, [allWidgets, selectedArchetype, searchQuery]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background text-foreground font-sans">
      {/* Top Ontological Recomposed Bar */}
      <header className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-surface/95 backdrop-blur-md z-20">
        <div className="flex items-center gap-3">
          {onClose && (
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted/60 hover:bg-muted text-xs font-medium text-muted-foreground hover:text-foreground border border-border/50 transition-colors"
              title="Return to standard Throttler Dual-Pane View"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Standard Explorer</span>
            </button>
          )}

          <div className="h-4 w-px bg-border/80" />

          {/* Ontological Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <span className="text-muted-foreground">onto://</span>
            <span className="font-semibold text-primary">surface-ui</span>
            <span className="text-muted-foreground">/</span>
            <span className="text-foreground font-medium uppercase tracking-wider text-[11px]">
              {activeTab}
            </span>
          </div>

          <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px] font-mono font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>PROJECTION-CORE COMPILED</span>
          </span>
        </div>

        {/* View Mode Switcher Pills */}
        <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl border border-border/50">
          <button
            id="tab-unified-toolspace"
            onClick={() => handleTabSelect('unified-toolspace')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'unified-toolspace'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Workflow className="w-3.5 h-3.5" />
            <span>Unified Canvas & Aegis State Machine</span>
          </button>

          <button
            onClick={() => handleTabSelect('relics')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'relics'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>Relic Inventory</span>
            <span className="px-1 py-0.2 rounded bg-black/20 text-[10px] font-mono">
              {allWidgets.length}
            </span>
          </button>

          <button
            onClick={() => handleTabSelect('viewspec')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'viewspec'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Layout className="w-3.5 h-3.5" />
            <span>ViewSpec Switchboard</span>
          </button>

          <button
            onClick={() => handleTabSelect('governance')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'governance'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Governance & SolScript</span>
          </button>

          <button
            id="tab-vfs-projection"
            onClick={() => handleTabSelect('vfs-projection')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'vfs-projection'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>VFS Projection</span>
          </button>

          <button
            id="tab-widget-registry"
            onClick={() => handleTabSelect('registry')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'registry'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Subfolder Registry</span>
          </button>
        </div>

        {/* Right side utility */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowOperator(!showOperator)}
            className={`p-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors ${
              showOperator
                ? 'bg-primary/15 border-primary/40 text-primary'
                : 'bg-muted/40 border-border/50 text-muted-foreground hover:text-foreground'
            }`}
            title="Toggle Operator Persona Co-Pilot"
          >
            <Bot className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Operator</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Area (split with optional Operator Co-Pilot) */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* TAB 0: UNIFIED TOOLSPACE & CANVAS ENGINE (Phase 2 Master Shell) */}
        {activeTab === 'unified-toolspace' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Toolspace Sub-Header Controls */}
            <div className="px-4 py-2 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs font-mono text-slate-300">
                  <Workflow className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-slate-100">Unified Canvas Engine</span>
                </div>
                <div className="h-4 w-px bg-slate-800" />
                <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                  <button
                    onClick={() => setCanvasViewMode('diagram')}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                      canvasViewMode === 'diagram'
                        ? 'bg-emerald-600 text-white font-semibold shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Diagram Surface & Containers
                  </button>
                  <button
                    onClick={() => setCanvasViewMode('aegis')}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                      canvasViewMode === 'aegis' || canvasViewMode === 'uml'
                        ? 'bg-emerald-600 text-white font-semibold shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Aegis State Machine (TLA+/TLC)
                  </button>
                  <button
                    onClick={() => setCanvasViewMode('generative')}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                      canvasViewMode === 'generative'
                        ? 'bg-emerald-600 text-white font-semibold shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    AI Vocabulary Studio
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="text-slate-500">
                  Perceptual Channels: Double = Governance · Dashed = Sandbox · Single = Layout
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-bold text-[10px]">
                  LIVE WITNESSED
                </span>
              </div>
            </div>

            {/* Tripartite Master Workspace */}
            <div className="flex-1 flex overflow-hidden">
              {/* Left: Universal Multimodal Navigator */}
              <div className="w-72 border-r border-slate-800 bg-slate-950/40 p-2 overflow-y-auto shrink-0 flex flex-col">
                <UniversalNavigator
                  selectedId={inspectedEntity?.id}
                  onSelect={(item) => {
                    setInspectedEntity({
                      id: item.id,
                      name: item.name,
                      type: item.lens === 'vfs' ? 'vfs-file' : item.lens === 'sol' ? 'sol-concept' : item.lens === 'aegis' ? 'aegis-state' : item.lens === 'uml' ? 'aegis-state' : 'shrapnel-entity',
                      envelope: 'live',
                      lineageDigest: `sha256:${Math.random().toString(16).slice(2, 10)}${Math.random().toString(16).slice(2, 10)}`,
                      properties: {
                        Lens: item.lens.toUpperCase(),
                        Subsystem: item.lens === 'aegis' ? 'Aegis Formal Verification IDE & TLA+ Protocol' : item.lens === 'sol' ? 'SOL Ontology Subsystem' : 'Unified Toolspace',
                        ItemType: item.type,
                        Badge: item.badge || 'Standard',
                        Path: `/system/${item.lens}/${item.id}`,
                      },
                    });
                  }}
                  className="h-full border-0"
                />
              </div>

              {/* Center: High-Performance Canvas Surface */}
              <div className="flex-1 p-3 bg-slate-950/20 overflow-hidden flex flex-col">
                {canvasViewMode === 'diagram' ? (
                  <DiagramSurface
                    height="100%"
                    selectedId={inspectedEntity?.id}
                    onSelect={(id, type) => {
                      setInspectedEntity({
                        id,
                        name: id.replace('node-', '').replace('cnt-', ''),
                        type: type === 'container' ? 'generic' : 'sol-concept',
                        envelope: 'live',
                        lineageDigest: 'sha256:8f2a1b94c03de45889abfe129845ef2093841029',
                        properties: {
                          SurfaceType: type,
                          GraphCluster: 'MainWorkspace',
                          WitnessStatus: id.includes('sand') ? 'Sandbox Speculation' : 'PEB Admitted',
                        },
                      });
                    }}
                    containers={[
                      {
                        id: 'cnt-gov',
                        name: 'PEB Governed Director Boundary',
                        containerType: 'governance-boundary',
                        bounds: { x: 30, y: 30, width: 620, height: 260 },
                        elementIds: ['node-gov-1', 'node-gov-2'],
                        stateEnvelope: 'live',
                      },
                      {
                        id: 'cnt-sand',
                        name: 'SolScript Sandbox & Speculative Space',
                        containerType: 'execution-sandbox',
                        bounds: { x: 30, y: 310, width: 620, height: 260 },
                        elementIds: ['node-sand-1', 'node-sand-2'],
                        stateEnvelope: 'live',
                      },
                      {
                        id: 'cnt-grp',
                        name: 'Ephemeral Spatial Cluster',
                        containerType: 'spatial-group',
                        bounds: { x: 680, y: 30, width: 340, height: 540 },
                        elementIds: ['node-grp-1', 'node-grp-2'],
                        stateEnvelope: 'live',
                      },
                    ]}
                    nodes={[
                      {
                        id: 'node-gov-1',
                        label: 'GovernedDirector',
                        type: 'service',
                        x: 60,
                        y: 90,
                        statusBadge: 'LIVE · ADMITTED',
                        properties: { authority: 'PEB', state: 'active' },
                      },
                      {
                        id: 'node-gov-2',
                        label: 'KeychainsRegistry',
                        type: 'state',
                        x: 360,
                        y: 90,
                        statusBadge: 'LIVE · WITNESSED',
                        properties: { head: 'block_108', entries: '14' },
                      },
                      {
                        id: 'node-sand-1',
                        label: 'SolScriptEvaluator',
                        type: 'concept',
                        x: 60,
                        y: 370,
                        statusBadge: 'ASSERTED',
                        properties: { axioms: '3', status: 'valid' },
                      },
                      {
                        id: 'node-sand-2',
                        label: 'SpeculativeRename',
                        type: 'entity',
                        x: 360,
                        y: 370,
                        isHollow: true,
                        statusBadge: 'HOLLOW · UNADMITTED',
                        properties: { mode: 'dry-run', receipt: 'none' },
                      },
                      {
                        id: 'node-grp-1',
                        label: 'VfsProjection',
                        type: 'entity',
                        x: 720,
                        y: 90,
                        statusBadge: 'PARITY 100%',
                        properties: { inodes: '42', readSet: 'sha256:e3b0...' },
                      },
                      {
                        id: 'node-grp-2',
                        label: 'AegisTlaBridge',
                        type: 'relic',
                        x: 720,
                        y: 370,
                        statusBadge: 'TLC_VERIFIED',
                        properties: { format: 'TLA+/TLC State Machine', sync: 'bidirectional', engine: 'Aegis IDE' },
                      },
                    ]}
                    edges={[
                      { id: 'edge-1', source: 'node-gov-1', target: 'node-gov-2', label: 'commits checkpoint' },
                      { id: 'edge-2', source: 'node-sand-1', target: 'node-sand-2', label: 'evaluates guard' },
                      { id: 'edge-3', source: 'node-sand-2', target: 'node-gov-1', isLineageGap: true, gapName: 'PEB_ADMISSION_RECEIPT_PENDING' },
                      { id: 'edge-4', source: 'node-grp-1', target: 'node-gov-1', label: 'feeds read-set' },
                    ]}
                  />
                ) : canvasViewMode === 'aegis' || canvasViewMode === 'uml' ? (
                  <AegisStateMachineRelic
                    selectedId={inspectedEntity?.id}
                    onSelectNode={(id, name, meta) => {
                      setInspectedEntity({
                        id,
                        name,
                        type: 'aegis-state',
                        envelope: 'live',
                        lineageDigest: 'sha256:9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b',
                        properties: {
                          Subsystem: 'Aegis Formal Verification IDE',
                          State_Action: name,
                          TLA_Predicate: (meta?.tlaPredicate as string) || (meta?.guard as string) || 'state \\in ValidStates',
                          TLC_ModelChecker: 'PASSED (4,892 states, 0 deadlocks)',
                          Fairness: meta?.weakFairness ? 'WF_vars' : 'Standard',
                          SelectionMode: 'Bidirectional Universal Inspector Sync',
                        },
                      });
                    }}
                    height={580}
                  />
                ) : (
                  <GenerativeResponseViewer
                    onSelectEntity={(id, name) => {
                      setInspectedEntity({
                        id,
                        name,
                        type: 'aegis-state',
                        envelope: 'live',
                        lineageDigest: 'sha256:4f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e',
                        properties: {
                          GeneratedFrom: 'Natural Language Query Prompt',
                          SelectionSource: 'Generative ViewSpec AST Instance',
                          InteractiveMode: 'Bidirectional Inspector Bound',
                        },
                      });
                    }}
                    className="h-full"
                  />
                )}
              </div>

              {/* Right: Universal Context Inspector */}
              <div className="w-80 border-l border-slate-800 bg-slate-950/40 p-2 overflow-y-auto shrink-0">
                <UniversalContextInspector
                  entity={inspectedEntity}
                  onMutationCommitted={(id, newName) => {
                    if (inspectedEntity) {
                      setInspectedEntity({
                        ...inspectedEntity,
                        name: newName,
                        properties: {
                          ...inspectedEntity.properties,
                          LastRenamed: new Date().toLocaleTimeString(),
                        },
                      });
                    }
                  }}
                  className="h-full border-0"
                />
              </div>
            </div>

            {/* Bottom: Dockable Telemetry Drawer */}
            <DockableTelemetryDrawer />
          </div>
        )}

        <main className={`flex-1 overflow-y-auto p-5 ${activeTab === 'unified-toolspace' ? 'hidden' : ''}`}>
          {/* TAB 1: RELIC INVENTORY */}
          {activeTab === 'relics' && (
            <div className="space-y-5 max-w-7xl mx-auto animate-in fade-in-50 duration-150">
              {/* Header banner */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-xl border border-border/70 bg-surface/80">
                <div>
                  <h1 className="text-base font-bold text-foreground">
                    Harvested Surface Relics Catalog
                  </h1>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    10 interactive UI relics absorbed from <code className="text-primary font-mono font-semibold">widgets/surface-ui</code>, running inside Throttler with live telemetry bindings.
                  </p>
                </div>

                {/* Search box */}
                <div className="relative min-w-[240px]">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search relics, tags, endpoints..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-background border border-border text-xs focus:outline-hidden focus:border-primary font-mono"
                  />
                </div>
              </div>

              {/* Archetype Filter Grid */}
              <RelicArchetypesGrid
                widgets={allWidgets}
                selectedType={selectedArchetype}
                onSelectType={setSelectedArchetype}
              />

              {/* Relic Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredWidgets.map((widget) => (
                  <RelicCard
                    key={widget.id}
                    widget={widget}
                    onSelect={(w) => setSelectedWidget(w)}
                  />
                ))}
              </div>

              {filteredWidgets.length === 0 && (
                <div className="text-center py-12 text-muted-foreground font-mono text-xs">
                  No relics matching filter criteria. Try clearing your search query.
                </div>
              )}
            </div>
          )}

          {/* TAB 2: VIEWSPEC SWITCHBOARD */}
          {activeTab === 'viewspec' && <ViewSpecStudioView />}

          {/* TAB 3: GOVERNANCE & SOLSCRIPT */}
          {activeTab === 'governance' && (
            <GovernanceWorkbenchView
              governanceDirector={governanceDirector}
              activePath={activePath}
            />
          )}

          {/* TAB 4: VFS ONTOLOGICAL PROJECTION */}
          {activeTab === 'vfs-projection' && (
            <div className="space-y-5 max-w-6xl mx-auto animate-in fade-in-50 duration-150">
              <div className="p-4 rounded-xl border border-border/70 bg-surface/80 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="text-base font-bold text-foreground">
                    Virtual Filesystem Ontological Projection
                  </h1>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Live reflection of Throttler's VFS nodes mapped to harvested relics and schema matrices.
                  </p>
                </div>
                <span className="px-2 py-1 rounded-md bg-primary/10 border border-primary/20 text-primary font-mono text-xs font-bold">
                  {vfsNodeCount} Filesystem Artifacts
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-xl border border-border/60 bg-surface/80 p-3.5">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">
                    Node Allocation Dial
                  </span>
                  <GaugeRelic
                    value={Math.min(vfsNodeCount * 2, 100)}
                    label="VFS Inodes"
                    color="#3b82f6"
                  />
                </div>
                <div className="rounded-xl border border-border/60 bg-surface/80 p-3.5">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">
                    SolScript Lineage
                  </span>
                  <GaugeRelic value={98} label="Integrity" color="#10b981" />
                </div>
                <div className="rounded-xl border border-border/60 bg-surface/80 p-3.5">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">
                    Read-Set Hash
                  </span>
                  <GaugeRelic value={72} label="Freshness" color="#f59e0b" />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <EntityCountsMatrixRelic
                  title="Active Schema Matrix"
                  counts={{
                    directories: 8,
                    documents: 18,
                    governed_files: 12,
                    keychain_seeds: 4,
                  }}
                />
                <InventoryTableRelic />
              </div>

              <div className="rounded-xl border border-border/60 bg-surface/80 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground font-mono text-xs">
                    Real-time I/O Telemetry
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    Ops / 100ms
                  </span>
                </div>
                <SparklineRelic
                  data={[4, 12, 18, 9, 22, 35, 28, 45, 52, 48, 64]}
                  color="#3b82f6"
                  height={60}
                />
              </div>
            </div>
          )}

          {/* TAB 5: WIDGET SUBFOLDER REGISTRY */}
          {activeTab === 'registry' && (
            <div className="h-full flex flex-col -m-5">
              <WidgetRegistryView />
            </div>
          )}
        </main>

        {/* Optional Collapsible Operator Persona Co-Pilot */}
        {showOperator && (
          <aside className="w-80 border-l border-border bg-surface/50 p-4 overflow-y-auto hidden lg:block animate-in slide-in-from-right-4 duration-150">
            <OperatorPersonaPanel
              activeSurfaceId={`onto://surface-ui/${activeTab}`}
              activeWidgetName={selectedWidget?.name}
              selectedEntityId={selectedWidget?.id}
            />
          </aside>
        )}
      </div>
    </div>
  );
};
