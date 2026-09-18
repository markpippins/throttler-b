/**
 * Governed RenameItem Pilot Parity & Refusal Test Suite
 * Executes deterministically without browser dependencies.
 */

import { VirtualFileSystem } from '../../services/fileSystemService';
import { FileSystemNode } from '../../types';
import { createGovernedDirector, ThrottlerVfsStorageAdapter } from '../adapters/throttlerVfsAdapter';
import { RenameItemInteraction, SHRAPNEL_REVISIONS } from '../shrapnel/types';
import { isValidSha256Digest } from '@nexus/projection-core';

export async function runGovernancePilotTests(): Promise<{
  allPassed: boolean;
  logs: string[];
}> {
  const logs: string[] = [];
  const log = (msg: string) => logs.push(msg);

  log('=== Starting Governed RenameItem Pilot Tests ===');

  // Initialize a fresh, isolated mock VFS in-memory (persistence disabled to avoid localStorage state pollution)
  const initialTestRoot: FileSystemNode = {
    name: 'Local Session',
    type: 'folder',
    modified: new Date().toISOString(),
    children: [],
    childrenLoaded: true,
  };
  const vfs = new VirtualFileSystem(initialTestRoot, false);
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
    log(`❌ Test 1 failed: Expected 'completed' status, got '${result1.status}' (reason: ${result1.refusal_reason || 'none'})`);
    return { allPassed: false, logs };
  }
  if (!result1.keychain_checkpoint) {
    log('❌ Test 1 failed: Missing Keychains checkpoint.');
    return { allPassed: false, logs };
  }
  if (!result1.evidence || !isValidSha256Digest(result1.evidence.read_set_digest)) {
    log(`❌ Test 1 failed: Evidence read_set_digest does not match sha256 format: ${result1.evidence?.read_set_digest}`);
    return { allPassed: false, logs };
  }
  if (!isValidSha256Digest(result1.keychain_checkpoint.read_set_digest)) {
    log(`❌ Test 1 failed: Keychain checkpoint read_set_digest does not match sha256 format: ${result1.keychain_checkpoint.read_set_digest}`);
    return { allPassed: false, logs };
  }
  log(`  ✔ Test 1 Passed: Transition completed. Keychain checkpoint: ${result1.keychain_checkpoint.checkpoint_id} (digest: ${result1.evidence.read_set_digest.slice(0, 18)}...)`);

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

  // Test 5: VFS Adapter SHA-256 Digest Format Conformance
  log('[Test 5] VFS Adapter SHA-256 Digest Format Conformance');
  const storageAdapter = new ThrottlerVfsStorageAdapter(vfs);
  const readSet = await storageAdapter.getDirectoryReadSet(['TestDocs']);
  if (!isValidSha256Digest(readSet.digest)) {
    log(`❌ Test 5 failed: VFS adapter digest does not conform to sha256 format: ${readSet.digest}`);
    return { allPassed: false, logs };
  }
  if (!readSet.digest.startsWith('sha256:') || readSet.digest.length !== 71) {
    log(`❌ Test 5 failed: Digest length or prefix mismatch (expected 71 chars starting with sha256:), got: ${readSet.digest}`);
    return { allPassed: false, logs };
  }
  log(`  ✔ Test 5 Passed: VFS readSet digest conforms to @nexus/projection-core: ${readSet.digest}`);

  log(`=== All 5 Pilot Tests Passed! Evidence records: ${ledger.getRecentEvidence().length}, Checkpoints: ${ledger.getRecentCheckpoints().length} ===`);
  return { allPassed: true, logs };
}
