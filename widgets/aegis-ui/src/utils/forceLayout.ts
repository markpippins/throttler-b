/**
 * Force-Directed Graph Auto-Layout for Finite State Machines
 * Uses Coulomb repulsion, Hooke spring attraction, directional flow bias,
 * and rectangle collision avoidance to organize state nodes cleanly.
 */

import { StateNode, Transition } from '../types';

export interface ForceLayoutOptions {
  idealDistance?: number;
  iterations?: number;
  width?: number;
  height?: number;
  padding?: number;
}

export interface NodePosition {
  id: string;
  x: number;
  y: number;
}

export function computeForceDirectedLayout(
  states: StateNode[],
  transitions: Transition[],
  options: ForceLayoutOptions = {}
): NodePosition[] {
  if (states.length === 0) return [];

  const {
    idealDistance = 260,
    iterations = 120,
    padding = 80,
  } = options;

  if (states.length === 1) {
    return [{ id: states[0].id, x: padding + 80, y: padding + 60 }];
  }

  // 1. Build Adjacency and calculate topological depth from initial states
  const nodeIds = states.map((s) => s.id);
  const nodeIndexMap = new Map<string, number>(nodeIds.map((id, idx) => [id, idx]));

  // Adjacency lists
  const successors = new Map<string, string[]>();
  const predecessors = new Map<string, string[]>();
  nodeIds.forEach((id) => {
    successors.set(id, []);
    predecessors.set(id, []);
  });

  transitions.forEach((t) => {
    if (t.from_state_id !== t.to_state_id) {
      successors.get(t.from_state_id)?.push(t.to_state_id);
      predecessors.get(t.to_state_id)?.push(t.from_state_id);
    }
  });

  // Calculate BFS rank (distance from initial node)
  const initialNodes = states.filter((s) => s.is_initial);
  const queue: { id: string; rank: number }[] = [];
  const ranks = new Map<string, number>();

  if (initialNodes.length > 0) {
    initialNodes.forEach((init) => {
      ranks.set(init.id, 0);
      queue.push({ id: init.id, rank: 0 });
    });
  } else {
    // Fallback: use first state as root
    ranks.set(nodeIds[0], 0);
    queue.push({ id: nodeIds[0], rank: 0 });
  }

  while (queue.length > 0) {
    const { id, rank } = queue.shift()!;
    const succs = successors.get(id) || [];
    for (const succ of succs) {
      if (!ranks.has(succ)) {
        ranks.set(succ, rank + 1);
        queue.push({ id: succ, rank: rank + 1 });
      }
    }
  }

  // Assign max rank to unreached nodes
  let maxRank = 0;
  ranks.forEach((r) => {
    if (r > maxRank) maxRank = r;
  });
  nodeIds.forEach((id) => {
    if (!ranks.has(id)) {
      ranks.set(id, maxRank + 1);
    }
  });

  // 2. Initialize positions
  // If states already have sensible positions, use them with a little damping;
  // otherwise seed them in rank-based strata with slight jitter.
  const pos = states.map((s, idx) => {
    if (s.x !== undefined && s.y !== undefined && (s.x !== 0 || s.y !== 0)) {
      return { x: s.x, y: s.y };
    }
    const rank = ranks.get(s.id) ?? 0;
    const countInRank = states.filter((other, i) => (ranks.get(other.id) ?? 0) === rank && i <= idx).length;
    return {
      x: padding + rank * 260 + (idx % 2) * 20,
      y: padding + countInRank * 185 + (idx % 3) * 15,
    };
  });

  const vel = states.map(() => ({ x: 0, y: 0 }));

  // Dimensions of a state card in VisualCanvas: 200px width, ~140px-180px height
  const halfCardW = 110;
  const halfCardH = 75;

  const initialTemp = 25;
  const targetCenter = {
    x: padding + (maxRank + 1) * 140,
    y: padding + 220,
  };

  // 3. Force-directed relaxation iterations
  for (let iter = 0; iter < iterations; iter++) {
    const temp = initialTemp * (1 - iter / iterations);
    const force = states.map(() => ({ x: 0, y: 0 }));

    // A. Node-Node Repulsion (Coulomb + Box Collision push)
    for (let i = 0; i < states.length; i++) {
      for (let j = i + 1; j < states.length; j++) {
        let dx = pos[i].x - pos[j].x;
        let dy = pos[i].y - pos[j].y;

        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) {
          dx = (Math.random() - 0.5) * 10;
          dy = (Math.random() - 0.5) * 10;
        }

        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

        // Bounding Box Overlap check
        const overlapX = (halfCardW * 2 + 30) - Math.abs(dx);
        const overlapY = (halfCardH * 2 + 25) - Math.abs(dy);

        if (overlapX > 0 && overlapY > 0) {
          // Hard push to avoid overlapping rectangles
          const signX = dx >= 0 ? 1 : -1;
          const signY = dy >= 0 ? 1 : -1;
          const repPushX = signX * overlapX * 0.35;
          const repPushY = signY * overlapY * 0.35;

          force[i].x += repPushX;
          force[i].y += repPushY;
          force[j].x -= repPushX;
          force[j].y -= repPushY;
        }

        // Coulomb Repulsion (smooth inverse-square)
        const kRepulse = 60000;
        const repMag = kRepulse / Math.max(dist * dist, 1600);
        const fx = (dx / dist) * repMag;
        const fy = (dy / dist) * repMag;

        force[i].x += fx;
        force[i].y += fy;
        force[j].x -= fx;
        force[j].y -= fy;

        // Group Cohesion: gently pull states together if they belong to the same visual container
        if (states[i].group_id && states[i].group_id === states[j].group_id) {
          const groupSpring = 0.025;
          force[i].x -= dx * groupSpring;
          force[i].y -= dy * groupSpring;
          force[j].x += dx * groupSpring;
          force[j].y += dy * groupSpring;
        }
      }
    }

    // B. Spring Attraction for Transitions (Hooke's Law)
    transitions.forEach((t) => {
      const fromIdx = nodeIndexMap.get(t.from_state_id);
      const toIdx = nodeIndexMap.get(t.to_state_id);
      if (fromIdx === undefined || toIdx === undefined || fromIdx === toIdx) return;

      const dx = pos[toIdx].x - pos[fromIdx].x;
      const dy = pos[toIdx].y - pos[fromIdx].y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;

      const delta = dist - idealDistance;
      const springK = 0.045;
      const springMag = delta * springK;

      const sfx = (dx / dist) * springMag;
      const sfy = (dy / dist) * springMag;

      force[fromIdx].x += sfx;
      force[fromIdx].y += sfy;
      force[toIdx].x -= sfx;
      force[toIdx].y -= sfy;

      // Flow bias: transitions should generally flow left-to-right
      const minXSep = 140;
      if (pos[toIdx].x < pos[fromIdx].x + minXSep) {
        const flowDeficit = (pos[fromIdx].x + minXSep) - pos[toIdx].x;
        const flowPush = flowDeficit * 0.04;
        force[fromIdx].x -= flowPush;
        force[toIdx].x += flowPush;
      }
    });

    // C. Structural Anchoring & Center Gravity
    for (let i = 0; i < states.length; i++) {
      const state = states[i];

      // Initial state gently attracted to left column
      if (state.is_initial) {
        force[i].x += (padding - pos[i].x) * 0.04;
      }

      // Terminal state gently biased toward right
      if (state.is_terminal) {
        const targetTerminalX = padding + Math.max(maxRank, 2) * 250;
        force[i].x += (targetTerminalX - pos[i].x) * 0.03;
      }

      // Center gravity keeps the graph coherent
      force[i].x += (targetCenter.x - pos[i].x) * 0.012;
      force[i].y += (targetCenter.y - pos[i].y) * 0.012;
    }

    // D. Velocity integration with damping and temperature limit
    for (let i = 0; i < states.length; i++) {
      const damping = 0.78;
      vel[i].x = (vel[i].x + force[i].x) * damping;
      vel[i].y = (vel[i].y + force[i].y) * damping;

      const speed = Math.sqrt(vel[i].x * vel[i].x + vel[i].y * vel[i].y);
      if (speed > temp && speed > 0) {
        vel[i].x = (vel[i].x / speed) * temp;
        vel[i].y = (vel[i].y / speed) * temp;
      }

      pos[i].x += vel[i].x;
      pos[i].y += vel[i].y;
    }
  }

  // 4. Normalize coordinates: shift so minimum coordinates align with padding
  let minX = Infinity;
  let minY = Infinity;
  pos.forEach((p) => {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
  });

  const shiftX = padding - minX;
  const shiftY = padding - minY;

  return states.map((s, idx) => ({
    id: s.id,
    x: Math.max(padding, Math.round(pos[idx].x + shiftX)),
    y: Math.max(padding, Math.round(pos[idx].y + shiftY)),
  }));
}
