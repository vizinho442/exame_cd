// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}", // <--- CRÍTICO: Garante que o Tailwind escaneia todos os ficheiros HTML e TS
  ],
  darkMode: 'class', // Permite alternar dark mode adicionando/removendo a classe 'dark'
  theme: {
    extend: {},
  },
  plugins: [], // Pode adicionar plugins aqui, como o 'tailwind-scrollbar-hide' se precisar
}


