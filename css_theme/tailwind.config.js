/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#06B6D4',
          dark: '#0E7490',
        },
        accent: '#9333EA',
        background: '#F9FAFB',
        surface: '#FFFFFF',
        text: {
          primary: '#111827',
          muted: '#6B7280',
        },
        danger: '#EF4444',
        success: '#10B981',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.5rem',
      },
    },
  },
  plugins: [],
};
