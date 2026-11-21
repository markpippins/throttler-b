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

/** `"react"` slots are occupied by components; this guards the imperative branch only. */
export function requiresImperativeRenderer(kind: RendererKind | undefined): boolean {
  return kind === "canvas2d" || kind === "webgl";
}
