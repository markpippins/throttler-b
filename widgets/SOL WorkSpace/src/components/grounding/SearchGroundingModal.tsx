import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Globe, 
  ExternalLink, 
  Sparkles, 
  Layers, 
  Database, 
  ShieldCheck, 
  FileCode2, 
  ArrowRight, 
  Check, 
  X, 
  Loader2, 
  BookOpen, 
  Cpu, 
  Code,
  Tag,
  Share2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useWorkbench } from '../../context/WorkbenchContext';
import { GroundedOntologyModel } from '../../types/sol';
import { solEngine } from '../../engine/solEngine';

const PRESET_QUERIES = [
  { label: "schema.org/ComputerServer", query: "schema.org/ComputerServer", category: "Infrastructure" },
  { label: "schema.org/SoftwareApplication", query: "schema.org/SoftwareApplication", category: "Software" },
  { label: "OWL 2 Primitives (Class & Property)", query: "owl:Class", category: "Semantic Web" },
  { label: "W3C SOSA / SSN Sensor", query: "sosa:Sensor", category: "IoT & Telemetry" },
  { label: "W3C PROV-O Activity & Provenance", query: "prov-o", category: "Provenance" },
  { label: "Dublin Core Terms (DCMI)", query: "dublin core terms", category: "Metadata" },
  { label: "schema.org/PostalAddress", query: "schema.org/PostalAddress", category: "Location" },
  { label: "QUDT Quantity & Unit", query: "qudt unit", category: "Scientific" }
];

export const SearchGroundingModal: React.FC = () => {
  const {
    isGroundingModalOpen,
    setIsGroundingModalOpen,
    groundingInitialQuery,
    selectItem,
    setActiveWorkspaceTab,
    refreshEngine
  } = useWorkbench();

  const [query, setQuery] = useState(groundingInitialQuery || 'schema.org/ComputerServer');
  const [isLoading, setIsLoading] = useState(false);
  const [model, setModel] = useState<GroundedOntologyModel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'attributes' | 'invariants' | 'relationships' | 'projections'>('overview');
  const [selectedProjection, setSelectedProjection] = useState<'typespec' | 'cue' | 'json_ld' | 'tla_plus'>('typespec');
  const [importSuccess, setImportSuccess] = useState<{ conceptId: string; entityId: string } | null>(null);

  // Sync initial query when opened
  useEffect(() => {
    if (isGroundingModalOpen && groundingInitialQuery) {
      setQuery(groundingInitialQuery);
      handleSearch(groundingInitialQuery);
    }
  }, [isGroundingModalOpen, groundingInitialQuery]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isGroundingModalOpen) {
        setIsGroundingModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isGroundingModalOpen]);

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setIsLoading(true);
    setError(null);
    setImportSuccess(null);

    try {
      const response = await fetch('/api/ontology/search-grounding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery })
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data.success && data.model) {
        setModel(data.model);
      } else {
        throw new Error(data.error || 'Failed to extract grounded ontology');
      }
    } catch (err: any) {
      console.error('Grounding search error:', err);
      setError(err.message || 'Error communicating with grounding server');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = () => {
    if (!model) return;

    try {
      const result = solEngine.importGroundedOntology(model);
      refreshEngine();
      setImportSuccess({ conceptId: result.conceptId, entityId: result.entityId });

      // Automatically select the imported concept in the workbench
      selectItem({
        type: 'concept',
        id: result.conceptId,
        data: result.concept,
        provenance: 'imported'
      });
    } catch (err: any) {
      setError(`Failed to import model: ${err.message}`);
    }
  };

  const handleGoToWorkbench = (tab: 'graph' | 'editor' | 'projections') => {
    setActiveWorkspaceTab(tab);
    setIsGroundingModalOpen(false);
  };

  if (!isGroundingModalOpen) return null;

  return (
    <div 
      id="search-grounding-modal-overlay"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div 
        id="search-grounding-modal-card"
        className="bg-[var(--bg-secondary)] border border-[var(--border-strong)] rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-xs text-[var(--text-primary)] animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-tertiary)] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm font-mono tracking-wide text-[var(--text-primary)]">
                  Ontology Search Grounding
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-sky-950/80 text-sky-300 border border-sky-800/60 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" />
                  Live Web Grounding
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                Pulls current definitions from schema.org, W3C standards (OWL, SOSA, PROV-O), and Dublin Core to synthesize SOL models.
              </p>
            </div>
          </div>

          <button
            id="close-grounding-modal-btn"
            onClick={() => setIsGroundingModalOpen(false)}
            className="p-1.5 rounded hover:bg-[var(--bg-primary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar & Presets */}
        <div className="p-4 border-b border-[var(--border-subtle)] bg-[var(--bg-primary)] flex flex-col gap-3 shrink-0">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSearch(query); }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                id="grounding-search-input"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter standard ontology URI or term (e.g., schema.org/ComputerServer, owl:Class, sosa:Sensor)..."
                className="w-full bg-[var(--bg-secondary)] border border-[var(--border-strong)] rounded px-3 pl-9 py-2 text-xs font-mono text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-hidden focus:border-sky-500 transition-all"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              id="submit-grounding-search-btn"
              type="submit"
              disabled={isLoading || !query.trim()}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:bg-sky-950 disabled:text-sky-700 text-white rounded font-medium flex items-center gap-1.5 transition-colors shrink-0 shadow-xs cursor-pointer disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Grounding...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Ground from Web</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Presets Catalog */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] uppercase font-mono tracking-wider text-[var(--text-muted)] mr-1">
              Catalog Presets:
            </span>
            {PRESET_QUERIES.map((preset) => (
              <button
                key={preset.query}
                type="button"
                onClick={() => {
                  setQuery(preset.query);
                  handleSearch(preset.query);
                }}
                className={`px-2 py-0.5 rounded text-[11px] font-mono border transition-all cursor-pointer ${
                  query === preset.query
                    ? 'bg-sky-950/80 border-sky-600 text-sky-300 font-semibold'
                    : 'bg-[var(--bg-secondary)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Body Content Area */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {error && (
            <div className="p-3 rounded bg-rose-950/40 border border-rose-800/60 text-rose-300 flex items-start gap-2 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Grounding Error</p>
                <p className="text-[11px] opacity-90">{error}</p>
              </div>
            </div>
          )}

          {importSuccess && (
            <div className="p-3.5 rounded bg-emerald-950/40 border border-emerald-700/60 text-emerald-200 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <p className="font-semibold">Model Successfully Imported into SOL Workbench!</p>
                  <p className="text-[11px] text-emerald-300/80 font-mono">
                    Concept ID: {importSuccess.conceptId} · Demo Entity: {importSuccess.entityId}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleGoToWorkbench('graph')}
                  className="px-2.5 py-1 rounded bg-emerald-800 hover:bg-emerald-700 text-white text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <span>View in Graph</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
                <button
                  onClick={() => handleGoToWorkbench('editor')}
                  className="px-2.5 py-1 rounded bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-emerald-800/80 text-[11px] transition-colors cursor-pointer"
                >
                  <span>Open Structured Editor</span>
                </button>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="flex-1 min-h-[260px] flex flex-col items-center justify-center gap-3 text-[var(--text-secondary)]">
              <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
              <div className="text-center">
                <p className="font-semibold text-sm text-[var(--text-primary)]">Searching Web & Synthesizing Schema...</p>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  Grounding specifications for "{query}" against schema.org and W3C taxonomies...
                </p>
              </div>
            </div>
          ) : model ? (
            <div className="flex flex-col gap-4">
              {/* Web Sources & Grounding Verification Banner */}
              <div className="p-3 rounded bg-[var(--bg-primary)] border border-[var(--border-subtle)] flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
                      Grounded Web Sources & Specifications:
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-800">
                      Verified W3C/Schema.org
                    </span>
                  </div>
                  {model.grounded_via && (
                    <span className="text-[10px] font-mono text-sky-400">
                      {model.grounded_via}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {model.sources.map((source, idx) => (
                    <a
                      key={idx}
                      href={source.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[var(--bg-secondary)] border border-[var(--border-strong)] hover:border-sky-500 text-sky-400 hover:text-sky-300 text-[11px] font-mono transition-all group"
                    >
                      <BookOpen className="w-3 h-3 text-[var(--text-muted)] group-hover:text-sky-400" />
                      <span className="truncate max-w-[280px]">{source.title}</span>
                      <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                    </a>
                  ))}
                </div>
              </div>

              {/* Concept Metadata Card */}
              <div className="p-3.5 rounded bg-[var(--bg-primary)] border border-[var(--border-strong)] flex flex-col gap-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-300 font-mono font-bold">
                      C
                    </div>
                    <div>
                      <span className="font-bold text-sm text-[var(--text-primary)] font-mono">
                        {model.canonical_name}
                      </span>
                      <span className="text-[11px] text-[var(--text-muted)] font-mono ml-2">
                        [{model.identifier}]
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-sky-950/60 text-sky-300 border border-sky-800">
                      subclassOf: {model.subclass_of || 'Thing'}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-950/60 text-purple-300 border border-purple-800">
                      {model.attributes.length} Attributes
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-950/60 text-amber-300 border border-amber-800">
                      {model.invariants.length} Invariants
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-[var(--text-secondary)] font-mono bg-[var(--bg-secondary)] px-2.5 py-1 rounded border border-[var(--border-subtle)] flex items-center gap-1.5">
                  <span className="text-[var(--text-muted)]">Namespace IRI:</span>
                  <span className="text-sky-300 select-all">{model.namespace}</span>
                </div>

                <p className="text-xs text-[var(--text-secondary)] leading-relaxed mt-1">
                  {model.description}
                </p>
              </div>

              {/* Inspector Tabs */}
              <div className="flex items-center gap-1 border-b border-[var(--border-subtle)] pb-1">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                    activeTab === 'overview'
                      ? 'bg-[var(--bg-tertiary)] text-sky-400 font-semibold border border-[var(--border-strong)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Attributes & Shrapnel EAV ({model.attributes.length})
                </button>
                <button
                  onClick={() => setActiveTab('invariants')}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                    activeTab === 'invariants'
                      ? 'bg-[var(--bg-tertiary)] text-sky-400 font-semibold border border-[var(--border-strong)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Invariant Rules & Logic ({model.invariants.length})
                </button>
                <button
                  onClick={() => setActiveTab('relationships')}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                    activeTab === 'relationships'
                      ? 'bg-[var(--bg-tertiary)] text-sky-400 font-semibold border border-[var(--border-strong)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Relationships ({model.relationships.length})
                </button>
                <button
                  onClick={() => setActiveTab('projections')}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                    activeTab === 'projections'
                      ? 'bg-[var(--bg-tertiary)] text-sky-400 font-semibold border border-[var(--border-strong)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Multi-Format Projections
                </button>
              </div>

              {/* Tab Content: Attributes & Shrapnel EAV */}
              {activeTab === 'overview' && (
                <div className="rounded border border-[var(--border-subtle)] overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left font-mono text-[11px]">
                      <thead className="bg-[var(--bg-primary)] text-[var(--text-muted)] uppercase text-[10px] border-b border-[var(--border-subtle)]">
                        <tr>
                          <th className="px-3 py-2">Property</th>
                          <th className="px-3 py-2">Value Type</th>
                          <th className="px-3 py-2">Shrapnel EAV</th>
                          <th className="px-3 py-2">Nullable</th>
                          <th className="px-3 py-2">Default / Sample</th>
                          <th className="px-3 py-2">Description</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-subtle)] bg-[var(--bg-secondary)]">
                        {model.attributes.map((attr, idx) => (
                          <tr key={idx} className="hover:bg-[var(--bg-tertiary)] transition-colors">
                            <td className="px-3 py-2 font-semibold text-[var(--text-primary)]">
                              {attr.name}
                              {attr.label && attr.label !== attr.name && (
                                <span className="block text-[10px] text-[var(--text-muted)] font-normal">
                                  {attr.label}
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-sky-400">{attr.value_type}</td>
                            <td className="px-3 py-2">
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-950/60 text-amber-300 border border-amber-800">
                                {attr.shrapnel_type || 'String'} [#{attr.shrapnel_code || 2}]
                              </span>
                            </td>
                            <td className="px-3 py-2 text-[var(--text-muted)]">
                              {attr.is_nullable ? 'true' : 'false'}
                            </td>
                            <td className="px-3 py-2 text-emerald-400 truncate max-w-[140px]">
                              {typeof attr.default_value === 'object' 
                                ? JSON.stringify(attr.default_value) 
                                : String(attr.default_value ?? '-')}
                            </td>
                            <td className="px-3 py-2 text-[var(--text-secondary)] font-sans text-xs">
                              {attr.description}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tab Content: Invariant Rules */}
              {activeTab === 'invariants' && (
                <div className="flex flex-col gap-2">
                  {model.invariants.map((inv, idx) => (
                    <div 
                      key={idx}
                      className="p-3 rounded bg-[var(--bg-primary)] border border-[var(--border-subtle)] flex items-start justify-between gap-3"
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="font-semibold text-xs text-[var(--text-primary)]">{inv.name}</span>
                          <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono uppercase ${
                            inv.severity === 'HARD' ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-amber-950 text-amber-300 border border-amber-800'
                          }`}>
                            {inv.severity}
                          </span>
                        </div>
                        <div className="bg-[var(--bg-secondary)] px-2.5 py-1 rounded font-mono text-[11px] text-sky-300 border border-[var(--border-subtle)]">
                          {inv.expression}
                        </div>
                        {inv.description && (
                          <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">{inv.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Tab Content: Relationships */}
              {activeTab === 'relationships' && (
                <div className="flex flex-col gap-2">
                  {model.relationships.map((rel, idx) => (
                    <div 
                      key={idx}
                      className="p-3 rounded bg-[var(--bg-primary)] border border-[var(--border-subtle)] flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <Share2 className="w-3.5 h-3.5 text-sky-400" />
                        <span className="font-mono font-semibold text-xs text-[var(--text-primary)]">{rel.name}</span>
                        <ArrowRight className="w-3 h-3 text-[var(--text-muted)]" />
                        <span className="font-mono text-xs text-indigo-300">{rel.target_concept}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[var(--bg-secondary)] border border-[var(--border-strong)] text-[var(--text-secondary)]">
                        Cardinality: {rel.cardinality}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Tab Content: Projections */}
              {activeTab === 'projections' && model.projections && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-1.5">
                    {(['typespec', 'cue', 'json_ld', 'tla_plus'] as const).map((fmt) => (
                      <button
                        key={fmt}
                        onClick={() => setSelectedProjection(fmt)}
                        className={`px-2.5 py-1 rounded text-[11px] font-mono uppercase transition-all ${
                          selectedProjection === fmt
                            ? 'bg-sky-950 text-sky-300 border border-sky-700 font-semibold'
                            : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {fmt.replace('_', ' ')}
                      </button>
                    ))}
                  </div>

                  <div className="bg-[var(--bg-primary)] p-3 rounded border border-[var(--border-subtle)] overflow-x-auto">
                    <pre className="font-mono text-[11px] text-sky-300 leading-relaxed">
                      {model.projections[selectedProjection] || '// Projection not generated'}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 min-h-[240px] flex flex-col items-center justify-center gap-2 text-[var(--text-muted)]">
              <Globe className="w-10 h-10 stroke-[1.5] text-[var(--text-muted)] opacity-50" />
              <p className="text-xs">Search for any standard ontology term or select a catalog preset above.</p>
            </div>
          )}
        </div>

        {/* Modal Footer / Actions */}
        <div className="p-3 border-t border-[var(--border-subtle)] bg-[var(--bg-tertiary)] flex items-center justify-between shrink-0">
          <div className="text-[11px] text-[var(--text-muted)] font-mono hidden sm:block">
            {model ? `Ready to import '${model.canonical_name}' into SOL schema` : 'Awaiting query selection'}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsGroundingModalOpen(false)}
              className="px-3 py-1.5 rounded bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] border border-[var(--border-strong)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              id="import-grounded-ontology-btn"
              onClick={handleImport}
              disabled={!model || !!importSuccess}
              className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-950 disabled:text-emerald-800 text-white font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:cursor-not-allowed"
            >
              {importSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Imported</span>
                </>
              ) : (
                <>
                  <Database className="w-3.5 h-3.5" />
                  <span>Create & Import Model</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
