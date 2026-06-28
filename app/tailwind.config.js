/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        steel: {
          400: '#3D5070',
          500: '#2A3A54',
          600: '#1E2A40',
          700: '#141C2E',
          800: '#0E1420',
          900: '#080C14',
          950: '#050810',
        },
        nexus: {
          300: '#7EC8FF',
          400: '#33BBFF',
          500: '#00A8FF',
          600: '#0087CC',
          900: '#001A2E',
        },
        pulse: {
          400: '#00FFE7',
          500: '#00D4C2',
          900: '#001A18',
        },
        ink: {
          100: '#E8EFF8',
          300: '#8BA3C0',
          500: '#4A6080',
          700: '#253040',
        },
        threat: {
          500: '#FF3B3B',
          900: '#1A0000',
        },
        victory: {
          500: '#00E676',
          900: '#001A0A',
        },
        duel: {
          500: '#FF7043',
          900: '#1A0800',
        },
        circuit: {
          500: '#C084FC',
          900: '#1A0A2E',
        },
        'rank-gold': '#FFB830',
        'rank-silver': '#A8B8CC',
        'rank-bronze': '#CD7F32',
      },
      fontFamily: {
        display: ['Rajdhani', 'Arial', 'sans-serif'],
        body: ['Inter', 'Arial', 'sans-serif'],
        mono: ['JetBrains Mono', 'Courier New', 'monospace'],
      },
    },
  },
}
