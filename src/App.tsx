import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { HeaderAddressBar } from './components/HeaderAddressBar';
import { Toolbar } from './components/Toolbar';
import { Sidebar } from './components/Sidebar';
import { FileExplorerPane } from './components/FileExplorerPane';
import { DetailPane } from './components/DetailPane';
import { IdeaStream } from './components/IdeaStream';
import { ConsoleTerminal } from './components/ConsoleTerminal';
import { FooterStatusBar } from './components/FooterStatusBar';
import { FloatingAIChat } from './components/FloatingAIChat';
import { Toasts } from './components/Toasts';
import { Sparkles, MoveRight, Copy, ExternalLink, X, RotateCcw, Columns, Info } from 'lucide-react';

import { ServerProfilesDialog } from './components/dialogs/ServerProfilesDialog';
import { LoginDialog } from './components/dialogs/LoginDialog';
import { LocalConfigDialog } from './components/dialogs/LocalConfigDialog';
import { RssFeedsDialog } from './components/dialogs/RssFeedsDialog';
import { PreferencesDialog } from './components/dialogs/PreferencesDialog';
import { ImportDialog, ExportDialog } from './components/dialogs/ImportExportDialogs';
import { TextEditorDialog } from './components/dialogs/TextEditorDialog';
import { WebviewDialog } from './components/dialogs/WebviewDialog';
import { PropertiesDialog } from './components/dialogs/PropertiesDialog';
import { ConfirmBatchOperationDialog } from './components/dialogs/ConfirmBatchOperationDialog';
import { GlobalSearchDialog } from './components/dialogs/GlobalSearchDialog';

import { VirtualFileSystem, setVfsService } from './services/fileSystemService';
import { StorageService } from './services/storageService';
import { SoundService } from './services/soundService';
import {
  FileSystemNode,
  DisplayMode,
  SortCriteria,
  SortKey,
  ToastMessage,
  ServerProfile,
  RssFeed,
  Bookmark,
  NewBookmark,
  FileOperationProgress,
} from './types';
import { matchesFilter } from './utils/tagUtils';
import { createGovernedDirector } from './governance/adapters/throttlerVfsAdapter';
import { RenameItemInteraction, SHRAPNEL_REVISIONS } from './governance/shrapnel/types';
import { runGovernancePilotTests } from './governance/tests/runPilotTests';

const BOOKMARKS_STORAGE_KEY = 'file-explorer-bookmarks';

export const App: React.FC = () => {
  // --- VFS & Storage ---
  const vfsRef = useRef<VirtualFileSystem>(new VirtualFileSystem());
  const [rootNode, setRootNode] = useState<FileSystemNode>(vfsRef.current.getRoot());

  // Governed Director instance wired to the current VFS
  const governanceRef = useRef(createGovernedDirector(vfsRef.current));

  // Run pilot parity & refusal tests once on bootstrap
  useEffect(() => {
    runGovernancePilotTests().then(res => {
      if (res.allPassed) {
        console.log('🛡️ [SOL / §10 / Aegis / Shrapnel] Governed Pilot Tests:\n' + res.logs.join('\n'));
      } else {
        console.error('❌ [SOL / §10 / Aegis / Shrapnel] Pilot Tests Failed:\n' + res.logs.join('\n'));
      }
    });
  }, []);

  // Keep singleton reference synced for helper access
  useEffect(() => {
    setVfsService(vfsRef.current);
    governanceRef.current = createGovernedDirector(vfsRef.current);
  }, [rootNode]);

  // --- Panes & Navigation State ---
  const [activePane, setActivePane] = useState<1 | 2>(1);
  const [isDualPane, setIsDualPane] = useState<boolean>(false);

  // Navigation History
  const [pane1Path, setPane1Path] = useState<string[]>(['Local Session']);
  const [pane1History, setPane1History] = useState<string[][]>([['Local Session']]);
  const [pane1HistoryIndex, setPane1HistoryIndex] = useState<number>(0);

  const [pane2Path, setPane2Path] = useState<string[]>(['Local Session', 'Documents']);
  const [pane2History, setPane2History] = useState<string[][]>([['Local Session', 'Documents']]);
  const [pane2HistoryIndex, setPane2HistoryIndex] = useState<number>(0);

  // Selections
  const [pane1Selected, setPane1Selected] = useState<Set<string>>(new Set());
  const [pane2Selected, setPane2Selected] = useState<Set<string>>(new Set());

  // Clipboard (Cut/Copy)
  const [clipboard, setClipboard] = useState<{
    operation: 'copy' | 'cut';
    sourcePath: string[];
    itemNames: string[];
  } | null>(null);

  // Filter & Display Modes
  const [filterQuery, setFilterQuery] = useState<string>('');
  const [searchScope, setSearchScope] = useState<'folder' | 'vfs'>('folder');
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState<boolean>(false);
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('grid');
  const [sortCriteria, setSortCriteria] = useState<SortCriteria>({ key: 'name', direction: 'asc' });
  const [groupByType, setGroupByType] = useState<boolean>(() =>
    StorageService.getLocalItem<boolean>('groupByType', false)
  );

  // --- Panels Visibility & Dimensions ---
  const [showSidebar, setShowSidebar] = useState<boolean>(true);
  const [sidebarWidth, setSidebarWidth] = useState<number>(260);

  const [showDetailPane, setShowDetailPane] = useState<boolean>(true);
  const [detailPaneWidth, setDetailPaneWidth] = useState<number>(280);

  const [showIdeaStream, setShowIdeaStream] = useState<boolean>(true);
  const [ideaStreamHeight, setIdeaStreamHeight] = useState<number>(210);

  const [showTerminal, setShowTerminal] = useState<boolean>(false);
  const [terminalHeight, setTerminalHeight] = useState<number>(220);

  // --- Floating AI Chat State (Gmail style floating/minimized/expandable) ---
  const [showAIChat, setShowAIChat] = useState<boolean>(() =>
    StorageService.getLocalItem<boolean>('show_floating_ai_chat', true)
  );
  const [isAIChatMinimized, setIsAIChatMinimized] = useState<boolean>(false);
  const [isAIChatExpanded, setIsAIChatExpanded] = useState<boolean>(false);

  // --- Modals & Dialogs State ---
  const [dialogServerProfiles, setDialogServerProfiles] = useState<boolean>(false);
  const [dialogLoginProfile, setDialogLoginProfile] = useState<ServerProfile | null>(null);
  const [dialogLocalConfig, setDialogLocalConfig] = useState<boolean>(false);
  const [dialogRssFeeds, setDialogRssFeeds] = useState<boolean>(false);
  const [dialogPreferences, setDialogPreferences] = useState<boolean>(false);
  const [dialogImport, setDialogImport] = useState<boolean>(false);
  const [dialogExport, setDialogExport] = useState<boolean>(false);

  // Large Batch Operations Safety Preferences
  const [confirmLargeBatchOperations, setConfirmLargeBatchOperations] = useState<boolean>(() =>
    StorageService.getLocalItem<boolean>('confirm_large_batch_operations', true)
  );
  const [largeBatchThreshold, setLargeBatchThreshold] = useState<number>(() =>
    StorageService.getLocalItem<number>('large_batch_threshold', 10)
  );
  const [pendingBatchOperation, setPendingBatchOperation] = useState<{
    operation: 'move' | 'copy';
    sourceNames: string[];
    sourcePath: string[];
    destPath: string[];
    targetIndex?: number;
    isPaste?: boolean;
    isFromDrop?: boolean;
  } | null>(null);

  const [editorData, setEditorData] = useState<{
    isOpen: boolean;
    title: string;
    content: string;
    path: string[];
  }>({ isOpen: false, title: '', content: '', path: [] });

  const [webviewData, setWebviewData] = useState<{
    isOpen: boolean;
    url: string;
    title: string;
  }>({ isOpen: false, url: '', title: '' });

  const [propertiesData, setPropertiesData] = useState<{
    isOpen: boolean;
    item: FileSystemNode | null;
    path: string[];
  }>({ isOpen: false, item: null, path: [] });

  const [dropMenuData, setDropMenuData] = useState<{
    x: number;
    y: number;
    sourceNames: string[];
    destPath: string[];
    sourcePath: string[];
    targetIndex?: number;
  } | null>(null);

  const [lastDropAction, setLastDropAction] = useState<{
    id: string;
    operation: 'move' | 'copy';
    sourceNames: string[];
    sourcePath: string[];
    destPath: string[];
    targetIndex?: number;
    isSameDrive: boolean;
    timestamp: number;
  } | null>(null);
  const lastDropTimerRef = useRef<NodeJS.Timeout | null>(null);

  // --- Preferences & Database Collections ---
  const [theme, setTheme] = useState<string>('theme-system');
  const [serverProfiles, setServerProfiles] = useState<ServerProfile[]>([
    {
      id: 'cluster-demo-1',
      name: 'Cloud Node US-East',
      brokerUrl: 'https://broker-east.throttler.internal',
      imageUrl: 'https://picsum.photos/seed',
      autoConnect: false,
    },
  ]);
  const [rssFeeds, setRssFeeds] = useState<RssFeed[]>([
    { id: 'feed-hn', name: 'Hacker News Tech', url: 'news.ycombinator.com' },
    { id: 'feed-ar', name: 'Ars Technica Science', url: 'arstechnica.com' },
    { id: 'feed-github', name: 'GitHub Trending', url: 'github.com/trending' },
  ]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [starredPaths, setStarredPaths] = useState<string[][]>(() =>
    StorageService.getLocalItem<string[][]>('starred_paths', [
      ['Local Session', 'Documents'],
      ['Local Session', 'Images'],
      ['Local Session', 'Downloads'],
    ])
  );
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [fileOperationProgress, setFileOperationProgress] = useState<FileOperationProgress | null>(null);
  const cancelOperationRef = useRef<string | null>(null);

  // Helpers
  const addToast = useCallback((type: 'success' | 'error' | 'info' | 'warning', text: string) => {
    const id = Date.now().toString() + Math.random().toString().slice(2, 6);
    setToasts((prev) => [...prev, { id, type, text }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const triggerVfsUpdate = useCallback(() => {
    const nextRoot = vfsRef.current.getRoot();
    setRootNode({ ...nextRoot });
  }, []);

  const handleToggleAIChat = useCallback(() => {
    setShowAIChat((prev) => {
      const next = !prev;
      StorageService.setLocalItem('show_floating_ai_chat', next);
      if (next) setIsAIChatMinimized(false);
      return next;
    });
  }, []);

  const handleOpenAIChat = useCallback(() => {
    setShowAIChat(true);
    setIsAIChatMinimized(false);
    StorageService.setLocalItem('show_floating_ai_chat', true);
  }, []);

  const handleToggleGroupByType = useCallback(() => {
    setGroupByType((prev) => {
      const next = !prev;
      StorageService.setLocalItem('groupByType', next);
      addToast('info', next ? 'Group by type enabled (Folders, Documents, Images, Other)' : 'Group by type disabled');
      return next;
    });
  }, [addToast]);

  // --- Initial Load ---
  useEffect(() => {
    async function loadData() {
      try {
        const savedTheme = StorageService.getLocalItem('theme', 'theme-system');
        if (savedTheme) {
          setTheme(savedTheme);
          document.body.className = `font-sans ${savedTheme}`;
        }
        const savedViewMode = StorageService.getLocalItem('displayMode', 'grid');
        if (savedViewMode) setDisplayMode(savedViewMode as DisplayMode);

        const savedGroupByType = StorageService.getLocalItem<boolean>('groupByType', false);
        if (savedGroupByType !== undefined) setGroupByType(savedGroupByType);

        const savedBookmarks = StorageService.getLocalItem<Bookmark[]>(BOOKMARKS_STORAGE_KEY, []);
        setBookmarks(savedBookmarks);

        const savedFeeds = await StorageService.getAllFeeds();
        if (savedFeeds.length > 0) setRssFeeds(savedFeeds);

        const savedProfiles = await StorageService.getAllProfiles();
        if (savedProfiles.length > 0) setServerProfiles(savedProfiles);

        addToast('info', 'Workspace initialized');
      } catch (err) {
        console.error('Initialization error', err);
      }
    }
    loadData();
  }, [addToast]);

  // Sync theme to body class
  useEffect(() => {
    document.body.className = `font-sans ${theme}`;
  }, [theme]);

  // Active path and items for current active pane
  const currentActivePath = activePane === 1 ? pane1Path : pane2Path;
  const currentActiveSelected = activePane === 1 ? pane1Selected : pane2Selected;

  const getItemsForPath = useCallback(
    (path: string[]) => {
      const node = vfsRef.current.getNode(path);
      return node && node.children ? [...node.children] : [];
    },
    [rootNode]
  );

  const pane1Items = useMemo(() => getItemsForPath(pane1Path), [getItemsForPath, pane1Path, rootNode]);
  const pane2Items = useMemo(() => getItemsForPath(pane2Path), [getItemsForPath, pane2Path, rootNode]);

  // VFS Search Index results when searchScope is 'vfs'
  const vfsSearchResults = useMemo(() => {
    if (searchScope === 'vfs' && filterQuery.trim()) {
      return vfsRef.current.search(filterQuery.trim());
    }
    return null;
  }, [searchScope, filterQuery, rootNode]);

  const displayedPane1Items = useMemo(() => {
    if (activePane === 1 && vfsSearchResults) {
      return vfsSearchResults;
    }
    return pane1Items;
  }, [activePane, vfsSearchResults, pane1Items]);

  const displayedPane2Items = useMemo(() => {
    if (activePane === 2 && vfsSearchResults) {
      return vfsSearchResults;
    }
    return pane2Items;
  }, [activePane, vfsSearchResults, pane2Items]);

  const trashCount = useMemo(() => {
    return vfsRef.current.getTrashCount();
  }, [rootNode]);

  const isCurrentActiveInTrash = useMemo(() => {
    return vfsRef.current.isTrashPath(currentActivePath);
  }, [currentActivePath, rootNode]);

  // --- Navigation Handlers ---
  const handleNavigatePane = (paneNumber: 1 | 2, newPath: string[]) => {
    if (paneNumber === 1) {
      const nextHist = pane1History.slice(0, pane1HistoryIndex + 1);
      nextHist.push(newPath);
      setPane1History(nextHist);
      setPane1HistoryIndex(nextHist.length - 1);
      setPane1Path(newPath);
      setPane1Selected(new Set());
    } else {
      const nextHist = pane2History.slice(0, pane2HistoryIndex + 1);
      nextHist.push(newPath);
      setPane2History(nextHist);
      setPane2HistoryIndex(nextHist.length - 1);
      setPane2Path(newPath);
      setPane2Selected(new Set());
    }
  };

  const handleUp = () => {
    const cur = activePane === 1 ? pane1Path : pane2Path;
    if (cur.length > 1) {
      handleNavigatePane(activePane, cur.slice(0, -1));
    }
  };

  const canGoBack = activePane === 1 ? pane1HistoryIndex > 0 : pane2HistoryIndex > 0;
  const canGoForward =
    activePane === 1
      ? pane1HistoryIndex < pane1History.length - 1
      : pane2HistoryIndex < pane2History.length - 1;

  const handleGoBack = () => {
    if (activePane === 1) {
      if (pane1HistoryIndex > 0) {
        const nextIdx = pane1HistoryIndex - 1;
        setPane1HistoryIndex(nextIdx);
        setPane1Path(pane1History[nextIdx]);
        setPane1Selected(new Set());
      }
    } else {
      if (pane2HistoryIndex > 0) {
        const nextIdx = pane2HistoryIndex - 1;
        setPane2HistoryIndex(nextIdx);
        setPane2Path(pane2History[nextIdx]);
        setPane2Selected(new Set());
      }
    }
  };

  const handleGoForward = () => {
    if (activePane === 1) {
      if (pane1HistoryIndex < pane1History.length - 1) {
        const nextIdx = pane1HistoryIndex + 1;
        setPane1HistoryIndex(nextIdx);
        setPane1Path(pane1History[nextIdx]);
        setPane1Selected(new Set());
      }
    } else {
      if (pane2HistoryIndex < pane2History.length - 1) {
        const nextIdx = pane2HistoryIndex + 1;
        setPane2HistoryIndex(nextIdx);
        setPane2Path(pane2History[nextIdx]);
        setPane2Selected(new Set());
      }
    }
  };

  const handleOpenInNewPane = (targetPath: string[]) => {
    setIsDualPane(true);
    // If active pane is 1, open in pane 2 and focus pane 2; otherwise open in pane 1 and focus pane 1
    const targetPane: 1 | 2 = activePane === 1 ? 2 : 1;
    handleNavigatePane(targetPane, targetPath);
    setActivePane(targetPane);
    addToast('success', `Opened /${targetPath.join('/')} in Pane ${targetPane} (Dual-Pane)`);
  };

  const getSubfoldersForPath = useCallback((path: string[]) => {
    const node = vfsRef.current.getNode(path);
    if (!node || !node.children) return [];
    return node.children
      .filter((c) => c.type === 'folder')
      .map((c) => ({ name: c.name, type: c.type }));
  }, []);

  const handleDropOnBreadcrumb = (destPath: string[], itemNames: string[], e?: React.DragEvent) => {
    handleSmartDrop(
      itemNames,
      destPath,
      currentActivePath,
      undefined,
      e
        ? {
            ctrlKey: e.ctrlKey,
            metaKey: e.metaKey,
            altKey: e.altKey,
            button: e.button,
            clientX: e.clientX,
            clientY: e.clientY,
          }
        : undefined
    );
  };

  // --- CRUD Operations ---
  const handleCreateFolder = (path: string[], name: string) => {
    const success = vfsRef.current.createFolder(path, name);
    if (success) {
      triggerVfsUpdate();
      addToast('success', `Created folder "${name}"`);
    } else {
      addToast('error', `Folder "${name}" already exists`);
    }
  };

  const handleCreateFile = (path: string[], name: string, content: string = '') => {
    const success = vfsRef.current.createFile(path, name, content);
    if (success) {
      triggerVfsUpdate();
      addToast('success', `Created file "${name}"`);
    } else {
      addToast('error', `File "${name}" already exists`);
    }
  };

  const handleRename = async (path: string[], oldName: string, newName: string) => {
    const correlationId = `corr:${Date.now()}`;
    const interaction: RenameItemInteraction = {
      interaction_id: `int:${Date.now()}`,
      interaction_type: 'RenameItem',
      interaction_type_revision: SHRAPNEL_REVISIONS.RenameItem,
      actor: { id: 'operator', role: 'admin' },
      subject: { id: `${path.join('/')}/${oldName}`, concept: 'File' },
      context: { pane_id: activePane, source_path: path },
      payload: { old_name: oldName, new_name: newName },
      correlation_id: correlationId,
      timestamp: new Date().toISOString(),
    };

    const result = await governanceRef.current.director.executeRename(interaction);

    if (result.status === 'completed') {
      triggerVfsUpdate();
      const kcShort = result.keychain_checkpoint ? ` [KC: ${result.keychain_checkpoint.checkpoint_id.slice(-6)}]` : '';
      addToast('success', `Renamed "${oldName}" to "${newName}"${kcShort}`);
      console.log('🛡️ [Aegis/SOL] Rename completed:', result);
    } else if (result.status === 'refused') {
      addToast('error', `Refused: ${result.refusal_reason}`);
      console.warn('🛡️ [Aegis/SOL] Rename refused by check guard:', result);
    } else {
      addToast('error', `Failed: ${result.refusal_reason || 'Capability execution error'}`);
      console.error('🛡️ [Aegis/SOL] Rename failed:', result);
    }
  };

  const handleDelete = (path: string[], names: string[], permanent: boolean = false) => {
    const isInsideTrash = vfsRef.current.isTrashPath(path) || permanent;
    let count = 0;
    for (const name of names) {
      if (vfsRef.current.deleteItem(path, name, permanent)) {
        count++;
      }
    }
    if (count > 0) {
      triggerVfsUpdate();
      if (activePane === 1) setPane1Selected(new Set());
      else setPane2Selected(new Set());
      SoundService.playFileDelete();
      if (isInsideTrash) {
        addToast('info', `Permanently deleted ${count} item(s)`);
      } else {
        addToast('info', `Moved ${count} item(s) to Trash`);
      }
    }
  };

  const handleEmptyTrash = useCallback(() => {
    const count = vfsRef.current.getTrashCount();
    if (count === 0) {
      addToast('info', 'Trash is already empty');
      return;
    }
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete all ${count} item(s) in the Trash? This action cannot be undone.`
    );
    if (!confirmed) return;

    const deleted = vfsRef.current.emptyTrash();
    triggerVfsUpdate();
    SoundService.playFileDelete();
    if (activePane === 1) setPane1Selected(new Set());
    else setPane2Selected(new Set());
    addToast('info', `Emptied trash (${deleted} item(s) permanently removed)`);
  }, [activePane]);

  const handleRestoreFromTrash = useCallback((names?: string[]) => {
    const trash = vfsRef.current.getTrashNode();
    const itemsToRestore =
      names && names.length > 0
        ? names
        : (trash.children || []).map((c) => c.name);

    if (itemsToRestore.length === 0) {
      addToast('info', 'No items in Trash to restore');
      return;
    }

    let restoredCount = 0;
    let lastRestoredPath: string[] | null = null;
    for (const name of itemsToRestore) {
      const res = vfsRef.current.restoreFromTrash(name);
      if (res.success) {
        restoredCount++;
        if (res.restoredPath) lastRestoredPath = res.restoredPath;
      }
    }

    if (restoredCount > 0) {
      triggerVfsUpdate();
      SoundService.playFileSelect();
      if (activePane === 1) setPane1Selected(new Set());
      else setPane2Selected(new Set());
      addToast(
        'success',
        `Restored ${restoredCount} item(s) back to original location${
          lastRestoredPath ? ` (/${lastRestoredPath.join('/')})` : ''
        }`
      );
    } else {
      addToast('error', 'Could not restore selected items');
    }
  }, [activePane]);

  const handleOpenTrash = useCallback(() => {
    const trashPath = [rootNode.name, 'Trash'];
    handleNavigatePane(activePane, trashPath);
  }, [activePane, rootNode.name]);

  const handleCut = () => {
    const selected = Array.from(currentActiveSelected);
    if (selected.length === 0) return;
    setClipboard({
      operation: 'cut',
      sourcePath: currentActivePath,
      itemNames: selected,
    });
    addToast('info', `Cut ${selected.length} item(s) to clipboard`);
  };

  const handleCopy = () => {
    const selected = Array.from(currentActiveSelected);
    if (selected.length === 0) return;
    setClipboard({
      operation: 'copy',
      sourcePath: currentActivePath,
      itemNames: selected,
    });
    addToast('info', `Copied ${selected.length} item(s) to clipboard`);
  };

  const handleBatchTag = useCallback(
    (
      path: string[],
      itemNames: string[],
      tag: string,
      action: 'add' | 'remove' | 'toggle' | 'clear' = 'toggle'
    ) => {
      if (itemNames.length === 0) return;
      const res = vfsRef.current.batchTagItems(path, itemNames, action, tag);
      if (res.success && res.modifiedCount > 0) {
        triggerVfsUpdate();
        if (res.actionDone === 'cleared') {
          addToast('info', `Cleared labels from ${res.modifiedCount} item(s)`);
        } else if (res.actionDone === 'removed') {
          addToast('info', `Removed "${tag}" label from ${res.modifiedCount} item(s)`);
        } else {
          addToast('success', `Applied "${tag}" label to ${res.modifiedCount} item(s)`);
        }
      }
    },
    [triggerVfsUpdate, addToast]
  );

  const handleCancelProgress = useCallback(() => {
    if (fileOperationProgress) {
      cancelOperationRef.current = fileOperationProgress.id;
      setFileOperationProgress((prev) =>
        prev ? { ...prev, status: 'cancelled' } : null
      );
    }
  }, [fileOperationProgress]);

  const handleDismissProgress = useCallback(() => {
    setFileOperationProgress(null);
  }, []);

  const executePaste = async (
    items: string[],
    sourcePath: string[],
    targetPath: string[],
    isCut: boolean
  ) => {
    const operationId = Date.now().toString();
    const total = items.length;

    setFileOperationProgress({
      id: operationId,
      operation: isCut ? 'move' : 'copy',
      sourcePath,
      destPath: targetPath,
      totalItems: total,
      completedItems: 0,
      currentItemName: items[0] || '',
      percentage: 0,
      status: 'running',
      speedText: `${(Math.random() * 3.5 + 4.8).toFixed(1)} MB/s`,
    });

    let processedCount = 0;
    const stepDelay = total > 1 ? Math.max(50, Math.min(200, 700 / total)) : 100;

    for (let i = 0; i < total; i++) {
      if (cancelOperationRef.current === operationId) {
        setFileOperationProgress((prev) =>
          prev && prev.id === operationId ? { ...prev, status: 'cancelled' } : prev
        );
        triggerVfsUpdate();
        addToast('warning', `Operation cancelled (${processedCount}/${total} processed)`);
        setTimeout(() => {
          setFileOperationProgress((prev) => (prev?.id === operationId ? null : prev));
        }, 3000);
        return;
      }

      const name = items[i];
      setFileOperationProgress((prev) =>
        prev && prev.id === operationId
          ? {
              ...prev,
              completedItems: i,
              currentItemName: name,
              percentage: Math.round((i / total) * 100),
            }
          : prev
      );

      await new Promise((resolve) => setTimeout(resolve, stepDelay));

      if (isCut) {
        const moved = vfsRef.current.moveItem(sourcePath, name, targetPath);
        if (moved) processedCount++;
      } else {
        const copied = vfsRef.current.copyItem(sourcePath, name, targetPath);
        if (copied) processedCount++;
      }

      setFileOperationProgress((prev) =>
        prev && prev.id === operationId
          ? {
              ...prev,
              completedItems: i + 1,
              percentage: Math.round(((i + 1) / total) * 100),
            }
          : prev
      );
    }

    if (isCut) {
      setClipboard(null);
    }

    triggerVfsUpdate();
    setFileOperationProgress((prev) =>
      prev && prev.id === operationId
        ? {
            ...prev,
            completedItems: total,
            percentage: 100,
            status: 'completed',
          }
        : prev
    );

    addToast('success', `${isCut ? 'Moved' : 'Copied'} ${processedCount} item(s) to /${targetPath.join('/')}`);

    setTimeout(() => {
      setFileOperationProgress((prev) => (prev?.id === operationId ? null : prev));
    }, 3500);
  };

  const handlePaste = async () => {
    if (!clipboard || clipboard.itemNames.length === 0) {
      addToast('warning', 'Clipboard is empty');
      return;
    }

    const isCut = clipboard.operation === 'cut';
    const total = clipboard.itemNames.length;
    const items = [...clipboard.itemNames];
    const sourcePath = [...clipboard.sourcePath];
    const targetPath = [...currentActivePath];

    if (sourcePath.join('/') === targetPath.join('/') && isCut) {
      addToast('info', 'Source and destination folders are the same');
      return;
    }

    // Check for large batch confirmation (over threshold items)
    if (confirmLargeBatchOperations && total > largeBatchThreshold) {
      setPendingBatchOperation({
        operation: isCut ? 'move' : 'copy',
        sourceNames: items,
        sourcePath,
        destPath: targetPath,
        isPaste: true,
      });
      return;
    }

    await executePaste(items, sourcePath, targetPath, isCut);
  };

  const executeMoveItems = async (
    sourceNames: string[],
    destPath: string[],
    fromPath: string[],
    targetIndex?: number,
    isFromDrop: boolean = false
  ) => {
    const operationId = Date.now().toString();
    const total = sourceNames.length;
    const items = [...sourceNames];

    setFileOperationProgress({
      id: operationId,
      operation: 'move',
      sourcePath: fromPath,
      destPath,
      totalItems: total,
      completedItems: 0,
      currentItemName: items[0] || '',
      percentage: 0,
      status: 'running',
      speedText: `${(Math.random() * 4 + 4.2).toFixed(1)} MB/s`,
    });

    let count = 0;
    const stepDelay = total > 1 ? Math.max(40, Math.min(180, 600 / total)) : 80;

    for (let i = 0; i < total; i++) {
      if (cancelOperationRef.current === operationId) {
        setFileOperationProgress((prev) =>
          prev && prev.id === operationId ? { ...prev, status: 'cancelled' } : prev
        );
        triggerVfsUpdate();
        addToast('warning', `Move cancelled (${count}/${total} moved)`);
        setTimeout(() => {
          setFileOperationProgress((prev) => (prev?.id === operationId ? null : prev));
        }, 3000);
        return;
      }

      const name = items[i];
      setFileOperationProgress((prev) =>
        prev && prev.id === operationId
          ? {
              ...prev,
              completedItems: i,
              currentItemName: name,
              percentage: Math.round((i / total) * 100),
            }
          : prev
      );

      await new Promise((resolve) => setTimeout(resolve, stepDelay));

      const insertIdx = targetIndex !== undefined ? targetIndex + i : undefined;
      if (vfsRef.current.moveItem(fromPath, name, destPath, insertIdx)) {
        count++;
      }

      setFileOperationProgress((prev) =>
        prev && prev.id === operationId
          ? {
              ...prev,
              completedItems: i + 1,
              percentage: Math.round(((i + 1) / total) * 100),
            }
          : prev
      );
    }

    triggerVfsUpdate();
    SoundService.playFileMove();
    setFileOperationProgress((prev) =>
      prev && prev.id === operationId
        ? {
            ...prev,
            completedItems: total,
            percentage: 100,
            status: 'completed',
          }
        : prev
    );

    if (count > 0) {
      addToast('success', `Moved ${count} item(s) to /${destPath.join('/')}`);

      if (isFromDrop) {
        const actionData = {
          id: Date.now().toString(),
          operation: 'move' as const,
          sourceNames: items,
          sourcePath: fromPath,
          destPath,
          targetIndex,
          isSameDrive: true,
          timestamp: Date.now(),
        };
        setLastDropAction(actionData);

        if (lastDropTimerRef.current) clearTimeout(lastDropTimerRef.current);
        lastDropTimerRef.current = setTimeout(() => {
          setLastDropAction((prev) => (prev?.id === actionData.id ? null : prev));
        }, 7000);
      }
    }

    setTimeout(() => {
      setFileOperationProgress((prev) => (prev?.id === operationId ? null : prev));
    }, 3500);
  };

  const handleMoveItems = async (
    sourceNames: string[],
    destPath: string[],
    sourcePath?: string[],
    targetIndex?: number,
    isFromDrop: boolean = false
  ) => {
    const fromPath = sourcePath || currentActivePath;
    if (sourceNames.length === 0) return;

    // Check same folder reordering
    if (fromPath.join('/') === destPath.join('/')) {
      if (targetIndex !== undefined) {
        const reordered = vfsRef.current.reorderItems(fromPath, sourceNames, targetIndex);
        if (reordered) {
          triggerVfsUpdate();
          SoundService.playFileMove();
          addToast('info', `Reordered ${sourceNames.length} item(s)`);
        }
      }
      return;
    }

    // Check large batch threshold confirmation (over threshold items)
    if (confirmLargeBatchOperations && sourceNames.length > largeBatchThreshold) {
      setPendingBatchOperation({
        operation: 'move',
        sourceNames,
        sourcePath: fromPath,
        destPath,
        targetIndex,
        isFromDrop,
      });
      return;
    }

    await executeMoveItems(sourceNames, destPath, fromPath, targetIndex, isFromDrop);
  };

  const executeCopyItems = async (
    sourceNames: string[],
    destPath: string[],
    fromPath: string[],
    targetIndex?: number,
    isFromDrop: boolean = false
  ) => {
    const operationId = Date.now().toString();
    const total = sourceNames.length;
    const items = [...sourceNames];

    setFileOperationProgress({
      id: operationId,
      operation: 'copy',
      sourcePath: fromPath,
      destPath,
      totalItems: total,
      completedItems: 0,
      currentItemName: items[0] || '',
      percentage: 0,
      status: 'running',
      speedText: `${(Math.random() * 4 + 5.5).toFixed(1)} MB/s`,
    });

    let count = 0;
    const stepDelay = total > 1 ? Math.max(30, Math.min(150, 500 / total)) : 50;

    for (let i = 0; i < total; i++) {
      if (cancelOperationRef.current === operationId) {
        setFileOperationProgress((prev) =>
          prev && prev.id === operationId ? { ...prev, status: 'cancelled' } : prev
        );
        triggerVfsUpdate();
        addToast('warning', `Copy cancelled (${count}/${total} copied)`);
        setTimeout(() => {
          setFileOperationProgress((prev) => (prev?.id === operationId ? null : prev));
        }, 3000);
        return;
      }

      const name = items[i];
      setFileOperationProgress((prev) =>
        prev && prev.id === operationId
          ? {
              ...prev,
              completedItems: i,
              currentItemName: name,
              percentage: Math.round((i / total) * 100),
            }
          : prev
      );

      await new Promise((resolve) => setTimeout(resolve, stepDelay));

      const insertIdx = targetIndex !== undefined ? targetIndex + i : undefined;
      if (vfsRef.current.copyItem(fromPath, name, destPath, insertIdx)) {
        count++;
      }

      setFileOperationProgress((prev) =>
        prev && prev.id === operationId
          ? {
              ...prev,
              completedItems: i + 1,
              percentage: Math.round(((i + 1) / total) * 100),
            }
          : prev
      );
    }

    triggerVfsUpdate();
    SoundService.playFileSelect();
    setFileOperationProgress((prev) =>
      prev && prev.id === operationId
        ? {
            ...prev,
            completedItems: total,
            percentage: 100,
            status: 'completed',
          }
        : prev
    );

    if (count > 0) {
      addToast('success', `Copied ${count} item(s) to /${destPath.join('/')}`);

      if (isFromDrop) {
        const actionData = {
          id: Date.now().toString(),
          operation: 'copy' as const,
          sourceNames: items,
          sourcePath: fromPath,
          destPath,
          targetIndex,
          isSameDrive: false,
          timestamp: Date.now(),
        };
        setLastDropAction(actionData);

        if (lastDropTimerRef.current) clearTimeout(lastDropTimerRef.current);
        lastDropTimerRef.current = setTimeout(() => {
          setLastDropAction((prev) => (prev?.id === actionData.id ? null : prev));
        }, 7000);
      }
    }

    setTimeout(() => {
      setFileOperationProgress((prev) => (prev?.id === operationId ? null : prev));
    }, 3000);
  };

  const handleCopyItems = async (
    sourceNames: string[],
    destPath: string[],
    sourcePath?: string[],
    targetIndex?: number,
    isFromDrop: boolean = false
  ) => {
    const fromPath = sourcePath || currentActivePath;
    if (sourceNames.length === 0) return;

    // Check large batch threshold confirmation (over threshold items)
    if (confirmLargeBatchOperations && sourceNames.length > largeBatchThreshold) {
      setPendingBatchOperation({
        operation: 'copy',
        sourceNames,
        sourcePath: fromPath,
        destPath,
        targetIndex,
        isFromDrop,
      });
      return;
    }

    await executeCopyItems(sourceNames, destPath, fromPath, targetIndex, isFromDrop);
  };

  const handleConfirmBatchOperation = (dontAskAgain: boolean) => {
    if (!pendingBatchOperation) return;

    if (dontAskAgain) {
      setConfirmLargeBatchOperations(false);
      StorageService.setLocalItem('confirm_large_batch_operations', false);
      addToast('info', 'Large batch confirmation disabled (can re-enable in Preferences)');
    }

    const { operation, sourceNames, sourcePath, destPath, targetIndex, isPaste, isFromDrop } = pendingBatchOperation;
    setPendingBatchOperation(null);

    if (isPaste) {
      executePaste(sourceNames, sourcePath, destPath, operation === 'move');
    } else if (operation === 'move') {
      executeMoveItems(sourceNames, destPath, sourcePath, targetIndex, isFromDrop);
    } else {
      executeCopyItems(sourceNames, destPath, sourcePath, targetIndex, isFromDrop);
    }
  };

  const handleCancelBatchOperation = () => {
    setPendingBatchOperation(null);
    addToast('info', 'Batch operation cancelled');
  };

  const handleCreateShortcutItems = (
    sourceNames: string[],
    destPath: string[],
    sourcePath?: string[],
    targetIndex?: number
  ) => {
    const fromPath = sourcePath || currentActivePath;
    if (sourceNames.length === 0) return;

    let count = 0;
    for (let i = 0; i < sourceNames.length; i++) {
      const name = sourceNames[i];
      const insertIdx = targetIndex !== undefined ? targetIndex + i : undefined;
      if (vfsRef.current.createShortcutItem(fromPath, name, destPath, insertIdx)) {
        count++;
      }
    }

    if (count > 0) {
      triggerVfsUpdate();
      SoundService.playFileSelect();
      addToast('success', `Created ${count} shortcut link(s) in /${destPath.join('/')}`);
    }
  };

  // --- Smart Drag and Drop Orchestrator ---
  const handleSmartDrop = (
    sourceNames: string[],
    destPath: string[],
    sourcePath?: string[],
    targetIndex?: number,
    eventOptions?: {
      ctrlKey?: boolean;
      metaKey?: boolean;
      altKey?: boolean;
      button?: number;
      clientX?: number;
      clientY?: number;
    }
  ) => {
    const fromPath = sourcePath || currentActivePath;
    if (!sourceNames || sourceNames.length === 0) return;

    const isCtrl = Boolean(eventOptions?.ctrlKey || eventOptions?.metaKey);
    const isAlt = Boolean(eventOptions?.altKey);
    const isRightDrop = eventOptions?.button === 2;
    const coords = eventOptions ? { x: eventOptions.clientX || 200, y: eventOptions.clientY || 200 } : undefined;

    // 1. If right-clicked: show context drop menu with custom defaults
    if (isRightDrop) {
      setDropMenuData({
        sourceNames,
        destPath,
        sourcePath: fromPath,
        targetIndex,
        x: coords?.x || 200,
        y: coords?.y || 200,
      });
      return;
    }

    // 2. If Ctrl / Cmd key held: Explicit Copy
    if (isCtrl) {
      handleCopyItems(sourceNames, destPath, fromPath, targetIndex, true);
      return;
    }

    // 3. If Alt key held: Explicit Create Shortcut
    if (isAlt) {
      handleCreateShortcutItems(sourceNames, destPath, fromPath, targetIndex);
      return;
    }

    // 4. If neither Ctrl nor Alt held: Evaluate same-drive vs cross-drive logic
    const isSameFolder = fromPath.join('/') === destPath.join('/');
    if (isSameFolder) {
      if (targetIndex !== undefined) {
        const reordered = vfsRef.current.reorderItems(fromPath, sourceNames, targetIndex);
        if (reordered) {
          triggerVfsUpdate();
          SoundService.playFileMove();
          addToast('info', `Reordered ${sourceNames.length} item(s)`);
        }
      }
      return;
    }

    const sourceRoot = fromPath[0] || 'Local Session';
    const destRoot = destPath[0] || 'Local Session';
    const isSameDrive = sourceRoot === destRoot;

    if (isSameDrive) {
      // Same-drive: Default is Move
      handleMoveItems(sourceNames, destPath, fromPath, targetIndex, true);
    } else {
      // Cross-drive: Default is Copy
      handleCopyItems(sourceNames, destPath, fromPath, targetIndex, true);
    }
  };

  const handleSwitchDropToCopy = (action: {
    id: string;
    sourceNames: string[];
    sourcePath: string[];
    destPath: string[];
  }) => {
    let count = 0;
    for (const name of action.sourceNames) {
      if (vfsRef.current.copyItem(action.destPath, name, action.sourcePath)) {
        count++;
      }
    }
    if (count > 0) {
      triggerVfsUpdate();
      SoundService.playFileSelect();
      addToast('success', `Switched to Copy: ${count} item(s) preserved in /${action.sourcePath.join('/')}`);
    }
    setLastDropAction(null);
  };

  const handleSwitchDropToMove = (action: {
    id: string;
    sourceNames: string[];
    sourcePath: string[];
    destPath: string[];
  }) => {
    let count = 0;
    for (const name of action.sourceNames) {
      if (vfsRef.current.deleteItem(action.sourcePath, name)) {
        count++;
      }
    }
    if (count > 0) {
      triggerVfsUpdate();
      SoundService.playFileMove();
      addToast('success', `Switched to Move: source item(s) deleted from /${action.sourcePath.join('/')}`);
    }
    setLastDropAction(null);
  };

  const handleUndoDropAction = (action: {
    id: string;
    operation: 'move' | 'copy';
    sourceNames: string[];
    sourcePath: string[];
    destPath: string[];
  }) => {
    if (action.operation === 'move') {
      let count = 0;
      for (const name of action.sourceNames) {
        if (vfsRef.current.moveItem(action.destPath, name, action.sourcePath)) {
          count++;
        }
      }
      if (count > 0) {
        triggerVfsUpdate();
        SoundService.playFileMove();
        addToast('info', `Undid move: ${count} item(s) restored to /${action.sourcePath.join('/')}`);
      }
    } else {
      let count = 0;
      for (const name of action.sourceNames) {
        if (vfsRef.current.deleteItem(action.destPath, name)) {
          count++;
        }
      }
      if (count > 0) {
        triggerVfsUpdate();
        SoundService.playFileDelete();
        addToast('info', `Undid copy: removed ${count} copied item(s) from /${action.destPath.join('/')}`);
      }
    }
    setLastDropAction(null);
  };

  const handleUploadFiles = async (files: FileList, targetPath?: string[]) => {
    const dest = targetPath || currentActivePath;
    const total = files.length;
    if (total === 0) return;

    const operationId = Date.now().toString();
    setFileOperationProgress({
      id: operationId,
      operation: 'upload',
      destPath: dest,
      totalItems: total,
      completedItems: 0,
      currentItemName: files[0].name,
      percentage: 0,
      status: 'running',
      speedText: '12.4 MB/s',
    });

    let uploaded = 0;
    for (let i = 0; i < total; i++) {
      const f = files[i];
      setFileOperationProgress((prev) =>
        prev && prev.id === operationId
          ? {
              ...prev,
              completedItems: i,
              currentItemName: f.name,
              percentage: Math.round((i / total) * 100),
            }
          : prev
      );

      await new Promise<void>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = (e.target?.result as string) || '';
          vfsRef.current.createFile(dest, f.name, content);
          uploaded++;
          resolve();
        };
        if (
          f.type.startsWith('text/') ||
          f.name.endsWith('.md') ||
          f.name.endsWith('.json') ||
          f.name.endsWith('.ts') ||
          f.name.endsWith('.js')
        ) {
          reader.readAsText(f);
        } else {
          reader.readAsDataURL(f);
        }
      });

      setFileOperationProgress((prev) =>
        prev && prev.id === operationId
          ? {
              ...prev,
              completedItems: i + 1,
              percentage: Math.round(((i + 1) / total) * 100),
            }
          : prev
      );
    }

    triggerVfsUpdate();
    SoundService.playFileUpload();
    setFileOperationProgress((prev) =>
      prev && prev.id === operationId
        ? {
            ...prev,
            completedItems: total,
            percentage: 100,
            status: 'completed',
          }
        : prev
    );

    addToast('success', `Uploaded ${uploaded} file(s) to /${dest.join('/')}`);

    setTimeout(() => {
      setFileOperationProgress((prev) => (prev?.id === operationId ? null : prev));
    }, 3500);
  };

  // --- Open File / Editor / Webview Handlers ---
  const handleOpenFile = (file: FileSystemNode, path: string[]) => {
    // Check if it's a shortcut (.lnk)
    if (file.isShortcut || file.name.endsWith('.lnk')) {
      try {
        const linkData = JSON.parse(file.content || '{}');
        if (linkData.targetPath && Array.isArray(linkData.targetPath)) {
          const targetNode = vfsRef.current.getNode(linkData.targetPath);
          if (targetNode) {
            if (targetNode.type === 'folder') {
              handleNavigatePane(activePane, linkData.targetPath);
              addToast('info', `Followed shortcut to /${linkData.targetPath.join('/')}`);
              return;
            } else {
              handleOpenFile(targetNode, linkData.targetPath.slice(0, -1));
              return;
            }
          }
        }
      } catch (err) {
        console.warn('Failed to parse shortcut file', err);
      }
    }

    if (file.isMagnet) {
      setWebviewData({
        isOpen: true,
        url: file.content || 'https://google.com',
        title: file.name,
      });
      return;
    }

    // Open text/markdown editor
    setEditorData({
      isOpen: true,
      title: file.name,
      content: file.content || '',
      path: [...path, file.name],
    });
  };

  const handleSaveEditorContent = (content: string) => {
    const parentPath = editorData.path.slice(0, -1);
    const fileName = editorData.path[editorData.path.length - 1];
    const node = vfsRef.current.getNode(parentPath);
    const file = node?.children?.find((c) => c.name === fileName);
    if (file) {
      file.content = content;
      file.size = content.length;
      file.modified = new Date().toISOString();
      triggerVfsUpdate();
      addToast('success', `Saved ${fileName}`);
    }
  };

  // --- Bookmarks Handlers ---
  const handleAddBookmark = (newBm: NewBookmark) => {
    const fullPathStr = currentActivePath.join('/');
    const created: Bookmark = {
      ...newBm,
      _id: Date.now().toString() + Math.random().toString().slice(2, 6),
      _creationTime: Date.now(),
      path: fullPathStr,
    };
    const nextBookmarks = [created, ...bookmarks];
    setBookmarks(nextBookmarks);
    StorageService.setLocalItem(BOOKMARKS_STORAGE_KEY, nextBookmarks);
    addToast('success', `Bookmarked "${newBm.title}" into /${fullPathStr}`);
  };

  const handleDeleteBookmark = (id: string) => {
    const nextBookmarks = bookmarks.filter((b) => b._id !== id);
    setBookmarks(nextBookmarks);
    StorageService.setLocalItem(BOOKMARKS_STORAGE_KEY, nextBookmarks);
    addToast('info', 'Bookmark deleted');
  };

  const handleToggleStarPath = useCallback(
    (targetPath: string[]) => {
      const targetStr = targetPath.join('/');
      setStarredPaths((prev) => {
        const exists = prev.some((p) => p.join('/') === targetStr);
        let next: string[][];
        if (exists) {
          next = prev.filter((p) => p.join('/') !== targetStr);
          addToast('info', `Removed /${targetStr} from Quick Access`);
        } else {
          next = [...prev, targetPath];
          addToast('success', `Starred /${targetStr} for Quick Access in sidebar`);
        }
        StorageService.setLocalItem('starred_paths', next);
        return next;
      });
    },
    [addToast]
  );

  // --- Drag Resize Handlers ---
  const handleSidebarResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = sidebarWidth;
    const onMouseMove = (moveEvent: MouseEvent) => {
      const newW = Math.max(180, Math.min(500, startW + (moveEvent.clientX - startX)));
      setSidebarWidth(newW);
    };
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleDetailPaneResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = detailPaneWidth;
    const onMouseMove = (moveEvent: MouseEvent) => {
      const newW = Math.max(200, Math.min(500, startW - (moveEvent.clientX - startX)));
      setDetailPaneWidth(newW);
    };
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleStreamResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startH = ideaStreamHeight;
    const onMouseMove = (moveEvent: MouseEvent) => {
      const newH = Math.max(120, Math.min(500, startH - (moveEvent.clientY - startY)));
      setIdeaStreamHeight(newH);
    };
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleTerminalResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startH = terminalHeight;
    const onMouseMove = (moveEvent: MouseEvent) => {
      const newH = Math.max(140, Math.min(600, startH - (moveEvent.clientY - startY)));
      setTerminalHeight(newH);
    };
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // --- Sort Criteria Cycling (Name -> Date -> Size -> Name) ---
  const handleCycleSort = useCallback(() => {
    setSortCriteria((prev) => {
      let nextKey: SortKey = 'name';
      if (prev.key === 'name') {
        nextKey = isCurrentActiveInTrash ? 'originalPath' : 'modified';
      } else if (prev.key === 'originalPath') {
        nextKey = 'modified';
      } else if (prev.key === 'modified') {
        nextKey = 'size';
      } else if (prev.key === 'size') {
        nextKey = 'type';
      } else {
        nextKey = 'name';
      }
      const label =
        nextKey === 'name'
          ? 'Name'
          : nextKey === 'originalPath'
          ? 'Original Path'
          : nextKey === 'modified'
          ? 'Date Modified'
          : nextKey === 'size'
          ? 'Size'
          : 'Type';
      addToast('info', `Active Pane sorted by ${label} (${prev.direction.toUpperCase()})`);
      SoundService.playFileSelect();
      return { key: nextKey, direction: prev.direction || 'asc', secondary: undefined };
    });
  }, [addToast, isCurrentActiveInTrash]);

  // --- Keyboard Shortcuts ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === 'F5') {
        e.preventDefault();
        triggerVfsUpdate();
        addToast('info', 'Workspace refreshed');
      } else if (e.key === '`' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setShowTerminal((prev) => !prev);
      } else if (e.altKey && (e.key.toLowerCase() === 'a' || e.key === 'å')) {
        e.preventDefault();
        handleToggleAIChat();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleCycleSort();
      } else if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        if (canGoBack) handleGoBack();
      } else if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        if (canGoForward) handleGoForward();
      } else if (e.key === 'Backspace' || (e.altKey && e.key === 'ArrowUp')) {
        e.preventDefault();
        handleUp();
      } else if (e.key === 'Delete') {
        const selected = Array.from(currentActiveSelected);
        if (selected.length > 0) {
          e.preventDefault();
          handleDelete(currentActivePath, selected, e.shiftKey);
        }
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setIsGlobalSearchOpen(true);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        handleCopy();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'x') {
        handleCut();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        handlePaste();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        const activeItems = activePane === 1 ? pane1Items : pane2Items;
        const hasFilter = filterQuery.trim().length > 0 || !!activeTagFilter;
        const filtered = hasFilter
          ? activeItems.filter((i) => matchesFilter(i, filterQuery, activeTagFilter))
          : activeItems;
        const allNames = filtered.map((it) => it.name);
        if (activePane === 1) {
          setPane1Selected(new Set(allNames));
        } else {
          setPane2Selected(new Set(allNames));
        }
        SoundService.playMarqueeComplete(allNames.length);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  return (
    <div className="flex flex-col h-screen w-screen bg-[rgb(var(--color-background))] text-[rgb(var(--color-text-base))] overflow-hidden select-none">
      {/* 1. Header Address Bar */}
      <HeaderAddressBar
        currentPath={currentActivePath}
        canGoBack={canGoBack}
        canGoForward={canGoForward}
        onGoBack={handleGoBack}
        onGoForward={handleGoForward}
        onGoUp={handleUp}
        onNavigate={(p) => handleNavigatePane(activePane, p)}
        onOpenInNewPane={handleOpenInNewPane}
        onRefresh={() => {
          triggerVfsUpdate();
          addToast('info', 'Refreshed');
        }}
        historyStack={activePane === 1 ? pane1History : pane2History}
        historyIndex={activePane === 1 ? pane1HistoryIndex : pane2HistoryIndex}
        getSubfolders={getSubfoldersForPath}
        onDropOnBreadcrumb={handleDropOnBreadcrumb}
        onNotify={addToast}
        isStarred={starredPaths.some((p) => p.join('/') === currentActivePath.join('/'))}
        onToggleStar={(p) => handleToggleStarPath(p || currentActivePath)}
      />

      {/* 2. Top Toolbar */}
      {(() => {
        const activeItems = activePane === 1 ? displayedPane1Items : displayedPane2Items;
        const hasFilter = filterQuery.trim().length > 0 || !!activeTagFilter;
        const matchCount = searchScope === 'vfs' && vfsSearchResults
          ? vfsSearchResults.length
          : hasFilter
          ? activeItems.filter((it) => matchesFilter(it, filterQuery, activeTagFilter)).length
          : undefined;
        const totalCount = searchScope === 'vfs' && vfsSearchResults
          ? vfsSearchResults.length
          : hasFilter ? activeItems.length : undefined;

        // Compute tag counts and total tagged count for current active folder
        const tagCounts = new Map<string, number>();
        let totalTagged = 0;
        for (const item of activeItems) {
          if (item.tags && item.tags.length > 0) {
            totalTagged++;
            for (const t of item.tags) {
              const k = t.trim();
              tagCounts.set(k, (tagCounts.get(k) || 0) + 1);
            }
          }
        }

        return (
          <Toolbar
            canCut={currentActiveSelected.size > 0}
            canCopy={currentActiveSelected.size > 0}
            canPaste={!!clipboard}
            canRename={currentActiveSelected.size === 1}
            canShare={currentActiveSelected.size === 1}
            canDelete={currentActiveSelected.size > 0}
            currentSort={sortCriteria}
            displayMode={displayMode}
            groupByType={groupByType}
            filterQuery={filterQuery}
            searchScope={searchScope}
            onSearchScopeChange={setSearchScope}
            onOpenGlobalSearch={() => setIsGlobalSearchOpen(true)}
            activeTagFilter={activeTagFilter}
            onTagFilterChange={setActiveTagFilter}
            tagCounts={tagCounts}
            totalTaggedCount={totalTagged}
            matchCount={matchCount}
            totalCount={totalCount}
            isSplitViewActive={isDualPane}
            isDetailPaneActive={showDetailPane}
            isSidebarVisible={showSidebar}
            isTerminalVisible={showTerminal}
            isStreamVisible={showIdeaStream}
            isAIChatVisible={showAIChat && !isAIChatMinimized}
            currentTheme={theme}
            onNewFolder={() => {
              const name = prompt('New Folder Name:');
              if (name && name.trim()) handleCreateFolder(currentActivePath, name.trim());
            }}
            onNewFile={(ext = '.md') => {
              const name = prompt(`New File Name (e.g. document${ext}):`);
              if (name && name.trim()) handleCreateFile(currentActivePath, name.trim());
            }}
            onUpload={handleUploadFiles}
            onCut={handleCut}
            onCopy={handleCopy}
            onPaste={handlePaste}
            onRename={() => {
              const selectedName = Array.from(currentActiveSelected)[0];
              if (selectedName) {
                const nextName = prompt('Rename item to:', selectedName);
                if (nextName && nextName.trim() && nextName.trim() !== selectedName) {
                  handleRename(currentActivePath, selectedName, nextName.trim());
                }
              }
            }}
            onShare={() => {
              const selectedName = Array.from(currentActiveSelected)[0];
              if (selectedName) {
                addToast('info', `Share magnet link generated for "${selectedName}"`);
              }
            }}
            onDelete={() => handleDelete(currentActivePath, Array.from(currentActiveSelected))}
            onEmptyTrash={handleEmptyTrash}
            trashCount={trashCount}
            isInTrash={isCurrentActiveInTrash}
            onOpenTrash={handleOpenTrash}
            onRestore={() => handleRestoreFromTrash(Array.from(currentActiveSelected))}
            canRestore={currentActiveSelected.size > 0}
            onSortChange={setSortCriteria}
            onDisplayModeChange={(mode: DisplayMode) => {
              setDisplayMode(mode);
              StorageService.setLocalItem('displayMode', mode);
            }}
            onGroupByTypeChange={(nextVal) => {
              setGroupByType(nextVal);
              StorageService.setLocalItem('groupByType', nextVal);
              addToast('info', nextVal ? 'Group by type enabled (Folders, Documents, Images, Other)' : 'Group by type disabled');
            }}
            onFilterChange={setFilterQuery}
            onToggleSplitView={() => setIsDualPane(!isDualPane)}
            onToggleDetailPane={() => setShowDetailPane(!showDetailPane)}
            onToggleSidebar={() => setShowSidebar(!showSidebar)}
            onToggleTerminal={() => setShowTerminal(!showTerminal)}
            onToggleStream={() => setShowIdeaStream(!showIdeaStream)}
            onToggleAIChat={handleToggleAIChat}
            onThemeChange={(newTheme) => {
              setTheme(newTheme);
              StorageService.setLocalItem('theme', newTheme);
            }}
            onOpenServerProfiles={() => setDialogServerProfiles(true)}
            onOpenLocalConfig={() => setDialogLocalConfig(true)}
            onOpenRssFeeds={() => setDialogRssFeeds(true)}
            onOpenPreferences={() => setDialogPreferences(true)}
            onOpenImport={() => setDialogImport(true)}
            onOpenExport={() => setDialogExport(true)}
          />
        );
      })()}

      {/* 3. Center Workspace Area (Sidebar + File Explorer Panes + Detail Pane) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar */}
        {showSidebar && (
          <Sidebar
            width={sidebarWidth}
            rootNode={rootNode}
            currentPath={currentActivePath}
            starredPaths={starredPaths}
            onToggleStarPath={handleToggleStarPath}
            onNavigate={(p) => handleNavigatePane(activePane, p)}
            onRefresh={triggerVfsUpdate}
            onCreateFolder={handleCreateFolder}
            onCreateFile={handleCreateFile}
            onRename={handleRename}
            onDelete={(p, name) => handleDelete(p, [name])}
            onDropOnNode={(destPath, e) => {
              try {
                const data =
                  e.dataTransfer.getData('application/x-file-transfer') ||
                  e.dataTransfer.getData('application/json');
                if (data) {
                  const parsed = JSON.parse(data);
                  const itemNames: string[] = parsed.itemNames || [];
                  const sourcePath: string[] = parsed.sourcePath || currentActivePath;
                  if (itemNames.length > 0) {
                    handleSmartDrop(itemNames, destPath, sourcePath, undefined, {
                      ctrlKey: e.ctrlKey,
                      metaKey: e.metaKey,
                      altKey: e.altKey,
                      button: e.button,
                      clientX: e.clientX,
                      clientY: e.clientY,
                    });
                  }
                } else if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  handleUploadFiles(e.dataTransfer.files, destPath);
                }
              } catch (err) {
                console.error('Failed to drop on sidebar node', err);
              }
            }}
            onShowProperties={(p, node) => setPropertiesData({ isOpen: true, item: node, path: p })}
            onOpenFullEditor={(content, title, path) =>
              setEditorData({ isOpen: true, title, content, path })
            }
            onOpenFloatingChat={handleOpenAIChat}
            onResizeStart={handleSidebarResize}
            onEmptyTrash={handleEmptyTrash}
          />
        )}

        {/* Middle Explorer Panes */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Pane 1 */}
          <FileExplorerPane
            paneId={1}
            isActive={activePane === 1}
            currentPath={pane1Path}
            items={displayedPane1Items}
            displayMode={displayMode}
            sortCriteria={sortCriteria}
            filterQuery={filterQuery}
            selectedItems={pane1Selected}
            onSelectItems={setPane1Selected}
            onActivate={() => setActivePane(1)}
            onNavigate={(p) => handleNavigatePane(1, p)}
            onOpenFile={handleOpenFile}
            onCreateFolder={(n) => handleCreateFolder(pane1Path, n)}
            onCreateFile={(n) => handleCreateFile(pane1Path, n)}
            onRename={(oldN, newN) => handleRename(pane1Path, oldN, newN)}
            onDelete={(names) => handleDelete(pane1Path, names)}
            onCut={handleCut}
            onCopy={handleCopy}
            onPaste={handlePaste}
            onShare={(item) => {
              addToast('info', `Share link for "${item.name}" copied to clipboard`);
            }}
            onShowProperties={(item) =>
              setPropertiesData({ isOpen: true, item, path: pane1Path })
            }
            onMoveItems={handleMoveItems}
            onCopyItems={handleCopyItems}
            onCreateShortcuts={handleCreateShortcutItems}
            onDropItems={handleSmartDrop}
            onRequestDropMenu={(names, dP, sP, tIdx, coords) =>
              setDropMenuData({
                sourceNames: names,
                destPath: dP,
                sourcePath: sP,
                targetIndex: tIdx,
                x: coords?.x || 200,
                y: coords?.y || 200,
              })
            }
            onUpload={handleUploadFiles}
            activeTagFilter={activeTagFilter}
            onTagFilterChange={setActiveTagFilter}
            onClearFilter={() => {
              setFilterQuery('');
              setActiveTagFilter(null);
            }}
            onSortChange={setSortCriteria}
            groupByType={groupByType}
            onToggleGroupByType={handleToggleGroupByType}
            vfsService={vfsRef.current}
            onEmptyTrash={handleEmptyTrash}
            onRestore={handleRestoreFromTrash}
            onBatchTag={(itemNames, tag, action) => handleBatchTag(pane1Path, itemNames, tag, action)}
          />

          {/* Pane 2 (Split View) */}
          {isDualPane && (
            <div className="flex-1 flex border-l border-[rgb(var(--color-border-base))]">
              <FileExplorerPane
                paneId={2}
                isActive={activePane === 2}
                currentPath={pane2Path}
                items={displayedPane2Items}
                displayMode={displayMode}
                sortCriteria={sortCriteria}
                filterQuery={filterQuery}
                selectedItems={pane2Selected}
                onSelectItems={setPane2Selected}
                onActivate={() => setActivePane(2)}
                onNavigate={(p) => handleNavigatePane(2, p)}
                onOpenFile={handleOpenFile}
                onCreateFolder={(n) => handleCreateFolder(pane2Path, n)}
                onCreateFile={(n) => handleCreateFile(pane2Path, n)}
                onRename={(oldN, newN) => handleRename(pane2Path, oldN, newN)}
                onDelete={(names) => handleDelete(pane2Path, names)}
                onCut={handleCut}
                onCopy={handleCopy}
                onPaste={handlePaste}
                onShare={(item) => {
                  addToast('info', `Share link for "${item.name}" copied to clipboard`);
                }}
                onShowProperties={(item) =>
                  setPropertiesData({ isOpen: true, item, path: pane2Path })
                }
                onMoveItems={handleMoveItems}
                onCopyItems={handleCopyItems}
                onCreateShortcuts={handleCreateShortcutItems}
                onDropItems={handleSmartDrop}
                onRequestDropMenu={(names, dP, sP, tIdx, coords) =>
                  setDropMenuData({
                    sourceNames: names,
                    destPath: dP,
                    sourcePath: sP,
                    targetIndex: tIdx,
                    x: coords?.x || 200,
                    y: coords?.y || 200,
                  })
                }
                onUpload={handleUploadFiles}
                activeTagFilter={activeTagFilter}
                onTagFilterChange={setActiveTagFilter}
                onClearFilter={() => {
                  setFilterQuery('');
                  setActiveTagFilter(null);
                }}
                onSortChange={setSortCriteria}
                groupByType={groupByType}
                onToggleGroupByType={handleToggleGroupByType}
                vfsService={vfsRef.current}
                onEmptyTrash={handleEmptyTrash}
                onRestore={handleRestoreFromTrash}
                onBatchTag={(itemNames, tag, action) => handleBatchTag(pane2Path, itemNames, tag, action)}
              />
            </div>
          )}
        </div>

        {/* Right Detail & Saved Bookmarks Pane */}
        {showDetailPane && (() => {
          const activeItems = activePane === 1 ? pane1Items : pane2Items;
          const selectedItemName = currentActiveSelected.size === 1 ? Array.from(currentActiveSelected)[0] : null;
          const selectedItemNode = selectedItemName ? activeItems.find((it) => it.name === selectedItemName) || null : null;

          return (
            <DetailPane
              width={detailPaneWidth}
              currentPath={currentActivePath}
              bookmarks={bookmarks}
              feeds={rssFeeds}
              selectedItem={selectedItemNode}
              selectedItemsCount={currentActiveSelected.size}
              folderItems={activeItems}
              onNavigate={(p) => handleNavigatePane(activePane, p)}
              onOpenFile={(item) => handleOpenFile(item, currentActivePath)}
              onOpenFullEditor={(content, title, path) =>
                setEditorData({ isOpen: true, title, content, path })
              }
              onShowProperties={(item) =>
                setPropertiesData({ isOpen: true, item, path: currentActivePath })
              }
              onDeleteBookmark={handleDeleteBookmark}
              onOpenLink={(url, title) => setWebviewData({ isOpen: true, url, title })}
              onManageFeeds={() => setDialogRssFeeds(true)}
              onResizeStart={handleDetailPaneResize}
              onClose={() => setShowDetailPane(false)}
            />
          );
        })()}
      </div>

      {/* 4. Bottom Idea Stream (Collapsible) */}
      {showIdeaStream && (
        <IdeaStream
          height={ideaStreamHeight}
          currentPath={currentActivePath}
          onAddBookmark={handleAddBookmark}
          onOpenLink={(url, title) => setWebviewData({ isOpen: true, url, title })}
          onResizeStart={handleStreamResize}
          onClose={() => setShowIdeaStream(false)}
        />
      )}

      {/* 5. Bottom Terminal Console (Collapsible) */}
      {showTerminal && (
        <ConsoleTerminal
          height={terminalHeight}
          currentPath={currentActivePath}
          rootNode={rootNode}
          vfsService={vfsRef.current}
          onNavigate={(p) => handleNavigatePane(activePane, p)}
          onCreateFolder={(p, n) => handleCreateFolder(p, n)}
          onCreateFile={(p, n) => handleCreateFile(p, n)}
          onDelete={(p, n) => handleDelete(p, [n])}
          onResizeStart={handleTerminalResize}
          onClose={() => setShowTerminal(false)}
        />
      )}

      {/* 6. Footer Status Bar with Progress Bar */}
      <FooterStatusBar
        currentPath={currentActivePath}
        activePane={activePane}
        isDualPane={isDualPane}
        items={activePane === 1 ? pane1Items : pane2Items}
        selectedItemNames={currentActiveSelected}
        progress={fileOperationProgress}
        onCancelProgress={handleCancelProgress}
        onDismissProgress={handleDismissProgress}
        showTerminal={showTerminal}
        onToggleTerminal={() => setShowTerminal((prev) => !prev)}
        showIdeaStream={showIdeaStream}
        onToggleIdeaStream={() => setShowIdeaStream((prev) => !prev)}
        showDetailPane={showDetailPane}
        onToggleDetailPane={() => setShowDetailPane((prev) => !prev)}
        showAIChat={showAIChat && !isAIChatMinimized}
        onToggleAIChat={handleToggleAIChat}
        displayMode={displayMode}
        onChangeDisplayMode={(m) => {
          setDisplayMode(m);
          StorageService.setLocalItem('displayMode', m);
        }}
      />

      {/* 7. Active Modals & Dialogs */}
      {dialogServerProfiles && (
        <ServerProfilesDialog
          profiles={serverProfiles}
          onSaveProfile={(p) => {
            setServerProfiles((prev) => {
              const idx = prev.findIndex((x) => x.id === p.id);
              let updated;
              if (idx >= 0) {
                updated = [...prev];
                updated[idx] = p;
              } else {
                updated = [...prev, p];
              }
              StorageService.saveProfile(p);
              return updated;
            });
            addToast('success', `Saved profile "${p.name}"`);
          }}
          onDeleteProfile={(id) => {
            setServerProfiles((prev) => prev.filter((p) => p.id !== id));
            StorageService.deleteProfile(id);
            addToast('info', 'Profile removed');
          }}
          onConnect={(p) => {
            setDialogServerProfiles(false);
            setDialogLoginProfile(p);
          }}
          onClose={() => setDialogServerProfiles(false)}
        />
      )}

      {dialogLoginProfile && (
        <LoginDialog
          profile={dialogLoginProfile}
          onLogin={() => {
            addToast('success', `Connected and mounted ${dialogLoginProfile.name}`);
            setDialogLoginProfile(null);
          }}
          onClose={() => setDialogLoginProfile(null)}
        />
      )}

      {dialogLocalConfig && (
        <LocalConfigDialog
          sessionName={rootNode.name}
          defaultImageUrl="https://picsum.photos/seed"
          onSave={(name) => {
            vfsRef.current.setSessionName(name);
            triggerVfsUpdate();
            addToast('success', 'Local session config updated');
          }}
          onClose={() => setDialogLocalConfig(false)}
        />
      )}

      {dialogRssFeeds && (
        <RssFeedsDialog
          feeds={rssFeeds}
          onSaveFeed={(f) => {
            setRssFeeds((prev) => [...prev, f]);
            StorageService.saveFeed(f);
            addToast('success', `Subscribed to ${f.name}`);
          }}
          onDeleteFeed={(id) => {
            setRssFeeds((prev) => prev.filter((f) => f.id !== id));
            StorageService.deleteFeed(id);
            addToast('info', 'Unsubscribed from feed');
          }}
          onClose={() => setDialogRssFeeds(false)}
        />
      )}

      {dialogPreferences && (
        <PreferencesDialog
          currentTheme={theme}
          defaultDisplayMode={displayMode}
          confirmLargeBatchOperations={confirmLargeBatchOperations}
          largeBatchThreshold={largeBatchThreshold}
          onSavePreferences={(newTheme, newDisplayMode, newConfirmBatch, newThreshold) => {
            setTheme(newTheme);
            setDisplayMode(newDisplayMode);
            setConfirmLargeBatchOperations(newConfirmBatch);
            setLargeBatchThreshold(newThreshold);
            StorageService.setLocalItem('theme', newTheme);
            StorageService.setLocalItem('displayMode', newDisplayMode);
            StorageService.setLocalItem('confirm_large_batch_operations', newConfirmBatch);
            StorageService.setLocalItem('large_batch_threshold', newThreshold);
            addToast('success', 'Preferences saved');
          }}
          onClose={() => setDialogPreferences(false)}
        />
      )}

      {pendingBatchOperation && (
        <ConfirmBatchOperationDialog
          isOpen={true}
          operation={pendingBatchOperation.operation}
          itemNames={pendingBatchOperation.sourceNames}
          sourcePath={pendingBatchOperation.sourcePath}
          destPath={pendingBatchOperation.destPath}
          threshold={largeBatchThreshold}
          onConfirm={handleConfirmBatchOperation}
          onCancel={handleCancelBatchOperation}
        />
      )}

      {dialogImport && (
        <ImportDialog
          onImport={(json) => {
            const success = vfsRef.current.importJson(json);
            if (success) {
              triggerVfsUpdate();
              addToast('success', 'File hierarchy restored from JSON');
            }
            return success;
          }}
          onClose={() => setDialogImport(false)}
        />
      )}

      {dialogExport && (
        <ExportDialog
          jsonString={vfsRef.current.exportJson()}
          onClose={() => setDialogExport(false)}
        />
      )}

      {editorData.isOpen && (
        <TextEditorDialog
          title={editorData.title}
          initialContent={editorData.content}
          path={editorData.path}
          onSave={handleSaveEditorContent}
          onClose={() => setEditorData({ isOpen: false, title: '', content: '', path: [] })}
        />
      )}

      {webviewData.isOpen && (
        <WebviewDialog
          url={webviewData.url}
          title={webviewData.title}
          onClose={() => setWebviewData({ isOpen: false, url: '', title: '' })}
        />
      )}

      {propertiesData.isOpen && propertiesData.item && (
        <PropertiesDialog
          item={propertiesData.item}
          path={propertiesData.path}
          onSaveProperties={(displayName, imageName, tags) => {
            const originalName = propertiesData.item!.name;
            const success = vfsRef.current.updateItemProperties(propertiesData.path, originalName, {
              displayName,
              imageName,
              tags,
            });
            if (success) {
              triggerVfsUpdate();
              addToast('success', `Saved properties for "${displayName || originalName}"`);
            }
          }}
          onClose={() => setPropertiesData({ isOpen: false, item: null, path: [] })}
        />
      )}

      {/* Drop Action Context Menu (Move, Copy, Shortcut, Cancel) */}
      {dropMenuData && (() => {
        const sourceRoot = (dropMenuData.sourcePath || currentActivePath)[0] || 'Local Session';
        const destRoot = dropMenuData.destPath[0] || 'Local Session';
        const isSameDrive = sourceRoot === destRoot;

        return (
          <div
            id="drop-action-menu-backdrop"
            className="fixed inset-0 z-50 bg-black/10 backdrop-blur-[0.5px]"
            onClick={() => setDropMenuData(null)}
            onContextMenu={(e) => {
              e.preventDefault();
              setDropMenuData(null);
            }}
          >
            <div
              id="drop-action-menu"
              onClick={(e) => e.stopPropagation()}
              style={{
                top: Math.min(window.innerHeight - 270, Math.max(10, dropMenuData.y)),
                left: Math.min(window.innerWidth - 240, Math.max(10, dropMenuData.x)),
              }}
              className="fixed z-50 w-60 bg-[rgb(var(--color-surface))] border border-[rgb(var(--color-border-base))] rounded-xl shadow-2xl py-1.5 text-xs text-[rgb(var(--color-text-base))] animate-in fade-in zoom-in-95 duration-100"
            >
              <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[rgb(var(--color-text-muted))] border-b border-[rgb(var(--color-border-base))] mb-1 flex items-center justify-between">
                <span>{dropMenuData.sourceNames.length} item(s)</span>
                <span className="truncate max-w-[100px] font-normal lowercase">to /{dropMenuData.destPath.slice(-1)[0] || 'root'}</span>
              </div>
              <button
                id="drop-action-move-btn"
                onClick={() => {
                  const { sourceNames, destPath, sourcePath, targetIndex } = dropMenuData;
                  setDropMenuData(null);
                  handleMoveItems(sourceNames, destPath, sourcePath, targetIndex);
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-blue-600 hover:text-white transition-colors cursor-pointer text-left font-medium group"
              >
                <div className="flex items-center gap-2">
                  <MoveRight className="w-4 h-4 text-blue-500 group-hover:text-white" />
                  <span>Move here</span>
                </div>
                {isSameDrive && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/15 group-hover:bg-white/20 text-blue-500 group-hover:text-white font-medium">
                    Default
                  </span>
                )}
              </button>
              <button
                id="drop-action-copy-btn"
                onClick={() => {
                  const { sourceNames, destPath, sourcePath, targetIndex } = dropMenuData;
                  setDropMenuData(null);
                  handleCopyItems(sourceNames, destPath, sourcePath, targetIndex);
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-blue-600 hover:text-white transition-colors cursor-pointer text-left group"
              >
                <div className="flex items-center gap-2">
                  <Copy className="w-4 h-4 text-emerald-500 group-hover:text-white" />
                  <span>Copy here</span>
                </div>
                {!isSameDrive && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/15 group-hover:bg-white/20 text-emerald-500 group-hover:text-white font-medium">
                    Default
                  </span>
                )}
              </button>
              <button
                id="drop-action-shortcut-btn"
                onClick={() => {
                  const { sourceNames, destPath, sourcePath, targetIndex } = dropMenuData;
                  setDropMenuData(null);
                  handleCreateShortcutItems(sourceNames, destPath, sourcePath, targetIndex);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-blue-600 hover:text-white transition-colors cursor-pointer text-left group"
              >
                <ExternalLink className="w-4 h-4 text-purple-500 group-hover:text-white" />
                <span>Create shortcut here</span>
              </button>

              <div className="my-1 border-t border-[rgb(var(--color-border-base))]" />

              <button
                id="drop-action-open-new-pane-btn"
                onClick={() => {
                  const { destPath } = dropMenuData;
                  setDropMenuData(null);
                  const alternatePane: 1 | 2 = activePane === 1 ? 2 : 1;
                  setIsDualPane(true);
                  handleNavigatePane(alternatePane, destPath);
                  setActivePane(alternatePane);
                  SoundService.playFileSelect();
                  addToast('info', `Opened destination in Pane ${alternatePane}`);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-blue-600 hover:text-white transition-colors cursor-pointer text-left group"
                title="Open destination in the alternate pane"
              >
                <Columns className="w-4 h-4 text-indigo-500 group-hover:text-white" />
                <span>Open in New Pane</span>
              </button>

              <button
                id="drop-action-properties-btn"
                onClick={() => {
                  const { sourceNames, sourcePath } = dropMenuData;
                  setDropMenuData(null);
                  const firstName = sourceNames[0];
                  if (firstName) {
                    const itemNode =
                      vfsRef.current.getNode([...sourcePath, firstName]) ||
                      vfsRef.current.getNode(sourcePath)?.children?.find((c) => c.name === firstName) ||
                      null;
                    if (itemNode) {
                      setPropertiesData({ isOpen: true, item: itemNode, path: sourcePath });
                      SoundService.playFileSelect();
                    }
                  }
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-blue-600 hover:text-white transition-colors cursor-pointer text-left group"
                title="View properties of the first selected item"
              >
                <Info className="w-4 h-4 text-sky-500 group-hover:text-white" />
                <span>Properties</span>
              </button>

              <div className="my-1 border-t border-[rgb(var(--color-border-base))]" />

              <button
                id="drop-action-cancel-btn"
                onClick={() => setDropMenuData(null)}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-muted))] transition-colors cursor-pointer text-left"
              >
                <X className="w-4 h-4" />
                <span>Cancel</span>
              </button>
            </div>
          </div>
        );
      })()}

      {/* Non-intrusive Drop Quick Action Notification */}
      {lastDropAction && (
        <div
          id="drop-quick-action-notification"
          className="fixed bottom-12 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2.5 px-3.5 py-2 bg-[rgb(var(--color-surface))] border border-[rgb(var(--color-border-base))] rounded-full shadow-2xl text-xs text-[rgb(var(--color-text-base))] animate-in fade-in slide-in-from-bottom-2 duration-150 backdrop-blur-md ring-1 ring-black/5 dark:ring-white/10"
        >
          {lastDropAction.operation === 'move' ? (
            <div className="w-5 h-5 rounded-full bg-blue-500/15 flex items-center justify-center text-blue-500">
              <MoveRight className="w-3.5 h-3.5" />
            </div>
          ) : (
            <div className="w-5 h-5 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-500">
              <Copy className="w-3.5 h-3.5" />
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <span className="font-medium">
              {lastDropAction.operation === 'move' ? 'Moved' : 'Copied'} {lastDropAction.sourceNames.length} item(s)
            </span>
            <span className="text-[rgb(var(--color-text-muted))]">
              to /{lastDropAction.destPath.slice(-1)[0] || 'root'}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-subtle))] font-mono">
              {lastDropAction.isSameDrive ? 'Same drive' : 'Cross-drive'}
            </span>
          </div>

          <div className="h-4 w-[1px] bg-[rgb(var(--color-border-base))] mx-1" />

          {/* Quick Action button to switch action */}
          {lastDropAction.operation === 'move' ? (
            <button
              id="drop-quick-switch-to-copy-btn"
              onClick={() => handleSwitchDropToCopy(lastDropAction)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-medium cursor-pointer transition-colors"
              title="Keep original files in source folder too"
            >
              <Copy className="w-3 h-3" />
              <span>Copy instead</span>
            </button>
          ) : (
            <button
              id="drop-quick-switch-to-move-btn"
              onClick={() => handleSwitchDropToMove(lastDropAction)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-medium cursor-pointer transition-colors"
              title="Remove original files from source folder"
            >
              <MoveRight className="w-3 h-3" />
              <span>Move instead</span>
            </button>
          )}

          <button
            id="drop-quick-undo-btn"
            onClick={() => handleUndoDropAction(lastDropAction)}
            className="flex items-center gap-1 px-2 py-1 rounded-full hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-muted))] cursor-pointer transition-colors"
            title="Revert this drop operation"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Undo</span>
          </button>

          <button
            id="drop-quick-dismiss-btn"
            onClick={() => setLastDropAction(null)}
            className="p-1 rounded-full hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-subtle))] hover:text-[rgb(var(--color-text-base))] cursor-pointer transition-colors"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 8. Floating Gmail-style AI Chat Window */}
      <FloatingAIChat
        isOpen={showAIChat}
        isMinimized={isAIChatMinimized}
        isExpanded={isAIChatExpanded}
        currentPath={currentActivePath}
        selectedItemNames={currentActiveSelected}
        onClose={() => {
          setShowAIChat(false);
          StorageService.setLocalItem('show_floating_ai_chat', false);
          addToast('info', 'AI Chat closed. Click "Ask AI" in toolbar, footer, or press Alt+A to reopen.');
        }}
        onToggleMinimize={() => setIsAIChatMinimized((prev) => !prev)}
        onToggleExpand={() => setIsAIChatExpanded((prev) => !prev)}
        onOpen={handleOpenAIChat}
        onNotify={addToast}
      />

      {/* Floating Reopen Button (visible when user closes the chat window) */}
      {!showAIChat && (
        <button
          id="reopen-floating-ai-chat-btn"
          onClick={handleOpenAIChat}
          title="Open AI Assistant (Alt+A)"
          className="fixed bottom-12 right-5 z-40 flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-full shadow-lg hover:shadow-xl hover:shadow-purple-500/25 transition-all duration-200 group hover:scale-105 active:scale-95 cursor-pointer ring-1 ring-white/20"
        >
          <Sparkles className="w-4 h-4 text-amber-300 animate-pulse group-hover:rotate-12 transition-transform" />
          <span className="text-xs font-semibold tracking-wide">Ask AI</span>
        </button>
      )}

      {/* 10. Global Full-Text Search Dialog (Bloom Filter + Inverted Index) */}
      <GlobalSearchDialog
        isOpen={isGlobalSearchOpen}
        onClose={() => setIsGlobalSearchOpen(false)}
        vfs={vfsRef.current}
        initialQuery={filterQuery || ''}
        onNavigateToItem={(path: string[]) => {
          handleNavigatePane(activePane, path);
          addToast('info', `Navigated to /${path.join('/')}`);
        }}
        onOpenFile={(node: FileSystemNode, path: string[]) => {
          handleOpenFile(node, path);
        }}
      />

      {/* 9. Toast Notifications */}
      <Toasts toasts={toasts} onDismiss={removeToast} />
    </div>
  );
};
