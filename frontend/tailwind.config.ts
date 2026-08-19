import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: 'rgb(var(--nx-ink) / <alpha-value>)',
        'ink-muted': 'rgb(var(--nx-ink-muted) / <alpha-value>)',
        canvas: 'rgb(var(--nx-canvas) / <alpha-value>)',
        surface: 'rgb(var(--nx-surface) / <alpha-value>)',
        'surface-2': 'rgb(var(--nx-surface-2) / <alpha-value>)',
        border: 'rgb(var(--nx-border) / <alpha-value>)',
        'border-strong': 'rgb(var(--nx-border-strong) / <alpha-value>)',
        primary: {
          DEFAULT: 'rgb(var(--nx-primary) / <alpha-value>)',
          dark: 'rgb(var(--nx-primary-dark) / <alpha-value>)',
          hover: 'rgb(var(--nx-primary-hover) / <alpha-value>)',
          subtle: 'rgb(var(--nx-primary-subtle) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--nx-accent) / <alpha-value>)',
          subtle: 'rgb(var(--nx-accent-subtle) / <alpha-value>)',
        },
        'ai-blue': 'rgb(var(--nx-ai-blue) / <alpha-value>)',
        'ai-cyan': 'rgb(var(--nx-ai-cyan) / <alpha-value>)',
        success: {
          DEFAULT: 'rgb(var(--nx-success) / <alpha-value>)',
          subtle: 'rgb(var(--nx-success-subtle) / <alpha-value>)',
        },
        warning: {
          DEFAULT: 'rgb(var(--nx-warning) / <alpha-value>)',
          subtle: 'rgb(var(--nx-warning-subtle) / <alpha-value>)',
        },
        danger: {
          DEFAULT: 'rgb(var(--nx-danger) / <alpha-value>)',
          subtle: 'rgb(var(--nx-danger-subtle) / <alpha-value>)',
        },
        info: {
          DEFAULT: 'rgb(var(--nx-info) / <alpha-value>)',
          subtle: 'rgb(var(--nx-info-subtle) / <alpha-value>)',
        },
        module: {
          finance: 'rgb(var(--nx-module-finance) / <alpha-value>)',
          hrms: 'rgb(var(--nx-module-hrms) / <alpha-value>)',
          manufacturing: 'rgb(var(--nx-module-manufacturing) / <alpha-value>)',
          inventory: 'rgb(var(--nx-module-inventory) / <alpha-value>)',
          compliance: 'rgb(var(--nx-module-compliance) / <alpha-value>)',
          documents: 'rgb(var(--nx-module-documents) / <alpha-value>)',
          ai: 'rgb(var(--nx-module-ai) / <alpha-value>)',
        },
      },
      fontFamily: {
        display: 'var(--nx-font-display)',
        sans: 'var(--nx-font-body)',
        mono: 'var(--nx-font-mono)',
      },
    },
  },
  plugins: [],
} satisfies Config;
