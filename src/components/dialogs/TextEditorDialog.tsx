import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  X,
  Save,
  Bold,
  Italic,
  Code,
  Link2,
  Heading,
  Eye,
  Edit3,
  Columns
} from 'lucide-react';

interface TextEditorDialogProps {
  title: string;
  initialContent: string;
  path: string[];
  onSave: (content: string) => void;
  onClose: () => void;
}

export const TextEditorDialog: React.FC<TextEditorDialogProps> = ({
  title,
  initialContent,
  path,
  onSave,
  onClose,
}) => {
  const [content, setContent] = useState(initialContent);
  const [viewMode, setViewMode] = useState<'edit' | 'preview' | 'split'>('split');
  const [isSaved, setIsSaved] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setContent(initialContent);
    setIsSaved(true);
  }, [initialContent]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    setIsSaved(false);
  };

  const handleSave = () => {
    onSave(content);
    setIsSaved(true);
  };

  const insertFormatting = (prefix: string, suffix: string = prefix, placeholder: string = 'text') => {
    const el = textareaRef.current;
    if (!el) return;

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const val = el.value;
    const selected = val.substring(start, end) || placeholder;

    const replacement = prefix + selected + suffix;
    const nextVal = val.substring(0, start) + replacement + val.substring(end);
    setContent(nextVal);
    setIsSaved(false);

    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    }, 0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in text-xs">
      <div className="w-full max-w-4xl h-[85vh] bg-[rgb(var(--color-surface-dialog))] border border-[rgb(var(--color-border-base))] rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Title Bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[rgb(var(--color-border-base))] bg-[rgb(var(--color-surface-muted))]">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-500" />
            <span className="font-semibold text-sm text-[rgb(var(--color-text-base))]">
              {title}
            </span>
            {!isSaved && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 font-medium">
                Unsaved Changes
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgb(var(--color-accent-bg))] text-[rgb(var(--color-accent-text))] font-medium hover:opacity-90"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-muted))]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Action / Markdown Formatting Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-[rgb(var(--color-border-base))] bg-[rgb(var(--color-surface-muted))]">
          <div className="flex items-center gap-1">
            <button
              onClick={() => insertFormatting('**', '**', 'bold')}
              title="Bold"
              className="p-1.5 rounded hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-muted))]"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => insertFormatting('*', '*', 'italic')}
              title="Italic"
              className="p-1.5 rounded hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-muted))]"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => insertFormatting('### ', '', 'Heading')}
              title="Heading"
              className="p-1.5 rounded hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-muted))]"
            >
              <Heading className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => insertFormatting('`', '`', 'code')}
              title="Code"
              className="p-1.5 rounded hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-muted))]"
            >
              <Code className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                const url = prompt('Enter link URL:');
                if (url) insertFormatting('[', `](${url})`, 'link text');
              }}
              title="Insert Link"
              className="p-1.5 rounded hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-muted))]"
            >
              <Link2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setViewMode('edit')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors ${
                viewMode === 'edit'
                  ? 'bg-[rgb(var(--color-accent-bg))] text-[rgb(var(--color-accent-text))] font-medium'
                  : 'text-[rgb(var(--color-text-muted))] hover:bg-[rgb(var(--color-surface-hover))]'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>

            <button
              onClick={() => setViewMode('split')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors ${
                viewMode === 'split'
                  ? 'bg-[rgb(var(--color-accent-bg))] text-[rgb(var(--color-accent-text))] font-medium'
                  : 'text-[rgb(var(--color-text-muted))] hover:bg-[rgb(var(--color-surface-hover))]'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Split</span>
            </button>

            <button
              onClick={() => setViewMode('preview')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors ${
                viewMode === 'preview'
                  ? 'bg-[rgb(var(--color-accent-bg))] text-[rgb(var(--color-accent-text))] font-medium'
                  : 'text-[rgb(var(--color-text-muted))] hover:bg-[rgb(var(--color-surface-hover))]'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview</span>
            </button>
          </div>
        </div>

        {/* Editor Body */}
        <div className="flex-1 flex overflow-hidden">
          {(viewMode === 'edit' || viewMode === 'split') && (
            <div className={`h-full flex-1 p-4 ${viewMode === 'split' ? 'border-r border-[rgb(var(--color-border-base))]' : ''}`}>
              <textarea
                ref={textareaRef}
                value={content}
                onChange={handleChange}
                className="w-full h-full bg-transparent text-[rgb(var(--color-text-base))] font-mono text-xs outline-none resize-none leading-relaxed"
                placeholder="Type markdown or document contents..."
              />
            </div>
          )}

          {(viewMode === 'preview' || viewMode === 'split') && (
            <div className="h-full flex-1 p-4 overflow-y-auto bg-[rgb(var(--color-surface-muted))]">
              <div className="prose prose-sm dark:prose-invert max-w-none text-xs text-[rgb(var(--color-text-base))] leading-relaxed whitespace-pre-wrap">
                {content}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-[rgb(var(--color-border-base))] bg-[rgb(var(--color-surface-muted))] text-[11px] text-[rgb(var(--color-text-subtle))] flex items-center justify-between">
          <span>Path: /{path.join('/')}</span>
          <span>{content.length} characters | {content.split(/\s+/).filter(Boolean).length} words</span>
        </div>
      </div>
    </div>
  );
};
