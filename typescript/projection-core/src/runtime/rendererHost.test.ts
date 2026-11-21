/**
 * Imperative renderer occupancy conformance (record d43a8d6d §6, §11 AC6).
 *
 * No real WebGL context: the adapter is a stub, so the test asserts the lifecycle contract
 * (mount → update on token change → dispose) rather than pixels.
 */

import type { EpistemicClaim } from "../types/composition.js";
import {
  RendererAdapterRegistry,
  RendererSlotBridge,
  RendererSlotHost,
  requiresImperativeRenderer,
  type ImperativeRenderer,
  type RendererAdapter,
} from "./rendererHost.js";

function ok(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

function equal(actual: unknown, expected: unknown, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`);
  }
}

interface StubSpy {
  mounts: number;
  updates: Array<Record<string, unknown>>;
  disposes: number;
  tokens: EpistemicClaim[];
  lastContainer: unknown;
}

function stubAdapter(id: string, kind: "canvas2d" | "webgl", spy: StubSpy): RendererAdapter {
  return {
    id,
    kind,
    mount(container, props): ImperativeRenderer {
      spy.mounts += 1;
      spy.lastContainer = container;
      let props_ = props;
      return {
        update(next) {
          props_ = next;
          spy.updates.push(next);
        },
        dispose() {
          equal(typeof props_, "object", "renderer was mounted before dispose");
          spy.disposes += 1;
        },
      };
    },
    applyStateToken(token) {
      spy.tokens.push(token);
    },
  };
}

export function runRendererHostConformance(): { allPassed: boolean; logs: string[] } {
  const logs: string[] = [];
  const registry = new RendererAdapterRegistry();
  const spy: StubSpy = { mounts: 0, updates: [], disposes: 0, tokens: [], lastContainer: undefined };
  registry.register(stubAdapter("r-webgl", "webgl", spy));

  // Kind mismatch is refused rather than mounting the wrong surface.
  equal(registry.resolve({ adapterId: "r-webgl", kind: "canvas2d" }), undefined, "kind mismatch does not resolve");
  equal(registry.resolve({ adapterId: "missing", kind: "webgl" }), undefined, "unknown adapter does not resolve");
  ok(registry.resolve({ adapterId: "r-webgl", kind: "webgl" }), "matching ref resolves");
  logs.push("registry: kind mismatch and unknown adapters refused");

  const slotHost = new RendererSlotHost(registry);
  const container = { tagName: "DIV" };

  equal(slotHost.isMounted, false, "host starts unmounted");
  equal(slotHost.mount({ adapterId: "missing", kind: "webgl" }, container, {}), false, "mount returns false for unresolved ref");
  equal(slotHost.isMounted, false, "failed mount leaves host unmounted");
  equal(spy.mounts, 0, "failed mount does not call the adapter");

  equal(slotHost.mount({ adapterId: "r-webgl", kind: "webgl" }, container, { nodeCount: 3 }), true, "mount succeeds");
  equal(spy.mounts, 1, "adapter mounted once");
  equal(spy.lastContainer, container, "adapter receives the host container");
  equal(slotHost.isMounted, true, "host reports mounted");

  slotHost.update({ nodeCount: 5 });
  equal(spy.updates.length, 1, "update forwards props");
  equal(spy.updates[0]?.nodeCount, 5, "update carries the new props");

  slotHost.setStateToken("degraded");
  equal(spy.tokens.join(","), "degraded", "adapter receives the epistemic token");
  equal(spy.updates.length, 2, "token change triggers a renderer update");
  equal(spy.updates[1]?.stateToken, "degraded", "update carries the state token");
  equal(spy.updates[1]?.nodeCount, 5, "token update preserves prior props");
  equal(slotHost.currentToken, "degraded", "host records the current token");

  slotHost.dispose();
  equal(spy.disposes, 1, "dispose called on unmount");
  equal(slotHost.isMounted, false, "host reports unmounted after dispose");

  slotHost.dispose();
  equal(spy.disposes, 1, "dispose is idempotent");

  // A token set before mount is re-applied on mount, so a late surface is never uncoloured.
  const lateSpy: StubSpy = { mounts: 0, updates: [], disposes: 0, tokens: [], lastContainer: undefined };
  const lateRegistry = new RendererAdapterRegistry();
  lateRegistry.register(stubAdapter("r-late", "canvas2d", lateSpy));
  const lateHost = new RendererSlotHost(lateRegistry);
  lateHost.setStateToken("demo");
  lateHost.mount({ adapterId: "r-late", kind: "canvas2d" }, container, {});
  equal(lateSpy.tokens.join(","), "demo", "pre-mount token applied on mount");

  // ── Bridge: the React ref-callback path drives the same lifecycle ──
  const bridgeSpy: StubSpy = { mounts: 0, updates: [], disposes: 0, tokens: [], lastContainer: undefined };
  const bridgeRegistry = new RendererAdapterRegistry();
  bridgeRegistry.register(stubAdapter("r-bridge", "webgl", bridgeSpy));
  const bridge = new RendererSlotBridge(
    bridgeRegistry,
    { adapterId: "r-bridge", kind: "webgl" },
    { nodeCount: 2 },
  );
  const bridgeContainer = { tagName: "DIV" };
  const secondContainer = { tagName: "CANVAS" };

  bridge.setStateToken("unknown");
  equal(bridge.isMounted, false, "bridge starts unmounted");
  equal(bridge.attach(bridgeContainer), true, "bridge mounts when a React node attaches");
  equal(bridgeSpy.mounts, 1, "bridge mounts the adapter once");
  equal(bridgeSpy.lastContainer, bridgeContainer, "bridge passes the React node to the adapter");
  equal(bridgeSpy.tokens.join(","), "unknown", "a token set before attach is re-applied on mount");
  equal(bridge.currentToken, "unknown", "bridge records the slot token");

  equal(bridge.attach(bridgeContainer), true, "re-attaching the same live node is a no-op");
  equal(bridgeSpy.mounts, 1, "the same container does not remount");

  bridge.attach(null);
  equal(bridgeSpy.disposes, 1, "detach disposes the adapter");
  equal(bridge.isMounted, false, "bridge reports unmounted after detach");
  bridge.attach(null);
  equal(bridgeSpy.disposes, 1, "repeated detach is idempotent");

  bridge.attach(bridgeContainer);
  equal(bridgeSpy.mounts, 2, "re-attaching after detach mounts again");
  bridge.attach(secondContainer);
  equal(bridgeSpy.disposes, 2, "a new container disposes the previous occupancy");
  equal(bridgeSpy.mounts, 3, "a new container mounts the adapter for that node");
  equal(bridgeSpy.lastContainer, secondContainer, "the adapter receives the replacement node");

  const unresolvedBridge = new RendererSlotBridge(bridgeRegistry, { adapterId: "r-bridge", kind: "canvas2d" });
  equal(unresolvedBridge.attach(bridgeContainer), false, "an unresolved ref does not mount");
  equal(unresolvedBridge.isMounted, false, "an unresolved ref leaves the bridge unmounted");
  logs.push("bridge: ref attach/detach drives mount/token/dispose without remounting a live node");

  equal(requiresImperativeRenderer("webgl"), true, "webgl requires an imperative renderer");
  equal(requiresImperativeRenderer("react"), false, "react does not");
  logs.push("AC6: mount / update-on-token / dispose lifecycle verified against a stub adapter");

  return { allPassed: true, logs };
}
