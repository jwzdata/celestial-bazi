/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./public/**/*.{html,js}"],
  theme: {
    extend: {
      colors: {
        bg: '#0d1117',
        'bg-s': '#151b28',
        'bg-e': '#222b3a',
        accent: '#f0d78c',
        'accent-w': '#e6a857',
        'accent-d': 'rgba(255, 215, 0, 0.2)',
        wood: '#81c784',
        fire: '#ff9800',
        earth: '#ffc107',
        metal: '#e0e0e0',
        water: '#64b5f6'
      },
      fontFamily: {
        serif: ['Noto Serif SC', 'serif'],
        sans: ['Noto Sans SC', 'sans-serif']
      }
    }
  },
  plugins: [],
}
