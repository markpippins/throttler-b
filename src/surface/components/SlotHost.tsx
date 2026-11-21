import React from 'react';

import {
  RendererSlotBridge,
  type RendererAdapterRegistry,
  type ResolvedSlot,
  type WidgetInstance,
} from '../../../typescript/projection-core/src/index';
import { globalThemeRegistry, type StateTokenTreatment, type ThemeDefinition } from '../core/themeRegistry';

/**
 * Slot host renderer (record d43a8d6d §6, §11 AC3/AC4).
 *
 * A host owns its interior layout: this component renders the host's RESOLVED slots in the
 * declaration order `resolveSlots` preserves, never a flat list of widgets. It is the React
 * half of the contract; a `rendererKind: "canvas2d" | "webgl"` slot instead mounts through
 * `RendererSlotBridge` into a `RendererSlotHost` (§6) — a ReactNode cannot live inside a
 * Three.js frame loop, so the adapter gets the container and the slot's state token.
 *
 * Two rendering obligations are non-negotiable here:
 *   - a required slot with no occupant renders its named caption, never nothing (§7.2);
 *   - the envelope treatment comes from the theme's state tokens, so the claim is carried on
 *     at least two perceptual channels (colour + stroke pattern), not colour alone (EAC-4).
 */
export interface SlotHostProps {
  /** Instance id of the host widget whose slots these are. */
  hostWidgetId: string;
  slots: readonly ResolvedSlot[];
  /** Theme override; defaults to the active surface theme. */
  themeId?: string;
  /** Renders one occupant. Defaults to a labelled placeholder naming type and instance. */
  renderOccupant?: (occupant: WidgetInstance, slot: ResolvedSlot) => React.ReactNode;
  /**
   * Adapters available to `renderer` slots. When supplied, each renderer occupant's mount
   * node is driven by a `RendererSlotBridge` (mount → token → dispose); when omitted the
   * mount node is rendered unwired for a host that owns its own canvas.
   */
  rendererRegistry?: RendererAdapterRegistry;
  className?: string;
}

/**
 * One renderer occupant's mount point. `RendererSlotBridge` owns the lifecycle, so a token
 * change is a token update rather than a remount, and detaching disposes the adapter.
 */
const SlotRendererMount: React.FC<{
  registry?: RendererAdapterRegistry;
  slot: ResolvedSlot;
  occupant: WidgetInstance;
}> = ({ registry, slot, occupant }) => {
  const mountRef = React.useRef<HTMLDivElement | null>(null);

  const bridge = React.useMemo(() => {
    if (!registry || !occupant.renderer) return undefined;
    return new RendererSlotBridge(registry, occupant.renderer);
  }, [registry, occupant.id, occupant.renderer?.adapterId, occupant.renderer?.kind]);

  React.useEffect(() => {
    if (!bridge || !slot.effectiveEnvelope) return;
    bridge.setStateToken(slot.effectiveEnvelope);
  }, [bridge, slot.effectiveEnvelope]);

  React.useEffect(() => {
    const node = mountRef.current;
    if (!bridge || !node) return;
    bridge.attach(node);
    return () => bridge.dispose();
  }, [bridge]);

  return (
    <div
      ref={mountRef}
      data-renderer-mount={occupant.renderer?.adapterId ?? ''}
      data-renderer-kind={slot.descriptor.rendererKind ?? 'react'}
      data-renderer-wired={bridge ? 'true' : 'false'}
      className="min-h-[120px] w-full"
    />
  );
};

function treatmentFor(
  slot: ResolvedSlot,
  treatments: ThemeDefinition['stateTokens'],
): StateTokenTreatment | undefined {
  return slot.effectiveEnvelope ? treatments[slot.effectiveEnvelope] : undefined;
}

export const SlotHost: React.FC<SlotHostProps> = ({
  hostWidgetId,
  slots,
  themeId,
  renderOccupant,
  rendererRegistry,
  className,
}) => {
  const theme = globalThemeRegistry.getTheme(themeId);

  return (
    <div
      className={`flex flex-col gap-2 ${className ?? ''}`}
      data-slot-host={hostWidgetId}
      data-theme-id={theme.id}
    >
      {slots.map((slot) => {
        const treatment = treatmentFor(slot, theme.stateTokens);
        const density = slot.descriptor.layoutHint?.density;
        const isRendererSlot = slot.descriptor.kind === 'renderer';

        return (
          <section
            key={slot.slotId}
            data-slot={slot.slotId}
            data-slot-kind={slot.descriptor.kind}
            data-status={slot.status}
            data-envelope={slot.effectiveEnvelope ?? 'none'}
            data-doc-anchor={slot.descriptor.docAnchor ?? ''}
            data-stroke-pattern={treatment?.strokePattern ?? 'none'}
            data-density={density ?? 'default'}
            className={`flex flex-col gap-1.5 rounded-lg border border-border/60 bg-surface/60 p-2 ${
              treatment?.border ?? ''
            } ${treatment?.surfaceTint ?? ''}`}
          >
            <header className="flex items-center justify-between gap-2">
              <span className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                {slot.slotId}
              </span>
              {treatment && (
                <span
                  className={`rounded px-1.5 py-0.5 font-mono text-[10px] ${treatment.badgeClass}`}
                  data-envelope-badge={slot.effectiveEnvelope}
                >
                  {treatment.glyph} {treatment.stateToken}
                </span>
              )}
            </header>

            {slot.status === 'degraded-missing' ? (
              <p
                data-caption="missing"
                className="rounded border border-dashed border-amber-500/60 bg-amber-500/10 px-2 py-1.5 text-xs text-amber-600 dark:text-amber-300"
              >
                {slot.caption}
              </p>
            ) : slot.status === 'empty' ? (
              <p data-slot-empty="true" className="px-2 py-1.5 text-xs text-muted-foreground/70">
                No occupant
              </p>
            ) : (
              slot.occupants.map((occupant) => (
                <div
                  key={occupant.id}
                  data-occupant={occupant.widget.type}
                  data-occupant-id={occupant.id}
                  className="min-w-0"
                >
                  {isRendererSlot ? (
                    <SlotRendererMount
                      registry={rendererRegistry}
                      slot={slot}
                      occupant={occupant}
                    />
                  ) : renderOccupant ? (
                    renderOccupant(occupant, slot)
                  ) : (
                    <span className="font-mono text-xs text-muted-foreground">
                      {occupant.widget.type} · {occupant.id}
                    </span>
                  )}
                </div>
              ))
            )}
          </section>
        );
      })}
    </div>
  );
};

export default SlotHost;
