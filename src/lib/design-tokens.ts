// Design System — Tijolo em Capital
// Fonte única de verdade dos tokens visuais. Não introduzir novos
// hex/font/spacing fora deste arquivo.

export const tokens = {
  color: {
    brand: { gold: '#C9A961', goldSoft: '#E1C68C', goldDeep: '#9C7C3E' },
    ink: { 900: '#1B1B1B', 700: '#3D3D3D', 500: '#5C5C5C', 300: '#8E8E8E' },
    neutral: { 50: '#FAFAF7', 100: '#F4F2EC', 200: '#E8E4D7', 300: '#D6D1BD' },
    semantic: { success: '#5C8A4F', warning: '#C68F3E', danger: '#A8463A', info: '#3C6789' },
  },
  font: {
    display: '"Fraunces", "DM Serif Display", Georgia, serif',
    body: '"Geist", "Söhne", "Inter Tight", system-ui, sans-serif',
    mono: '"JetBrains Mono", ui-monospace, monospace',
  },
  radius: { sm: '6px', md: '10px', lg: '14px', xl: '22px', pill: '999px' },
  shadow: {
    sm: '0 1px 2px rgba(20,18,12,.06)',
    md: '0 8px 24px -8px rgba(20,18,12,.12)',
    lg: '0 24px 48px -16px rgba(20,18,12,.18)',
  },
  motion: {
    fast: '150ms ease-out',
    base: '240ms ease-out',
    lush: '420ms cubic-bezier(.22,.61,.36,1)',
  },
} as const;

export type Tokens = typeof tokens;

// Variáveis CSS consumidas pelo Tailwind / index.css.
export const cssVars: Record<string, string> = {
  '--color-brand-gold': tokens.color.brand.gold,
  '--color-brand-gold-soft': tokens.color.brand.goldSoft,
  '--color-brand-gold-deep': tokens.color.brand.goldDeep,
  '--color-ink-900': tokens.color.ink[900],
  '--color-ink-700': tokens.color.ink[700],
  '--color-ink-500': tokens.color.ink[500],
  '--color-ink-300': tokens.color.ink[300],
  '--color-neutral-50': tokens.color.neutral[50],
  '--color-neutral-100': tokens.color.neutral[100],
  '--color-neutral-200': tokens.color.neutral[200],
  '--color-neutral-300': tokens.color.neutral[300],
  '--color-semantic-success': tokens.color.semantic.success,
  '--color-semantic-warning': tokens.color.semantic.warning,
  '--color-semantic-danger': tokens.color.semantic.danger,
  '--color-semantic-info': tokens.color.semantic.info,
  '--ds-motion-fast': tokens.motion.fast,
  '--ds-motion-base': tokens.motion.base,
  '--ds-motion-lush': tokens.motion.lush,
};
