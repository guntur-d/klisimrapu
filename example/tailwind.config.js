/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./dist/**/*.{html,js,pug}"],
  theme: {
    extend: {},
  },
  plugins: [require("daisyui")],
}