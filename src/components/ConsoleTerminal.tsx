import React, { useState, useRef, useEffect } from 'react';
import { Terminal as TerminalIcon, X, Maximize2, Minimize2, Trash2 } from 'lucide-react';
import { FileSystemNode } from '../types';
import { VirtualFileSystem } from '../services/fileSystemService';
import { apiService } from '../services/apiService';

interface ConsoleTerminalProps {
  height: number;
  currentPath: string[];
  rootNode: FileSystemNode;
  vfsService?: VirtualFileSystem;
  onNavigate: (path: string[]) => void;
  onCreateFolder: (path: string[], name: string) => void;
  onCreateFile: (path: string[], name: string) => void;
  onDelete: (path: string[], name: string) => void;
  onResizeStart: (e: React.MouseEvent) => void;
  onClose: () => void;
}

interface CommandLog {
  id: string;
  type: 'input' | 'output' | 'error' | 'system';
  text: string;
}

export const ConsoleTerminal: React.FC<ConsoleTerminalProps> = ({
  height,
  currentPath,
  rootNode,
  vfsService,
  onNavigate,
  onCreateFolder,
  onCreateFile,
  onDelete,
  onResizeStart,
  onClose,
}) => {
  const [logs, setLogs] = useState<CommandLog[]>([
    { id: '1', type: 'system', text: 'Welcome to Throttler Virtual Console v1.0.0' },
    { id: '2', type: 'system', text: 'Type "help" for available commands (ls, cd, cat, mkdir, touch, rm, clear).' },
  ]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const currentPathString = '/' + currentPath.join('/');

  // Find node by path
  const findNode = (path: string[]): FileSystemNode | null => {
    if (path.length === 0) return rootNode;
    let curr = rootNode;
    for (let i = 1; i < path.length; i++) {
      if (!curr.children) return null;
      const found = curr.children.find((c) => c.name === path[i]);
      if (!found) return null;
      curr = found;
    }
    return curr;
  };

  const handleCommand = async (rawCmd: string) => {
    const trimmed = rawCmd.trim();
    if (!trimmed) return;

    setHistory((prev) => [...prev, trimmed]);
    setHistoryIndex(-1);

    const newLogs: CommandLog[] = [
      ...logs,
      { id: Date.now().toString(), type: 'input', text: `${currentPathString} $ ${trimmed}` },
    ];

    const [cmd, ...args] = trimmed.split(' ');

    switch (cmd.toLowerCase()) {
      case 'help':
        newLogs.push({
          id: (Date.now() + 1).toString(),
          type: 'output',
          text: `Available Commands:
  ls [path]         List directory contents
  cd <dir>          Change directory (.. for parent, / for root)
  pwd               Print current working directory
  cat <file>        View contents of a text/markdown file
  mkdir <name>      Create a new folder
  touch <name>      Create a new file
  rm <name>         Delete a file or folder
  clear             Clear the console
  echo <text>       Display line of text
  whoami            Print current session user
  date              Display current system timestamp
  search <query>    Full-text search across entire VFS via Bloom filter index
  find <query>      Alias for search
  index-stats       Display search index and Bloom filter diagnostics
  diagnostics       Fetch diagnostics from execution-srv (default port 4249)
  witnessed-runs    Query backend-attested projection from execution-srv
  api-mode [live|simulated]  Toggle or view execution-srv API mode`,
        });
        break;

      case 'clear':
        setLogs([]);
        return;

      case 'pwd':
        newLogs.push({
          id: (Date.now() + 1).toString(),
          type: 'output',
          text: currentPathString,
        });
        break;

      case 'whoami':
        newLogs.push({
          id: (Date.now() + 1).toString(),
          type: 'output',
          text: 'developer@throttler-node',
        });
        break;

      case 'date':
        newLogs.push({
          id: (Date.now() + 1).toString(),
          type: 'output',
          text: new Date().toString(),
        });
        break;

      case 'echo':
        newLogs.push({
          id: (Date.now() + 1).toString(),
          type: 'output',
          text: args.join(' '),
        });
        break;

      case 'ls': {
        const targetNode = findNode(currentPath);
        if (!targetNode || !targetNode.children || targetNode.children.length === 0) {
          newLogs.push({
            id: (Date.now() + 1).toString(),
            type: 'output',
            text: '(directory is empty)',
          });
        } else {
          const list = targetNode.children
            .map((c) => (c.type === 'folder' ? `📁 ${c.name}/` : `📄 ${c.name}`))
            .join('    ');
          newLogs.push({
            id: (Date.now() + 1).toString(),
            type: 'output',
            text: list,
          });
        }
        break;
      }

      case 'cd': {
        const target = args[0];
        if (!target || target === '~' || target === '/') {
          onNavigate([rootNode.name]);
        } else if (target === '..') {
          if (currentPath.length > 1) {
            onNavigate(currentPath.slice(0, -1));
          }
        } else {
          const curr = findNode(currentPath);
          const dest = curr?.children?.find((c) => c.name === target && c.type === 'folder');
          if (dest) {
            onNavigate([...currentPath, target]);
          } else {
            newLogs.push({
              id: (Date.now() + 1).toString(),
              type: 'error',
              text: `cd: no such file or directory: ${target}`,
            });
          }
        }
        break;
      }

      case 'cat': {
        const target = args[0];
        if (!target) {
          newLogs.push({ id: (Date.now() + 1).toString(), type: 'error', text: 'cat: missing filename' });
        } else {
          const curr = findNode(currentPath);
          const file = curr?.children?.find((c) => c.name === target);
          if (!file) {
            newLogs.push({ id: (Date.now() + 1).toString(), type: 'error', text: `cat: ${target}: No such file` });
          } else if (file.type === 'folder') {
            newLogs.push({ id: (Date.now() + 1).toString(), type: 'error', text: `cat: ${target}: Is a directory` });
          } else {
            newLogs.push({ id: (Date.now() + 1).toString(), type: 'output', text: file.content || '(empty file)' });
          }
        }
        break;
      }

      case 'mkdir': {
        const name = args[0];
        if (!name) {
          newLogs.push({ id: (Date.now() + 1).toString(), type: 'error', text: 'mkdir: missing directory name' });
        } else {
          onCreateFolder(currentPath, name);
          newLogs.push({ id: (Date.now() + 1).toString(), type: 'output', text: `Created directory: ${name}` });
        }
        break;
      }

      case 'touch': {
        const name = args[0];
        if (!name) {
          newLogs.push({ id: (Date.now() + 1).toString(), type: 'error', text: 'touch: missing file name' });
        } else {
          onCreateFile(currentPath, name);
          newLogs.push({ id: (Date.now() + 1).toString(), type: 'output', text: `Created file: ${name}` });
        }
        break;
      }

      case 'rm': {
        const name = args[0];
        if (!name) {
          newLogs.push({ id: (Date.now() + 1).toString(), type: 'error', text: 'rm: missing target name' });
        } else {
          onDelete(currentPath, name);
          newLogs.push({ id: (Date.now() + 1).toString(), type: 'output', text: `Removed: ${name}` });
        }
        break;
      }

      case 'search':
      case 'find': {
        const query = args.join(' ');
        if (!query) {
          newLogs.push({ id: (Date.now() + 1).toString(), type: 'error', text: 'search: missing search query. Usage: search <query>' });
        } else if (vfsService) {
          const t0 = performance.now();
          const results = vfsService.search(query);
          const elapsed = (performance.now() - t0).toFixed(2);
          if (results.length === 0) {
            newLogs.push({
              id: (Date.now() + 1).toString(),
              type: 'output',
              text: `No matches found for "${query}" across VFS (${elapsed}ms via Bloom filter index)`,
            });
          } else {
            const formatted = results.slice(0, 15).map((r) => {
              const fullPath = r.path ? `/${r.path.join('/')}` : `/${r.name}`;
              const matchInfo = r.matchField ? ` [${r.matchField}]` : '';
              const snippetInfo = r.snippet ? `\n    Snippet: "${r.snippet}"` : '';
              return `  ${r.type === 'folder' ? '📁' : '📄'} ${fullPath}${matchInfo}${snippetInfo}`;
            }).join('\n');
            const moreText = results.length > 15 ? `\n  ... and ${results.length - 15} more matches` : '';
            newLogs.push({
              id: (Date.now() + 1).toString(),
              type: 'output',
              text: `Found ${results.length} match(es) across VFS in ${elapsed}ms:\n${formatted}${moreText}`,
            });
          }
        } else {
          newLogs.push({ id: (Date.now() + 1).toString(), type: 'error', text: 'search: VFS service not available' });
        }
        break;
      }

      case 'index-stats': {
        if (vfsService) {
          const stats = vfsService.getSearchIndexStats();
          newLogs.push({
            id: (Date.now() + 1).toString(),
            type: 'output',
            text: `VFS Full-Text Search Index & Bloom Filter Statistics:
  Total Documents:     ${stats.totalDocuments} (Files: ${stats.totalFiles}, Folders: ${stats.totalFolders})
  Indexed Tokens:      ${stats.totalTokens}
  Bloom Filter Size:   ${stats.bloomFilterBits} bits (${(stats.bloomFilterBits / 8).toFixed(0)} bytes)
  Hash Functions:      ${stats.bloomHashCount} (FNV-1a Kirsch-Mitzenmacher bitwise)
  Re-index Duration:   ${stats.buildTimeMs.toFixed(2)}ms
  Last Updated:        ${new Date(stats.lastUpdated).toLocaleTimeString()}`,
          });
        } else {
          newLogs.push({ id: (Date.now() + 1).toString(), type: 'error', text: 'index-stats: VFS service not available' });
        }
        break;
      }

      case 'api-mode': {
        const mode = args[0]?.toLowerCase();
        if (mode === 'live' || mode === 'on' || mode === 'true') {
          apiService.setLive(true);
          newLogs.push({
            id: (Date.now() + 1).toString(),
            type: 'output',
            text: `Switched execution-srv API to LIVE mode (Base URL: ${apiService.getBaseUrl()})`,
          });
        } else if (mode === 'simulated' || mode === 'mock' || mode === 'off' || mode === 'false') {
          apiService.setLive(false);
          newLogs.push({
            id: (Date.now() + 1).toString(),
            type: 'output',
            text: `Switched execution-srv API to SIMULATED mode`,
          });
        } else {
          newLogs.push({
            id: (Date.now() + 1).toString(),
            type: 'output',
            text: `Execution API Configuration:
  Mode:       ${apiService.isLive() ? 'LIVE (connecting to execution-srv)' : 'SIMULATED (local mock fallback)'}
  Base URL:   ${apiService.getBaseUrl()}
  Default:    Port 4249 (env: VITE_USE_LIVE_API, VITE_EXECUTION_SRV_PORT)
  Usage:      api-mode [live|simulated]`,
          });
        }
        break;
      }

      case 'diagnostics': {
        newLogs.push({
          id: (Date.now() + 1).toString(),
          type: 'output',
          text: `Querying diagnostics from execution-srv (${apiService.isLive() ? 'LIVE' : 'SIMULATED'} @ ${apiService.getBaseUrl()})...`,
        });
        setLogs(newLogs);
        try {
          const diag = await apiService.fetchDiagnostics();
          setLogs((prev) => [
            ...prev,
            {
              id: (Date.now() + 2).toString(),
              type: 'output',
              text: `[execution-srv diagnostics]
  Service:    ${diag.service} (v${diag.version})
  Status:     ${diag.status}
  Mode:       ${diag.live ? 'LIVE API (backend-attested)' : 'SIMULATED (local)'}
  Port:       ${diag.port}
  Base URL:   ${apiService.getBaseUrl()}
  Timestamp:  ${diag.timestamp}
  Subsystems:
    • SOL/SOLScript: ${diag.subsystems.solscript?.status ?? 'unknown'}
    • Aegis:         ${diag.subsystems.aegis?.status ?? 'unknown'}
    • Projections:   ${diag.subsystems.projections?.status ?? 'unknown'}
    • Vision:        ${diag.subsystems.vision?.status ?? 'unknown'}`,
            },
          ]);
        } catch (err) {
          setLogs((prev) => [
            ...prev,
            {
              id: (Date.now() + 2).toString(),
              type: 'error',
              text: `diagnostics error: ${err instanceof Error ? err.message : String(err)}`,
            },
          ]);
        }
        return;
      }

      case 'witnessed-runs': {
        const wfId = args[0] || 'wf-live-demo-1';
        const nodeId = args[1] || 'node:rename-item-alpha';
        newLogs.push({
          id: (Date.now() + 1).toString(),
          type: 'output',
          text: `Querying witnessed-run projection (wf=${wfId}, node=${nodeId}) from execution-srv (${apiService.isLive() ? 'LIVE' : 'SIMULATED'})...`,
        });
        setLogs(newLogs);
        try {
          const proj = await apiService.fetchWitnessedRun({ workflowInstanceId: wfId, nodeId });
          setLogs((prev) => [
            ...prev,
            {
              id: (Date.now() + 2).toString(),
              type: 'output',
              text: `[witnessed-run projection]
  Workflow:    instanceId=${proj.workflow.instanceId}, nodeId=${proj.workflow.nodeId}
  Status:      ${proj.status}
  Envelope:    id=${proj.envelope.id ?? 'none'}, fp=${proj.envelope.evaluationFingerprint ?? 'none'}
  Contract:    ${proj.envelope.contractId ?? 'none'} (v${proj.envelope.contractVersion ?? '?'})
  Law:         props=[${proj.law.propositionIds.join(', ')}], doctrines=[${proj.law.doctrineIds.join(', ')}]
  Assessment:  disposition=${proj.assessment.disposition ?? 'none'}, status=${proj.assessment.status ?? 'none'}
  Receipts:    peb=${proj.receipts.pebAdmission ?? 'none'}, conduit=${proj.receipts.conduitTransition ?? 'none'}
  Evidence:    count=${proj.evidence.ids.length}, fp=${proj.evidence.fingerprint ?? 'none'}`,
            },
          ]);
        } catch (err) {
          setLogs((prev) => [
            ...prev,
            {
              id: (Date.now() + 2).toString(),
              type: 'error',
              text: `witnessed-runs error: ${err instanceof Error ? err.message : String(err)}`,
            },
          ]);
        }
        return;
      }

      default:
        newLogs.push({
          id: (Date.now() + 1).toString(),
          type: 'error',
          text: `Command not found: ${cmd}. Type "help" for a list of available commands.`,
        });
        break;
    }

    setLogs(newLogs);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleCommand(input);
      setInput('');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0) {
        const nextIdx = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(nextIdx);
        setInput(history[nextIdx]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex !== -1) {
        const nextIdx = historyIndex + 1;
        if (nextIdx < history.length) {
          setHistoryIndex(nextIdx);
          setInput(history[nextIdx]);
        } else {
          setHistoryIndex(-1);
          setInput('');
        }
      }
    }
  };

  return (
    <div
      style={{ height: `${height}px` }}
      className="relative flex flex-col bg-zinc-950 text-zinc-100 font-mono text-xs select-none flex-shrink-0 z-20 border-t border-zinc-800 shadow-2xl"
    >
      {/* Top Drag Resize Handle */}
      <div
        onMouseDown={onResizeStart}
        className="absolute top-0 left-0 w-full h-1.5 cursor-row-resize hover:bg-blue-500 transition-colors z-30"
      />

      {/* Terminal Titlebar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900 border-b border-zinc-800 text-[11px]">
        <div className="flex items-center gap-2 text-zinc-300">
          <TerminalIcon className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-semibold">Throttler Command Console</span>
          <span className="text-zinc-500 text-[10px]">({currentPathString})</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setLogs([])}
            title="Clear Console"
            className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
          >
            <Trash2 className="w-3 h-3" />
          </button>
          <button
            onClick={onClose}
            title="Close Console"
            className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Terminal Output Logs */}
      <div
        onClick={() => inputRef.current?.focus()}
        className="flex-1 overflow-y-auto p-3 flex flex-col gap-1 cursor-text select-text leading-relaxed"
      >
        {logs.map((log) => (
          <div
            key={log.id}
            className={`whitespace-pre-wrap break-words ${
              log.type === 'input'
                ? 'text-emerald-400 font-bold'
                : log.type === 'error'
                ? 'text-rose-400'
                : log.type === 'system'
                ? 'text-blue-400 italic'
                : 'text-zinc-300'
            }`}
          >
            {log.text}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Prompt Input Line */}
      <div className="flex items-center gap-2 px-3 py-2 bg-zinc-900/60 border-t border-zinc-800/80">
        <span className="text-emerald-400 font-bold select-none">$</span>
        <input
          ref={inputRef}
          type="text"
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter command..."
          className="flex-1 bg-transparent text-zinc-100 outline-none text-xs"
        />
      </div>
    </div>
  );
};
