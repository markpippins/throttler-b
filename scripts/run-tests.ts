/**
 * Single entrypoint for this repo's script-style conformance suites.
 *
 * These are not vitest suites. Each file exports a runner that returns
 * `{ allPassed, logs }` (or throws) instead of registering `test()` blocks, so
 * `vitest run` reports "No test suite found in file". Before this file existed
 * most of them exported a runner that nothing imported and therefore could
 * never run at all.
 *
 * Suites are listed explicitly rather than globbed, because two groups need
 * things this repo does not contain and must not be swept in:
 *   - `doctrineLookup.pg.test.ts` needs a live PostgreSQL.
 *   - `replayVerifier.test.ts` takes a caller-supplied fixture corpus. Its
 *     existing entrypoint (`typescript/projection-core/scripts/run-replay-conformance.ts`)
 *     reads `python/governance-envelope/replay_fixtures/F0[1-7]_*.json`, which
 *     is not in this repository, so invoking the runner here can only produce
 *     "documents is not iterable". Excluded until the corpus lands in-repo.
 * The `typescript/projection-core` and `widgets/surface-ui` trees are
 * near-duplicates, and both are run deliberately — they are separate copies.
 */

import { runApiServiceTests } from '../src/services/apiService.test.js';
import { runThemeAndGenerativeTests } from '../src/surface/tests/themeAndGenerative.test.js';
import { runRegistryConformance as pcRegistryConformance } from '../typescript/projection-core/src/runtime/doctrineLookup.registry.test.js';
import { runDoctrineLookupConformance as pcDoctrineLookup } from '../typescript/projection-core/src/runtime/doctrineLookup.test.js';
import { runLifecycleConformance as pcLifecycle } from '../typescript/projection-core/src/runtime/lifecycle.test.js';
import { runWitnessedRunConformance as pcWitnessedRun } from '../typescript/projection-core/src/runtime/witnessedRun.test.js';
import { runContractCatalogConformance as pcContractCatalog } from '../typescript/projection-core/src/widget/contractCatalog.test.js';
import { runRegistryConformance as uiRegistryConformance } from '../widgets/surface-ui/src/core/runtime/doctrineLookup.registry.test.js';
import { runDoctrineLookupConformance as uiDoctrineLookup } from '../widgets/surface-ui/src/core/runtime/doctrineLookup.test.js';
import { runLifecycleConformance as uiLifecycle } from '../widgets/surface-ui/src/core/runtime/lifecycle.test.js';
import { runWitnessedRunConformance as uiWitnessedRun } from '../widgets/surface-ui/src/core/runtime/witnessedRun.test.js';
import { runContractCatalogConformance as uiContractCatalog } from '../widgets/surface-ui/src/core/widget/contractCatalog.test.js';

type Runnable = () => unknown | Promise<unknown>;

const SUITES: ReadonlyArray<{ name: string; run: Runnable }> = [
  { name: 'theme-and-generative (B-4/Phase-3)', run: runThemeAndGenerativeTests },
  { name: 'api-service', run: runApiServiceTests },
  { name: 'projection-core/registry', run: pcRegistryConformance },
  { name: 'projection-core/doctrine-lookup', run: pcDoctrineLookup },
  { name: 'projection-core/lifecycle', run: pcLifecycle },
  { name: 'projection-core/witnessed-run', run: pcWitnessedRun },
  { name: 'projection-core/contract-catalog', run: pcContractCatalog },
  { name: 'surface-ui/registry', run: uiRegistryConformance },
  { name: 'surface-ui/doctrine-lookup', run: uiDoctrineLookup },
  { name: 'surface-ui/lifecycle', run: uiLifecycle },
  { name: 'surface-ui/witnessed-run', run: uiWitnessedRun },
  { name: 'surface-ui/contract-catalog', run: uiContractCatalog },
];

function readResult(value: unknown): { passed: boolean; logs: string[] } {
  if (value && typeof value === 'object' && 'allPassed' in value) {
    const r = value as { allPassed?: unknown; logs?: unknown };
    const logs = Array.isArray(r.logs) ? r.logs.map(String) : [];
    return { passed: r.allPassed === true, logs };
  }
  // Runners that return void signal failure by throwing.
  return { passed: true, logs: [] };
}

async function main(): Promise<void> {
  let failed = 0;
  for (const suite of SUITES) {
    try {
      const { passed, logs } = readResult(await suite.run());
      for (const line of logs) console.log(`    ${line}`);
      if (passed) {
        console.log(`  PASS  ${suite.name}`);
      } else {
        failed += 1;
        console.error(`  FAIL  ${suite.name}`);
      }
    } catch (error) {
      failed += 1;
      console.error(`  FAIL  ${suite.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  console.log(`\n${SUITES.length - failed}/${SUITES.length} suites passed`);
  process.exit(failed === 0 ? 0 : 1);
}

void main();
