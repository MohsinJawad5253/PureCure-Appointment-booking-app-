/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#E8184A',
          50:  '#FEF0F4',
          100: '#FDDAE3',
          500: '#E8184A',
          600: '#C9103B',
          700: '#A00D2F',
        },
      },
    },
  },
  plugins: [],
};
