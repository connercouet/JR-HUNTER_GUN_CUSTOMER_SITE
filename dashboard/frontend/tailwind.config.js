/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f0f7f1',
          100: '#d9edd9',
          200: '#b4dbb6',
          300: '#81c184',
          400: '#4f9f54',
          500: '#2F6D3A',
          600: '#256030',
          700: '#1e4f28',
          800: '#0F3D1D',
          900: '#0a2d15',
        },
        accent: {
          400: '#fb923c',
          500: '#E67700',
          600: '#c56600',
        },
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
