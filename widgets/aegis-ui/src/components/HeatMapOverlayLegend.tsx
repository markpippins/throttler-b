import React, { useState } from 'react';
import { Flame, ChevronDown, ChevronUp, Activity, Filter, Info } from 'lucide-react';
import { TraversalHeatmapData } from '../utils/heatmap';

interface HeatMapOverlayLegendProps {
  heatmapData: TraversalHeatmapData;
  isActive: boolean;
  onToggleActive: () => void;
  minThreshold: number;
  onChangeThreshold: (val: number) => void;
  onSelectHotspotState?: (stateId: string) => void;
  onSelectHotspotTransition?: (transId: string) => void;
}

export const HeatMapOverlayLegend: React.FC<HeatMapOverlayLegendProps> = ({
  heatmapData,
  isActive,
  onToggleActive,
  minThreshold,
  onChangeThreshold,
  onSelectHotspotState,
  onSelectHotspotTransition,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!isActive) return null;

  const { totalExecutions, maxStateCount, maxTransitionCount, hotspotState, hotspotTransition } = heatmapData;

  return (
    <div className="absolute bottom-6 left-6 z-20 max-w-sm w-84 bg-[#16191E]/95 backdrop-blur-md border border-[#2D333B] shadow-2xl rounded-xl text-xs overflow-hidden transition-all duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#0F1115]/80 border-b border-[#2D333B]">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-amber-500/20 to-red-500/20 border border-red-500/40 flex items-center justify-center">
            <Flame className="w-3.5 h-3.5 text-red-400 fill-red-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-semibold text-[#F0F6FC] text-xs">Traversal Heat Map</span>
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                LIVE
              </span>
            </div>
            <span className="text-[10px] text-[#8B949E]">
              {totalExecutions} execution {totalExecutions === 1 ? 'event' : 'events'} analyzed
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-[#8B949E] hover:text-[#C9D1D9] hover:bg-[#21262D] rounded"
            title={isExpanded ? 'Minimize legend' : 'Expand legend'}
          >
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onToggleActive}
            className="p-1 text-[#8B949E] hover:text-red-400 hover:bg-[#21262D] rounded text-[11px]"
            title="Disable Heat Map Overlay"
          >
            ✕
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-3.5 space-y-3">
          {/* Gradient Spectrum Bar */}
          <div>
            <div className="flex items-center justify-between text-[10px] text-[#8B949E] mb-1">
              <span>0 (Untraversed)</span>
              <span className="text-[#06B6D4]">Low</span>
              <span className="text-[#F59E0B]">Medium</span>
              <span className="text-red-400 font-semibold">Hotspot ({Math.max(maxStateCount, maxTransitionCount)}x)</span>
            </div>
            <div className="h-2.5 rounded-full w-full bg-gradient-to-r from-[#21262D] via-[#06B6D4] via-45% via-[#F59E0B] via-75% to-[#EF4444] border border-[#30363D]" />
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div
              onClick={() => hotspotState && onSelectHotspotState && onSelectHotspotState(hotspotState.id)}
              className={`p-2 rounded-lg bg-[#0F1115] border border-[#2D333B] transition-colors ${
                hotspotState ? 'cursor-pointer hover:border-amber-500/50 hover:bg-[#1C2128]' : ''
              }`}
            >
              <div className="flex items-center space-x-1 text-[#8B949E] text-[10px]">
                <Activity className="w-3 h-3 text-amber-400" />
                <span>Top State</span>
              </div>
              {hotspotState ? (
                <div className="mt-1">
                  <div className="font-semibold text-[#F0F6FC] truncate text-[11px]" title={hotspotState.name}>
                    {hotspotState.name}
                  </div>
                  <div className="text-[10px] text-amber-400 font-mono font-medium">
                    {hotspotState.count} visits ({totalExecutions > 0 ? Math.round((hotspotState.count / totalExecutions) * 100) : 0}%)
                  </div>
                </div>
              ) : (
                <span className="text-[11px] text-[#484F58] mt-1 block">None traversed</span>
              )}
            </div>

            <div
              onClick={() => hotspotTransition && onSelectHotspotTransition && onSelectHotspotTransition(hotspotTransition.id)}
              className={`p-2 rounded-lg bg-[#0F1115] border border-[#2D333B] transition-colors ${
                hotspotTransition ? 'cursor-pointer hover:border-red-500/50 hover:bg-[#1C2128]' : ''
              }`}
            >
              <div className="flex items-center space-x-1 text-[#8B949E] text-[10px]">
                <Flame className="w-3 h-3 text-red-400" />
                <span>Top Transition</span>
              </div>
              {hotspotTransition ? (
                <div className="mt-1">
                  <div className="font-semibold text-[#F0F6FC] truncate text-[11px]" title={hotspotTransition.name}>
                    {hotspotTransition.name}
                  </div>
                  <div className="text-[10px] text-red-400 font-mono font-medium">
                    {hotspotTransition.count} fired ({totalExecutions > 0 ? Math.round((hotspotTransition.count / totalExecutions) * 100) : 0}%)
                  </div>
                </div>
              ) : (
                <span className="text-[11px] text-[#484F58] mt-1 block">None fired</span>
              )}
            </div>
          </div>

          {/* Intensity Filter Threshold */}
          <div className="pt-2 border-t border-[#2D333B]">
            <div className="flex items-center justify-between text-[11px] mb-1.5">
              <span className="text-[#8B949E] flex items-center space-x-1">
                <Filter className="w-3 h-3 text-[#3B82F6]" />
                <span>Highlight Threshold:</span>
              </span>
              <span className="font-mono text-[#F0F6FC] font-semibold text-[10px]">
                {minThreshold > 0 ? `≥ ${minThreshold} visits` : 'All'}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={Math.max(1, Math.max(maxStateCount, maxTransitionCount))}
              value={minThreshold}
              onChange={(e) => onChangeThreshold(Number(e.target.value))}
              className="w-full accent-amber-500 h-1.5 bg-[#21262D] rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-[#484F58] mt-1 font-mono">
              <span>Show all (0)</span>
              <span>Hotspots only ({Math.max(maxStateCount, maxTransitionCount)})</span>
            </div>
          </div>

          {totalExecutions === 0 && (
            <div className="p-2 bg-[#0F1115] rounded border border-dashed border-[#30363D] flex items-start space-x-2">
              <Info className="w-3.5 h-3.5 text-[#8B949E] shrink-0 mt-0.5" />
              <p className="text-[10px] text-[#8B949E] leading-relaxed">
                No executions recorded yet. Fire transitions or run a simulation to watch heat dynamics visualize in real time!
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
