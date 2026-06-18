import type { Config } from 'tailwindcss';
import typography from '@tailwindcss/typography';
import animate from 'tailwindcss-animate';

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx,mdx}'],
  theme: {
    container: {
      center: true,
      padding: { DEFAULT: '1rem', sm: '1.5rem', lg: '2rem' },
      screens: { '2xl': '1280px' },
    },
    extend: {
      fontFamily: {
        serif: ['var(--font-playfair)', 'Georgia', 'serif'],
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      colors: {
        gold: {
          50: '#fdf8f0',
          100: '#faecd5',
          200: '#f4d5a0',
          300: '#edb96a',
          400: '#e6a040',
          500: '#d4882e',
          600: '#b86d22',
          700: '#99531f',
          800: '#7d4320',
          900: '#67381e',
        },
        cream: {
          50: '#fefdfb',
          100: '#fdf9f3',
          200: '#f9f0e3',
          300: '#f3e3cc',
        },
        warm: {
          50: '#faf8f5',
          100: '#f5f0ea',
          200: '#ede5d9',
        },
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(30px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      animation: {
        shimmer: 'shimmer 2.5s infinite',
        'fade-in-up': 'fade-in-up 0.8s ease-out forwards',
        float: 'float 6s ease-in-out infinite',
      },
    },
  },
  plugins: [animate, typography],
};

export default config;
