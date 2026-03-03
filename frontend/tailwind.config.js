/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    50: '#E8F3FD',  // Active Sidebar Background
                    100: '#D1E8FC',
                    200: '#A3D3F9',
                    300: '#76BEF6',
                    400: '#48A9F3',
                    500: '#1A8AE5',  // Base Brand Color
                    600: '#0E6EB8',  // Hover / Darker
                    700: '#0B5894',  // Text / Deep
                    800: '#084270',
                    900: '#052C4B',
                    950: '#031D32',
                }
            }
        },
    },
    plugins: [],
}
