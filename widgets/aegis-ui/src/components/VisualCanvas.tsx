/**
 * Interactive State Machine Visual Canvas
 * Supports node dragging, bezier transition arrows, simulation state highlighting,
 * and inline editing.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  StateNode,
  Transition,
  Variable,
  SimState,
  ThemeMode,
  StateGroup,
  ExecutionLogItem,
} from '../types';
import { computeForceDirectedLayout } from '../utils/forceLayout';
import { VisualContainerLayer } from './VisualContainerLayer';
import { GROUP_COLORS } from './GroupEditorModal';
import { TimeTravelSlider } from './TimeTravelSlider';
import { computeExecutionHeatmap, getHeatStyle } from '../utils/heatmap';
import { HeatMapOverlayLegend } from './HeatMapOverlayLegend';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Plus,
  Play,
  Trash2,
  Edit2,
  CheckCircle,
  HelpCircle,
  ArrowRight,
  Sparkles,
  Sliders,
  RefreshCw,
  Boxes,
  Flame,
  Hand,
  MousePointer,
  Clock,
  ChevronUp,
} from 'lucide-react';

interface VisualCanvasProps {
  states: StateNode[];
  transitions: Transition[];
  variables: Variable[];
  groups?: StateGroup[];
  simState: SimState | null;
  enabledTransitions: { transition: Transition; toState: StateNode | undefined }[];
  onFireTransition: (transition: Transition, triggerEvent?: string) => void;
  onAddState: () => void;
  onAddTransition: () => void;
  onAddGroup?: () => void;
  onEditGroup?: (group: StateGroup) => void;
  onDeleteGroup?: (groupId: string) => void;
  onAddStateToGroup?: (group: StateGroup) => void;
  onEditState: (state: StateNode) => void;
  onDeleteState: (stateId: string) => void;
  onEditTransition: (transition: Transition) => void;
  onDeleteTransition: (transitionId: string) => void;
  onUpdateStatePosition: (stateId: string, x: number, y: number) => void;
  onBatchUpdateStatePositions?: (positions: { id: string; x: number; y: number }[]) => void;
  onUpdateGroupPosition?: (groupId: string, x: number, y: number) => void;
  theme?: ThemeMode;
  executionLogs?: ExecutionLogItem[];
  scrubIndex?: number | null;
  onScrubStep?: (stepIndex: number | null) => void;
  onBranchFromStep?: (stepIndex: number) => void;
  onResetSimulation?: () => void;
  selectedStateId?: string | null;
  onSelectStateId?: (id: string | null) => void;
  selectedTransitionId?: string | null;
  onSelectTransitionId?: (id: string | null) => void;
}

export const VisualCanvas: React.FC<VisualCanvasProps> = ({
  states,
  transitions,
  variables,
  groups = [],
  simState,
  enabledTransitions,
  onFireTransition,
  onAddState,
  onAddTransition,
  onAddGroup,
  onEditGroup,
  onDeleteGroup,
  onAddStateToGroup,
  onEditState,
  onDeleteState,
  onEditTransition,
  onDeleteTransition,
  onUpdateStatePosition,
  onBatchUpdateStatePositions,
  onUpdateGroupPosition,
  theme = 'dark',
  executionLogs = [],
  scrubIndex,
  onScrubStep,
  onBranchFromStep,
  onResetSimulation,
  selectedStateId: propSelectedStateId,
  onSelectStateId,
  selectedTransitionId: propSelectedTransitionId,
  onSelectTransitionId,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 40, y: 40 });
  const [isPanning, setIsPanning] = useState(false);
  const [activeTool, setActiveTool] = useState<'select' | 'pan'>('select');
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  // Synchronized refs for event handlers without stale closures
  const panRef = useRef(pan);
  useEffect(() => {
    panRef.current = pan;
  }, [pan]);

  const zoomRef = useRef(zoom);
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  const panStartRef = useRef<{
    startX: number;
    startY: number;
    initialPanX: number;
    initialPanY: number;
  } | null>(null);

  const dragOffsetRef = useRef({ x: 0, y: 0 });

  // Heat map overlay state
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [heatmapThreshold, setHeatmapThreshold] = useState(0);

  // Compute traversal heatmap statistics from execution history logs and simulation
  const heatmapData = React.useMemo(() => {
    return computeExecutionHeatmap(states, transitions, executionLogs, simState);
  }, [states, transitions, executionLogs, simState]);

  // Time-Travel debugger visibility state
  const [showTimeTravel, setShowTimeTravel] = useState(true);
  const hasSimHistory = Boolean(simState && simState.history && simState.history.length > 0);

  // Fallback internal scrubber index if not controlled externally
  const [localScrubIndex, setLocalScrubIndex] = useState<number | null>(null);
  const effectiveScrubIndex = scrubIndex !== undefined ? scrubIndex : localScrubIndex;
  const handleScrub = (idx: number | null) => {
    if (onScrubStep) {
      onScrubStep(idx);
    } else {
      setLocalScrubIndex(idx);
    }
  };

  // Determine active simulation step based on time-travel scrubber position
  const activeSimStep = React.useMemo(() => {
    if (!simState || !simState.history || simState.history.length === 0) return null;
    const maxIdx = simState.history.length - 1;
    const idx = effectiveScrubIndex !== null ? Math.min(effectiveScrubIndex, maxIdx) : maxIdx;
    return simState.history[idx] || null;
  }, [simState, effectiveScrubIndex]);

  const prevSimStep = React.useMemo(() => {
    if (!simState || !simState.history || simState.history.length === 0) return null;
    const maxIdx = simState.history.length - 1;
    const idx = effectiveScrubIndex !== null ? Math.min(effectiveScrubIndex, maxIdx) : maxIdx;
    return idx > 0 ? simState.history[idx - 1] : null;
  }, [simState, effectiveScrubIndex]);

  const activeCurrentStateId = activeSimStep ? activeSimStep.stateId : simState?.currentStateId;
  const activeCurrentVariables = activeSimStep ? activeSimStep.variables : simState?.variables;

  const [internalSelectedStateId, setInternalSelectedStateId] = useState<string | null>(null);
  const selectedStateId = propSelectedStateId !== undefined ? propSelectedStateId : internalSelectedStateId;
  const setSelectedStateId = (id: string | null) => {
    setInternalSelectedStateId(id);
    onSelectStateId?.(id);
  };

  const [internalSelectedTransitionId, setInternalSelectedTransitionId] = useState<string | null>(null);
  const selectedTransitionId = propSelectedTransitionId !== undefined ? propSelectedTransitionId : internalSelectedTransitionId;
  const setSelectedTransitionId = (id: string | null) => {
    setInternalSelectedTransitionId(id);
    onSelectTransitionId?.(id);
  };

  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  // Dragging state node
  const [draggingStateId, setDraggingStateId] = useState<string | null>(null);
  const [isLayoutRunning, setIsLayoutRunning] = useState(false);

  // Dragging visual container (group)
  const [draggingGroupId, setDraggingGroupId] = useState<string | null>(null);
  const [groupDragStart, setGroupDragStart] = useState<{
    startX: number;
    startY: number;
    initialGroupX: number;
    initialGroupY: number;
    initialPositions: { id: string; x: number; y: number }[];
  } | null>(null);

  // Default positions if missing
  const positionedStates = states.map((s, idx) => {
    if (s.x !== undefined && s.y !== undefined) return s;
    const col = idx % 3;
    const row = Math.floor(idx / 3);
    return {
      ...s,
      x: 150 + col * 260,
      y: 120 + row * 180,
    };
  });

  // Selected entities
  const selectedState = positionedStates.find((s) => s.id === selectedStateId);
  const selectedTransition = transitions.find((t) => t.id === selectedTransitionId);

  // Auto-center viewport when an entity is selected from outside (e.g. LeftNav search)
  useEffect(() => {
    if (!propSelectedStateId || !containerRef.current) return;
    const target = positionedStates.find((s) => s.id === propSelectedStateId);
    if (target && target.x !== undefined && target.y !== undefined) {
      const cWidth = containerRef.current.clientWidth || 900;
      const cHeight = containerRef.current.clientHeight || 600;
      const targetPanX = Math.round(cWidth / 2 - (target.x + 90) * zoomRef.current);
      const targetPanY = Math.round(cHeight / 2 - (target.y + 60) * zoomRef.current);
      setPan({ x: targetPanX, y: targetPanY });
    }
  }, [propSelectedStateId]);

  useEffect(() => {
    if (!propSelectedTransitionId || !containerRef.current) return;
    const target = transitions.find((t) => t.id === propSelectedTransitionId);
    if (!target) return;
    const from = positionedStates.find((s) => s.id === target.from_state_id);
    const to = positionedStates.find((s) => s.id === target.to_state_id);
    if (from && to && from.x !== undefined && to.x !== undefined) {
      const midX = (from.x + to.x) / 2 + 90;
      const midY = (from.y + to.y) / 2 + 60;
      const cWidth = containerRef.current.clientWidth || 900;
      const cHeight = containerRef.current.clientHeight || 600;
      const targetPanX = Math.round(cWidth / 2 - midX * zoomRef.current);
      const targetPanY = Math.round(cHeight / 2 - midY * zoomRef.current);
      setPan({ x: targetPanX, y: targetPanY });
    }
  }, [propSelectedTransitionId]);

  // Initiate mouse-drag panning
  const startPanning = (clientX: number, clientY: number) => {
    setIsPanning(true);
    panStartRef.current = {
      startX: clientX,
      startY: clientY,
      initialPanX: panRef.current.x,
      initialPanY: panRef.current.y,
    };
  };

  // Keyboard shortcut listener: Space (temporary Pan Hand), H (Pan Tool), V (Select Tool)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
        return;
      }
      if (e.code === 'Space' && !e.repeat) {
        setIsSpacePressed(true);
      }
      if (e.key.toLowerCase() === 'h' && !e.ctrlKey && !e.metaKey) {
        setActiveTool((prev) => (prev === 'pan' ? 'select' : 'pan'));
      }
      if (e.key.toLowerCase() === 'v' && !e.ctrlKey && !e.metaKey) {
        setActiveTool('select');
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Global mousemove & mouseup for panning across entire viewable area
  useEffect(() => {
    if (!isPanning) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!panStartRef.current) return;
      const dx = e.clientX - panStartRef.current.startX;
      const dy = e.clientY - panStartRef.current.startY;
      setPan({
        x: Math.round(panStartRef.current.initialPanX + dx),
        y: Math.round(panStartRef.current.initialPanY + dy),
      });
    };

    const handleGlobalMouseUp = () => {
      setIsPanning(false);
      panStartRef.current = null;
    };

    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';

    window.addEventListener('mousemove', handleGlobalMouseMove, { passive: true });
    window.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isPanning]);

  // Global mousemove & mouseup for state node dragging
  useEffect(() => {
    if (!draggingStateId) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const currentZoom = zoomRef.current;
      const currentPan = panRef.current;
      const newX = Math.round((e.clientX - rect.left - currentPan.x) / currentZoom - dragOffsetRef.current.x);
      const newY = Math.round((e.clientY - rect.top - currentPan.y) / currentZoom - dragOffsetRef.current.y);
      onUpdateStatePosition(draggingStateId, Math.max(20, newX), Math.max(20, newY));
    };

    const handleGlobalMouseUp = () => {
      setDraggingStateId(null);
    };

    window.addEventListener('mousemove', handleGlobalMouseMove, { passive: true });
    window.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [draggingStateId, onUpdateStatePosition]);

  // Global mousemove & mouseup for container (group) dragging
  useEffect(() => {
    if (!draggingGroupId || !groupDragStart) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const currentZoom = zoomRef.current;
      const currentPan = panRef.current;
      const currentX = (e.clientX - rect.left - currentPan.x) / currentZoom;
      const currentY = (e.clientY - rect.top - currentPan.y) / currentZoom;
      const dx = Math.round(currentX - groupDragStart.startX);
      const dy = Math.round(currentY - groupDragStart.startY);

      // 1. Move all member states
      if (groupDragStart.initialPositions.length > 0) {
        const updates = groupDragStart.initialPositions.map((p) => ({
          id: p.id,
          x: Math.max(20, p.x + dx),
          y: Math.max(20, p.y + dy),
        }));

        if (onBatchUpdateStatePositions) {
          onBatchUpdateStatePositions(updates);
        } else {
          updates.forEach((u) => onUpdateStatePosition(u.id, u.x, u.y));
        }
      }

      // 2. Move container itself (ensures empty containers move & coordinates stay synced)
      const newGroupX = Math.max(20, groupDragStart.initialGroupX + dx);
      const newGroupY = Math.max(20, groupDragStart.initialGroupY + dy);
      onUpdateGroupPosition?.(draggingGroupId, newGroupX, newGroupY);
    };

    const handleGlobalMouseUp = () => {
      setDraggingGroupId(null);
      setGroupDragStart(null);
    };

    window.addEventListener('mousemove', handleGlobalMouseMove, { passive: true });
    window.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [draggingGroupId, groupDragStart, onBatchUpdateStatePositions, onUpdateStatePosition, onUpdateGroupPosition]);

  // Mouse wheel: 2D coordinate plane panning + Ctrl/Cmd pinch-to-zoom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      if (e.ctrlKey || e.metaKey) {
        // Zoom centered around mouse pointer
        const rect = container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const currentZoom = zoomRef.current;
        const currentPan = panRef.current;

        const delta = -e.deltaY;
        const factor = delta > 0 ? 1.08 : 0.92;
        const targetZoom = Math.min(2.5, Math.max(0.35, Number((currentZoom * factor).toFixed(2))));

        if (targetZoom !== currentZoom) {
          const newPanX = Math.round(mouseX - (mouseX - currentPan.x) * (targetZoom / currentZoom));
          const newPanY = Math.round(mouseY - (mouseY - currentPan.y) * (targetZoom / currentZoom));

          setZoom(targetZoom);
          setPan({ x: newPanX, y: newPanY });
        }
      } else {
        // Trackpad 2D panning or mouse wheel scroll
        setPan((prev) => ({
          x: Math.round(prev.x - e.deltaX),
          y: Math.round(prev.y - e.deltaY),
        }));
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // Canvas mousedown event handler
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // Middle click always initiates panning anywhere
    if (e.button === 1) {
      e.preventDefault();
      startPanning(e.clientX, e.clientY);
      return;
    }

    if (e.button !== 0) return;

    // In Pan Tool mode or when holding Space, start panning anywhere
    if (isSpacePressed || activeTool === 'pan') {
      e.preventDefault();
      startPanning(e.clientX, e.clientY);
      return;
    }

    // Check if clicked element is an interactive card/button/container
    const target = e.target as HTMLElement;
    const isInteractive = target.closest(
      'button, input, textarea, select, [role="button"], [data-state-node="true"], [data-container="true"], [data-container-drag="true"], [id^="container-"], .group-container, .cursor-move, .cursor-grab'
    );

    if (isInteractive) {
      return;
    }

    // Empty background / open canvas space: start panning
    startPanning(e.clientX, e.clientY);
    setSelectedStateId(null);
    setSelectedTransitionId(null);
    setSelectedGroupId(null);
  };

  const startDragGroup = (
    e: React.MouseEvent,
    group: StateGroup,
    memberStateIds: string[]
  ) => {
    if (isSpacePressed || activeTool === 'pan' || e.button === 1) {
      e.preventDefault();
      startPanning(e.clientX, e.clientY);
      return;
    }

    e.stopPropagation();
    setSelectedGroupId(group.id);
    setSelectedStateId(null);
    setSelectedTransitionId(null);
    setDraggingGroupId(group.id);

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const clickCanvasX = (e.clientX - rect.left - pan.x) / zoom;
      const clickCanvasY = (e.clientY - rect.top - pan.y) / zoom;

      const initialPositions = memberStateIds.map((id) => {
        const s = positionedStates.find((st) => st.id === id);
        return {
          id,
          x: s?.x ?? 150,
          y: s?.y ?? 120,
        };
      });

      setGroupDragStart({
        startX: clickCanvasX,
        startY: clickCanvasY,
        initialGroupX: group.x ?? 120,
        initialGroupY: group.y ?? 120,
        initialPositions,
      });
    }
  };

  const startDragState = (e: React.MouseEvent, state: StateNode) => {
    if (isSpacePressed || activeTool === 'pan' || e.button === 1) {
      e.preventDefault();
      startPanning(e.clientX, e.clientY);
      return;
    }

    e.stopPropagation();
    setSelectedStateId(state.id);
    setSelectedTransitionId(null);
    setDraggingStateId(state.id);

    const sX = state.x ?? 150;
    const sY = state.y ?? 120;
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const clickCanvasX = (e.clientX - rect.left - pan.x) / zoom;
      const clickCanvasY = (e.clientY - rect.top - pan.y) / zoom;
      dragOffsetRef.current = {
        x: clickCanvasX - sX,
        y: clickCanvasY - sY,
      };
    }
  };

  // Fit & Center the entire model coordinate plane within the viewable area
  const handleFitToContent = () => {
    if (positionedStates.length === 0 || !containerRef.current) {
      setZoom(1);
      setPan({ x: 40, y: 40 });
      return;
    }

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    positionedStates.forEach((s) => {
      const sx = s.x ?? 150;
      const sy = s.y ?? 120;
      if (sx < minX) minX = sx;
      if (sx + 210 > maxX) maxX = sx + 210;
      if (sy < minY) minY = sy;
      if (sy + 160 > maxY) maxY = sy + 160;
    });

    const containerWidth = containerRef.current.clientWidth || 900;
    const containerHeight = containerRef.current.clientHeight || 600;
    const graphWidth = Math.max(200, maxX - minX + 120);
    const graphHeight = Math.max(200, maxY - minY + 120);

    const targetZoom = Math.min(
      1.1,
      Math.max(0.4, Math.min((containerWidth - 90) / graphWidth, (containerHeight - 90) / graphHeight))
    );

    const targetPanX = Math.round((containerWidth - (maxX + minX) * targetZoom) / 2);
    const targetPanY = Math.round((containerHeight - (maxY + minY) * targetZoom) / 2);

    setZoom(Number(targetZoom.toFixed(2)));
    setPan({ x: targetPanX, y: targetPanY });
  };

  // Force-Directed Auto Layout
  const handleAutoLayout = () => {
    const count = states.length;
    if (count === 0 || isLayoutRunning) return;

    setIsLayoutRunning(true);

    try {
      const newPositions = computeForceDirectedLayout(states, transitions, {
        idealDistance: 270,
        iterations: 140,
        padding: 90,
      });

      if (onBatchUpdateStatePositions) {
        onBatchUpdateStatePositions(newPositions);
      } else {
        newPositions.forEach((pos) => {
          onUpdateStatePosition(pos.id, pos.x, pos.y);
        });
      }

      // Auto-fit & center the viewport around the computed layout
      if (newPositions.length > 0 && containerRef.current) {
        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;

        newPositions.forEach((p) => {
          if (p.x < minX) minX = p.x;
          if (p.x + 210 > maxX) maxX = p.x + 210;
          if (p.y < minY) minY = p.y;
          if (p.y + 170 > maxY) maxY = p.y + 170;
        });

        const containerWidth = containerRef.current.clientWidth || 900;
        const containerHeight = containerRef.current.clientHeight || 600;
        const graphWidth = maxX - minX + 120;
        const graphHeight = maxY - minY + 120;

        const targetZoom = Math.min(
          1.05,
          Math.max(0.65, Math.min((containerWidth - 60) / graphWidth, (containerHeight - 60) / graphHeight))
        );

        const targetPanX = Math.round((containerWidth - (maxX + minX) * targetZoom) / 2);
        const targetPanY = Math.round((containerHeight - (maxY + minY) * targetZoom) / 2);

        setZoom(Number(targetZoom.toFixed(2)));
        setPan({ x: targetPanX, y: targetPanY });
      }
    } finally {
      setTimeout(() => {
        setIsLayoutRunning(false);
      }, 350);
    }
  };

  const gridDotColor = theme === 'light' ? '#D0D7DE' : theme === 'steel' ? '#323F51' : '#2D333B';
  const defaultArrowFill = theme === 'light' ? '#57606A' : theme === 'steel' ? '#7E90A6' : '#8B949E';
  const defaultStroke = theme === 'light' ? '#6E7781' : theme === 'steel' ? '#7E90A6' : '#8B949E';

  return (
    <div className="relative w-full h-full bg-[#0F1115] overflow-hidden flex">
      {/* Main Canvas Area */}
      <div
        id="canvas-bg"
        ref={containerRef}
        onMouseDown={handleCanvasMouseDown}
        className={`flex-1 h-full relative overflow-hidden select-none bg-[#0F1115] ${
          isPanning
            ? 'cursor-grabbing'
            : isSpacePressed || activeTool === 'pan'
            ? 'cursor-grab'
            : 'cursor-grab'
        }`}
        style={{
          backgroundImage: `radial-gradient(circle, ${gridDotColor} 1px, transparent 1px)`,
          backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
      >
        {/* Floating Canvas Controls */}
        <div className="absolute top-4 left-4 z-20 flex items-center space-x-1.5 bg-[#16191E]/95 backdrop-blur border border-[#2D333B] shadow-md rounded-lg p-1">
          <button
            id="btn-tool-select"
            title="Select Tool (V) - Click & drag state nodes or pan empty canvas"
            onClick={() => setActiveTool('select')}
            className={`p-1.5 rounded transition-colors ${
              activeTool === 'select' && !isSpacePressed
                ? 'bg-[#3B82F6] text-white'
                : 'text-[#C9D1D9] hover:bg-[#21262D]'
            }`}
          >
            <MousePointer className="w-4 h-4" />
          </button>
          <button
            id="btn-tool-pan"
            title="Pan Hand Tool (H / Hold Space) - Click & drag anywhere to move coordinate plane"
            onClick={() => setActiveTool('pan')}
            className={`p-1.5 rounded transition-colors ${
              activeTool === 'pan' || isSpacePressed
                ? 'bg-[#3B82F6] text-white'
                : 'text-[#C9D1D9] hover:bg-[#21262D]'
            }`}
          >
            <Hand className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-[#2D333B]" />
          <button
            id="btn-zoom-in"
            title="Zoom In (Ctrl+Scroll up)"
            onClick={() => setZoom((z) => Math.min(2.5, Number((z + 0.15).toFixed(2))))}
            className="p-1.5 text-[#C9D1D9] hover:bg-[#21262D] rounded transition-colors"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            id="btn-zoom-out"
            title="Zoom Out (Ctrl+Scroll down)"
            onClick={() => setZoom((z) => Math.max(0.35, Number((z - 0.15).toFixed(2))))}
            className="p-1.5 text-[#C9D1D9] hover:bg-[#21262D] rounded transition-colors"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            id="btn-fit-view"
            title="Fit Model to Viewable Area"
            onClick={handleFitToContent}
            className="p-1.5 text-[#C9D1D9] hover:bg-[#21262D] rounded transition-colors"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <button
            id="btn-reset-view"
            title="Reset Pan & Zoom (100% at 40,40)"
            onClick={() => {
              setZoom(1);
              setPan({ x: 40, y: 40 });
            }}
            className="p-1.5 text-[#C9D1D9] hover:bg-[#21262D] rounded transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-[#2D333B]" />
          <button
            id="btn-auto-layout"
            title="Auto-organize states using force-directed physics algorithm"
            onClick={handleAutoLayout}
            disabled={isLayoutRunning}
            className={`px-2.5 py-1 text-xs font-medium rounded flex items-center space-x-1.5 transition-all ${
              isLayoutRunning
                ? 'bg-[#3B82F6]/20 text-[#3B82F6] cursor-wait'
                : 'text-[#C9D1D9] hover:bg-[#21262D] hover:text-[#58a6ff]'
            }`}
          >
            <Sparkles className={`w-3.5 h-3.5 text-[#3B82F6] ${isLayoutRunning ? 'animate-spin' : ''}`} />
            <span>{isLayoutRunning ? 'Arranging...' : 'Auto-Layout'}</span>
          </button>
          <div className="w-px h-4 bg-[#2D333B]" />
          <button
            id="btn-toggle-heatmap"
            title="Toggle traversal frequency heatmap overlay based on execution logs"
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`px-2.5 py-1 text-xs font-medium rounded flex items-center space-x-1.5 transition-all ${
              showHeatmap
                ? 'bg-gradient-to-r from-amber-500/20 to-red-500/20 text-red-400 border border-red-500/40 shadow-xs'
                : 'text-[#C9D1D9] hover:bg-[#21262D] hover:text-amber-400'
            }`}
          >
            <Flame className={`w-3.5 h-3.5 ${showHeatmap ? 'text-red-400 fill-red-400 animate-pulse' : 'text-[#8B949E]'}`} />
            <span>Heat Map</span>
            {showHeatmap && heatmapData.totalExecutions > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-red-500/30 text-red-300 font-mono font-bold">
                {heatmapData.totalExecutions}
              </span>
            )}
          </button>

          {hasSimHistory && (
            <>
              <div className="w-px h-4 bg-[#2D333B]" />
              <button
                id="btn-toggle-time-travel"
                title={showTimeTravel ? 'Hide Time-Travel Debugger' : 'Show Time-Travel Debugger'}
                onClick={() => setShowTimeTravel(!showTimeTravel)}
                className={`px-2.5 py-1 text-xs font-medium rounded flex items-center space-x-1.5 transition-all ${
                  showTimeTravel
                    ? 'bg-[#3B82F6]/20 text-[#58a6ff] border border-[#3B82F6]/40 shadow-xs'
                    : 'text-[#8B949E] hover:bg-[#21262D] hover:text-[#C9D1D9]'
                }`}
              >
                <Clock className={`w-3.5 h-3.5 ${showTimeTravel ? 'text-[#58a6ff]' : 'text-[#8B949E]'}`} />
                <span>Time-Travel</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    showTimeTravel
                      ? 'bg-[#3B82F6]/30 text-[#58a6ff]'
                      : 'bg-[#21262D] text-[#8B949E]'
                  }`}
                >
                  {simState?.history?.length || 0}
                </span>
                {!showTimeTravel && (
                  <span className="text-[9px] px-1 py-0.2 rounded bg-[#21262D] text-[#8B949E]">
                    Hidden
                  </span>
                )}
              </button>
            </>
          )}
        </div>

        {/* Action buttons (Add State / Add Transition / New Container) */}
        <div className="absolute top-4 right-4 z-20 flex items-center space-x-2">
          {onAddGroup && (
            <button
              id="btn-add-container"
              onClick={onAddGroup}
              title="Create a new visual grouping container"
              className="inline-flex items-center space-x-1.5 text-xs font-medium text-[#C9D1D9] bg-[#16191E] hover:bg-[#21262D] border border-[#2D333B] hover:border-purple-500/50 shadow-sm rounded-lg px-3 py-1.5 transition-colors"
            >
              <Boxes className="w-3.5 h-3.5 text-purple-400" />
              <span>New Container</span>
            </button>
          )}
          <button
            id="btn-add-state"
            onClick={onAddState}
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-white bg-[#3B82F6] hover:bg-[#2563EB] border border-[#3B82F6] shadow-sm rounded-lg px-3 py-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add State</span>
          </button>
          <button
            id="btn-add-transition"
            onClick={onAddTransition}
            className="inline-flex items-center space-x-1.5 text-xs font-medium text-[#C9D1D9] bg-[#16191E] hover:bg-[#21262D] border border-[#2D333B] shadow-sm rounded-lg px-3 py-1.5 transition-colors"
          >
            <ArrowRight className="w-3.5 h-3.5 text-[#3B82F6]" />
            <span>Add Transition</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* LAYER 1 (z-0): GROUPING CONTAINERS (Rendered FIRST, under lines & labels) */}
        {/* ========================================================================= */}
        <div
          className="absolute inset-0 pointer-events-none z-0"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
        >
          <VisualContainerLayer
            groups={groups}
            states={positionedStates}
            selectedGroupId={selectedGroupId}
            draggingGroupId={draggingGroupId}
            onSelectGroup={setSelectedGroupId}
            onEditGroup={(g) => onEditGroup && onEditGroup(g)}
            onDeleteGroup={(gId) => onDeleteGroup && onDeleteGroup(gId)}
            onAddStateToGroup={(g) => onAddStateToGroup && onAddStateToGroup(g)}
            onStartDragGroup={startDragGroup}
            theme={theme}
          />
        </div>

        {/* ========================================================================= */}
        {/* LAYER 2 (z-10): SVG CONNECTION LINES - Rendered ABOVE container backgrounds*/}
        {/* ========================================================================= */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-10"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
        >
          <defs>
            {/* Standard arrowhead */}
            <marker
              id="arrowhead-default"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill={defaultArrowFill} />
            </marker>
            {/* Enabled arrowhead */}
            <marker
              id="arrowhead-enabled"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#3fb950" />
            </marker>
            {/* Selected arrowhead */}
            <marker
              id="arrowhead-selected"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#3B82F6" />
            </marker>
            {/* Scrubbed/historic transition arrowhead */}
            <marker
              id="arrowhead-scrubbed"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#D29922" />
            </marker>
            {/* Heat map arrowheads */}
            <marker
              id="arrowhead-heat-low"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#06B6D4" />
            </marker>
            <marker
              id="arrowhead-heat-med"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#F59E0B" />
            </marker>
            <marker
              id="arrowhead-heat-high"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#F97316" />
            </marker>
            <marker
              id="arrowhead-heat-hot"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#EF4444" />
            </marker>
            {/* Heat glow filter for hot edges */}
            <filter id="heat-glow-filter" x="-25%" y="-25%" width="150%" height="150%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Render Transitions */}
          {transitions.map((t) => {
            const from = positionedStates.find((s) => s.id === t.from_state_id);
            const to = positionedStates.find((s) => s.id === t.to_state_id);
            if (!from || !to) return null;

            const isSelected = selectedTransitionId === t.id;
            const isEnabled = enabledTransitions.some((et) => et.transition.id === t.id);
            const isScrubbedTransition =
              (activeSimStep?.transitionName && t.name === activeSimStep.transitionName) ||
              (prevSimStep && activeSimStep && t.from_state_id === prevSimStep.stateId && t.to_state_id === activeSimStep.stateId);
            const isHistoricScrub = effectiveScrubIndex !== null && effectiveScrubIndex < (simState?.history?.length || 1) - 1;

            // Heat Map computation for this transition
            const transVisitCount = heatmapData.transitionCounts[t.id] || 0;
            const isHeatActive = showHeatmap && transVisitCount >= heatmapThreshold && transVisitCount > 0;
            const heatStyle = isHeatActive
              ? getHeatStyle(transVisitCount, heatmapData.maxTransitionCount)
              : null;

            // Coordinates
            const fx = (from.x ?? 150) + 100; // center of node (200w / 2)
            const fy = (from.y ?? 120) + 40; // center of node (80h / 2)
            const tx = (to.x ?? 150) + 100;
            const ty = (to.y ?? 120) + 40;

            const isSelfLoop = from.id === to.id;

            let pathD = '';
            let midX = 0;
            let midY = 0;

            if (isSelfLoop) {
              // Self loop curve
              pathD = `M ${fx - 30} ${fy - 40} C ${fx - 50} ${fy - 100}, ${fx + 50} ${fy - 100}, ${fx + 30} ${fy - 40}`;
              midX = fx;
              midY = fy - 80;
            } else {
              // Smooth cubic bezier
              const dx = tx - fx;
              const dy = ty - fy;
              const cx1 = fx + dx * 0.4 - dy * 0.15;
              const cy1 = fy + dy * 0.4 + dx * 0.15;
              const cx2 = fx + dx * 0.6 - dy * 0.15;
              const cy2 = fy + dy * 0.6 + dx * 0.15;

              pathD = `M ${fx} ${fy} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${tx} ${ty}`;
              midX = (fx + tx) / 2 - (dy * 0.15);
              midY = (fy + ty) / 2 + (dx * 0.15);
            }

            const strokeColor = isSelected
              ? '#3B82F6'
              : isScrubbedTransition && isHistoricScrub
              ? '#D29922'
              : isEnabled
              ? '#3fb950'
              : heatStyle
              ? heatStyle.color
              : defaultStroke;

            const markerId = isSelected
              ? 'url(#arrowhead-selected)'
              : isScrubbedTransition && isHistoricScrub
              ? 'url(#arrowhead-scrubbed)'
              : isEnabled
              ? 'url(#arrowhead-enabled)'
              : heatStyle
              ? heatStyle.intensity >= 0.88
                ? 'url(#arrowhead-heat-hot)'
                : heatStyle.intensity >= 0.65
                ? 'url(#arrowhead-heat-high)'
                : heatStyle.intensity >= 0.3
                ? 'url(#arrowhead-heat-med)'
                : 'url(#arrowhead-heat-low)'
              : 'url(#arrowhead-default)';

            const strokeWidth = isSelected
              ? '2.5'
              : isEnabled
              ? '2.5'
              : heatStyle
              ? String(heatStyle.strokeWidth)
              : '1.75';

            return (
              <g key={t.id} className="pointer-events-auto cursor-pointer">
                {/* Heat aura underlay if active */}
                {heatStyle && (
                  <path
                    d={pathD}
                    fill="none"
                    stroke={heatStyle.color}
                    strokeWidth={heatStyle.strokeWidth + 5}
                    strokeOpacity={heatStyle.intensity >= 0.8 ? '0.45' : '0.28'}
                    strokeLinecap="round"
                    filter="url(#heat-glow-filter)"
                  />
                )}

                {/* Invisible wider path for easy clicking */}
                <path
                  d={pathD}
                  fill="none"
                  stroke="transparent"
                  strokeWidth="18"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedTransitionId(t.id);
                    setSelectedStateId(null);
                  }}
                />

                {/* Visible transition line */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  strokeDasharray={t.weak_fairness || t.strong_fairness ? '4 2' : undefined}
                  markerEnd={markerId}
                  className="transition-colors duration-200"
                />
              </g>
            );
          })}
        </svg>

        {/* ========================================================================= */}
        {/* LAYER 3 (z-20): STATE NODES - Draggable state cards above lines & containers*/}
        {/* ========================================================================= */}
        <div
          className="absolute inset-0 pointer-events-none z-20"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
        >
          {positionedStates.map((s) => {
            const isSelected = selectedStateId === s.id;
            const isCurrentSim = activeCurrentStateId === s.id;
            const stateGroup = groups.find(
              (g) => (g.state_ids && g.state_ids.includes(s.id)) || s.group_id === g.id
            );
            const groupColor = stateGroup
              ? GROUP_COLORS.find((c) => c.id === stateGroup.color) || GROUP_COLORS[0]
              : null;

            // Heat Map traversal metrics for this state node
            const stateVisitCount = heatmapData.stateCounts[s.id] || 0;
            const isNodeHeatActive = showHeatmap && stateVisitCount >= heatmapThreshold && stateVisitCount > 0;
            const nodeHeatStyle = isNodeHeatActive
              ? getHeatStyle(stateVisitCount, heatmapData.maxStateCount)
              : null;

            return (
              <div
                key={s.id}
                id={`state-node-${s.id}`}
                data-state-node="true"
                onMouseDown={(e) => startDragState(e, s)}
                style={{
                  left: `${s.x ?? 150}px`,
                  top: `${s.y ?? 120}px`,
                  width: '200px',
                  boxShadow: isCurrentSim
                    ? undefined
                    : isSelected
                    ? undefined
                    : nodeHeatStyle
                    ? nodeHeatStyle.boxShadow
                    : undefined,
                  borderColor: isCurrentSim
                    ? undefined
                    : isSelected
                    ? undefined
                    : nodeHeatStyle
                    ? nodeHeatStyle.borderColor
                    : undefined,
                }}
                className={`absolute pointer-events-auto rounded-xl border bg-[#16191E] p-3 select-none ${
                  isSpacePressed || activeTool === 'pan'
                    ? 'cursor-grab active:cursor-grabbing'
                    : 'cursor-move'
                } ${
                  draggingStateId === s.id ? 'transition-none' : 'transition-all duration-300 ease-out'
                } ${
                  isCurrentSim
                    ? effectiveScrubIndex !== null && effectiveScrubIndex < (simState?.history?.length || 1) - 1
                      ? 'ring-4 ring-[#D29922]/40 border-[#D29922] bg-[#D29922]/10 shadow-[0_0_25px_rgba(210,153,34,0.35)]'
                      : 'ring-4 ring-[#3B82F6]/30 border-[#3B82F6] bg-[#3B82F6]/10 shadow-[0_0_20px_rgba(59,130,246,0.3)]'
                    : isSelected
                    ? 'ring-2 ring-[#3B82F6] border-[#3B82F6] shadow-md'
                    : nodeHeatStyle
                    ? 'border-2'
                    : s.is_initial
                    ? 'border-emerald-500/70 hover:border-emerald-400'
                    : s.is_terminal
                    ? 'border-[#8B949E] border-dashed hover:border-[#C9D1D9]'
                    : 'border-[#2D333B] hover:border-[#3B82F6]/60'
                }`}
              >
                {/* Node Header */}
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center space-x-1.5 min-w-0">
                    {s.is_initial && (
                      <span
                        title="Initial State"
                        className="w-2 h-2 rounded-full bg-[#3fb950] flex-shrink-0"
                      />
                    )}
                    {s.is_terminal && (
                      <span
                        title="Terminal State"
                        className="w-2 h-2 rounded-full border border-[#8B949E] flex-shrink-0"
                      />
                    )}
                    <span className="font-semibold text-xs text-[#F0F6FC] truncate">
                      {s.name}
                    </span>
                  </div>

                  {isCurrentSim ? (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full animate-pulse border ${
                        effectiveScrubIndex !== null && effectiveScrubIndex < (simState?.history?.length || 1) - 1
                          ? 'text-[#D29922] bg-[#D29922]/20 border-[#D29922]/40'
                          : 'text-[#3B82F6] bg-[#3B82F6]/20 border-[#3B82F6]/40'
                      }`}
                    >
                      {effectiveScrubIndex !== null && effectiveScrubIndex < (simState?.history?.length || 1) - 1
                        ? `STEP ${effectiveScrubIndex}`
                        : 'ACTIVE'}
                    </span>
                  ) : nodeHeatStyle ? (
                    <span
                      className="text-[10px] font-bold font-mono px-1.5 py-0.2 rounded-full flex items-center space-x-0.5 border"
                      style={{
                        backgroundColor: nodeHeatStyle.labelBg,
                        color: nodeHeatStyle.labelTextColor,
                        borderColor: nodeHeatStyle.borderColor,
                      }}
                      title={`Traversed ${stateVisitCount} times in execution history`}
                    >
                      <Flame className="w-2.5 h-2.5 fill-current" />
                      <span>{stateVisitCount}x</span>
                    </span>
                  ) : null}
                </div>

                {/* Visual Container Membership Badge */}
                {stateGroup && (
                  <div className="mb-1.5 flex items-center">
                    <span
                      className="inline-flex items-center space-x-1 text-[9px] px-1.5 py-0.5 rounded font-medium bg-[#0F1115] border border-[#2D333B] text-[#8B949E] truncate max-w-[170px]"
                      title={`Container: ${stateGroup.name}`}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: groupColor?.accent || '#3B82F6' }}
                      />
                      <span className="truncate">{stateGroup.name}</span>
                    </span>
                  </div>
                )}

                {/* Description or Variables */}
                {s.description && (
                  <p className="text-[11px] text-[#8B949E] truncate mb-1.5">
                    {s.description}
                  </p>
                )}

                {/* State Variable Assignments */}
                {s.variable_assignments && Object.keys(s.variable_assignments).length > 0 && (
                  <div className="mt-1 pt-1.5 border-t border-[#2D333B] flex flex-wrap gap-1">
                    {Object.entries(s.variable_assignments).map(([k, v]) => (
                      <span
                        key={k}
                        className="text-[9px] font-mono bg-[#0A0C10] text-[#8B949E] border border-[#2D333B] px-1.5 py-0.5 rounded"
                      >
                        {k}={String(v)}
                      </span>
                    ))}
                  </div>
                )}

                {/* Badges footer */}
                <div className="flex items-center justify-between mt-2 pt-1 border-t border-[#2D333B] text-[10px] text-[#8B949E]">
                  <span>
                    {s.is_initial ? 'Initial' : s.is_terminal ? 'Terminal' : 'Intermediate'}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditState(s);
                    }}
                    className="text-[#8B949E] hover:text-[#3B82F6] p-0.5"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* ========================================================================= */}
        {/* LAYER 4 (z-30): FOREMOST CONNECTION LABELS - Rendered ON TOP of everything*/}
        {/* NEVER BEHIND CONTAINERS, CRISP HIGH-CONTRAST SOLID BADGES WITH ACTIONS    */}
        {/* ========================================================================= */}
        <div
          className="absolute inset-0 pointer-events-none z-30"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
        >
          {transitions.map((t) => {
            const from = positionedStates.find((s) => s.id === t.from_state_id);
            const to = positionedStates.find((s) => s.id === t.to_state_id);
            if (!from || !to) return null;

            const isSelected = selectedTransitionId === t.id;
            const isEnabled = enabledTransitions.some((et) => et.transition.id === t.id);

            // Heat Map computation for this transition
            const transVisitCount = heatmapData.transitionCounts[t.id] || 0;
            const isHeatActive = showHeatmap && transVisitCount >= heatmapThreshold && transVisitCount > 0;
            const heatStyle = isHeatActive
              ? getHeatStyle(transVisitCount, heatmapData.maxTransitionCount)
              : null;

            // Coordinates
            const fx = (from.x ?? 150) + 100;
            const fy = (from.y ?? 120) + 40;
            const tx = (to.x ?? 150) + 100;
            const ty = (to.y ?? 120) + 40;
            const isSelfLoop = from.id === to.id;

            let midX = 0;
            let midY = 0;

            if (isSelfLoop) {
              midX = fx;
              midY = fy - 80;
            } else {
              const dx = tx - fx;
              const dy = ty - fy;
              midX = (fx + tx) / 2 - (dy * 0.15);
              midY = (fy + ty) / 2 + (dx * 0.15);
            }

            return (
              <div
                key={`trans-label-${t.id}`}
                className="absolute pointer-events-auto select-none"
                style={{
                  left: `${midX}px`,
                  top: `${midY}px`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isEnabled) {
                      onFireTransition(t, t.trigger);
                    } else {
                      setSelectedTransitionId(t.id);
                      setSelectedStateId(null);
                    }
                  }}
                  title={
                    isEnabled
                      ? `Click to fire transition: ${t.name}${t.trigger ? ` (Trigger: ${t.trigger})` : ''}`
                      : `Transition: ${t.name}${t.trigger ? ` [Trigger: ${t.trigger}]` : ''} (Guard: ${t.guard_expression || 'none'})${
                          transVisitCount > 0 ? ` • Traversed ${transVisitCount} times` : ''
                        }`
                  }
                  className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border shadow-xl transition-all cursor-pointer whitespace-nowrap ${
                    isEnabled
                      ? 'bg-[#238636] text-white border-emerald-400 hover:bg-[#2ea043] hover:scale-105 ring-2 ring-emerald-500/40'
                      : isSelected
                      ? 'bg-[#1f6feb] text-white border-[#58a6ff] ring-2 ring-blue-500/50 shadow-blue-900/50'
                      : heatStyle
                      ? 'border shadow-md'
                      : 'bg-[#16191E] text-[#C9D1D9] border-[#30363D] hover:border-[#8B949E] hover:text-white'
                  }`}
                  style={
                    !isEnabled && !isSelected && heatStyle
                      ? {
                          backgroundColor: heatStyle.labelBg,
                          borderColor: heatStyle.borderColor,
                          color: heatStyle.labelTextColor,
                          boxShadow: heatStyle.boxShadow,
                        }
                      : undefined
                  }
                >
                  {isEnabled && <Play className="w-2.5 h-2.5 text-white fill-white shrink-0" />}
                  {heatStyle && !isEnabled && (
                    <Flame
                      className="w-2.5 h-2.5 shrink-0 fill-current"
                      style={{ color: heatStyle.color }}
                    />
                  )}
                  <span className="font-semibold">{t.name}</span>
                  {heatStyle ? (
                    <span
                      className="text-[9px] font-mono font-bold px-1 rounded"
                      style={{
                        backgroundColor: 'rgba(0,0,0,0.3)',
                        color: heatStyle.color,
                      }}
                    >
                      {transVisitCount}x
                    </span>
                  ) : (
                    <>
                      {t.trigger && (
                        <span className="text-[9px] text-[#e3b341] font-mono font-semibold">
                          ⚡{t.trigger}
                        </span>
                      )}
                      {t.guard_expression && !t.trigger && (
                        <span className="text-[9px] text-[#8B949E] font-mono">[{t.guard_expression.slice(0, 8)}...]</span>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Real-time Coordinate Plane Status & Navigation Pill */}
        <div className="absolute bottom-4 left-4 z-20 flex items-center space-x-2.5 bg-[#16191E]/95 backdrop-blur border border-[#2D333B] shadow-md rounded-lg px-2.5 py-1.5 text-xs text-[#8B949E] select-none pointer-events-auto">
          <div className="flex items-center space-x-1.5 font-mono text-[11px] text-[#C9D1D9]">
            <span className="text-[#8B949E]">Plane:</span>
            <span>({pan.x}, {pan.y})</span>
            <span className="text-[#2D333B]">|</span>
            <span className="text-[#8B949E]">Zoom:</span>
            <span className="text-[#58a6ff] font-semibold">{Math.round(zoom * 100)}%</span>
          </div>
          <div className="w-px h-3.5 bg-[#2D333B]" />
          <button
            id="btn-nav-fit-view"
            type="button"
            onClick={handleFitToContent}
            className="text-[11px] font-medium text-[#C9D1D9] hover:text-white transition-colors"
            title="Fit all states into the viewable area"
          >
            Fit View
          </button>
          <span className="text-[10px] text-[#8B949E]/70 hidden md:inline">
            • Drag canvas or hold Space to pan plane • Scroll to pan • Ctrl+Scroll to zoom
          </span>
        </div>
      </div>

      {/* Right-Side Inspector Drawer when an item is selected */}
      {(selectedState || selectedTransition) && (
        <aside className="w-80 border-l border-[#2D333B] bg-[#16191E] h-full overflow-y-auto p-4 z-30 shadow-2xl">
          {selectedState && (
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#2D333B]">
                <div className="flex items-center space-x-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]" />
                  <h3 className="font-semibold text-sm text-[#F0F6FC]">State Inspector</h3>
                </div>
                <button
                  onClick={() => setSelectedStateId(null)}
                  className="text-xs text-[#8B949E] hover:text-[#C9D1D9]"
                >
                  Close
                </button>
              </div>

              <div className="mt-4 space-y-3 text-xs">
                <div>
                  <label className="text-[#8B949E] font-medium">State Name</label>
                  <p className="font-semibold text-[#F0F6FC] text-sm mt-0.5">{selectedState.name}</p>
                </div>

                {selectedState.description && (
                  <div>
                    <label className="text-[#8B949E] font-medium">Description</label>
                    <p className="text-[#C9D1D9] mt-0.5">{selectedState.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div className="p-2 bg-[#0F1115] rounded border border-[#2D333B]">
                    <span className="text-[11px] text-[#8B949E] block">Is Initial</span>
                    <span className={`font-semibold ${selectedState.is_initial ? 'text-[#3fb950]' : 'text-[#8B949E]'}`}>
                      {selectedState.is_initial ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="p-2 bg-[#0F1115] rounded border border-[#2D333B]">
                    <span className="text-[11px] text-[#8B949E] block">Is Terminal</span>
                    <span className={`font-semibold ${selectedState.is_terminal ? 'text-[#F0F6FC]' : 'text-[#8B949E]'}`}>
                      {selectedState.is_terminal ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>

                {/* Traversal Frequency Analytics */}
                <div className="p-2.5 bg-[#0F1115] rounded border border-[#2D333B] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[#8B949E] flex items-center space-x-1">
                      <Flame className="w-3.5 h-3.5 text-amber-400" />
                      <span>Execution Heat</span>
                    </span>
                    <span className="font-mono font-bold text-[#F0F6FC]">
                      {heatmapData.stateCounts[selectedState.id] || 0} visits
                    </span>
                  </div>
                  <div className="w-full bg-[#21262D] rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-amber-500 to-red-500 h-1.5 rounded-full transition-all duration-300"
                      style={{
                        width: `${
                          heatmapData.maxStateCount > 0
                            ? Math.round(((heatmapData.stateCounts[selectedState.id] || 0) / heatmapData.maxStateCount) * 100)
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-[#8B949E]">
                    <span>Relative activity:</span>
                    <span className="font-mono">
                      {heatmapData.maxStateCount > 0
                        ? Math.round(((heatmapData.stateCounts[selectedState.id] || 0) / heatmapData.maxStateCount) * 100)
                        : 0}% of max
                    </span>
                  </div>
                </div>

                {selectedState.variable_assignments && (
                  <div>
                    <label className="text-[#8B949E] font-medium">Variable Assignments</label>
                    <pre className="mt-1 p-2 bg-[#0A0C10] text-[#C9D1D9] border border-[#2D333B] rounded text-[11px] font-mono overflow-x-auto">
                      {JSON.stringify(selectedState.variable_assignments, null, 2)}
                    </pre>
                  </div>
                )}

                <div className="pt-4 border-t border-[#2D333B] flex space-x-2">
                  <button
                    onClick={() => onEditState(selectedState)}
                    className="flex-1 py-1.5 text-center text-xs font-medium text-white bg-[#3B82F6] hover:bg-[#2563EB] border border-[#3B82F6] rounded-md transition-colors"
                  >
                    Edit State
                  </button>
                  <button
                    onClick={() => {
                      onDeleteState(selectedState.id);
                      setSelectedStateId(null);
                    }}
                    className="p-1.5 text-[#8B949E] hover:text-[#f85149] bg-[#0F1115] border border-[#2D333B] hover:border-[#f85149]/40 rounded-md"
                    title="Delete State"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {selectedTransition && (
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#2D333B]">
                <div className="flex items-center space-x-2">
                  <ArrowRight className="w-4 h-4 text-[#3B82F6]" />
                  <h3 className="font-semibold text-sm text-[#F0F6FC]">Transition Inspector</h3>
                </div>
                <button
                  onClick={() => setSelectedTransitionId(null)}
                  className="text-xs text-[#8B949E] hover:text-[#C9D1D9]"
                >
                  Close
                </button>
              </div>

              <div className="mt-4 space-y-3 text-xs">
                <div>
                  <label className="text-[#8B949E] font-medium">Transition Name</label>
                  <p className="font-semibold text-[#F0F6FC] text-sm mt-0.5">{selectedTransition.name}</p>
                </div>

                <div className="p-2.5 bg-[#0F1115] rounded border border-[#2D333B] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[#8B949E]">From:</span>
                    <span className="font-medium text-[#C9D1D9]">
                      {positionedStates.find((s) => s.id === selectedTransition.from_state_id)?.name}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#8B949E]">To:</span>
                    <span className="font-medium text-[#C9D1D9]">
                      {positionedStates.find((s) => s.id === selectedTransition.to_state_id)?.name}
                    </span>
                  </div>
                </div>

                {/* Traversal Frequency Analytics */}
                <div className="p-2.5 bg-[#0F1115] rounded border border-[#2D333B] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[#8B949E] flex items-center space-x-1">
                      <Flame className="w-3.5 h-3.5 text-amber-400" />
                      <span>Execution Heat</span>
                    </span>
                    <span className="font-mono font-bold text-[#F0F6FC]">
                      {heatmapData.transitionCounts[selectedTransition.id] || 0} firings
                    </span>
                  </div>
                  <div className="w-full bg-[#21262D] rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-amber-500 to-red-500 h-1.5 rounded-full transition-all duration-300"
                      style={{
                        width: `${
                          heatmapData.maxTransitionCount > 0
                            ? Math.round(((heatmapData.transitionCounts[selectedTransition.id] || 0) / heatmapData.maxTransitionCount) * 100)
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-[#8B949E]">
                    <span>Relative frequency:</span>
                    <span className="font-mono">
                      {heatmapData.maxTransitionCount > 0
                        ? Math.round(((heatmapData.transitionCounts[selectedTransition.id] || 0) / heatmapData.maxTransitionCount) * 100)
                        : 0}% of max
                    </span>
                  </div>
                </div>

                {selectedTransition.guard_expression && (
                  <div>
                    <label className="text-[#8B949E] font-medium">Guard Expression</label>
                    <div className="mt-1 p-2 bg-[#0A0C10] rounded text-[11px] font-mono text-[#C9D1D9] border border-[#2D333B]">
                      {selectedTransition.guard_expression}
                    </div>
                  </div>
                )}

                {selectedTransition.action && (
                  <div>
                    <label className="text-[#8B949E] font-medium">Action</label>
                    <pre className="mt-1 p-2 bg-[#0A0C10] text-[#C9D1D9] border border-[#2D333B] rounded text-[11px] font-mono overflow-x-auto">
                      {typeof selectedTransition.action === 'string'
                        ? selectedTransition.action
                        : JSON.stringify(selectedTransition.action, null, 2)}
                    </pre>
                  </div>
                )}

                <div className="flex space-x-2 pt-2">
                  {selectedTransition.weak_fairness && (
                    <span className="px-2 py-0.5 bg-purple-500/15 text-purple-400 border border-purple-500/30 rounded text-[10px] font-mono font-medium">
                      Weak Fairness (WF)
                    </span>
                  )}
                  {selectedTransition.strong_fairness && (
                    <span className="px-2 py-0.5 bg-[#3B82F6]/15 text-[#58a6ff] border border-[#3B82F6]/30 rounded text-[10px] font-mono font-medium">
                      Strong Fairness (SF)
                    </span>
                  )}
                </div>

                <div className="pt-4 border-t border-[#2D333B] flex space-x-2">
                  <button
                    onClick={() => onEditTransition(selectedTransition)}
                    className="flex-1 py-1.5 text-center text-xs font-medium text-white bg-[#3B82F6] hover:bg-[#2563EB] border border-[#3B82F6] rounded-md transition-colors"
                  >
                    Edit Transition
                  </button>
                  <button
                    onClick={() => {
                      onDeleteTransition(selectedTransition.id);
                      setSelectedTransitionId(null);
                    }}
                    className="p-1.5 text-[#8B949E] hover:text-[#f85149] bg-[#0F1115] border border-[#2D333B] hover:border-[#f85149]/40 rounded-md"
                    title="Delete Transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </aside>
      )}

      {/* Heat Map Overlay Legend & Hotspot Diagnostics */}
      <HeatMapOverlayLegend
        heatmapData={heatmapData}
        isActive={showHeatmap}
        onToggleActive={() => setShowHeatmap(!showHeatmap)}
        minThreshold={heatmapThreshold}
        onChangeThreshold={setHeatmapThreshold}
        onSelectHotspotState={(sId) => {
          setSelectedStateId(sId);
          setSelectedTransitionId(null);
        }}
        onSelectHotspotTransition={(tId) => {
          setSelectedTransitionId(tId);
          setSelectedStateId(null);
        }}
      />

      {/* Time-Travel Debug Slider on VisualCanvas */}
      {hasSimHistory && (
        showTimeTravel ? (
          <TimeTravelSlider
            simState={simState!}
            states={states}
            transitions={transitions}
            scrubIndex={effectiveScrubIndex}
            onScrubStep={handleScrub}
            onBranchFromStep={onBranchFromStep}
            onResetSimulation={onResetSimulation}
            onClose={() => setShowTimeTravel(false)}
          />
        ) : (
          <div
            id="time-travel-collapsed-bar"
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center space-x-2.5 bg-[#16191E]/95 hover:bg-[#21262D]/95 backdrop-blur-md border border-[#2D333B] hover:border-[#3B82F6]/50 shadow-2xl rounded-full px-4 py-1.5 text-xs text-[#C9D1D9] transition-all pointer-events-auto select-none"
          >
            <div className="flex items-center space-x-2">
              <Clock className="w-3.5 h-3.5 text-[#3B82F6]" />
              <span className="font-semibold text-[#F0F6FC]">Time-Travel Debugger</span>
              <span className="text-[10px] font-mono text-[#8B949E] bg-[#0F1115] px-1.5 py-0.5 rounded-full border border-[#2D333B]">
                {simState?.history?.length || 0} steps
              </span>
              {effectiveScrubIndex !== null && (
                <span className="text-[10px] font-semibold text-[#D29922] bg-[#D29922]/15 px-2 py-0.5 rounded-full border border-[#D29922]/30">
                  Inspecting Step {effectiveScrubIndex}
                </span>
              )}
            </div>

            <div className="w-px h-3.5 bg-[#2D333B]" />

            <button
              id="btn-restore-time-travel"
              type="button"
              onClick={() => setShowTimeTravel(true)}
              className="inline-flex items-center space-x-1 font-semibold text-xs text-[#58a6ff] hover:text-[#79b8ff] transition-colors"
              title="Open Time-Travel Debugger"
            >
              <span>Show Debugger</span>
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
          </div>
        )
      )}
    </div>
  );
};
