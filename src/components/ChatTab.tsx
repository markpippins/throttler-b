import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, AlertCircle } from 'lucide-react';
import { GeminiChatService, ChatMessage } from '../services/geminiChatService';

export const ChatTab: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'model',
      text: 'Hello! I am your AI Workspace Assistant. Ask me anything about files, code, architectural notes, or search queries.',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatServiceRef = useRef<GeminiChatService | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatServiceRef.current = new GeminiChatService();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = input.trim();
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

      const stream = chatServiceRef.current.sendMessageStream(text);
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

  return (
    <div className="flex flex-col h-full bg-[rgb(var(--color-surface-base))] text-xs">
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
        {messages.map((msg, index) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={index}
              className={`flex items-start gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                  isUser
                    ? 'bg-blue-600 text-white'
                    : 'bg-[rgb(var(--color-accent-bg))] text-[rgb(var(--color-accent-text))]'
                }`}
              >
                {isUser ? <User className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
              </div>

              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 leading-relaxed shadow-sm whitespace-pre-wrap break-words ${
                  isUser
                    ? 'bg-blue-600 text-white'
                    : 'bg-[rgb(var(--color-surface-muted))] border border-[rgb(var(--color-border-base))] text-[rgb(var(--color-text-base))]'
                }`}
              >
                {msg.text || (isLoading && index === messages.length - 1 ? 'Typing...' : '')}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <form
        onSubmit={handleSend}
        className="p-2 border-t border-[rgb(var(--color-border-base))] bg-[rgb(var(--color-surface-muted))] flex items-center gap-1.5"
      >
        <textarea
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Ask AI assistant..."
          className="flex-1 bg-[rgb(var(--color-surface-input))] border border-[rgb(var(--color-border-input))] rounded-md px-2.5 py-1.5 text-xs text-[rgb(var(--color-text-base))] outline-none resize-none focus:ring-1 focus:ring-[rgb(var(--color-accent-text))]"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="p-2 rounded-md bg-[rgb(var(--color-accent-bg))] text-[rgb(var(--color-accent-text))] disabled:opacity-40 hover:opacity-90 transition-opacity flex-shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
