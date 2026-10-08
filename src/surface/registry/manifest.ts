import { ReactNode, ComponentType } from 'react';
import type {
  CapabilityId,
  DensitySetting,
  LayoutBias,
  WidgetDefinition,
} from '@nexus/projection-core';
import type { RelicArchetype } from '../types';

/**
 * Metadata descriptor for a single widget input / prop.
 */
export interface RelicInputDescriptor {
  name: string;
  type: string;
  required?: boolean;
  defaultValue?: unknown;
  description?: string;
}

/**
 * Metadata descriptor for an API endpoint or remote contract bound to the widget.
 */
export interface RelicEndpointDescriptor {
  raw: string;
  method: string;
  signature: string;
  description?: string;
}

/**
 * Configuration for how this widget projects into projection-core ViewSpec graphs.
 */
export interface ProjectionMappingConfig {
  defaultDensity: DensitySetting; // 'compact' | 'normal' | 'spacious' | 'highSalience'
  defaultLayout: LayoutBias;       // 'header' | 'main' | 'sidebar' | 'footer'
  variants?: string[];
  events?: string[];
  capabilities: CapabilityId[];
}

/**
 * Functional category grouping widgets by operational intent: UI, Data, or Utility.
 */
export type WidgetFunctionalCategory = 'UI' | 'Data' | 'Utility';

/**
 * Complete manifest entry for an individual component export from a widgets/ subfolder.
 */
export interface WidgetManifestEntry {
  /** Unique catalog identifier, e.g. "surface-ui:Sparkline" */
  id: string;
  /** Human-readable title */
  name: string;
  /** Exported component name, e.g. "Sparkline" */
  componentName: string;
  /** Export type: 'default' or named export */
  exportName: string;
  /** Subfolder name under widgets/, e.g. "surface-ui", "dashboard-ui" */
  subfolder: string;
  /** Semantic version or build tag */
  version?: string;
  /** Functional category organizing widgets (e.g. UI, Data, Utility) */
  category?: WidgetFunctionalCategory;
  /** Relative path to the component source file */
  sourcePath: string;
  /** Categorical archetype */
  archetype: RelicArchetype;
  /** Detailed component summary */
  description: string;
  /** Projection capabilities implemented */
  capabilities: CapabilityId[];
  /** Component input/prop schema */
  inputs: RelicInputDescriptor[];
  /** API contracts / endpoints */
  endpoints: RelicEndpointDescriptor[];
  /** Classification tags */
  tags: string[];
  /** Projection-core layout, density and event settings */
  projectionConfig: ProjectionMappingConfig;
  /** Raw component code snippet if available */
  code?: string;
  /** Live React component implementation */
  component?: ComponentType<any>;
  /** Live render function */
  render?: (props: Record<string, unknown>) => ReactNode;
  /** Default props */
  defaultProps?: Record<string, unknown>;
  /** Mock/sample data payload */
  mockData?: Record<string, unknown>;
  /** Arbitrary extensible metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Catalog manifest representing a scanned widgets/ subfolder (e.g. widgets/surface-ui).
 */
export interface SubfolderCatalogManifest {
  /** Name of the subfolder under widgets/ */
  subfolder: string;
  /** User-friendly display title */
  displayName: string;
  /** Description of the subfolder's purpose */
  description: string;
  /** Semantic version or build identifier */
  version?: string;
  /** Subfolder base path (e.g. "widgets/surface-ui") */
  path: string;
  /** Timestamp when scanned */
  scannedAt: string;
  /** Total number of discovered widgets in this subfolder */
  widgetCount: number;
  /** Discovered widget manifest entries */
  widgets: WidgetManifestEntry[];
  /** All capabilities supported across all widgets in this subfolder */
  capabilitiesSupported: CapabilityId[];
  /** All archetypes present in this subfolder */
  archetypesPresent: RelicArchetype[];
  /** List of source files scanned */
  sourceFilesScanned: string[];
  /** Extensible metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Master catalog manifest aggregating all discovered widgets/ subfolders.
 */
export interface MasterWidgetManifest {
  schemaVersion: string;
  generatedAt: string;
  subfolders: Record<string, SubfolderCatalogManifest>;
  allWidgets: WidgetManifestEntry[];
  byId: Record<string, WidgetManifestEntry>;
  byCapability: Record<string, WidgetManifestEntry[]>;
  byArchetype: Record<string, WidgetManifestEntry[]>;
  bySubfolder: Record<string, WidgetManifestEntry[]>;
  byCategory: Record<WidgetFunctionalCategory, WidgetManifestEntry[]>;
  stats: {
    totalSubfolders: number;
    totalWidgets: number;
    totalCapabilities: number;
    totalArchetypes: number;
    totalCategories: number;
  };
}

/**
 * Options for scanning widgets/ subfolders.
 */
export interface ScannerOptions {
  /** Target specific subfolder names; if omitted, scans all discovered */
  targetSubfolders?: string[];
  /** Include auxiliary studio/runtime components beyond seeded relics */
  includeAuxiliaryComponents?: boolean;
  /** Custom additional subfolders to scan */
  additionalSubfolders?: Array<{
    subfolder: string;
    path: string;
    displayName?: string;
  }>;
  /** Force re-evaluating source files */
  forceRefresh?: boolean;
}

/**
 * Result returned when injecting a manifest into projection-core.
 */
export interface ProjectionInjectionResult {
  registeredCount: number;
  updatedCount: number;
  skippedCount: number;
  registeredWidgetIds: string[];
  capabilitiesBound: CapabilityId[];
  timestamp: string;
}
