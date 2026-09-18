import { FileSystemNode, DisplayMode, SortCriteria } from '../types';
import type { WitnessedRunProjection } from '@nexus/projection-core';

/**
 * Normalized Entity Record for surface-ui components.
 * Completely decoupled from VirtualFileSystem and FileSystemNode internal structures.
 */
export interface EntityRecord {
  id: string;
  name: string;
  kind: 'container' | 'leaf';
  category: 'document' | 'code' | 'image' | 'archive' | 'media' | 'binary' | 'folder';
  sizeInBytes: number;
  updatedAt?: number | string;
  tags: string[];
  originalPath?: string[];
  governance?: {
    attestationStatus: 'complete' | 'drift' | 'refusal' | 'stale' | 'unattested';
    sha256Conforming: boolean;
    digestVerification?: {
      validCount: number;
      totalCount: number;
      failures?: string[];
    };
    runId?: string;
  };
  attributes: Record<string, unknown>;
}

/**
 * Column definition for tabular/grid views in surface-ui.
 */
export interface EntityColumn {
  key: string;
  label: string;
  sortable?: boolean;
  width?: number | string;
  flex?: number;
  align?: 'left' | 'center' | 'right';
}

/**
 * Normalized Entity Collection State conforming to projection-core's EntityCollectionContract.
 */
export interface EntityCollectionState {
  collectionId: string;
  records: EntityRecord[];
  columns: EntityColumn[];
  selectedIds: string[];
  focusedId?: string;
  layout: {
    mode: 'table' | 'grid' | 'compact-list';
    sortKey: string;
    sortDirection: 'asc' | 'desc';
    filterText: string;
    activeTag?: string | null;
    groupByKind?: boolean;
  };
  metrics?: {
    totalCount: number;
    containerCount: number;
    leafCount: number;
    totalSizeBytes: number;
  };
}

/**
 * Normalized Breadcrumb Segment Token.
 */
export interface BreadcrumbSegment {
  id: string;
  label: string;
  path: string[];
  isCurrent: boolean;
  hasChildren: boolean;
}

/**
 * Workspace Context State conforming to projection-core's SurfaceContextContract.
 */
export interface SurfaceWorkspaceContext {
  surfaceId: string;
  surfaceType: 'workbench';
  activePaneId: 'pane-1' | 'pane-2';
  isDualPane: boolean;
  panes: Array<{
    id: 'pane-1' | 'pane-2';
    isFocused: boolean;
    location: {
      rawPath: string;
      segments: BreadcrumbSegment[];
      canNavigateUp: boolean;
      canNavigateBack: boolean;
      canNavigateForward: boolean;
    };
  }>;
  splitLayout?: {
    orientation: 'horizontal' | 'vertical';
    ratio: number;
  };
}

/**
 * Normalized Inspector State conforming to projection-core's InspectorPanelContract.
 */
export interface InspectorState {
  target: EntityRecord | null;
  tabs: Array<{
    id: 'metadata' | 'witness' | 'preview' | 'permissions';
    label: string;
    badge?: string;
  }>;
  activeTabId: string;
  attestation?: {
    status: 'complete' | 'drift' | 'refusal' | 'stale' | 'unattested';
    witnessId?: string;
    verificationDigest?: string;
    replayOk?: boolean;
    validDigestsCount?: number;
    totalDigestsCount?: number;
    receiptTimestamp?: string;
  };
}

/**
 * Unified ViewSpec Surface State representing the entire workbench state.
 */
export interface ViewspecSurfaceState {
  version: 1;
  surfaceContext: SurfaceWorkspaceContext;
  collections: Record<string, EntityCollectionState>;
  inspector: InspectorState;
}

/**
 * Normalized Semantic Action Verbs emitted by harvested relics.
 */
export type RelicAction =
  | { type: 'select'; payload: { paneId: 'pane-1' | 'pane-2'; ids: string[]; toggle?: boolean } }
  | { type: 'drilldown'; payload: { paneId: 'pane-1' | 'pane-2'; targetId: string; path: string[] } }
  | { type: 'navigate'; payload: { paneId: 'pane-1' | 'pane-2'; path: string[] } }
  | { type: 'navigateUp'; payload: { paneId: 'pane-1' | 'pane-2' } }
  | { type: 'inspect'; payload: { targetId: string } }
  | { type: 'sort'; payload: { paneId: 'pane-1' | 'pane-2'; key: string; direction: 'asc' | 'desc' } }
  | { type: 'filter'; payload: { paneId: 'pane-1' | 'pane-2'; query: string; tag?: string | null } }
  | { type: 'toggleSplit'; payload?: { enabled?: boolean } }
  | { type: 'mutate'; payload: { action: 'rename' | 'delete' | 'move' | 'create'; target: string; destination?: string } };

/**
 * ViewspecAdapter
 *
 * Provides bidirectional translation between Throttler internal services/state
 * and view-agnostic data structures ready for consumption by surface-ui relics.
 */
export class ViewspecAdapter {
  public static readonly DEFAULT_COLUMNS: EntityColumn[] = [
    { key: 'name', label: 'Name', sortable: true, flex: 1 },
    { key: 'governance', label: 'Governance', width: 120 },
    { key: 'modified', label: 'Date Modified', sortable: true, width: 130 },
    { key: 'type', label: 'Type', width: 110 },
    { key: 'size', label: 'Size', sortable: true, width: 90, align: 'right' },
  ];

  /**
   * Infers the semantic category of an item from its name and node type.
   */
  public static inferCategory(name: string, type: 'file' | 'folder'): EntityRecord['category'] {
    if (type === 'folder') return 'folder';
    const ext = name.split('.').pop()?.toLowerCase();
    if (!ext) return 'document';

    if (['ts', 'tsx', 'js', 'jsx', 'json', 'html', 'css', 'py', 'go', 'rs', 'c', 'cpp'].includes(ext)) {
      return 'code';
    }
    if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp'].includes(ext)) {
      return 'image';
    }
    if (['zip', 'tar', 'gz', 'bz2', '7z', 'rar'].includes(ext)) {
      return 'archive';
    }
    if (['mp3', 'wav', 'ogg', 'mp4', 'webm', 'mov'].includes(ext)) {
      return 'media';
    }
    return 'document';
  }

  /**
   * Validates whether a digest string adheres to SHA-256 formatting.
   */
  public static isValidSha256(digest: string | null | undefined): boolean {
    if (!digest) return false;
    return /^sha256:[a-f0-9]{64}$/i.test(digest) || /^[a-f0-9]{64}$/i.test(digest);
  }

  /**
   * Computes verification statistics from a WitnessedRunProjection.
   */
  public static computeWitnessStats(witnessedRun: WitnessedRunProjection): {
    validCount: number;
    totalCount: number;
    isCompleteSha256: boolean;
    failures: string[];
    digests: Record<string, string | null>;
  } {
    const digests: Record<string, string | null> = {
      contractDigest: witnessedRun.envelope.contractDigest,
      evaluationFingerprint: witnessedRun.envelope.evaluationFingerprint,
      manifestDigest: witnessedRun.manifest.digest,
      evidenceFingerprint: witnessedRun.evidence.fingerprint,
    };

    const failures: string[] = [];
    let validCount = 0;
    const totalCount = Object.keys(digests).length;

    for (const [key, val] of Object.entries(digests)) {
      if (this.isValidSha256(val)) {
        validCount++;
      } else {
        failures.push(`${key}: ${val ? 'invalid format' : 'missing'}`);
      }
    }

    return {
      validCount,
      totalCount,
      isCompleteSha256: validCount === totalCount && totalCount > 0,
      failures,
      digests,
    };
  }

  /**
   * Transforms a Throttler FileSystemNode into a clean EntityRecord.
   */
  public static toEntityRecord(
    node: FileSystemNode,
    witnessedRun?: WitnessedRunProjection | null
  ): EntityRecord {
    let governanceStatus: EntityRecord['governance'] = undefined;

    if (witnessedRun) {
      const isComplete = witnessedRun.status === 'complete';
      const isRefusal = witnessedRun.status === 'refusal';
      const isDrift = witnessedRun.status === 'drift';
      const stats = this.computeWitnessStats(witnessedRun);

      governanceStatus = {
        attestationStatus: isComplete
          ? 'complete'
          : isRefusal
          ? 'refusal'
          : isDrift
          ? 'drift'
          : 'stale',
        sha256Conforming: stats.isCompleteSha256,
        digestVerification: {
          validCount: stats.validCount,
          totalCount: stats.totalCount,
          failures: stats.failures,
        },
        runId: witnessedRun.workflow.instanceId,
      };
    }

    return {
      id: node.name,
      name: node.name,
      kind: node.type === 'folder' ? 'container' : 'leaf',
      category: this.inferCategory(node.name, node.type),
      sizeInBytes: node.size ?? (node.content ? node.content.length : 0),
      updatedAt: node.modified,
      tags: node.tags ? [...node.tags] : [],
      originalPath: node.originalPath ? [...node.originalPath] : undefined,
      governance: governanceStatus,
      attributes: {
        isTrash: node.isTrash ?? false,
        isShortcut: node.isShortcut ?? false,
        deletedAt: node.deletedAt,
      },
    };
  }

  /**
   * Transforms a collection of FileSystemNodes and view state into an EntityCollectionState.
   */
  public static toEntityCollection(
    nodes: FileSystemNode[],
    selectedNames: Set<string> | string[],
    sortCriteria: SortCriteria,
    filterQuery: string,
    displayMode: DisplayMode,
    activeTagFilter?: string | null,
    collectionId: string = 'vfs-pane'
  ): EntityCollectionState {
    const records = nodes.map((node) => this.toEntityRecord(node));
    const selectedIds = Array.isArray(selectedNames) ? selectedNames : Array.from(selectedNames);

    let containerCount = 0;
    let leafCount = 0;
    let totalSizeBytes = 0;

    for (const r of records) {
      if (r.kind === 'container') {
        containerCount++;
      } else {
        leafCount++;
        totalSizeBytes += r.sizeInBytes;
      }
    }

    const mode: 'table' | 'grid' | 'compact-list' =
      displayMode === 'list'
        ? 'table'
        : displayMode === 'grid' || displayMode === 'largeIcons' || displayMode === 'tiles'
        ? 'grid'
        : 'compact-list';

    return {
      collectionId,
      records,
      columns: this.DEFAULT_COLUMNS,
      selectedIds,
      layout: {
        mode,
        sortKey: sortCriteria.key,
        sortDirection: sortCriteria.direction,
        filterText: filterQuery,
        activeTag: activeTagFilter,
      },
      metrics: {
        totalCount: records.length,
        containerCount,
        leafCount,
        totalSizeBytes,
      },
    };
  }

  /**
   * Transforms breadcrumb segments into a SurfaceWorkspaceContext.
   */
  public static toWorkspaceContext(params: {
    pane1Path: string[];
    pane2Path: string[];
    activePane: 1 | 2;
    isDualPane: boolean;
    pane1CanGoBack?: boolean;
    pane1CanGoForward?: boolean;
    pane2CanGoBack?: boolean;
    pane2CanGoForward?: boolean;
  }): SurfaceWorkspaceContext {
    const createSegments = (path: string[]): BreadcrumbSegment[] => {
      return path.map((segment, idx) => ({
        id: `segment-${idx}-${segment}`,
        label: segment,
        path: path.slice(0, idx + 1),
        isCurrent: idx === path.length - 1,
        hasChildren: true,
      }));
    };

    const activePaneId = params.activePane === 1 ? 'pane-1' : 'pane-2';

    return {
      surfaceId: 'throttler-workbench',
      surfaceType: 'workbench',
      activePaneId,
      isDualPane: params.isDualPane,
      panes: [
        {
          id: 'pane-1',
          isFocused: params.activePane === 1,
          location: {
            rawPath: `/${params.pane1Path.join('/')}`,
            segments: createSegments(params.pane1Path),
            canNavigateUp: params.pane1Path.length > 1,
            canNavigateBack: params.pane1CanGoBack ?? false,
            canNavigateForward: params.pane1CanGoForward ?? false,
          },
        },
        ...(params.isDualPane
          ? [
              {
                id: 'pane-2' as const,
                isFocused: params.activePane === 2,
                location: {
                  rawPath: `/${params.pane2Path.join('/')}`,
                  segments: createSegments(params.pane2Path),
                  canNavigateUp: params.pane2Path.length > 1,
                  canNavigateBack: params.pane2CanGoBack ?? false,
                  canNavigateForward: params.pane2CanGoForward ?? false,
                },
              },
            ]
          : []),
      ],
      splitLayout: params.isDualPane
        ? {
            orientation: 'horizontal',
            ratio: 0.5,
          }
        : undefined,
    };
  }

  /**
   * Transforms the selected item and optional attestation projection into an InspectorState.
   */
  public static toInspectorState(
    selectedNode: FileSystemNode | null,
    witnessedRun?: WitnessedRunProjection | null
  ): InspectorState {
    const target = selectedNode ? this.toEntityRecord(selectedNode, witnessedRun) : null;

    let attestation: InspectorState['attestation'] = undefined;
    if (witnessedRun) {
      const stats = this.computeWitnessStats(witnessedRun);
      attestation = {
        status: (witnessedRun.status as any) ?? 'unattested',
        witnessId: witnessedRun.workflow.instanceId,
        verificationDigest: witnessedRun.evidence.fingerprint ?? witnessedRun.manifest.digest ?? undefined,
        replayOk: witnessedRun.replay.status === 'replay_ok',
        validDigestsCount: stats.validCount,
        totalDigestsCount: stats.totalCount,
        receiptTimestamp: witnessedRun.receipts.conduitTransition ?? witnessedRun.receipts.pebAdmission ?? undefined,
      };
    }

    return {
      target,
      tabs: [
        { id: 'metadata', label: 'Properties' },
        { id: 'witness', label: 'Witness / Proof', badge: attestation?.status },
        { id: 'preview', label: 'Preview' },
      ],
      activeTabId: witnessedRun ? 'witness' : 'metadata',
      attestation,
    };
  }

  /**
   * Constructs the full unified ViewspecSurfaceState for the entire workspace.
   */
  public static toUnifiedSurface(params: {
    pane1Path: string[];
    pane2Path: string[];
    activePane: 1 | 2;
    isDualPane: boolean;
    pane1Items: FileSystemNode[];
    pane2Items: FileSystemNode[];
    pane1Selected: Set<string>;
    pane2Selected: Set<string>;
    sortCriteria: SortCriteria;
    filterQuery: string;
    displayMode: DisplayMode;
    activeTagFilter?: string | null;
    selectedNode: FileSystemNode | null;
    witnessedRun?: WitnessedRunProjection | null;
  }): ViewspecSurfaceState {
    const surfaceContext = this.toWorkspaceContext({
      pane1Path: params.pane1Path,
      pane2Path: params.pane2Path,
      activePane: params.activePane,
      isDualPane: params.isDualPane,
    });

    const collectionPane1 = this.toEntityCollection(
      params.pane1Items,
      params.pane1Selected,
      params.sortCriteria,
      params.filterQuery,
      params.displayMode,
      params.activeTagFilter,
      'pane-1-collection'
    );

    const collectionPane2 = this.toEntityCollection(
      params.pane2Items,
      params.pane2Selected,
      params.sortCriteria,
      params.filterQuery,
      params.displayMode,
      params.activeTagFilter,
      'pane-2-collection'
    );

    const inspector = this.toInspectorState(params.selectedNode, params.witnessedRun);

    return {
      version: 1,
      surfaceContext,
      collections: {
        'pane-1': collectionPane1,
        ...(params.isDualPane ? { 'pane-2': collectionPane2 } : {}),
      },
      inspector,
    };
  }
}
