import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Level 0 — Chassis base (industrial matte plastic in light, obsidian metal in dark)
        chassis: {
          DEFAULT: 'rgb(var(--chassis) / <alpha-value>)',
          hi:      'rgb(var(--chassis-hi) / <alpha-value>)',
          lo:      'rgb(var(--chassis-lo) / <alpha-value>)',
        },
        // Ink — text colors (adaptive light / dark)
        ink: {
          DEFAULT:   'rgb(var(--ink) / <alpha-value>)',
          secondary: 'rgb(var(--ink-sec) / <alpha-value>)',
          muted:     'rgb(var(--ink-muted) / <alpha-value>)',
        },
        // Status (unchanged)
        success: '#22c55e',
        warn:    '#eab308',
        danger:  '#ef4444',
        info:    '#3b82f6',
        // Accent — kept orange #f97316
        accent: {
          DEFAULT: '#f97316',
          dim:     '#ea580c',
          muted:   '#c2410c',
          tint:    '#fff7ed',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        // Neumorphic dual-shadow 2.0 — adaptive for light & dark mode without glaring halos
        'neumorph':    'var(--shadow-neumorph)',
        'neumorph-lg': 'var(--shadow-neumorph-lg)',
        'neumorph-sm': 'var(--shadow-neumorph-sm)',
        // Recessed — inputs, bays, grooved housings
        'inset':       'var(--shadow-inset)',
        'inset-sm':    'var(--shadow-inset-sm)',
        // Pressed — active clicked mechanical switch
        'pressed':     'var(--shadow-pressed)',
        // Accent glow & LED
        'accent':      '0 2px 10px rgba(249, 115, 22, 0.28), 0 1px 2px rgba(0, 0, 0, 0.05)',
        'accent-lg':   '0 4px 16px rgba(249, 115, 22, 0.38), 0 2px 4px rgba(0, 0, 0, 0.08)',
      },
    },
  },
  plugins: [],
};

export default config;
