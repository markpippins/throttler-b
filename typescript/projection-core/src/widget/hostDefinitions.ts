/**
 * Pinned composition hosts (record d43a8d6d §5).
 *
 * These are declared here rather than in `WidgetCatalog.registerDefaults()` on purpose:
 * registering a host changes `selectWidget()` candidate ordering for every surface, and
 * neither host has been absorbed into the throttler surface yet. Pinning keeps the default
 * catalog behaviour byte-identical while making the schemas reviewable and testable.
 *
 * Entry point for the Tier 5 absorption is `ServiceDomainAndRuntimeCatalog` (barbie).
 * `AtlasTopologyCanvas` is the north star and is specified now to prove the contract is
 * canvas-capable before any React-only assumption can harden.
 */

import type { WidgetCatalog, WidgetDefinition } from "./catalog";

/**
 * barbie `SystemsTable` / `ServicesTable` / `ServersTable` / `DeploymentsTable` behind one
 * host. Cross-slot filtering is an `EventRoute` with a `filter` action — the host never
 * touches occupant payload (§7.4 / Q2).
 */
export const SERVICEDOMAIN_RUNTIME_CATALOG: WidgetDefinition = {
  id: "ServiceDomainAndRuntimeCatalog",
  name: "Service Domain & Runtime Catalog",
  implements: ["EntityCollection"],
  variants: ["tabbed", "stacked"],
  defaultDensity: "compact",
  defaultLayout: "main",
  composition: {
    maxDepth: 3,
    slots: [
      {
        id: "systems",
        kind: "collection",
        accepts: ["EntityCollection"],
        cardinality: "one",
        required: true,
        rendererKind: "react",
        layoutHint: { density: "compact", order: 0 },
        docAnchor: "catalog.systems",
      },
      {
        id: "services",
        kind: "collection",
        accepts: ["EntityCollection"],
        cardinality: "one",
        required: true,
        rendererKind: "react",
        layoutHint: { density: "compact", order: 1 },
        docAnchor: "catalog.services",
      },
      {
        id: "servers",
        kind: "collection",
        accepts: ["EntityCollection"],
        cardinality: "one",
        required: true,
        rendererKind: "react",
        layoutHint: { density: "compact", order: 2 },
        docAnchor: "catalog.servers",
      },
      {
        id: "deployments",
        kind: "collection",
        accepts: ["EntityCollection"],
        cardinality: "optional",
        required: false,
        rendererKind: "react",
        layoutHint: { density: "compact", order: 3 },
        docAnchor: "catalog.deployments",
      },
    ],
  },
};

/**
 * atlas-ui `DiagramSurface` upgrade target. Deliberately mixes renderer kinds in one host:
 * nodes/edges are WebGL adapters, the overlay is React. A React-children-only contract could
 * not express this, which is why the contract is canvas-capable from day one.
 */
export const ATLAS_TOPOLOGY_CANVAS: WidgetDefinition = {
  id: "AtlasTopologyCanvas",
  name: "Atlas Topology Canvas",
  implements: ["InspectorPanel"],
  variants: ["design-hierarchy", "operational-domain", "host-placement"],
  defaultDensity: "spacious",
  defaultLayout: "main",
  composition: {
    maxDepth: 3,
    slots: [
      {
        id: "nodes",
        kind: "renderer",
        accepts: "*",
        cardinality: "many",
        required: true,
        rendererKind: "webgl",
        docAnchor: "atlas.nodes",
      },
      {
        id: "edges",
        kind: "renderer",
        accepts: "*",
        cardinality: "many",
        required: true,
        rendererKind: "webgl",
        docAnchor: "atlas.edges",
      },
      {
        id: "overlay",
        kind: "content",
        accepts: "*",
        cardinality: "optional",
        required: false,
        rendererKind: "react",
        docAnchor: "atlas.overlay",
      },
    ],
  },
};

export const PINNED_HOST_DEFINITIONS: readonly WidgetDefinition[] = [
  SERVICEDOMAIN_RUNTIME_CATALOG,
  ATLAS_TOPOLOGY_CANVAS,
];

/** Registers the pinned hosts into a catalog instance (opt-in; does not touch defaults). */
export function registerPinnedHosts(catalog: WidgetCatalog): WidgetCatalog {
  for (const definition of PINNED_HOST_DEFINITIONS) catalog.register(definition);
  return catalog;
}
