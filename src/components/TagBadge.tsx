import React from 'react';
import { X } from 'lucide-react';
import { getTagStyle } from '../utils/tagUtils';

interface TagBadgeProps {
  tag: string;
  size?: 'xs' | 'sm';
  onRemove?: () => void;
  onClick?: (e: React.MouseEvent) => void;
  active?: boolean;
  className?: string;
}

export const TagBadge: React.FC<TagBadgeProps> = ({
  tag,
  size = 'xs',
  onRemove,
  onClick,
  active = false,
  className = '',
}) => {
  const style = getTagStyle(tag);
  const isClickable = !!onClick;

  if (size === 'xs') {
    return (
      <span
        onClick={onClick}
        role={isClickable ? 'button' : undefined}
        tabIndex={isClickable ? 0 : undefined}
        onKeyDown={
          isClickable
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onClick(e as any);
                }
              }
            : undefined
        }
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium leading-none border transition-all select-none ${
          style.bgClass
        } ${style.textClass} ${style.borderClass} ${
          isClickable
            ? 'cursor-pointer hover:opacity-85 hover:scale-105 active:scale-95'
            : ''
        } ${active ? 'ring-2 ring-indigo-500/50 shadow-xs' : ''} ${className}`}
        title={isClickable ? `Click to filter by "${tag}"` : `Label: ${tag}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${style.dotClass}`} />
        <span className="truncate max-w-[90px]">{tag}</span>
        {onRemove && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="hover:opacity-75 focus:outline-none cursor-pointer -mr-0.5"
            title={`Remove ${tag}`}
          >
            <X className="w-2.5 h-2.5" />
          </button>
        )}
      </span>
    );
  }

  return (
    <span
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick(e as any);
              }
            }
          : undefined
      }
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium leading-none border transition-all select-none ${
        style.bgClass
      } ${style.textClass} ${style.borderClass} ${
        isClickable
          ? 'cursor-pointer hover:opacity-85 hover:scale-105 active:scale-95'
          : ''
      } ${active ? 'ring-2 ring-indigo-500/50 shadow-xs' : ''} ${className}`}
      title={isClickable ? `Click to filter by "${tag}"` : `Label: ${tag}`}
    >
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${style.dotClass}`} />
      <span className="truncate max-w-[120px]">{tag}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="hover:opacity-75 focus:outline-none cursor-pointer -mr-0.5"
          title={`Remove ${tag}`}
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
};
