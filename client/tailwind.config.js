/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dw: {
          orange: '#F3701B',
          'orange-deep': '#ED6208',
          red: '#D30902',
          navy: '#0A0F23',
          dark: '#070B2F',
          gold: '#FFBA41',
          cream: '#FAF3E1',
          surface: '#13182B',
        },
        brand: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          500: '#F3701B',
          600: '#ED6208',
          700: '#c2410c',
          800: '#9a3412',
          900: '#0A0F23',
        }
      }
    },
  },
  plugins: [],
}
