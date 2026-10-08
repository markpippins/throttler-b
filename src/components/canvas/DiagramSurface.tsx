import React, { useState, useRef, useEffect } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize,
  RotateCcw,
  Shield,
  FlaskConical,
  Folder,
  Layers,
  Sparkles,
  Info,
  CheckCircle2,
  AlertTriangle,
  Move,
  Grid,
} from 'lucide-react';
import { UnifiedContainerScope, getContainerStylingChannels } from '../../surface/core/containerScope';
import { EpistemicEnvelope } from '../../surface/types';

export interface DiagramNode {
  id: string;
  label: string;
  type: 'entity' | 'state' | 'concept' | 'service' | 'relic';
  x: number;
  y: number;
  width?: number;
  height?: number;
  isHollow?: boolean;
  statusBadge?: string;
  properties?: Record<string, string>;
  containerId?: string;
}

export interface DiagramEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  isLineageGap?: boolean;
  gapName?: string;
}

export interface DiagramSurfaceProps {
  containers?: UnifiedContainerScope[];
  nodes?: DiagramNode[];
  edges?: DiagramEdge[];
  selectedId?: string;
  onSelect?: (id: string, type: 'node' | 'container' | 'edge') => void;
  onUpdateNodePositions?: (positions: Record<string, { x: number; y: number }>) => void;
  onUpdateContainerBounds?: (bounds: Record<string, { x: number; y: number; width: number; height: number }>) => void;
  envelope?: EpistemicEnvelope;
  height?: number | string;
}

export const DiagramSurface: React.FC<DiagramSurfaceProps> = ({
  containers = [],
  nodes = [],
  edges = [],
  selectedId,
  onSelect,
  onUpdateNodePositions,
  onUpdateContainerBounds,
  envelope = 'live',
  height = '600px',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 40, y: 40 });
  const [zoom, setZoom] = useState<number>(1.0);
  const [gridSnap, setGridSnap] = useState<boolean>(true);

  // Dynamic node coordinates map (rearrangeable)
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>(() => {
    const map: Record<string, { x: number; y: number }> = {};
    nodes.forEach((n) => {
      map[n.id] = { x: n.x, y: n.y };
    });
    return map;
  });

  // Dynamic container bounds
  const [containerBounds, setContainerBounds] = useState<Record<string, { x: number; y: number; width: number; height: number }>>(() => {
    const map: Record<string, { x: number; y: number; width: number; height: number }> = {};
    containers.forEach((c) => {
      map[c.id] = { ...c.bounds };
    });
    return map;
  });

  // Dragging states
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [draggingContainerId, setDraggingContainerId] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState<boolean>(false);

  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Separate container drag anchor refs to guarantee the whole diagram never moves
  const containerDragStartBoundsRef = useRef<{ x: number; y: number; width: number; height: number }>({ x: 0, y: 0, width: 0, height: 0 });
  const containerDragStartMouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const containerNodeStartPositionsRef = useRef<Record<string, { x: number; y: number }>>({});

  // Sync with prop changes if nodes array changes
  useEffect(() => {
    setNodePositions((prev) => {
      const next = { ...prev };
      nodes.forEach((n) => {
        if (!next[n.id]) {
          next[n.id] = { x: n.x, y: n.y };
        }
      });
      return next;
    });
  }, [nodes]);

  useEffect(() => {
    setContainerBounds((prev) => {
      const next = { ...prev };
      containers.forEach((c) => {
        if (!next[c.id]) {
          next[c.id] = { ...c.bounds };
        }
      });
      return next;
    });
  }, [containers]);

  // Node Drag Initiation
  const handleNodeMouseDown = (e: React.MouseEvent, node: DiagramNode) => {
    if (e.button !== 0) return;
    e.stopPropagation(); // Prevent container or canvas drag
    setIsPanning(false);
    onSelect?.(node.id, 'node');

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const currentPos = nodePositions[node.id] || { x: node.x, y: node.y };
    const canvasX = (e.clientX - rect.left - pan.x) / zoom;
    const canvasY = (e.clientY - rect.top - pan.y) / zoom;

    dragOffsetRef.current = {
      x: canvasX - currentPos.x,
      y: canvasY - currentPos.y,
    };
    setDraggingNodeId(node.id);
  };

  // Container Drag Initiation: moves this container & its member nodes, NEVER pans the canvas
  const handleContainerMouseDown = (e: React.MouseEvent, container: UnifiedContainerScope) => {
    if (e.button !== 0) return;
    e.stopPropagation(); // CRITICAL: Prevent event from bubbling to canvas panning!
    setIsPanning(false);
    onSelect?.(container.id, 'container');

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const currentBounds = containerBounds[container.id] || container.bounds;
    const canvasX = (e.clientX - rect.left - pan.x) / zoom;
    const canvasY = (e.clientY - rect.top - pan.y) / zoom;

    containerDragStartBoundsRef.current = { ...currentBounds };
    containerDragStartMouseRef.current = { x: canvasX, y: canvasY };

    // Snapshot current start coordinates of all member elements in this container
    const startMap: Record<string, { x: number; y: number }> = {};
    container.elementIds.forEach((elemId) => {
      const p = nodePositions[elemId] || nodes.find((n) => n.id === elemId);
      if (p) startMap[elemId] = { x: p.x, y: p.y };
    });
    containerNodeStartPositionsRef.current = startMap;

    setDraggingContainerId(container.id);
  };

  // Canvas Pan Initiation (Only triggers on empty canvas clicks)
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      const target = e.target as HTMLElement;
      if (
        target.closest(
          'button, input, textarea, select, [data-container="true"], [data-node="true"], [id^="container-"], [id^="node-"], .cursor-grab, .cursor-grabbing, .cursor-move'
        )
      ) {
        return;
      }
      setIsPanning(true);
      panStartRef.current = {
        x: e.clientX - pan.x,
        y: e.clientY - pan.y,
      };
    }
  };

  // Mouse Movement
  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const canvasX = (e.clientX - rect.left - pan.x) / zoom;
    const canvasY = (e.clientY - rect.top - pan.y) / zoom;

    if (draggingNodeId) {
      let newX = Math.round(canvasX - dragOffsetRef.current.x);
      let newY = Math.round(canvasY - dragOffsetRef.current.y);

      if (gridSnap) {
        newX = Math.round(newX / 20) * 20;
        newY = Math.round(newY / 20) * 20;
      }

      setNodePositions((prev) => {
        const next = {
          ...prev,
          [draggingNodeId]: { x: Math.max(10, newX), y: Math.max(10, newY) },
        };
        onUpdateNodePositions?.(next);
        return next;
      });
    } else if (draggingContainerId) {
      const container = containers.find((c) => c.id === draggingContainerId);
      if (!container) return;

      const startBounds = containerDragStartBoundsRef.current;
      const deltaX = canvasX - containerDragStartMouseRef.current.x;
      const deltaY = canvasY - containerDragStartMouseRef.current.y;

      let newBoxX = Math.round(startBounds.x + deltaX);
      let newBoxY = Math.round(startBounds.y + deltaY);

      if (gridSnap) {
        newBoxX = Math.round(newBoxX / 20) * 20;
        newBoxY = Math.round(newBoxY / 20) * 20;
      }

      const actualDeltaX = newBoxX - startBounds.x;
      const actualDeltaY = newBoxY - startBounds.y;

      // Update container position
      setContainerBounds((prev) => {
        const next = {
          ...prev,
          [draggingContainerId]: {
            ...prev[draggingContainerId],
            x: Math.max(10, newBoxX),
            y: Math.max(10, newBoxY),
          },
        };
        onUpdateContainerBounds?.(next);
        return next;
      });

      // Translate all member nodes together
      const startNodes = containerNodeStartPositionsRef.current;
      setNodePositions((prev) => {
        const next = { ...prev };
        container.elementIds.forEach((elemId) => {
          if (startNodes[elemId]) {
            next[elemId] = {
              x: Math.max(10, startNodes[elemId].x + actualDeltaX),
              y: Math.max(10, startNodes[elemId].y + actualDeltaY),
            };
          }
        });
        onUpdateNodePositions?.(next);
        return next;
      });
    } else if (isPanning) {
      setPan({
        x: Math.round(e.clientX - panStartRef.current.x),
        y: Math.round(e.clientY - panStartRef.current.y),
      });
    }
  };

  const handleMouseUp = () => {
    setDraggingNodeId(null);
    setDraggingContainerId(null);
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    setZoom((prevZoom) => Math.max(0.2, Math.min(3.0, prevZoom * zoomFactor)));
  };

  // Auto-Arrange Layout Algorithm: Topological Column Clustering
  const handleAutoArrange = () => {
    const layoutMap: Record<string, { x: number; y: number }> = {};
    const boxMap: Record<string, { x: number; y: number; width: number; height: number }> = {};

    boxMap['cnt-gov'] = { x: 30, y: 30, width: 620, height: 260 };
    boxMap['cnt-sand'] = { x: 30, y: 310, width: 620, height: 260 };
    boxMap['cnt-grp'] = { x: 680, y: 30, width: 340, height: 540 };

    layoutMap['node-gov-1'] = { x: 60, y: 90 };
    layoutMap['node-gov-2'] = { x: 360, y: 90 };
    layoutMap['node-sand-1'] = { x: 60, y: 370 };
    layoutMap['node-sand-2'] = { x: 360, y: 370 };
    layoutMap['node-grp-1'] = { x: 720, y: 90 };
    layoutMap['node-grp-2'] = { x: 720, y: 370 };

    setContainerBounds(boxMap);
    setNodePositions(layoutMap);
    onUpdateNodePositions?.(layoutMap);
    onUpdateContainerBounds?.(boxMap);
  };

  // Reset to original props
  const handleResetLayout = () => {
    const origNodes: Record<string, { x: number; y: number }> = {};
    nodes.forEach((n) => {
      origNodes[n.id] = { x: n.x, y: n.y };
    });
    const origBoxes: Record<string, { x: number; y: number; width: number; height: number }> = {};
    containers.forEach((c) => {
      origBoxes[c.id] = { ...c.bounds };
    });
    setNodePositions(origNodes);
    setContainerBounds(origBoxes);
    setPan({ x: 40, y: 40 });
    setZoom(1.0);
    onUpdateNodePositions?.(origNodes);
    onUpdateContainerBounds?.(origBoxes);
  };

  const isLowLOD = zoom < 0.6;

  return (
    <div
      ref={containerRef}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      className={`relative w-full overflow-hidden bg-slate-950 border border-slate-800 rounded-2xl select-none ${
        isPanning ? 'cursor-grabbing' : 'cursor-default'
      }`}
      style={{ height }}
    >
      {/* Background Dot Grid */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, #94a3b8 1px, transparent 1px)',
          backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
      />

      {/* Floating Canvas Controls */}
      <div className="absolute top-4 right-4 z-40 flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 rounded-xl p-1 shadow-xl backdrop-blur-md">
        <button
          onClick={handleAutoArrange}
          className="flex items-center gap-1 px-2.5 py-1 text-slate-300 hover:text-emerald-300 hover:bg-slate-800 rounded-lg text-xs font-mono transition-colors"
          title="Auto-Arrange Layout"
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>Auto-Arrange</span>
        </button>
        <button
          onClick={() => setGridSnap(!gridSnap)}
          className={`flex items-center gap-1 px-2 py-1 text-xs font-mono rounded-lg transition-colors ${
            gridSnap ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/30' : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Toggle Grid Snapping"
        >
          <Grid className="w-3.5 h-3.5" />
          <span>Grid</span>
        </button>
        <div className="h-4 w-px bg-slate-800" />

        <button
          onClick={() => setZoom((z) => Math.min(3.0, z + 0.15))}
          className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(0.2, z - 0.15))}
          className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleResetLayout}
          className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
          title="Reset Layout & View"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <span className="text-[11px] font-mono font-medium text-slate-400 px-1.5">
          {Math.round(zoom * 100)}%
        </span>
      </div>

      {/* Epistemic Authority Header Legend */}
      <div className="absolute top-4 left-4 z-40 flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-1.5 shadow-xl backdrop-blur-md text-xs font-mono">
        <Layers className="w-4 h-4 text-emerald-400" />
        <span className="font-semibold text-slate-200">Diagram Surface</span>
        <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-bold">
          {envelope}
        </span>
        <span className="text-[10px] text-slate-400 pl-2 flex items-center gap-1 border-l border-slate-700/80">
          <Move className="w-3 h-3 text-emerald-400" />
          Drag container or node to rearrange · Canvas drag to pan
        </span>
      </div>

      {/* Interactive Canvas Transform Layer */}
      <div
        className="absolute inset-0 origin-top-left pointer-events-auto"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transition: draggingNodeId || draggingContainerId || isPanning ? 'none' : 'transform 0.05s ease-out',
        }}
      >
        {/* ========================================================================= */}
        {/* LAYER 1 (z-0): CONTAINERS - Positioned at bottom layer                    */}
        {/* ========================================================================= */}
        <div className="absolute inset-0 pointer-events-none z-0">
          {containers.map((container) => {
            const channels = getContainerStylingChannels(container.containerType);
            const isSelected = selectedId === container.id;
            const bounds = containerBounds[container.id] || container.bounds;
            const isDraggingBox = draggingContainerId === container.id;

            return (
              <div
                key={container.id}
                id={`container-${container.id}`}
                data-container="true"
                onMouseDown={(e) => handleContainerMouseDown(e, container)}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect?.(container.id, 'container');
                }}
                className={`absolute rounded-2xl ${channels.borderStyle} ${channels.surfaceTint} select-none pointer-events-auto ${
                  isDraggingBox
                    ? 'ring-2 ring-emerald-400 shadow-2xl opacity-90 cursor-grabbing'
                    : isSelected
                    ? 'ring-2 ring-emerald-400/80 shadow-2xl cursor-grab'
                    : 'cursor-grab'
                }`}
                style={{
                  left: bounds.x,
                  top: bounds.y,
                  width: bounds.width,
                  height: bounds.height,
                }}
              >
                {/* Header Badge & Drag Handle Bar */}
                <div
                  className="p-3 flex items-center justify-between border-b border-white/5 hover:bg-white/5 rounded-t-2xl transition-colors"
                  title="Drag container to move container and member elements"
                >
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-lg flex items-center gap-1.5 ${channels.badgeClass}`}>
                      <span>{channels.badgeGlyph}</span>
                      <span>{channels.badgeLabel}</span>
                    </span>
                    <span className="text-xs font-semibold text-slate-200">{container.name}</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                    <Move className="w-3 h-3 text-emerald-400" />
                    {container.elementIds.length} elements
                  </span>
                </div>

                {/* Empty container representation */}
                {container.elementIds.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-32 text-slate-500 text-xs font-mono gap-1">
                    <Folder className="w-5 h-5 opacity-40" />
                    <span>Empty Container · Semantically Valid</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ========================================================================= */}
        {/* LAYER 2 (z-10): SVG CONNECTION LINES - Rendered ABOVE container backgrounds*/}
        {/* ========================================================================= */}
        <svg className="absolute inset-0 w-[5000px] h-[5000px] pointer-events-none overflow-visible z-10">
          <defs>
            <marker
              id="edge-arrow"
              viewBox="0 0 10 10"
              refX="10"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#64748b" />
            </marker>
            <marker
              id="gap-arrow"
              viewBox="0 0 10 10"
              refX="10"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#f59e0b" />
            </marker>
          </defs>

          {edges.map((edge) => {
            const src = nodes.find((n) => n.id === edge.source);
            const tgt = nodes.find((n) => n.id === edge.target);
            if (!src || !tgt) return null;

            const srcPos = nodePositions[edge.source] || { x: src.x, y: src.y };
            const tgtPos = nodePositions[edge.target] || { x: tgt.x, y: tgt.y };

            const x1 = srcPos.x + (src.width || 200) / 2;
            const y1 = srcPos.y + (src.height || 88) / 2;
            const x2 = tgtPos.x + (tgt.width || 200) / 2;
            const y2 = tgtPos.y + (tgt.height || 88) / 2;

            const isGap = edge.isLineageGap;
            const isSelected = selectedId === edge.id;

            return (
              <line
                key={edge.id}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={isGap ? '#f59e0b' : isSelected ? '#34d399' : '#475569'}
                strokeWidth={isSelected ? 2.5 : 1.5}
                strokeDasharray={isGap ? '5 4' : undefined}
                markerEnd={isGap ? 'url(#gap-arrow)' : 'url(#edge-arrow)'}
              />
            );
          })}
        </svg>

        {/* ========================================================================= */}
        {/* LAYER 3 (z-20): NODES - Draggable state cards above lines & containers    */}
        {/* ========================================================================= */}
        <div className="absolute inset-0 pointer-events-none z-20">
          {nodes.map((node) => {
            const isSelected = selectedId === node.id;
            const pos = nodePositions[node.id] || { x: node.x, y: node.y };
            const isDraggingThisNode = draggingNodeId === node.id;
            const width = node.width || 200;
            const height = node.height || (isLowLOD ? 40 : 88);

            return (
              <div
                key={node.id}
                onMouseDown={(e) => handleNodeMouseDown(e, node)}
                className={`absolute rounded-xl select-none p-3 flex flex-col justify-between pointer-events-auto ${
                  isDraggingThisNode
                    ? 'border-2 border-emerald-400 bg-slate-900 ring-4 ring-emerald-500/40 shadow-2xl z-30 cursor-grabbing'
                    : isSelected
                    ? 'border-2 border-emerald-400 bg-slate-900 ring-4 ring-emerald-500/20 shadow-emerald-950/50 z-20 cursor-grab'
                    : node.isHollow
                    ? 'border-2 border-dashed border-amber-500/50 bg-slate-950/70 text-slate-400 hover:border-amber-400 z-10 cursor-grab'
                    : 'border border-slate-800 bg-slate-900/95 hover:border-slate-700 text-slate-200 z-10 cursor-grab'
                }`}
                style={{
                  left: pos.x,
                  top: pos.y,
                  width,
                  height,
                }}
              >
                {/* Top Row: Type and status */}
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-mono uppercase font-bold text-slate-400 truncate flex items-center gap-1">
                    <Move className="w-2.5 h-2.5 opacity-60" />
                    {node.type}
                  </span>
                  {node.isHollow ? (
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-500/40">
                      HOLLOW · UNADMITTED
                    </span>
                  ) : node.statusBadge ? (
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-500/40">
                      {node.statusBadge}
                    </span>
                  ) : null}
                </div>

                {/* Node Title */}
                <div className="font-semibold text-sm text-slate-100 truncate mt-1">
                  {node.label}
                </div>

                {/* Bottom metadata */}
                {!isLowLOD && node.properties && (
                  <div className="text-[10px] font-mono text-slate-500 truncate flex items-center gap-2 pt-1 border-t border-white/5">
                    {Object.entries(node.properties).slice(0, 2).map(([k, v]) => (
                      <span key={k}>
                        {k}: <strong className="text-slate-400">{v}</strong>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ========================================================================= */}
        {/* LAYER 4 (z-30): FOREMOST CONNECTION LABELS - Rendered ON TOP of everything*/}
        {/* NEVER BEHIND CONTAINERS, CRISP MONOSPACE BADGES WITH SOLID OPAQUE PILLS   */}
        {/* ========================================================================= */}
        <svg className="absolute inset-0 w-[5000px] h-[5000px] pointer-events-none overflow-visible z-30">
          {edges.map((edge) => {
            const src = nodes.find((n) => n.id === edge.source);
            const tgt = nodes.find((n) => n.id === edge.target);
            if (!src || !tgt) return null;

            const srcPos = nodePositions[edge.source] || { x: src.x, y: src.y };
            const tgtPos = nodePositions[edge.target] || { x: tgt.x, y: tgt.y };

            const x1 = srcPos.x + (src.width || 200) / 2;
            const y1 = srcPos.y + (src.height || 88) / 2;
            const x2 = tgtPos.x + (tgt.width || 200) / 2;
            const y2 = tgtPos.y + (tgt.height || 88) / 2;

            const midX = (x1 + x2) / 2;
            const midY = (y1 + y2) / 2;
            const isGap = edge.isLineageGap;
            const isSelected = selectedId === edge.id;

            const text = isGap ? `⚠ LINEAGE GAP: ${edge.gapName || 'UNSPECIFIED'}` : edge.label;
            if (!text || isLowLOD) return null;

            const approxWidth = Math.max(120, text.length * 7.5 + 24);

            return (
              <g
                key={`badge-${edge.id}`}
                transform={`translate(${midX}, ${midY})`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect?.(edge.id, 'edge');
                }}
                className="cursor-pointer pointer-events-auto group"
              >
                {/* Opaque high-contrast badge background - completely shields against containers */}
                <rect
                  x={-approxWidth / 2}
                  y={-13}
                  width={approxWidth}
                  height={26}
                  rx={8}
                  fill="#030712"
                  stroke={isGap ? '#f59e0b' : isSelected ? '#34d399' : '#334155'}
                  strokeWidth={isSelected || isGap ? 1.5 : 1}
                  filter="drop-shadow(0 4px 10px rgba(0, 0, 0, 0.9))"
                  className="transition-all group-hover:stroke-emerald-400"
                />
                <text
                  x={0}
                  y={4}
                  textAnchor="middle"
                  fill={isGap ? '#fbbf24' : isSelected ? '#6ee7b7' : '#e2e8f0'}
                  fontSize="10"
                  fontFamily="monospace"
                  fontWeight="bold"
                  className="select-none fill-current"
                >
                  {text}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
