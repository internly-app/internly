/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        // Default sans font (Roboto) - loaded via next/font in layout.tsx
        sans: ['var(--font-roboto)', 'Roboto', 'sans-serif'],
        // Display/serif font (Instrument Serif) - loaded via next/font in layout.tsx
        display: [
          'var(--font-instrument-serif)',
          'Georgia',
          'Times New Roman',
          'serif'
        ],
      },
    },
  },
  plugins: [],
}