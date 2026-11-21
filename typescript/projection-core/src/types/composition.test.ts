/**
 * Slot / Composition Contract conformance (record d43a8d6d §8, §11 AC1–AC5).
 *
 * Script-style suite: the shared runner in `scripts/run-tests.ts` calls this and treats a
 * throw as a failure, matching the other projection-core suites.
 */

import type { WidgetInstance, ViewSpec } from "./viewSpec.js";
import type { CapabilityContract } from "./capabilities.js";
import type { CapabilityId } from "./designIR.js";
import type { CompositionRule, SlotBinding } from "./composition.js";
import {
  EPISTEMIC_CLAIMS,
  claimStrength,
  hardViolations,
  hasComposition,
  resolveSlots,
  validateComposition,
  weakestClaim,
} from "./composition.js";
import { WidgetCatalog, type WidgetDefinition } from "../widget/catalog.js";
import { SERVICEDOMAIN_RUNTIME_CATALOG, registerPinnedHosts } from "../widget/hostDefinitions.js";
import { validateViewSpec } from "./viewSpec.js";

function ok(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function equal(actual: unknown, expected: unknown, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`);
  }
}

/** Instance builder — `id` is the instance identity, `widget.id` the component identity. */
function instance(
  id: string,
  type: string,
  contract: CapabilityId,
  extra: Partial<WidgetInstance> = {},
): WidgetInstance {
  return {
    id,
    contract: {} as CapabilityContract,
    widget: { id: type, type, props: {}, contract },
    ...extra,
  };
}

function surface(widgets: WidgetInstance[], composition?: SlotBinding[]): ViewSpec {
  const spec: ViewSpec = { id: "surface-composition-test", layout: { nodes: [] }, widgets, adapters: [], events: [] };
  if (composition) spec.composition = composition;
  return spec;
}

function bind(hostWidgetId: string, slotId: string, occupant: WidgetInstance, order?: number): SlotBinding {
  const binding: SlotBinding = { hostWidgetId, slotId, occupant };
  if (order !== undefined) binding.order = order;
  return binding;
}

function rules(violations: ReadonlyArray<{ rule: CompositionRule }>): CompositionRule[] {
  return violations.map((violation) => violation.rule);
}

export function runCompositionConformance(): { allPassed: boolean; logs: string[] } {
  const logs: string[] = [];
  const catalog = registerPinnedHosts(new WidgetCatalog());
  const resolve = (widgetType: string): WidgetDefinition | undefined => catalog.getWidget(widgetType);

  // ── AC2 regression: a flat spec validates exactly as before ────────
  const flat = surface([instance("root-spark", "Sparkline", "MetricSeries")]);
  ok(validateViewSpec(flat), "flat spec (no composition) must still validate");
  ok(validateViewSpec(flat, resolve), "flat spec must validate with a resolver supplied");
  equal(validateComposition(flat, resolve).length, 0, "flat spec yields no composition violations");
  equal(hasComposition(flat), false, "flat spec has no composition");
  logs.push("AC2 regression: flat specs validate unchanged");

  // ── AC3: the entry-point host declares 4 slots and binds 4 tables ──
  const host = instance("catalog-1", "ServiceDomainAndRuntimeCatalog", "EntityCollection");
  equal(SERVICEDOMAIN_RUNTIME_CATALOG.composition?.slots.length, 4, "catalog declares four slots");

  const catalogBindings = [
    bind("catalog-1", "systems", instance("tbl-systems", "DataTable", "EntityCollection"), 0),
    bind("catalog-1", "services", instance("tbl-services", "DataTable", "EntityCollection"), 1),
    bind("catalog-1", "servers", instance("tbl-servers", "DataTable", "EntityCollection"), 2),
    bind("catalog-1", "deployments", instance("tbl-deployments", "DataTable", "EntityCollection"), 3),
  ];
  const composed = surface([host], catalogBindings);

  equal(validateComposition(composed, resolve).length, 0, "valid catalog composition yields no violations");
  ok(validateViewSpec(composed, resolve), "valid composed spec must validate");

  const slots = resolveSlots(host, SERVICEDOMAIN_RUNTIME_CATALOG.composition!, catalogBindings);
  equal(slots.length, 4, "resolver returns all four declared slots in order");
  equal(slots.map((slot) => slot.slotId).join(","), "systems,services,servers,deployments", "slot order preserved");
  ok(slots.every((slot) => slot.status === "filled"), "all four slots resolve filled");
  equal(slots[0]?.occupants[0]?.id, "tbl-systems", "systems slot holds the systems table");
  logs.push("AC3: catalog host resolves four populated slots");

  // ── AC4: unfilled required slot degrades with a named caption ──────
  const missingServers = surface([host], [
    catalogBindings[0]!,
    catalogBindings[1]!,
    catalogBindings[3]!,
  ]);
  const partial = resolveSlots(host, SERVICEDOMAIN_RUNTIME_CATALOG.composition!, [
    catalogBindings[0]!,
    catalogBindings[1]!,
    catalogBindings[3]!,
  ]);
  const servers = partial.find((slot) => slot.slotId === "servers");
  ok(servers, "servers slot present");
  equal(servers.status, "degraded-missing", "unfilled required slot degrades rather than vanishing");
  ok(servers.caption?.includes("servers"), `caption must name the slot, got ${String(servers.caption)}`);

  // V9: the gap is REPORTED, and the surface still renders (§8).
  const missingViolations = validateComposition(missingServers, resolve);
  const v9Servers = missingViolations.filter((violation) => violation.rule === "V9");
  equal(v9Servers.length, 1, "exactly one V9 is reported for the one unfilled required slot");
  equal(v9Servers[0]?.severity, "degraded", "V9 is reported as degraded, not as a rejection");
  equal(v9Servers[0]?.slotId, "servers", "V9 names the unfilled slot");
  equal(v9Servers[0]?.hostWidgetId, "catalog-1", "V9 names the host");
  ok(v9Servers[0]?.message.includes("degraded placeholder"), "V9 says the slot renders a placeholder");
  equal(hardViolations(missingViolations).length, 0, "V9 contributes no hard violation");
  ok(validateViewSpec(missingServers, resolve), "V9 does not reject the spec: the surface still renders");

  const withoutOptional = resolveSlots(host, SERVICEDOMAIN_RUNTIME_CATALOG.composition!, [
    catalogBindings[0]!,
    catalogBindings[1]!,
    catalogBindings[2]!,
  ]);
  equal(withoutOptional.find((slot) => slot.slotId === "deployments")?.status, "empty", "unfilled optional slot is simply empty");
  equal(validateComposition(surface([host], [catalogBindings[0]!, catalogBindings[1]!, catalogBindings[2]!]), resolve).length, 0, "an unfilled optional slot is not a V9");
  logs.push("AC4/V9: required slot degrades with a caption and a reported V9; optional slot is empty and unreported");

  // ── V1: undeclared slot / host without a schema ────────────────────
  const v1 = validateComposition(surface([host], [bind("catalog-1", "nope", instance("t-x", "DataTable", "EntityCollection"))]), resolve);
  ok(rules(v1).includes("V1"), "V1: binding to an undeclared slot");

  const leafHost = instance("spark-1", "Sparkline", "MetricSeries");
  const v1Leaf = validateComposition(
    surface([leafHost], [bind("spark-1", "body", instance("t-y", "DataTable", "EntityCollection"))]),
    resolve,
  );
  ok(rules(v1Leaf).includes("V1"), "V1: leaf widget carrying a binding");
  logs.push("V1: undeclared slot and leaf-host binding both rejected");

  // ── V2: unknown host instance, duplicate binding ───────────────────
  const v2Ghost = validateComposition(surface([host], [bind("ghost-host", "systems", instance("t-z", "DataTable", "EntityCollection"))]), resolve);
  ok(rules(v2Ghost).includes("V2"), "V2: binding targets unknown host instance");

  const dup = validateComposition(
    surface([host], [
      bind("catalog-1", "systems", instance("tbl-dup", "DataTable", "EntityCollection")),
      bind("catalog-1", "systems", instance("tbl-dup", "DataTable", "EntityCollection")),
    ]),
    resolve,
  );
  ok(rules(dup).includes("V2"), "V2: same occupant bound twice to one slot");
  logs.push("V2: unknown host and duplicate binding rejected");

  // ── V3: cardinality ────────────────────────────────────────────────
  const v3 = validateComposition(
    surface([host], [
      bind("catalog-1", "systems", instance("tbl-a", "DataTable", "EntityCollection")),
      bind("catalog-1", "systems", instance("tbl-b", "DataTable", "EntityCollection")),
      bind("catalog-1", "services", instance("tbl-c", "DataTable", "EntityCollection")),
      bind("catalog-1", "servers", instance("tbl-d", "DataTable", "EntityCollection")),
    ]),
    resolve,
  );
  ok(rules(v3).includes("V3"), "V3: two occupants in a cardinality-one slot");
  logs.push("V3: cardinality enforced");

  // ── V4: capability acceptance ──────────────────────────────────────
  const v4 = validateComposition(
    surface([host], [bind("catalog-1", "systems", instance("spark-x", "Sparkline", "MetricSeries"))]),
    resolve,
  );
  const v4Violation = v4.find((violation) => violation.rule === "V4");
  ok(v4Violation, "V4: contract not accepted by the slot");
  ok(v4Violation.message.includes("MetricSeries"), "V4 message names the offending contract");
  logs.push("V4: slot capability acceptance enforced");

  // ── V5: cycles ─────────────────────────────────────────────────────
  const selfHost = instance("loop-1", "ServiceDomainAndRuntimeCatalog", "EntityCollection");
  const v5 = validateComposition(
    surface([selfHost], [bind("loop-1", "systems", selfHost)]),
    resolve,
  );
  ok(rules(v5).includes("V5"), "V5: occupant is its own host");
  logs.push("V5: cycles rejected");

  // ── V6: depth bound ────────────────────────────────────────────────
  catalog.register({
    id: "DepthOneHost",
    name: "Depth One Host",
    implements: ["StatusBoard"],
    composition: {
      maxDepth: 1,
      slots: [
        { id: "only", kind: "content", accepts: "*", cardinality: "one", required: true, rendererKind: "react" },
      ],
    },
  });
  const depthRoot = instance("depth-root", "DepthOneHost", "StatusBoard");
  const depthMid = instance("depth-mid", "DepthOneHost", "StatusBoard");
  const v6 = validateComposition(
    surface([depthRoot], [
      bind("depth-root", "only", depthMid),
      bind("depth-mid", "only", instance("depth-leaf", "DataTable", "EntityCollection")),
    ]),
    resolve,
  );
  ok(rules(v6).includes("V6"), "V6: occupancy deeper than maxDepth");
  logs.push("V6: depth bound enforced");

  // ── V7: envelope monotonicity (AC5) ────────────────────────────────
  const demoHost = instance("catalog-demo", "ServiceDomainAndRuntimeCatalog", "EntityCollection", { envelope: "demo" });
  const v7 = validateComposition(
    surface([demoHost], [bind("catalog-demo", "systems", instance("tbl-live", "DataTable", "EntityCollection", { envelope: "live" }))]),
    resolve,
  );
  const v7Violation = v7.find((violation) => violation.rule === "V7");
  ok(v7Violation, "V7: occupant cannot claim a stronger envelope than its host");
  ok(v7Violation.message.includes("live") && v7Violation.message.includes("demo"), "V7 message names both envelopes");
  ok(!validateViewSpec(surface([demoHost], [bind("catalog-demo", "systems", instance("tbl-live", "DataTable", "EntityCollection", { envelope: "live" }))]), resolve), "V7 violation fails validateViewSpec");

  const degradedInsideDemo = validateComposition(
    surface([demoHost], [bind("catalog-demo", "systems", instance("tbl-demo", "DataTable", "EntityCollection", { envelope: "demo" }))]),
    resolve,
  );
  equal(hardViolations(degradedInsideDemo).length, 0, "an occupant no stronger than its host is admitted");
  ok(degradedInsideDemo.every((violation) => violation.rule === "V9"), "only V9 reports remain for the slots left unbound");
  equal(claimStrength("refusal"), claimStrength("live"), "refusal carries live's claim strength (overlay, not a weaker envelope)");
  equal(weakestClaim(["live", "unknown", "degraded"]), "unknown", "weakestClaim picks the weakest");
  equal(weakestClaim([]), undefined, "weakestClaim of nothing is undefined");
  logs.push("AC5/V7: envelope monotonicity rejects live-inside-demo and names both");

  // ── V7 (escape closed): an occupant with no envelope does not break the chain ──
  const demoRoot = instance("demo-root", "ServiceDomainAndRuntimeCatalog", "EntityCollection", { envelope: "demo" });
  const plainMid = instance("plain-mid", "ServiceDomainAndRuntimeCatalog", "EntityCollection");
  const liveLeaf = instance("live-leaf", "DataTable", "EntityCollection", { envelope: "live" });
  const nested = validateComposition(
    surface([demoRoot], [
      bind("demo-root", "systems", plainMid),
      bind("plain-mid", "systems", liveLeaf),
    ]),
    resolve,
  );
  const nestedV7 = nested.filter((violation) => violation.rule === "V7");
  equal(nestedV7.length, 1, "V7 is reached through an intermediate host that declares no envelope");
  equal(nestedV7[0]?.hostWidgetId, "plain-mid", "V7 is attributed to the host that actually contains the leaf");
  equal(nestedV7[0]?.slotId, "systems", "V7 names the slot holding the leaf");
  ok(nestedV7[0]?.message.includes("live") && nestedV7[0]?.message.includes("demo"), "V7 message names the leaf's claim and the inherited host claim");
  ok(nestedV7[0]?.message.includes("inherited"), `V7 message explains the inherited claim, got ${String(nestedV7[0]?.message)}`);
  equal(nested.filter((violation) => violation.rule === "V7" && violation.hostWidgetId === "demo-root").length, 0, "the silent occupant itself inherits rather than violating");
  ok(!validateViewSpec(surface([demoRoot], [bind("demo-root", "systems", plainMid), bind("plain-mid", "systems", liveLeaf)]), resolve), "a nested V7 violation still rejects the spec");

  const demoLeaf = instance("demo-leaf", "DataTable", "EntityCollection", { envelope: "demo" });
  equal(
    validateComposition(
      surface([demoRoot], [bind("demo-root", "systems", plainMid), bind("plain-mid", "systems", demoLeaf)]),
      resolve,
    ).filter((violation) => violation.rule === "V7").length,
    0,
    "a nested occupant no stronger than the inherited claim is admitted",
  );
  equal(
    resolveSlots(
      plainMid,
      SERVICEDOMAIN_RUNTIME_CATALOG.composition!,
      [bind("plain-mid", "systems", instance("tbl-live3", "DataTable", "EntityCollection", { envelope: "live" }))],
      "demo",
    )[0]?.effectiveEnvelope,
    "demo",
    "resolution weakens a host's claim by its inherited one, so display and validation agree",
  );
  logs.push("V7: inherited claim is threaded through recursion and resolution");

  // ── V9: a pinned host with no bindings at all still reports its required slots ──
  const unboundAtlas = instance("atlas-unbound", "AtlasTopologyCanvas", "InspectorPanel");
  const zeroBound = validateComposition(surface([host, unboundAtlas], catalogBindings), resolve);
  const zeroBoundV9 = zeroBound.filter((violation) => violation.rule === "V9");
  equal(zeroBoundV9.length, 2, "both required atlas slots are reported on a host with no bindings");
  ok(zeroBoundV9.every((violation) => violation.hostWidgetId === "atlas-unbound"), "every V9 belongs to the unbound host");
  equal(zeroBoundV9.map((violation) => violation.slotId).join(","), "nodes,edges", "V9 lists the required slots in declaration order");
  ok(validateViewSpec(surface([host, unboundAtlas], catalogBindings), resolve), "an entirely unbound pinned host does not reject the surface");

  const nestedUnfilled = validateComposition(
    surface([host], [bind("catalog-1", "systems", unboundAtlas)]),
    resolve,
  ).filter((violation) => violation.rule === "V9");
  ok(nestedUnfilled.some((violation) => violation.hostWidgetId === "atlas-unbound"), "V9 reaches a nested host, not only roots");
  logs.push("V9: unbound and nested hosts report unfilled required slots without rejecting");

  // ── V8: renderer compatibility ─────────────────────────────────────
  const canvasHost = instance("atlas-1", "AtlasTopologyCanvas", "InspectorPanel");
  const v8Missing = validateComposition(
    surface([canvasHost], [bind("atlas-1", "nodes", instance("node-plain", "DataTable", "EntityCollection"))]),
    resolve,
  );
  ok(rules(v8Missing).includes("V8"), "V8: webgl slot occupant without a renderer");

  const v8WrongKind = validateComposition(
    surface([canvasHost], [
      bind("atlas-1", "nodes", instance("node-canvas2d", "DataTable", "EntityCollection", { renderer: { adapterId: "r-2d", kind: "canvas2d" } })),
    ]),
    resolve,
  );
  ok(rules(v8WrongKind).includes("V8"), "V8: renderer kind mismatch");

  const v8Ok = validateComposition(
    surface([canvasHost], [
      bind("atlas-1", "nodes", instance("node-webgl", "DataTable", "EntityCollection", { renderer: { adapterId: "r-3d", kind: "webgl" } })),
      bind("atlas-1", "edges", instance("edge-webgl", "DataTable", "EntityCollection", { renderer: { adapterId: "r-3d", kind: "webgl" } })),
      bind("atlas-1", "overlay", instance("overlay-react", "DataTable", "EntityCollection")),
    ]),
    resolve,
  );
  equal(v8Ok.length, 0, "one host mixes webgl and react slots without violation");

  const v8ReactWithRenderer = validateComposition(
    surface([host], [
      bind("catalog-1", "systems", instance("tbl-renderer", "DataTable", "EntityCollection", { renderer: { adapterId: "r-3d", kind: "webgl" } })),
    ]),
    resolve,
  );
  ok(rules(v8ReactWithRenderer).includes("V8"), "V8: canvas adapter in a react slot");
  logs.push("V8: renderer compatibility enforced in both directions");

  // ── Envelope propagation through resolution ────────────────────────
  const mixed = resolveSlots(
    instance("catalog-degraded", "ServiceDomainAndRuntimeCatalog", "EntityCollection", { envelope: "degraded" }),
    SERVICEDOMAIN_RUNTIME_CATALOG.composition!,
    [
      bind("catalog-degraded", "systems", instance("tbl-live2", "DataTable", "EntityCollection", { envelope: "live" })),
      bind("catalog-degraded", "services", instance("tbl-unknown", "DataTable", "EntityCollection", { envelope: "unknown" })),
    ],
  );
  equal(mixed[0]?.effectiveEnvelope, "degraded", "effective envelope is the weakest claim present");
  equal(mixed[1]?.effectiveEnvelope, "unknown", "a weaker occupant weakens the slot envelope");
  logs.push("envelope propagation: slot envelope is the weakest claim");

  equal(EPISTEMIC_CLAIMS.length, 5, "five epistemic claims are declared (A2 parity source)");

  return { allPassed: true, logs };
}
