import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Minus,
  Maximize2,
  Minimize2,
  X,
  Send,
  User,
  RotateCcw,
  Copy,
  Check,
  Folder,
  Code,
  Terminal,
  FileText,
  Lightbulb,
  ExternalLink,
  ChevronUp,
  MessageSquare,
} from 'lucide-react';
import { GeminiChatService, ChatMessage } from '../services/geminiChatService';

export interface FloatingAIChatProps {
  isOpen: boolean;
  isMinimized: boolean;
  isExpanded: boolean;
  currentPath: string[];
  selectedItemNames: Set<string>;
  onClose: () => void;
  onToggleMinimize: () => void;
  onToggleExpand: () => void;
  onOpen: () => void;
  onNotify?: (type: 'info' | 'success' | 'warning' | 'error', text: string) => void;
}

export const FloatingAIChat: React.FC<FloatingAIChatProps> = ({
  isOpen,
  isMinimized,
  isExpanded,
  currentPath,
  selectedItemNames,
  onClose,
  onToggleMinimize,
  onToggleExpand,
  onOpen,
  onNotify,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'model',
      text: 'Hello! I am your AI Workspace Assistant. Ask me anything about your files, code, terminal commands, or directory architecture.',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const chatServiceRef = useRef<GeminiChatService | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const pathStr = '/' + currentPath.join('/');
  const selectedCount = selectedItemNames.size;

  useEffect(() => {
    chatServiceRef.current = new GeminiChatService();
  }, []);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, isOpen, isMinimized]);

  const handleSendText = async (rawText: string) => {
    const text = rawText.trim();
    if (!text || isLoading) return;

    setInput('');
    const newMessages: ChatMessage[] = [...messages, { role: 'user', text }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      if (!chatServiceRef.current) {
        chatServiceRef.current = new GeminiChatService();
      }

      setMessages((prev) => [...prev, { role: 'model', text: '' }]);

      // Prepend context if relevant
      const contextPrefix = `[Context: Current folder: ${pathStr}, Selected items: ${selectedCount}]\nUser query: `;
      const stream = chatServiceRef.current.sendMessageStream(contextPrefix + text);
      let accumulated = '';

      for await (const chunk of stream) {
        accumulated += chunk;
        setMessages((prev) => {
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          if (updated[lastIdx].role === 'model') {
            updated[lastIdx].text = accumulated;
          }
          return updated;
        });
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: 'model', text: `Error: ${err.message || 'Failed to generate response'}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    handleSendText(input);
  };

  const handleResetChat = () => {
    setMessages([
      {
        role: 'model',
        text: 'Workspace context refreshed. How can I help you today?',
      },
    ]);
    onNotify?.('info', 'AI Chat history cleared');
  };

  const handleCopyMessage = (text: string, index: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
      onNotify?.('success', 'Copied to clipboard');
    });
  };

  const quickPrompts = [
    { label: 'Summarize Folder', prompt: `What is the purpose and structure of the current folder (${pathStr})?` },
    { label: 'Terminal Help', prompt: 'What are the top shell/terminal commands available in this explorer?' },
    { label: 'File Tips', prompt: 'How do I organize files and use bookmarks effectively in this app?' },
    { label: 'Draft Readme', prompt: `Can you draft a clean README.md overview for a project in ${pathStr}?` },
  ];

  if (!isOpen) return null;

  // 1. Minimized State (Compact Gmail-style bottom dock pill)
  if (isMinimized) {
    return (
      <div
        id="floating-ai-chat-minimized"
        onClick={onToggleMinimize}
        className="fixed bottom-10 right-6 z-40 w-72 h-10 bg-[rgb(var(--color-surface-base))] border border-[rgb(var(--color-border-base))] rounded-t-xl shadow-2xl flex items-center justify-between px-3 cursor-pointer hover:bg-[rgb(var(--color-surface-hover))] transition-all group select-none animate-in slide-in-from-bottom-2 duration-150"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white shadow-sm flex-shrink-0">
            <Sparkles className="w-3 h-3 text-amber-300" />
          </div>
          <span className="text-xs font-semibold text-[rgb(var(--color-text-base))] truncate">
            AI Assistant
          </span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" title="Ready" />
        </div>

        <div className="flex items-center gap-1">
          <button
            id="floating-ai-chat-restore-btn"
            onClick={(e) => {
              e.stopPropagation();
              onToggleMinimize();
            }}
            title="Expand chat window"
            className="p-1 hover:bg-[rgb(var(--color-surface-muted))] rounded text-[rgb(var(--color-text-subtle))] hover:text-[rgb(var(--color-text-base))] transition-colors"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            id="floating-ai-chat-min-close-btn"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            title="Close AI Assistant"
            className="p-1 hover:bg-[rgb(var(--color-surface-muted))] rounded text-[rgb(var(--color-text-subtle))] hover:text-rose-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // 2. Open / Expanded State (Gmail compose floating window)
  return (
    <div
      id="floating-ai-chat-window"
      className={`fixed bottom-10 right-6 z-40 bg-[rgb(var(--color-surface-base))] border border-[rgb(var(--color-border-base))] rounded-t-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-200 animate-in slide-in-from-bottom-4 ${
        isExpanded
          ? 'w-[640px] max-w-[94vw] h-[580px] max-h-[82vh]'
          : 'w-[390px] sm:w-[420px] max-w-[92vw] h-[490px] max-h-[78vh]'
      }`}
    >
      {/* Window Header */}
      <div
        id="floating-ai-chat-header"
        className="h-11 px-3 bg-gradient-to-r from-purple-900/30 via-[rgb(var(--color-surface-muted))] to-[rgb(var(--color-surface-muted))] border-b border-[rgb(var(--color-border-base))] flex items-center justify-between select-none cursor-pointer flex-shrink-0"
        onClick={(e) => {
          // If clicked directly on header background, toggle minimize
          if (e.target === e.currentTarget) {
            onToggleMinimize();
          }
        }}
      >
        <div className="flex items-center gap-2 min-w-0" onClick={onToggleMinimize}>
          <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white shadow-sm flex-shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-[rgb(var(--color-text-base))] tracking-tight">
                AI Assistant
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-400 font-medium font-mono">
                Copilot
              </span>
            </div>
          </div>
        </div>

        {/* Window Controls */}
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            id="floating-ai-chat-reset-btn"
            onClick={handleResetChat}
            title="Reset conversation history"
            className="p-1 hover:bg-[rgb(var(--color-surface-hover))] rounded-md text-[rgb(var(--color-text-subtle))] hover:text-[rgb(var(--color-text-base))] transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            id="floating-ai-chat-minimize-btn"
            onClick={onToggleMinimize}
            title="Minimize to bottom bar"
            className="p-1 hover:bg-[rgb(var(--color-surface-hover))] rounded-md text-[rgb(var(--color-text-subtle))] hover:text-[rgb(var(--color-text-base))] transition-colors"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            id="floating-ai-chat-expand-btn"
            onClick={onToggleExpand}
            title={isExpanded ? 'Restore standard size' : 'Expand window'}
            className="p-1 hover:bg-[rgb(var(--color-surface-hover))] rounded-md text-[rgb(var(--color-text-subtle))] hover:text-[rgb(var(--color-text-base))] transition-colors"
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            id="floating-ai-chat-close-btn"
            onClick={onClose}
            title="Close AI Assistant"
            className="p-1 hover:bg-rose-500/20 rounded-md text-[rgb(var(--color-text-subtle))] hover:text-rose-500 transition-colors ml-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Context Banner */}
      <div className="px-3 py-1 bg-[rgb(var(--color-surface-muted))]/60 border-b border-[rgb(var(--color-border-base))] flex items-center justify-between text-[11px] text-[rgb(var(--color-text-subtle))]">
        <div className="flex items-center gap-1.5 truncate">
          <Folder className="w-3 h-3 text-amber-500 flex-shrink-0" />
          <span className="font-mono truncate" title={pathStr}>
            {pathStr}
          </span>
          {selectedCount > 0 && (
            <span className="text-blue-500 font-medium">({selectedCount} selected)</span>
          )}
        </div>
        <span className="text-[10px] text-purple-400 font-medium flex-shrink-0">Gemini 2.5 Flash</span>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 text-xs bg-[rgb(var(--color-surface-base))]">
        {messages.map((msg, index) => {
          const isUser = msg.role === 'user';
          const isLast = index === messages.length - 1;

          return (
            <div
              key={index}
              className={`flex items-start gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'} animate-in fade-in-50 duration-150`}
            >
              {/* Avatar */}
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                  isUser
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gradient-to-tr from-purple-600 to-indigo-500 text-white shadow-sm'
                }`}
              >
                {isUser ? <User className="w-3.5 h-3.5" /> : <Sparkles className="w-3 h-3 text-amber-300" />}
              </div>

              {/* Message Bubble */}
              <div className="flex flex-col gap-1 max-w-[86%] group">
                <div
                  className={`rounded-2xl px-3 py-2 leading-relaxed shadow-sm whitespace-pre-wrap break-words ${
                    isUser
                      ? 'bg-blue-600 text-white rounded-tr-xs'
                      : 'bg-[rgb(var(--color-surface-muted))] border border-[rgb(var(--color-border-base))] text-[rgb(var(--color-text-base))] rounded-tl-xs'
                  }`}
                >
                  {msg.text || (isLoading && isLast ? (
                    <div className="flex items-center gap-1.5 text-[rgb(var(--color-text-subtle))] py-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse delay-100" />
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse delay-200" />
                      <span className="text-[11px] ml-1">Thinking...</span>
                    </div>
                  ) : '')}
                </div>

                {/* Quick copy / action footer */}
                {!isUser && msg.text && (
                  <div className="flex items-center gap-2 px-1 text-[10px] text-[rgb(var(--color-text-subtle))] opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleCopyMessage(msg.text, index)}
                      className="hover:text-[rgb(var(--color-text-base))] flex items-center gap-1"
                    >
                      {copiedIndex === index ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-500" />
                          <span className="text-emerald-500">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompt Chips */}
      {messages.length <= 2 && (
        <div className="px-3 py-1.5 bg-[rgb(var(--color-surface-muted))]/40 border-t border-[rgb(var(--color-border-base))] flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {quickPrompts.map((qp, idx) => (
            <button
              key={idx}
              disabled={isLoading}
              onClick={() => handleSendText(qp.prompt)}
              className="px-2 py-1 rounded-full bg-[rgb(var(--color-surface-base))] hover:bg-purple-500/10 hover:text-purple-500 border border-[rgb(var(--color-border-base))] text-[10px] font-medium text-[rgb(var(--color-text-subtle))] whitespace-nowrap transition-colors flex-shrink-0"
            >
              {qp.label}
            </button>
          ))}
        </div>
      )}

      {/* Input Area */}
      <form
        onSubmit={handleFormSubmit}
        className="p-2 border-t border-[rgb(var(--color-border-base))] bg-[rgb(var(--color-surface-muted))] flex items-center gap-1.5 flex-shrink-0"
      >
        <textarea
          ref={textareaRef}
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleFormSubmit();
            }
          }}
          placeholder="Ask AI assistant... (Enter to send, Shift+Enter for newline)"
          className="flex-1 bg-[rgb(var(--color-surface-input))] border border-[rgb(var(--color-border-input))] rounded-xl px-3 py-2 text-xs text-[rgb(var(--color-text-base))] outline-none resize-none focus:ring-1 focus:ring-purple-500 placeholder:text-[rgb(var(--color-text-subtle))] max-h-24"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="p-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white disabled:opacity-40 transition-all flex-shrink-0 shadow-sm"
          title="Send message"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
