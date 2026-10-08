/**
 * Visual Container Layer
 * Renders bounded grouping containers around states on the visual canvas.
 * Supports container headers, state counts, action buttons, and drag movements.
 */

import React from 'react';
import { StateGroup, StateNode, ThemeMode } from '../types';
import { GROUP_COLORS } from './GroupEditorModal';
import { Boxes, Edit2, Trash2, Plus, GripHorizontal, Info } from 'lucide-react';

interface VisualContainerLayerProps {
  groups: StateGroup[];
  states: StateNode[];
  selectedGroupId: string | null;
  draggingGroupId: string | null;
  onSelectGroup: (groupId: string | null) => void;
  onEditGroup: (group: StateGroup) => void;
  onDeleteGroup: (groupId: string) => void;
  onAddStateToGroup: (group: StateGroup) => void;
  onStartDragGroup: (e: React.MouseEvent, group: StateGroup, memberStateIds: string[]) => void;
  theme?: ThemeMode;
}

/**
 * Accurately estimate the rendered dimensions of a state card,
 * including padding, headers, group badges, descriptions, variable assignment chips,
 * and active/selection ring clearances.
 */
function estimateStateCardDimensions(state: StateNode): { width: number; height: number } {
  // Base card width is 200px + 8px ring/glow breathing room
  const width = 208;

  // Base height: top/bottom padding (24px) + header row (28px) + footer row (28px) + border (2px)
  let height = 82;

  // Group badge pill if state belongs to a group
  if (state.group_id) {
    height += 24;
  }

  // Description line if present
  if (state.description) {
    height += 22;
  }

  // Variable assignments: wrap into chip pills (approx 2 per row)
  const varCount = state.variable_assignments ? Object.keys(state.variable_assignments).length : 0;
  if (varCount > 0) {
    const chipRows = Math.ceil(varCount / 2);
    height += 12 + chipRows * 26; // top divider/margin + row heights
  }

  // Ring/shadow glow clearance (active state has ring-4 and shadow)
  height += 16;

  // Minimum height guarantee
  return { width, height: Math.max(120, height) };
}

export const VisualContainerLayer: React.FC<VisualContainerLayerProps> = ({
  groups,
  states,
  selectedGroupId,
  draggingGroupId,
  onSelectGroup,
  onEditGroup,
  onDeleteGroup,
  onAddStateToGroup,
  onStartDragGroup,
  theme = 'dark',
}) => {
  if (groups.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-0">
      {groups.map((group) => {
        // Find member states
        const memberStates = states.filter(
          (s) => (group.state_ids && group.state_ids.includes(s.id)) || s.group_id === group.id
        );

        const colorObj =
          GROUP_COLORS.find((c) => c.id === group.color) || GROUP_COLORS[0];
        const isSelected = selectedGroupId === group.id;
        const isDragging = draggingGroupId === group.id;

        // Calculate bounding box with generous padding so states never touch or overlap edges
        let boxX = group.x ?? 120;
        let boxY = group.y ?? 120;
        let boxW = 320;
        let boxH = 190;

        if (memberStates.length > 0) {
          let minX = Infinity;
          let maxX = -Infinity;
          let minY = Infinity;
          let maxY = -Infinity;

          memberStates.forEach((s) => {
            const sx = s.x ?? 150;
            const sy = s.y ?? 120;
            const { width: nodeW, height: nodeH } = estimateStateCardDimensions(s);

            if (sx < minX) minX = sx;
            if (sx + nodeW > maxX) maxX = sx + nodeW;
            if (sy < minY) minY = sy;
            if (sy + nodeH > maxY) maxY = sy + nodeH;
          });

          // Generous margins around member states
          const padX = 36; // horizontal padding on both sides
          const padBottom = 36; // clearance below the lowest state card
          const headerH = 46; // container header bar height
          const descH = group.description ? 26 : 0; // extra height for description if present
          const topClearance = 26; // clearance between container header/desc and top-most state

          const containerTopOffset = headerH + descH + topClearance;

          boxX = minX - padX;
          boxY = minY - containerTopOffset;
          boxW = Math.max(300, maxX - minX + padX * 2);
          boxH = Math.max(180, maxY - minY + containerTopOffset + padBottom);
        }

        const memberIds = memberStates.map((s) => s.id);

        return (
          <div
            key={group.id}
            id={`container-${group.id}`}
            data-container="true"
            data-group-id={group.id}
            style={{
              transform: `translate(${boxX}px, ${boxY}px)`,
              width: `${boxW}px`,
              height: `${boxH}px`,
            }}
            className={`absolute rounded-2xl border transition-colors group/container ${
              isDragging ? 'transition-none opacity-90' : 'transition-all duration-200'
            } ${
              isSelected
                ? 'ring-2 ring-white/60 shadow-xl'
                : 'hover:border-opacity-80'
            }`}
          >
            {/* Background and Border styling - interactive drag surface */}
            <div
              data-container-drag="true"
              onClick={(e) => {
                e.stopPropagation();
                onSelectGroup(group.id);
              }}
              onMouseDown={(e) => {
                if (e.button === 0) {
                  e.stopPropagation();
                  onStartDragGroup(e, group, memberIds);
                }
              }}
              className="absolute inset-0 rounded-2xl cursor-grab active:cursor-grabbing pointer-events-auto"
              style={{
                backgroundColor: colorObj.bgTint,
                borderColor: colorObj.border,
                borderWidth: '1.5px',
                borderStyle: memberStates.length > 0 ? 'solid' : 'dashed',
              }}
            />

            {/* Container Header Bar */}
            <div
              onClick={(e) => {
                e.stopPropagation();
                onSelectGroup(group.id);
              }}
              onMouseDown={(e) => {
                if (e.button === 0) {
                  e.stopPropagation();
                  onStartDragGroup(e, group, memberIds);
                }
              }}
              className="relative z-10 flex items-center justify-between px-3.5 py-2.5 rounded-t-2xl cursor-grab active:cursor-grabbing border-b select-none pointer-events-auto"
              style={{
                borderColor: colorObj.border,
                backgroundColor: 'rgba(22, 25, 30, 0.75)',
                backdropFilter: 'blur(6px)',
              }}
            >
              {/* Left: Drag Handle, Color Pill, Container Title */}
              <div className="flex items-center space-x-2 min-w-0">
                <GripHorizontal className="w-3.5 h-3.5 text-[#8B949E] opacity-60 group-hover/container:opacity-100 transition-opacity shrink-0" />
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: colorObj.accent }}
                />
                <span
                  className="text-xs font-semibold truncate text-white"
                  title={group.name}
                >
                  {group.name}
                </span>

                {/* Member count badge */}
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-md border font-medium shrink-0 ${colorObj.badge}`}
                >
                  {memberStates.length} {memberStates.length === 1 ? 'state' : 'states'}
                </span>
              </div>

              {/* Right: Quick action buttons */}
              <div
                className="flex items-center space-x-1 opacity-70 group-hover/container:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Add State to container */}
                <button
                  type="button"
                  title="Add State to this Container"
                  onClick={() => onAddStateToGroup(group)}
                  className="p-1 rounded text-[#8B949E] hover:text-white hover:bg-[#21262D] transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>

                {/* Edit Container */}
                <button
                  type="button"
                  title="Edit Container Settings"
                  onClick={() => onEditGroup(group)}
                  className="p-1 rounded text-[#8B949E] hover:text-[#58a6ff] hover:bg-[#21262D] transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>

                {/* Dissolve/Delete Container */}
                <button
                  type="button"
                  title="Delete Container (Preserves States)"
                  onClick={() => onDeleteGroup(group.id)}
                  className="p-1 rounded text-[#8B949E] hover:text-[#f85149] hover:bg-[#21262D] transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Description or Empty Prompt */}
            {memberStates.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[calc(100%-44px)] p-4 text-center select-none">
                <Boxes className="w-6 h-6 mb-2 opacity-30" style={{ color: colorObj.accent }} />
                <p className="text-xs font-medium text-[#8B949E]">Empty Container</p>
                <p className="text-[11px] text-[#8B949E]/70 mt-1 max-w-[200px]">
                  Drag states into this area or click <span className="text-white">+</span> to add states
                </p>
              </div>
            ) : group.description ? (
              <div className="px-3.5 py-1 text-[10px] text-[#8B949E]/60 italic truncate select-none pointer-events-none">
                {group.description}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};
