/**
 * Single entrypoint for this repo's script-style conformance suites.
 *
 * These are not vitest suites. Each file exports a runner that returns
 * `{ allPassed, logs }` (or throws) instead of registering `test()` blocks, so
 * `vitest run` reports "No test suite found in file". Before this file existed
 * most of them exported a runner that nothing imported and could never run.
 *
 * Suites are listed explicitly rather than globbed, because one group needs
 * something this repository does not contain:
 *   - `doctrineLookup.pg.test.ts` needs a live PostgreSQL.
 *   - `replayVerifier.test.ts` takes a caller-supplied fixture corpus. The
 *     corpus (`F0[1-7]_*.json`) lives in the parent nexus repository at
 *     `python/governance-envelope/replay_fixtures`, not here. Point
 *     `REPLAY_FIXTURES_DIR` at it to run these two suites; otherwise they are
 *     reported as SKIP rather than being passed off as green or as failures.
 *
 * `typescript/projection-core` and `widgets/surface-ui` are near-duplicates of
 * each other, and both are run deliberately — they are separate copies.
 */

import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { runApiServiceTests } from '../src/services/apiService.test.js';
import { runThemeAndGenerativeTests } from '../src/surface/tests/themeAndGenerative.test.js';
import { runRegistryConformance as pcRegistryConformance } from '../typescript/projection-core/src/runtime/doctrineLookup.registry.test.js';
import { runDoctrineLookupConformance as pcDoctrineLookup } from '../typescript/projection-core/src/runtime/doctrineLookup.test.js';
import { runLifecycleConformance as pcLifecycle } from '../typescript/projection-core/src/runtime/lifecycle.test.js';
import {
  runReplayConformance as pcReplay,
  type ReplayFixtureDocument,
} from '../typescript/projection-core/src/runtime/replayVerifier.test.js';
import { runWitnessedRunConformance as pcWitnessedRun } from '../typescript/projection-core/src/runtime/witnessedRun.test.js';
import { runContractCatalogConformance as pcContractCatalog } from '../typescript/projection-core/src/widget/contractCatalog.test.js';
import { runRegistryConformance as uiRegistryConformance } from '../widgets/surface-ui/src/core/runtime/doctrineLookup.registry.test.js';
import { runDoctrineLookupConformance as uiDoctrineLookup } from '../widgets/surface-ui/src/core/runtime/doctrineLookup.test.js';
import { runLifecycleConformance as uiLifecycle } from '../widgets/surface-ui/src/core/runtime/lifecycle.test.js';
import { runReplayConformance as uiReplay } from '../widgets/surface-ui/src/core/runtime/replayVerifier.test.js';
import { runWitnessedRunConformance as uiWitnessedRun } from '../widgets/surface-ui/src/core/runtime/witnessedRun.test.js';
import { runContractCatalogConformance as uiContractCatalog } from '../widgets/surface-ui/src/core/widget/contractCatalog.test.js';

type Runnable = () => unknown | Promise<unknown>;

const REPLAY_FIXTURES_DIR =
  process.env.REPLAY_FIXTURES_DIR ?? 'python/governance-envelope/replay_fixtures';
const replayCorpusAvailable = existsSync(REPLAY_FIXTURES_DIR);

async function loadReplayDocuments(): Promise<ReplayFixtureDocument[]> {
  const names = (await readdir(REPLAY_FIXTURES_DIR))
    .filter((name) => /^F0[1-7]_.*\.json$/.test(name))
    .sort();
  return Promise.all(
    names.map(async (name) =>
      JSON.parse(await readFile(join(REPLAY_FIXTURES_DIR, name), 'utf8')) as ReplayFixtureDocument,
    ),
  );
}

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

const REPLAY_SUITES: ReadonlyArray<{ name: string; run: Runnable }> = replayCorpusAvailable
  ? [
      {
        name: 'projection-core/replay-verifier',
        run: async () => pcReplay(await loadReplayDocuments()),
      },
      { name: 'surface-ui/replay-verifier', run: async () => uiReplay(await loadReplayDocuments()) },
    ]
  : [];

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
  let skipped = 0;

  for (const suite of [...SUITES, ...REPLAY_SUITES]) {
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
      console.error(
        `  FAIL  ${suite.name}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  if (!replayCorpusAvailable) {
    skipped = 2;
    console.log(
      `  SKIP  projection-core/replay-verifier, surface-ui/replay-verifier — ` +
        `no fixture corpus at ${REPLAY_FIXTURES_DIR} (set REPLAY_FIXTURES_DIR to enable)`,
    );
  }

  const ran = SUITES.length + REPLAY_SUITES.length;
  console.log(
    `\n${ran - failed}/${ran} suites passed` + (skipped ? `, ${skipped} skipped` : ''),
  );
  process.exit(failed === 0 ? 0 : 1);
}

void main();
