/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ha: {
          primary: "var(--primary-color, #03a9f4)",
          accent: "var(--accent-color, #ff9800)",
          bg: "var(--primary-background-color, #fafafa)",
          card: "var(--ha-card-background, #ffffff)",
          text: "var(--primary-text-color, #212121)",
          "text-secondary": "var(--secondary-text-color, #727272)",
          divider: "var(--divider-color, #e0e0e0)",
          error: "var(--error-color, #db4437)",
          success: "var(--success-color, #43a047)",
          warning: "var(--warning-color, #ffa600)",
        },
        elec: {
          DEFAULT: "var(--primary-color, #03a9f4)",
        },
        water: {
          cold: "#42a5f5",
          hot: "#ef5350",
          DEFAULT: "#42a5f5",
        },
        device: {
          washer: "#4fc3f7",
          servers: "#ff7043",
          vacuum: "#66bb6a",
          base: "#bdbdbd",
        },
      },
    },
  },
  plugins: [],
};
