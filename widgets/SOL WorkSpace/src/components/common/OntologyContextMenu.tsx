import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Boxes,
  Database,
  ShieldAlert,
  Sparkles,
  Flame,
  Sliders,
  Network,
  Layers,
  Globe,
  FileCode2,
  Terminal,
  Copy,
  Check,
  Play,
  ArrowRight,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  PlusCircle,
  Activity,
  Maximize2
} from 'lucide-react';
import { useWorkbench } from '../../context/WorkbenchContext';
import { solEngine } from '../../engine/solEngine';
import { ProvenanceBadge } from './ProvenanceBadge';
import { 
  Concept, 
  Entity, 
  Rule, 
  Proposition, 
  FrameDimension, 
  ShrapnelObjectInstance, 
  ProvenanceType, 
  GraphNode 
} from '../../types/sol';

export type ContextMenuTargetType = 
  | 'concept' 
  | 'entity' 
  | 'rule' 
  | 'proposition' 
  | 'shrapnel_object' 
  | 'frame' 
  | 'canvas';

export interface ContextMenuState {
  x: number;
  y: number;
  type: ContextMenuTargetType;
  id?: string | number;
  data?: any;
  provenance?: ProvenanceType;
  meta?: {
    graphMode?: 'semantic' | 'concrete';
    isPhysicsRunning?: boolean;
    filterViolationOnly?: boolean;
  };
}

interface OntologyContextMenuProps {
  menu: ContextMenuState | null;
  onClose: () => void;
  // Optional custom actions passed from caller (like canvas reset/pause in GraphEditor)
  customCanvasActions?: {
    onResetZoom?: () => void;
    onTogglePhysics?: () => void;
    onToggleViolations?: () => void;
  };
}

export const OntologyContextMenu: React.FC<OntologyContextMenuProps> = ({
  menu,
  onClose,
  customCanvasActions
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const {
    selectById,
    selectItem,
    setActiveWorkspaceTab,
    setActiveActivityTab,
    setGraphMode,
    graphMode,
    runEvaluation,
    sendToRepl,
    openGroundingModal,
    updateFrameContext,
    frameContext,
    refreshEngine
  } = useWorkbench();

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    if (!menu) return;

    const handlePointerDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [menu, onClose]);

  if (!menu) return null;

  // Smart viewport coordinate clamping
  const menuWidth = 260;
  const menuHeightEstimate = 320;
  const clampedX = Math.max(8, Math.min(menu.x, window.innerWidth - menuWidth - 8));
  const clampedY = Math.max(8, Math.min(menu.y, window.innerHeight - menuHeightEstimate - 8));

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => {
      setCopiedField(null);
      onClose();
    }, 600);
  };

  // Quick Action Handlers
  const handleViewInGraph = (mode: 'semantic' | 'concrete', id?: string | number, type?: any) => {
    setGraphMode(mode);
    setActiveWorkspaceTab('graph');
    if (id && type) {
      selectById(type, id);
    }
    onClose();
  };

  const handleOpenEditor = (conceptId?: string | number) => {
    setActiveWorkspaceTab('editor');
    if (conceptId) {
      selectById('concept', conceptId);
    }
    onClose();
  };

  const handleOpenProjections = () => {
    setActiveWorkspaceTab('projections');
    onClose();
  };

  const handleGroundWeb = (query: string) => {
    openGroundingModal(query);
    onClose();
  };

  const handleEvaluate = (propId: string) => {
    runEvaluation(propId, frameContext);
    setActiveActivityTab('evaluator');
    onClose();
  };

  const handleTraceInference = (entityId?: string) => {
    if (entityId) {
      sendToRepl(`reason("${entityId}", ${JSON.stringify(frameContext)})`, true);
    }
    setActiveActivityTab('inference_trace');
    onClose();
  };

  const handleInstantiateFact = (concept: Concept) => {
    const newId = `ent-${concept.id.replace('concept-', '')}-${Date.now().toString().slice(-4)}`;
    const newEntity: Entity = {
      id: newId,
      external_id: `${concept.name.toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
      concept_id: concept.id,
      concept_name: concept.name,
      attributes: {
        ...Object.fromEntries(
          Object.values(concept.attributes).map(attr => [
            attr.name,
            (attr.value_type === 'integer' || attr.value_type === 'float') ? 16 : (attr.value_type === 'boolean' ? true : 'ACTIVE')
          ])
        )
      },
      provenance: 'concrete',
      created_at: new Date().toISOString()
    };
    solEngine.entities.push(newEntity);
    refreshEngine();
    selectById('entity', newId);
    setGraphMode('concrete');
    setActiveWorkspaceTab('graph');
    onClose();
  };

  return createPortal(
    <div
      ref={menuRef}
      id="ontology-context-menu"
      style={{
        position: 'fixed',
        left: `${clampedX}px`,
        top: `${clampedY}px`,
        zIndex: 9999
      }}
      className="w-64 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-strong)] shadow-2xl overflow-hidden font-sans text-xs select-none animate-in fade-in zoom-in-95 duration-100 ring-1 ring-black/40"
      onClick={e => e.stopPropagation()}
      onContextMenu={e => e.preventDefault()}
    >
      {/* Menu Header: Element Identity & Provenance */}
      <div className="px-3 py-2 bg-[var(--bg-tertiary)] border-b border-[var(--border-subtle)] flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 truncate">
          {menu.type === 'concept' && <Boxes className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
          {menu.type === 'entity' && <Database className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
          {menu.type === 'rule' && <ShieldAlert className="w-3.5 h-3.5 text-indigo-300 shrink-0" />}
          {menu.type === 'proposition' && <Sparkles className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
          {menu.type === 'shrapnel_object' && <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
          {menu.type === 'frame' && <Sliders className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
          {menu.type === 'canvas' && <Network className="w-3.5 h-3.5 text-sky-400 shrink-0" />}

          <div className="flex flex-col truncate">
            <span className="font-bold text-[11px] text-[var(--text-primary)] truncate">
              {menu.type === 'canvas' 
                ? 'Graph Canvas' 
                : (menu.data?.name || menu.data?.external_id || menu.data?.title || (menu.type === 'shrapnel_object' ? `EAV Object #${menu.id}` : String(menu.id)))}
            </span>
            <span className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider font-mono">
              {menu.type === 'canvas' ? `${menu.meta?.graphMode || graphMode} view` : menu.type.replace('_', ' ')}
            </span>
          </div>
        </div>

        {menu.provenance && (
          <ProvenanceBadge provenance={menu.provenance} size="2xs" />
        )}
      </div>

      {/* Menu Action Groups */}
      <div className="p-1 space-y-0.5 max-h-[70vh] overflow-y-auto">
        
        {/* ========================================================= */}
        {/* 1. CONCEPT ACTIONS */}
        {/* ========================================================= */}
        {menu.type === 'concept' && (
          <>
            <button
              id="ctx-action-concept-graph"
              onClick={() => handleViewInGraph('semantic', menu.id, 'concept')}
              className="w-full px-2 py-1.5 rounded flex items-center justify-between text-left text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Network className="w-3.5 h-3.5 text-indigo-400" />
                <span>Locate in Semantic Graph</span>
              </div>
              <span className="text-[9px] font-mono text-[var(--text-muted)]">Graph</span>
            </button>

            <button
              id="ctx-action-concept-editor"
              onClick={() => handleOpenEditor(menu.id)}
              className="w-full px-2 py-1.5 rounded flex items-center justify-between text-left text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-indigo-300" />
                <span>Open in Structured Editor</span>
              </div>
              <span className="text-[9px] font-mono text-[var(--text-muted)]">Editor</span>
            </button>

            <button
              id="ctx-action-concept-ground"
              onClick={() => handleGroundWeb(menu.data?.name || 'schema.org/ComputerServer')}
              className="w-full px-2 py-1.5 rounded flex items-center justify-between text-left text-sky-300 hover:text-sky-200 hover:bg-sky-950/60 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-sky-400" />
                <span>Ground with Live Web Specs</span>
              </div>
              <Sparkles className="w-2.5 h-2.5 text-sky-400" />
            </button>

            <button
              id="ctx-action-concept-projections"
              onClick={handleOpenProjections}
              className="w-full px-2 py-1.5 rounded flex items-center justify-between text-left text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <FileCode2 className="w-3.5 h-3.5 text-rose-400" />
                <span>Inspect TypeSpec / CUE Projections</span>
              </div>
              <span className="text-[9px] font-mono text-rose-400">TSP</span>
            </button>

            <button
              id="ctx-action-concept-instances"
              onClick={() => handleViewInGraph('concrete')}
              className="w-full px-2 py-1.5 rounded flex items-center justify-between text-left text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                <span>Show Concrete Instances</span>
              </div>
              <span className="text-[9px] font-mono text-emerald-400">Facts</span>
            </button>

            <button
              id="ctx-action-concept-instantiate"
              onClick={() => handleInstantiateFact(menu.data as Concept)}
              className="w-full px-2 py-1.5 rounded flex items-center justify-between text-left text-emerald-300 hover:text-emerald-200 hover:bg-emerald-950/60 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>Instantiate New Concrete Fact</span>
              </div>
              <span className="text-[9px] font-mono text-emerald-400">+Fact</span>
            </button>

            <div className="my-1 border-t border-[var(--border-subtle)]" />

            <button
              id="ctx-action-concept-repl"
              onClick={() => {
                sendToRepl(`describe("${menu.id}")`, true);
                onClose();
              }}
              className="w-full px-2 py-1.5 rounded flex items-center justify-between text-left text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer font-mono"
            >
              <div className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-amber-400" />
                <span>describe(&quot;{menu.id}&quot;)</span>
              </div>
              <span className="text-[9px] text-[var(--text-muted)]">REPL</span>
            </button>

            <button
              id="ctx-action-copy-concept-id"
              onClick={() => copyToClipboard(String(menu.id), 'id')}
              className="w-full px-2 py-1.5 rounded flex items-center justify-between text-left text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                {copiedField === 'id' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[var(--text-muted)]" />}
                <span>{copiedField === 'id' ? 'Copied Concept ID!' : 'Copy Concept ID'}</span>
              </div>
              <span className="text-[9px] font-mono text-[var(--text-muted)] truncate max-w-[80px]">{String(menu.id)}</span>
            </button>
          </>
        )}

        {/* ========================================================= */}
        {/* 2. ENTITY ACTIONS */}
        {/* ========================================================= */}
        {menu.type === 'entity' && (
          <>
            <button
              id="ctx-action-entity-eval"
              onClick={() => {
                const prop = solEngine.propositions.find(p => p.subject_entity_id === menu.id) || solEngine.propositions[0];
                if (prop) {
                  handleEvaluate(prop.id);
                }
              }}
              className="w-full px-2 py-1.5 rounded flex items-center justify-between text-left text-emerald-300 hover:text-emerald-200 hover:bg-emerald-950/60 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Play className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-semibold">Evaluate Invariants</span>
              </div>
              <span className="text-[9px] font-mono text-emerald-400">Eval</span>
            </button>

            <button
              id="ctx-action-entity-reason"
              onClick={() => handleTraceInference(String(menu.id))}
              className="w-full px-2 py-1.5 rounded flex items-center justify-between text-left text-sky-300 hover:text-sky-200 hover:bg-sky-950/60 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-sky-400" />
                <span>Explain Inference Trail</span>
              </div>
              <span className="text-[9px] font-mono text-sky-400">Trace</span>
            </button>

            <button
              id="ctx-action-entity-graph"
              onClick={() => handleViewInGraph('concrete', menu.id, 'entity')}
              className="w-full px-2 py-1.5 rounded flex items-center justify-between text-left text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Network className="w-3.5 h-3.5 text-emerald-400" />
                <span>Locate in Knowledge Graph</span>
              </div>
              <span className="text-[9px] font-mono text-[var(--text-muted)]">Graph</span>
            </button>

            <button
              id="ctx-action-entity-parent"
              onClick={() => {
                if (menu.data?.concept_id) {
                  selectById('concept', menu.data.concept_id);
                  setActiveWorkspaceTab('editor');
                }
                onClose();
              }}
              className="w-full px-2 py-1.5 rounded flex items-center justify-between text-left text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Boxes className="w-3.5 h-3.5 text-indigo-400" />
                <span>View Concept Schema</span>
              </div>
              <span className="text-[9px] font-mono text-indigo-400 truncate max-w-[70px]">{menu.data?.concept_name}</span>
            </button>

            {menu.data?.shrapnel_object_id && (
              <button
                id="ctx-action-entity-shrapnel"
                onClick={() => {
                  selectById('shrapnel_object', menu.data.shrapnel_object_id);
                  setActiveActivityTab('shrapnel_eav');
                  onClose();
                }}
                className="w-full px-2 py-1.5 rounded flex items-center justify-between text-left text-amber-300 hover:text-amber-200 hover:bg-amber-950/60 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  <span>Inspect Linked EAV Object #{menu.data.shrapnel_object_id}</span>
                </div>
                <span className="text-[9px] font-mono text-amber-400">EAV</span>
              </button>
            )}

            <div className="my-1 border-t border-[var(--border-subtle)]" />

            <button
              id="ctx-action-entity-repl"
              onClick={() => {
                sendToRepl(`check("${menu.id}", {"environment":"prod"})`, true);
                onClose();
              }}
              className="w-full px-2 py-1.5 rounded flex items-center justify-between text-left text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer font-mono"
            >
              <div className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-amber-400" />
                <span>check(&quot;{menu.id}&quot;)</span>
              </div>
              <span className="text-[9px] text-[var(--text-muted)]">REPL</span>
            </button>

            <button
              id="ctx-action-copy-entity-handle"
              onClick={() => copyToClipboard(menu.data?.external_id || String(menu.id), 'handle')}
              className="w-full px-2 py-1.5 rounded flex items-center justify-between text-left text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                {copiedField === 'handle' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[var(--text-muted)]" />}
                <span>{copiedField === 'handle' ? 'Copied Handle!' : 'Copy Handle'}</span>
              </div>
              <span className="text-[9px] font-mono text-[var(--text-muted)] truncate max-w-[80px]">{menu.data?.external_id}</span>
            </button>
          </>
        )}

        {/* ========================================================= */}
        {/* 3. RULE / INVARIANT ACTIONS */}
        {/* ========================================================= */}
        {menu.type === 'rule' && (
          <>
            <button
              id="ctx-action-rule-violations"
              onClick={() => {
                setActiveActivityTab('violations');
                onClose();
              }}
              className="w-full px-2 py-1.5 rounded flex items-center justify-between text-left text-rose-300 hover:text-rose-200 hover:bg-rose-950/60 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span>Inspect Active Invariant Violations</span>
              </div>
              <span className="text-[9px] font-mono text-rose-400">Violations</span>
            </button>

            <button
              id="ctx-action-rule-editor"
              onClick={() => {
                const concept = Object.values(solEngine.concepts).find(c => (c.invariants || []).some(inv => inv.id === menu.id));
                if (concept) {
                  selectById('concept', concept.id);
                  setActiveWorkspaceTab('editor');
                }
                onClose();
              }}
              className="w-full px-2 py-1.5 rounded flex items-center justify-between text-left text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                <span>View In Concept Definition</span>
              </div>
              <span className="text-[9px] font-mono text-indigo-400">Schema</span>
            </button>

            <button
              id="ctx-action-rule-repl"
              onClick={() => {
                const expr = menu.data?.expression?.raw_code || menu.data?.name || '';
                sendToRepl(`// Invariant: ${menu.data?.name}\n${expr}`);
                onClose();
              }}
              className="w-full px-2 py-1.5 rounded flex items-center justify-between text-left text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer font-mono"
            >
              <div className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-amber-400" />
                <span>Test Invariant in REPL</span>
              </div>
              <span className="text-[9px] text-[var(--text-muted)]">Draft</span>
            </button>

            <div className="my-1 border-t border-[var(--border-subtle)]" />

            <button
              id="ctx-action-copy-rule-expr"
              onClick={() => copyToClipboard(menu.data?.expression?.raw_code || String(menu.id), 'expr')}
              className="w-full px-2 py-1.5 rounded flex items-center justify-between text-left text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                {copiedField === 'expr' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[var(--text-muted)]" />}
                <span>{copiedField === 'expr' ? 'Copied Expression!' : 'Copy Rule Expression'}</span>
              </div>
              <span className="text-[9px] font-mono text-[var(--text-muted)]">Code</span>
            </button>
          </>
        )}

        {/* ========================================================= */}
        {/* 4. PROPOSITION ACTIONS */}
        {/* ========================================================= */}
        {menu.type === 'proposition' && (
          <>
            <button
              id="ctx-action-prop-eval"
              onClick={() => handleEvaluate(String(menu.id))}
              className="w-full px-2 py-1.5 rounded flex items-center justify-between text-left text-blue-300 hover:text-blue-200 hover:bg-blue-950/60 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Play className="w-3.5 h-3.5 text-blue-400" />
                <span className="font-semibold">Re-Evaluate Proposition</span>
              </div>
              <span className="text-[9px] font-mono text-blue-400">Run</span>
            </button>

            <button
              id="ctx-action-prop-trace"
              onClick={() => {
                setActiveActivityTab('inference_trace');
                onClose();
              }}
              className="w-full px-2 py-1.5 rounded flex items-center justify-between text-left text-sky-300 hover:text-sky-200 hover:bg-sky-950/60 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-sky-400" />
                <span>Inspect Reasoning Trace</span>
              </div>
              <span className="text-[9px] font-mono text-sky-400">Trace</span>
            </button>

            {menu.data?.subject_entity_id && (
              <button
                id="ctx-action-prop-subject"
                onClick={() => {
                  selectById('entity', menu.data.subject_entity_id);
                  handleViewInGraph('concrete', menu.data.subject_entity_id, 'entity');
                }}
                className="w-full px-2 py-1.5 rounded flex items-center justify-between text-left text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Database className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Locate Subject Entity</span>
                </div>
                <span className="text-[9px] font-mono text-emerald-400 truncate max-w-[70px]">{menu.data.subject_entity_id}</span>
              </button>
            )}

            <div className="my-1 border-t border-[var(--border-subtle)]" />

            <button
              id="ctx-action-prop-repl"
              onClick={() => {
                sendToRepl(`evaluate("${menu.id}", ${JSON.stringify(frameContext)})`, true);
                onClose();
              }}
              className="w-full px-2 py-1.5 rounded flex items-center justify-between text-left text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer font-mono"
            >
              <div className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-amber-400" />
                <span>evaluate(&quot;{menu.id}&quot;)</span>
              </div>
              <span className="text-[9px] text-[var(--text-muted)]">REPL</span>
            </button>

            <button
              id="ctx-action-copy-prop-id"
              onClick={() => copyToClipboard(String(menu.id), 'propId')}
              className="w-full px-2 py-1.5 rounded flex items-center justify-between text-left text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                {copiedField === 'propId' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[var(--text-muted)]" />}
                <span>{copiedField === 'propId' ? 'Copied ID!' : 'Copy Proposition ID'}</span>
              </div>
              <span className="text-[9px] font-mono text-[var(--text-muted)] truncate max-w-[80px]">{String(menu.id)}</span>
            </button>
          </>
        )}

        {/* ========================================================= */}
        {/* 5. SHRAPNEL OBJECT (EAV) ACTIONS */}
        {/* ========================================================= */}
        {menu.type === 'shrapnel_object' && (
          <>
            <button
              id="ctx-action-shrapnel-tab"
              onClick={() => {
                setActiveActivityTab('shrapnel_eav');
                onClose();
              }}
              className="w-full px-2 py-1.5 rounded flex items-center justify-between text-left text-amber-300 hover:text-amber-200 hover:bg-amber-950/60 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-semibold">Inspect in EAV Substrate</span>
              </div>
              <span className="text-[9px] font-mono text-amber-400">EAV</span>
            </button>

            <button
              id="ctx-action-shrapnel-entity"
              onClick={() => {
                const entity = solEngine.entities.find(e => e.shrapnel_object_id === Number(menu.id));
                if (entity) {
                  selectById('entity', entity.id);
                  handleViewInGraph('concrete', entity.id, 'entity');
                } else {
                  onClose();
                }
              }}
              className="w-full px-2 py-1.5 rounded flex items-center justify-between text-left text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                <span>Locate Bound Fact Entity</span>
              </div>
              <span className="text-[9px] font-mono text-emerald-400">Fact</span>
            </button>

            <button
              id="ctx-action-shrapnel-repl"
              onClick={() => {
                sendToRepl(`shrapnel.get(${menu.id})`, true);
                onClose();
              }}
              className="w-full px-2 py-1.5 rounded flex items-center justify-between text-left text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer font-mono"
            >
              <div className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-amber-400" />
                <span>shrapnel.get({menu.id})</span>
              </div>
              <span className="text-[9px] text-[var(--text-muted)]">REPL</span>
            </button>

            <div className="my-1 border-t border-[var(--border-subtle)]" />

            <button
              id="ctx-action-copy-shrapnel-json"
              onClick={() => {
                const values = (menu.data as ShrapnelObjectInstance)?.values || {};
                copyToClipboard(JSON.stringify(values, null, 2), 'eavJson');
              }}
              className="w-full px-2 py-1.5 rounded flex items-center justify-between text-left text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                {copiedField === 'eavJson' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[var(--text-muted)]" />}
                <span>{copiedField === 'eavJson' ? 'Copied Slots JSON!' : 'Copy Typed Slots JSON'}</span>
              </div>
              <span className="text-[9px] font-mono text-[var(--text-muted)]">JSON</span>
            </button>
          </>
        )}

        {/* ========================================================= */}
        {/* 6. FRAME DIMENSION ACTIONS */}
        {/* ========================================================= */}
        {menu.type === 'frame' && (
          <>
            <div className="px-2 py-1 text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-mono">
              Apply Frame Value:
            </div>
            {((menu.data as FrameDimension)?.allowed_values || ['prod', 'staging', 'dev']).map(val => (
              <button
                key={val}
                onClick={() => {
                  const key = (menu.data as FrameDimension)?.dimension_key || 'environment';
                  updateFrameContext({ [key]: val });
                  onClose();
                }}
                className={`w-full px-2 py-1 rounded flex items-center justify-between text-left transition-colors cursor-pointer ${
                  (frameContext as any)[(menu.data as FrameDimension)?.dimension_key] === val
                    ? 'bg-sky-950 text-sky-300 font-bold border border-sky-800'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                }`}
              >
                <span className="font-mono">{val}</span>
                {(frameContext as any)[(menu.data as FrameDimension)?.dimension_key] === val && (
                  <CheckCircle2 className="w-3 h-3 text-sky-400" />
                )}
              </button>
            ))}

            <div className="my-1 border-t border-[var(--border-subtle)]" />

            <button
              id="ctx-action-copy-frame-key"
              onClick={() => copyToClipboard((menu.data as FrameDimension)?.dimension_key || String(menu.id), 'dimKey')}
              className="w-full px-2 py-1.5 rounded flex items-center justify-between text-left text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                {copiedField === 'dimKey' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[var(--text-muted)]" />}
                <span>{copiedField === 'dimKey' ? 'Copied Key!' : 'Copy Dimension Key'}</span>
              </div>
              <span className="text-[9px] font-mono text-[var(--text-muted)] truncate max-w-[80px]">{(menu.data as FrameDimension)?.dimension_key}</span>
            </button>
          </>
        )}

        {/* ========================================================= */}
        {/* 7. GRAPH CANVAS ACTIONS */}
        {/* ========================================================= */}
        {menu.type === 'canvas' && (
          <>
            <button
              id="ctx-action-canvas-toggle-mode"
              onClick={() => {
                setGraphMode(graphMode === 'semantic' ? 'concrete' : 'semantic');
                onClose();
              }}
              className="w-full px-2 py-1.5 rounded flex items-center justify-between text-left text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <RotateCcw className="w-3.5 h-3.5 text-sky-400" />
                <span>Switch to {graphMode === 'semantic' ? 'Concrete / Facts' : 'Semantic / Schema'}</span>
              </div>
              <span className={`text-[9px] px-1 rounded font-mono ${graphMode === 'semantic' ? 'bg-emerald-950 text-emerald-300' : 'bg-indigo-950 text-indigo-300'}`}>
                {graphMode === 'semantic' ? 'FACTS' : 'SCHEMA'}
              </span>
            </button>

            {customCanvasActions?.onTogglePhysics && (
              <button
                id="ctx-action-canvas-physics"
                onClick={() => {
                  customCanvasActions.onTogglePhysics?.();
                  onClose();
                }}
                className="w-full px-2 py-1.5 rounded flex items-center justify-between text-left text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Play className="w-3.5 h-3.5 text-sky-400" />
                  <span>{menu.meta?.isPhysicsRunning ? 'Pause Physics Simulation' : 'Resume Physics Simulation'}</span>
                </div>
                <span className="text-[9px] font-mono text-[var(--text-muted)]">Force</span>
              </button>
            )}

            {customCanvasActions?.onResetZoom && (
              <button
                id="ctx-action-canvas-reset"
                onClick={() => {
                  customCanvasActions.onResetZoom?.();
                  onClose();
                }}
                className="w-full px-2 py-1.5 rounded flex items-center justify-between text-left text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Maximize2 className="w-3.5 h-3.5 text-sky-400" />
                  <span>Reset Canvas Zoom & Center</span>
                </div>
                <span className="text-[9px] font-mono text-[var(--text-muted)]">100%</span>
              </button>
            )}

            {graphMode === 'concrete' && customCanvasActions?.onToggleViolations && (
              <button
                id="ctx-action-canvas-violations"
                onClick={() => {
                  customCanvasActions.onToggleViolations?.();
                  onClose();
                }}
                className="w-full px-2 py-1.5 rounded flex items-center justify-between text-left text-rose-300 hover:text-rose-200 hover:bg-rose-950/60 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  <span>{menu.meta?.filterViolationOnly ? 'Show All Entities' : 'Filter Violations Only'}</span>
                </div>
                <span className="text-[9px] font-mono text-rose-400">Filter</span>
              </button>
            )}

            <div className="my-1 border-t border-[var(--border-subtle)]" />

            <button
              id="ctx-action-canvas-ground"
              onClick={() => handleGroundWeb('schema.org/ComputerServer')}
              className="w-full px-2 py-1.5 rounded flex items-center justify-between text-left text-sky-300 hover:text-sky-200 hover:bg-sky-950/60 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-sky-400" />
                <span>Ground Schema from Web...</span>
              </div>
              <Sparkles className="w-2.5 h-2.5 text-sky-400" />
            </button>
          </>
        )}

      </div>

      {/* Footer hint */}
      <div className="px-3 py-1 bg-[var(--bg-tertiary)] border-t border-[var(--border-subtle)] flex items-center justify-between text-[9px] text-[var(--text-muted)] font-mono">
        <span>Click or Esc to close</span>
        <span>Right-click menu</span>
      </div>
    </div>,
    document.body
  );
};
