/** @type {import('tailwindcss').Config} */
export default {
	darkMode: 'class', // Enable dark mode with class strategy
	content: ['./index.html', './src/**/*.{ts,tsx}'],
	theme: { extend: {} },
	plugins: [require('@tailwindcss/typography')],
};
