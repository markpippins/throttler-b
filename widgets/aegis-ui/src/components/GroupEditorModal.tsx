/**
 * Modal for creating and editing Visual Containers (State Groups)
 */

import React, { useState, useEffect } from 'react';
import { X, Check, Boxes, Layers, Palette, Info } from 'lucide-react';
import { StateGroup, StateNode } from '../types';

export interface GroupColorOption {
  id: string;
  name: string;
  accent: string;
  bgTint: string;
  border: string;
  badge: string;
}

export const GROUP_COLORS: GroupColorOption[] = [
  {
    id: 'blue',
    name: 'Ocean Blue',
    accent: '#3B82F6',
    bgTint: 'rgba(59, 130, 246, 0.08)',
    border: 'rgba(59, 130, 246, 0.4)',
    badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  },
  {
    id: 'emerald',
    name: 'Emerald Green',
    accent: '#10B981',
    bgTint: 'rgba(16, 185, 129, 0.08)',
    border: 'rgba(16, 185, 129, 0.4)',
    badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  },
  {
    id: 'purple',
    name: 'Amethyst Purple',
    accent: '#A855F7',
    bgTint: 'rgba(168, 85, 247, 0.08)',
    border: 'rgba(168, 85, 247, 0.4)',
    badge: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  },
  {
    id: 'cyan',
    name: 'Cyan Teal',
    accent: '#06B6D4',
    bgTint: 'rgba(6, 182, 212, 0.08)',
    border: 'rgba(6, 182, 212, 0.4)',
    badge: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  },
  {
    id: 'amber',
    name: 'Warm Amber',
    accent: '#F59E0B',
    bgTint: 'rgba(245, 158, 11, 0.08)',
    border: 'rgba(245, 158, 11, 0.4)',
    badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  },
  {
    id: 'rose',
    name: 'Coral Rose',
    accent: '#F43F5E',
    bgTint: 'rgba(244, 63, 94, 0.08)',
    border: 'rgba(244, 63, 94, 0.4)',
    badge: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  },
  {
    id: 'slate',
    name: 'Steel Slate',
    accent: '#94A3B8',
    bgTint: 'rgba(148, 163, 184, 0.06)',
    border: 'rgba(148, 163, 184, 0.35)',
    badge: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  },
];

interface GroupEditorModalProps {
  isOpen: boolean;
  group?: Partial<StateGroup> | null;
  states: StateNode[];
  existingGroups: StateGroup[];
  onClose: () => void;
  onSave: (groupData: Partial<StateGroup>, selectedStateIds: string[]) => Promise<void>;
}

export const GroupEditorModal: React.FC<GroupEditorModalProps> = ({
  isOpen,
  group,
  states,
  existingGroups,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('blue');
  const [selectedStateIds, setSelectedStateIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (group) {
        setName(group.name || '');
        setDescription(group.description || '');
        setColor(group.color || 'blue');
        // Determine selected states: from group.state_ids or states where s.group_id === group.id
        const ids = new Set<string>(group.state_ids || []);
        if (group.id) {
          states.forEach((s) => {
            if (s.group_id === group.id) ids.add(s.id);
          });
        }
        setSelectedStateIds(Array.from(ids));
      } else {
        setName('');
        setDescription('');
        // Suggest next unused color
        const usedColors = new Set(existingGroups.map((g) => g.color));
        const unused = GROUP_COLORS.find((c) => !usedColors.has(c.id));
        setColor(unused ? unused.id : 'blue');
        setSelectedStateIds([]);
      }
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen, group, states, existingGroups]);

  if (!isOpen) return null;

  const isEditing = Boolean(group?.id);

  const toggleState = (stateId: string) => {
    setSelectedStateIds((prev) =>
      prev.includes(stateId) ? prev.filter((id) => id !== stateId) : [...prev, stateId]
    );
  };

  const handleSelectAll = () => {
    setSelectedStateIds(states.map((s) => s.id));
  };

  const handleClearAll = () => {
    setSelectedStateIds([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please provide a container name');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onSave(
        {
          ...(group?.id ? { id: group.id } : {}),
          name: trimmed,
          description: description.trim() || undefined,
          color,
          state_ids: selectedStateIds,
        },
        selectedStateIds
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save container');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeColorObj = GROUP_COLORS.find((c) => c.id === color) || GROUP_COLORS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="bg-[#16191E] rounded-xl shadow-2xl border border-[#2D333B] w-full max-w-lg overflow-hidden text-[#C9D1D9] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2D333B]">
          <div className="flex items-center space-x-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center border"
              style={{
                backgroundColor: activeColorObj.bgTint,
                borderColor: activeColorObj.border,
              }}
            >
              <Boxes className="w-4 h-4" style={{ color: activeColorObj.accent }} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">
                {isEditing ? 'Edit Visual Container' : 'Create Visual Container'}
              </h3>
              <p className="text-xs text-[#8B949E]">
                Group and visually isolate related states in the diagram
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#8B949E] hover:text-[#C9D1D9] p-1 rounded hover:bg-[#21262D]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-2.5 bg-red-950/40 border border-red-800/60 rounded-md text-xs text-red-300">
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-[#8B949E] mb-1">
              Container Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Voting Protocol, Recovery Loop, Order Lifecycle"
              className="w-full bg-[#0F1115] border border-[#2D333B] rounded-lg px-3 py-2 text-xs text-white placeholder-[#8B949E]/50 focus:border-[#3B82F6] focus:outline-none"
            />
          </div>

          {/* Color Palette Picker */}
          <div>
            <label className="block text-xs font-medium text-[#8B949E] mb-1.5 flex items-center justify-between">
              <span>Color Theme</span>
              <span className="text-[11px] text-[#8B949E] font-normal">{activeColorObj.name}</span>
            </label>
            <div className="grid grid-cols-7 gap-2">
              {GROUP_COLORS.map((c) => {
                const isSelected = color === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setColor(c.id)}
                    title={c.name}
                    className={`h-8 rounded-lg flex items-center justify-center border transition-all ${
                      isSelected
                        ? 'ring-2 ring-white scale-105 shadow-md'
                        : 'hover:scale-102 hover:border-[#4B5563]'
                    }`}
                    style={{
                      backgroundColor: c.accent,
                      borderColor: isSelected ? '#FFFFFF' : 'rgba(255,255,255,0.15)',
                    }}
                  >
                    {isSelected && <Check className="w-4 h-4 text-white stroke-[2.5]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-[#8B949E] mb-1">
              Description <span className="text-[#8B949E]/70 text-[11px]">(Optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Explain the subsystem or semantic purpose of this state group..."
              className="w-full bg-[#0F1115] border border-[#2D333B] rounded-lg px-3 py-2 text-xs text-white placeholder-[#8B949E]/50 focus:border-[#3B82F6] focus:outline-none resize-none"
            />
          </div>

          {/* Member States Selection */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-[#8B949E] flex items-center space-x-1.5">
                <Layers className="w-3.5 h-3.5" />
                <span>Member States ({selectedStateIds.length}/{states.length})</span>
              </label>
              <div className="flex items-center space-x-2 text-[11px]">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-[#3B82F6] hover:underline"
                >
                  Select All
                </button>
                <span className="text-[#2D333B]">•</span>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-[#8B949E] hover:underline"
                >
                  Clear
                </button>
              </div>
            </div>

            {states.length === 0 ? (
              <div className="p-3 bg-[#0F1115] border border-[#2D333B] rounded-lg text-center text-xs text-[#8B949E]">
                No states exist in this registry yet. Add states first or create an empty container.
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto bg-[#0F1115] border border-[#2D333B] rounded-lg p-2 space-y-1 divide-y divide-[#2D333B]/40">
                {states.map((s) => {
                  const isChecked = selectedStateIds.includes(s.id);
                  // Check if state is in another group
                  const otherGroup = existingGroups.find(
                    (g) => g.id !== group?.id && (g.state_ids?.includes(s.id) || s.group_id === g.id)
                  );

                  return (
                    <label
                      key={s.id}
                      className={`flex items-center justify-between px-2 py-1.5 rounded cursor-pointer transition-colors text-xs ${
                        isChecked ? 'bg-[#21262D]' : 'hover:bg-[#1A1E24]'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleState(s.id)}
                          className="rounded border-[#2D333B] text-[#3B82F6] focus:ring-0 focus:ring-offset-0 bg-[#0F1115]"
                        />
                        <span className={`font-mono truncate ${isChecked ? 'text-white font-medium' : 'text-[#C9D1D9]'}`}>
                          {s.name}
                        </span>
                        {s.is_initial && (
                          <span className="px-1.5 py-0.5 text-[9px] rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            INITIAL
                          </span>
                        )}
                        {s.is_terminal && (
                          <span className="px-1.5 py-0.5 text-[9px] rounded bg-slate-500/20 text-slate-400 border border-slate-500/30">
                            TERMINAL
                          </span>
                        )}
                      </div>

                      {otherGroup && !isChecked && (
                        <span className="text-[10px] text-[#8B949E] italic truncate max-w-[120px]">
                          in {otherGroup.name}
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end space-x-2 border-t border-[#2D333B]">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-[#C9D1D9] hover:bg-[#21262D] rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center space-x-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-[#3B82F6] hover:bg-[#2563EB] disabled:opacity-50 rounded-lg shadow-sm transition-colors"
            >
              {isSubmitting ? (
                <span>Saving...</span>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>{isEditing ? 'Save Container' : 'Create Container'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
