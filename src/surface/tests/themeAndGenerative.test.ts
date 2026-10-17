/**
 * B-4 ThemeRegistry (EAC-4) & Phase 3 GenerativeViewSpecCompiler (Condition 4 / F-4)
 * Deterministic Conformance Test Suite
 */

import {
  ThemeRegistry,
  globalThemeRegistry,
  AUTHORITATIVE_THEMES,
  CanonicalThemeId,
} from '../core/themeRegistry';
import {
  GenerativeViewSpecCompiler,
  globalGenerativeCompiler,
  formatSectionProvenanceCaption,
} from '../compiler/generativeCompiler';
import { deriveVisualTreatment } from '../core/contextSnapshot';
import { SURFACE_FAMILY_REGION_ENVELOPE } from '../SurfaceRecomposedView';
import { VIEW_SPEC_STUDIO_DEPRECATION_NOTICE } from '../components/ViewSpecStudioView';


function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

export function runThemeAndGenerativeTests(): { allPassed: boolean; logs: string[] } {
  const logs: string[] = [];

  const expectedThemes: CanonicalThemeId[] = [
    'theme-light',
    'theme-dark',
    'theme-midnight',
    'theme-nord',
    'theme-solarized',
    'theme-steel',
  ];

  // 1. Verify all 6 authoritative Throttler themes are registered
  const registry = new ThemeRegistry('theme-dark');
  const registeredIds = registry.getAllThemes().map((t) => t.id);
  assert(
    registeredIds.length === 6 && expectedThemes.every((id) => registeredIds.includes(id)),
    `Expected all 6 themes (${expectedThemes.join(', ')}), got ${registeredIds.join(', ')}`
  );
  logs.push('✔ Registered all 6 authoritative Throttler themes');

  // 2. Verify >= 2 independent perceptual channels across all 6 themes (EAC-4)
  const audits = globalThemeRegistry.verifyAllThemes();
  assert(audits.length === 6, `Expected 6 theme audits, got ${audits.length}`);
  for (const audit of audits) {
    assert(
      audit.valid && audit.violations.length === 0,
      `Theme ${audit.themeId} failed EAC-4 audit: ${audit.violations.join('; ')}`
    );
    assert(audit.distinctHueCount === 5, `Expected 5 distinct hues in ${audit.themeId}`);
    assert(audit.distinctGlyphCount === 5, `Expected 5 distinct glyphs in ${audit.themeId}`);
    assert(audit.distinctPatternCount >= 4, `Expected >= 4 stroke patterns in ${audit.themeId}`);
  }
  logs.push('✔ Verified EAC-4 >= 2 independent perceptual channels across all 6 themes');

  // 3. Verify theme switching never normalizes degraded or refusal states into live
  for (const themeId of expectedThemes) {
    globalThemeRegistry.setTheme(themeId, false);
    const liveToken = globalThemeRegistry.resolveStateToken('live', 'complete', themeId);
    const degradedToken = globalThemeRegistry.resolveStateToken('degraded', 'stale', themeId);
    const refusalToken = globalThemeRegistry.resolveStateToken('live', 'refusal', themeId);
    const unknownToken = globalThemeRegistry.resolveStateToken('unknown', 'missing_lineage', themeId);
    const demoToken = globalThemeRegistry.resolveStateToken('demo', 'unknown', themeId);

    assert(degradedToken.color !== liveToken.color, `Degraded color matched live in ${themeId}`);
    assert(degradedToken.strokePattern === 'dashed', `Degraded strokePattern must be dashed in ${themeId}`);
    assert(liveToken.strokePattern === 'solid', `Live strokePattern must be solid in ${themeId}`);
    assert(degradedToken.glyph === '⚠️', `Degraded glyph must be ⚠️ in ${themeId}`);
    assert(liveToken.glyph === '🟢', `Live glyph must be 🟢 in ${themeId}`);

    assert(refusalToken.color !== liveToken.color, `Refusal color matched live in ${themeId}`);
    assert(refusalToken.strokePattern === 'double', `Refusal strokePattern must be double in ${themeId}`);
    assert(refusalToken.glyph === '🛑', `Refusal glyph must be 🛑 in ${themeId}`);
    assert(refusalToken.stateToken === 'state.REFUSAL', `Refusal stateToken must be state.REFUSAL`);

    assert(unknownToken.strokePattern === 'dotted', `Unknown strokePattern must be dotted in ${themeId}`);
    assert(unknownToken.glyph === '⚪', `Unknown glyph must be ⚪ in ${themeId}`);

    assert(demoToken.strokePattern === 'dashed', `Demo strokePattern must be dashed in ${themeId}`);
    assert(demoToken.glyph === '🧪', `Demo glyph must be 🧪 in ${themeId}`);

    const staleTreatment = deriveVisualTreatment('degraded', 'stale', undefined, themeId);
    assert(staleTreatment.borderStyle.includes('border-dashed'), `Stale treatment must use dashed border in ${themeId}`);
    const refusalTreatment = deriveVisualTreatment('live', 'refusal', 'Inv_SignedAuthority', themeId);
    assert(refusalTreatment.isBlocking === true, `Refusal treatment must be blocking in ${themeId}`);
    assert(refusalTreatment.borderStyle.includes('border-double'), `Refusal treatment must use double border in ${themeId}`);
  }
  logs.push('✔ Verified degraded, refusal, unknown, and demo states never normalize across theme switches');

  // 4. Verify GenerativeViewSpecCompiler compiles real DesignIR into ViewSpec AST with SurfaceContext & B-2 stateToken
  const compiler = new GenerativeViewSpecCompiler();
  const aegisInstance = compiler.compileQuery('Show me the Aegis State Machine for Governed Director', {
    envelope: 'live',
    serverStatus: 'complete',
    themeId: 'theme-solarized',
  });
  assert(aegisInstance.widgetType === 'aegis-state-machine', 'Expected aegis-state-machine widgetType');
  assert(aegisInstance.viewSpecAst.widgets.length === 3, `Expected 3 compiled widgets, got ${aegisInstance.viewSpecAst.widgets.length}`);
  const surfaceCtxWidget = aegisInstance.viewSpecAst.widgets.find(
    (w) => w.widget.contract === 'SurfaceContext'
  );
  assert(surfaceCtxWidget !== undefined, 'Expected SurfaceContext widget in compiled ViewSpec AST');
  assert(
    surfaceCtxWidget.widget.props?.stateToken === 'state.COMPLETE',
    `Expected state.COMPLETE on SurfaceContext widget, got ${String(surfaceCtxWidget.widget.props?.stateToken)}`
  );
  assert(aegisInstance.sections.length === 2, 'Expected 2 provenance sections on Aegis response');
  assert(aegisInstance.sections[0].caption.includes('LIVE · source=peb-governance-srv'), 'Expected peb-governance-srv provenance on section 0');
  assert(aegisInstance.sections[1].caption.includes('LIVE · source=aegis-tlc-verifier'), 'Expected aegis-tlc-verifier provenance on section 1');
  logs.push('✔ Verified GenerativeViewSpecCompiler Aegis DesignIR -> ViewSpec AST compilation');

  // 5. Verify heterogeneous composite query emits per-section provenance captions & independent stateTokens (F-4)
  const metricsInstance = globalGenerativeCompiler.compileQuery(
    'Inspect storage health gauges and heterogeneous sparkline',
    {
      envelope: 'live',
      serverStatus: 'complete',
      themeId: 'theme-steel',
    }
  );
  assert(metricsInstance.widgetType === 'metrics-matrix', 'Expected metrics-matrix widgetType');
  assert(metricsInstance.sections.length === 2, 'Expected 2 sections on composite metrics response');
  assert(metricsInstance.sections[0].compiledStateToken === 'state.COMPLETE', 'Expected Section A state.COMPLETE');
  assert(metricsInstance.sections[0].caption.includes('LIVE · source=node-agent-01 · runId=wr-9821'), 'Expected node-agent-01 caption on Section A');
  assert(metricsInstance.sections[1].compiledStateToken === 'state.STALE', 'Expected Section B state.STALE');
  assert(
    metricsInstance.sections[1].caption.includes('DEGRADED (STALE) · source=topology-telemetry-srv · runId=wr-9822'),
    'Expected degraded stale caption on Section B'
  );
  assert(
    metricsInstance.compositeSummary.summaryCaption.includes(
      'COMPOSITE VIEW · 1 live source · 1 degraded · 0 fixtures · validated'
    ),
    `Unexpected composite summary: ${metricsInstance.compositeSummary.summaryCaption}`
  );
  logs.push('✔ Verified heterogeneous composite per-section provenance captions (F-4 / Condition 4)');

  // 6. Verify ungrounded non-demo data without server provenance is deterministically rejected (Condition 1)
  let ungroundedRejected = false;
  try {
    formatSectionProvenanceCaption({
      envelope: 'live',
      serverStatus: 'complete',
      sourceServerId: '',
      generatedAt: '2026-10-16T00:00:00Z',
    });
  } catch (err) {
    ungroundedRejected = String(err).includes('UNGROUNDED_DATA_VIOLATION');
  }
  assert(ungroundedRejected, 'Expected ungrounded live data without sourceServerId to throw UNGROUNDED_DATA_VIOLATION');

  const demoCaption = formatSectionProvenanceCaption({
    envelope: 'demo',
    serverStatus: 'unknown',
    generatedAt: '2026-10-16T00:00:00Z',
  });
  assert(demoCaption.includes('DEMO · fixture · non-authoritative'), 'Demo fixture caption must state DEMO · fixture · non-authoritative');
  logs.push('✔ Verified anti-mock ungrounded data rejection (Condition 1)');

  // 7. Verify B-5 shared surface-family region envelope & B-6 ViewSpecStudioView deprecation notice
  assert(
    SURFACE_FAMILY_REGION_ENVELOPE.includes('max-w-7xl mx-auto w-full'),
    `Expected SURFACE_FAMILY_REGION_ENVELOPE to include 'max-w-7xl mx-auto w-full', got '${SURFACE_FAMILY_REGION_ENVELOPE}'`
  );
  assert(
    VIEW_SPEC_STUDIO_DEPRECATION_NOTICE.code === 'B-6_DEPRECATED_PROTOTYPE_SWITCHBOARD' &&
      VIEW_SPEC_STUDIO_DEPRECATION_NOTICE.envelope === 'demo',
    'Expected VIEW_SPEC_STUDIO_DEPRECATION_NOTICE to declare B-6_DEPRECATED_PROTOTYPE_SWITCHBOARD and demo envelope'
  );
  logs.push('✔ Verified B-5 shared surface-family region envelope and B-6 ViewSpecStudioView deprecation disclosure');

  return { allPassed: true, logs };
}

// Self-execute when invoked directly via CLI (e.g. `npx tsx src/surface/tests/themeAndGenerative.test.ts`)
const isDirectExecution =
  typeof process !== 'undefined' &&
  Array.isArray(process.argv) &&
  process.argv[1]?.endsWith('themeAndGenerative.test.ts');

if (isDirectExecution) {
  const result = runThemeAndGenerativeTests();
  for (const log of result.logs) {
    console.log(log);
  }
  if (!result.allPassed) {
    process.exit(1);
  }
}

