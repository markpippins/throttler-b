import { ReactNode } from 'react';
import type { CapabilityId, DesignIR, ViewSpec } from '@nexus/projection-core';

export type RelicArchetype =
  | 'react-component'
  | 'data-vis'
  | 'interactive-tool'
  | 'control-surface'
  | 'canvas-element';

export interface RelicInput {
  name: string;
  type: string;
  defaultValue?: unknown;
}

export interface RelicEndpoint {
  raw: string;
  method: string;
  signature: string;
}

export interface AbsorbedWidget {
  id: string;
  name: string;
  description: string;
  tags: string[];
  archetype: RelicArchetype;
  componentName: string;
  inputs: RelicInput[];
  endpoints: RelicEndpoint[];
  capabilities: CapabilityId[];
  code: string;
  render: (props: Record<string, unknown>) => ReactNode;
  defaultProps?: Record<string, unknown>;
  mockData?: Record<string, unknown>;
}

export interface OntologicalSpaceNode {
  id: string;
  path: string[];
  title: string;
  description: string;
  iconName: string;
  category: 'inventory' | 'compiler' | 'governance' | 'projection';
  designIr?: DesignIR;
  viewSpec?: ViewSpec;
  associatedWidgetIds: string[];
  metadata?: Record<string, unknown>;
}

export type SurfaceRecomposedTab =
  | 'relics'
  | 'viewspec'
  | 'governance'
  | 'vfs-projection'
  | 'registry';
