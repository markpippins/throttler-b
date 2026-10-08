/**
 * Aegis IDE Header Component
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Layers,
  CheckCircle2,
  ShieldCheck,
  Plus,
  RefreshCw,
  Clock,
  Sparkles,
  Sun,
  Moon,
  Cpu,
  Download,
  ChevronDown,
  FileCode,
  FileCheck,
  Terminal,
  Copy,
  Check,
} from 'lucide-react';
import { Registry, ValidationResult, ModelCheckResult, ThemeMode } from '../types';

interface HeaderProps {
  registries: Registry[];
  activeRegistry: Registry | null;
  onSelectRegistry: (id: string) => void;
  onNewRegistry: () => void;
  onValidate: () => void;
  onModelCheck: () => void;
  onExportTla: (format?: 'tla' | 'cfg' | 'both') => void;
  isValidating: boolean;
  isChecking: boolean;
  lastValidation?: ValidationResult | null;
  lastModelCheck?: ModelCheckResult | null;
  healthOk: boolean;
  theme: ThemeMode;
  onToggleTheme: (theme: ThemeMode) => void;
}

export const Header: React.FC<HeaderProps> = ({
  registries,
  activeRegistry,
  onSelectRegistry,
  onNewRegistry,
  onValidate,
  onModelCheck,
  onExportTla,
  isValidating,
  isChecking,
  lastValidation,
  lastModelCheck,
  healthOk,
  theme,
  onToggleTheme,
}) => {
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [cmdCopied, setCmdCopied] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false);
      }
    };
    if (exportMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [exportMenuOpen]);

  const moduleName = (activeRegistry?.tla_plus_module || activeRegistry?.name || 'StateMachine')
    .replace(/[^a-zA-Z0-9_]/g, '_');
  const tlcCliCommand = `java -cp tla2tools.jar tlc2.TLC ${moduleName}.tla -config ${moduleName}.cfg`;

  const handleCopyCmd = () => {
    navigator.clipboard.writeText(tlcCliCommand);
    setCmdCopied(true);
    setTimeout(() => setCmdCopied(false), 2000);
  };
  return (
    <header className="border-b border-[#2D333B] bg-[#0F1115] sticky top-0 z-40 select-none flex flex-col">
      {/* Row 1: Brand Identity, Engine Status & Theme Selector */}
      <div className="flex items-center justify-between px-5 py-2 border-b border-[#21262D] bg-[#0A0C10]">
        <div className="flex items-center space-x-3">
          {/* Aegis Logo & Badge */}
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#16191E] border border-[#2D333B] flex items-center justify-center text-[#3B82F6] shadow-sm">
              <Layers className="w-4 h-4" />
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-[#F0F6FC] tracking-tight text-sm">
                Aegis IDE
              </span>
              <span className="text-[10px] font-mono font-medium uppercase px-1.5 py-0.5 rounded bg-[#16191E] text-[#8B949E] border border-[#2D333B]">
                TLC / TLA+
              </span>
              <span
                title={healthOk ? 'Aegis REST API Online (/health)' : 'Checking Aegis API...'}
                className={`inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                  healthOk
                    ? 'bg-[#238636]/15 text-[#3fb950] border-[#238636]/40'
                    : 'bg-[#D29922]/15 text-[#d29922] border-[#D29922]/40'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                    healthOk ? 'bg-[#3fb950] animate-pulse' : 'bg-[#d29922]'
                  }`}
                />
                {healthOk ? 'API 3116 Online' : 'Connecting...'}
              </span>
            </div>
          </div>

          <div className="h-4 w-px bg-[#2D333B] hidden md:block" />
          <p className="text-[11px] text-[#8B949E] hidden md:block">
            State Machine Registry, Formal Verification & Simulation
          </p>
        </div>

        {/* Theme Mode Segmented Toggle */}
        <div
          id="theme-toggle-group"
          className="flex items-center bg-[#16191E] border border-[#2D333B] rounded-lg p-0.5"
          role="group"
          aria-label="IDE Theme Selector"
        >
          <button
            id="theme-btn-light"
            type="button"
            title="Switch to Light Theme"
            onClick={() => onToggleTheme('light')}
            className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
              theme === 'light'
                ? 'bg-[#2563EB] text-white shadow-xs font-semibold'
                : 'text-[#8B949E] hover:text-[#C9D1D9] hover:bg-[#21262D]'
            }`}
          >
            <Sun className="w-3 h-3" />
            <span>Light</span>
          </button>

          <button
            id="theme-btn-dark"
            type="button"
            title="Switch to Dark Theme"
            onClick={() => onToggleTheme('dark')}
            className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
              theme === 'dark'
                ? 'bg-[#3B82F6] text-white shadow-xs font-semibold'
                : 'text-[#8B949E] hover:text-[#C9D1D9] hover:bg-[#21262D]'
            }`}
          >
            <Moon className="w-3 h-3" />
            <span>Dark</span>
          </button>

          <button
            id="theme-btn-steel"
            type="button"
            title="Switch to Steel Blue Theme"
            onClick={() => onToggleTheme('steel')}
            className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
              theme === 'steel'
                ? 'bg-[#38BDF8] text-[#0F172A] shadow-xs font-semibold'
                : 'text-[#8B949E] hover:text-[#C9D1D9] hover:bg-[#21262D]'
            }`}
          >
            <Cpu className="w-3 h-3" />
            <span>Steel</span>
          </button>
        </div>
      </div>

      {/* Row 2: Registry Selection, Verification Status Badges & Action Toolbar */}
      <div className="flex items-center justify-between px-5 py-2 bg-[#0F1115]">
        {/* Left: Registry Selector & Verification Badges */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <label htmlFor="registry-select" className="text-xs font-semibold text-[#8B949E]">
              Registry:
            </label>
            <div className="relative">
              <select
                id="registry-select"
                value={activeRegistry?.id || ''}
                onChange={(e) => onSelectRegistry(e.target.value)}
                className="text-xs font-medium bg-[#16191E] border border-[#2D333B] rounded-md py-1.5 pl-2.5 pr-7 text-[#C9D1D9] focus:outline-none focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6]"
              >
                {registries.map((r) => (
                  <option key={r.id} value={r.id} className="bg-[#16191E] text-[#C9D1D9]">
                    {r.name} (v{r.version || '1.0.0'}) {!r.is_active ? '[inactive]' : ''}
                  </option>
                ))}
              </select>
            </div>

            <button
              id="btn-new-registry"
              onClick={onNewRegistry}
              className="inline-flex items-center space-x-1 text-xs font-medium text-[#C9D1D9] bg-[#16191E] hover:bg-[#21262D] border border-[#2D333B] rounded-md px-2.5 py-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-[#3B82F6]" />
              <span>New</span>
            </button>

            {activeRegistry && (
              <div className="hidden xl:flex items-center space-x-2 text-[11px] text-[#8B949E] pl-2 border-l border-[#2D333B]">
                <span className="font-mono text-[#8B949E]" title={`Registry ID: ${activeRegistry.id}`}>
                  {activeRegistry.id.slice(0, 8)}...
                </span>
                {activeRegistry.tags && activeRegistry.tags.length > 0 && (
                  <div className="flex items-center space-x-1">
                    {activeRegistry.tags.slice(0, 2).map((tag) => (
                      <span key={tag} className="px-1.5 py-0.5 bg-[#16191E] text-[#8B949E] border border-[#2D333B] rounded text-[10px] font-mono">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {(lastValidation || lastModelCheck) && (
            <div className="h-5 w-px bg-[#2D333B] hidden sm:block" />
          )}

          {/* Quick Status Badges */}
          <div className="flex items-center space-x-2">
            {lastValidation && (
              <div
                className={`text-xs px-2.5 py-1 rounded-md border flex items-center space-x-1.5 ${
                  lastValidation.is_valid
                    ? 'bg-[#238636]/15 text-[#3fb950] border-[#238636]/40'
                    : 'bg-[#f85149]/15 text-[#f85149] border-[#f85149]/40'
                }`}
              >
                {lastValidation.is_valid ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#3fb950]" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-[#f85149]" />
                )}
                <span>{lastValidation.is_valid ? 'Valid Spec' : `${lastValidation.errors.length} Errors`}</span>
              </div>
            )}

            {lastModelCheck && (
              <div
                className={`text-xs px-2.5 py-1 rounded-md border flex items-center space-x-1.5 ${
                  lastModelCheck.status === 'pass'
                    ? 'bg-[#238636]/15 text-[#3fb950] border-[#238636]/40'
                    : lastModelCheck.status === 'fail'
                    ? 'bg-[#f85149]/15 text-[#f85149] border-[#f85149]/40'
                    : 'bg-[#d29922]/15 text-[#d29922] border-[#d29922]/40'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span className="font-semibold uppercase tracking-wider text-[10px]">
                  {lastModelCheck.status}
                </span>
                <span className="text-[#8B949E] font-normal font-mono">
                  ({lastModelCheck.execution_time_ms}ms)
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Action Controls */}
        <div className="flex items-center space-x-2.5">
          {/* Export .tla Model Dropdown / Split Button */}
          <div className="relative" ref={exportDropdownRef}>
            <div className="inline-flex rounded-md shadow-sm">
              <button
                id="btn-export-tla"
                type="button"
                onClick={() => onExportTla('tla')}
                disabled={!activeRegistry}
                title={`Export current model as downloadable ${moduleName}.tla for verification outside the web IDE`}
                className="inline-flex items-center space-x-1.5 text-xs font-medium text-[#C9D1D9] bg-[#16191E] hover:bg-[#21262D] hover:text-[#F0F6FC] border border-[#2D333B] hover:border-[#3B82F6]/50 rounded-l-md px-2.5 py-1.5 shadow-xs transition-colors disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5 text-[#38BDF8]" />
                <span>Export .tla</span>
              </button>

              <button
                id="btn-export-dropdown-toggle"
                type="button"
                onClick={() => setExportMenuOpen(!exportMenuOpen)}
                disabled={!activeRegistry}
                aria-label="More export options"
                title="More export options (.tla, .cfg, CLI verification command)"
                className="inline-flex items-center justify-center text-xs font-medium text-[#8B949E] hover:text-[#F0F6FC] bg-[#16191E] hover:bg-[#21262D] border-y border-r border-[#2D333B] hover:border-[#3B82F6]/50 rounded-r-md px-1.5 py-1.5 shadow-xs transition-colors disabled:opacity-50"
              >
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${exportMenuOpen ? 'rotate-180 text-[#38BDF8]' : ''}`} />
              </button>
            </div>

            {/* Dropdown Menu for Offline Verification Export */}
            {exportMenuOpen && (
              <div
                id="export-tla-menu"
                className="absolute right-0 mt-1.5 z-50 w-72 bg-[#16191E] border border-[#2D333B] rounded-lg shadow-2xl p-1.5 text-xs animate-in fade-in zoom-in-95 duration-100"
              >
                <div className="px-2.5 py-1.5 border-b border-[#2D333B] mb-1">
                  <span className="font-semibold text-[#F0F6FC] text-xs">Offline Verification Export</span>
                  <p className="text-[10px] text-[#8B949E]">
                    Export formal model files for TLC CLI or TLA+ Toolbox
                  </p>
                </div>

                <button
                  id="export-tla-option"
                  type="button"
                  onClick={() => {
                    onExportTla('tla');
                    setExportMenuOpen(false);
                  }}
                  className="w-full text-left px-2.5 py-2 rounded-md hover:bg-[#21262D] transition-colors flex items-start space-x-2.5 group cursor-pointer"
                >
                  <FileCode className="w-4 h-4 text-[#38BDF8] shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-[#C9D1D9] group-hover:text-white flex items-center justify-between">
                      <span>Download {moduleName}.tla</span>
                      <span className="text-[9px] px-1 bg-[#0F1115] border border-[#2D333B] rounded text-[#8B949E]">TLA+</span>
                    </div>
                    <p className="text-[10px] text-[#8B949E] truncate">
                      Full formal specification formula & actions
                    </p>
                  </div>
                </button>

                <button
                  id="export-cfg-option"
                  type="button"
                  onClick={() => {
                    onExportTla('cfg');
                    setExportMenuOpen(false);
                  }}
                  className="w-full text-left px-2.5 py-2 rounded-md hover:bg-[#21262D] transition-colors flex items-start space-x-2.5 group cursor-pointer"
                >
                  <FileCheck className="w-4 h-4 text-[#3fb950] shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-[#C9D1D9] group-hover:text-white flex items-center justify-between">
                      <span>Download {moduleName}.cfg</span>
                      <span className="text-[9px] px-1 bg-[#0F1115] border border-[#2D333B] rounded text-[#8B949E]">Config</span>
                    </div>
                    <p className="text-[10px] text-[#8B949E] truncate">
                      TLC model configuration, invariants & constants
                    </p>
                  </div>
                </button>

                <button
                  id="export-both-option"
                  type="button"
                  onClick={() => {
                    onExportTla('both');
                    setExportMenuOpen(false);
                  }}
                  className="w-full text-left px-2.5 py-2 rounded-md hover:bg-[#21262D] transition-colors flex items-start space-x-2.5 group cursor-pointer"
                >
                  <Download className="w-4 h-4 text-[#A855F7] shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-[#C9D1D9] group-hover:text-white flex items-center justify-between">
                      <span>Download Both (.tla + .cfg)</span>
                      <span className="text-[9px] px-1 bg-[#0F1115] border border-[#2D333B] rounded text-[#A855F7]">Package</span>
                    </div>
                    <p className="text-[10px] text-[#8B949E] truncate">
                      Ready-to-verify bundle for TLC model checking
                    </p>
                  </div>
                </button>

                <div className="mt-1.5 pt-1.5 border-t border-[#2D333B] px-2.5 pb-1">
                  <div className="flex items-center justify-between text-[10px] text-[#8B949E] mb-1">
                    <span className="flex items-center space-x-1">
                      <Terminal className="w-3 h-3 text-[#58a6ff]" />
                      <span>CLI Verification Command</span>
                    </span>
                    <button
                      id="copy-tlc-cmd-option"
                      type="button"
                      onClick={handleCopyCmd}
                      className="text-[#58a6ff] hover:text-[#79b8ff] inline-flex items-center space-x-1 cursor-pointer"
                    >
                      {cmdCopied ? (
                        <>
                          <Check className="w-3 h-3 text-[#3fb950]" />
                          <span className="text-[#3fb950]">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="p-1.5 bg-[#0F1115] border border-[#2D333B] rounded font-mono text-[9px] text-[#8B949E] select-all break-all">
                    {tlcCliCommand}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Validate Button */}
          <button
            id="btn-validate-spec"
            onClick={onValidate}
            disabled={isValidating || !activeRegistry}
            className="inline-flex items-center space-x-1.5 text-xs font-medium text-[#C9D1D9] bg-[#16191E] hover:bg-[#21262D] border border-[#2D333B] rounded-md px-3 py-1.5 shadow-sm transition-colors disabled:opacity-50"
          >
            <CheckCircle2 className={`w-3.5 h-3.5 text-[#3B82F6] ${isValidating ? 'animate-spin' : ''}`} />
            <span>{isValidating ? 'Validating...' : 'Validate Spec'}</span>
          </button>

          {/* Run TLC Model Check Button */}
          <button
            id="btn-run-model-check"
            onClick={onModelCheck}
            disabled={isChecking || !activeRegistry}
            className="inline-flex items-center space-x-1.5 text-xs font-medium text-white bg-[#3B82F6] hover:bg-[#2563EB] border border-[#3B82F6] rounded-md px-3.5 py-1.5 shadow-sm transition-colors disabled:opacity-50"
          >
            <ShieldCheck className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
            <span>{isChecking ? 'TLC Checking...' : 'Run Model Check'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
