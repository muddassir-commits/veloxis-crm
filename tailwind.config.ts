import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#060D1A',
          900: '#0D1829',
          800: '#132035',
          700: '#1A2D47',
          600: '#1E3352',
        },
        brand: {
          blue: '#1B4FD8',
          orange: '#F97316',
        }
      },
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '7px',
        lg: '10px',
        xl: '12px',
      }
    }
  },
  plugins: [],
};

export default config;
