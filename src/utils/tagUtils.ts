/**
 * Tag and colored label utilities for Throttler File Explorer
 */
import { useEffect, useState } from 'react';
import { getVfsService } from '../services/fileSystemService';

export interface TagStyle {
  label: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  dotClass: string;
}

export interface TagColorOption {
  id: string;
  name: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  dotClass: string;
  hex: string;
}

export interface TagDefinition {
  id: string;
  label: string;
  colorId: string;
  isPreset?: boolean;
}

export const AVAILABLE_TAG_COLORS: TagColorOption[] = [
  {
    id: 'blue',
    name: 'Blue',
    bgClass: 'bg-blue-500/15',
    textClass: 'text-blue-700 dark:text-blue-300',
    borderClass: 'border-blue-500/30',
    dotClass: 'bg-blue-500',
    hex: '#3b82f6',
  },
  {
    id: 'emerald',
    name: 'Emerald',
    bgClass: 'bg-emerald-500/15',
    textClass: 'text-emerald-700 dark:text-emerald-300',
    borderClass: 'border-emerald-500/30',
    dotClass: 'bg-emerald-500',
    hex: '#10b981',
  },
  {
    id: 'red',
    name: 'Red',
    bgClass: 'bg-red-500/15',
    textClass: 'text-red-700 dark:text-red-300',
    borderClass: 'border-red-500/30',
    dotClass: 'bg-red-500',
    hex: '#ef4444',
  },
  {
    id: 'amber',
    name: 'Amber',
    bgClass: 'bg-amber-500/15',
    textClass: 'text-amber-700 dark:text-amber-300',
    borderClass: 'border-amber-500/30',
    dotClass: 'bg-amber-500',
    hex: '#f59e0b',
  },
  {
    id: 'purple',
    name: 'Purple',
    bgClass: 'bg-purple-500/15',
    textClass: 'text-purple-700 dark:text-purple-300',
    borderClass: 'border-purple-500/30',
    dotClass: 'bg-purple-500',
    hex: '#a855f7',
  },
  {
    id: 'teal',
    name: 'Teal',
    bgClass: 'bg-teal-500/15',
    textClass: 'text-teal-700 dark:text-teal-300',
    borderClass: 'border-teal-500/30',
    dotClass: 'bg-teal-500',
    hex: '#14b8a6',
  },
  {
    id: 'indigo',
    name: 'Indigo',
    bgClass: 'bg-indigo-500/15',
    textClass: 'text-indigo-700 dark:text-indigo-300',
    borderClass: 'border-indigo-500/30',
    dotClass: 'bg-indigo-500',
    hex: '#6366f1',
  },
  {
    id: 'rose',
    name: 'Rose',
    bgClass: 'bg-rose-500/15',
    textClass: 'text-rose-700 dark:text-rose-300',
    borderClass: 'border-rose-500/30',
    dotClass: 'bg-rose-500',
    hex: '#f43f5e',
  },
  {
    id: 'cyan',
    name: 'Cyan',
    bgClass: 'bg-cyan-500/15',
    textClass: 'text-cyan-700 dark:text-cyan-300',
    borderClass: 'border-cyan-500/30',
    dotClass: 'bg-cyan-500',
    hex: '#06b6d4',
  },
  {
    id: 'orange',
    name: 'Orange',
    bgClass: 'bg-orange-500/15',
    textClass: 'text-orange-700 dark:text-orange-300',
    borderClass: 'border-orange-500/30',
    dotClass: 'bg-orange-500',
    hex: '#f97316',
  },
  {
    id: 'violet',
    name: 'Violet',
    bgClass: 'bg-violet-500/15',
    textClass: 'text-violet-700 dark:text-violet-300',
    borderClass: 'border-violet-500/30',
    dotClass: 'bg-violet-500',
    hex: '#8b5cf6',
  },
  {
    id: 'pink',
    name: 'Pink',
    bgClass: 'bg-pink-500/15',
    textClass: 'text-pink-700 dark:text-pink-300',
    borderClass: 'border-pink-500/30',
    dotClass: 'bg-pink-500',
    hex: '#ec4899',
  },
  {
    id: 'slate',
    name: 'Slate',
    bgClass: 'bg-slate-500/15',
    textClass: 'text-slate-700 dark:text-slate-300',
    borderClass: 'border-slate-500/30',
    dotClass: 'bg-slate-500',
    hex: '#64748b',
  },
  {
    id: 'yellow',
    name: 'Yellow',
    bgClass: 'bg-yellow-500/15',
    textClass: 'text-yellow-700 dark:text-yellow-300',
    borderClass: 'border-yellow-500/30',
    dotClass: 'bg-yellow-500',
    hex: '#eab308',
  },
  {
    id: 'lime',
    name: 'Lime',
    bgClass: 'bg-lime-500/15',
    textClass: 'text-lime-700 dark:text-lime-300',
    borderClass: 'border-lime-500/30',
    dotClass: 'bg-lime-500',
    hex: '#84cc16',
  },
  {
    id: 'fuchsia',
    name: 'Fuchsia',
    bgClass: 'bg-fuchsia-500/15',
    textClass: 'text-fuchsia-700 dark:text-fuchsia-300',
    borderClass: 'border-fuchsia-500/30',
    dotClass: 'bg-fuchsia-500',
    hex: '#d946ef',
  },
];

export const DEFAULT_TAG_DEFINITIONS: TagDefinition[] = [
  { id: 'tag-work', label: 'Work', colorId: 'blue', isPreset: true },
  { id: 'tag-personal', label: 'Personal', colorId: 'emerald', isPreset: true },
  { id: 'tag-urgent', label: 'Urgent', colorId: 'red', isPreset: true },
  { id: 'tag-important', label: 'Important', colorId: 'amber', isPreset: true },
  { id: 'tag-project', label: 'Project', colorId: 'purple', isPreset: true },
  { id: 'tag-review', label: 'Review', colorId: 'teal', isPreset: true },
];

const TAGS_STORAGE_KEY = 'throttler-tags-definitions-v1';
const TAGS_UPDATED_EVENT = 'throttler-tags-updated';

export function getTagColorOption(colorId: string): TagColorOption {
  const found = AVAILABLE_TAG_COLORS.find((c) => c.id === colorId);
  return found || AVAILABLE_TAG_COLORS[0];
}

/**
 * Loads stored tag definitions from localStorage
 */
export function getAllTagDefinitions(): TagDefinition[] {
  if (typeof window === 'undefined') {
    return [...DEFAULT_TAG_DEFINITIONS];
  }
  try {
    const raw = localStorage.getItem(TAGS_STORAGE_KEY);
    if (!raw) {
      return [...DEFAULT_TAG_DEFINITIONS];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (e) {
    console.error('Failed to parse stored tags:', e);
  }
  return [...DEFAULT_TAG_DEFINITIONS];
}

function saveTagDefinitions(defs: TagDefinition[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TAGS_STORAGE_KEY, JSON.stringify(defs));
  } catch (e) {
    console.error('Failed to save tags:', e);
  }
  syncPresetTags();
  notifyTagChanges();
}

function notifyTagChanges(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(TAGS_UPDATED_EVENT));
  }
}

export function subscribeToTagChanges(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = () => callback();
  window.addEventListener(TAGS_UPDATED_EVENT, handler);
  return () => {
    window.removeEventListener(TAGS_UPDATED_EVENT, handler);
  };
}

export function useTagDefinitions(): TagDefinition[] {
  const [defs, setDefs] = useState<TagDefinition[]>(() => getAllTagDefinitions());

  useEffect(() => {
    return subscribeToTagChanges(() => {
      setDefs(getAllTagDefinitions());
    });
  }, []);

  return defs;
}

/**
 * Creates and dynamically synchronizes PRESET_TAGS array for backward compatibility
 */
export const PRESET_TAGS: TagStyle[] = [];

function syncPresetTags() {
  const defs = getAllTagDefinitions();
  PRESET_TAGS.length = 0;
  for (const def of defs) {
    const color = getTagColorOption(def.colorId);
    PRESET_TAGS.push({
      label: def.label,
      bgClass: color.bgClass,
      textClass: color.textClass,
      borderClass: color.borderClass,
      dotClass: color.dotClass,
    });
  }
}

// Initial sync
syncPresetTags();

/**
 * Create a new tag definition
 */
export function createTagDefinition(
  label: string,
  colorId: string = 'blue'
): { success: boolean; error?: string; tag?: TagDefinition } {
  const cleanLabel = label.trim();
  if (!cleanLabel) {
    return { success: false, error: 'Tag label cannot be empty.' };
  }

  const defs = getAllTagDefinitions();
  const exists = defs.some((d) => d.label.toLowerCase() === cleanLabel.toLowerCase());
  if (exists) {
    return { success: false, error: `A tag with label "${cleanLabel}" already exists.` };
  }

  const validColor = getTagColorOption(colorId).id;
  const newTag: TagDefinition = {
    id: `tag-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    label: cleanLabel,
    colorId: validColor,
    isPreset: false,
  };

  saveTagDefinitions([...defs, newTag]);
  return { success: true, tag: newTag };
}

/**
 * Rename an existing tag definition and update across all files in VFS
 */
export function renameTagDefinition(
  oldLabel: string,
  newLabel: string
): { success: boolean; error?: string; modifiedFileCount?: number } {
  const oldNorm = oldLabel.trim().toLowerCase();
  const cleanNew = newLabel.trim();

  if (!cleanNew) {
    return { success: false, error: 'Tag name cannot be empty.' };
  }

  if (oldNorm === cleanNew.toLowerCase()) {
    // Just case adjustment
    const defs = getAllTagDefinitions();
    const updated = defs.map((d) =>
      d.label.toLowerCase() === oldNorm ? { ...d, label: cleanNew } : d
    );
    saveTagDefinitions(updated);
    return { success: true, modifiedFileCount: 0 };
  }

  const defs = getAllTagDefinitions();
  const duplicate = defs.some(
    (d) => d.label.toLowerCase() === cleanNew.toLowerCase() && d.label.toLowerCase() !== oldNorm
  );
  if (duplicate) {
    return { success: false, error: `A tag with label "${cleanNew}" already exists.` };
  }

  const target = defs.find((d) => d.label.toLowerCase() === oldNorm);
  if (!target) {
    // If not in definitions, we can add it as a new definition
    const newTag: TagDefinition = {
      id: `tag-${Date.now()}`,
      label: cleanNew,
      colorId: 'indigo',
    };
    saveTagDefinitions([...defs, newTag]);
  } else {
    const updated = defs.map((d) =>
      d.label.toLowerCase() === oldNorm ? { ...d, label: cleanNew } : d
    );
    saveTagDefinitions(updated);
  }

  // Update across virtual file system
  let modifiedFileCount = 0;
  try {
    const vfs = getVfsService();
    if (vfs) {
      modifiedFileCount = vfs.renameTagGlobally(oldLabel, cleanNew);
    }
  } catch (e) {
    console.warn('VFS rename tag error:', e);
  }

  return { success: true, modifiedFileCount };
}

/**
 * Change color of an existing tag definition
 */
export function changeTagColorDefinition(
  label: string,
  newColorId: string
): { success: boolean; error?: string } {
  const norm = label.trim().toLowerCase();
  const validColor = getTagColorOption(newColorId).id;
  const defs = getAllTagDefinitions();

  const index = defs.findIndex((d) => d.label.toLowerCase() === norm);
  if (index >= 0) {
    const updated = [...defs];
    updated[index] = { ...updated[index], colorId: validColor };
    saveTagDefinitions(updated);
  } else {
    // If it was a custom label not yet in definitions, register it with the new color!
    const newTag: TagDefinition = {
      id: `tag-${Date.now()}`,
      label: label.trim(),
      colorId: validColor,
    };
    saveTagDefinitions([...defs, newTag]);
  }

  return { success: true };
}

/**
 * Delete a tag definition and optionally remove it from all files in VFS
 */
export function deleteTagDefinition(
  label: string,
  removeFromFiles: boolean = true
): { success: boolean; error?: string; removedFileCount?: number } {
  const norm = label.trim().toLowerCase();
  const defs = getAllTagDefinitions();
  const filtered = defs.filter((d) => d.label.toLowerCase() !== norm);

  saveTagDefinitions(filtered);

  let removedFileCount = 0;
  if (removeFromFiles) {
    try {
      const vfs = getVfsService();
      if (vfs) {
        removedFileCount = vfs.removeTagGlobally(label);
      }
    } catch (e) {
      console.warn('VFS remove tag error:', e);
    }
  }

  return { success: true, removedFileCount };
}

/**
 * Reset tag definitions to default presets
 */
export function resetTagsToDefault(): void {
  saveTagDefinitions([...DEFAULT_TAG_DEFINITIONS]);
}

const DYNAMIC_PALETTES: Array<Omit<TagStyle, 'label'>> = [
  {
    bgClass: 'bg-indigo-500/15',
    textClass: 'text-indigo-700 dark:text-indigo-300',
    borderClass: 'border-indigo-500/30',
    dotClass: 'bg-indigo-500',
  },
  {
    bgClass: 'bg-rose-500/15',
    textClass: 'text-rose-700 dark:text-rose-300',
    borderClass: 'border-rose-500/30',
    dotClass: 'bg-rose-500',
  },
  {
    bgClass: 'bg-cyan-500/15',
    textClass: 'text-cyan-700 dark:text-cyan-300',
    borderClass: 'border-cyan-500/30',
    dotClass: 'bg-cyan-500',
  },
  {
    bgClass: 'bg-orange-500/15',
    textClass: 'text-orange-700 dark:text-orange-300',
    borderClass: 'border-orange-500/30',
    dotClass: 'bg-orange-500',
  },
  {
    bgClass: 'bg-violet-500/15',
    textClass: 'text-violet-700 dark:text-violet-300',
    borderClass: 'border-violet-500/30',
    dotClass: 'bg-violet-500',
  },
  {
    bgClass: 'bg-pink-500/15',
    textClass: 'text-pink-700 dark:text-pink-300',
    borderClass: 'border-pink-500/30',
    dotClass: 'bg-pink-500',
  },
];

/**
 * Returns consistent styling configuration for a given tag label.
 */
export function getTagStyle(label: string): TagStyle {
  const normalized = label.trim().toLowerCase();

  // Check stored tag definitions first
  const defs = getAllTagDefinitions();
  const def = defs.find((d) => d.label.toLowerCase() === normalized);
  if (def) {
    const color = getTagColorOption(def.colorId);
    return {
      label,
      bgClass: color.bgClass,
      textClass: color.textClass,
      borderClass: color.borderClass,
      dotClass: color.dotClass,
    };
  }

  const preset = PRESET_TAGS.find((p) => p.label.toLowerCase() === normalized);
  if (preset) {
    return { ...preset, label };
  }

  // Generate deterministic hash for custom labels
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = (hash << 5) - hash + normalized.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % DYNAMIC_PALETTES.length;
  return {
    label,
    ...DYNAMIC_PALETTES[index],
  };
}

export interface ParsedFilter {
  rawQuery: string;
  textQuery: string;
  tagModifiers: string[];
  hasAnyTag: boolean;
  hasNoTag: boolean;
  explicitTag: string | null;
}

/**
 * Parses search query string and optional explicit tag filter to extract:
 * 1. Text search substring
 * 2. Tag search modifiers: `tag:<name>`, `label:<name>`, `#<name>`, `tag:"<name>"`
 * 3. Special modifiers: `tag:any`, `has:tag`, `is:tagged`, `tag:none`, `is:untagged`
 */
export function parseFilterQuery(
  rawQuery: string = '',
  explicitTagFilter: string | null = null
): ParsedFilter {
  let query = rawQuery || '';
  const tagModifiers: string[] = [];
  let hasAnyTag = false;
  let hasNoTag = false;

  // Check for any tag / no tag special flags in query
  if (/\b(?:tag:any|tag:\*|has:tag|is:tagged)\b/i.test(query)) {
    hasAnyTag = true;
    query = query.replace(/\b(?:tag:any|tag:\*|has:tag|is:tagged)\b/gi, ' ');
  }
  if (/\b(?:tag:none|is:untagged|no:tag)\b/i.test(query)) {
    hasNoTag = true;
    query = query.replace(/\b(?:tag:none|is:untagged|no:tag)\b/gi, ' ');
  }

  // Match tag:"quoted tag" or label:"quoted tag" or tag:'quoted'
  query = query.replace(/(?:\btag|\blabel):(?:"([^"]+)"|'([^']+)')/gi, (_, g1, g2) => {
    const val = (g1 || g2 || '').trim();
    if (val) tagModifiers.push(val);
    return ' ';
  });

  // Match tag:word or label:word
  query = query.replace(/(?:\btag|\blabel):([^\s"']+)/gi, (_, val) => {
    const trimmed = (val || '').trim();
    if (trimmed.toLowerCase() === 'any' || trimmed === '*') {
      hasAnyTag = true;
    } else if (trimmed.toLowerCase() === 'none') {
      hasNoTag = true;
    } else if (trimmed) {
      tagModifiers.push(trimmed);
    }
    return ' ';
  });

  // Match #tagname (only if followed by letters/numbers/underscores/dashes, min 2 chars)
  query = query.replace(/#([a-zA-Z0-9_\-]{2,})/g, (_, val) => {
    const trimmed = (val || '').trim();
    if (trimmed) tagModifiers.push(trimmed);
    return ' ';
  });

  const textQuery = query.replace(/\s+/g, ' ').trim();

  return {
    rawQuery,
    textQuery,
    tagModifiers,
    hasAnyTag,
    hasNoTag,
    explicitTag: explicitTagFilter,
  };
}

/**
 * Checks if a given item matches both text query and tag filters
 */
export function matchesFilter(
  item: { name: string; tags?: string[] },
  rawQuery: string = '',
  explicitTagFilter: string | null = null
): boolean {
  const parsed = parseFilterQuery(rawQuery, explicitTagFilter);

  // 1. Check explicit tag filter
  if (parsed.explicitTag) {
    if (parsed.explicitTag === '__ANY__') {
      if (!item.tags || item.tags.length === 0) return false;
    } else if (parsed.explicitTag === '__NONE__') {
      if (item.tags && item.tags.length > 0) return false;
    } else {
      const target = parsed.explicitTag.toLowerCase();
      const hasExplicit = item.tags?.some((t) => t.toLowerCase() === target);
      if (!hasExplicit) return false;
    }
  }

  // 2. Check special query tag flags
  if (parsed.hasAnyTag) {
    if (!item.tags || item.tags.length === 0) return false;
  }
  if (parsed.hasNoTag) {
    if (item.tags && item.tags.length > 0) return false;
  }

  // 3. Check query tag modifiers (e.g. tag:work or #urgent)
  if (parsed.tagModifiers.length > 0) {
    if (!item.tags || item.tags.length === 0) return false;
    for (const mod of parsed.tagModifiers) {
      const lowerMod = mod.toLowerCase();
      const hasMatch = item.tags.some((t) => t.toLowerCase() === lowerMod);
      if (!hasMatch) return false;
    }
  }

  // 4. Check text search on item name
  if (parsed.textQuery) {
    if (!item.name.toLowerCase().includes(parsed.textQuery.toLowerCase())) {
      return false;
    }
  }

  return true;
}
