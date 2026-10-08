/**
 * Real-Time Variable Watch Panel for Aegis State Machine Simulation
 * Provides live monitoring, mutation delta detection, domain boundary checking,
 * variable pinning, trend trajectory, and custom watch expressions.
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Eye,
  Star,
  Search,
  Filter,
  RefreshCw,
  Plus,
  Minus,
  ArrowUp,
  ArrowDown,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Sliders,
  Edit3,
  Check,
  X,
  Sparkles,
  Zap,
  Activity,
  Maximize2,
  Minimize2,
  Info,
} from 'lucide-react';
import { Variable, SimState } from '../types';
import { getVariableChangeInfo, VariableChangeInfo } from '../utils/variableDelta';

interface VariableWatchPanelProps {
  variables: Variable[];
  simState: SimState | null;
  onUpdateVariableValue?: (varName: string, value: unknown) => void;
  onResetAllVariables?: () => void;
}

interface CustomWatchExpression {
  id: string;
  expression: string;
  name?: string;
}

export const VariableWatchPanel: React.FC<VariableWatchPanelProps> = ({
  variables,
  simState,
  onUpdateVariableValue,
  onResetAllVariables,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'watched' | 'changed' | 'increased' | 'decreased' | 'numeric'>('all');
  const [pinnedVarNames, setPinnedVarNames] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('aegis_pinned_variables');
      if (saved) return new Set(JSON.parse(saved));
    } catch {
      // Ignore
    }
    return new Set<string>();
  });

  // Inline editing state for manually mutating a variable in simulator
  const [editingVar, setEditingVar] = useState<string | null>(null);
  const [editValueText, setEditValueText] = useState('');

  // Custom watch expressions
  const [watchExpressions, setWatchExpressions] = useState<CustomWatchExpression[]>([
    { id: 'expr-1', expression: 'retry_count >= 3', name: 'Max Retries Check' },
    { id: 'expr-2', expression: 'balance < 0', name: 'Overdraft Invariant' },
  ]);
  const [newExprInput, setNewExprInput] = useState('');
  const [isAddingExpr, setIsAddingExpr] = useState(false);

  // Track variables that changed in the most recent step with their highlight color (green or red)
  const [recentlyChangedMap, setRecentlyChangedMap] = useState<Map<string, 'green' | 'red'>>(new Map());
  const prevStepRef = useRef<number>(-1);

  // Sync pinned variables to localStorage
  const togglePin = (varName: string) => {
    setPinnedVarNames((prev) => {
      const next = new Set(prev);
      if (next.has(varName)) {
        next.delete(varName);
      } else {
        next.add(varName);
      }
      try {
        localStorage.setItem('aegis_pinned_variables', JSON.stringify(Array.from(next)));
      } catch {
        // Ignore
      }
      return next;
    });
  };

  // Step change detection
  const currentStepNum = simState?.history?.length ? simState.history.length - 1 : 0;
  const currentVariables = simState?.variables || {};

  // Retrieve previous step variables from history if available
  const previousVariables = useMemo(() => {
    if (!simState?.history || simState.history.length < 2) return null;
    return simState.history[simState.history.length - 2].variables || null;
  }, [simState]);

  // Compute detailed delta & color info for all variables between steps
  const variableChanges = useMemo(() => {
    const map = new Map<string, VariableChangeInfo>();
    if (!previousVariables) return map;
    for (const v of variables) {
      const prevVal = previousVariables[v.name];
      const currentVal = currentVariables[v.name];
      map.set(v.name, getVariableChangeInfo(prevVal, currentVal));
    }
    return map;
  }, [variables, previousVariables, currentVariables]);

  useEffect(() => {
    if (!simState?.history || simState.history.length === 0) {
      setRecentlyChangedMap(new Map());
      prevStepRef.current = -1;
      return;
    }

    if (currentStepNum !== prevStepRef.current) {
      prevStepRef.current = currentStepNum;

      if (previousVariables) {
        const changedMap = new Map<string, 'green' | 'red'>();
        for (const [key, val] of Object.entries(currentVariables)) {
          const prevVal = previousVariables[key];
          const info = getVariableChangeInfo(prevVal, val);
          if (info.hasChanged && (info.color === 'green' || info.color === 'red')) {
            changedMap.set(key, info.color);
          }
        }
        setRecentlyChangedMap(changedMap);

        // Clear prominent flash effect after 2.5 seconds
        const timer = setTimeout(() => {
          setRecentlyChangedMap(new Map());
        }, 2500);
        return () => clearTimeout(timer);
      }
    }
  }, [currentStepNum, currentVariables, previousVariables]);

  // Extract domain bounds if available
  const getDomainBounds = (v: Variable) => {
    if (!v.domain) return null;
    if (typeof v.domain === 'object' && v.domain !== null) {
      const d = v.domain as Record<string, unknown>;
      if (typeof d.min === 'number' && typeof d.max === 'number') {
        return { min: d.min, max: d.max };
      }
    }
    return null;
  };

  // Variable history trajectory across steps
  const getVariableTrajectory = (varName: string): (unknown)[] => {
    if (!simState?.history) return [];
    return simState.history.map((h) => h.variables?.[varName]);
  };

  // Evaluate simple expression against variables safely
  const evaluateExpression = (expr: string): { result: boolean | string; valid: boolean } => {
    if (!expr.trim()) return { result: 'empty', valid: false };
    try {
      // Build safe scope with current variables
      const scopeKeys = Object.keys(currentVariables);
      const scopeValues = Object.values(currentVariables);
      // eslint-disable-next-line no-new-func
      const func = new Function(...scopeKeys, `return Boolean(${expr});`);
      const res = func(...scopeValues);
      return { result: res, valid: true };
    } catch {
      return { result: 'Error evaluating', valid: false };
    }
  };

  // Save inline edit
  const handleSaveEdit = (v: Variable) => {
    if (!onUpdateVariableValue) return;
    let parsed: unknown = editValueText;
    const lowerType = v.type.toLowerCase();
    if (lowerType === 'integer' || lowerType === 'int' || lowerType === 'number') {
      const num = Number(editValueText);
      if (!isNaN(num)) parsed = num;
    } else if (lowerType === 'boolean' || lowerType === 'bool') {
      parsed = editValueText.toLowerCase() === 'true' || editValueText === '1';
    } else {
      try {
        parsed = JSON.parse(editValueText);
      } catch {
        parsed = editValueText;
      }
    }
    onUpdateVariableValue(v.name, parsed);
    setEditingVar(null);
  };

  // Quick increment/decrement
  const handleDeltaNumber = (varName: string, delta: number) => {
    if (!onUpdateVariableValue) return;
    const curr = Number(currentVariables[varName] ?? 0);
    if (!isNaN(curr)) {
      onUpdateVariableValue(varName, curr + delta);
    }
  };

  // Quick toggle boolean
  const handleToggleBool = (varName: string) => {
    if (!onUpdateVariableValue) return;
    const curr = Boolean(currentVariables[varName]);
    onUpdateVariableValue(varName, !curr);
  };

  // Filter & sort variables
  const filteredVariables = useMemo(() => {
    return variables.filter((v) => {
      // Search
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchName = v.name.toLowerCase().includes(query);
        const matchType = v.type.toLowerCase().includes(query);
        const matchVal = String(currentVariables[v.name] ?? '').toLowerCase().includes(query);
        if (!matchName && !matchType && !matchVal) return false;
      }

      // Filter tabs
      if (activeFilter === 'watched') {
        return pinnedVarNames.has(v.name);
      }
      if (activeFilter === 'changed') {
        const change = variableChanges.get(v.name);
        return Boolean(change?.hasChanged);
      }
      if (activeFilter === 'increased') {
        const change = variableChanges.get(v.name);
        return Boolean(change?.hasChanged && change?.color === 'green');
      }
      if (activeFilter === 'decreased') {
        const change = variableChanges.get(v.name);
        return Boolean(change?.hasChanged && change?.color === 'red');
      }
      if (activeFilter === 'numeric') {
        const t = v.type.toLowerCase();
        return t === 'integer' || t === 'int' || t === 'number' || t === 'float';
      }

      return true;
    }).sort((a, b) => {
      // Pinned items always go first
      const aPinned = pinnedVarNames.has(a.name);
      const bPinned = pinnedVarNames.has(b.name);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [variables, searchTerm, activeFilter, pinnedVarNames, currentVariables, variableChanges]);

  const { changedCount, greenCount, redCount } = useMemo(() => {
    let changed = 0;
    let green = 0;
    let red = 0;
    for (const v of variables) {
      const change = variableChanges.get(v.name);
      if (change?.hasChanged) {
        changed++;
        if (change.color === 'green') green++;
        else if (change.color === 'red') red++;
      }
    }
    return { changedCount: changed, greenCount: green, redCount: red };
  }, [variables, variableChanges]);

  return (
    <div className="bg-[#16191E] rounded-xl border border-[#2D333B] shadow-sm overflow-hidden flex flex-col">
      {/* Row 1: Primary Header & Simulation Delta Status */}
      <div className="px-5 py-3 border-b border-[#2D333B] bg-[#0A0C10] flex items-center justify-between gap-4">
        {/* Title & Live Status */}
        <div className="flex items-center space-x-3 min-w-0">
          <div className="p-1.5 rounded-lg bg-[#3B82F6]/15 border border-[#3B82F6]/30 text-[#58a6ff] shrink-0">
            <Eye className="w-4 h-4" />
          </div>
          <div className="flex items-center space-x-2.5 min-w-0">
            <h4 className="font-bold text-sm text-[#F0F6FC] tracking-wide whitespace-nowrap">
              Variable Watch
            </h4>
            <span className="inline-flex items-center space-x-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#3fb950]/15 text-[#3fb950] border border-[#3fb950]/30 font-semibold shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3fb950] animate-pulse" />
              <span>LIVE</span>
            </span>
            <span className="text-[#30363D] hidden md:inline">|</span>
            <span className="text-[11px] text-[#8B949E] hidden md:inline truncate">
              Real-time state valuation & delta tracking
            </span>
          </div>
        </div>

        {/* Status Indicators & Actions */}
        <div className="flex items-center space-x-2.5 shrink-0">
          {/* Legend for red/green delta highlights */}
          <div className="hidden lg:flex items-center space-x-2.5 text-[10px] font-mono px-2.5 py-1 rounded-lg bg-[#16191E] border border-[#2D333B] text-[#8B949E]">
            <span className="flex items-center space-x-1 text-[#3fb950]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3fb950]" />
              <span className="font-semibold">+Δ / True</span>
            </span>
            <span className="text-[#30363D]">·</span>
            <span className="flex items-center space-x-1 text-[#f85149]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#f85149]" />
              <span className="font-semibold">-Δ / False</span>
            </span>
          </div>

          {/* Step & Delta Badges */}
          {changedCount > 0 ? (
            <div className="flex items-center space-x-1.5">
              <span className="text-[11px] font-mono px-2 py-1 rounded-md bg-[#21262D] text-[#C9D1D9] border border-[#30363D] whitespace-nowrap">
                Step {currentStepNum}: <span className="font-semibold">{changedCount} changed</span>
              </span>
              {greenCount > 0 && (
                <span className="text-[11px] font-mono px-2 py-1 rounded-md bg-[#238636]/20 text-[#3fb950] border border-[#238636]/40 flex items-center space-x-0.5 font-bold">
                  <ArrowUp className="w-3 h-3" />
                  <span>+{greenCount}</span>
                </span>
              )}
              {redCount > 0 && (
                <span className="text-[11px] font-mono px-2 py-1 rounded-md bg-[#da3633]/20 text-[#f85149] border border-[#da3633]/40 flex items-center space-x-0.5 font-bold">
                  <ArrowDown className="w-3 h-3" />
                  <span>-{redCount}</span>
                </span>
              )}
            </div>
          ) : (
            <span className="text-[11px] font-mono px-2.5 py-1 rounded-md bg-[#16191E] text-[#8B949E] border border-[#2D333B] whitespace-nowrap hidden sm:inline-block">
              Step {currentStepNum}: In sync
            </span>
          )}

          {onResetAllVariables && (
            <button
              onClick={onResetAllVariables}
              title="Reset all variables to their defined initial values"
              className="inline-flex items-center space-x-1.5 px-2.5 py-1 text-xs text-[#8B949E] hover:text-[#F0F6FC] bg-[#16191E] hover:bg-[#21262D] border border-[#2D333B] rounded-lg transition-colors shrink-0"
            >
              <RefreshCw className="w-3 h-3" />
              <span className="hidden sm:inline">Reset Initials</span>
            </button>
          )}
        </div>
      </div>

      {/* Row 2: Search & Filter Toolbar */}
      <div className="px-5 py-2.5 border-b border-[#2D333B] bg-[#0F1115] flex items-center justify-between gap-3">
        {/* Search Field with clear button */}
        <div className="relative w-56 sm:w-72 shrink-0">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8B949E]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search variable, type, value..."
            className="w-full pl-8 pr-7 py-1.5 bg-[#16191E] border border-[#2D333B] rounded-lg text-xs font-mono text-[#F0F6FC] placeholder-[#8B949E] focus:outline-none focus:border-[#3B82F6]"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              title="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8B949E] hover:text-[#F0F6FC] p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Filter Segmented Control Tabs */}
        <div className="flex items-center space-x-1 overflow-x-auto py-0.5 scrollbar-none">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
              activeFilter === 'all'
                ? 'bg-[#21262D] text-[#F0F6FC] border border-[#3B82F6]'
                : 'text-[#8B949E] hover:text-[#C9D1D9]'
            }`}
          >
            All ({variables.length})
          </button>
          <button
            onClick={() => setActiveFilter('watched')}
            className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
              activeFilter === 'watched'
                ? 'bg-[#21262D] text-[#D29922] border border-[#D29922]'
                : 'text-[#8B949E] hover:text-[#C9D1D9]'
            }`}
          >
            <Star className={`w-3 h-3 ${pinnedVarNames.size > 0 ? 'fill-[#D29922] text-[#D29922]' : ''}`} />
            <span>Watched ({pinnedVarNames.size})</span>
          </button>
          <button
            onClick={() => setActiveFilter('changed')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
              activeFilter === 'changed'
                ? 'bg-[#21262D] text-[#58a6ff] border border-[#3B82F6]'
                : 'text-[#8B949E] hover:text-[#C9D1D9]'
            }`}
          >
            Changed ({changedCount})
          </button>
          {greenCount > 0 && (
            <button
              onClick={() => setActiveFilter('increased')}
              className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                activeFilter === 'increased'
                  ? 'bg-[#238636]/25 text-[#3fb950] border border-[#238636]'
                  : 'text-[#3fb950]/70 hover:text-[#3fb950]'
              }`}
            >
              <ArrowUp className="w-3 h-3" />
              <span>Increased ({greenCount})</span>
            </button>
          )}
          {redCount > 0 && (
            <button
              onClick={() => setActiveFilter('decreased')}
              className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                activeFilter === 'decreased'
                  ? 'bg-[#da3633]/25 text-[#f85149] border border-[#da3633]'
                  : 'text-[#f85149]/70 hover:text-[#f85149]'
              }`}
            >
              <ArrowDown className="w-3 h-3" />
              <span>Decreased ({redCount})</span>
            </button>
          )}
          <button
            onClick={() => setActiveFilter('numeric')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
              activeFilter === 'numeric'
                ? 'bg-[#21262D] text-[#3fb950] border border-[#3fb950]'
                : 'text-[#8B949E] hover:text-[#C9D1D9]'
            }`}
          >
            Numeric
          </button>
        </div>
      </div>

      {/* Variables Card Grid */}
      <div className="p-6 space-y-4">
        {filteredVariables.length === 0 ? (
          <div className="p-10 text-center rounded-xl border border-dashed border-[#2D333B] bg-[#0F1115]">
            <Eye className="w-8 h-8 text-[#8B949E]/40 mx-auto mb-2" />
            <p className="text-xs font-medium text-[#C9D1D9]">No variables match the filter criteria</p>
            <p className="text-[11px] text-[#8B949E] mt-1">
              {searchTerm ? 'Try adjusting your search keywords.' : 'No variables defined in the state machine registry.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredVariables.map((v) => {
              const currentVal = currentVariables[v.name];
              const prevVal = previousVariables ? previousVariables[v.name] : undefined;
              const changeInfo = variableChanges.get(v.name) || getVariableChangeInfo(prevVal, currentVal);
              const hasChanged = changeInfo.hasChanged;
              const changeColor = changeInfo.color;
              const isPinned = pinnedVarNames.has(v.name);
              const flashColor = recentlyChangedMap.get(v.name);
              const isFlashing = Boolean(flashColor);
              const domainBounds = getDomainBounds(v);
              const trajectory = getVariableTrajectory(v.name);
              const isNumeric = typeof currentVal === 'number';
              const isBool = typeof currentVal === 'boolean';

              // Calculate numeric delta
              let deltaNum: number | null = null;
              if (isNumeric && typeof prevVal === 'number') {
                deltaNum = currentVal - prevVal;
              }

              // Domain progress calculation
              let domainPercent: number | null = null;
              let isOutOfBounds = false;
              if (domainBounds && isNumeric) {
                const range = domainBounds.max - domainBounds.min;
                if (range > 0) {
                  const clamped = Math.max(domainBounds.min, Math.min(domainBounds.max, currentVal));
                  domainPercent = Math.round(((clamped - domainBounds.min) / range) * 100);
                  isOutOfBounds = currentVal < domainBounds.min || currentVal > domainBounds.max;
                }
              }

              // Highlight classes based on red/green change status
              let cardHighlightClasses = 'bg-[#0F1115] border-[#2D333B] hover:border-[#30363D]';
              if (isFlashing) {
                if (flashColor === 'green') {
                  cardHighlightClasses = 'bg-[#238636]/15 border-[#3fb950] shadow-[0_0_18px_rgba(63,185,80,0.4)] ring-2 ring-[#3fb950]/60';
                } else if (flashColor === 'red') {
                  cardHighlightClasses = 'bg-[#da3633]/15 border-[#f85149] shadow-[0_0_18px_rgba(248,81,73,0.4)] ring-2 ring-[#f85149]/60';
                } else {
                  cardHighlightClasses = 'bg-[#3B82F6]/15 border-[#3B82F6] shadow-[0_0_18px_rgba(59,130,246,0.3)] ring-2 ring-[#3B82F6]/50';
                }
              } else if (hasChanged) {
                if (changeColor === 'green') {
                  cardHighlightClasses = 'bg-[#0F1115] border-[#238636] shadow-[0_0_10px_rgba(63,185,80,0.15)] ring-1 ring-[#238636]/50';
                } else if (changeColor === 'red') {
                  cardHighlightClasses = 'bg-[#0F1115] border-[#da3633] shadow-[0_0_10px_rgba(248,81,73,0.15)] ring-1 ring-[#da3633]/50';
                } else {
                  cardHighlightClasses = 'bg-[#0F1115] border-[#3B82F6]/60 shadow-xs';
                }
              } else if (isPinned) {
                cardHighlightClasses = 'bg-[#0F1115] border-[#D29922]/40';
              }

              return (
                <div
                  key={v.id}
                  className={`p-4 rounded-xl border transition-all duration-300 relative ${cardHighlightClasses}`}
                >
                  {/* Card Header: Name, Pin & Type */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2 min-w-0">
                      <button
                        onClick={() => togglePin(v.name)}
                        title={isPinned ? 'Unpin variable' : 'Pin to top'}
                        className={`p-1 rounded-md transition-colors ${
                          isPinned
                            ? 'text-[#D29922] hover:bg-[#D29922]/15'
                            : 'text-[#8B949E] hover:text-[#C9D1D9] hover:bg-[#21262D]'
                        }`}
                      >
                        <Star className={`w-3.5 h-3.5 ${isPinned ? 'fill-[#D29922]' : ''}`} />
                      </button>

                      <span className="font-mono font-bold text-sm text-[#F0F6FC] truncate">
                        {v.name}
                      </span>

                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#21262D] text-[#8B949E] border border-[#30363D]">
                        {v.type}
                      </span>

                      {hasChanged && (
                        <span
                          className={`inline-flex items-center space-x-1 text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase animate-pulse ${
                            changeColor === 'green'
                              ? 'bg-[#238636]/20 text-[#3fb950] border border-[#238636]/50'
                              : changeColor === 'red'
                              ? 'bg-[#da3633]/20 text-[#f85149] border border-[#da3633]/50'
                              : 'bg-[#3B82F6]/20 text-[#58a6ff] border border-[#3B82F6]/40'
                          }`}
                        >
                          {changeColor === 'green' && <ArrowUp className="w-2.5 h-2.5" />}
                          {changeColor === 'red' && <ArrowDown className="w-2.5 h-2.5" />}
                          <span>{changeInfo.badgeLabel || 'MODIFIED'}</span>
                        </span>
                      )}
                    </div>

                    {/* Quick Sandbox Mutate Controls */}
                    {onUpdateVariableValue && (
                      <div className="flex items-center space-x-1">
                        {isNumeric && (
                          <>
                            <button
                              onClick={() => handleDeltaNumber(v.name, -1)}
                              title="Decrement (-1)"
                              className="p-1 rounded bg-[#21262D] hover:bg-[#30363D] text-[#8B949E] hover:text-[#F0F6FC] transition-colors"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDeltaNumber(v.name, 1)}
                              title="Increment (+1)"
                              className="p-1 rounded bg-[#21262D] hover:bg-[#30363D] text-[#8B949E] hover:text-[#F0F6FC] transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </>
                        )}

                        {isBool && (
                          <button
                            onClick={() => handleToggleBool(v.name)}
                            title="Toggle boolean"
                            className="px-1.5 py-0.5 text-[10px] font-mono font-medium rounded bg-[#21262D] hover:bg-[#30363D] text-[#58a6ff] border border-[#2D333B] transition-colors"
                          >
                            Toggle
                          </button>
                        )}

                        <button
                          onClick={() => {
                            if (editingVar === v.name) {
                              setEditingVar(null);
                            } else {
                              setEditingVar(v.name);
                              setEditValueText(JSON.stringify(currentVal ?? ''));
                            }
                          }}
                          title="Edit variable value"
                          className="p-1 rounded bg-[#21262D] hover:bg-[#30363D] text-[#8B949E] hover:text-[#F0F6FC] transition-colors"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Inline Manual Value Editor */}
                  {editingVar === v.name && (
                    <div className="mt-2.5 p-2 bg-[#16191E] border border-[#3B82F6] rounded-lg flex items-center space-x-2">
                      <span className="text-[10px] font-mono text-[#8B949E]">Set:</span>
                      <input
                        type="text"
                        value={editValueText}
                        onChange={(e) => setEditValueText(e.target.value)}
                        className="flex-1 px-2 py-0.5 bg-[#0F1115] border border-[#2D333B] rounded text-xs font-mono text-[#F0F6FC] focus:outline-none focus:border-[#3B82F6]"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveEdit(v)}
                        className="p-1 rounded bg-[#238636] hover:bg-[#2ea043] text-white"
                        title="Save value"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => setEditingVar(null)}
                        className="p-1 rounded bg-[#21262D] hover:bg-[#30363D] text-[#8B949E]"
                        title="Cancel"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {/* Primary Current Valuation & Delta Display */}
                  <div className="mt-3 flex items-baseline justify-between">
                    <div>
                      <span className="text-[10px] text-[#8B949E] uppercase font-mono tracking-wider block">
                        Current Valuation
                      </span>
                      <div className="flex items-center space-x-2 mt-0.5">
                        <span
                          className={`font-mono text-xl font-black ${
                            changeColor === 'green'
                              ? 'text-[#3fb950]'
                              : changeColor === 'red'
                              ? 'text-[#f85149]'
                              : isBool
                              ? currentVal
                                ? 'text-[#3fb950]'
                                : 'text-[#f85149]'
                              : isNumeric
                              ? 'text-[#58a6ff]'
                              : 'text-[#F0F6FC]'
                          }`}
                        >
                          {currentVal !== undefined ? JSON.stringify(currentVal) : 'undefined'}
                        </span>

                        {/* Delta Badge with Red/Green indicator */}
                        {hasChanged && changeInfo.deltaText && (
                          <span
                            className={`inline-flex items-center text-xs font-mono font-bold px-1.5 py-0.5 rounded ${
                              changeColor === 'green'
                                ? 'bg-[#238636]/20 text-[#3fb950] border border-[#238636]/40'
                                : changeColor === 'red'
                                ? 'bg-[#da3633]/20 text-[#f85149] border border-[#da3633]/40'
                                : 'bg-[#3B82F6]/20 text-[#58a6ff] border border-[#3B82F6]/40'
                            }`}
                          >
                            {changeColor === 'green' && <ArrowUp className="w-3 h-3 mr-0.5" />}
                            {changeColor === 'red' && <ArrowDown className="w-3 h-3 mr-0.5" />}
                            {changeInfo.deltaText}
                          </span>
                        )}

                        {/* Fallback Numeric Delta Arrow Indicator if no deltaText */}
                        {!changeInfo.deltaText && deltaNum !== null && deltaNum !== 0 && (
                          <span
                            className={`inline-flex items-center text-xs font-mono font-bold px-1.5 py-0.5 rounded ${
                              deltaNum > 0
                                ? 'bg-[#238636]/15 text-[#3fb950]'
                                : 'bg-[#f85149]/15 text-[#f85149]'
                            }`}
                          >
                            {deltaNum > 0 ? <ArrowUp className="w-3 h-3 mr-0.5" /> : <ArrowDown className="w-3 h-3 mr-0.5" />}
                            {deltaNum > 0 ? `+${deltaNum}` : deltaNum}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Previous Step Value / Initial */}
                    <div className="text-right">
                      <span className="text-[10px] text-[#8B949E] uppercase font-mono tracking-wider block">
                        Previous Step
                      </span>
                      <span className="text-xs font-mono text-[#8B949E] line-through block mt-0.5">
                        {prevVal !== undefined ? JSON.stringify(prevVal) : '—'}
                      </span>
                    </div>
                  </div>

                  {/* Domain Bounds & Gauge Bar (if configured) */}
                  {domainBounds && (
                    <div className="mt-3 pt-2.5 border-t border-[#21262D] space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-mono text-[#8B949E]">
                        <span>Bounds: [{domainBounds.min} .. {domainBounds.max}]</span>
                        {isOutOfBounds ? (
                          <span className="text-[#f85149] font-bold flex items-center space-x-1">
                            <AlertCircle className="w-3 h-3" />
                            <span>Out of Bounds!</span>
                          </span>
                        ) : (
                          <span>{domainPercent}% of range</span>
                        )}
                      </div>
                      <div className="w-full h-1.5 bg-[#21262D] rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            isOutOfBounds ? 'bg-[#f85149]' : 'bg-[#3B82F6]'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(0, domainPercent || 0))}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* History Trace Trajectory across simulation steps */}
                  {trajectory.length > 1 && (
                    <div className="mt-3 pt-2 border-t border-[#21262D] flex items-center justify-between text-[10px] font-mono text-[#8B949E]">
                      <span className="flex items-center space-x-1">
                        <Activity className="w-3 h-3 text-[#3B82F6]" />
                        <span>Step Trajectory:</span>
                      </span>
                      <div className="flex items-center space-x-1 overflow-x-auto max-w-[200px] py-0.5">
                        {trajectory.slice(-6).map((stepVal, idx) => (
                          <span
                            key={idx}
                            className={`px-1 rounded ${
                              idx === trajectory.slice(-6).length - 1
                                ? 'bg-[#3B82F6]/25 text-[#58a6ff] font-bold'
                                : 'bg-[#16191E] text-[#8B949E]'
                            }`}
                          >
                            {typeof stepVal === 'boolean'
                              ? stepVal
                                ? 'T'
                                : 'F'
                              : String(stepVal).slice(0, 4)}
                            {idx < trajectory.slice(-6).length - 1 && ' ›'}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {v.description && (
                    <p className="text-[11px] text-[#8B949E] mt-2 italic truncate" title={v.description}>
                      {v.description}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Custom Watch Expressions Evaluator */}
        <div className="mt-6 pt-4 border-t border-[#2D333B] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-3.5 h-3.5 text-[#D29922]" />
              <h5 className="font-bold text-xs text-[#F0F6FC] uppercase tracking-wider">
                Watch Expressions (Live Invariant Evaluator)
              </h5>
            </div>
            <button
              onClick={() => setIsAddingExpr(!isAddingExpr)}
              className="text-xs text-[#3B82F6] hover:text-[#58a6ff] font-medium flex items-center space-x-1"
            >
              <Plus className="w-3 h-3" />
              <span>Add Watch Expression</span>
            </button>
          </div>

          {/* Add Expression Input */}
          {isAddingExpr && (
            <div className="p-3 bg-[#0F1115] rounded-xl border border-[#3B82F6] flex items-center space-x-2">
              <input
                type="text"
                value={newExprInput}
                onChange={(e) => setNewExprInput(e.target.value)}
                placeholder="e.g. retry_count < 5 || is_authenticated"
                className="flex-1 px-3 py-1.5 bg-[#16191E] border border-[#2D333B] rounded-lg text-xs font-mono text-[#F0F6FC] placeholder-[#8B949E] focus:outline-none focus:border-[#3B82F6]"
              />
              <button
                disabled={!newExprInput.trim()}
                onClick={() => {
                  if (newExprInput.trim()) {
                    setWatchExpressions((prev) => [
                      ...prev,
                      { id: `expr-${Date.now()}`, expression: newExprInput.trim() },
                    ]);
                    setNewExprInput('');
                    setIsAddingExpr(false);
                  }
                }}
                className="px-3 py-1.5 bg-[#238636] hover:bg-[#2ea043] disabled:opacity-40 text-xs font-semibold text-white rounded-lg transition-colors"
              >
                Add
              </button>
              <button
                onClick={() => setIsAddingExpr(false)}
                className="px-2.5 py-1.5 bg-[#21262D] hover:bg-[#30363D] text-xs text-[#8B949E] rounded-lg"
              >
                Cancel
              </button>
            </div>
          )}

          {/* List of active watch expressions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {watchExpressions.map((item) => {
              const evalRes = evaluateExpression(item.expression);
              const isTrue = evalRes.valid && evalRes.result === true;
              const isFalse = evalRes.valid && evalRes.result === false;

              return (
                <div
                  key={item.id}
                  className="p-3 bg-[#0F1115] rounded-xl border border-[#2D333B] flex items-center justify-between"
                >
                  <div className="space-y-0.5 min-w-0 flex-1 pr-2">
                    {item.name && (
                      <span className="text-[10px] text-[#8B949E] font-medium block truncate">
                        {item.name}
                      </span>
                    )}
                    <span className="font-mono text-xs text-[#F0F6FC] font-semibold block truncate">
                      {item.expression}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded font-mono font-bold text-xs border ${
                        isTrue
                          ? 'bg-[#238636]/15 text-[#3fb950] border-[#238636]/40'
                          : isFalse
                          ? 'bg-[#f85149]/15 text-[#f85149] border-[#f85149]/40'
                          : 'bg-[#21262D] text-[#8B949E] border-[#30363D]'
                      }`}
                    >
                      {isTrue ? 'TRUE' : isFalse ? 'FALSE' : String(evalRes.result)}
                    </span>

                    <button
                      onClick={() => setWatchExpressions((prev) => prev.filter((e) => e.id !== item.id))}
                      title="Remove watch expression"
                      className="p-1 text-[#8B949E] hover:text-[#f85149] transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
