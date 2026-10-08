/**
 * Time-Travel Debug Slider & History Scrubber for State Machine Simulation
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  GitBranch,
  Clock,
  Zap,
  ChevronDown,
  ChevronUp,
  Activity,
  ArrowRight,
  Database,
  Radio,
  X,
} from 'lucide-react';
import { StateNode, Transition, SimState, SimStep } from '../types';

interface TimeTravelSliderProps {
  simState: SimState;
  states: StateNode[];
  transitions: Transition[];
  scrubIndex: number | null;
  onScrubStep: (index: number | null) => void;
  onBranchFromStep?: (index: number) => void;
  onResetSimulation?: () => void;
  onClose?: () => void;
}

export const TimeTravelSlider: React.FC<TimeTravelSliderProps> = ({
  simState,
  states,
  transitions,
  scrubIndex,
  onScrubStep,
  onBranchFromStep,
  onResetSimulation,
  onClose,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeedMs, setPlaySpeedMs] = useState(1000);
  const [isExpanded, setIsExpanded] = useState(true);
  const [showOnlyChangedVars, setShowOnlyChangedVars] = useState(false);

  const history = simState.history || [];
  const totalSteps = history.length;
  const maxIndex = Math.max(0, totalSteps - 1);

  // Active step index (defaults to head if scrubIndex is null)
  const activeIndex = scrubIndex !== null ? Math.min(scrubIndex, maxIndex) : maxIndex;
  const isLive = scrubIndex === null || scrubIndex === maxIndex;

  const currentStep: SimStep | undefined = history[activeIndex];
  const prevStep: SimStep | undefined = activeIndex > 0 ? history[activeIndex - 1] : undefined;

  // Active state node
  const activeStateNode = states.find((s) => s.id === currentStep?.stateId);

  // Transition taken to reach this step
  const transitionTaken = transitions.find(
    (t) => t.name === currentStep?.transitionName || (prevStep && t.from_state_id === prevStep.stateId && t.to_state_id === currentStep?.stateId)
  );

  // Compute variable differences between prevStep and currentStep
  const variableDiff = useMemo(() => {
    if (!currentStep) return [];

    const currentVars = currentStep.variables || {};
    const previousVars = prevStep?.variables || {};

    const allKeys = Array.from(new Set([...Object.keys(currentVars), ...Object.keys(previousVars)]));

    return allKeys.map((key) => {
      const currentVal = currentVars[key];
      const prevVal = previousVars[key];
      const hasChanged = activeIndex === 0 ? true : JSON.stringify(currentVal) !== JSON.stringify(prevVal);

      return {
        key,
        currentVal,
        prevVal,
        hasChanged,
      };
    });
  }, [currentStep, prevStep, activeIndex]);

  // Auto-play timer for time travel playback
  const activeIndexRef = useRef(activeIndex);
  activeIndexRef.current = activeIndex;

  const maxIndexRef = useRef(maxIndex);
  maxIndexRef.current = maxIndex;

  const onScrubStepRef = useRef(onScrubStep);
  onScrubStepRef.current = onScrubStep;

  useEffect(() => {
    if (!isPlaying) return;

    if (maxIndexRef.current === 0) {
      setIsPlaying(false);
      return;
    }

    const timer = setInterval(() => {
      const current = activeIndexRef.current;
      const max = maxIndexRef.current;

      if (current >= max) {
        setIsPlaying(false);
        onScrubStepRef.current(null); // Return to live head
      } else {
        const nextIndex = current + 1;
        if (nextIndex >= max) {
          onScrubStepRef.current(null);
          setIsPlaying(false);
        } else {
          onScrubStepRef.current(nextIndex);
        }
      }
    }, playSpeedMs);

    return () => {
      clearInterval(timer);
    };
  }, [isPlaying, playSpeedMs]);

  // Esc key listener to hide debugger
  useEffect(() => {
    if (!onClose) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const activeEl = document.activeElement;
        if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
          return;
        }
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (totalSteps === 0) return null;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setIsPlaying(false);
    if (val === maxIndex) {
      onScrubStep(null); // Live head
    } else {
      onScrubStep(val);
    }
  };

  const handleJumpToStart = () => {
    setIsPlaying(false);
    onScrubStep(0);
  };

  const handleStepBack = () => {
    setIsPlaying(false);
    if (activeIndex > 0) {
      onScrubStep(activeIndex - 1);
    }
  };

  const handleStepForward = () => {
    setIsPlaying(false);
    if (activeIndex < maxIndex - 1) {
      onScrubStep(activeIndex + 1);
    } else {
      onScrubStep(null);
    }
  };

  const handleJumpToLive = () => {
    setIsPlaying(false);
    onScrubStep(null);
  };

  const handleTogglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      if (maxIndex === 0) return;
      if (activeIndex >= maxIndex) {
        // When at live head or end of timeline, restart from step 0
        activeIndexRef.current = 0;
        onScrubStep(0);
      }
      setIsPlaying(true);
    }
  };

  return (
    <div
      id="time-travel-debugger"
      className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 w-11/12 max-w-4xl select-none"
    >
      <div className="bg-[#16191E]/95 backdrop-blur-md rounded-2xl border border-[#2D333B] shadow-2xl shadow-black/60 overflow-hidden transition-all duration-200">
        {/* Top Header / Status Bar */}
        <div className="px-4 py-2.5 bg-[#0F1115]/90 border-b border-[#2D333B] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-[#3B82F6]" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#F0F6FC]">
                Time-Travel Debugger
              </span>
            </div>

            <div className="h-4 w-px bg-[#2D333B]" />

            {/* Live / Replay status badge */}
            {isLive ? (
              <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-[#238636]/20 text-[#3fb950] border border-[#238636]/40 text-[11px] font-semibold">
                <span className="w-2 h-2 rounded-full bg-[#3fb950] animate-pulse" />
                <span>LIVE HEAD</span>
              </span>
            ) : (
              <div className="flex items-center space-x-2">
                <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-[#D29922]/20 text-[#D29922] border border-[#D29922]/40 text-[11px] font-semibold">
                  <Activity className="w-3 h-3 text-[#D29922]" />
                  <span>TIME-TRAVEL REPLAY</span>
                </span>
                <button
                  type="button"
                  onClick={handleJumpToLive}
                  title="Snap back to current live simulation head"
                  className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#3B82F6]/20 text-[#58a6ff] hover:bg-[#3B82F6]/30 border border-[#3B82F6]/40 transition-colors"
                >
                  Snap to Live &gt;&gt;|
                </button>
              </div>
            )}

            <span className="text-xs font-mono text-[#8B949E]">
              Step <span className="font-bold text-[#F0F6FC]">{activeIndex}</span> of{' '}
              <span className="font-bold text-[#F0F6FC]">{maxIndex}</span>
            </span>
          </div>

          <div className="flex items-center space-x-3">
            {/* Speed selector */}
            <div className="flex items-center space-x-1.5 text-[11px] text-[#8B949E]">
              <span>Speed:</span>
              <select
                value={playSpeedMs}
                onChange={(e) => setPlaySpeedMs(Number(e.target.value))}
                className="bg-[#16191E] border border-[#2D333B] rounded px-1.5 py-0.5 text-[10px] text-[#C9D1D9] focus:outline-none"
              >
                <option value={500}>0.5s</option>
                <option value={1000}>1.0s</option>
                <option value={1800}>1.8s</option>
              </select>
            </div>

            {/* Branch / Rewind action if inspecting past */}
            {!isLive && onBranchFromStep && (
              <button
                type="button"
                id="btn-branch-step"
                onClick={() => onBranchFromStep(activeIndex)}
                title="Rewind simulation to this historic step and discard subsequent steps"
                className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#D29922]/20 hover:bg-[#D29922]/30 text-[#D29922] border border-[#D29922]/40 transition-colors"
              >
                <GitBranch className="w-3.5 h-3.5" />
                <span>Rewind Here</span>
              </button>
            )}

            {/* Reset simulation */}
            {onResetSimulation && (
              <button
                type="button"
                onClick={onResetSimulation}
                title="Reset simulation to initial state"
                className="p-1 text-[#8B949E] hover:text-[#C9D1D9] hover:bg-[#21262D] rounded transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Expand / Minimize toggle */}
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              title={isExpanded ? 'Collapse timeline details' : 'Expand timeline details'}
              className="p-1 text-[#8B949E] hover:text-[#C9D1D9] hover:bg-[#21262D] rounded transition-colors"
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>

            {/* Close / Hide Time-Travel Debugger */}
            {onClose && (
              <>
                <div className="w-px h-4 bg-[#2D333B]" />
                <button
                  type="button"
                  id="btn-hide-time-travel"
                  onClick={onClose}
                  title="Hide Time-Travel Debugger (Esc)"
                  className="p-1 text-[#8B949E] hover:text-[#F85149] hover:bg-[#21262D] rounded transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Scrubber Controls & Slider Bar */}
        <div className="px-5 py-3.5 space-y-3 bg-[#16191E]">
          <div className="flex items-center space-x-3">
            {/* Step navigation buttons */}
            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={handleJumpToStart}
                disabled={activeIndex === 0}
                title="Jump to start (Step 0)"
                className="p-1.5 rounded-lg bg-[#0F1115] hover:bg-[#21262D] border border-[#2D333B] text-[#C9D1D9] disabled:opacity-40 transition-colors"
              >
                <SkipBack className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={handleStepBack}
                disabled={activeIndex === 0}
                title="Step backward (previous step)"
                className="p-1.5 rounded-lg bg-[#0F1115] hover:bg-[#21262D] border border-[#2D333B] text-[#C9D1D9] disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                id="btn-time-travel-replay"
                onClick={handleTogglePlay}
                disabled={maxIndex === 0}
                title={
                  maxIndex === 0
                    ? 'Fire transitions in the simulation to record history steps for replay'
                    : isPlaying
                    ? 'Pause replay playback'
                    : 'Replay simulation from step 0 to live head'
                }
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  isPlaying
                    ? 'bg-[#D29922] hover:bg-[#b07d17] text-white'
                    : 'bg-[#238636] hover:bg-[#2ea043] text-white'
                }`}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5 fill-white" /> : <Play className="w-3.5 h-3.5 fill-white" />}
                <span>{isPlaying ? 'Pause' : 'Replay'}</span>
              </button>

              <button
                type="button"
                onClick={handleStepForward}
                disabled={activeIndex === maxIndex}
                title="Step forward (next step)"
                className="p-1.5 rounded-lg bg-[#0F1115] hover:bg-[#21262D] border border-[#2D333B] text-[#C9D1D9] disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={handleJumpToLive}
                disabled={isLive}
                title="Jump to latest live head"
                className="p-1.5 rounded-lg bg-[#0F1115] hover:bg-[#21262D] border border-[#2D333B] text-[#C9D1D9] disabled:opacity-40 transition-colors"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Slider track */}
            <div className="flex-1 px-2 relative flex flex-col justify-center">
              <input
                type="range"
                min={0}
                max={maxIndex}
                step={1}
                value={activeIndex}
                onChange={handleSliderChange}
                className="w-full h-2 bg-[#0A0C10] rounded-lg appearance-none cursor-pointer accent-[#3B82F6] focus:outline-none"
              />

              {/* Step tick markers */}
              {totalSteps > 1 && totalSteps <= 20 && (
                <div className="flex justify-between px-1 mt-1 text-[9px] font-mono text-[#8B949E]">
                  {history.map((h, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => onScrubStep(i === maxIndex ? null : i)}
                      title={`Step ${i}: ${h.stateName}${h.transitionName ? ` via ${h.transitionName}` : ''}`}
                      className={`hover:text-[#58a6ff] transition-colors ${
                        i === activeIndex ? 'font-bold text-[#58a6ff]' : ''
                      }`}
                    >
                      {i}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Expanded Step Context & Variable Diff Drawer */}
          {isExpanded && currentStep && (
            <div className="pt-3 border-t border-[#2D333B]/70 space-y-3">
              {/* Step Summary Details */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs bg-[#0F1115] p-2.5 rounded-xl border border-[#2D333B]">
                <div className="flex items-center space-x-3">
                  {/* State Name */}
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[#8B949E]">State:</span>
                    <span className="font-bold text-[#F0F6FC] bg-[#16191E] px-2 py-0.5 rounded border border-[#2D333B]">
                      {currentStep.stateName}
                    </span>
                    {activeStateNode?.is_initial && (
                      <span className="text-[10px] font-semibold text-[#3fb950] px-1.5 py-0.5 bg-[#238636]/15 rounded border border-[#238636]/30">
                        Initial
                      </span>
                    )}
                    {activeStateNode?.is_terminal && (
                      <span className="text-[10px] font-semibold text-[#D29922] px-1.5 py-0.5 bg-[#D29922]/15 rounded border border-[#D29922]/30">
                        Terminal
                      </span>
                    )}
                  </div>

                  {/* Transition Info */}
                  {currentStep.transitionName && (
                    <div className="flex items-center space-x-1.5 pl-2 border-l border-[#2D333B]">
                      <ArrowRight className="w-3.5 h-3.5 text-[#8B949E]" />
                      <span className="text-[#8B949E]">via</span>
                      <span className="font-semibold text-[#58a6ff]">
                        {currentStep.transitionName}
                      </span>
                    </div>
                  )}

                  {/* Trigger Event Badge */}
                  {currentStep.triggerEvent && (
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-[#D29922]/15 text-[#D29922] border border-[#D29922]/30 text-[10px] font-mono font-semibold">
                      <Zap className="w-3 h-3" />
                      <span>Event: {currentStep.triggerEvent}</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-3 text-[11px] text-[#8B949E]">
                  <span className="font-mono">{currentStep.timestamp}</span>
                </div>
              </div>

              {/* Variable Valuation & Diff Inspector */}
              <div className="bg-[#0F1115] rounded-xl border border-[#2D333B] p-3 space-y-2">
                <div className="flex items-center justify-between pb-1 border-b border-[#2D333B]/50">
                  <div className="flex items-center space-x-2">
                    <Database className="w-3.5 h-3.5 text-[#3B82F6]" />
                    <span className="text-xs font-bold text-[#F0F6FC]">
                      Variables at Step {activeIndex}
                    </span>
                    {activeIndex > 0 && (
                      <span className="text-[10px] text-[#8B949E]">
                        ({variableDiff.filter((v) => v.hasChanged).length} changed from Step {activeIndex - 1})
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowOnlyChangedVars(!showOnlyChangedVars)}
                      className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                        showOnlyChangedVars
                          ? 'bg-[#3B82F6]/20 text-[#58a6ff] border-[#3B82F6]/40 font-semibold'
                          : 'bg-[#16191E] text-[#8B949E] border-[#2D333B] hover:text-[#C9D1D9]'
                      }`}
                    >
                      {showOnlyChangedVars ? 'Showing Changed Only' : 'Show All'}
                    </button>
                  </div>
                </div>

                {/* Variables Grid */}
                <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto pr-1">
                  {variableDiff.length === 0 ? (
                    <span className="text-xs text-[#8B949E] italic">No variables declared in model</span>
                  ) : (
                    variableDiff
                      .filter((v) => (showOnlyChangedVars ? v.hasChanged : true))
                      .map(({ key, currentVal, prevVal, hasChanged }) => (
                        <div
                          key={key}
                          className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-mono border transition-all ${
                            hasChanged && activeIndex > 0
                              ? 'bg-[#3B82F6]/15 border-[#3B82F6]/50 text-[#F0F6FC] shadow-xs'
                              : 'bg-[#16191E] border-[#2D333B] text-[#C9D1D9]'
                          }`}
                        >
                          <span className="font-semibold text-[#8B949E]">{key}:</span>
                          {hasChanged && activeIndex > 0 && prevVal !== undefined ? (
                            <div className="flex items-center space-x-1">
                              <span className="line-through text-[#8B949E] text-[10px]">
                                {typeof prevVal === 'string' ? `"${prevVal}"` : String(prevVal)}
                              </span>
                              <ArrowRight className="w-2.5 h-2.5 text-[#3B82F6]" />
                              <span className="font-bold text-[#3fb950]">
                                {typeof currentVal === 'string' ? `"${currentVal}"` : String(currentVal)}
                              </span>
                            </div>
                          ) : (
                            <span className="font-semibold text-[#F0F6FC]">
                              {typeof currentVal === 'string' ? `"${currentVal}"` : String(currentVal)}
                            </span>
                          )}
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
