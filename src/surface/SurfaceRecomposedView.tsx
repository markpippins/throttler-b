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
  const [internalTab, setInternalTab] = useState<SurfaceRecomposedTab>('relics');
  const activeTab = controlledTab || internalTab;

  const handleTabSelect = (tab: SurfaceRecomposedTab) => {
    if (onTabChange) onTabChange(tab);
    setInternalTab(tab);
    if (onNavigate) {
      onNavigate(['ontology', 'surface-ui', tab]);
    }
  };

  const [selectedArchetype, setSelectedArchetype] = useState<RelicArchetype | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showOperator, setShowOperator] = useState(true);
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
      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 overflow-y-auto p-5">
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
                    10 interactive UI relics absorbed from <code className="text-primary font-mono font-semibold">angular/surface-ui</code>, running inside Throttler with live telemetry bindings.
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

          {/* TAB 5: ANGULAR SUBFOLDER REGISTRY */}
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
