import React, { useState, useEffect, useRef } from 'react';
import { 
  Network, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Play, 
  Pause, 
  Layers, 
  Database, 
  Boxes, 
  AlertTriangle, 
  CheckCircle2, 
  Flame, 
  Terminal, 
  Sparkles, 
  ArrowRight,
  Filter,
  Info,
  ShieldAlert,
  Sliders
} from 'lucide-react';
import { useWorkbench } from '../../context/WorkbenchContext';
import { solEngine } from '../../engine/solEngine';
import { GraphNode, GraphEdge, GraphMode, ProvenanceType } from '../../types/sol';
import { ProvenanceBadge } from '../common/ProvenanceBadge';
import { OntologyContextMenu, ContextMenuState } from '../common/OntologyContextMenu';

export const GraphEditor: React.FC = () => {
  const {
    graphMode,
    setGraphMode,
    selectedItem,
    selectById,
    selectItem,
    sendToRepl,
    runEvaluation,
    theme
  } = useWorkbench();

  const containerRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  
  // Transform & Physics state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [isPhysicsRunning, setIsPhysicsRunning] = useState(true);
  const [filterViolationOnly, setFilterViolationOnly] = useState(false);
  const [layoutStyle, setLayoutStyle] = useState<'force' | 'hierarchical' | 'radial'>('force');

  // Load graph data whenever graphMode or violations change
  useEffect(() => {
    const data = solEngine.buildGraphData(graphMode);
    
    // Position nodes initially
    const width = containerRef.current?.clientWidth || 800;
    const height = containerRef.current?.clientHeight || 600;
    const centerX = width / 2;
    const centerY = height / 2;

    const initialNodes = data.nodes.map((n, i) => {
      const angle = (i / data.nodes.length) * 2 * Math.PI;
      const radius = 160 + (i % 3) * 60;
      return {
        ...n,
        x: centerX + Math.cos(angle) * radius + (Math.random() - 0.5) * 40,
        y: centerY + Math.sin(angle) * radius + (Math.random() - 0.5) * 40,
        vx: 0,
        vy: 0
      };
    });

    setNodes(initialNodes);
    setEdges(data.edges);
    setPan({ x: 0, y: 0 });
    setZoom(1);
  }, [graphMode]);

  // Spring physics simulation tick
  useEffect(() => {
    if (!isPhysicsRunning) return;

    const interval = setInterval(() => {
      setNodes(prevNodes => {
        if (prevNodes.length === 0) return prevNodes;

        const width = containerRef.current?.clientWidth || 800;
        const height = containerRef.current?.clientHeight || 600;
        const cx = width / 2;
        const cy = height / 2;

        const next = prevNodes.map(n => ({ ...n }));

        // 1. Repulsion between all node pairs
        for (let i = 0; i < next.length; i++) {
          for (let j = i + 1; j < next.length; j++) {
            const dx = next[j].x! - next[i].x!;
            const dy = next[j].y! - next[i].y!;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            if (dist < 320) {
              const force = (320 - dist) / dist * 0.12;
              if (draggingNodeId !== next[i].id) {
                next[i].x! -= dx * force;
                next[i].y! -= dy * force;
              }
              if (draggingNodeId !== next[j].id) {
                next[j].x! += dx * force;
                next[j].y! += dy * force;
              }
            }
          }
        }

        // 2. Spring attraction along edges
        edges.forEach(e => {
          const source = next.find(n => n.id === e.source);
          const target = next.find(n => n.id === e.target);
          if (source && target) {
            const dx = target.x! - source.x!;
            const dy = target.y! - source.y!;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const targetDist = e.kind === 'relationship' ? 140 : 100;
            const force = (dist - targetDist) * 0.015;
            
            if (draggingNodeId !== source.id) {
              source.x! += (dx / dist) * force;
              source.y! += (dy / dist) * force;
            }
            if (draggingNodeId !== target.id) {
              target.x! -= (dx / dist) * force;
              target.y! -= (dy / dist) * force;
            }
          }
        });

        // 3. Mild pull to center
        next.forEach(n => {
          if (draggingNodeId !== n.id) {
            n.x! += (cx - n.x!) * 0.005;
            n.y! += (cy - n.y!) * 0.005;
          }
        });

        return next;
      });
    }, 30);

    return () => clearInterval(interval);
  }, [edges, isPhysicsRunning, draggingNodeId]);

  // Mouse pan & drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === containerRef.current || (e.target as HTMLElement).tagName === 'svg') {
      setIsDraggingCanvas(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDraggingCanvas) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    } else if (draggingNodeId) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mouseX = (e.clientX - rect.left - pan.x) / zoom;
      const mouseY = (e.clientY - rect.top - pan.y) / zoom;

      setNodes(prev => prev.map(n => n.id === draggingNodeId ? { ...n, x: mouseX, y: mouseY } : n));
    }
  };

  const handleMouseUp = () => {
    setIsDraggingCanvas(false);
    setDraggingNodeId(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    setZoom(prev => Math.min(Math.max(prev * zoomFactor, 0.4), 2.5));
  };

  // Node selection handler
  const handleNodeClick = (node: GraphNode, e: React.MouseEvent) => {
    e.stopPropagation();
    if (node.kind === 'concept') {
      selectById('concept', node.id);
    } else if (node.kind === 'entity') {
      selectById('entity', node.id);
    } else if (node.kind === 'rule') {
      selectById('rule', node.id);
    } else if (node.kind === 'proposition') {
      selectById('proposition', node.id);
    } else if (node.kind === 'shrapnel_object') {
      const objId = node.data?.id || parseInt(node.id.replace('shrapnel-obj-', ''));
      selectById('shrapnel_object', objId);
    } else if (node.kind === 'frame_dimension') {
      selectById('frame', node.id);
    }
  };

  const handleNodeContextMenu = (node: GraphNode, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleNodeClick(node, e);

    let targetType: ContextMenuState['type'] = 'concept';
    let targetId: string | number = node.id;
    let targetData = node.data;

    if (node.kind === 'concept') {
      targetType = 'concept';
      targetData = node.data || solEngine.concepts[node.id];
    } else if (node.kind === 'entity') {
      targetType = 'entity';
      targetData = node.data || solEngine.entities.find(ent => ent.id === node.id);
    } else if (node.kind === 'rule') {
      targetType = 'rule';
      targetData = node.data || solEngine.rules.find(r => r.id === node.id);
    } else if (node.kind === 'proposition') {
      targetType = 'proposition';
      targetData = node.data || solEngine.propositions.find(p => p.id === node.id);
    } else if (node.kind === 'shrapnel_object') {
      targetType = 'shrapnel_object';
      const objId = node.data?.id || parseInt(node.id.replace('shrapnel-obj-', ''));
      targetId = objId;
      targetData = node.data || solEngine.shrapnelObjects.find(o => o.id === objId);
    } else if (node.kind === 'frame_dimension') {
      targetType = 'frame';
      targetData = node.data || solEngine.frameDimensions.find(f => f.id === node.id);
    }

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      type: targetType,
      id: targetId,
      data: targetData,
      provenance: node.provenance,
      meta: {
        graphMode,
        isPhysicsRunning,
        filterViolationOnly
      }
    });
  };

  const handleCanvasContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      type: 'canvas',
      meta: {
        graphMode,
        isPhysicsRunning,
        filterViolationOnly
      }
    });
  };

  // Compute Cross-Layer Bridge Insights
  const getPivotBridgeInsight = () => {
    if (!selectedItem) {
      return (
        <span className="text-[var(--text-muted)] flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-sky-400" />
          Select any node to inspect the Type ↔ Instance and Semantic ↔ Concrete representation bridge.
        </span>
      );
    }

    if (graphMode === 'semantic') {
      if (selectedItem.type === 'concept') {
        const instances = solEngine.entities.filter(e => e.concept_id === selectedItem.id);
        const violations = instances.filter(e => e.id.includes('faulty') || e.id.includes('TEMPVIOLATION'));
        return (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-indigo-300 font-bold font-mono">{selectedItem.data?.name}</span>
            <span className="text-[var(--text-muted)]">defines</span>
            <span className="text-emerald-300 font-bold font-mono">{instances.length} concrete instances</span>
            {violations.length > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-rose-950/80 border border-rose-700/60 text-rose-300 font-mono text-[10px] flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> {violations.length} Invariant Violations
              </span>
            )}
            <button
              onClick={() => setGraphMode('concrete')}
              className="ml-auto px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/60 hover:bg-emerald-900 transition-all font-mono text-[10px] flex items-center gap-1"
            >
              <span>Inspect Concrete Instances</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        );
      }
      return (
        <div className="flex items-center gap-2">
          <span className="text-indigo-300 font-bold font-mono">{selectedItem.type.toUpperCase()}</span>
          <span className="text-[var(--text-muted)]">Semantic Specification Element</span>
        </div>
      );
    } else {
      // Concrete Mode
      if (selectedItem.type === 'entity') {
        const concept = solEngine.concepts[selectedItem.data?.concept_id];
        return (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-emerald-300 font-bold font-mono">{selectedItem.data?.external_id}</span>
            <span className="text-[var(--text-muted)]">is an instance of Concept:</span>
            <span className="text-indigo-300 font-bold font-mono">{concept?.name || selectedItem.data?.concept_name}</span>
            {selectedItem.data?.shrapnel_object_id && (
              <span className="px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-700/60 text-amber-300 font-mono text-[10px] flex items-center gap-1">
                <Flame className="w-3 h-3" /> EAV Object #{selectedItem.data?.shrapnel_object_id} Bound
              </span>
            )}
            <button
              onClick={() => setGraphMode('semantic')}
              className="ml-auto px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-700/60 hover:bg-indigo-900 transition-all font-mono text-[10px] flex items-center gap-1"
            >
              <span>View Semantic Definition</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        );
      }
      if (selectedItem.type === 'proposition') {
        return (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-blue-300 font-bold font-mono">Proposition:</span>
            <span className="text-[var(--text-primary)] truncate max-w-xs">{selectedItem.data?.title}</span>
            <span className="px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-700 text-[10px] font-mono">
              {selectedItem.data?.disposition} (conf: {(selectedItem.data?.confidence * 100).toFixed(0)}%)
            </span>
            <button
              onClick={() => runEvaluation(selectedItem.id as string)}
              className="ml-auto px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-700 hover:bg-sky-900 font-mono text-[10px]"
            >
              Re-Evaluate
            </button>
          </div>
        );
      }
      return (
        <div className="flex items-center gap-2">
          <span className="text-emerald-300 font-bold font-mono">{selectedItem.type.toUpperCase()}</span>
          <span className="text-[var(--text-muted)]">Concrete Instantiated Knowledge</span>
        </div>
      );
    }
  };

  const visibleNodes = filterViolationOnly 
    ? nodes.filter(n => n.status === 'violation' || n.status === 'disputed' || n.id.includes('faulty'))
    : nodes;

  const bgPatternClass = theme === 'steel' 
    ? 'graph-steel-pattern' 
    : (theme === 'light' ? 'graph-light-pattern' : 'graph-grid-pattern');

  return (
    <div
      id="graph-editor-container"
      className="flex-1 flex flex-col h-full bg-[var(--bg-primary)] overflow-hidden relative select-none"
    >
      {/* Top Controls Bar: Dual Operating Mode Selector & Toolbar */}
      <div className="h-10 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)] flex items-center justify-between px-3 shrink-0 z-10 gap-2">
        
        {/* Operating Mode Switcher with Distinct Identity */}
        <div className="flex items-center bg-[var(--bg-primary)] p-0.5 rounded border border-[var(--border-strong)] gap-1">
          <button
            id="mode-semantic-btn"
            onClick={() => setGraphMode('semantic')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono transition-all ${
              graphMode === 'semantic'
                ? 'bg-indigo-950 text-indigo-300 font-bold border border-indigo-500/60 shadow-xs ring-1 ring-indigo-500/30'
                : 'text-[var(--text-muted)] hover:text-indigo-200'
            }`}
          >
            <Boxes className="w-3.5 h-3.5 text-indigo-400" />
            <span>SEMANTIC / ONTOLOGY</span>
            <span className="text-[9px] px-1 rounded bg-indigo-900/80 text-indigo-200">SCHEMA</span>
          </button>

          <button
            id="mode-concrete-btn"
            onClick={() => setGraphMode('concrete')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono transition-all ${
              graphMode === 'concrete'
                ? 'bg-emerald-950 text-emerald-300 font-bold border border-emerald-500/60 shadow-xs ring-1 ring-emerald-500/30'
                : 'text-[var(--text-muted)] hover:text-emerald-200'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span>CONCRETE / KNOWLEDGE</span>
            <span className="text-[9px] px-1 rounded bg-emerald-900/80 text-emerald-200">FACTS & EAV</span>
          </button>
        </div>

        {/* Graph Canvas Tools */}
        <div className="flex items-center gap-1.5 font-mono text-xs">
          {/* Violation Filter in Concrete Mode */}
          {graphMode === 'concrete' && (
            <button
              id="graph-filter-violation-btn"
              onClick={() => setFilterViolationOnly(!filterViolationOnly)}
              className={`px-2 py-0.5 rounded text-[11px] flex items-center gap-1 border transition-all ${
                filterViolationOnly
                  ? 'bg-rose-950 text-rose-300 border-rose-600 font-bold'
                  : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] border-[var(--border-subtle)] hover:text-rose-300'
              }`}
              title="Show only invariant violations and disputed propositions"
            >
              <AlertTriangle className="w-3 h-3 text-rose-400" />
              <span>Violations Only</span>
            </button>
          )}

          {/* Physics Simulation Toggle */}
          <button
            id="graph-physics-toggle"
            onClick={() => setIsPhysicsRunning(!isPhysicsRunning)}
            className={`p-1 rounded border transition-colors ${
              isPhysicsRunning 
                ? 'bg-sky-950 text-sky-400 border-sky-800' 
                : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] border-[var(--border-subtle)]'
            }`}
            title={isPhysicsRunning ? 'Pause Physics' : 'Resume Physics'}
          >
            {isPhysicsRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>

          {/* Zoom In/Out */}
          <button
            id="graph-zoom-in"
            onClick={() => setZoom(z => Math.min(z * 1.2, 2.5))}
            className="p-1 rounded bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] text-[var(--text-secondary)] border border-[var(--border-subtle)]"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            id="graph-zoom-out"
            onClick={() => setZoom(z => Math.max(z * 0.8, 0.4))}
            className="p-1 rounded bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] text-[var(--text-secondary)] border border-[var(--border-subtle)]"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            id="graph-zoom-reset"
            onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
            className="p-1 rounded bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] text-[var(--text-secondary)] border border-[var(--border-subtle)]"
            title="Reset View"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          <span className="text-[10px] text-[var(--text-muted)] pl-1">
            {(zoom * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Cross-Layer Bridge Insights Bar */}
      <div 
        id="graph-bridge-insight-bar"
        className="h-8 px-3 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]/70 flex items-center text-xs text-[var(--text-secondary)] shrink-0 z-10"
      >
        {getPivotBridgeInsight()}
      </div>

      {/* Main Interactive Graph Canvas */}
      <div
        ref={containerRef}
        id="graph-canvas-area"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onContextMenu={handleCanvasContextMenu}
        className={`flex-1 w-full h-full relative cursor-grab active:cursor-grabbing overflow-hidden ${bgPatternClass}`}
      >
        <svg
          className="w-full h-full absolute inset-0 pointer-events-none"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0'
          }}
        >
          <defs>
            {/* Arrow Marker for Directed Edges */}
            <marker
              id="arrow-semantic"
              viewBox="0 0 10 10"
              refX="22"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#818cf8" />
            </marker>
            <marker
              id="arrow-concrete"
              viewBox="0 0 10 10"
              refX="22"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#34d399" />
            </marker>
            <marker
              id="arrow-eav"
              viewBox="0 0 10 10"
              refX="22"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#fbbf24" />
            </marker>
          </defs>

          {/* Edges Rendering */}
          {edges.map(edge => {
            const source = visibleNodes.find(n => n.id === edge.source);
            const target = visibleNodes.find(n => n.id === edge.target);
            if (!source || !target || source.x === undefined || target.x === undefined) return null;

            const markerId = edge.provenance === 'eav' ? 'arrow-eav' : (graphMode === 'semantic' ? 'arrow-semantic' : 'arrow-concrete');
            const strokeColor = edge.provenance === 'eav' ? '#f59e0b' : (graphMode === 'semantic' ? '#6366f1' : '#10b981');
            const midX = (source.x! + target.x!) / 2;
            const midY = (source.y! + target.y!) / 2;

            return (
              <g key={edge.id} className="opacity-80 hover:opacity-100 transition-opacity">
                <line
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  stroke={strokeColor}
                  strokeWidth={edge.kind === 'relationship' ? 2 : 1.2}
                  strokeDasharray={edge.dashed ? '4,4' : undefined}
                  markerEnd={`url(#${markerId})`}
                  opacity={edge.dashed ? 0.6 : 0.8}
                />
                {/* Edge Label */}
                <rect
                  x={midX - (edge.label.length * 3.5) - 4}
                  y={midY - 7}
                  width={edge.label.length * 7 + 8}
                  height={14}
                  rx={3}
                  fill="var(--bg-primary)"
                  stroke="var(--border-subtle)"
                  strokeWidth={0.8}
                />
                <text
                  x={midX}
                  y={midY + 3}
                  fill="var(--text-secondary)"
                  fontSize={9}
                  fontFamily="monospace"
                  textAnchor="middle"
                >
                  {edge.label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Nodes Layer (DOM elements for crisp typography, rich badges, and interactive controls) */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0'
          }}
        >
          {visibleNodes.map(node => {
            const isSelected = selectedItem?.id === node.id || (selectedItem?.type === 'shrapnel_object' && node.id === `shrapnel-obj-${selectedItem.id}`);
            const isSemantic = graphMode === 'semantic';

            // Distinctive node styling for Semantic vs Concrete
            let nodeBorder = isSelected ? 'border-sky-400 ring-2 ring-sky-500/50 shadow-lg' : 'border-[var(--border-strong)]';
            let nodeBg = 'bg-[var(--bg-secondary)]';

            if (node.kind === 'concept') {
              nodeBg = isSelected ? 'bg-indigo-950/90' : 'bg-indigo-950/50';
              nodeBorder = isSelected ? 'border-indigo-400 ring-2 ring-indigo-500/50' : 'border-indigo-800/80';
            } else if (node.kind === 'entity') {
              if (node.status === 'violation') {
                nodeBg = 'bg-rose-950/70 animate-pulse';
                nodeBorder = 'border-rose-500 ring-1 ring-rose-500/50';
              } else {
                nodeBg = isSelected ? 'bg-emerald-950/90' : 'bg-emerald-950/50';
                nodeBorder = isSelected ? 'border-emerald-400 ring-2 ring-emerald-500/50' : 'border-emerald-800/80';
              }
            } else if (node.kind === 'shrapnel_object') {
              nodeBg = isSelected ? 'bg-amber-950/90' : 'bg-amber-950/50';
              nodeBorder = isSelected ? 'border-amber-400 ring-2 ring-amber-500/50' : 'border-amber-700/80';
            } else if (node.kind === 'rule') {
              nodeBg = 'bg-slate-900/80';
              nodeBorder = 'border-dashed border-indigo-700/70';
            } else if (node.kind === 'proposition') {
              nodeBg = node.status === 'violation' ? 'bg-rose-950/60' : 'bg-blue-950/60';
              nodeBorder = node.status === 'violation' ? 'border-rose-600' : 'border-blue-600';
            }

            return (
              <div
                key={node.id}
                id={`graph-node-${node.id}`}
                onClick={e => handleNodeClick(node, e)}
                onContextMenu={e => handleNodeContextMenu(node, e)}
                onMouseDown={e => {
                  e.stopPropagation();
                  setDraggingNodeId(node.id);
                }}
                style={{
                  left: `${node.x || 0}px`,
                  top: `${node.y || 0}px`,
                  transform: 'translate(-50%, -50%)'
                }}
                className={`absolute pointer-events-auto cursor-pointer rounded-lg border px-3 py-2 flex flex-col gap-1 min-w-[130px] max-w-[200px] select-none transition-shadow ${nodeBg} ${nodeBorder}`}
              >
                {/* Node Top Row: Kind Icon + Provenance */}
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1 font-mono text-[10px]">
                    {node.kind === 'concept' && <Boxes className="w-3 h-3 text-indigo-400" />}
                    {node.kind === 'entity' && (
                      node.status === 'violation' 
                        ? <AlertTriangle className="w-3 h-3 text-rose-400" />
                        : <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    )}
                    {node.kind === 'shrapnel_object' && <Flame className="w-3 h-3 text-amber-400" />}
                    {node.kind === 'rule' && <ShieldAlert className="w-3 h-3 text-indigo-300" />}
                    {node.kind === 'proposition' && <Sparkles className="w-3 h-3 text-blue-400" />}
                    <span className="font-semibold uppercase text-[9px] text-[var(--text-secondary)]">
                      {node.kind === 'shrapnel_object' ? 'EAV FACT' : node.kind}
                    </span>
                  </div>

                  <ProvenanceBadge provenance={node.provenance} size="xs" />
                </div>

                {/* Node Main Title */}
                <div className="font-mono text-xs font-bold text-[var(--text-primary)] truncate">
                  {node.label}
                </div>

                {/* Subtitle / Telemetry tag */}
                {node.subLabel && (
                  <div className="text-[10px] font-mono text-[var(--text-muted)] truncate border-t border-[var(--border-subtle)] pt-1 flex items-center justify-between">
                    <span>{node.subLabel}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Mode Watermark & Guide */}
        <div className="absolute bottom-3 right-3 pointer-events-none opacity-40 font-mono text-right text-[11px] text-[var(--text-muted)]">
          <div className="font-bold uppercase tracking-widest">
            SOL.{graphMode.toUpperCase()}_CANVAS
          </div>
          <div>Drag canvas to pan · Scroll to zoom · Right-click for actions</div>
        </div>
      </div>

      {/* Context-aware Right-Click Menu for Nodes and Canvas */}
      <OntologyContextMenu
        menu={contextMenu}
        onClose={() => setContextMenu(null)}
        customCanvasActions={{
          onResetZoom: () => {
            setZoom(1);
            setPan({ x: 0, y: 0 });
          },
          onTogglePhysics: () => setIsPhysicsRunning(prev => !prev),
          onToggleViolations: () => setFilterViolationOnly(prev => !prev)
        }}
      />
    </div>
  );
};
