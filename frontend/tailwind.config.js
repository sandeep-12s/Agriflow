/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Harvest-inspired palette used across AgriFlow, not a generic default
        leaf: '#2F5D3A',      // primary — growth, action
        soil: '#5B4636',      // secondary — grounded, earthy
        wheat: '#E8B84B',     // accent — value, ripeness
        husk: '#F6F2E9',      // background — unbleached, warm neutral
      },
    },
  },
  plugins: [],
}
