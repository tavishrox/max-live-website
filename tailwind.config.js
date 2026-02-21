import tailwindcssAnimate from 'tailwindcss-animate'

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      boxShadow: {
        '3xl': '0 35px 80px rgba(0, 0, 0, 0.6)',
      },
    },
  },
  plugins: [tailwindcssAnimate],
}
