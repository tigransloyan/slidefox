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
    },
  },
  plugins: [],
}
