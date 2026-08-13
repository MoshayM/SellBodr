/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: { 50: '#f0fdf4', 500: '#22c55e', 600: '#16a34a', 700: '#15803d' },
        launch: { bg: '#dcfce7', text: '#15803d', border: '#86efac' },
        hold: { bg: '#fef9c3', text: '#854d0e', border: '#fde047' },
        reject: { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
      },
    },
  },
  plugins: [],
};
