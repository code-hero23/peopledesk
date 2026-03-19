/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // Enable class-based dark mode
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--primary-color)',
          dark: 'var(--primary-dark)',
          light: 'var(--primary-light)',
        },
        // We can also extend other colors if we want them to be theme-aware
        'theme-bg': 'var(--bg-main)',
        'theme-card': 'var(--bg-card)',
        'theme-text': 'var(--text-main)',
        'theme-muted': 'var(--text-muted)',
        'theme-border': 'var(--border-color)',
      }
    },
  },
  plugins: [],
}
