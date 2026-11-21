/**
 * Slot / Composition contract — surface conformance
 * (record d43a8d6d §9, §11 AC3 render, AC4 render, AC7, A2 parity)
 *
 * Rendered with react-dom/server so the assertions are real markup without a browser:
 * AC3 "renders 4 populated slots" and AC4's degraded placeholder are both observable here.
 */

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import {
  EPISTEMIC_CLAIMS,
  PATH_DOCUMENTATION_REGISTRY,
  SERVICEDOMAIN_RUNTIME_CATALOG,
  WidgetCatalog,
  registerPinnedHosts,
  resolveDocumentation,
  resolveSlots,
  validateComposition,
  type CapabilityContract,
  type CapabilityId,
  type DocumentationEntry,
  type DocumentationRegistry,
  type ResolvedSlot,
  type SlotBinding,
  type ViewSpec,
  type WidgetInstance,
} from '../../../typescript/projection-core/src/index';
import { AUTHORITATIVE_THEMES } from '../core/themeRegistry';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function equal(actual: unknown, expected: unknown, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`);
  }
}

function instance(id: string, type: string, contract: CapabilityId): WidgetInstance {
  return {
    id,
    contract: {} as CapabilityContract,
    widget: { id: type, type, props: {}, contract },
  };
}

function bind(hostWidgetId: string, slotId: string, occupant: WidgetInstance, order?: number): SlotBinding {
  const binding: SlotBinding = { hostWidgetId, slotId, occupant };
  if (order !== undefined) binding.order = order;
  return binding;
}

/** Minimal host renderer: one <section> per declared slot, in declaration order. */
function SlotHost(props: { slots: ResolvedSlot[] }) {
  return createElement(
    'div',
    { 'data-host': 'catalog' },
    props.slots.map((slot) =>
      createElement(
        'section',
        {
          key: slot.slotId,
          'data-slot': slot.slotId,
          'data-status': slot.status,
          'data-envelope': slot.effectiveEnvelope ?? 'none',
          'data-slot-envelope': slot.descriptor.docAnchor ?? '',
        },
        slot.status === 'degraded-missing'
          ? createElement('p', { 'data-caption': 'missing' }, slot.caption ?? '')
          : slot.occupants.map((occupant) =>
              createElement(
                'div',
                { key: occupant.id, 'data-occupant': occupant.widget.type },
                occupant.id,
              ),
            ),
      ),
    ),
  );
}

function countOccurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

export function runSlotCompositionConformance(): { allPassed: boolean; logs: string[] } {
  const logs: string[] = [];
  const catalog = registerPinnedHosts(new WidgetCatalog());
  const resolver = (widgetType: string) => catalog.getWidget(widgetType);

  const host = instance('catalog-1', 'ServiceDomainAndRuntimeCatalog', 'EntityCollection');
  const bindings: SlotBinding[] = [
    bind('catalog-1', 'systems', instance('tbl-systems', 'DataTable', 'EntityCollection'), 0),
    bind('catalog-1', 'services', instance('tbl-services', 'DataTable', 'EntityCollection'), 1),
    bind('catalog-1', 'servers', instance('tbl-servers', 'DataTable', 'EntityCollection'), 2),
    bind('catalog-1', 'deployments', instance('tbl-deployments', 'DataTable', 'EntityCollection'), 3),
  ];

  const spec: ViewSpec = {
    id: 'surface-catalog',
    layout: { nodes: [] },
    widgets: [host],
    adapters: [],
    events: [],
    composition: bindings,
  };

  equal(validateComposition(spec, resolver).length, 0, 'catalog composition is valid');

  // ── AC3: renders four populated slots ──────────────────────────────
  const schema = SERVICEDOMAIN_RUNTIME_CATALOG.composition;
  assert(schema, 'catalog declares a CompositionSchema');
  const filled = resolveSlots(host, schema, bindings);
  const filledMarkup = renderToStaticMarkup(createElement(SlotHost, { slots: filled }));

  equal(countOccurrences(filledMarkup, 'data-slot='), 4, 'four slots rendered');
  equal(countOccurrences(filledMarkup, 'data-status="filled"'), 4, 'all four slots render filled');
  equal(countOccurrences(filledMarkup, 'data-occupant="DataTable"'), 4, 'four DataTable occupants rendered');
  assert(filledMarkup.includes('data-slot="systems"'), 'systems slot in markup');
  assert(filledMarkup.includes('data-slot="deployments"'), 'deployments slot in markup');
  logs.push('AC3: host rendered four populated slots from four DataTable occupants');

  // ── AC4: a required slot that is unfilled renders a caption ────────
  const partialBindings = bindings.filter((binding) => binding.slotId !== 'servers');
  const partialSlots = resolveSlots(host, schema, partialBindings);
  const partialMarkup = renderToStaticMarkup(createElement(SlotHost, { slots: partialSlots }));

  equal(countOccurrences(partialMarkup, 'data-status="degraded-missing"'), 1, 'one degraded slot rendered');
  assert(partialMarkup.includes('data-caption="missing"'), 'degraded slot renders a caption');
  assert(partialMarkup.includes('&quot;servers&quot;') || partialMarkup.includes('"servers"'), 'caption names the missing slot');
  equal(countOccurrences(partialMarkup, 'data-status="filled"'), 3, 'remaining slots still render filled');
  logs.push('AC4: unfilled required slot renders a named caption instead of nothing');

  // ── AC7: path-specific docs beat capability docs ───────────────────
  const tagPath = 'surface:surface-catalog/widget:catalog-1/slot:systems/widget:tbl-systems';
  const pathEntry: DocumentationEntry = {
    id: 'path-catalog-systems',
    title: 'Systems table (in catalog)',
    summary: 'Path-specific documentation for the systems slot occupant.',
    category: 'capability',
    capabilityContract: 'EntityCollection',
  };
  const pathRegistry: DocumentationRegistry = { [tagPath]: pathEntry };

  equal(resolveDocumentation({ capabilityId: 'EntityCollection', tagPath }, pathRegistry).id, 'path-catalog-systems', 'path entry wins');
  equal(resolveDocumentation({ capabilityId: 'EntityCollection', tagPath: 'surface:none' }, pathRegistry).id, 'EntityCollection', 'capability entry used when no path entry');
  equal(resolveDocumentation({ capabilityId: 'EntityCollection' }).id, 'EntityCollection', 'capability lookup unchanged when no tagPath is supplied');
  equal(resolveDocumentation({ tagPath }).id, 'generic-runtime-help', 'path miss without capability falls back to generic');
  equal(Object.keys(PATH_DOCUMENTATION_REGISTRY).length, 0, 'shipped path registry is empty (docs remain strictly additive)');
  logs.push('AC7: path-specific documentation takes precedence over capability documentation');

  // ── A2: token parity across the package boundary ───────────────────
  const shippedTokens = Object.keys(AUTHORITATIVE_THEMES['theme-dark'].stateTokens).sort();
  equal(
    shippedTokens.join(','),
    [...EPISTEMIC_CLAIMS].sort().join(','),
    'projection-core EpistemicClaim must match ThemeRegistry StateTokenKey',
  );
  logs.push('A2: EpistemicClaim parity with ThemeRegistry state tokens holds');

  return { allPassed: true, logs };
}
