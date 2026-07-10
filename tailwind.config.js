/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg:    '#06061A',
        bg2:   '#0A0A22',
        s1:    '#10102C',
        s2:    '#141438',
        s3:    '#1A1A44',
        s4:    '#202055',
        tx:    '#EEEEFF',
        t2:    '#8888BB',
        t3:    '#5555AA',
        g:     '#1DB954',
        g2:    '#1ed760',
        p:     '#7C5CBF',
        p2:    '#9B7FE8',
        rd:    '#FF4D6D',
        yw:    '#FFA726',
        bl:    '#3D8EF8',
        bl2:   '#6AABFF',
      },
      fontFamily: {
        syne:  ['Syne', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      },
      animation: {
        'spin-slow': 'spin 10s linear infinite',
        'pulse-dot': 'pulse 2s infinite',
        'orb-float': 'orbFloat 24s ease-in-out infinite',
        'shimmer': 'shimmer 1.6s infinite linear',
      },
      keyframes: {
        orbFloat: {
          '0%,100%': { transform: 'translate(0,0) scale(1)' },
          '33%':     { transform: 'translate(40px,-50px) scale(1.08)' },
          '66%':     { transform: 'translate(-35px,40px) scale(.94)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-800px 0' },
          '100%': { backgroundPosition: '800px 0' },
        },
      },
    },
  },
  plugins: [],
}
