import React from 'react';
import { ToastMessage } from '../types';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

interface ToastsProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const Toasts: React.FC<ToastsProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-10 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        let bg = 'bg-[rgb(var(--color-surface-dialog))] text-[rgb(var(--color-text-base))] border-[rgb(var(--color-border-base))]';
        let icon = <Info className="w-5 h-5 text-blue-500 flex-shrink-0" />;

        if (toast.type === 'success') {
          icon = <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />;
        } else if (toast.type === 'error') {
          icon = <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />;
        } else if (toast.type === 'warning') {
          icon = <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0" />;
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between p-3 rounded-lg border shadow-lg transition-all animate-slide-in-right ${bg}`}
          >
            <div className="flex items-center gap-2.5 min-w-0 pr-2">
              {icon}
              <span className="text-sm font-medium break-words">{toast.text}</span>
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="p-1 rounded hover:bg-[rgb(var(--color-surface-hover))] text-[rgb(var(--color-text-subtle))] hover:text-[rgb(var(--color-text-base))]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
