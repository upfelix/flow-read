/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Merriweather"', '"Georgia"', 'serif'],
        sans: ['"Inter"', 'sans-serif'],
      },
      colors: {
        highlight: {
          yellow: '#FFF3A3',
          red: '#FFC2C2',
          green: '#D1FADF',
        }
      },
      typography: (theme) => ({
        DEFAULT: {
          css: {
            maxWidth: '100%',
            fontFamily: theme('fontFamily.serif'),
            lineHeight: '1.8',
            fontSize: '1.125rem',
            color: '#334155', // slate-700
            h1: {
              fontFamily: theme('fontFamily.sans'),
              fontWeight: '800',
              color: '#1e293b', // slate-800
            },
            h2: {
              fontFamily: theme('fontFamily.sans'),
              fontWeight: '700',
              marginTop: '2em',
            },
            p: {
              marginTop: '1.5em',
              marginBottom: '1.5em',
            },
            '--tw-prose-body': '#334155',
            '--tw-prose-headings': '#1e293b',
            '--tw-prose-links': '#2563eb',
          },
        },
      }),
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
