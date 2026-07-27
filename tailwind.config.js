/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      // ── Colors (from design.md) ──────────────────────────────
      colors: {
        primary: {
          DEFAULT: '#1E40AF',
          light:   '#3B82F6',
          dark:    '#00288E',
        },
        accent: {
          DEFAULT: '#FF6B35',
          light:   '#FF8F66',
        },
        success:  '#22C55E',
        warning:  '#F59E0B',
        error:    '#EF4444',
        info:     '#3B82F6',
        surface: {
          DEFAULT: '#F8FAFC',
          card:    '#FFFFFF',
          dark:    '#1E293B',
          darker:  '#0F172A',
        },
        text: {
          primary:   '#0B1C30',
          secondary: '#444653',
          muted:     '#6B7280',
          inverse:   '#FFFFFF',
        },
        border: {
          DEFAULT: 'rgba(196,197,213,0.3)',
          strong:  'rgba(196,197,213,0.5)',
          divider: 'rgba(196,197,213,0.2)',
        },
      },

      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        heading: ['IBM Plex Sans', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },

      // ── Spacing (semantic additions to default 4px grid) ────
      spacing: {
        'nav-h':       '64px',
        'header-h':    '56px',
        'page-px':     '16px',
        'card-p':      '16px',
        'section-gap': '24px',
      },

      // ── Border Radius ────────────────────────────────────────
      borderRadius: {
        sm:   '8px',
        md:   '12px',
        lg:   '16px',
        xl:   '20px',
        full: '9999px',
      },

      // ── Shadows ──────────────────────────────────────────────
      boxShadow: {
        sm:   '0 1px 2px rgba(0,0,0,0.05)',
        md:   '0 4px 6px -1px rgba(0,0,0,0.1)',
        lg:   '0 10px 15px -3px rgba(0,0,0,0.1)',
        card: '0px 1px 1.5px rgba(15,23,42,0.05)',
      },

      // ── Transitions ─────────────────────────────────────────
      transitionDuration: {
        fast:    '150ms',
        default: '200ms',
        slow:    '300ms',
      },
    },
  },
  plugins: [],
};
