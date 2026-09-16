/**
 * Governed RenameItem Pilot Parity & Refusal Test Suite
 * Executes deterministically without browser dependencies.
 */

import { VirtualFileSystem } from '../../services/fileSystemService';
import { createGovernedDirector } from '../adapters/throttlerVfsAdapter';
import { RenameItemInteraction, SHRAPNEL_REVISIONS } from '../shrapnel/types';

export async function runGovernancePilotTests(): Promise<{
  allPassed: boolean;
  logs: string[];
}> {
  const logs: string[] = [];
  const log = (msg: string) => logs.push(msg);

  log('=== Starting Governed RenameItem Pilot Tests ===');

  // Initialize a mock VFS in-memory
  const vfs = new VirtualFileSystem();
  // Ensure we have a sample folder with files
  vfs.createFolder([], 'TestDocs');
  vfs.createFile(['TestDocs'], 'alpha.txt', 'Content alpha');
  vfs.createFile(['TestDocs'], 'beta.txt', 'Content beta');

  const { director, ledger } = createGovernedDirector(vfs);

  // Test 1: Successful RenameItem
  log('[Test 1] Executing valid RenameItem: "alpha.txt" -> "alpha_v2.txt"');
  const interaction1: RenameItemInteraction = {
    interaction_id: 'int-1',
    interaction_type: 'RenameItem',
    interaction_type_revision: SHRAPNEL_REVISIONS.RenameItem,
    actor: { id: 'operator-1', role: 'admin' },
    subject: { id: 'TestDocs/alpha.txt', concept: 'File' },
    context: { pane_id: 1, source_path: ['TestDocs'] },
    payload: { old_name: 'alpha.txt', new_name: 'alpha_v2.txt' },
    correlation_id: 'corr-1',
    timestamp: new Date().toISOString(),
  };

  const result1 = await director.executeRename(interaction1);
  if (result1.status !== 'completed') {
    log(`❌ Test 1 failed: Expected 'completed' status, got '${result1.status}'`);
    return { allPassed: false, logs };
  }
  if (!result1.keychain_checkpoint) {
    log('❌ Test 1 failed: Missing Keychains checkpoint.');
    return { allPassed: false, logs };
  }
  log(`  ✔ Test 1 Passed: Transition completed. Keychain checkpoint: ${result1.keychain_checkpoint.checkpoint_id}`);

  // Test 2: Sibling Collision Refusal (Renaming "alpha_v2.txt" to existing "beta.txt")
  log('[Test 2] Sibling Collision Refusal: Attempting rename to "beta.txt"');
  const interaction2: RenameItemInteraction = {
    interaction_id: 'int-2',
    interaction_type: 'RenameItem',
    interaction_type_revision: SHRAPNEL_REVISIONS.RenameItem,
    actor: { id: 'operator-1', role: 'admin' },
    subject: { id: 'TestDocs/alpha_v2.txt', concept: 'File' },
    context: { pane_id: 1, source_path: ['TestDocs'] },
    payload: { old_name: 'alpha_v2.txt', new_name: 'beta.txt' },
    correlation_id: 'corr-2',
    timestamp: new Date().toISOString(),
  };

  const result2 = await director.executeRename(interaction2);
  if (result2.status !== 'refused') {
    log(`❌ Test 2 failed: Expected 'refused' status, got '${result2.status}'`);
    return { allPassed: false, logs };
  }
  if (result2.execution_receipt) {
    log('❌ Test 2 failed: Vision capability must NOT be invoked when guard fails!');
    return { allPassed: false, logs };
  }
  log(`  ✔ Test 2 Passed: Refused by check guard. Reason: "${result2.refusal_reason}"`);

  // Test 3: Illegal Syntax Characters Refusal (e.g. "invalid/name.txt")
  log('[Test 3] Illegal Syntax Refusal: Attempting rename with illegal slash');
  const interaction3: RenameItemInteraction = {
    interaction_id: 'int-3',
    interaction_type: 'RenameItem',
    interaction_type_revision: SHRAPNEL_REVISIONS.RenameItem,
    actor: { id: 'operator-1', role: 'admin' },
    subject: { id: 'TestDocs/alpha_v2.txt', concept: 'File' },
    context: { pane_id: 1, source_path: ['TestDocs'] },
    payload: { old_name: 'alpha_v2.txt', new_name: 'invalid/name.txt' },
    correlation_id: 'corr-3',
    timestamp: new Date().toISOString(),
  };

  const result3 = await director.executeRename(interaction3);
  if (result3.status !== 'refused') {
    log(`❌ Test 3 failed: Expected 'refused', got '${result3.status}'`);
    return { allPassed: false, logs };
  }
  log(`  ✔ Test 3 Passed: Refused by syntax guard. Reason: "${result3.refusal_reason}"`);

  // Test 4: Target Non-Existent Refusal
  log('[Test 4] Target Non-Existent Refusal: Attempting rename on phantom file');
  const interaction4: RenameItemInteraction = {
    interaction_id: 'int-4',
    interaction_type: 'RenameItem',
    interaction_type_revision: SHRAPNEL_REVISIONS.RenameItem,
    actor: { id: 'operator-1', role: 'admin' },
    subject: { id: 'TestDocs/phantom.txt', concept: 'File' },
    context: { pane_id: 1, source_path: ['TestDocs'] },
    payload: { old_name: 'phantom.txt', new_name: 'real.txt' },
    correlation_id: 'corr-4',
    timestamp: new Date().toISOString(),
  };

  const result4 = await director.executeRename(interaction4);
  if (result4.status !== 'refused') {
    log(`❌ Test 4 failed: Expected 'refused', got '${result4.status}'`);
    return { allPassed: false, logs };
  }
  log(`  ✔ Test 4 Passed: Refused by target_exists guard. Reason: "${result4.refusal_reason}"`);

  log(`=== All 4 Pilot Tests Passed! Evidence records: ${ledger.getRecentEvidence().length}, Checkpoints: ${ledger.getRecentCheckpoints().length} ===`);
  return { allPassed: true, logs };
}
