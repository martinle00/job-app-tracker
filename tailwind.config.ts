import type { Config } from 'tailwindcss';

/**
 * The warm palette from the UI redesign. Colours are named by role rather than
 * by hue so a re-tone later is a one-file change.
 */
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#f7f3ec',
        surface: '#fffdfa',
        surface2: '#faf6ef',
        line: '#e8ded0',
        line2: '#f0e8dc',
        line3: '#f4ede3',
        ink: '#2a2622',
        ink2: '#5c534a',
        muted: '#8d8479',
        faint: '#a29684',
        clay: '#a3623f',
        clayDeep: '#7b4a2b',
        // Status tones, kept off pure red/green so they sit in the warm shell.
        good: { bg: '#e2ecdc', fg: '#3f6639' },
        bad: { bg: '#f6e2df', fg: '#8e463d' },
        warn: { bg: '#f6ecd8', fg: '#8a6420' },
        neutral: { bg: '#efe7db', fg: '#6b6357' },
        active: { bg: '#e9e5f2', fg: '#544a76' },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      borderRadius: { card: '14px' },
    },
  },
  plugins: [],
} satisfies Config;
