import React, { useState } from 'react';
import { 
  FolderTree, 
  ChevronRight, 
  ChevronDown, 
  Boxes, 
  Database, 
  FileCode, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Layers, 
  Tag, 
  Sliders, 
  Search, 
  Plus, 
  Flame,
  FileSpreadsheet,
  Link,
  Shield,
  Clock,
  Code,
  Globe,
  Sparkles
} from 'lucide-react';
import { useWorkbench } from '../../context/WorkbenchContext';
import { solEngine } from '../../engine/solEngine';
import { ProvenanceBadge } from '../common/ProvenanceBadge';
import { OntologyContextMenu, ContextMenuState } from '../common/OntologyContextMenu';
import { Disposition } from '../../types/sol';

export const Navigator: React.FC = () => {
  const {
    selectedItem,
    selectById,
    selectItem,
    graphMode,
    setGraphMode,
    isNavCollapsed,
    setIsNavCollapsed,
    sendToRepl,
    openGroundingModal
  } = useWorkbench();

  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    semantic_concepts: true,
    semantic_rules: false,
    semantic_frames: false,
    concrete_entities: true,
    concrete_props: true,
    concrete_facts: false,
    shrapnel_store: false,
    projections: false
  });

  const toggleSection = (key: string) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const concepts = Object.values(solEngine.concepts);
  const entities = solEngine.entities;
  const props = solEngine.propositions;
  const rules = solEngine.rules;
  const frames = solEngine.frameDimensions;
  const shrapnelObjects = solEngine.shrapnelObjects;
  const representations = Object.values(solEngine.representations);
  const facts = solEngine.facts;

  // Filter items based on search query
  const q = searchQuery.toLowerCase();
  const filteredConcepts = concepts.filter(c => c.name.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q));
  const filteredEntities = entities.filter(e => e.external_id.toLowerCase().includes(q) || e.concept_name.toLowerCase().includes(q));
  const filteredProps = props.filter(p => p.title.toLowerCase().includes(q) || p.disposition.toLowerCase().includes(q));
  const filteredRules = rules.filter(r => r.name.toLowerCase().includes(q));

  const handleItemContextMenu = (
    e: React.MouseEvent,
    type: ContextMenuState['type'],
    id: string | number,
    data: any,
    provenance?: any
  ) => {
    e.preventDefault();
    e.stopPropagation();
    selectById(type as any, id);
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      type,
      id,
      data,
      provenance
    });
  };

  if (isNavCollapsed) {
    return (
      <div 
        id="navigator-collapsed"
        className="w-8 border-r border-[var(--border-subtle)] bg-[var(--bg-secondary)] flex flex-col items-center py-2 shrink-0 select-none cursor-pointer hover:bg-[var(--bg-tertiary)] transition-colors"
        onClick={() => setIsNavCollapsed(false)}
        title="Expand Navigator Tree"
      >
        <FolderTree className="w-4 h-4 text-sky-400 mb-4" />
        <div className="rotate-90 text-[10px] font-mono tracking-widest text-[var(--text-muted)] whitespace-nowrap mt-6 uppercase">
          NAVIGATOR
        </div>
      </div>
    );
  }

  return (
    <aside
      id="workbench-navigator"
      className="w-64 border-r border-[var(--border-subtle)] bg-[var(--bg-secondary)] flex flex-col h-full shrink-0 select-none overflow-hidden"
    >
      {/* Header & Quick Search */}
      <div className="p-2 border-b border-[var(--border-subtle)] flex flex-col gap-2 shrink-0 bg-[var(--bg-tertiary)]/50">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold font-mono tracking-wider text-[var(--text-secondary)] uppercase flex items-center gap-1.5">
            <FolderTree className="w-3.5 h-3.5 text-sky-400" />
            Workspace Navigator
          </span>
          <button
            id="nav-collapse-btn"
            onClick={() => setIsNavCollapsed(true)}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs px-1 rounded hover:bg-[var(--bg-secondary)]"
            title="Collapse sidebar"
          >
            ‹
          </button>
        </div>

        {/* Filter Input */}
        <div className="relative">
          <Search className="w-3 h-3 absolute left-2 top-2 text-[var(--text-muted)]" />
          <input
            id="nav-search-input"
            type="text"
            placeholder="Search schema & facts..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded pl-7 pr-2 py-1 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-hidden focus:border-sky-500 font-mono"
          />
        </div>
      </div>

      {/* Tree Content (Scrollable) */}
      <div className="flex-1 overflow-y-auto p-1 text-xs font-mono space-y-2">
        
        {/* ========================================================= */}
        {/* 1. SEMANTIC / ONTOLOGY LAYER (Specification: What it means) */}
        {/* ========================================================= */}
        <div className="rounded border border-indigo-900/40 bg-indigo-950/10 overflow-hidden">
          <div 
            onClick={() => toggleSection('semantic_concepts')}
            className="px-2 py-1.5 bg-indigo-950/30 flex items-center justify-between cursor-pointer hover:bg-indigo-900/40 transition-colors"
          >
            <div className="flex items-center gap-1.5 text-indigo-300 font-semibold text-[11px]">
              {openSections.semantic_concepts ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              <Boxes className="w-3.5 h-3.5 text-indigo-400" />
              <span>SEMANTIC LAYER (SOL)</span>
            </div>
            <span className="text-[10px] px-1 rounded bg-indigo-900/60 text-indigo-200">
              {concepts.length} concepts
            </span>
          </div>

          {openSections.semantic_concepts && (
            <div className="p-1 space-y-0.5">
              {/* Quick Grounding Action */}
              <button
                id="nav-ground-ontology-btn"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openGroundingModal();
                }}
                className="w-full mb-1 px-2 py-1 rounded bg-sky-950/60 hover:bg-sky-900/80 border border-sky-800/80 hover:border-sky-600 text-sky-300 flex items-center justify-between text-[11px] font-mono transition-all cursor-pointer"
                title="Ground schema.org / OWL ontology from live web"
              >
                <div className="flex items-center gap-1.5">
                  <Globe className="w-3 h-3 text-sky-400" />
                  <span className="font-semibold">+ Ground from Web</span>
                </div>
                <Sparkles className="w-2.5 h-2.5 text-sky-400" />
              </button>

              {filteredConcepts.map(c => {
                const isSelected = selectedItem?.type === 'concept' && selectedItem?.id === c.id;
                return (
                  <div
                    key={c.id}
                    id={`nav-concept-${c.id}`}
                    onClick={() => selectById('concept', c.id)}
                    onContextMenu={(e) => handleItemContextMenu(e, 'concept', c.id, c, c.provenance || 'semantic')}
                    className={`px-2 py-1 rounded flex items-center justify-between cursor-pointer transition-colors ${
                      isSelected 
                        ? 'bg-indigo-600/30 text-indigo-200 border border-indigo-500/50 font-bold'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate mr-1">
                      <span className="text-indigo-400 font-bold">#</span>
                      <span className="truncate">{c.name}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <ProvenanceBadge provenance={c.provenance || 'semantic'} size="2xs" />
                      <span className="text-[9px] text-[var(--text-muted)]">
                        {Object.keys(c.attributes).length}a·{c.invariants.length}i
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Sub-group: Invariant Rules */}
              <div 
                onClick={() => toggleSection('semantic_rules')}
                className="px-2 py-1 flex items-center justify-between cursor-pointer text-[var(--text-muted)] hover:text-indigo-300 transition-colors"
              >
                <div className="flex items-center gap-1 text-[10px]">
                  {openSections.semantic_rules ? <ChevronDown className="w-2.5 h-2.5" /> : <ChevronRight className="w-2.5 h-2.5" />}
                  <span>Invariant Rules ({rules.length})</span>
                </div>
              </div>

              {openSections.semantic_rules && (
                <div className="pl-4 pr-1 space-y-0.5">
                  {filteredRules.map(r => {
                    const isSelected = selectedItem?.type === 'rule' && selectedItem?.id === r.id;
                    return (
                      <div
                        key={r.id}
                        id={`nav-rule-${r.id}`}
                        onClick={() => selectById('rule', r.id)}
                        onContextMenu={(e) => handleItemContextMenu(e, 'rule', r.id, r, r.provenance || 'asserted')}
                        className={`px-1.5 py-0.5 rounded flex items-center justify-between text-[11px] cursor-pointer ${
                          isSelected ? 'bg-indigo-500/20 text-indigo-200 font-bold' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                        }`}
                      >
                        <span className="truncate mr-1">{r.name}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          <ProvenanceBadge provenance={r.provenance || 'asserted'} size="2xs" />
                          <span className="text-[9px] uppercase px-1 rounded bg-[var(--bg-primary)] text-indigo-400">
                            {r.severity}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Sub-group: Frames & Dimensions */}
              <div 
                onClick={() => toggleSection('semantic_frames')}
                className="px-2 py-1 flex items-center justify-between cursor-pointer text-[var(--text-muted)] hover:text-indigo-300 transition-colors"
              >
                <div className="flex items-center gap-1 text-[10px]">
                  {openSections.semantic_frames ? <ChevronDown className="w-2.5 h-2.5" /> : <ChevronRight className="w-2.5 h-2.5" />}
                  <span>Frame Dimensions ({frames.length})</span>
                </div>
              </div>

              {openSections.semantic_frames && (
                <div className="pl-4 pr-1 space-y-0.5">
                  {frames.map(f => {
                    const isSelected = selectedItem?.type === 'frame' && selectedItem?.id === f.id;
                    return (
                      <div
                        key={f.id}
                        id={`nav-frame-${f.id}`}
                        onClick={() => selectById('frame', f.id)}
                        onContextMenu={(e) => handleItemContextMenu(e, 'frame', f.id, f, f.provenance || 'semantic')}
                        className={`px-1.5 py-0.5 rounded flex items-center justify-between text-[11px] cursor-pointer ${
                          isSelected ? 'bg-indigo-500/20 text-indigo-200 font-bold' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                        }`}
                      >
                        <span className="truncate mr-1">{f.name}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          <ProvenanceBadge provenance={f.provenance || 'semantic'} size="2xs" />
                          <span className="text-[9px] text-sky-400">[{f.dimension_key}]</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* 2. CONCRETE / KNOWLEDGE LAYER (Instantiated Facts: What it knows) */}
        {/* ========================================================= */}
        <div className="rounded border border-emerald-900/40 bg-emerald-950/10 overflow-hidden">
          <div 
            onClick={() => toggleSection('concrete_entities')}
            className="px-2 py-1.5 bg-emerald-950/30 flex items-center justify-between cursor-pointer hover:bg-emerald-900/40 transition-colors"
          >
            <div className="flex items-center gap-1.5 text-emerald-300 font-semibold text-[11px]">
              {openSections.concrete_entities ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span>CONCRETE LAYER (FACTS)</span>
            </div>
            <span className="text-[10px] px-1 rounded bg-emerald-900/60 text-emerald-200">
              {entities.length} entities
            </span>
          </div>

          {openSections.concrete_entities && (
            <div className="p-1 space-y-0.5">
              {filteredEntities.map(e => {
                const isSelected = selectedItem?.type === 'entity' && selectedItem?.id === e.id;
                const isFaulty = e.id.includes('faulty') || e.id.includes('TEMPVIOLATION');
                return (
                  <div
                    key={e.id}
                    id={`nav-entity-${e.id}`}
                    onClick={() => selectById('entity', e.id)}
                    onContextMenu={(eEvent) => handleItemContextMenu(eEvent, 'entity', e.id, e, e.provenance || 'concrete')}
                    className={`px-2 py-1 rounded flex items-center justify-between cursor-pointer transition-colors ${
                      isSelected 
                        ? 'bg-emerald-600/30 text-emerald-200 border border-emerald-500/50 font-bold'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate mr-1">
                      {isFaulty ? (
                        <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
                      ) : (
                        <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                      )}
                      <span className="truncate">{e.external_id}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <ProvenanceBadge provenance={e.provenance || 'concrete'} size="2xs" />
                      <span className="text-[9px] px-1 rounded bg-[var(--bg-primary)] text-[var(--text-muted)] truncate max-w-[60px]">
                        {e.concept_name}
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Sub-group: Evaluated Propositions */}
              <div 
                onClick={() => toggleSection('concrete_props')}
                className="px-2 py-1 flex items-center justify-between cursor-pointer text-[var(--text-muted)] hover:text-emerald-300 transition-colors mt-1"
              >
                <div className="flex items-center gap-1 text-[10px]">
                  {openSections.concrete_props ? <ChevronDown className="w-2.5 h-2.5" /> : <ChevronRight className="w-2.5 h-2.5" />}
                  <span>Propositions & Reasoning ({props.length})</span>
                </div>
              </div>

              {openSections.concrete_props && (
                <div className="pl-3 pr-1 space-y-0.5">
                  {filteredProps.map(p => {
                    const isSelected = selectedItem?.type === 'proposition' && selectedItem?.id === p.id;
                    const dispColor = p.disposition === Disposition.Asserted ? 'text-emerald-400' : (p.disposition === Disposition.Rejected ? 'text-rose-400' : 'text-amber-400');
                    return (
                      <div
                        key={p.id}
                        id={`nav-prop-${p.id}`}
                        onClick={() => selectById('proposition', p.id)}
                        onContextMenu={(e) => handleItemContextMenu(e, 'proposition', p.id, p, p.provenance || (p.disposition === Disposition.Asserted ? 'asserted' : 'inferred'))}
                        className={`px-1.5 py-1 rounded flex items-center justify-between text-[11px] cursor-pointer ${
                          isSelected ? 'bg-emerald-500/20 text-emerald-200 font-bold' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        <span className="truncate mr-1">{p.title}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          <ProvenanceBadge provenance={p.provenance || (p.disposition === Disposition.Asserted ? 'asserted' : 'inferred')} size="2xs" />
                          <span className={`text-[9px] font-mono shrink-0 ${dispColor}`}>
                            {p.disposition}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* 3. SHRAPNEL EAV FACTS SUBSTRATE */}
        {/* ========================================================= */}
        <div className="rounded border border-amber-900/40 bg-amber-950/10 overflow-hidden">
          <div 
            onClick={() => toggleSection('shrapnel_store')}
            className="px-2 py-1.5 bg-amber-950/30 flex items-center justify-between cursor-pointer hover:bg-amber-900/40 transition-colors"
          >
            <div className="flex items-center gap-1.5 text-amber-300 font-semibold text-[11px]">
              {openSections.shrapnel_store ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>SHRAPNEL EAV SUBSTRATE</span>
            </div>
            <span className="text-[10px] px-1 rounded bg-amber-900/60 text-amber-200">
              {shrapnelObjects.length} objects
            </span>
          </div>

          {openSections.shrapnel_store && (
            <div className="p-1 space-y-0.5">
              {shrapnelObjects.map(obj => {
                const isSelected = selectedItem?.type === 'shrapnel_object' && selectedItem?.id === obj.id;
                const fieldCount = Object.keys(obj.values || {}).length;
                return (
                  <div
                    key={obj.id}
                    id={`nav-shrapnel-${obj.id}`}
                    onClick={() => selectById('shrapnel_object', obj.id)}
                    onContextMenu={(e) => handleItemContextMenu(e, 'shrapnel_object', obj.id, obj, obj.provenance || 'eav')}
                    className={`px-2 py-1 rounded flex items-center justify-between cursor-pointer transition-colors ${
                      isSelected 
                        ? 'bg-amber-600/30 text-amber-200 border border-amber-500/50 font-bold'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate mr-1">
                      <span className="text-amber-400 font-bold">obj#{obj.id}</span>
                      <span className="text-[10px] text-[var(--text-muted)] truncate">({fieldCount} typed slots)</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <ProvenanceBadge provenance={obj.provenance || 'eav'} size="2xs" />
                      <span className="text-[8.5px] text-amber-300 font-mono">POLY</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* 4. PROJECTIONS & INBOUND REPS */}
        {/* ========================================================= */}
        <div className="rounded border border-rose-900/40 bg-rose-950/10 overflow-hidden">
          <div 
            onClick={() => toggleSection('projections')}
            className="px-2 py-1.5 bg-rose-950/30 flex items-center justify-between cursor-pointer hover:bg-rose-900/40 transition-colors"
          >
            <div className="flex items-center gap-1.5 text-rose-300 font-semibold text-[11px]">
              {openSections.projections ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              <Code className="w-3.5 h-3.5 text-rose-400" />
              <span>PROJECTIONS & SOURCES</span>
            </div>
            <span className="text-[10px] px-1 rounded bg-rose-900/60 text-rose-200">
              4 formats
            </span>
          </div>

          {openSections.projections && (
            <div className="p-1 space-y-1 text-[11px] text-[var(--text-secondary)]">
              <div className="px-2 py-1 rounded hover:bg-[var(--bg-tertiary)] flex items-center justify-between">
                <span>Inbound: OWL / SHACL / SKOS</span>
                <ProvenanceBadge provenance="imported" size="2xs" />
              </div>
              <div className="px-2 py-1 rounded hover:bg-[var(--bg-tertiary)] flex items-center justify-between">
                <span>Outbound: TypeSpec (.tsp)</span>
                <ProvenanceBadge provenance="projected" size="2xs" />
              </div>
              <div className="px-2 py-1 rounded hover:bg-[var(--bg-tertiary)] flex items-center justify-between">
                <span>Outbound: CUE Lang / TLA+</span>
                <ProvenanceBadge provenance="projected" size="2xs" />
              </div>
              <div className="px-2 py-1 rounded hover:bg-[var(--bg-tertiary)] flex items-center justify-between">
                <span>Outbound: JSON-LD Context</span>
                <ProvenanceBadge provenance="projected" size="2xs" />
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Navigator Bottom Actions */}
      <div className="p-1.5 border-t border-[var(--border-subtle)] bg-[var(--bg-tertiary)] flex items-center justify-between shrink-0 text-[10px]">
        <button
          id="nav-quick-repl-eval"
          onClick={() => sendToRepl('evaluate("prop-host01-prod-compute")', true)}
          className="px-2 py-1 rounded bg-sky-950 text-sky-300 border border-sky-800/60 hover:bg-sky-900 transition-colors flex items-center gap-1"
        >
          <span>Run Evaluator</span>
        </button>
        <button
          id="nav-mode-toggle"
          onClick={() => setGraphMode(graphMode === 'semantic' ? 'concrete' : 'semantic')}
          className="px-2 py-1 rounded bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] transition-colors"
        >
          Mode: <span className="font-bold text-sky-400">{graphMode}</span>
        </button>
      </div>

      {/* Context-aware Right-Click Menu for Ontology Elements */}
      <OntologyContextMenu
        menu={contextMenu}
        onClose={() => setContextMenu(null)}
      />
    </aside>
  );
};
