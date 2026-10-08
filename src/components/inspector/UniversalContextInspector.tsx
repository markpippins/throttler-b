import React, { useState } from 'react';
import {
  FileText,
  Shield,
  Layers,
  Database,
  Fingerprint,
  Edit3,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Copy,
  Check,
  Code,
  Tag,
  Clock,
  Key,
} from 'lucide-react';
import { EpistemicEnvelope } from '../../surface/types';
import { GovernedMutationAffordance } from '../dialogs/GovernedMutationAffordance';

export interface UniversalInspectorEntity {
  id: string;
  name: string;
  type: 'vfs-file' | 'vfs-dir' | 'sol-concept' | 'aegis-state' | 'shrapnel-entity' | 'tla-state' | 'tla-invariant' | 'tla-transition' | 'uml-class' | 'generic';
  envelope?: EpistemicEnvelope;
  properties: Record<string, unknown>;
  lineageDigest?: string;
}

export interface UniversalContextInspectorProps {
  entity?: UniversalInspectorEntity | null;
  onMutationCommitted?: (entityId: string, newName: string) => void;
  className?: string;
}

export const UniversalContextInspector: React.FC<UniversalContextInspectorProps> = ({
  entity,
  onMutationCommitted,
  className = '',
}) => {
  const [isRenameOpen, setIsRenameOpen] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!entity) {
    return (
      <div className={`bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center text-center text-slate-500 font-mono text-xs ${className}`}>
        <Layers className="w-8 h-8 opacity-30 mb-2 text-slate-400" />
        <span className="font-semibold text-slate-400">Universal Context Inspector</span>
        <span className="text-[11px] text-slate-600 mt-1">Select an item in VFS, SOL, Aegis State Machine, or Shrapnel to inspect properties</span>
      </div>
    );
  }

  const envelope = entity.envelope || 'live';

  const copyValue = (val: string, keyName: string) => {
    navigator.clipboard.writeText(val);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col ${className}`}>
      {/* Header */}
      <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-bold">
              {entity.type}
            </span>
            <span
              className={`text-[9px] font-mono px-1.5 py-0.5 rounded uppercase font-bold border ${
                envelope === 'live'
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                  : 'bg-violet-950/60 border-violet-500/40 text-violet-300'
              }`}
            >
              {envelope}
            </span>
          </div>
          <h3 className="text-sm font-semibold text-slate-100 font-mono truncate max-w-[240px]">
            {entity.name}
          </h3>
          <p className="text-[11px] font-mono text-slate-500 truncate max-w-[240px]">
            ID: {entity.id}
          </p>
        </div>

        {/* Governed Action Trigger (Category B Mutation) */}
        <button
          onClick={() => setIsRenameOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors border border-slate-700"
          title="Trigger Governed Rename (Category B)"
        >
          <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Rename</span>
        </button>
      </div>

      {/* Property Cards */}
      <div className="p-4 space-y-3 overflow-y-auto flex-1 max-h-[500px]">
        {/* Lineage Digest Card */}
        {entity.lineageDigest && (
          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <span className="flex items-center gap-1.5">
                <Fingerprint className="w-3.5 h-3.5 text-slate-400" />
                Lineage Digest (SHA-256)
              </span>
              <button
                onClick={() => copyValue(entity.lineageDigest!, 'digest')}
                className="text-[10px] text-slate-400 hover:text-slate-200"
              >
                {copiedKey === 'digest' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
            <p className="text-[11px] font-mono text-slate-300 break-all">
              {entity.lineageDigest}
            </p>
          </div>
        )}

        {/* Polymorphic Properties Card */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-400 font-mono uppercase tracking-wider">
            Entity Properties
          </label>
          <div className="bg-slate-950/80 rounded-xl border border-slate-800 divide-y divide-slate-800/80 text-xs font-mono">
            {Object.entries(entity.properties).map(([k, v]) => {
              const valStr = typeof v === 'object' ? JSON.stringify(v) : String(v);
              return (
                <div key={k} className="p-2.5 flex items-center justify-between gap-2">
                  <span className="text-slate-400 text-[11px]">{k}</span>
                  <div className="flex items-center gap-1.5 max-w-[65%]">
                    <span className="text-slate-200 text-[11px] truncate font-medium">
                      {valStr}
                    </span>
                    <button
                      onClick={() => copyValue(valStr, k)}
                      className="text-slate-500 hover:text-slate-300"
                      title="Copy"
                    >
                      {copiedKey === k ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Epistemic Provenance Card */}
        <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-1 text-xs font-mono text-slate-400">
          <div className="flex items-center gap-1.5 font-semibold text-slate-300">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>Epistemic Authority Model</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Status: {envelope === 'live' ? 'Witnessed by server daemon' : 'Demo / local fixture'}
          </p>
        </div>
      </div>

      {/* Governed Mutation Affordance Modal */}
      <GovernedMutationAffordance
        isOpen={isRenameOpen}
        onClose={() => setIsRenameOpen(false)}
        title={`Governed Rename: ${entity.name}`}
        actionType="rename"
        targetId={entity.id}
        targetName={entity.name}
        targetType={entity.type}
        envelope={envelope}
        onCommit={async (req, receipt) => {
          const newName = String(req.parameters.targetName || entity.name);
          onMutationCommitted?.(entity.id, newName);
          return { success: true };
        }}
      />
    </div>
  );
};
