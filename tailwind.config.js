/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        void: '#05030c',
        panel: '#0d0a1c',
        neon: { purple: '#a855f7', violet: '#7c3aed', green: '#39ff88', pink: '#ff3ea5', cyan: '#22d3ee' },
      },
      fontFamily: {
        display: ['Orbitron', 'system-ui', 'sans-serif'],
        body: ['Rajdhani', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        neon: '0 0 18px rgba(168,85,247,.55), inset 0 0 12px rgba(168,85,247,.15)',
        green: '0 0 18px rgba(57,255,136,.5)',
      },
      keyframes: {
        rise: { '0%': { opacity: 0, transform: 'translateY(14px)' }, '100%': { opacity: 1, transform: 'none' } },
        pulseglow: { '0%,100%': { opacity: 0.6 }, '50%': { opacity: 1 } },
        pop: { '0%': { transform: 'scale(.6)', opacity: 0 }, '60%': { transform: 'scale(1.1)', opacity: 1 }, '100%': { transform: 'scale(1)' } },
        scan: { '0%': { transform: 'translateY(-100%)' }, '100%': { transform: 'translateY(100%)' } },
      },
      animation: {
        rise: 'rise .45s ease-out both',
        pulseglow: 'pulseglow 2s ease-in-out infinite',
        pop: 'pop .5s cubic-bezier(.2,1.4,.4,1) both',
        scan: 'scan 3s linear infinite',
      },
    },
  },
  plugins: [],
};
