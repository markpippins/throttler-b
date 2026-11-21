/**
 * Slot / Composition Contract (record d43a8d6d)
 *
 * Two orthogonal axes:
 *   - Region (`LayoutNode.region`) answers "where does the ROOT widget sit on the surface?"
 *   - Slot   (`CompositionSchema`) answers "where does an occupant sit inside its HOST's
 *            own coordinate space?"
 *
 * An occupant's position inside a graph canvas, a tab strip, or a kanban column is NOT a
 * Region. `LayoutNode` keeps placing roots only; interior placement is the host's declared
 * commitment, honoured by the host's renderer.
 *
 * Everything here is additive and optional: a ViewSpec without `composition` validates
 * exactly as it did before this module existed, so `schemaVersion` stays 1.
 */

import type { CapabilityId, DensitySetting } from "./designIR";
import type { WidgetInstance, ViewSpec } from "./viewSpec";
import type { WidgetDefinition } from "../widget/catalog";

// ── Epistemic claim tokens ───────────────────────────────────────────

/**
 * Mirrors the app's `StateTokenKey` (`src/surface/core/themeRegistry.ts`). This package
 * cannot import from the app (dependency direction is app → package), so the union is
 * declared here and a parity test in the app asserts the two never diverge.
 *
 * `refusal` is an OVERLAY on `live` — an authoritative live envelope rendered with blocking
 * treatment (F-1) — so it carries `live`'s claim strength and must not appear inside a
 * weaker host.
 */
export type EpistemicClaim = "live" | "degraded" | "refusal" | "unknown" | "demo";

export const EPISTEMIC_CLAIMS: readonly EpistemicClaim[] = [
  "live",
  "degraded",
  "refusal",
  "unknown",
  "demo",
];

const CLAIM_STRENGTH: Readonly<Record<EpistemicClaim, number>> = {
  live: 4,
  refusal: 4,
  degraded: 3,
  unknown: 2,
  demo: 1,
};

/** Higher = stronger provenance claim. Used to enforce occupant ≤ host (§7.1). */
export function claimStrength(claim: EpistemicClaim): number {
  return CLAIM_STRENGTH[claim];
}

export function isEpistemicClaim(value: unknown): value is EpistemicClaim {
  return typeof value === "string" && (EPISTEMIC_CLAIMS as readonly string[]).includes(value);
}

/** Weakest (least strong) of the supplied claims; `undefined` when none is supplied. */
export function weakestClaim(claims: ReadonlyArray<EpistemicClaim | undefined>): EpistemicClaim | undefined {
  let weakest: EpistemicClaim | undefined;
  for (const claim of claims) {
    if (!claim) continue;
    if (weakest === undefined || claimStrength(claim) < claimStrength(weakest)) weakest = claim;
  }
  return weakest;
}

// ── Renderer kinds ───────────────────────────────────────────────────

export type RendererKind = "react" | "canvas2d" | "webgl";

/** Kinds that consume an imperative adapter instead of a React component. */
export type ImperativeRendererKind = Exclude<RendererKind, "react">;

/**
 * A serializable pointer to a runtime `RendererAdapter`. The AST stores the REF, never the
 * functions, so a composed ViewSpec stays content-addressable (Q1: compile-time graph).
 */
export interface RendererRef {
  adapterId: string;
  kind: ImperativeRendererKind;
}

// ── Slot declarations and bindings ───────────────────────────────────

export interface SlotDescriptor {
  /** Stable within the host; part of the documentation/tag path. */
  id: string;
  kind: "content" | "collection" | "renderer";
  /** Capability contracts an occupant must satisfy; `"*"` admits any. */
  accepts: CapabilityId[] | "*";
  cardinality: "one" | "many" | "optional";
  /** Unfilled required slots resolve to a `degraded-missing` placeholder (§7.2). */
  required: boolean;
  /** How the host consumes the occupant. Omitted = `"react"`. */
  rendererKind?: RendererKind;
  /** Host-owned layout hint; advisory to the host renderer, never a Region. */
  layoutHint?: { density?: DensitySetting; order?: number };
  /** Documentation anchor for the slot itself. */
  docAnchor?: string;
}

export interface CompositionSchema {
  slots: SlotDescriptor[];
  /** Recursion bound the validator will admit. Default 3 (Q4). */
  maxDepth?: number;
}

export interface SlotBinding {
  /** Instance id of the host widget, resolved in `ViewSpec.widgets`. */
  hostWidgetId: string;
  slotId: string;
  /** Recursive: an occupant may itself be a host. */
  occupant: WidgetInstance;
  order?: number;
  /** Occupants bind their own adapter; the host never supplies occupant data (§7.4). */
  adapterBindingId?: string;
}

export const DEFAULT_MAX_COMPOSITION_DEPTH = 3;

// ── Validation (§8, V1–V8) ───────────────────────────────────────────

export type CompositionRule = "V1" | "V2" | "V3" | "V4" | "V5" | "V6" | "V7" | "V8";

export interface CompositionViolation {
  rule: CompositionRule;
  hostWidgetId?: string;
  slotId?: string;
  message: string;
}

/** Resolves a widget definition by its type id (e.g. `WidgetCatalog.getWidget`). */
export type CompositionDefinitionResolver = (widgetType: string) => WidgetDefinition | undefined;

/** Adapter form of `WidgetCatalog.getWidget`, so callers need not wrap it. */
export function catalogDefinitionResolver(catalog: {
  getWidget(id: string): WidgetDefinition | undefined;
}): CompositionDefinitionResolver {
  return (widgetType: string) => catalog.getWidget(widgetType);
}

function slotLookup(schema: CompositionSchema): Map<string, SlotDescriptor> {
  const map = new Map<string, SlotDescriptor>();
  for (const slot of schema.slots) map.set(slot.id, slot);
  return map;
}

/**
 * Pure, DOM-free composition validation. Returns every violation found (not just the first)
 * so a caller can report the whole picture.
 */
export function validateComposition(
  spec: ViewSpec,
  resolveDefinition: CompositionDefinitionResolver,
): CompositionViolation[] {
  const violations: CompositionViolation[] = [];
  const bindings = spec.composition ?? [];
  if (bindings.length === 0) return violations;

  const byHost = new Map<string, SlotBinding[]>();
  for (const binding of bindings) {
    const existing = byHost.get(binding.hostWidgetId);
    if (existing) existing.push(binding);
    else byHost.set(binding.hostWidgetId, [binding]);
  }

  const rootIds = new Set(spec.widgets.map((widget) => widget.id));
  for (const hostId of byHost.keys()) {
    if (!rootIds.has(hostId)) {
      violations.push({
        rule: "V2",
        hostWidgetId: hostId,
        message: `composition binds to "${hostId}", which is not a widget instance on this surface`,
      });
    }
  }

  const seenBindings = new Set<string>();

  const visit = (host: WidgetInstance, depth: number, path: readonly string[]): void => {
    const hostBindings = byHost.get(host.id) ?? [];
    if (hostBindings.length === 0) return;

    const definition = resolveDefinition(host.widget.type);
    if (!definition) {
      violations.push({
        rule: "V2",
        hostWidgetId: host.id,
        message: `host "${host.id}" has no resolvable widget definition (type "${host.widget.type}")`,
      });
      return;
    }

    const schema = definition.composition;
    if (!schema) {
      violations.push({
        rule: "V1",
        hostWidgetId: host.id,
        message: `host "${host.id}" (${host.widget.type}) declares no CompositionSchema but carries ${hostBindings.length} binding(s)`,
      });
      return;
    }

    const slots = slotLookup(schema);
    if (slots.size !== schema.slots.length) {
      violations.push({
        rule: "V2",
        hostWidgetId: host.id,
        message: `host "${host.id}" declares duplicate slot ids`,
      });
    }

    const maxDepth = schema.maxDepth ?? DEFAULT_MAX_COMPOSITION_DEPTH;
    const occupantDepth = depth + 1;
    if (occupantDepth > maxDepth) {
      violations.push({
        rule: "V6",
        hostWidgetId: host.id,
        message: `occupancy depth ${occupantDepth} exceeds maxDepth ${maxDepth} on host "${host.id}"`,
      });
    }

    const counts = new Map<string, number>();

    for (const binding of hostBindings) {
      const slot = slots.get(binding.slotId);
      if (!slot) {
        violations.push({
          rule: "V1",
          hostWidgetId: host.id,
          slotId: binding.slotId,
          message: `host "${host.id}" does not declare slot "${binding.slotId}"`,
        });
        continue;
      }

      const occupant = binding.occupant;
      counts.set(slot.id, (counts.get(slot.id) ?? 0) + 1);

      // V4 — capability acceptance.
      if (slot.accepts !== "*" && !slot.accepts.includes(occupant.widget.contract)) {
        violations.push({
          rule: "V4",
          hostWidgetId: host.id,
          slotId: slot.id,
          message: `slot "${slot.id}" accepts [${slot.accepts.join(", ")}] but occupant "${occupant.id}" provides ${occupant.widget.contract}`,
        });
      }

      // Identity is the INSTANCE id throughout: two DataTables share `widget.id`, so keying
      // on the widget type would report false cycles and false duplicate bindings.

      // V5 — acyclic occupancy. A detected cycle must STOP descent: recording the violation
      // and then recursing anyway is unbounded recursion, not a report.
      if (occupant.id === host.id || path.includes(occupant.id)) {
        violations.push({
          rule: "V5",
          hostWidgetId: host.id,
          slotId: slot.id,
          message: `occupant "${occupant.id}" is already an ancestor of host "${host.id}" (cycle)`,
        });
        continue;
      }

      // V2 — the same occupant bound twice to the same slot.
      const bindingKey = `${host.id}|${slot.id}|${occupant.id}`;
      if (seenBindings.has(bindingKey)) {
        violations.push({
          rule: "V2",
          hostWidgetId: host.id,
          slotId: slot.id,
          message: `occupant "${occupant.id}" is bound twice to slot "${slot.id}" on host "${host.id}"`,
        });
      } else {
        seenBindings.add(bindingKey);
      }

      // V7 — envelope monotonicity: an occupant may not claim more than its host.
      if (host.envelope && occupant.envelope) {
        if (claimStrength(occupant.envelope) > claimStrength(host.envelope)) {
          violations.push({
            rule: "V7",
            hostWidgetId: host.id,
            slotId: slot.id,
            message: `occupant "${occupant.id}" claims "${occupant.envelope}" inside host "${host.id}" claiming "${host.envelope}": an occupant may not claim a stronger envelope than its host`,
          });
        }
      }

      // V8 — renderer compatibility.
      const rendererKind = slot.rendererKind ?? "react";
      if (rendererKind === "react") {
        if (occupant.renderer) {
          violations.push({
            rule: "V8",
            hostWidgetId: host.id,
            slotId: slot.id,
            message: `slot "${slot.id}" is a react slot but occupant "${occupant.id}" supplies a ${occupant.renderer.kind} renderer`,
          });
        }
      } else if (!occupant.renderer) {
        violations.push({
          rule: "V8",
          hostWidgetId: host.id,
          slotId: slot.id,
          message: `slot "${slot.id}" requires a ${rendererKind} renderer but occupant "${occupant.id}" supplies none`,
        });
      } else if (occupant.renderer.kind !== rendererKind) {
        violations.push({
          rule: "V8",
          hostWidgetId: host.id,
          slotId: slot.id,
          message: `slot "${slot.id}" requires a ${rendererKind} renderer but occupant "${occupant.id}" supplies ${occupant.renderer.kind}`,
        });
      }

      visit(occupant, occupantDepth, [...path, host.id]);
    }

    // V3 — cardinality, evaluated per declared slot.
    for (const [slotId, count] of counts) {
      const slot = slots.get(slotId);
      if (!slot) continue;
      if (slot.cardinality === "one" && count !== 1) {
        violations.push({
          rule: "V3",
          hostWidgetId: host.id,
          slotId,
          message: `slot "${slotId}" is cardinality "one" but has ${count} occupant(s)`,
        });
      }
      if (slot.cardinality === "optional" && count > 1) {
        violations.push({
          rule: "V3",
          hostWidgetId: host.id,
          slotId,
          message: `slot "${slotId}" is cardinality "optional" but has ${count} occupants`,
        });
      }
    }
  };

  for (const widget of spec.widgets) visit(widget, 0, []);

  return violations;
}

// ── Slot resolution ──────────────────────────────────────────────────

export type ResolvedSlotStatus = "filled" | "empty" | "degraded-missing";

export interface ResolvedSlot {
  slotId: string;
  descriptor: SlotDescriptor;
  occupants: WidgetInstance[];
  status: ResolvedSlotStatus;
  /** Present when `status === "degraded-missing"` — names the slot, never silent (§7.2). */
  caption?: string;
  /** Weakest claim among host and occupants (§7.1). */
  effectiveEnvelope?: EpistemicClaim;
}

/**
 * Resolves a host's declared slots against the bindings for that host. Declaration order is
 * preserved so the host renderer is deterministic. A required slot with no occupant yields
 * `degraded-missing` WITH a caption — an absent panel must never render as simply nothing.
 */
export function resolveSlots(
  host: WidgetInstance,
  schema: CompositionSchema,
  bindings: readonly SlotBinding[],
): ResolvedSlot[] {
  const forHost = bindings.filter((binding) => binding.hostWidgetId === host.id);

  return schema.slots.map((descriptor) => {
    const occupants = forHost
      .filter((binding) => binding.slotId === descriptor.id)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((binding) => binding.occupant);

    const status: ResolvedSlotStatus =
      occupants.length > 0 ? "filled" : descriptor.required ? "degraded-missing" : "empty";

    const resolved: ResolvedSlot = {
      slotId: descriptor.id,
      descriptor,
      occupants,
      status,
    };

    if (status === "degraded-missing") {
      resolved.caption = `Missing required slot "${descriptor.id}" on ${host.widget.type} (${host.id})`;
    }

    const envelope = weakestClaim([host.envelope, ...occupants.map((o) => o.envelope)]);
    if (envelope) resolved.effectiveEnvelope = envelope;

    return resolved;
  });
}

/** Convenience: does this surface declare any composition at all? */
export function hasComposition(spec: ViewSpec): boolean {
  return (spec.composition?.length ?? 0) > 0;
}
