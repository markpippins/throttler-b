import React, { useState, useRef, useEffect } from 'react';
import { Terminal as TerminalIcon, X, Maximize2, Minimize2, Trash2 } from 'lucide-react';
import { FileSystemNode } from '../types';

interface ConsoleTerminalProps {
  height: number;
  currentPath: string[];
  rootNode: FileSystemNode;
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

  const handleCommand = (rawCmd: string) => {
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
  date              Display current system timestamp`,
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
