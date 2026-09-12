import React, { useState, useEffect, useRef } from 'react';
import {
  Bold,
  Italic,
  Code,
  Link2,
  Heading,
  Eye,
  Edit3,
  Maximize2,
  Save,
  Check
} from 'lucide-react';
import { StorageService } from '../services/storageService';

interface NotesTabProps {
  currentPath: string[];
  onOpenFullEditor: (content: string, title: string, path: string[]) => void;
}

export const NotesTab: React.FC<NotesTabProps> = ({ currentPath, onOpenFullEditor }) => {
  const [content, setContent] = useState('');
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pathKey = currentPath.join('/');

  useEffect(() => {
    let isMounted = true;
    async function loadNote() {
      const note = await StorageService.getNote(pathKey);
      if (isMounted) {
        setContent(
          note?.content ??
            `# Notes for ${currentPath[currentPath.length - 1] || 'Home'}\n\n- Add tasks, references, or reminders for this folder.\n- Notes are automatically saved as you type.`
        );
      }
    }
    loadNote();
    return () => {
      isMounted = false;
    };
  }, [pathKey]);

  // Debounced auto-save
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (content) {
        setIsSaving(true);
        await StorageService.saveNote({ path: pathKey, content });
        setIsSaving(false);
        setLastSaved(new Date());
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [content, pathKey]);

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

    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    }, 0);
  };

  const handleAddLink = () => {
    const url = prompt('Enter link URL:');
    if (url) {
      insertFormatting('[', `](${url})`, 'link text');
    }
  };

  return (
    <div className="flex flex-col h-full bg-[rgb(var(--color-surface-base))] text-xs">
      {/* Formatting Toolbar */}
      <div className="flex items-center justify-between px-2 py-1 bg-[rgb(var(--color-surface-muted))] border-b border-[rgb(var(--color-border-base))]">
        <div className="flex items-center gap-1">
          <button
            onClick={() => insertFormatting('**', '**', 'bold')}
            title="Bold"
            className="p-1 rounded hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-muted))]"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertFormatting('*', '*', 'italic')}
            title="Italic"
            className="p-1 rounded hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-muted))]"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertFormatting('### ', '', 'Heading')}
            title="Heading"
            className="p-1 rounded hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-muted))]"
          >
            <Heading className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertFormatting('`', '`', 'code')}
            title="Code"
            className="p-1 rounded hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-muted))]"
          >
            <Code className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleAddLink}
            title="Insert Link"
            className="p-1 rounded hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-muted))]"
          >
            <Link2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setMode(mode === 'edit' ? 'preview' : 'edit')}
            title={mode === 'edit' ? 'Switch to Preview' : 'Switch to Edit'}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-base))]"
          >
            {mode === 'edit' ? (
              <>
                <Eye className="w-3 h-3" />
                <span>Preview</span>
              </>
            ) : (
              <>
                <Edit3 className="w-3 h-3" />
                <span>Edit</span>
              </>
            )}
          </button>

          <button
            onClick={() => onOpenFullEditor(content, `Notes: ${currentPath[currentPath.length - 1] || 'Home'}`, currentPath)}
            title="Maximize Editor"
            className="p-1 rounded hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-muted))]"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Editor / Preview Area */}
      <div className="flex-1 overflow-auto p-2">
        {mode === 'edit' ? (
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write notes in Markdown..."
            className="w-full h-full bg-transparent text-[rgb(var(--color-text-base))] font-mono text-xs outline-none resize-none leading-relaxed"
          />
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none text-xs text-[rgb(var(--color-text-base))] leading-relaxed whitespace-pre-wrap">
            {content}
          </div>
        )}
      </div>

      {/* Footer Status */}
      <div className="px-2 py-1 bg-[rgb(var(--color-surface-muted))] border-t border-[rgb(var(--color-border-base))] text-[10px] text-[rgb(var(--color-text-subtle))] flex items-center justify-between">
        <span>Path: {pathKey}</span>
        <span>
          {isSaving ? 'Saving...' : lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : 'Ready'}
        </span>
      </div>
    </div>
  );
};
