/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'fox-orange': '#FF6B35',
        'fox-orange-light': '#FF8F5C',
        'warm-brown': '#5D4037',
        'cream-white': '#FFF8F5',
      },
      typography: {
        DEFAULT: {
          css: {
            '--tw-prose-body': '#5D4037',
            '--tw-prose-headings': '#5D4037',
            '--tw-prose-lead': '#5D4037',
            '--tw-prose-links': '#FF6B35',
            '--tw-prose-bold': '#5D4037',
            '--tw-prose-counters': '#5D4037',
            '--tw-prose-bullets': '#5D4037',
            '--tw-prose-hr': 'rgba(93, 64, 55, 0.2)',
            '--tw-prose-quotes': '#5D4037',
            '--tw-prose-quote-borders': '#FF6B35',
            '--tw-prose-captions': 'rgba(93, 64, 55, 0.7)',
            '--tw-prose-code': '#5D4037',
            '--tw-prose-pre-code': '#5D4037',
            '--tw-prose-pre-bg': 'rgba(93, 64, 55, 0.05)',
            '--tw-prose-th-borders': 'rgba(93, 64, 55, 0.2)',
            '--tw-prose-td-borders': 'rgba(93, 64, 55, 0.1)',
          },
        },
        invert: {
          css: {
            '--tw-prose-body': '#ffffff',
            '--tw-prose-headings': '#ffffff',
            '--tw-prose-lead': '#ffffff',
            '--tw-prose-links': '#ffffff',
            '--tw-prose-bold': '#ffffff',
            '--tw-prose-counters': '#ffffff',
            '--tw-prose-bullets': '#ffffff',
            '--tw-prose-hr': 'rgba(255, 255, 255, 0.2)',
            '--tw-prose-quotes': '#ffffff',
            '--tw-prose-quote-borders': '#ffffff',
            '--tw-prose-captions': 'rgba(255, 255, 255, 0.7)',
            '--tw-prose-code': '#ffffff',
            '--tw-prose-pre-code': '#ffffff',
            '--tw-prose-pre-bg': 'rgba(255, 255, 255, 0.1)',
            '--tw-prose-th-borders': 'rgba(255, 255, 255, 0.2)',
            '--tw-prose-td-borders': 'rgba(255, 255, 255, 0.1)',
          },
        },
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
}
