/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
colors: {
  accent: 'var(--accent)',
  'accent-light': 'var(--accent-light)',
  'accent-dark': 'var(--accent-dark)',
  text: 'var(--text)',
  background: 'var(--background)',
  border: 'var(--border)',
  'header-bg': 'var(--header-bg)',
  'header-text': 'var(--header-text)',
  'surface-card': 'var(--surface-card)',
  scrollbar: 'var(--scrollbar)',
  'text-secondary': 'var(--text-secondary)',
  'secondary-card' : 'var(--secondary-card)',
  'secondary-border' : 'var(--secondary-border)',
},
      animation: {
        'float': 'floating 6s ease-in-out infinite',
        'spin-slow': 'spin 12s linear infinite',
        'spin-slower': 'spin 20s linear infinite reverse',
        'pulse-slow': 'pulsate 8s ease-in-out infinite',
      },
      keyframes: {
        floating: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        },
      }
    }
  },
  plugins: [
      require('@tailwindcss/typography'),
      require('tailwind-scrollbar-hide')
  ],
};
