/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#0A0E17',
          surface: '#111827',
          border: 'rgba(255, 255, 255, 0.08)',
          hover: '#1F2937'
        },
        emerald: {
          glow: '#10B981',
          soft: '#064E3B'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      }
    },
  },
  plugins: [],
}
