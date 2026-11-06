/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bakery: {
          cream: '#FFF9DF',       // Main background
          chocolate: '#3B170B',   // Sidebar & primary buttons
          caramel: '#A97845',     // Accents & highlights
          ivory: '#FFFDF5',       // Cards & content surfaces
          espresso: '#17110D',    // Main text & icons
          beige: '#E9D8B8',       // Borders & dividers
          muted: '#8C7A6B',
          light: '#FAF5E8',
        },
        status: {
          green: '#15803d',
          greenLight: '#dcfce7',
          orange: '#c2410c',
          orangeLight: '#ffedd5',
          red: '#b91c1c',
          redLight: '#fee2e2',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Playfair Display', 'Georgia', 'serif'],
      },
      boxShadow: {
        'warm-sm': '0 1px 3px rgba(59, 23, 11, 0.06), 0 1px 2px rgba(59, 23, 11, 0.04)',
        'warm': '0 4px 12px rgba(59, 23, 11, 0.08), 0 2px 4px rgba(59, 23, 11, 0.04)',
        'warm-lg': '0 10px 25px rgba(59, 23, 11, 0.12), 0 4px 10px rgba(59, 23, 11, 0.06)',
      }
    },
  },
  plugins: [],
}

