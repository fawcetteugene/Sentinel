/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: '#0f172a',
        panel: '#111c33',
        panel2: '#16213c',
        alert: '#ef4444',
        warning: '#f59e0b',
        success: '#10b981',
        calm: '#38bdf8',
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(56,189,248,.18), 0 24px 60px -20px rgba(15,23,42,.8)',
      },
    },
  },
  plugins: [],
}
