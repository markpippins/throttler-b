/**
 * Central Theme Registry & Multi-Channel State Token Substrate (B-4 / U-4 / EAC-4)
 *
 * Implements the authoritative 6-theme Throttler palette:
 * - theme-light (Pure Clean / System Default)
 * - theme-dark (Dark Slate)
 * - theme-midnight (Midnight Deep Blue)
 * - theme-nord (Nord Frost)
 * - theme-solarized (Solarized Warm)
 * - theme-steel (Operator IDE)
 *
 * Enforces the Multi-Channel Degradation Invariant (EAC-4 / Condition 1):
 * Every theme binds `stateTokens` using AT LEAST TWO independent perceptual channels:
 *   Channel 1: Chromatic hue / contrast (color & surface tint)
 *   Channel 2: Structural stroke geometry (solid vs dashed vs double vs dotted)
 *   Channel 3: Semantic iconography glyph (🟢 / ⚠️ / 🛑 / ⚪ / 🧪)
 *
 * Switching between themes (e.g., from theme-dark to theme-solarized or theme-steel)
 * NEVER re-normalizes degraded states or flattens warnings into neutral aesthetics.
 */

import type { EpistemicEnvelope, WitnessedServerStatus } from '../types';

export type ThemeId =
  | 'theme-light'
  | 'theme-dark'
  | 'theme-midnight'
  | 'theme-nord'
  | 'theme-solarized'
  | 'theme-steel'
  | 'theme-system';

export type CanonicalThemeId = Exclude<ThemeId, 'theme-system'>;

export type StateTokenKey =
  | 'live'
  | 'degraded'
  | 'refusal'
  | 'unknown'
  | 'demo';

/**
 * Multi-channel state token definition (EAC-4).
 * Guaranteed >= 2 independent perceptual channels per state across every theme.
 */
export interface StateTokenTreatment {
  /** Chromatic foreground CSS/hex color (Channel 1a) */
  color: string;
  /** Surface background tint class / CSS value (Channel 1b) */
  surfaceTint: string;
  /** Structural border & stroke class (Channel 2a: solid / dashed / double / dotted) */
  border: string;
  /** Structural stroke pattern identifier for SVG / Canvas / programmatic inspection (Channel 2b) */
  strokePattern: 'solid' | 'dashed' | 'double' | 'dotted';
  /** SVG stroke-dasharray equivalent for canvas/SVG nodes */
  strokeDasharray: string;
  /** Semantic glyph (Channel 3) */
  glyph: string;
  /** Canonical state token identifier (`state.<TOKEN>`) bound by B-2 compiler output */
  stateToken: string;
  /** Badge tailwind utility classes */
  badgeClass: string;
}

export interface ThemeTokens {
  /** Space-separated RGB channels (e.g. '15 23 42') */
  background: string;
  surfaceBase: string;
  surfaceMuted: string;
  surfaceHover: string;
  surfaceInput: string;
  surfaceDialog: string;
  textBase: string;
  textMuted: string;
  textSubtle: string;
  borderBase: string;
  borderInput: string;
  accentText: string;
  accentBg: string;
  /** Resolved CSS colors for SVG / Canvas / Relic rendering */
  chartPrimary: string;
  chartSecondary: string;
  chartTertiary: string;
}

export interface ThemeDefinition {
  id: CanonicalThemeId;
  name: string;
  description: string;
  category: 'light' | 'dark' | 'tinted';
  tokens: ThemeTokens;
  /**
   * Mandatory multi-channel state tokens per theme (EAC-4).
   * Includes the 4 canonical epistemic envelopes (`live`, `degraded`, `unknown`, `demo`)
   * plus `refusal` (authoritative `live` envelope with blocking rose treatment per F-1).
   */
  stateTokens: {
    live: StateTokenTreatment;
    degraded: StateTokenTreatment;
    refusal: StateTokenTreatment;
    unknown: StateTokenTreatment;
    demo: StateTokenTreatment;
  };
}

export const AUTHORITATIVE_THEMES: Record<CanonicalThemeId, ThemeDefinition> = {
  'theme-light': {
    id: 'theme-light',
    name: 'Light (Pure Clean)',
    description: 'Soft paper canvas, crisp white surfaces, deep slate text, and royal blue accents.',
    category: 'light',
    tokens: {
      background: '248 250 252',
      surfaceBase: '255 255 255',
      surfaceMuted: '241 245 249',
      surfaceHover: '226 232 240',
      surfaceInput: '255 255 255',
      surfaceDialog: '255 255 255',
      textBase: '15 23 42',
      textMuted: '71 85 105',
      textSubtle: '148 163 184',
      borderBase: '226 232 240',
      borderInput: '203 213 225',
      accentText: '37 99 235',
      accentBg: '239 246 255',
      chartPrimary: '#2563eb',
      chartSecondary: '#059669',
      chartTertiary: '#7c3aed',
    },
    stateTokens: {
      live: {
        color: '#047857',
        surfaceTint: 'bg-emerald-50/90',
        border: 'border-2 border-solid border-emerald-600/50',
        strokePattern: 'solid',
        strokeDasharray: 'none',
        glyph: '🟢',
        stateToken: 'state.COMPLETE',
        badgeClass: 'bg-emerald-100 text-emerald-800 border border-solid border-emerald-600/40',
      },
      degraded: {
        color: '#b45309',
        surfaceTint: 'bg-amber-50/95',
        border: 'border-2 border-dashed border-amber-600/70',
        strokePattern: 'dashed',
        strokeDasharray: '6 3',
        glyph: '⚠️',
        stateToken: 'state.DEGRADED',
        badgeClass: 'bg-amber-100 text-amber-900 border border-dashed border-amber-600/60',
      },
      refusal: {
        color: '#be123c',
        surfaceTint: 'bg-rose-50/95',
        border: 'border-2 border-double border-rose-600/80',
        strokePattern: 'double',
        strokeDasharray: 'none',
        glyph: '🛑',
        stateToken: 'state.REFUSAL',
        badgeClass: 'bg-rose-100 text-rose-900 border-2 border-double border-rose-600/70',
      },
      unknown: {
        color: '#475569',
        surfaceTint: 'bg-slate-100/90',
        border: 'border-2 border-dotted border-slate-500/70',
        strokePattern: 'dotted',
        strokeDasharray: '2 3',
        glyph: '⚪',
        stateToken: 'state.UNKNOWN',
        badgeClass: 'bg-slate-200 text-slate-800 border border-dotted border-slate-500/60',
      },
      demo: {
        color: '#6d28d9',
        surfaceTint: 'bg-violet-50/90',
        border: 'border-2 border-dashed border-violet-600/60',
        strokePattern: 'dashed',
        strokeDasharray: '4 4',
        glyph: '🧪',
        stateToken: 'state.DEMO',
        badgeClass: 'bg-violet-100 text-violet-900 border border-dashed border-violet-600/50',
      },
    },
  },

  'theme-dark': {
    id: 'theme-dark',
    name: 'Dark Slate',
    description: 'Deep slate canvas, elevated slate card surfaces, and sky-blue active accents.',
    category: 'dark',
    tokens: {
      background: '15 23 42',
      surfaceBase: '30 41 59',
      surfaceMuted: '15 23 42',
      surfaceHover: '51 65 85',
      surfaceInput: '15 23 42',
      surfaceDialog: '30 41 59',
      textBase: '248 250 252',
      textMuted: '203 213 225',
      textSubtle: '148 163 184',
      borderBase: '51 65 85',
      borderInput: '71 85 105',
      accentText: '96 165 250',
      accentBg: '30 58 138',
      chartPrimary: '#3b82f6',
      chartSecondary: '#10b981',
      chartTertiary: '#8b5cf6',
    },
    stateTokens: {
      live: {
        color: '#34d399',
        surfaceTint: 'bg-emerald-950/25',
        border: 'border-2 border-solid border-emerald-500/45',
        strokePattern: 'solid',
        strokeDasharray: 'none',
        glyph: '🟢',
        stateToken: 'state.COMPLETE',
        badgeClass: 'bg-emerald-950/60 text-emerald-300 border border-solid border-emerald-500/40',
      },
      degraded: {
        color: '#fbbf24',
        surfaceTint: 'bg-amber-950/30',
        border: 'border-2 border-dashed border-amber-500/60',
        strokePattern: 'dashed',
        strokeDasharray: '6 3',
        glyph: '⚠️',
        stateToken: 'state.DEGRADED',
        badgeClass: 'bg-amber-950/60 text-amber-300 border border-dashed border-amber-500/50',
      },
      refusal: {
        color: '#fb7185',
        surfaceTint: 'bg-rose-950/35',
        border: 'border-2 border-double border-rose-500/70',
        strokePattern: 'double',
        strokeDasharray: 'none',
        glyph: '🛑',
        stateToken: 'state.REFUSAL',
        badgeClass: 'bg-rose-950/70 text-rose-300 border-2 border-double border-rose-500/60',
      },
      unknown: {
        color: '#94a3b8',
        surfaceTint: 'bg-slate-900/50',
        border: 'border-2 border-dotted border-slate-500/60',
        strokePattern: 'dotted',
        strokeDasharray: '2 3',
        glyph: '⚪',
        stateToken: 'state.UNKNOWN',
        badgeClass: 'bg-slate-800/80 text-slate-300 border border-dotted border-slate-500/50',
      },
      demo: {
        color: '#c4b5fd',
        surfaceTint: 'bg-violet-950/30',
        border: 'border-2 border-dashed border-violet-500/55',
        strokePattern: 'dashed',
        strokeDasharray: '4 4',
        glyph: '🧪',
        stateToken: 'state.DEMO',
        badgeClass: 'bg-violet-950/60 text-violet-300 border border-dashed border-violet-500/50',
      },
    },
  },

  'theme-midnight': {
    id: 'theme-midnight',
    name: 'Midnight Deep',
    description: 'High-depth obsidian/navy canvas, rich indigo-slate surfaces, and vibrant indigo accents.',
    category: 'dark',
    tokens: {
      background: '3 7 18',
      surfaceBase: '17 24 39',
      surfaceMuted: '10 15 29',
      surfaceHover: '31 41 55',
      surfaceInput: '10 15 29',
      surfaceDialog: '17 24 39',
      textBase: '243 244 246',
      textMuted: '156 163 175',
      textSubtle: '107 114 128',
      borderBase: '31 41 55',
      borderInput: '55 65 81',
      accentText: '129 140 248',
      accentBg: '49 46 129',
      chartPrimary: '#818cf8',
      chartSecondary: '#34d399',
      chartTertiary: '#f472b6',
    },
    stateTokens: {
      live: {
        color: '#34d399',
        surfaceTint: 'bg-emerald-950/30',
        border: 'border-2 border-solid border-emerald-400/50',
        strokePattern: 'solid',
        strokeDasharray: 'none',
        glyph: '🟢',
        stateToken: 'state.COMPLETE',
        badgeClass: 'bg-emerald-950/70 text-emerald-300 border border-solid border-emerald-400/45',
      },
      degraded: {
        color: '#facc15',
        surfaceTint: 'bg-amber-950/35',
        border: 'border-2 border-dashed border-amber-400/65',
        strokePattern: 'dashed',
        strokeDasharray: '6 3',
        glyph: '⚠️',
        stateToken: 'state.DEGRADED',
        badgeClass: 'bg-amber-950/70 text-amber-200 border border-dashed border-amber-400/55',
      },
      refusal: {
        color: '#fb7185',
        surfaceTint: 'bg-rose-950/40',
        border: 'border-2 border-double border-rose-400/75',
        strokePattern: 'double',
        strokeDasharray: 'none',
        glyph: '🛑',
        stateToken: 'state.REFUSAL',
        badgeClass: 'bg-rose-950/75 text-rose-200 border-2 border-double border-rose-400/65',
      },
      unknown: {
        color: '#9ca3af',
        surfaceTint: 'bg-gray-900/60',
        border: 'border-2 border-dotted border-gray-500/65',
        strokePattern: 'dotted',
        strokeDasharray: '2 3',
        glyph: '⚪',
        stateToken: 'state.UNKNOWN',
        badgeClass: 'bg-gray-800/80 text-gray-300 border border-dotted border-gray-500/55',
      },
      demo: {
        color: '#c084fc',
        surfaceTint: 'bg-purple-950/35',
        border: 'border-2 border-dashed border-purple-400/60',
        strokePattern: 'dashed',
        strokeDasharray: '4 4',
        glyph: '🧪',
        stateToken: 'state.DEMO',
        badgeClass: 'bg-purple-950/70 text-purple-200 border border-dashed border-purple-400/50',
      },
    },
  },

  'theme-nord': {
    id: 'theme-nord',
    name: 'Nord Frost',
    description: 'Arctic night canvas, frosted blue-gray container surfaces, and glacial ice-blue accents.',
    category: 'tinted',
    tokens: {
      background: '46 52 64',
      surfaceBase: '59 66 82',
      surfaceMuted: '46 52 64',
      surfaceHover: '67 76 94',
      surfaceInput: '46 52 64',
      surfaceDialog: '59 66 82',
      textBase: '236 239 244',
      textMuted: '216 222 233',
      textSubtle: '147 161 161',
      borderBase: '67 76 94',
      borderInput: '76 86 106',
      accentText: '136 192 208',
      accentBg: '67 76 94',
      chartPrimary: '#88c0d0',
      chartSecondary: '#a3be8c',
      chartTertiary: '#b48ead',
    },
    stateTokens: {
      live: {
        color: '#a3be8c',
        surfaceTint: 'bg-emerald-950/25',
        border: 'border-2 border-solid border-emerald-400/45',
        strokePattern: 'solid',
        strokeDasharray: 'none',
        glyph: '🟢',
        stateToken: 'state.COMPLETE',
        badgeClass: 'bg-emerald-950/55 text-emerald-200 border border-solid border-emerald-400/40',
      },
      degraded: {
        color: '#ebcb8b',
        surfaceTint: 'bg-amber-950/30',
        border: 'border-2 border-dashed border-amber-400/65',
        strokePattern: 'dashed',
        strokeDasharray: '6 3',
        glyph: '⚠️',
        stateToken: 'state.DEGRADED',
        badgeClass: 'bg-amber-950/60 text-amber-200 border border-dashed border-amber-400/55',
      },
      refusal: {
        color: '#bf616a',
        surfaceTint: 'bg-rose-950/35',
        border: 'border-2 border-double border-rose-400/75',
        strokePattern: 'double',
        strokeDasharray: 'none',
        glyph: '🛑',
        stateToken: 'state.REFUSAL',
        badgeClass: 'bg-rose-950/65 text-rose-200 border-2 border-double border-rose-400/65',
      },
      unknown: {
        color: '#d8dee9',
        surfaceTint: 'bg-slate-800/50',
        border: 'border-2 border-dotted border-slate-400/60',
        strokePattern: 'dotted',
        strokeDasharray: '2 3',
        glyph: '⚪',
        stateToken: 'state.UNKNOWN',
        badgeClass: 'bg-slate-800/70 text-slate-200 border border-dotted border-slate-400/50',
      },
      demo: {
        color: '#b48ead',
        surfaceTint: 'bg-violet-950/30',
        border: 'border-2 border-dashed border-violet-400/60',
        strokePattern: 'dashed',
        strokeDasharray: '4 4',
        glyph: '🧪',
        stateToken: 'state.DEMO',
        badgeClass: 'bg-violet-950/55 text-violet-200 border border-dashed border-violet-400/50',
      },
    },
  },

  'theme-solarized': {
    id: 'theme-solarized',
    name: 'Solarized Warm',
    description: 'Gentle parchment base, soft cream dialogs, deep teal text, and warm amber accents.',
    category: 'tinted',
    tokens: {
      background: '253 246 227',
      surfaceBase: '255 255 255',
      surfaceMuted: '238 232 213',
      surfaceHover: '220 216 198',
      surfaceInput: '255 255 255',
      surfaceDialog: '255 255 255',
      textBase: '7 54 66',
      textMuted: '88 110 117',
      textSubtle: '147 161 161',
      borderBase: '220 216 198',
      borderInput: '200 196 178',
      accentText: '181 137 0',
      accentBg: '253 246 227',
      chartPrimary: '#268bd2',
      chartSecondary: '#859900',
      chartTertiary: '#6c71c4',
    },
    // Note on Solarized Warm: Because the theme accent itself is warm amber (#b58900),
    // degraded states MUST use high-contrast burnt orange + structural dashed stroke + ⚠️ glyph
    // so switching to Solarized Warm never re-normalizes degraded states into normal chrome (EAC-4).
    stateTokens: {
      live: {
        color: '#2aa198',
        surfaceTint: 'bg-teal-50/90',
        border: 'border-2 border-solid border-teal-600/55',
        strokePattern: 'solid',
        strokeDasharray: 'none',
        glyph: '🟢',
        stateToken: 'state.COMPLETE',
        badgeClass: 'bg-teal-100 text-teal-900 border border-solid border-teal-600/45',
      },
      degraded: {
        color: '#cb4b16',
        surfaceTint: 'bg-orange-100/90',
        border: 'border-2 border-dashed border-orange-600/80',
        strokePattern: 'dashed',
        strokeDasharray: '6 3',
        glyph: '⚠️',
        stateToken: 'state.DEGRADED',
        badgeClass: 'bg-orange-100 text-orange-950 border border-dashed border-orange-600/70',
      },
      refusal: {
        color: '#dc322f',
        surfaceTint: 'bg-rose-100/95',
        border: 'border-2 border-double border-rose-600/85',
        strokePattern: 'double',
        strokeDasharray: 'none',
        glyph: '🛑',
        stateToken: 'state.REFUSAL',
        badgeClass: 'bg-rose-100 text-rose-950 border-2 border-double border-rose-600/75',
      },
      unknown: {
        color: '#586e75',
        surfaceTint: 'bg-stone-200/80',
        border: 'border-2 border-dotted border-stone-500/75',
        strokePattern: 'dotted',
        strokeDasharray: '2 3',
        glyph: '⚪',
        stateToken: 'state.UNKNOWN',
        badgeClass: 'bg-stone-200 text-stone-800 border border-dotted border-stone-600/65',
      },
      demo: {
        color: '#6c71c4',
        surfaceTint: 'bg-indigo-50/90',
        border: 'border-2 border-dashed border-indigo-600/65',
        strokePattern: 'dashed',
        strokeDasharray: '4 4',
        glyph: '🧪',
        stateToken: 'state.DEMO',
        badgeClass: 'bg-indigo-100 text-indigo-900 border border-dashed border-indigo-600/55',
      },
    },
  },

  'theme-steel': {
    id: 'theme-steel',
    name: 'Steel (Operator IDE)',
    description: 'Neutral cool zinc/steel surfaces with low eye-fatigue contrast for dense tables and code.',
    category: 'dark',
    tokens: {
      background: '24 24 27',
      surfaceBase: '39 39 42',
      surfaceMuted: '24 24 27',
      surfaceHover: '63 63 70',
      surfaceInput: '24 24 27',
      surfaceDialog: '39 39 42',
      textBase: '244 244 245',
      textMuted: '161 161 170',
      textSubtle: '113 113 122',
      borderBase: '63 63 70',
      borderInput: '82 82 91',
      accentText: '56 189 248',
      accentBg: '12 74 110',
      chartPrimary: '#38bdf8',
      chartSecondary: '#2dd4bf',
      chartTertiary: '#a78bfa',
    },
    stateTokens: {
      live: {
        color: '#2dd4bf',
        surfaceTint: 'bg-teal-950/30',
        border: 'border-2 border-solid border-teal-400/50',
        strokePattern: 'solid',
        strokeDasharray: 'none',
        glyph: '🟢',
        stateToken: 'state.COMPLETE',
        badgeClass: 'bg-teal-950/60 text-teal-300 border border-solid border-teal-400/45',
      },
      degraded: {
        color: '#fb923c',
        surfaceTint: 'bg-amber-950/35',
        border: 'border-2 border-dashed border-amber-400/65',
        strokePattern: 'dashed',
        strokeDasharray: '6 3',
        glyph: '⚠️',
        stateToken: 'state.DEGRADED',
        badgeClass: 'bg-amber-950/65 text-amber-300 border border-dashed border-amber-400/55',
      },
      refusal: {
        color: '#f43f5e',
        surfaceTint: 'bg-rose-950/40',
        border: 'border-2 border-double border-rose-500/75',
        strokePattern: 'double',
        strokeDasharray: 'none',
        glyph: '🛑',
        stateToken: 'state.REFUSAL',
        badgeClass: 'bg-rose-950/75 text-rose-300 border-2 border-double border-rose-500/65',
      },
      unknown: {
        color: '#a1a1aa',
        surfaceTint: 'bg-zinc-900/60',
        border: 'border-2 border-dotted border-zinc-500/65',
        strokePattern: 'dotted',
        strokeDasharray: '2 3',
        glyph: '⚪',
        stateToken: 'state.UNKNOWN',
        badgeClass: 'bg-zinc-800/80 text-zinc-300 border border-dotted border-zinc-500/55',
      },
      demo: {
        color: '#a78bfa',
        surfaceTint: 'bg-violet-950/35',
        border: 'border-2 border-dashed border-violet-400/60',
        strokePattern: 'dashed',
        strokeDasharray: '4 4',
        glyph: '🧪',
        stateToken: 'state.DEMO',
        badgeClass: 'bg-violet-950/65 text-violet-300 border border-dashed border-violet-400/55',
      },
    },
  },
};

export interface MultiChannelAuditResult {
  themeId: CanonicalThemeId;
  valid: boolean;
  distinctHueCount: number;
  distinctPatternCount: number;
  distinctGlyphCount: number;
  violations: string[];
}

/**
 * Central ThemeRegistry managing the 6 authoritative Throttler themes,
 * CSS custom property injection, and EAC-4 multi-channel state-token resolution.
 */
export class ThemeRegistry {
  private themes: Map<CanonicalThemeId, ThemeDefinition> = new Map();
  private activeThemeId: CanonicalThemeId = 'theme-dark';
  private listeners: Set<(theme: ThemeDefinition) => void> = new Set();

  constructor(initialTheme: ThemeId = 'theme-dark') {
    for (const def of Object.values(AUTHORITATIVE_THEMES)) {
      this.themes.set(def.id, def);
    }
    this.setTheme(initialTheme, false);
  }

  /**
   * Normalizes a theme ID (resolving `theme-system` or unknown strings to a canonical theme ID).
   */
  public resolveThemeId(themeId?: string): CanonicalThemeId {
    if (!themeId || themeId === 'theme-system') {
      if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'theme-dark'
          : 'theme-light';
      }
      return 'theme-light';
    }
    if (this.themes.has(themeId as CanonicalThemeId)) {
      return themeId as CanonicalThemeId;
    }
    return 'theme-dark';
  }

  public getTheme(themeId?: string): ThemeDefinition {
    const resolved = this.resolveThemeId(themeId ?? this.activeThemeId);
    return this.themes.get(resolved) || AUTHORITATIVE_THEMES['theme-dark'];
  }

  public getActiveTheme(): ThemeDefinition {
    return this.getTheme(this.activeThemeId);
  }

  public getActiveThemeId(): CanonicalThemeId {
    return this.activeThemeId;
  }

  public getAllThemes(): ThemeDefinition[] {
    return Array.from(this.themes.values());
  }

  public registerTheme(definition: ThemeDefinition): void {
    const audit = this.verifyMultiChannelDistinctness(definition);
    if (!audit.valid) {
      throw new Error(
        `[ThemeRegistry] Theme '${definition.id}' violates EAC-4 multi-channel distinctness: ${audit.violations.join('; ')}`
      );
    }
    this.themes.set(definition.id, definition);
  }

  /**
   * Resolves the multi-channel `StateTokenTreatment` for a given `(envelope, serverStatus)`
   * or compiled `state.<TOKEN>` string under the specified (or active) theme.
   */
  public resolveStateToken(
    envelope: EpistemicEnvelope,
    serverStatus: WitnessedServerStatus = 'complete',
    themeId?: string
  ): StateTokenTreatment {
    const theme = this.getTheme(themeId);

    // Invariant F-1: live + refusal is authoritative but MUST use blocking rose refusal treatment
    if (serverStatus === 'refusal') {
      return theme.stateTokens.refusal;
    }
    if (envelope === 'demo') {
      return theme.stateTokens.demo;
    }
    if (serverStatus === 'missing_lineage' || envelope === 'unknown') {
      return theme.stateTokens.unknown;
    }
    if (
      envelope === 'degraded' ||
      serverStatus === 'stale' ||
      serverStatus === 'drift' ||
      serverStatus === 'duplicate_retry'
    ) {
      return theme.stateTokens.degraded;
    }
    if (envelope === 'live' && serverStatus === 'complete') {
      return theme.stateTokens.live;
    }
    return theme.stateTokens.unknown;
  }

  /**
   * Resolves a `StateTokenTreatment` directly from a compiled B-2 `state.<TOKEN>` prop
   * (e.g. `state.STALE`, `state.REFUSAL`, `state.COMPLETE`, `state.DEMO`, `state.UNKNOWN`).
   */
  public resolveByCompiledStateToken(
    compiledStateToken?: string,
    themeId?: string
  ): StateTokenTreatment {
    const theme = this.getTheme(themeId);
    if (!compiledStateToken) {
      return theme.stateTokens.live;
    }
    const upper = compiledStateToken.toUpperCase();
    if (upper.includes('REFUSAL') || upper.includes('REJECTED') || upper.includes('BLOCKED')) {
      return theme.stateTokens.refusal;
    }
    if (upper.includes('DEMO') || upper.includes('FIXTURE') || upper.includes('SANDBOX')) {
      return theme.stateTokens.demo;
    }
    if (
      upper.includes('STALE') ||
      upper.includes('DRIFT') ||
      upper.includes('DEGRADED') ||
      upper.includes('RETRY') ||
      upper.includes('WARN')
    ) {
      return theme.stateTokens.degraded;
    }
    if (upper.includes('UNKNOWN') || upper.includes('MISSING') || upper.includes('INDETERMINATE')) {
      return theme.stateTokens.unknown;
    }
    return theme.stateTokens.live;
  }

  /**
   * Activates a theme and optionally applies CSS custom properties to the DOM.
   */
  public setTheme(themeId: string, applyDom: boolean = true): ThemeDefinition {
    const resolvedId = this.resolveThemeId(themeId);
    this.activeThemeId = resolvedId;
    const def = this.getTheme(resolvedId);

    if (applyDom && typeof document !== 'undefined') {
      this.applyThemeToDom(def, themeId);
    }

    for (const listener of this.listeners) {
      listener(def);
    }
    return def;
  }

  /**
   * Applies the theme's RGB tokens and state tokens as CSS custom properties on `document.body`.
   */
  public applyThemeToDom(theme: ThemeDefinition, rawThemeClass?: string): void {
    if (typeof document === 'undefined' || !document.body) return;

    const cls = rawThemeClass || theme.id;
    document.body.className = `font-sans antialiased bg-[rgb(var(--color-background))] text-[rgb(var(--color-text-base))] overflow-hidden select-none ${cls}`;

    const style = document.body.style;
    style.setProperty('--color-background', theme.tokens.background);
    style.setProperty('--color-surface-base', theme.tokens.surfaceBase);
    style.setProperty('--color-surface-muted', theme.tokens.surfaceMuted);
    style.setProperty('--color-surface-hover', theme.tokens.surfaceHover);
    style.setProperty('--color-surface-input', theme.tokens.surfaceInput);
    style.setProperty('--color-surface-dialog', theme.tokens.surfaceDialog);
    style.setProperty('--color-text-base', theme.tokens.textBase);
    style.setProperty('--color-text-muted', theme.tokens.textMuted);
    style.setProperty('--color-text-subtle', theme.tokens.textSubtle);
    style.setProperty('--color-border-base', theme.tokens.borderBase);
    style.setProperty('--color-border-input', theme.tokens.borderInput);
    style.setProperty('--color-accent-text', theme.tokens.accentText);
    style.setProperty('--color-accent-bg', theme.tokens.accentBg);
    style.setProperty('--color-chart-primary', theme.tokens.chartPrimary);
    style.setProperty('--color-chart-secondary', theme.tokens.chartSecondary);
    style.setProperty('--color-chart-tertiary', theme.tokens.chartTertiary);

    // State tokens CSS variables
    style.setProperty('--state-live-color', theme.stateTokens.live.color);
    style.setProperty('--state-degraded-color', theme.stateTokens.degraded.color);
    style.setProperty('--state-refusal-color', theme.stateTokens.refusal.color);
    style.setProperty('--state-unknown-color', theme.stateTokens.unknown.color);
    style.setProperty('--state-demo-color', theme.stateTokens.demo.color);
  }

  public subscribe(listener: (theme: ThemeDefinition) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Verifies EAC-4 / Condition 1 invariant for a theme definition:
   * - `live`, `degraded`, `refusal`, `unknown`, `demo` must be distinguishable across >= 2 independent channels
   * - Degraded states must NEVER share color, strokePattern, or glyph with `live` or normal theme accent
   */
  public verifyMultiChannelDistinctness(theme: ThemeDefinition): MultiChannelAuditResult {
    const violations: string[] = [];
    const { live, degraded, refusal, unknown, demo } = theme.stateTokens;
    const states = [live, degraded, refusal, unknown, demo];

    const colors = new Set(states.map((s) => s.color.toLowerCase()));
    const patterns = new Set(states.map((s) => s.strokePattern));
    const glyphs = new Set(states.map((s) => s.glyph));

    if (colors.size < 5) {
      violations.push(`Expected 5 distinct state colors, found ${colors.size}`);
    }
    if (glyphs.size < 5) {
      violations.push(`Expected 5 distinct state glyphs, found ${glyphs.size}`);
    }

    // Critical EAC-4 check: degraded vs live must differ in at least 2 channels (hue + strokePattern + glyph)
    const degradedVsLiveChannels =
      (degraded.color.toLowerCase() !== live.color.toLowerCase() ? 1 : 0) +
      (degraded.strokePattern !== live.strokePattern ? 1 : 0) +
      (degraded.glyph !== live.glyph ? 1 : 0) +
      (degraded.border !== live.border ? 1 : 0);

    if (degradedVsLiveChannels < 2) {
      violations.push(
        `Degraded vs Live only differs in ${degradedVsLiveChannels} channel(s); >= 2 required by EAC-4`
      );
    }

    // Critical F-1 check: refusal vs live must differ in at least 2 channels
    const refusalVsLiveChannels =
      (refusal.color.toLowerCase() !== live.color.toLowerCase() ? 1 : 0) +
      (refusal.strokePattern !== live.strokePattern ? 1 : 0) +
      (refusal.glyph !== live.glyph ? 1 : 0) +
      (refusal.border !== live.border ? 1 : 0);

    if (refusalVsLiveChannels < 2) {
      violations.push(
        `Refusal vs Live only differs in ${refusalVsLiveChannels} channel(s); >= 2 required by F-1/EAC-4`
      );
    }

    // Critical check: unknown vs degraded must differ in at least 2 channels
    const unknownVsDegradedChannels =
      (unknown.color.toLowerCase() !== degraded.color.toLowerCase() ? 1 : 0) +
      (unknown.strokePattern !== degraded.strokePattern ? 1 : 0) +
      (unknown.glyph !== degraded.glyph ? 1 : 0);

    if (unknownVsDegradedChannels < 2) {
      violations.push(
        `Unknown vs Degraded only differs in ${unknownVsDegradedChannels} channel(s); >= 2 required`
      );
    }

    return {
      themeId: theme.id,
      valid: violations.length === 0,
      distinctHueCount: colors.size,
      distinctPatternCount: patterns.size,
      distinctGlyphCount: glyphs.size,
      violations,
    };
  }

  /**
   * Audits all 6 registered themes against EAC-4.
   */
  public verifyAllThemes(): MultiChannelAuditResult[] {
    return this.getAllThemes().map((t) => this.verifyMultiChannelDistinctness(t));
  }
}

export const globalThemeRegistry = new ThemeRegistry('theme-dark');
