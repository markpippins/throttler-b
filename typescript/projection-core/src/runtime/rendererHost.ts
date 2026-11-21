/**
 * Imperative renderer occupancy (record d43a8d6d §6).
 *
 * `AbsorbedWidget.render` returns a ReactNode, which is unusable inside a Three.js frame
 * loop. A slot declared with `rendererKind: "canvas2d" | "webgl"` therefore consumes an
 * imperative adapter instead, and the AST carries only a `RendererRef` — the functions stay
 * out of the content-addressed spec.
 *
 * Epistemic state reaches these renderers through the token channel the ThemeRegistry
 * already ships (`strokePattern` / `strokeDasharray`, documented "for SVG / Canvas /
 * programmatic inspection"), not through React.
 */

import type { EpistemicClaim, ImperativeRendererKind, RendererKind, RendererRef } from "../types/composition";

export interface ImperativeRenderer<P extends Record<string, unknown> = Record<string, unknown>> {
  update(props: P): void;
  dispose(): void;
}

export interface RendererAdapter<P extends Record<string, unknown> = Record<string, unknown>> {
  readonly id: string;
  readonly kind: ImperativeRendererKind;
  mount(container: unknown, props: P): ImperativeRenderer<P>;
  applyStateToken?(token: EpistemicClaim): void;
}

export class RendererAdapterRegistry {
  private readonly adapters = new Map<string, RendererAdapter>();

  register(adapter: RendererAdapter): void {
    this.adapters.set(adapter.id, adapter);
  }

  /** Resolves a ref, rejecting a kind mismatch rather than mounting the wrong surface. */
  resolve(ref: RendererRef): RendererAdapter | undefined {
    const adapter = this.adapters.get(ref.adapterId);
    if (!adapter || adapter.kind !== ref.kind) return undefined;
    return adapter;
  }

  has(adapterId: string): boolean {
    return this.adapters.has(adapterId);
  }
}

/**
 * Owns the mount/update/dispose lifecycle of one occupancy. A host that fails to dispose
 * leaks GPU resources, so disposal is explicit and idempotent.
 */
export class RendererSlotHost {
  private adapter?: RendererAdapter;
  private renderer?: ImperativeRenderer;
  private props: Record<string, unknown> = {};
  private token?: EpistemicClaim;

  constructor(private readonly registry: RendererAdapterRegistry) {}

  /** Returns false when the ref cannot be resolved — the caller renders a refusal, not a blank. */
  mount(ref: RendererRef, container: unknown, props: Record<string, unknown> = {}): boolean {
    const adapter = this.registry.resolve(ref);
    if (!adapter) return false;

    this.adapter = adapter;
    this.props = props;
    this.renderer = adapter.mount(container, props);

    // Re-apply a token set before mount so a late-attached surface is never uncoloured.
    if (this.token !== undefined) adapter.applyStateToken?.(this.token);

    return true;
  }

  update(props: Record<string, unknown>): void {
    if (!this.renderer) return;
    this.props = props;
    this.renderer.update(props);
  }

  /** Routes an epistemic token to the adapter and the renderer (§6). */
  setStateToken(token: EpistemicClaim): void {
    this.token = token;
    this.adapter?.applyStateToken?.(token);
    this.renderer?.update({ ...this.props, stateToken: token });
  }

  get currentToken(): EpistemicClaim | undefined {
    return this.token;
  }

  get isMounted(): boolean {
    return this.renderer !== undefined;
  }

  dispose(): void {
    this.renderer?.dispose();
    this.renderer = undefined;
    this.adapter = undefined;
    this.token = undefined;
  }
}

/**
 * Connects a React host's mount node to one imperative occupancy.
 *
 * `RendererSlotHost` owns the GPU lifecycle but speaks `mount(ref, container, props)`. A React
 * renderer only has a ref callback, which fires with the node on attach and `null` on detach.
 * This bridge is that adapter, so `SlotHost` can hand a renderer slot's container over without
 * duplicating dispose/token bookkeeping — and `null` reliably disposes rather than leaking.
 */
export class RendererSlotBridge {
  private readonly host: RendererSlotHost;
  private container?: unknown;
  /**
   * The slot's claim is remembered here because `RendererSlotHost.dispose()` clears its own
   * token; a container swap must not silently drop the treatment it was told to carry.
   */
  private token?: EpistemicClaim;

  constructor(
    registry: RendererAdapterRegistry,
    private readonly ref: RendererRef,
    private readonly props: Record<string, unknown> = {},
  ) {
    this.host = new RendererSlotHost(registry);
  }

  /**
   * React ref callback. Re-attaching the same live container is a no-op, a new container
   * replaces the previous occupancy, and `null` disposes.
   *
   * @returns whether the occupancy is mounted (false for `null` or an unresolved ref).
   */
  attach(container: unknown): boolean {
    if (container === null || container === undefined) {
      this.dispose();
      return false;
    }
    if (this.container === container && this.host.isMounted) return true;

    this.host.dispose();
    this.container = container;
    // `mount` re-applies whatever the host holds, so restoring it first keeps a token set
    // before attach (or before a container swap) intact.
    if (this.token !== undefined) this.host.setStateToken(this.token);
    return this.host.mount(this.ref, container, this.props);
  }

  /** Routes the slot's effective claim to the adapter (§6). Safe before `attach`. */
  setStateToken(token: EpistemicClaim): void {
    this.token = token;
    this.host.setStateToken(token);
  }

  get isMounted(): boolean {
    return this.host.isMounted;
  }

  get currentToken(): EpistemicClaim | undefined {
    return this.host.currentToken;
  }

  dispose(): void {
    this.host.dispose();
    this.container = undefined;
  }
}

/** `"react"` slots are occupied by components; this guards the imperative branch only. */
export function requiresImperativeRenderer(kind: RendererKind | undefined): boolean {
  return kind === "canvas2d" || kind === "webgl";
}
