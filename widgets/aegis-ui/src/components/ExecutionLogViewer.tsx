/**
 * Aegis State-Machine Execution Log Viewer
 * Displays audit trail from /api/registries/:id/execution-log
 */

import React, { useState } from 'react';
import { Activity, Download, RefreshCw, Filter, User, Tag, Clock } from 'lucide-react';
import { ExecutionLogItem, StateNode, Transition } from '../types';

interface ExecutionLogViewerProps {
  logs: ExecutionLogItem[];
  states: StateNode[];
  transitions: Transition[];
  onRefresh: () => Promise<void>;
  isRefreshing: boolean;
}

export const ExecutionLogViewer: React.FC<ExecutionLogViewerProps> = ({
  logs,
  states,
  transitions,
  onRefresh,
  isRefreshing,
}) => {
  const [filterText, setFilterText] = useState('');

  const filteredLogs = logs.filter((log) => {
    if (!filterText.trim()) return true;
    const term = filterText.toLowerCase();
    return (
      (log.trigger_event && log.trigger_event.toLowerCase().includes(term)) ||
      (log.trigger_user && log.trigger_user.toLowerCase().includes(term)) ||
      (log.entity_id && log.entity_id.toLowerCase().includes(term))
    );
  });

  const handleDownloadLogs = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `aegis-execution-log-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="h-full overflow-y-auto bg-[#0F1115] p-6 text-[#C9D1D9]">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-[#16191E] rounded-xl border border-[#2D333B] p-6 shadow-sm flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-1.5 bg-[#3B82F6]/10 text-[#3B82F6] rounded-lg border border-[#3B82F6]/30">
                <Activity className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-bold text-[#F0F6FC] tracking-tight">
                State Machine Execution Log
              </h2>
            </div>
            <p className="text-xs text-[#8B949E] mt-1">
              Live audit events logged via <code className="bg-[#0F1115] px-1.5 py-0.5 rounded border border-[#2D333B] text-[#58a6ff] font-mono">/api/registries/:id/execution-log</code> during simulations and runtime execution.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownloadLogs}
              disabled={logs.length === 0}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-[#C9D1D9] bg-[#16191E] hover:bg-[#21262D] border border-[#2D333B] rounded-lg transition-colors disabled:opacity-40"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON</span>
            </button>

            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#238636] hover:bg-[#2ea043] rounded-lg shadow-sm shadow-[#238636]/30 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-[#16191E] rounded-xl border border-[#2D333B] shadow-sm p-4 flex items-center justify-between">
          <div className="flex items-center space-x-2 flex-1 max-w-sm">
            <Filter className="w-4 h-4 text-[#8B949E]" />
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Filter by event, user, or entity ID..."
              className="w-full bg-[#0F1115] border border-[#2D333B] rounded-lg px-3 py-1.5 text-xs text-[#F0F6FC] placeholder-[#8B949E] focus:outline-none focus:border-[#3B82F6]"
            />
          </div>

          <span className="text-xs text-[#8B949E]">
            Showing <span className="font-semibold text-[#F0F6FC] font-mono">{filteredLogs.length}</span> of {logs.length} entries
          </span>
        </div>

        {/* Logs Table */}
        <div className="bg-[#16191E] rounded-xl border border-[#2D333B] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0A0C10] text-[#8B949E] font-semibold border-b border-[#2D333B]">
                <tr>
                  <th className="px-5 py-3">Timestamp</th>
                  <th className="px-5 py-3">Trigger Event</th>
                  <th className="px-5 py-3">From State</th>
                  <th className="px-5 py-3">To State</th>
                  <th className="px-5 py-3">Transition</th>
                  <th className="px-5 py-3">User / Entity</th>
                  <th className="px-5 py-3">Context</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2D333B]">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-[#8B949E]">
                      No execution logs recorded yet. Fire transitions in the simulator to generate logs!
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => {
                    const fromS = states.find((s) => s.id === log.from_state_id)?.name || '—';
                    const toS = states.find((s) => s.id === log.to_state_id)?.name || '—';
                    const trName = transitions.find((t) => t.id === log.transition_id)?.name || '—';

                    return (
                      <tr key={log.id} className="hover:bg-[#1C2128]">
                        <td className="px-5 py-3 text-[#8B949E] font-mono text-[11px] whitespace-nowrap">
                          {new Date(log.created_at).toLocaleTimeString()}
                        </td>
                        <td className="px-5 py-3 font-semibold text-[#F0F6FC]">
                          {log.trigger_event || 'STATE_TRANSITION'}
                        </td>
                        <td className="px-5 py-3 font-mono text-[#8B949E]">{fromS}</td>
                        <td className="px-5 py-3 font-mono font-semibold text-[#58a6ff]">{toS}</td>
                        <td className="px-5 py-3 text-[#C9D1D9]">{trName}</td>
                        <td className="px-5 py-3 text-[#8B949E]">
                          {log.trigger_user || log.entity_id || 'system'}
                        </td>
                        <td className="px-5 py-3 text-[#8B949E] font-mono text-[10px] max-w-xs truncate">
                          {log.context ? JSON.stringify(log.context) : '—'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
