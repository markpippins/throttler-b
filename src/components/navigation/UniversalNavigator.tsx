import React, { useState, useMemo } from 'react';
import {
  Folder,
  File,
  Database,
  Shield,
  Layers,
  Search,
  ChevronRight,
  ChevronDown,
  Sparkles,
  GitBranch,
  Box,
  Eye,
} from 'lucide-react';
import { globalInteractionContextStore } from '../../surface/core/interactionContextStore';

export type NavigatorLens = 'vfs' | 'sol' | 'aegis' | 'shrapnel' | 'uml';

export interface NavigationItem {
  id: string;
  name: string;
  type: string;
  lens: NavigatorLens;
  icon?: string;
  children?: NavigationItem[];
  badge?: string;
  isAdmitted?: boolean;
}

const DEFAULT_TREE_DATA: Record<NavigatorLens, NavigationItem[]> = {
  vfs: [
    {
      id: 'vfs-root',
      name: 'root',
      type: 'directory',
      lens: 'vfs',
      children: [
        {
          id: 'vfs-src',
          name: 'src',
          type: 'directory',
          lens: 'vfs',
          children: [
            { id: 'vfs-app', name: 'App.tsx', type: 'file', lens: 'vfs' },
            { id: 'vfs-surface', name: 'surface/', type: 'directory', lens: 'vfs' },
            { id: 'vfs-governance', name: 'governance/', type: 'directory', lens: 'vfs' },
          ],
        },
        {
          id: 'vfs-docs',
          name: 'docs',
          type: 'directory',
          lens: 'vfs',
          children: [
            { id: 'vfs-arch', name: 'UNIFIED_TOOLSPACE_ARCHITECTURE_PLAN.md', type: 'file', lens: 'vfs' },
          ],
        },
      ],
    },
  ],
  sol: [
    {
      id: 'sol-root',
      name: 'SOL Workspace Ontology',
      type: 'ontology',
      lens: 'sol',
      children: [
        {
          id: 'sol-c-item',
          name: 'Concept: FileItem',
          type: 'concept',
          lens: 'sol',
          badge: 'Axiom',
          children: [
            { id: 'sol-s-name', name: 'Slot: name (string)', type: 'slot', lens: 'sol' },
            { id: 'sol-s-path', name: 'Slot: path (array)', type: 'slot', lens: 'sol' },
          ],
        },
        {
          id: 'sol-c-dir',
          name: 'Concept: GovernedDirector',
          type: 'concept',
          lens: 'sol',
          badge: 'Authority',
        },
        {
          id: 'sol-inv-rename',
          name: 'Invariant: RenameNoOverlap',
          type: 'invariant',
          lens: 'sol',
          badge: 'CheckGuard',
        },
      ],
    },
  ],
  aegis: [
    {
      id: 'aegis-root',
      name: 'Aegis State Machine & TLA+ Protocol',
      type: 'statemachine',
      lens: 'aegis',
      children: [
        {
          id: 'aegis-states-cat',
          name: 'State Set (ValidStates)',
          type: 'category',
          lens: 'aegis',
          children: [
            { id: 's_uncommitted', name: 'State: uncommitted', type: 'state', lens: 'aegis', badge: 'Initial' },
            { id: 's_evaluating', name: 'State: evaluating_guards', type: 'state', lens: 'aegis', badge: 'Evaluating' },
            { id: 's_admitted', name: 'State: peb_admitted', type: 'state', lens: 'aegis', badge: 'Admitted' },
            { id: 's_committed', name: 'State: committed', type: 'state', lens: 'aegis', badge: 'Terminal' },
          ],
        },
        {
          id: 'aegis-trans-cat',
          name: 'Actions / Transitions ([Next]_vars)',
          type: 'category',
          lens: 'aegis',
          children: [
            { id: 't_stage_rename', name: 'Action: StageMutation', type: 'transition', lens: 'aegis', badge: 'Fairness' },
            { id: 't_admit_proposal', name: 'Action: AdmitProposal', type: 'transition', lens: 'aegis', badge: 'Authority' },
            { id: 't_commit_peb', name: 'Action: CommitPeb', type: 'transition', lens: 'aegis', badge: 'Atomic' },
            { id: 't_gap_recovery', name: 'Action: GuardViolationRevert', type: 'transition', lens: 'aegis', badge: 'Gap' },
          ],
        },
        {
          id: 'aegis-inv-cat',
          name: 'TLA+ Invariants & Constitutional Rules',
          type: 'category',
          lens: 'aegis',
          children: [
            { id: 'inv_1', name: 'Inv_TypeOK: state \\in ValidStates', type: 'invariant', lens: 'aegis', badge: 'TLC-OK' },
            { id: 'inv_3', name: 'Inv_ConstitutionalGuards: \\A g \\in SolScript', type: 'invariant', lens: 'aegis', badge: 'TLC-OK' },
            { id: 'inv_4', name: 'Inv_SignedAuthority: ValidAdmissionReceipt', type: 'invariant', lens: 'aegis', badge: 'TLC-OK' },
            { id: 'inv_6', name: 'Inv_AtomicCommit: StorageSynced', type: 'invariant', lens: 'aegis', badge: 'TLC-OK' },
          ],
        },
        {
          id: 'aegis-tlc-cat',
          name: 'TLC Model Checker Verification',
          type: 'category',
          lens: 'aegis',
          children: [
            { id: 'tlc_explored', name: 'TLC Engine: 4,892 states (BFS depth 14)', type: 'modelcheck', lens: 'aegis', badge: 'PASSED' },
            { id: 'tlc_deadlock', name: 'TLC Property: Deadlock-Free', type: 'modelcheck', lens: 'aegis', badge: 'SATISFIED' },
            { id: 'tlc_liveness', name: 'TLC Property: Liveness <>[](committed)', type: 'modelcheck', lens: 'aegis', badge: 'WF_vars' },
          ],
        },
      ],
    },
  ],
  shrapnel: [
    {
      id: 'shrapnel-root',
      name: 'Shrapnel EAV Entity Registry',
      type: 'registry',
      lens: 'shrapnel',
      children: [
        { id: 'shp-e-01', name: 'Entity: FileNode#42', type: 'entity', lens: 'shrapnel', badge: 'EAV' },
        { id: 'shp-e-02', name: 'Entity: GovernedProposal#108', type: 'entity', lens: 'shrapnel', badge: 'Envelope' },
        { id: 'shp-e-03', name: 'Entity: AdmissionReceipt#88', type: 'entity', lens: 'shrapnel', badge: 'Cryptographic' },
      ],
    },
  ],
  uml: [],
};

export interface UniversalNavigatorProps {
  activeLens?: NavigatorLens;
  onLensChange?: (lens: NavigatorLens) => void;
  selectedId?: string;
  onSelect?: (item: NavigationItem) => void;
  className?: string;
}

export const UniversalNavigator: React.FC<UniversalNavigatorProps> = ({
  activeLens = 'vfs',
  onLensChange,
  selectedId,
  onSelect,
  className = '',
}) => {
  const [lens, setLens] = useState<NavigatorLens>(activeLens);
  const [search, setSearch] = useState<string>('');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(
    new Set(['vfs-root', 'vfs-src', 'sol-root', 'aegis-root', 'shrapnel-root', 'uml-root'])
  );

  const currentLens = onLensChange ? activeLens : lens;

  const handleTabSwitch = (newLens: NavigatorLens) => {
    if (onLensChange) {
      onLensChange(newLens);
    } else {
      setLens(newLens);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleItemClick = (item: NavigationItem) => {
    // Ephemeral Category-A selection: update context store and notify
    globalInteractionContextStore.onSelect(item.id);
    onSelect?.(item);
  };

  const filteredItems = useMemo(() => {
    const raw = DEFAULT_TREE_DATA[currentLens];
    if (!search.trim()) return raw;

    const query = search.toLowerCase();
    const filterRec = (items: NavigationItem[]): NavigationItem[] => {
      return items
        .map((item) => {
          const matches = item.name.toLowerCase().includes(query);
          const childMatches = item.children ? filterRec(item.children) : [];
          if (matches || childMatches.length > 0) {
            return {
              ...item,
              children: childMatches.length > 0 ? childMatches : item.children,
            };
          }
          return null;
        })
        .filter(Boolean) as NavigationItem[];
    };
    return filterRec(raw);
  }, [currentLens, search]);

  const renderTree = (items: NavigationItem[]) => {
    return (
      <div className="space-y-0.5">
        {items.map((item) => {
          const isExpanded = expandedNodes.has(item.id);
          const hasChildren = item.children && item.children.length > 0;
          const isSelected = selectedId === item.id;

          return (
            <div key={item.id} className="select-none">
              <div
                onClick={() => handleItemClick(item)}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-emerald-950/60 text-emerald-300 font-semibold border border-emerald-500/40'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-slate-100'
                }`}
              >
                {hasChildren ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleExpand(item.id);
                    }}
                    className="p-0.5 text-slate-500 hover:text-slate-300 rounded"
                  >
                    {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  </button>
                ) : (
                  <span className="w-4" />
                )}

                {/* Node Icon */}
                {item.type === 'directory' || item.type === 'ontology' ? (
                  <Folder className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                ) : item.type === 'concept' || item.type === 'state' ? (
                  <Box className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                ) : item.type === 'invariant' || item.type === 'statemachine' ? (
                  <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : item.type === 'class' ? (
                  <Layers className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                ) : (
                  <File className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                )}

                <span className="truncate flex-1 font-mono">{item.name}</span>

                {item.badge && (
                  <span className="text-[9px] font-mono font-medium px-1 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                    {item.badge}
                  </span>
                )}
              </div>

              {/* Sub-tree recursion */}
              {hasChildren && isExpanded && (
                <div className="pl-3.5 border-l border-slate-800/80 ml-2 mt-0.5">
                  {renderTree(item.children!)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className={`flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden ${className}`}>
      {/* Header Tabs: Multimodal Lenses */}
      <div className="p-2 bg-slate-950/80 border-b border-slate-800 flex items-center gap-1 overflow-x-auto">
        <button
          onClick={() => handleTabSwitch('vfs')}
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
            currentLens === 'vfs'
              ? 'bg-emerald-600 text-white shadow'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Folder className="w-3.5 h-3.5" />
          VFS
        </button>
        <button
          onClick={() => handleTabSwitch('sol')}
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
            currentLens === 'sol'
              ? 'bg-emerald-600 text-white shadow'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          SOL
        </button>
        <button
          onClick={() => handleTabSwitch('aegis')}
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
            currentLens === 'aegis'
              ? 'bg-emerald-600 text-white shadow'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Shield className="w-3.5 h-3.5 text-emerald-400" />
          Aegis (TLA+)
        </button>
        <button
          onClick={() => handleTabSwitch('shrapnel')}
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
            currentLens === 'shrapnel'
              ? 'bg-emerald-600 text-white shadow'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          Shrapnel
        </button>
      </div>

      {/* Filter / Search input */}
      <div className="p-2 border-b border-slate-800 bg-slate-950/40">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Filter ${currentLens.toUpperCase()} items...`}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Navigation Tree Content */}
      <div className="p-2 overflow-y-auto flex-1 max-h-[500px]">
        {filteredItems.length > 0 ? (
          renderTree(filteredItems)
        ) : (
          <div className="text-center py-6 text-xs text-slate-500 font-mono">
            No matching items found
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="p-2 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[10px] font-mono text-slate-500">
        <span>Lens: {currentLens.toUpperCase()}</span>
        <span>Category A Gesture</span>
      </div>
    </div>
  );
};
