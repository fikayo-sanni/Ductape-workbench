/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    fontFamily: {
      sans: ["var(--font-raleway)"],
    },
    extend: {
      borderRadius: {
        "10px": "10px",
      },
      colors: {
        primary: "rgba(var(--primary))",
        white: {
          700: "rgba(var(--white700))",
          DEFAULT: "rgba(var(--DEFAULT))",
        },
        grey: {
          100: "#F5F5F5",
          200: "rgba(var(--grey200))",
          400: "rgba(var(--grey400))",
          300: "#D7D7D7",
          800: "#78797A",
          900: "rgba(var(--grey900))",
          500: "#D9D9D9",
          600: "#78797A",
          700: "rgba(var(--grey700))",
          DEFAULT: "rgba(var(--grey))",
        },
        red: {
          DEFAULT: "#DC3444",
        },
        green: {
          DEFAULT: "#00875A",
        },
        yellow: {
          DEFAULT: "#FBBC05",
        },
        blue: {
          300: "#E8F0FD",
          400: "#E9ECF0",
        },
      },
      spacing: {
        18: "4.5rem",
        22: "5.5rem",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      boxShadow: {
        editor:
          "0px 7.11538px 21.3462px rgba(0, 0, 0, 0.07),0px 2.97264px 8.91791px rgba(0, 0, 0, 0.0503198),0px 1.58931px 4.76794px rgba(0, 0, 0, 0.0417275),0px 0.890957px 2.67287px rgba(0, 0, 0, 0.035),0px 0.47318px 1.41954px rgba(0, 0, 0, 0.0282725),0px 0.196901px 0.590703px rgba(0, 0, 0, 0.0196802)",
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
