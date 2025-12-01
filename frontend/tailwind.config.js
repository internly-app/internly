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
        // Default sans font (Inter) - will be set in layout.tsx
        sans: ['var(--font-inter)'],
        // Display font for hero/headings (EB Garamond)
        display: [
          'var(--font-eb-garamond)',
          'EB Garamond',
          'Georgia',
          'Times New Roman',
          'serif'
        ],
      },
    },
  },
  plugins: [],
}