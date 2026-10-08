import React, { useState, useEffect, useMemo } from 'react';
import {
  Cpu,
  FolderGit2,
  RefreshCw,
  CheckCircle2,
  Layers,
  Search,
  Code,
  FileCode,
  Plus,
  Terminal,
  ChevronRight,
  ChevronDown,
  Sliders,
  Check,
  Copy,
  Tag,
  Eye,
  EyeOff,
  GitBranch,
  Shield,
  Activity,
  Maximize2,
  Minimize2,
  Layout,
  BarChart3,
  Wrench,
  ListFilter,
  Grid,
} from 'lucide-react';
import {
  widgetRegistryManager,
  type MasterWidgetManifest,
  type WidgetManifestEntry,
  type WidgetFunctionalCategory,
  type ProjectionInjectionResult,
} from './registry';
import type { CapabilityId } from '@nexus/projection-core';
import type { RelicArchetype } from './types';

export interface WidgetRegistryViewProps {
  onSelectWidget?: (widgetId: string) => void;
  className?: string;
}

export interface CategoryDefinition {
  id: WidgetFunctionalCategory;
  label: string;
  shortLabel: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeClass: string;
  cardHeaderBg: string;
  accentBorder: string;
  colorClass: string;
}

export const CATEGORY_DEFINITIONS: CategoryDefinition[] = [
  {
    id: 'UI',
    label: 'UI Components',
    shortLabel: 'UI',
    description: 'Visual interfaces, layout navigation, kanban boards, and deliberation surfaces',
    icon: Layout,
    badgeClass: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    cardHeaderBg: 'bg-indigo-500/5',
    accentBorder: 'border-indigo-500/30',
    colorClass: 'text-indigo-400',
  },
  {
    id: 'Data',
    label: 'Data & Metrics',
    shortLabel: 'Data',
    description: 'Live telemetry series, radial gauges, multi-agent audit streams, and ontology matrices',
    icon: BarChart3,
    badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    cardHeaderBg: 'bg-emerald-500/5',
    accentBorder: 'border-emerald-500/30',
    colorClass: 'text-emerald-400',
  },
  {
    id: 'Utility',
    label: 'Utility & Tooling',
    shortLabel: 'Utility',
    description: 'Execution consoles, readiness dials, governance authority benches, and AI operator panels',
    icon: Wrench,
    badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    cardHeaderBg: 'bg-amber-500/5',
    accentBorder: 'border-amber-500/30',
    colorClass: 'text-amber-400',
  },
];

/**
 * Visualizes the current manifest of assimilated widgets,
 * displaying metadata including capabilities, semantic version,
 * archetype, inputs schema, and projection-core injection status for each entry.
 */
export const WidgetRegistryView: React.FC<WidgetRegistryViewProps> = ({
  onSelectWidget,
  className = '',
}) => {
  const [manifest, setManifest] = useState<MasterWidgetManifest>(() =>
    widgetRegistryManager.getManifest()
  );
  const [selectedCategory, setSelectedCategory] = useState<WidgetFunctionalCategory | 'all'>('all');
  const [viewMode, setViewMode] = useState<'grouped' | 'tabbed'>('grouped');
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [selectedSubfolder, setSelectedSubfolder] = useState<string>('all');
  const [selectedCapability, setSelectedCapability] = useState<string>('all');
  const [selectedArchetype, setSelectedArchetype] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [lastAudit, setLastAudit] = useState<ProjectionInjectionResult | null>(() =>
    widgetRegistryManager.getLastInjectionResult()
  );
  const [showJsonManifest, setShowJsonManifest] = useState(false);
  const [copied, setCopied] = useState(false);
  const [previewWidgetId, setPreviewWidgetId] = useState<string | null>(null);

  // New subfolder modal
  const [showAddSubfolderModal, setShowAddSubfolderModal] = useState(false);
  const [newSubfolderName, setNewSubfolderName] = useState('');
  const [newSubfolderDisplayName, setNewSubfolderDisplayName] = useState('');
  const [newSubfolderVersion, setNewSubfolderVersion] = useState('1.0.0');
  const [newSubfolderDescription, setNewSubfolderDescription] = useState('');

  // Subscribe to registry updates
  useEffect(() => {
    const unsubscribe = widgetRegistryManager.subscribe((newManifest) => {
      setManifest(newManifest);
      setLastAudit(widgetRegistryManager.getLastInjectionResult());
    });
    return unsubscribe;
  }, []);

  const handleRescan = () => {
    setIsScanning(true);
    setTimeout(() => {
      const updated = widgetRegistryManager.rescan({ forceRefresh: true });
      setManifest(updated);
      setLastAudit(widgetRegistryManager.getLastInjectionResult());
      setIsScanning(false);
    }, 350);
  };

  const handleAddSubfolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubfolderName.trim()) return;

    const folderSlug = newSubfolderName.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    widgetRegistryManager.addAndScanSubfolder({
      subfolder: folderSlug,
      path: `widgets/${folderSlug}`,
      displayName: newSubfolderDisplayName.trim() || `${folderSlug.toUpperCase()} Suite`,
      description: newSubfolderDescription.trim() || `Discovered widgets/${folderSlug} component package`,
      version: newSubfolderVersion.trim() || '1.0.0',
    });

    setShowAddSubfolderModal(false);
    setNewSubfolderName('');
    setNewSubfolderDisplayName('');
    setNewSubfolderVersion('1.0.0');
    setNewSubfolderDescription('');
    setSelectedSubfolder(folderSlug);
  };

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<WidgetFunctionalCategory | 'all', number> = {
      all: manifest.allWidgets.length,
      UI: 0,
      Data: 0,
      Utility: 0,
    };
    manifest.allWidgets.forEach((w) => {
      const cat = w.category || 'UI';
      if (counts[cat] !== undefined) {
        counts[cat]++;
      }
    });
    return counts;
  }, [manifest]);

  // Extract all unique capabilities present across widgets
  const availableCapabilities = useMemo(() => {
    const caps = new Set<string>();
    manifest.allWidgets.forEach((w) => {
      w.capabilities.forEach((c) => caps.add(c));
    });
    return Array.from(caps).sort();
  }, [manifest]);

  // Extract all unique archetypes
  const availableArchetypes = useMemo(() => {
    const archs = new Set<string>();
    manifest.allWidgets.forEach((w) => {
      archs.add(w.archetype);
    });
    return Array.from(archs).sort();
  }, [manifest]);

  // Filtered widgets
  const filteredWidgets = useMemo(() => {
    return manifest.allWidgets.filter((w) => {
      if (selectedCategory !== 'all' && w.category !== selectedCategory) {
        return false;
      }
      if (selectedSubfolder !== 'all' && w.subfolder !== selectedSubfolder) {
        return false;
      }
      if (selectedCapability !== 'all' && !w.capabilities.includes(selectedCapability as CapabilityId)) {
        return false;
      }
      if (selectedArchetype !== 'all' && w.archetype !== selectedArchetype) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        w.name.toLowerCase().includes(q) ||
        w.componentName.toLowerCase().includes(q) ||
        w.subfolder.toLowerCase().includes(q) ||
        (w.category && w.category.toLowerCase().includes(q)) ||
        (w.version && w.version.toLowerCase().includes(q)) ||
        w.capabilities.some((c) => c.toLowerCase().includes(q)) ||
        w.tags.some((t) => t.toLowerCase().includes(q)) ||
        w.endpoints.some((e) => e.signature.toLowerCase().includes(q))
      );
    });
  }, [manifest, selectedCategory, selectedSubfolder, selectedCapability, selectedArchetype, searchQuery]);

  // Group widgets by category
  const widgetsByCategory = useMemo(() => {
    const groups: Record<WidgetFunctionalCategory, WidgetManifestEntry[]> = {
      UI: [],
      Data: [],
      Utility: [],
    };
    filteredWidgets.forEach((w) => {
      const cat = w.category || 'UI';
      if (groups[cat]) {
        groups[cat].push(w);
      } else {
        groups.UI.push(w);
      }
    });
    return groups;
  }, [filteredWidgets]);

  const toggleCategoryCollapse = (catId: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  const selectedWidget = useMemo(() => {
    if (!selectedWidgetId) return null;
    return manifest.byId[selectedWidgetId] || null;
  }, [manifest, selectedWidgetId]);

  const subfoldersList = Object.values(manifest.subfolders);

  const handleCopyJson = () => {
    navigator.clipboard.writeText(widgetRegistryManager.exportManifestJson(true));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderWidgetCard = (entry: WidgetManifestEntry) => {
    const isExpanded = selectedWidgetId === entry.id;
    const isPreviewing = previewWidgetId === entry.id;
    const catDef = CATEGORY_DEFINITIONS.find((c) => c.id === entry.category) || CATEGORY_DEFINITIONS[0];
    const CatIcon = catDef.icon;

    return (
      <div
        key={entry.id}
        className={`rounded-xl border transition-all ${
          isExpanded
            ? 'border-primary/60 bg-card shadow-sm'
            : 'border-border bg-card/40 hover:border-border/80 hover:bg-card/70'
        }`}
      >
        {/* Header Row */}
        <div
          onClick={() => setSelectedWidgetId(isExpanded ? null : entry.id)}
          className="p-4 flex flex-wrap items-center justify-between gap-3 cursor-pointer select-none"
        >
          <div className="flex items-center gap-3 min-w-[280px]">
            <div className="p-2 rounded-lg bg-secondary text-primary shrink-0">
              <FileCode className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-foreground">
                  {entry.name}
                </span>
                <code className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                  {entry.componentName}
                </code>
                {/* Category Badge */}
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-semibold flex items-center gap-1 ${catDef.badgeClass}`}
                >
                  <CatIcon className="w-3 h-3" />
                  <span>{catDef.shortLabel}</span>
                </span>
                {/* Version Badge */}
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-semibold">
                  v{entry.version || '1.0.0'}
                </span>
                {/* Subfolder Badge */}
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  widgets/{entry.subfolder}
                </span>
                {/* Archetype Badge */}
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-secondary text-muted-foreground border border-border">
                  {entry.archetype}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                {entry.description}
              </p>
            </div>
          </div>

          {/* Capabilities List Badges & Action */}
          <div className="flex items-center gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {entry.capabilities.map((cap) => (
                <span
                  key={cap}
                  className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20 font-medium"
                >
                  {cap}
                </span>
              ))}
            </div>

            {/* Live Interactive Preview Toggle */}
            {entry.component && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setPreviewWidgetId(isPreviewing ? null : entry.id);
                }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer ${
                  isPreviewing
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-secondary hover:bg-secondary/80 text-foreground border-border'
                }`}
                title="Toggle live widget render"
              >
                {isPreviewing ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                <span>{isPreviewing ? 'Hide' : 'Live'}</span>
              </button>
            )}

            <ChevronRight
              className={`w-4 h-4 text-muted-foreground transition-transform ${
                isExpanded ? 'rotate-90 text-foreground' : ''
              }`}
            />
          </div>
        </div>

        {/* Optional Live Render Preview */}
        {isPreviewing && entry.component && (
          <div className="px-4 pb-4 pt-1 border-t border-border/50">
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">
              Live Interactive Projection Render
            </div>
            <div className="p-4 rounded-xl border border-border bg-background/80 overflow-hidden">
              {React.createElement(entry.component, entry.defaultProps || {})}
            </div>
          </div>
        )}

        {/* Detailed Metadata Disclosure */}
        {isExpanded && (
          <div className="p-4 border-t border-border/60 bg-card/40 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              {/* Left Column: Source, Version & Remote Contracts */}
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-background/60 space-y-1.5">
                  <div className="text-[11px] font-bold text-foreground flex items-center justify-between">
                    <span>Specification & Identity</span>
                    <span className="text-emerald-500">v{entry.version || '1.0.0'}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground space-y-1">
                    <div>ID: <span className="text-foreground">{entry.id}</span></div>
                    <div>Export Name: <code className="text-primary">{entry.exportName}</code></div>
                    <div>Functional Category: <span className="font-semibold text-foreground">{entry.category || 'UI'}</span></div>
                    <div>Source: <span className="text-foreground">{entry.sourcePath}</span></div>
                    <div>Density: <span className="text-foreground">{entry.projectionConfig.defaultDensity}</span></div>
                    <div>Layout Bias: <span className="text-foreground">{entry.projectionConfig.defaultLayout}</span></div>
                  </div>
                </div>

                {/* Bound Endpoints */}
                {entry.endpoints.length > 0 && (
                  <div className="p-3 rounded-lg border border-border bg-background/60 space-y-1.5">
                    <div className="text-[11px] font-bold text-foreground">
                      Bound Remote Contracts / Endpoints
                    </div>
                    <div className="space-y-1">
                      {entry.endpoints.map((ep, i) => (
                        <div key={i} className="text-[10px] p-1.5 rounded bg-card border border-border text-foreground">
                          <div className="flex items-center gap-1.5">
                            <span className="px-1 py-0.2 rounded font-bold bg-primary/10 text-primary">
                              {ep.method}
                            </span>
                            <span className="font-mono text-foreground truncate">{ep.signature}</span>
                          </div>
                          {ep.description && (
                            <div className="text-muted-foreground text-[9px] mt-0.5">
                              {ep.description}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Inputs Schema & Projection Config */}
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-background/60 space-y-1.5">
                  <div className="text-[11px] font-bold text-foreground">
                    Inputs / Prop Schema ({entry.inputs.length})
                  </div>
                  <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                    {entry.inputs.length === 0 ? (
                      <div className="text-muted-foreground text-[11px]">
                        Self-contained or inherits dynamic context
                      </div>
                    ) : (
                      entry.inputs.map((inp, idx) => (
                        <div
                          key={idx}
                          className="p-1.5 rounded bg-card border border-border/60 flex items-center justify-between text-[10px]"
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-foreground">{inp.name}</span>
                            {inp.required && (
                              <span className="text-[9px] text-amber-500 font-medium">req</span>
                            )}
                          </div>
                          <div className="text-muted-foreground font-mono">
                            <code>{inp.type}</code>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Tags & Variants */}
                <div className="p-3 rounded-lg border border-border bg-background/60 space-y-2">
                  <div className="text-[11px] font-bold text-foreground">
                    Tags & Projection Variants
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {entry.tags.map((t) => (
                      <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                        #{t}
                      </span>
                    ))}
                    {entry.projectionConfig.variants?.map((v) => (
                      <span key={v} className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20">
                        var:{v}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`flex-1 flex flex-col h-full bg-background overflow-hidden text-foreground ${className}`}>
      {/* Top Header Bar */}
      <div className="border-b border-border bg-card/60 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold text-foreground tracking-tight">
                Assimilated Widget Registry
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-medium">
                Schema {manifest.schemaVersion}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live manifest catalog mapping component exports to capabilities, versions, and projection-core metadata
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-rescan-registry"
            onClick={handleRescan}
            disabled={isScanning}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary hover:bg-secondary/80 text-foreground border border-border transition-colors disabled:opacity-50 cursor-pointer"
            title="Scan widgets/ subfolders and update catalog"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'Scanning...' : 'Rescan Subfolders'}</span>
          </button>

          <button
            id="btn-register-subfolder-modal"
            onClick={() => setShowAddSubfolderModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Assimilate Subfolder</span>
          </button>

          <button
            id="btn-export-manifest-json"
            onClick={() => setShowJsonManifest(!showJsonManifest)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary hover:bg-secondary/80 text-foreground border border-border transition-colors cursor-pointer"
          >
            <Code className="w-3.5 h-3.5 text-muted-foreground" />
            <span>{showJsonManifest ? 'Close JSON' : 'Export JSON'}</span>
          </button>
        </div>
      </div>

      {/* Metrics Banner Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-border bg-card/25 px-6 py-3 gap-4 text-xs font-mono">
        <div className="flex items-center gap-2">
          <FolderGit2 className="w-4 h-4 text-primary shrink-0" />
          <div className="truncate">
            <span className="text-muted-foreground">Subfolders: </span>
            <span className="font-bold text-foreground">{manifest.stats.totalSubfolders}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-500 shrink-0" />
          <div className="truncate">
            <span className="text-muted-foreground">Assimilated Widgets: </span>
            <span className="font-bold text-foreground">{manifest.stats.totalWidgets}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Grid className="w-4 h-4 text-indigo-400 shrink-0" />
          <div className="truncate">
            <span className="text-muted-foreground">Categories: </span>
            <span className="font-bold text-indigo-400">
              {manifest.stats.totalCategories || 3} (UI · Data · Utility)
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" />
          <div className="truncate">
            <span className="text-muted-foreground">Unique Capabilities: </span>
            <span className="font-bold text-foreground">{manifest.stats.totalCapabilities}</span>
          </div>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Navigation Sidebar */}
        <div className="w-64 border-r border-border bg-card/30 flex flex-col overflow-y-auto p-4 gap-4 shrink-0">
          {/* Functional Categories Section */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1 flex items-center justify-between">
              <span>Categories</span>
              <span className="text-[10px] font-mono text-muted-foreground">3</span>
            </div>
            <div className="space-y-1">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-primary/10 text-primary border border-primary/20 font-semibold'
                    : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5" />
                  <span>All Categories</span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-background/60 border border-border">
                  {categoryCounts.all}
                </span>
              </button>

              {CATEGORY_DEFINITIONS.map((cat) => {
                const CatIcon = cat.icon;
                const count = categoryCounts[cat.id] || 0;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between transition-colors ${
                      selectedCategory === cat.id
                        ? 'bg-primary/10 text-primary border border-primary/20 font-semibold'
                        : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate pr-1">
                      <CatIcon className={`w-3.5 h-3.5 shrink-0 ${cat.colorClass}`} />
                      <span className="truncate">{cat.label}</span>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-background/60 border border-border">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Subfolders Section */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
              Source Subfolders
            </div>
            <div className="space-y-1">
              <button
                onClick={() => setSelectedSubfolder('all')}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-colors ${
                  selectedSubfolder === 'all'
                    ? 'bg-primary/10 text-primary border border-primary/20 font-semibold'
                    : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FolderGit2 className="w-3.5 h-3.5" />
                  <span>All Subfolders</span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-background/60 border border-border">
                  {manifest.allWidgets.length}
                </span>
              </button>

              {subfoldersList.map((sub) => (
                <button
                  key={sub.subfolder}
                  onClick={() => setSelectedSubfolder(sub.subfolder)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-colors ${
                    selectedSubfolder === sub.subfolder
                      ? 'bg-primary/10 text-primary border border-primary/20 font-semibold'
                      : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate pr-1">
                    <FolderGit2 className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                    <span className="truncate">{sub.subfolder}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-secondary text-muted-foreground">
                      v{sub.version || '1.0.0'}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-background/60 border border-border">
                      {sub.widgetCount}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Archetypes Filter Section */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
              Archetypes
            </div>
            <div className="space-y-1">
              <button
                onClick={() => setSelectedArchetype('all')}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between transition-colors ${
                  selectedArchetype === 'all'
                    ? 'bg-secondary text-foreground font-semibold'
                    : 'text-muted-foreground hover:bg-secondary/40 hover:text-foreground'
                }`}
              >
                <span>All Archetypes</span>
                <span className="text-[10px] font-mono text-muted-foreground">
                  {manifest.allWidgets.length}
                </span>
              </button>
              {availableArchetypes.map((arch) => {
                const count = manifest.byArchetype[arch]?.length || 0;
                return (
                  <button
                    key={arch}
                    onClick={() => setSelectedArchetype(arch)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between transition-colors ${
                      selectedArchetype === arch
                        ? 'bg-secondary text-foreground font-semibold'
                        : 'text-muted-foreground hover:bg-secondary/40 hover:text-foreground'
                    }`}
                  >
                    <span className="truncate">{arch}</span>
                    <span className="text-[10px] font-mono text-muted-foreground">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Capabilities Filter Section */}
          <div className="flex-1">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
              Capabilities Filter
            </div>
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => setSelectedCapability('all')}
                className={`px-2 py-1 rounded text-[10px] font-mono transition-colors ${
                  selectedCapability === 'all'
                    ? 'bg-blue-600 text-white font-medium'
                    : 'bg-secondary/80 text-muted-foreground hover:text-foreground'
                }`}
              >
                ALL
              </button>
              {availableCapabilities.map((cap) => (
                <button
                  key={cap}
                  onClick={() => setSelectedCapability(selectedCapability === cap ? 'all' : cap)}
                  className={`px-2 py-1 rounded text-[10px] font-mono transition-colors truncate max-w-full ${
                    selectedCapability === cap
                      ? 'bg-blue-600 text-white font-medium'
                      : 'bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`}
                >
                  {cap}
                </button>
              ))}
            </div>
          </div>

          {/* Injection Status Card */}
          {lastAudit && (
            <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-xs space-y-1 mt-auto">
              <div className="flex items-center gap-1.5 text-emerald-500 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Projection Sync Status</span>
              </div>
              <div className="text-[11px] font-mono text-muted-foreground">
                Catalog Bound: <span className="text-foreground">{lastAudit.registeredCount + lastAudit.updatedCount}</span> items
              </div>
              <div className="text-[10px] font-mono text-muted-foreground">
                Runtime: @nexus/projection-core
              </div>
            </div>
          )}
        </div>

        {/* Center Manifest Visualizer */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {showJsonManifest ? (
            /* JSON Manifest View */
            <div className="flex-1 flex flex-col p-6 overflow-hidden">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold">Master Widget Manifest (JSON)</span>
                </div>
                <button
                  onClick={handleCopyJson}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary hover:bg-secondary/80 text-foreground border border-border transition-colors cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy JSON'}</span>
                </button>
              </div>
              <pre className="flex-1 mt-4 p-4 rounded-xl border border-border bg-card/60 overflow-auto font-mono text-xs text-foreground leading-relaxed">
                {widgetRegistryManager.exportManifestJson(true)}
              </pre>
            </div>
          ) : (
            /* Visual Widget Entries Grid / Table */
            <div className="flex-1 flex flex-col overflow-hidden p-6 space-y-4">
              {/* Search & Active Filters Bar */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[240px]">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search by component, capability, version, archetype, tag, or API endpoint..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-card border border-border focus:outline-none focus:border-primary text-foreground"
                  />
                </div>

                <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                  <span>Displaying {filteredWidgets.length} of {manifest.allWidgets.length} widgets</span>
                  {(selectedCategory !== 'all' || selectedSubfolder !== 'all' || selectedCapability !== 'all' || selectedArchetype !== 'all' || searchQuery) && (
                    <button
                      onClick={() => {
                        setSelectedCategory('all');
                        setSelectedSubfolder('all');
                        setSelectedCapability('all');
                        setSelectedArchetype('all');
                        setSearchQuery('');
                      }}
                      className="px-2 py-1 rounded bg-secondary hover:bg-secondary/80 text-[11px] text-foreground transition-colors cursor-pointer"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              </div>

              {/* Functional Category Navigation Tabs & View Mode Switcher */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
                {/* Category Tabs */}
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-secondary/50 border border-border">
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      selectedCategory === 'all'
                        ? 'bg-card text-foreground shadow-xs border border-border font-semibold'
                        : 'text-muted-foreground hover:text-foreground hover:bg-card/40'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>All Categories</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-secondary text-muted-foreground ml-0.5">
                      {categoryCounts.all}
                    </span>
                  </button>

                  {CATEGORY_DEFINITIONS.map((cat) => {
                    const CatIcon = cat.icon;
                    const count = categoryCounts[cat.id] || 0;
                    const isSelected = selectedCategory === cat.id;

                    return (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-card text-foreground shadow-xs border border-border font-semibold'
                            : 'text-muted-foreground hover:text-foreground hover:bg-card/40'
                        }`}
                      >
                        <CatIcon className={`w-3.5 h-3.5 ${cat.colorClass}`} />
                        <span>{cat.label}</span>
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold ml-0.5 ${
                            isSelected ? cat.badgeClass : 'bg-secondary text-muted-foreground'
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* View Mode Switcher (Grouped vs Tabbed List) */}
                <div className="flex items-center gap-1 p-1 rounded-xl bg-secondary/50 border border-border text-xs">
                  <button
                    onClick={() => setViewMode('grouped')}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                      viewMode === 'grouped'
                        ? 'bg-card text-foreground shadow-xs border border-border font-semibold'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    title="Organize widgets into category sections"
                  >
                    <Grid className="w-3.5 h-3.5 text-primary" />
                    <span>Grouped View</span>
                  </button>
                  <button
                    onClick={() => setViewMode('tabbed')}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                      viewMode === 'tabbed'
                        ? 'bg-card text-foreground shadow-xs border border-border font-semibold'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    title="Direct list for selected category tab"
                  >
                    <ListFilter className="w-3.5 h-3.5 text-primary" />
                    <span>Tabbed List</span>
                  </button>
                </div>
              </div>

              {/* Main Content: Grouped by Category vs Tabbed Flat List */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {filteredWidgets.length === 0 ? (
                  <div className="p-8 text-center rounded-xl border border-dashed border-border text-muted-foreground text-xs">
                    No assimilated widgets match your current category, search, or capability filter criteria.
                  </div>
                ) : viewMode === 'grouped' ? (
                  /* Grouped View */
                  CATEGORY_DEFINITIONS.filter(
                    (cat) => selectedCategory === 'all' || selectedCategory === cat.id
                  ).map((cat) => {
                    const widgetsInCat = widgetsByCategory[cat.id] || [];
                    if (widgetsInCat.length === 0) return null;
                    const CatIcon = cat.icon;
                    const isCollapsed = Boolean(collapsedCategories[cat.id]);

                    return (
                      <section
                        key={cat.id}
                        className={`rounded-2xl border ${cat.accentBorder} bg-card/25 overflow-hidden transition-all`}
                      >
                        {/* Category Section Header */}
                        <div
                          onClick={() => toggleCategoryCollapse(cat.id)}
                          className={`p-3.5 px-4 flex items-center justify-between gap-3 ${cat.cardHeaderBg} border-b border-border/60 cursor-pointer select-none`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl border ${cat.badgeClass}`}>
                              <CatIcon className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h2 className="text-xs font-bold text-foreground tracking-tight">
                                  {cat.label}
                                </h2>
                                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border ${cat.badgeClass}`}>
                                  {widgetsInCat.length} {widgetsInCat.length === 1 ? 'widget' : 'widgets'}
                                </span>
                              </div>
                              <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                                {cat.description}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-muted-foreground hidden sm:inline">
                              {isCollapsed ? 'Click to expand' : 'Click to collapse'}
                            </span>
                            <div className="p-1 rounded-md hover:bg-secondary/80 text-muted-foreground">
                              {isCollapsed ? (
                                <ChevronRight className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Category Widget Cards */}
                        {!isCollapsed && (
                          <div className="p-3 space-y-3">
                            {widgetsInCat.map(renderWidgetCard)}
                          </div>
                        )}
                      </section>
                    );
                  })
                ) : (
                  /* Tabbed List View */
                  <div className="space-y-3">
                    {filteredWidgets.map(renderWidgetCard)}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Subfolder Modal */}
      {showAddSubfolderModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Assimilate New Widget Subfolder</h2>
              <button
                onClick={() => setShowAddSubfolderModal(false)}
                className="text-muted-foreground hover:text-foreground text-xs"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Register a <code>widgets/</code> subfolder to parse component exports, capabilities, and bind directly into <code>@nexus/projection-core</code>.
            </p>

            <form onSubmit={handleAddSubfolder} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-foreground mb-1">
                  Subfolder Slug
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. analytics-ui, operator-ui"
                  value={newSubfolderName}
                  onChange={(e) => setNewSubfolderName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border focus:outline-none focus:border-primary text-foreground"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-foreground mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Analytics Suite"
                    value={newSubfolderDisplayName}
                    onChange={(e) => setNewSubfolderDisplayName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border focus:outline-none focus:border-primary text-foreground"
                  />
                </div>

                <div>
                  <label className="block font-medium text-foreground mb-1">
                    Version
                  </label>
                  <input
                    type="text"
                    placeholder="1.0.0"
                    value={newSubfolderVersion}
                    onChange={(e) => setNewSubfolderVersion(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border focus:outline-none focus:border-primary text-foreground"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-foreground mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Reusable components for telemetry, metrics, and visualization..."
                  value={newSubfolderDescription}
                  onChange={(e) => setNewSubfolderDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border focus:outline-none focus:border-primary text-foreground"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddSubfolderModal(false)}
                  className="px-3 py-1.5 rounded-lg text-muted-foreground hover:bg-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
                >
                  Scan & Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WidgetRegistryView;
