/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'cube-white': '#FFFFFF',
        'cube-yellow': '#FFD500',
        'cube-red': '#C41E3A',
        'cube-orange': '#FF5800',
        'cube-green': '#009B48',
        'cube-blue': '#0051BA',
      },
    },
  },
  plugins: [],
}
