/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'custom-green': '#00ff9f',
        'custom-blue': '#00b8ff',
        'custom-orange': '#ff4f00',
        'custom-pink': '#ff0060',
        'custom-purple': '#8b00ff',
        'custom-grey': '#808080',
        gray: {
          50: '#fafafa',
          100: '#f3f4f6',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
          950: "#0a0a0a"
        },
      },
    }
  },
  plugins: [],
}

