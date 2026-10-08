/**
 * Aegis IDE - Left Navigation Bar
 * Modern, collapsible IDE sidebar with real-time project search & filter across
 * registries, states, and transitions.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Layers,
  Play,
  ShieldCheck,
  Code2,
  Server,
  Activity,
  PanelLeftClose,
  PanelLeftOpen,
  CheckCircle2,
  AlertTriangle,
  Boxes,
  Cpu,
  Search,
  X,
  CircleDot,
  ArrowRight,
  Database,
  Edit3,
  ChevronDown,
  ChevronRight,
  FolderTree,
  Zap,
} from 'lucide-react';
import {
  NavigationTab,
  Registry,
  StateNode,
  Transition,
  ValidationResult,
  ModelCheckResult,
} from '../types';

interface LeftNavProps {
  activeTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  activeRegistry: Registry | null;
  registries?: Registry[];
  states?: StateNode[];
  transitions?: Transition[];
  onSelectRegistry?: (id: string) => void;
  onSelectState?: (state: StateNode) => void;
  onSelectTransition?: (transition: Transition) => void;
  onEditState?: (state: StateNode) => void;
  onEditTransition?: (transition: Transition) => void;
  stateCount?: number;
  transitionCount?: number;
  logCount?: number;
  simStepsCount?: number;
  lastValidation?: ValidationResult | null;
  lastModelCheck?: ModelCheckResult | null;
}

interface NavItemConfig {
  id: NavigationTab;
  label: string;
  shortLabel: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  section: 'studio' | 'operations';
  getBadge?: () => { text: string; color: 'blue' | 'green' | 'amber' | 'neutral' } | null;
}

type SearchCategory = 'all' | 'states' | 'transitions' | 'registries';

export const LeftNav: React.FC<LeftNavProps> = ({
  activeTab,
  onSelectTab,
  activeRegistry,
  registries = [],
  states = [],
  transitions = [],
  onSelectRegistry,
  onSelectState,
  onSelectTransition,
  onEditState,
  onEditTransition,
  stateCount = states.length,
  transitionCount = transitions.length,
  logCount = 0,
  simStepsCount = 0,
  lastValidation,
  lastModelCheck,
}) => {
  // Collapsed state persisted in localStorage
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('aegis_leftnav_collapsed');
      return saved === 'true';
    } catch {
      return false;
    }
  });

  // Search query & category filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchCategory, setSearchCategory] = useState<SearchCategory>('all');
  const [isOutlineExpanded, setIsOutlineExpanded] = useState<boolean>(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem('aegis_leftnav_collapsed', String(isCollapsed));
    } catch {
      // Ignore
    }
  }, [isCollapsed]);

  // Global keyboard shortcut (Ctrl+K, Cmd+K, or '/') to focus LeftNav search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || (activeEl as HTMLElement).isContentEditable)
      ) {
        return;
      }

      if ((e.key === '/' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) && !e.shiftKey) {
        e.preventDefault();
        if (isCollapsed) {
          setIsCollapsed(false);
        }
        setTimeout(() => {
          searchInputRef.current?.focus();
          searchInputRef.current?.select();
        }, 60);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCollapsed]);

  // Real-time filtering computations
  const q = searchQuery.trim().toLowerCase();
  const isSearching = q.length > 0;

  // Filtered registries
  const matchingRegistries = useMemo(() => {
    const pool = registries.length > 0 ? registries : activeRegistry ? [activeRegistry] : [];
    if (!q) return pool;
    return pool.filter((r) => {
      const nameMatch = r.name.toLowerCase().includes(q);
      const descMatch = r.description?.toLowerCase().includes(q);
      const versionMatch = r.version?.toLowerCase().includes(q);
      const tagMatch = r.tags?.some((t) => t.toLowerCase().includes(q));
      const activeMatch = (q === 'active' || q === 'current') && r.is_active;
      return nameMatch || descMatch || versionMatch || tagMatch || activeMatch;
    });
  }, [registries, activeRegistry, q]);

  // Filtered states
  const matchingStates = useMemo(() => {
    if (!states || states.length === 0) return [];
    if (!q) return states;
    return states.filter((s) => {
      const nameMatch = s.name.toLowerCase().includes(q);
      const descMatch = s.description?.toLowerCase().includes(q);
      const initialMatch = (q === 'initial' || q === 'start') && s.is_initial;
      const terminalMatch = (q === 'terminal' || q === 'end' || q === 'final') && s.is_terminal;
      const constraintMatch = s.constraints?.toLowerCase().includes(q);
      const varMatch = Object.keys(s.variable_assignments || {}).some((k) =>
        k.toLowerCase().includes(q)
      );
      return nameMatch || descMatch || initialMatch || terminalMatch || constraintMatch || varMatch;
    });
  }, [states, q]);

  // Filtered transitions
  const matchingTransitions = useMemo(() => {
    if (!transitions || transitions.length === 0) return [];
    if (!q) return transitions;
    return transitions.filter((t) => {
      const fromName = states.find((s) => s.id === t.from_state_id)?.name || '';
      const toName = states.find((s) => s.id === t.to_state_id)?.name || '';
      const nameMatch = t.name.toLowerCase().includes(q);
      const triggerMatch = t.trigger?.toLowerCase().includes(q);
      const triggersMatch = t.triggers?.some((tr) => tr.toLowerCase().includes(q));
      const fromMatch = fromName.toLowerCase().includes(q);
      const toMatch = toName.toLowerCase().includes(q);
      const guardMatch =
        t.guard_expression?.toLowerCase().includes(q) || (q === 'guard' && Boolean(t.guard_expression));
      const descMatch = t.description?.toLowerCase().includes(q);
      return nameMatch || triggerMatch || triggersMatch || fromMatch || toMatch || guardMatch || descMatch;
    });
  }, [transitions, states, q]);

  const totalMatches = matchingRegistries.length + matchingStates.length + matchingTransitions.length;

  // Text highlighter helper
  const highlightMatch = (text: string, search: string) => {
    if (!search || !text) return text;
    const idx = text.toLowerCase().indexOf(search);
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <span className="bg-[#3B82F6]/30 text-[#79b8ff] font-semibold rounded-xs px-0.5">
          {text.slice(idx, idx + search.length)}
        </span>
        {text.slice(idx + search.length)}
      </>
    );
  };

  const navItems: NavItemConfig[] = [
    {
      id: 'canvas',
      label: 'Visual Canvas',
      shortLabel: 'Canvas',
      subtitle: 'State Graph & Layout',
      icon: Layers,
      section: 'studio',
      getBadge: () => ({
        text: `${stateCount} states`,
        color: 'neutral',
      }),
    },
    {
      id: 'simulator',
      label: 'Interactive Simulator',
      shortLabel: 'Simulator',
      subtitle: 'Stepwise Trace Engine',
      icon: Play,
      section: 'studio',
      getBadge: () =>
        simStepsCount > 0
          ? { text: `${simStepsCount} step${simStepsCount === 1 ? '' : 's'}`, color: 'blue' }
          : null,
    },
    {
      id: 'model-check',
      label: 'TLC Verification',
      shortLabel: 'TLC Verifier',
      subtitle: 'Formal Safety & Invariants',
      icon: ShieldCheck,
      section: 'studio',
      getBadge: () => {
        if (!lastModelCheck && !lastValidation) return null;
        if (lastModelCheck?.status === 'pass' || (lastValidation?.is_valid && !lastModelCheck)) {
          return { text: 'Passing', color: 'green' };
        }
        if (lastModelCheck?.status === 'fail' || lastValidation?.is_valid === false) {
          return { text: 'Issues', color: 'amber' };
        }
        return null;
      },
    },
    {
      id: 'tla',
      label: 'TLA+ Studio',
      shortLabel: 'TLA+ Spec',
      subtitle: 'Spec Code & Modules',
      icon: Code2,
      section: 'studio',
    },
    {
      id: 'api-console',
      label: 'Aegis REST API',
      shortLabel: 'REST API',
      subtitle: 'Endpoints & Live Test',
      icon: Server,
      section: 'operations',
      getBadge: () => ({ text: 'v1.0', color: 'neutral' }),
    },
    {
      id: 'logs',
      label: 'Execution Log',
      shortLabel: 'Audit Log',
      subtitle: 'State & Event History',
      icon: Activity,
      section: 'operations',
      getBadge: () => (logCount > 0 ? { text: `${logCount}`, color: 'neutral' } : null),
    },
  ];

  const studioItems = navItems.filter((i) => i.section === 'studio');
  const operationsItems = navItems.filter((i) => i.section === 'operations');

  const renderBadge = (badge: { text: string; color: 'blue' | 'green' | 'amber' | 'neutral' }) => {
    switch (badge.color) {
      case 'green':
        return (
          <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#238636]/15 text-[#3fb950] border border-[#238636]/30">
            <CheckCircle2 className="w-2.5 h-2.5" />
            <span>{badge.text}</span>
          </span>
        );
      case 'amber':
        return (
          <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#D29922]/15 text-[#d29922] border border-[#D29922]/30">
            <AlertTriangle className="w-2.5 h-2.5" />
            <span>{badge.text}</span>
          </span>
        );
      case 'blue':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#3B82F6]/15 text-[#3B82F6] border border-[#3B82F6]/30">
            {badge.text}
          </span>
        );
      case 'neutral':
      default:
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono text-[#8B949E] bg-[#16191E] border border-[#2D333B]">
            {badge.text}
          </span>
        );
    }
  };

  const renderNavItem = (item: NavItemConfig) => {
    const Icon = item.icon;
    const isActive = activeTab === item.id;
    const badge = item.getBadge ? item.getBadge() : null;

    if (isCollapsed) {
      return (
        <button
          key={item.id}
          id={`nav-item-${item.id}`}
          onClick={() => onSelectTab(item.id)}
          title={`${item.label} — ${item.subtitle}`}
          className={`relative w-full flex items-center justify-center p-3 rounded-lg transition-all my-1 group ${
            isActive
              ? 'bg-[#3B82F6]/15 text-[#3B82F6]'
              : 'text-[#8B949E] hover:text-[#C9D1D9] hover:bg-[#16191E]'
          }`}
        >
          {isActive && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#3B82F6] rounded-r-full" />
          )}

          <Icon className={`w-5 h-5 ${isActive ? 'text-[#3B82F6]' : 'text-[#8B949E] group-hover:text-[#C9D1D9]'}`} />

          {badge && (
            <span
              className={`absolute top-2 right-2 w-2 h-2 rounded-full ring-2 ring-[#0F1115] ${
                badge.color === 'green'
                  ? 'bg-[#3fb950]'
                  : badge.color === 'amber'
                  ? 'bg-[#d29922]'
                  : 'bg-[#3B82F6]'
              }`}
            />
          )}
        </button>
      );
    }

    return (
      <button
        key={item.id}
        id={`nav-item-${item.id}`}
        onClick={() => onSelectTab(item.id)}
        className={`relative w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-all my-0.5 group ${
          isActive
            ? 'bg-[#3B82F6]/10 text-[#F0F6FC] font-medium'
            : 'text-[#8B949E] hover:text-[#C9D1D9] hover:bg-[#16191E]'
        }`}
      >
        {isActive && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#3B82F6] rounded-r-full" />
        )}

        <div className="flex items-center space-x-2.5 min-w-0 pr-2">
          <div
            className={`p-1.5 rounded-md flex items-center justify-center transition-colors ${
              isActive
                ? 'bg-[#3B82F6] text-white shadow-xs'
                : 'bg-[#16191E] text-[#8B949E] border border-[#2D333B] group-hover:text-[#C9D1D9]'
            }`}
          >
            <Icon className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className={`text-xs truncate ${isActive ? 'text-[#F0F6FC] font-semibold' : 'text-[#C9D1D9]'}`}>
              {item.label}
            </div>
            <div className="text-[10px] text-[#8B949E] truncate">
              {item.subtitle}
            </div>
          </div>
        </div>

        {badge && (
          <div className="flex-shrink-0">
            {renderBadge(badge)}
          </div>
        )}
      </button>
    );
  };

  return (
    <aside
      id="left-nav"
      className={`h-full border-r border-[#2D333B] bg-[#0F1115] flex flex-col justify-between select-none transition-all duration-200 ease-in-out z-30 flex-shrink-0 ${
        isCollapsed ? 'w-16' : 'w-72'
      }`}
    >
      {/* Search Header Bar */}
      <div className="p-2 border-b border-[#2D333B]/80 bg-[#0F1115]">
        {isCollapsed ? (
          <button
            type="button"
            id="btn-expand-leftnav-search"
            onClick={() => {
              setIsCollapsed(false);
              setTimeout(() => searchInputRef.current?.focus(), 60);
            }}
            title="Search registries, states, transitions (Ctrl+K or /)"
            className="w-full relative flex items-center justify-center p-2.5 rounded-lg text-[#8B949E] hover:text-[#58a6ff] hover:bg-[#16191E] transition-colors group"
          >
            <Search className="w-4 h-4 text-[#8B949E] group-hover:text-[#58a6ff]" />
            {isSearching && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#3B82F6] ring-2 ring-[#0F1115]" />
            )}
          </button>
        ) : (
          <div className="space-y-1.5">
            {/* Search Input Container */}
            <div className="relative flex items-center bg-[#16191E] border border-[#2D333B] focus-within:border-[#3B82F6] focus-within:ring-1 focus-within:ring-[#3B82F6]/30 rounded-lg px-2.5 py-1.5 transition-all">
              <Search className="w-3.5 h-3.5 text-[#8B949E] flex-shrink-0 mr-2" />
              <input
                ref={searchInputRef}
                id="input-leftnav-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setSearchQuery('');
                    (e.target as HTMLElement).blur();
                  }
                }}
                placeholder="Filter registries, states, transitions..."
                className="w-full bg-transparent text-xs text-[#F0F6FC] placeholder-[#8B949E] outline-hidden min-w-0"
              />
              {searchQuery ? (
                <button
                  type="button"
                  id="btn-clear-leftnav-search"
                  onClick={() => {
                    setSearchQuery('');
                    searchInputRef.current?.focus();
                  }}
                  title="Clear search (Esc)"
                  className="p-0.5 text-[#8B949E] hover:text-[#C9D1D9] rounded transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : (
                <span className="text-[10px] font-mono text-[#8B949E] bg-[#0F1115] border border-[#2D333B] px-1.5 py-0.5 rounded select-none flex-shrink-0">
                  /
                </span>
              )}
            </div>

            {/* Category Filter Pills (shown when searching or on demand) */}
            {isSearching && (
              <div className="flex items-center space-x-1 pt-0.5 overflow-x-auto no-scrollbar text-[10px]">
                <button
                  type="button"
                  onClick={() => setSearchCategory('all')}
                  className={`px-2 py-0.5 rounded font-medium transition-colors ${
                    searchCategory === 'all'
                      ? 'bg-[#3B82F6]/20 text-[#58a6ff] border border-[#3B82F6]/40 font-semibold'
                      : 'text-[#8B949E] hover:text-[#C9D1D9] hover:bg-[#16191E]'
                  }`}
                >
                  All ({totalMatches})
                </button>
                <button
                  type="button"
                  onClick={() => setSearchCategory('states')}
                  className={`px-2 py-0.5 rounded font-medium transition-colors ${
                    searchCategory === 'states'
                      ? 'bg-[#3B82F6]/20 text-[#58a6ff] border border-[#3B82F6]/40 font-semibold'
                      : 'text-[#8B949E] hover:text-[#C9D1D9] hover:bg-[#16191E]'
                  }`}
                >
                  States ({matchingStates.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSearchCategory('transitions')}
                  className={`px-2 py-0.5 rounded font-medium transition-colors ${
                    searchCategory === 'transitions'
                      ? 'bg-[#3B82F6]/20 text-[#58a6ff] border border-[#3B82F6]/40 font-semibold'
                      : 'text-[#8B949E] hover:text-[#C9D1D9] hover:bg-[#16191E]'
                  }`}
                >
                  Transitions ({matchingTransitions.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSearchCategory('registries')}
                  className={`px-2 py-0.5 rounded font-medium transition-colors ${
                    searchCategory === 'registries'
                      ? 'bg-[#3B82F6]/20 text-[#58a6ff] border border-[#3B82F6]/40 font-semibold'
                      : 'text-[#8B949E] hover:text-[#C9D1D9] hover:bg-[#16191E]'
                  }`}
                >
                  Registries ({matchingRegistries.length})
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Navigation or Search Results Body */}
      <div className="flex-1 overflow-y-auto px-2 py-2 min-h-0">
        {isSearching && !isCollapsed ? (
          /* Search Results Mode */
          <div className="space-y-3">
            {totalMatches === 0 ? (
              /* Empty Search State */
              <div className="py-8 px-2 text-center">
                <div className="w-9 h-9 mx-auto rounded-full bg-[#16191E] border border-[#2D333B] flex items-center justify-center text-[#8B949E] mb-2.5">
                  <Search className="w-4 h-4" />
                </div>
                <p className="text-xs font-semibold text-[#F0F6FC]">No matches found</p>
                <p className="text-[11px] text-[#8B949E] mt-1 leading-relaxed">
                  No registries, states, or transitions matched &ldquo;{searchQuery}&rdquo;.
                </p>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="mt-3 px-3 py-1 bg-[#21262D] hover:bg-[#30363D] text-[#58a6ff] text-xs font-medium rounded border border-[#2D333B] transition-colors"
                >
                  Clear filter
                </button>
              </div>
            ) : (
              <>
                {/* 1. Matching Registries */}
                {(searchCategory === 'all' || searchCategory === 'registries') &&
                  matchingRegistries.length > 0 && (
                    <div>
                      <div className="px-2 pb-1 pt-1 text-[10px] font-mono uppercase tracking-wider text-[#8B949E] font-semibold flex items-center justify-between">
                        <span className="flex items-center space-x-1.5">
                          <Database className="w-3 h-3 text-[#3B82F6]" />
                          <span>Registries ({matchingRegistries.length})</span>
                        </span>
                      </div>
                      <div className="space-y-1 mt-1">
                        {matchingRegistries.map((reg) => {
                          const isCurrentActive = activeRegistry?.id === reg.id;
                          return (
                            <div
                              key={reg.id}
                              onClick={() => onSelectRegistry?.(reg.id)}
                              className={`group p-2 rounded-lg border text-left cursor-pointer transition-all ${
                                isCurrentActive
                                  ? 'bg-[#3B82F6]/10 border-[#3B82F6]/40'
                                  : 'bg-[#16191E]/60 border-[#2D333B] hover:bg-[#16191E] hover:border-[#3B82F6]/30'
                              }`}
                            >
                              <div className="flex items-center justify-between min-w-0">
                                <span className="font-semibold text-xs text-[#F0F6FC] truncate">
                                  {highlightMatch(reg.name, q)}
                                </span>
                                <div className="flex items-center space-x-1.5 flex-shrink-0 ml-2">
                                  {reg.version && (
                                    <span className="text-[10px] font-mono text-[#8B949E] bg-[#0F1115] px-1.5 py-0.2 rounded border border-[#2D333B]">
                                      v{reg.version}
                                    </span>
                                  )}
                                  {isCurrentActive && (
                                    <span className="text-[9px] font-semibold text-[#3fb950] bg-[#238636]/15 border border-[#238636]/30 px-1 py-0.2 rounded">
                                      Active
                                    </span>
                                  )}
                                </div>
                              </div>
                              {reg.description && (
                                <p className="text-[10px] text-[#8B949E] line-clamp-1 mt-0.5">
                                  {highlightMatch(reg.description, q)}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                {/* 2. Matching States */}
                {(searchCategory === 'all' || searchCategory === 'states') && matchingStates.length > 0 && (
                  <div>
                    <div className="px-2 pb-1 pt-1 text-[10px] font-mono uppercase tracking-wider text-[#8B949E] font-semibold flex items-center justify-between">
                      <span className="flex items-center space-x-1.5">
                        <CircleDot className="w-3 h-3 text-[#3fb950]" />
                        <span>States ({matchingStates.length})</span>
                      </span>
                    </div>
                    <div className="space-y-1 mt-1">
                      {matchingStates.map((s) => (
                        <div
                          key={s.id}
                          onClick={() => {
                            onSelectTab('canvas');
                            onSelectState?.(s);
                          }}
                          className="group p-2 rounded-lg bg-[#16191E]/60 border border-[#2D333B] hover:bg-[#16191E] hover:border-[#3B82F6]/40 text-left cursor-pointer transition-all relative flex items-center justify-between"
                        >
                          <div className="min-w-0 flex-1 pr-2">
                            <div className="flex items-center space-x-1.5 min-w-0">
                              <span
                                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                  s.is_initial
                                    ? 'bg-[#3fb950]'
                                    : s.is_terminal
                                    ? 'bg-[#bc8cff]'
                                    : 'bg-[#58a6ff]'
                                }`}
                              />
                              <span className="font-medium text-xs text-[#F0F6FC] truncate">
                                {highlightMatch(s.name, q)}
                              </span>
                              {s.is_initial && (
                                <span className="text-[9px] font-semibold text-[#3fb950] bg-[#238636]/15 border border-[#238636]/30 px-1 py-0.2 rounded flex-shrink-0">
                                  INIT
                                </span>
                              )}
                              {s.is_terminal && (
                                <span className="text-[9px] font-semibold text-[#bc8cff] bg-[#8957e5]/15 border border-[#8957e5]/30 px-1 py-0.2 rounded flex-shrink-0">
                                  TERM
                                </span>
                              )}
                            </div>
                            {s.description && (
                              <p className="text-[10px] text-[#8B949E] line-clamp-1 mt-0.5 pl-3.5">
                                {highlightMatch(s.description, q)}
                              </p>
                            )}
                          </div>

                          {/* Action button: Edit Modal */}
                          {onEditState && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditState(s);
                              }}
                              title="Edit State"
                              className="opacity-0 group-hover:opacity-100 p-1 rounded text-[#8B949E] hover:text-[#58a6ff] hover:bg-[#21262D] transition-opacity"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Matching Transitions */}
                {(searchCategory === 'all' || searchCategory === 'transitions') &&
                  matchingTransitions.length > 0 && (
                    <div>
                      <div className="px-2 pb-1 pt-1 text-[10px] font-mono uppercase tracking-wider text-[#8B949E] font-semibold flex items-center justify-between">
                        <span className="flex items-center space-x-1.5">
                          <ArrowRight className="w-3 h-3 text-[#D29922]" />
                          <span>Transitions ({matchingTransitions.length})</span>
                        </span>
                      </div>
                      <div className="space-y-1 mt-1">
                        {matchingTransitions.map((t) => {
                          const fromState = states.find((s) => s.id === t.from_state_id);
                          const toState = states.find((s) => s.id === t.to_state_id);
                          const primaryTrigger = t.trigger || (t.triggers && t.triggers[0]);

                          return (
                            <div
                              key={t.id}
                              onClick={() => {
                                onSelectTab('canvas');
                                onSelectTransition?.(t);
                              }}
                              className="group p-2 rounded-lg bg-[#16191E]/60 border border-[#2D333B] hover:bg-[#16191E] hover:border-[#D29922]/40 text-left cursor-pointer transition-all relative flex items-center justify-between"
                            >
                              <div className="min-w-0 flex-1 pr-2">
                                <div className="flex items-center space-x-1.5 min-w-0">
                                  <span className="font-medium text-xs text-[#F0F6FC] truncate">
                                    {highlightMatch(t.name, q)}
                                  </span>
                                  {primaryTrigger && (
                                    <span className="text-[9px] font-mono text-[#d29922] bg-[#D29922]/15 border border-[#D29922]/30 px-1 py-0.2 rounded flex items-center space-x-0.5 flex-shrink-0">
                                      <Zap className="w-2 h-2 text-[#d29922]" />
                                      <span>{highlightMatch(primaryTrigger, q)}</span>
                                    </span>
                                  )}
                                  {t.guard_expression && (
                                    <span className="text-[9px] font-mono text-[#58a6ff] bg-[#3B82F6]/10 px-1 py-0.2 rounded flex-shrink-0">
                                      guard
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center space-x-1 text-[10px] text-[#8B949E] mt-0.5">
                                  <span className="truncate max-w-[90px] font-medium text-[#C9D1D9]">
                                    {fromState ? highlightMatch(fromState.name, q) : 'Start'}
                                  </span>
                                  <ArrowRight className="w-2.5 h-2.5 text-[#8B949E] flex-shrink-0" />
                                  <span className="truncate max-w-[90px] font-medium text-[#C9D1D9]">
                                    {toState ? highlightMatch(toState.name, q) : 'End'}
                                  </span>
                                </div>
                              </div>

                              {/* Action button: Edit Modal */}
                              {onEditTransition && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onEditTransition(t);
                                  }}
                                  title="Edit Transition"
                                  className="opacity-0 group-hover:opacity-100 p-1 rounded text-[#8B949E] hover:text-[#d29922] hover:bg-[#21262D] transition-opacity"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                {/* Back to Standard Navigation Link */}
                <div className="pt-2 border-t border-[#2D333B]/60 text-center">
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-[11px] text-[#8B949E] hover:text-[#58a6ff] transition-colors"
                  >
                    ← Exit search and view navigation
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          /* Standard Navigation Mode */
          <>
            {/* Section: Studio */}
            <div className="mb-4">
              {!isCollapsed ? (
                <div className="px-2 pb-1.5 pt-1 text-[10px] font-mono uppercase tracking-wider text-[#8B949E] font-semibold flex items-center justify-between">
                  <span>Studio & Verifier</span>
                  <Boxes className="w-3 h-3 text-[#8B949E]" />
                </div>
              ) : (
                <div className="w-full border-b border-[#2D333B] my-1" />
              )}
              <nav className="space-y-0.5">{studioItems.map(renderNavItem)}</nav>
            </div>

            {/* Section: Operations & API */}
            <div className="mb-3">
              {!isCollapsed ? (
                <div className="px-2 pb-1.5 pt-1 text-[10px] font-mono uppercase tracking-wider text-[#8B949E] font-semibold flex items-center justify-between">
                  <span>Ecosystem & Logs</span>
                  <Cpu className="w-3 h-3 text-[#8B949E]" />
                </div>
              ) : (
                <div className="w-full border-b border-[#2D333B] my-2" />
              )}
              <nav className="space-y-0.5">{operationsItems.map(renderNavItem)}</nav>
            </div>

            {/* Optional Model Outline Accordion (Expanded view only) */}
            {!isCollapsed && states.length > 0 && (
              <div className="mt-2 pt-2 border-t border-[#2D333B]/60">
                <button
                  type="button"
                  id="btn-toggle-model-outline"
                  onClick={() => setIsOutlineExpanded(!isOutlineExpanded)}
                  className="w-full flex items-center justify-between px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-[#8B949E] hover:text-[#C9D1D9] font-semibold rounded transition-colors"
                >
                  <span className="flex items-center space-x-1.5">
                    <FolderTree className="w-3 h-3 text-[#8B949E]" />
                    <span>Quick Outline</span>
                  </span>
                  <div className="flex items-center space-x-1">
                    <span className="text-[9px] text-[#8B949E] font-mono">
                      {states.length}s · {transitions.length}t
                    </span>
                    {isOutlineExpanded ? (
                      <ChevronDown className="w-3 h-3 text-[#8B949E]" />
                    ) : (
                      <ChevronRight className="w-3 h-3 text-[#8B949E]" />
                    )}
                  </div>
                </button>

                {isOutlineExpanded && (
                  <div className="mt-1 space-y-2 pl-1 pr-1">
                    {/* States mini-list */}
                    <div>
                      <span className="text-[9px] font-mono text-[#8B949E] uppercase tracking-wider px-1">
                        States
                      </span>
                      <div className="space-y-0.5 mt-0.5 max-h-32 overflow-y-auto pr-1">
                        {states.map((s) => (
                          <div
                            key={s.id}
                            onClick={() => {
                              onSelectTab('canvas');
                              onSelectState?.(s);
                            }}
                            className="flex items-center justify-between px-2 py-1 rounded text-xs text-[#C9D1D9] hover:text-[#F0F6FC] hover:bg-[#16191E] cursor-pointer group transition-colors"
                          >
                            <span className="truncate max-w-[170px] text-[11px]">{s.name}</span>
                            {s.is_initial && (
                              <span className="text-[8px] font-mono text-[#3fb950] px-1 bg-[#238636]/20 rounded">
                                INIT
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Transitions mini-list */}
                    {transitions.length > 0 && (
                      <div>
                        <span className="text-[9px] font-mono text-[#8B949E] uppercase tracking-wider px-1">
                          Transitions
                        </span>
                        <div className="space-y-0.5 mt-0.5 max-h-32 overflow-y-auto pr-1">
                          {transitions.map((t) => (
                            <div
                              key={t.id}
                              onClick={() => {
                                onSelectTab('canvas');
                                onSelectTransition?.(t);
                              }}
                              className="flex items-center justify-between px-2 py-1 rounded text-xs text-[#C9D1D9] hover:text-[#F0F6FC] hover:bg-[#16191E] cursor-pointer group transition-colors"
                            >
                              <span className="truncate max-w-[150px] text-[11px]">{t.name}</span>
                              {t.trigger && (
                                <span className="text-[8px] font-mono text-[#d29922] px-1 bg-[#D29922]/15 rounded truncate max-w-[60px]">
                                  {t.trigger}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom Footer Section: Active Registry Card & Collapse Toggle */}
      <div className="border-t border-[#2D333B] bg-[#0A0C10] p-2 flex-shrink-0">
        {/* Active Registry Card (expanded only) */}
        {!isCollapsed && activeRegistry && (
          <div className="mb-2 p-2.5 bg-[#16191E] border border-[#2D333B] rounded-lg text-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono text-[#8B949E] uppercase tracking-wider">
                Active Registry
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#0F1115] text-[#3fb950] border border-[#238636]/40">
                v{activeRegistry.version || '1.0.0'}
              </span>
            </div>
            <p className="font-semibold text-xs text-[#F0F6FC] truncate" title={activeRegistry.name}>
              {activeRegistry.name}
            </p>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#2D333B]/60 text-[11px] text-[#8B949E]">
              <span className="font-mono text-[10px]">
                {stateCount} states · {transitionCount} trans
              </span>
              <span
                className={`w-2 h-2 rounded-full ${
                  activeRegistry.is_active ? 'bg-[#3fb950]' : 'bg-[#8B949E]'
                }`}
                title={activeRegistry.is_active ? 'Registry Active' : 'Registry Inactive'}
              />
            </div>
          </div>
        )}

        {/* Collapse / Expand Toggle Button */}
        <button
          id="btn-toggle-left-nav"
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? 'Expand Navigation (Sidebar)' : 'Collapse Navigation (Sidebar)'}
          className="w-full flex items-center justify-center space-x-2 py-2 px-2.5 rounded-lg text-xs font-medium text-[#8B949E] hover:text-[#C9D1D9] hover:bg-[#16191E] border border-transparent hover:border-[#2D333B] transition-colors"
        >
          {isCollapsed ? (
            <PanelLeftOpen className="w-4 h-4 text-[#8B949E]" />
          ) : (
            <>
              <PanelLeftClose className="w-4 h-4 text-[#8B949E]" />
              <span className="text-[11px]">Collapse sidebar</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
};
