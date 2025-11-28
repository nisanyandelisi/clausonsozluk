/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Akademik renk paleti
        'parchment': {
          50: '#FDFCF9',
          100: '#F5F1E8',
          200: '#EBE4D1',
          300: '#DFD5BA',
          400: '#D2C5A3',
          500: '#C5B58C',
        },
        'ink': {
          900: '#2C1810',
          800: '#3D2518',
          700: '#4E3220',
          600: '#5F3F28',
          500: '#70502F',
        },
        'maroon': {
          500: '#A32F42',
          600: '#8B2635',
          700: '#731D29',
          800: '#5B171D',
        },
      },
      fontFamily: {
        'serif': ['Crimson Text', 'Georgia', 'serif'],
        'sans': ['Inter', 'system-ui', 'sans-serif'],
        'mono': ['Courier Prime', 'Courier New', 'monospace'],
      },
      fontSize: {
        'xs': '0.75rem',
        'sm': '0.875rem',
        'base': '1rem',
        'lg': '1.125rem',
        'xl': '1.25rem',
        '2xl': '1.5rem',
        '3xl': '1.875rem',
        '4xl': '2.25rem',
      },
    },
  },
  plugins: [],
}
