import sharedPreset from './src/lib/ui/tailwind.preset.js'

/** @type {import('tailwindcss').Config} */
export default {
  presets: [sharedPreset],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
}
