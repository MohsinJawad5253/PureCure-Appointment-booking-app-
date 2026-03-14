
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./store/**/*.{js,jsx,ts,tsx}",
    "./hooks/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#E8184A',
          50: '#FEF0F4',
          100: '#FDDAE3',
          200: '#FAB0C5',
          300: '#F67A9B',
          400: '#F0436D',
          500: '#E8184A',
          600: '#C9103B',
          700: '#A00D2F',
          800: '#780A23',
          900: '#500617',
        },
        neutral: {
          50: '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#111827',
        },
        success: '#10B981',
        warning: '#F59E0B',
        info: '#3B82F6',
        danger: '#EF4444',
      },
    },
  },
  plugins: [],
};
