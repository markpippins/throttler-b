import { WidgetCatalog, WidgetRegistry } from '@nexus/projection-core';
import type { CapabilityId } from '@nexus/projection-core';
import type { RelicArchetype } from '../types';
import type {
  MasterWidgetManifest,
  SubfolderCatalogManifest,
  WidgetManifestEntry,
  WidgetFunctionalCategory,
  ScannerOptions,
  ProjectionInjectionResult,
} from './manifest';
import {
  scanAngularWidgets,
  discoverAngularSubfolders,
  registerAngularSubfolder,
  AngularSubfolderConfig,
} from './scanner';
import {
  injectManifestIntoProjectionCore,
  injectWidgetIntoProjectionCore,
} from './projectionBridge';

type ManifestSubscriber = (manifest: MasterWidgetManifest) => void;

/**
 * High-level manager coordinating scanning, cataloging, querying,
 * and dynamic projection-core injection of widgets from angular/ subfolders.
 */
export class WidgetRegistryManager {
  private masterManifest: MasterWidgetManifest;
  private subscribers: Set<ManifestSubscriber> = new Set();
  private sharedCatalog: WidgetCatalog;
  private sharedRegistry: WidgetRegistry;
  private lastInjectionResult: ProjectionInjectionResult | null = null;

  constructor() {
    this.sharedCatalog = new WidgetCatalog();
    this.sharedRegistry = new WidgetRegistry();
    // Initial scan and cataloging
    this.masterManifest = scanAngularWidgets({ includeAuxiliaryComponents: true });
    this.syncWithProjectionCore();
  }

  /**
   * Returns the current master manifest.
   */
  public getManifest(): MasterWidgetManifest {
    return this.masterManifest;
  }

  /**
   * Returns the shared projection-core WidgetCatalog containing all injected widgets.
   */
  public getProjectionCatalog(): WidgetCatalog {
    return this.sharedCatalog;
  }

  /**
   * Returns the shared projection-core WidgetRegistry.
   */
  public getProjectionRegistry(): WidgetRegistry {
    return this.sharedRegistry;
  }

  /**
   * Last dynamic injection audit results.
   */
  public getLastInjectionResult(): ProjectionInjectionResult | null {
    return this.lastInjectionResult;
  }

  /**
   * Re-scan all angular/ subfolders and update the catalog.
   */
  public rescan(options?: ScannerOptions): MasterWidgetManifest {
    this.masterManifest = scanAngularWidgets({
      includeAuxiliaryComponents: true,
      ...options,
    });
    this.syncWithProjectionCore();
    this.notifySubscribers();
    return this.masterManifest;
  }

  /**
   * Declare and scan a new angular/ subfolder dynamically.
   */
  public addAndScanSubfolder(config: AngularSubfolderConfig): MasterWidgetManifest {
    registerAngularSubfolder(config);
    return this.rescan();
  }

  /**
   * Register a manual subfolder catalog manifest.
   */
  public registerSubfolderManifest(
    subfolderManifest: SubfolderCatalogManifest,
    autoInject = true
  ): void {
    this.masterManifest.subfolders[subfolderManifest.subfolder] = subfolderManifest;

    // Update indexes
    subfolderManifest.widgets.forEach((widget) => {
      this.masterManifest.allWidgets.push(widget);
      this.masterManifest.byId[widget.id] = widget;

      if (!this.masterManifest.bySubfolder[widget.subfolder]) {
        this.masterManifest.bySubfolder[widget.subfolder] = [];
      }
      this.masterManifest.bySubfolder[widget.subfolder].push(widget);

      if (!this.masterManifest.byArchetype[widget.archetype]) {
        this.masterManifest.byArchetype[widget.archetype] = [];
      }
      this.masterManifest.byArchetype[widget.archetype].push(widget);

      widget.capabilities.forEach((cap) => {
        if (!this.masterManifest.byCapability[cap]) {
          this.masterManifest.byCapability[cap] = [];
        }
        this.masterManifest.byCapability[cap].push(widget);
      });

      if (widget.category) {
        if (!this.masterManifest.byCategory) {
          this.masterManifest.byCategory = { UI: [], Data: [], Utility: [] };
        }
        if (!this.masterManifest.byCategory[widget.category]) {
          this.masterManifest.byCategory[widget.category] = [];
        }
        this.masterManifest.byCategory[widget.category].push(widget);
      }
    });

    // Recalculate stats
    this.masterManifest.stats = {
      totalSubfolders: Object.keys(this.masterManifest.subfolders).length,
      totalWidgets: this.masterManifest.allWidgets.length,
      totalCapabilities: Object.keys(this.masterManifest.byCapability).length,
      totalArchetypes: Object.keys(this.masterManifest.byArchetype).length,
      totalCategories: this.masterManifest.byCategory
        ? Object.keys(this.masterManifest.byCategory).filter(
            (k) => (this.masterManifest.byCategory[k as WidgetFunctionalCategory] || []).length > 0
          ).length
        : 3,
    };

    if (autoInject) {
      this.lastInjectionResult = injectManifestIntoProjectionCore(subfolderManifest.widgets, {
        catalog: this.sharedCatalog,
        registry: this.sharedRegistry,
      });
    }

    this.notifySubscribers();
  }

  /**
   * Register a single widget entry directly into the catalog.
   */
  public registerWidget(entry: WidgetManifestEntry, autoInject = true): void {
    // Add to allWidgets
    const existingIndex = this.masterManifest.allWidgets.findIndex((w) => w.id === entry.id);
    if (existingIndex >= 0) {
      this.masterManifest.allWidgets[existingIndex] = entry;
    } else {
      this.masterManifest.allWidgets.push(entry);
    }

    this.masterManifest.byId[entry.id] = entry;

    // Ensure subfolder exists
    if (!this.masterManifest.subfolders[entry.subfolder]) {
      this.masterManifest.subfolders[entry.subfolder] = {
        subfolder: entry.subfolder,
        displayName: `${entry.subfolder.toUpperCase()} Suite`,
        description: `Custom subfolder ${entry.subfolder}`,
        path: `angular/${entry.subfolder}`,
        scannedAt: new Date().toISOString(),
        widgetCount: 1,
        widgets: [entry],
        capabilitiesSupported: [...entry.capabilities],
        archetypesPresent: [entry.archetype],
        sourceFilesScanned: [entry.sourcePath],
      };
    } else {
      const subManifest = this.masterManifest.subfolders[entry.subfolder];
      const idx = subManifest.widgets.findIndex((w) => w.id === entry.id);
      if (idx >= 0) {
        subManifest.widgets[idx] = entry;
      } else {
        subManifest.widgets.push(entry);
        subManifest.widgetCount++;
      }
    }

    // Index by subfolder
    if (!this.masterManifest.bySubfolder[entry.subfolder]) {
      this.masterManifest.bySubfolder[entry.subfolder] = [];
    }
    const subIdx = this.masterManifest.bySubfolder[entry.subfolder].findIndex((w) => w.id === entry.id);
    if (subIdx >= 0) {
      this.masterManifest.bySubfolder[entry.subfolder][subIdx] = entry;
    } else {
      this.masterManifest.bySubfolder[entry.subfolder].push(entry);
    }

    // Index by archetype
    if (!this.masterManifest.byArchetype[entry.archetype]) {
      this.masterManifest.byArchetype[entry.archetype] = [];
    }
    const archIdx = this.masterManifest.byArchetype[entry.archetype].findIndex((w) => w.id === entry.id);
    if (archIdx >= 0) {
      this.masterManifest.byArchetype[entry.archetype][archIdx] = entry;
    } else {
      this.masterManifest.byArchetype[entry.archetype].push(entry);
    }

    // Index by capability
    entry.capabilities.forEach((cap) => {
      if (!this.masterManifest.byCapability[cap]) {
        this.masterManifest.byCapability[cap] = [];
      }
      const capIdx = this.masterManifest.byCapability[cap].findIndex((w) => w.id === entry.id);
      if (capIdx >= 0) {
        this.masterManifest.byCapability[cap][capIdx] = entry;
      } else {
        this.masterManifest.byCapability[cap].push(entry);
      }
    });

    // Index by category
    if (entry.category) {
      if (!this.masterManifest.byCategory) {
        this.masterManifest.byCategory = { UI: [], Data: [], Utility: [] };
      }
      if (!this.masterManifest.byCategory[entry.category]) {
        this.masterManifest.byCategory[entry.category] = [];
      }
      const catIdx = this.masterManifest.byCategory[entry.category].findIndex((w) => w.id === entry.id);
      if (catIdx >= 0) {
        this.masterManifest.byCategory[entry.category][catIdx] = entry;
      } else {
        this.masterManifest.byCategory[entry.category].push(entry);
      }
    }

    if (autoInject) {
      injectWidgetIntoProjectionCore(entry, this.sharedCatalog, this.sharedRegistry);
    }

    this.notifySubscribers();
  }

  /**
   * Injects the entire catalog manifest into the shared projection-core catalog and registry.
   */
  public syncWithProjectionCore(
    customCatalog?: WidgetCatalog,
    customRegistry?: WidgetRegistry
  ): ProjectionInjectionResult {
    const catalog = customCatalog || this.sharedCatalog;
    const registry = customRegistry || this.sharedRegistry;

    this.lastInjectionResult = injectManifestIntoProjectionCore(this.masterManifest, {
      catalog,
      registry,
    });
    return this.lastInjectionResult;
  }

  // Lookup queries
  public getWidget(id: string): WidgetManifestEntry | undefined {
    return this.masterManifest.byId[id];
  }

  public getWidgetsBySubfolder(subfolder: string): WidgetManifestEntry[] {
    return this.masterManifest.bySubfolder[subfolder] || [];
  }

  public getWidgetsByCapability(capability: CapabilityId): WidgetManifestEntry[] {
    return this.masterManifest.byCapability[capability] || [];
  }

  public getWidgetsByArchetype(archetype: RelicArchetype): WidgetManifestEntry[] {
    return this.masterManifest.byArchetype[archetype] || [];
  }

  public getWidgetsByCategory(category: WidgetFunctionalCategory): WidgetManifestEntry[] {
    return this.masterManifest.byCategory?.[category] || [];
  }

  public searchWidgets(query: string): WidgetManifestEntry[] {
    const q = query.toLowerCase().trim();
    if (!q) return this.masterManifest.allWidgets;
    return this.masterManifest.allWidgets.filter(
      (w) =>
        w.name.toLowerCase().includes(q) ||
        w.componentName.toLowerCase().includes(q) ||
        w.subfolder.toLowerCase().includes(q) ||
        w.description.toLowerCase().includes(q) ||
        w.tags.some((t) => t.toLowerCase().includes(q)) ||
        w.capabilities.some((c) => c.toLowerCase().includes(q))
    );
  }

  public getDiscoveredSubfolders(): AngularSubfolderConfig[] {
    return discoverAngularSubfolders();
  }

  // Subscriptions
  public subscribe(listener: ManifestSubscriber): () => void {
    this.subscribers.add(listener);
    return () => {
      this.subscribers.delete(listener);
    };
  }

  private notifySubscribers(): void {
    this.subscribers.forEach((fn) => {
      try {
        fn(this.masterManifest);
      } catch (err) {
        console.error('Error notifying manifest subscriber:', err);
      }
    });
  }

  // Export / Import
  public exportManifestJson(pretty = true): string {
    return JSON.stringify(
      this.masterManifest,
      (key, value) => {
        // Omit non-serializable React component and render delegates
        if (key === 'component' || key === 'render') return undefined;
        return value;
      },
      pretty ? 2 : 0
    );
  }
}

/**
 * Singleton instance of the registry manager.
 */
export const widgetRegistryManager = new WidgetRegistryManager();
