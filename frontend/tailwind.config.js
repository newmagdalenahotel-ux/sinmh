/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'navy-dark': '#060f1e',
        navy: '#0b1d3a',
        'navy-light': '#152d5a',
        'gold-light': '#e0c99a',
        gold: '#c8a96e',
        'gold-dark': '#9e7d46',
        cream: '#faf6f0',
        'cream-dark': '#f0e8d8',
        stone: '#4a4a4a',
        'stone-light': '#7a7a7a',
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#3B82F6',
      },
      fontFamily: {
        display: ['"Inter"', 'system-ui', 'sans-serif'],
        body: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        gold: '0 10px 30px rgba(200, 169, 110, 0.25)',
      },
    },
  },
  plugins: [],
};
