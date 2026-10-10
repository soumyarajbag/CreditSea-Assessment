import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}', './lib/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        ink: '#09233f',
        canvas: '#f5f9ff',
        brand: '#0075ff',
        accent: '#0075ff',
        mint: '#00c48b',
      },
      boxShadow: {
        soft: '0 18px 50px rgba(9, 35, 63, 0.08)',
      },
    },
  },
  plugins: [animate],
};

export default config;
