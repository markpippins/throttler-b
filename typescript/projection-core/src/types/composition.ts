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

// ── Validation (§8, V1–V9) ───────────────────────────────────────────

export type CompositionRule = "V1" | "V2" | "V3" | "V4" | "V5" | "V6" | "V7" | "V8" | "V9";

/**
 * `violation` rejects the surface. `degraded` is reported so the operator can see it, but is
 * not a rejection: V9 describes a slot that renders a named placeholder (§7.2), and a missing
 * panel must not take the whole surface down with it (§8 "the surface still renders").
 */
export type CompositionSeverity = "violation" | "degraded";

export interface CompositionViolation {
  rule: CompositionRule;
  severity: CompositionSeverity;
  hostWidgetId?: string;
  slotId?: string;
  message: string;
}

/** V9 is the only reporting rule; everything else is a rejection. */
export const COMPOSITION_RULE_SEVERITY: Readonly<Record<CompositionRule, CompositionSeverity>> = {
  V1: "violation",
  V2: "violation",
  V3: "violation",
  V4: "violation",
  V5: "violation",
  V6: "violation",
  V7: "violation",
  V8: "violation",
  V9: "degraded",
};

/** The subset of violations that must reject a spec (`validateViewSpec` gates on these). */
export function hardViolations(
  violations: readonly CompositionViolation[],
): CompositionViolation[] {
  return violations.filter((violation) => violation.severity === "violation");
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
  const report = (
    rule: CompositionRule,
    message: string,
    context: { hostWidgetId?: string; slotId?: string } = {},
  ): void => {
    const violation: CompositionViolation = {
      rule,
      severity: COMPOSITION_RULE_SEVERITY[rule],
      message,
    };
    if (context.hostWidgetId !== undefined) violation.hostWidgetId = context.hostWidgetId;
    if (context.slotId !== undefined) violation.slotId = context.slotId;
    violations.push(violation);
  };

  const bindings = spec.composition ?? [];
  // §8: composition rules run only when the surface declares composition at all.
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
      report("V2", `composition binds to "${hostId}", which is not a widget instance on this surface`, { hostWidgetId: hostId });
    }
  }

  const seenBindings = new Set<string>();

  /**
   * `inheritedEnvelope` is the effective envelope of the ancestor chain. Carrying it (rather
   * than reading only `host.envelope`) is what closes the V7 escape: an occupant that declares
   * no envelope inherits its host's, so ITS occupants must still be measured against it.
   * Without the parameter, one intermediate host omitting `envelope` let a `live` grandchild
   * sit under a `demo` root — the claim simply vanished from the path.
   */
  const visit = (
    host: WidgetInstance,
    depth: number,
    path: readonly string[],
    inheritedEnvelope?: EpistemicClaim,
  ): void => {
    const hostBindings = byHost.get(host.id) ?? [];
    const definition = resolveDefinition(host.widget.type);
    if (!definition) {
      if (hostBindings.length > 0) {
        report("V2", `host "${host.id}" has no resolvable widget definition (type "${host.widget.type}")`, { hostWidgetId: host.id });
      }
      return;
    }

    const schema = definition.composition;
    if (!schema) {
      if (hostBindings.length > 0) {
        report("V1", `host "${host.id}" (${host.widget.type}) declares no CompositionSchema but carries ${hostBindings.length} binding(s)`, { hostWidgetId: host.id });
      }
      return;
    }

    const slots = slotLookup(schema);
    if (slots.size !== schema.slots.length) {
      report("V2", `host "${host.id}" declares duplicate slot ids`, { hostWidgetId: host.id });
    }

    const maxDepth = schema.maxDepth ?? DEFAULT_MAX_COMPOSITION_DEPTH;
    const occupantDepth = depth + 1;
    if (hostBindings.length > 0 && occupantDepth > maxDepth) {
      report("V6", `occupancy depth ${occupantDepth} exceeds maxDepth ${maxDepth} on host "${host.id}"`, { hostWidgetId: host.id });
    }

    // The claim this host can actually defend: its own, weakened by everything above it.
    const hostEnvelope = weakestClaim([inheritedEnvelope, host.envelope]);
    const counts = new Map<string, number>();

    for (const binding of hostBindings) {
      const slot = slots.get(binding.slotId);
      if (!slot) {
        report("V1", `host "${host.id}" does not declare slot "${binding.slotId}"`, { hostWidgetId: host.id, slotId: binding.slotId });
        continue;
      }

      const occupant = binding.occupant;
      counts.set(slot.id, (counts.get(slot.id) ?? 0) + 1);

      // V4 — capability acceptance.
      if (slot.accepts !== "*" && !slot.accepts.includes(occupant.widget.contract)) {
        report("V4", `slot "${slot.id}" accepts [${slot.accepts.join(", ")}] but occupant "${occupant.id}" provides ${occupant.widget.contract}`, { hostWidgetId: host.id, slotId: slot.id });
      }

      // Identity is the INSTANCE id throughout: two DataTables share `widget.id`, so keying
      // on the widget type would report false cycles and false duplicate bindings.

      // V5 — acyclic occupancy. A detected cycle must STOP descent: recording the violation
      // and then recursing anyway is unbounded recursion, not a report.
      if (occupant.id === host.id || path.includes(occupant.id)) {
        report("V5", `occupant "${occupant.id}" is already an ancestor of host "${host.id}" (cycle)`, { hostWidgetId: host.id, slotId: slot.id });
        continue;
      }

      // V2 — the same occupant bound twice to the same slot.
      const bindingKey = `${host.id}|${slot.id}|${occupant.id}`;
      if (seenBindings.has(bindingKey)) {
        report("V2", `occupant "${occupant.id}" is bound twice to slot "${slot.id}" on host "${host.id}"`, { hostWidgetId: host.id, slotId: slot.id });
      } else {
        seenBindings.add(bindingKey);
      }

      // V7 — envelope monotonicity against the EFFECTIVE host claim. An occupant that declares
      // no envelope is not exempt: it inherits `hostEnvelope`, and that inherited claim is
      // passed down so the next level cannot escape it either.
      if (occupant.envelope && hostEnvelope && claimStrength(occupant.envelope) > claimStrength(hostEnvelope)) {
        const inheritedNote = host.envelope || !inheritedEnvelope
          ? ""
          : ` (inherited from an ancestor of host "${host.id}")`;
        report("V7", `occupant "${occupant.id}" claims "${occupant.envelope}" inside host "${host.id}" claiming "${hostEnvelope}"${inheritedNote}: an occupant may not claim a stronger envelope than its host`, { hostWidgetId: host.id, slotId: slot.id });
      }

      // V8 — renderer compatibility.
      const rendererKind = slot.rendererKind ?? "react";
      if (rendererKind === "react") {
        if (occupant.renderer) {
          report("V8", `slot "${slot.id}" is a react slot but occupant "${occupant.id}" supplies a ${occupant.renderer.kind} renderer`, { hostWidgetId: host.id, slotId: slot.id });
        }
      } else if (!occupant.renderer) {
        report("V8", `slot "${slot.id}" requires a ${rendererKind} renderer but occupant "${occupant.id}" supplies none`, { hostWidgetId: host.id, slotId: slot.id });
      } else if (occupant.renderer.kind !== rendererKind) {
        report("V8", `slot "${slot.id}" requires a ${rendererKind} renderer but occupant "${occupant.id}" supplies ${occupant.renderer.kind}`, { hostWidgetId: host.id, slotId: slot.id });
      }

      visit(occupant, occupantDepth, [...path, host.id], hostEnvelope);
    }

    // V3 — cardinality, evaluated per declared slot.
    for (const [slotId, count] of counts) {
      const slot = slots.get(slotId);
      if (!slot) continue;
      if (slot.cardinality === "one" && count !== 1) {
        report("V3", `slot "${slotId}" is cardinality "one" but has ${count} occupant(s)`, { hostWidgetId: host.id, slotId });
      }
      if (slot.cardinality === "optional" && count > 1) {
        report("V3", `slot "${slotId}" is cardinality "optional" but has ${count} occupants`, { hostWidgetId: host.id, slotId });
      }
    }

    // V9 — every required slot is filled, or it explicitly degrades (§7.2). This is REPORTED,
    // never a rejection: the resolver turns the gap into a named caption and the surface
    // still renders (§8). A host with no bindings at all is checked too — its required slots
    // are just as unfilled as one missing a single binding.
    const reported = new Set<string>();
    for (const descriptor of schema.slots) {
      if (!descriptor.required || reported.has(descriptor.id)) continue;
      if ((counts.get(descriptor.id) ?? 0) > 0) continue;
      reported.add(descriptor.id);
      report(
        "V9",
        `required slot "${descriptor.id}" on host "${host.id}" (${host.widget.type}) has no occupant; it resolves to a degraded placeholder and the surface still renders`,
        { hostWidgetId: host.id, slotId: descriptor.id },
      );
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
  /** Effective envelope of the ancestor chain; see the V7 note in `validateComposition`. */
  inheritedEnvelope?: EpistemicClaim,
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

    const envelope = weakestClaim([
      inheritedEnvelope,
      host.envelope,
      ...occupants.map((o) => o.envelope),
    ]);
    if (envelope) resolved.effectiveEnvelope = envelope;

    return resolved;
  });
}

/** Convenience: does this surface declare any composition at all? */
export function hasComposition(spec: ViewSpec): boolean {
  return (spec.composition?.length ?? 0) > 0;
}
