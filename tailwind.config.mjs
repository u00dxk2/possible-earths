import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,md,mdx,ts,tsx,js,jsx}'],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#FAF8F4',
          dark: '#121212',
        },
        ink: {
          DEFAULT: '#1A1A1A',
          dark: '#E8E4DC',
          muted: '#5C5C5C',
          'muted-dark': '#9A958B',
        },
        accent: {
          DEFAULT: '#1F4E5F',
          dark: '#5A9BA8',
        },
        rule: {
          DEFAULT: '#E5DFD3',
          dark: '#2A2A2A',
        },
      },
      fontFamily: {
        serif: [
          '"Source Serif 4 Variable"',
          '"Source Serif 4"',
          'Georgia',
          'Cambria',
          '"Times New Roman"',
          'serif',
        ],
        sans: [
          '"Inter Variable"',
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
      },
      maxWidth: {
        prose: '42.5rem',
        comparison: '68.75rem',
      },
      typography: ({ theme }) => ({
        DEFAULT: {
          css: {
            '--tw-prose-body': theme('colors.ink.DEFAULT'),
            '--tw-prose-headings': theme('colors.ink.DEFAULT'),
            '--tw-prose-lead': theme('colors.ink.muted'),
            '--tw-prose-links': theme('colors.accent.DEFAULT'),
            '--tw-prose-bold': theme('colors.ink.DEFAULT'),
            '--tw-prose-counters': theme('colors.ink.muted'),
            '--tw-prose-bullets': theme('colors.ink.muted'),
            '--tw-prose-hr': theme('colors.rule.DEFAULT'),
            '--tw-prose-quotes': theme('colors.ink.DEFAULT'),
            '--tw-prose-quote-borders': theme('colors.accent.DEFAULT'),
            '--tw-prose-captions': theme('colors.ink.muted'),
            '--tw-prose-code': theme('colors.ink.DEFAULT'),
            '--tw-prose-pre-code': theme('colors.ink.dark'),
            '--tw-prose-pre-bg': '#1F2024',
            '--tw-prose-th-borders': theme('colors.rule.DEFAULT'),
            '--tw-prose-td-borders': theme('colors.rule.DEFAULT'),
            '--tw-prose-invert-body': theme('colors.ink.dark'),
            '--tw-prose-invert-headings': theme('colors.ink.dark'),
            '--tw-prose-invert-lead': theme('colors.ink.muted-dark'),
            '--tw-prose-invert-links': theme('colors.accent.dark'),
            '--tw-prose-invert-bold': theme('colors.ink.dark'),
            '--tw-prose-invert-counters': theme('colors.ink.muted-dark'),
            '--tw-prose-invert-bullets': theme('colors.ink.muted-dark'),
            '--tw-prose-invert-hr': theme('colors.rule.dark'),
            '--tw-prose-invert-quotes': theme('colors.ink.dark'),
            '--tw-prose-invert-quote-borders': theme('colors.accent.dark'),
            '--tw-prose-invert-captions': theme('colors.ink.muted-dark'),
            fontFamily: theme('fontFamily.serif').join(', '),
            maxWidth: '42.5rem',
          },
        },
      }),
    },
  },
  plugins: [typography],
};
