import {
  WidgetCatalog,
  WidgetRegistry,
  ContractCatalog,
  WidgetDefinition,
  CapabilityId,
} from '@nexus/projection-core';
import type {
  WidgetManifestEntry,
  MasterWidgetManifest,
  ProjectionInjectionResult,
} from './manifest';

/**
 * Converts a WidgetManifestEntry into a projection-core WidgetDefinition.
 */
export function createProjectionWidgetDefinition(
  entry: WidgetManifestEntry
): WidgetDefinition {
  return {
    id: entry.componentName, // Canonical name for ViewSpec compiler matching
    name: entry.name,
    implements: entry.capabilities,
    variants: entry.projectionConfig.variants || ['default'],
    defaultDensity: entry.projectionConfig.defaultDensity,
    defaultLayout: entry.projectionConfig.defaultLayout,
  };
}

/**
 * Dynamically injects a single WidgetManifestEntry into a projection-core WidgetCatalog and optional WidgetRegistry.
 */
export function injectWidgetIntoProjectionCore(
  entry: WidgetManifestEntry,
  catalog: WidgetCatalog,
  registry?: WidgetRegistry
): void {
  const widgetDef = createProjectionWidgetDefinition(entry);

  // 1. Inject into WidgetCatalog map
  const catalogMap = (catalog as any).widgets;
  if (catalogMap instanceof Map) {
    catalogMap.set(widgetDef.id, widgetDef);
    // Also register under entry.id for full-qualified lookup
    if (entry.id !== widgetDef.id) {
      catalogMap.set(entry.id, widgetDef);
    }
  }

  // 2. Inject into WidgetRegistry if provided
  if (registry) {
    registry.register(widgetDef.id, {
      render: (props: Record<string, unknown>, container: HTMLElement) => {
        if (entry.render) {
          // Store props on container for inspection
          (container as any).__widgetProps = props;
          (container as any).__widgetManifestId = entry.id;
        }
        container.setAttribute('data-widget-id', widgetDef.id);
        container.setAttribute('data-subfolder', entry.subfolder);
        container.setAttribute('data-archetype', entry.archetype);
      },
      events: entry.projectionConfig.events || ['click', 'select'],
    });
  }
}

/**
 * Dynamically injects an entire MasterWidgetManifest or list of entries into projection-core.
 */
export function injectManifestIntoProjectionCore(
  manifestOrWidgets: MasterWidgetManifest | WidgetManifestEntry[],
  options: {
    catalog?: WidgetCatalog;
    registry?: WidgetRegistry;
    contractCatalog?: ContractCatalog;
  } = {}
): ProjectionInjectionResult {
  const catalog = options.catalog || new WidgetCatalog();
  const registry = options.registry;
  const widgets = Array.isArray(manifestOrWidgets)
    ? manifestOrWidgets
    : manifestOrWidgets.allWidgets;

  let registeredCount = 0;
  let updatedCount = 0;
  const registeredIds: string[] = [];
  const capabilitiesBound = new Set<CapabilityId>();

  const catalogMap = (catalog as any).widgets;
  const isMap = catalogMap instanceof Map;

  for (const entry of widgets) {
    const isExisting = isMap && catalogMap.has(entry.componentName);
    injectWidgetIntoProjectionCore(entry, catalog, registry);

    if (isExisting) {
      updatedCount++;
    } else {
      registeredCount++;
    }

    registeredIds.push(entry.id);
    entry.capabilities.forEach((c) => capabilitiesBound.add(c));
  }

  return {
    registeredCount,
    updatedCount,
    skippedCount: 0,
    registeredWidgetIds: registeredIds,
    capabilitiesBound: Array.from(capabilitiesBound),
    timestamp: new Date().toISOString(),
  };
}
