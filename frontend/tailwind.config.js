/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts,tsx,js,jsx}', './index.html'],
  theme: {
    extend: {
      colors: {
        'g3-green': {
          500: '#34D399',
          600: '#10B981',
          700: '#059669',
          800: '#047857'
        },
      },
    },
  },
  plugins: [],
};
