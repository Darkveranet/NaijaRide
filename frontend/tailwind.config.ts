import type { Config } from 'tailwindcss';
const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: { brand: { 50:'#e9f9ef',100:'#c9f0d6',200:'#a7e6bf',500:'#0a8f45',600:'#087a3a',700:'#065e2d' } },
      fontFamily: { sans: ['Inter','system-ui','sans-serif'] },
      keyframes: { shimmer: { '100%': { transform: 'translateX(100%)' } } },
    },
  },
  plugins: [],
};
export default config;
