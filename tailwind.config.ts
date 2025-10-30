import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#e3f2fd",
          100: "#bbdefb",
          500: "#0089ff",
          700: "#036178",
          900: "#04187d",
        },
        accent: {
          DEFAULT: "#077e8e",
          light: "#4ac7f5",
        },
      },
      backgroundImage: {
        "gradient-dark": "linear-gradient(to right, #04187d, #077e8e, #04187d)",
      },
    },
  },
  plugins: [],
};
export default config;

