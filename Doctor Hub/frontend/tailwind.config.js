import sharedPreset from '../shared/ui/tailwind.preset.js'

/** @type {import('tailwindcss').Config} */
export default {
  presets: [sharedPreset],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}', '../shared/ui/**/*.{js,jsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
}
