/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        card: "hsl(var(--card))",
        popover: "hsl(var(--popover))",
        "card-foreground": "hsl(var(--card-foreground))",
        "popover-foreground": "hsl(var(--popover-foreground))",
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        // HubSpot Brand Colors (DesignMD)
        brand: {
          orange: "#FF4800",
          "orange-dark": "#C93700",
          "orange-active": "#9F2800",
        },
        primary: {
          DEFAULT: "#FF4800",
          foreground: "#FFFFFF",
          hover: "#C93700",
          active: "#9F2800",
        },
        secondary: {
          DEFAULT: "#124548",
          foreground: "#FFFFFF",
          hover: "#2F7579",
          tint: "#CAEBFF",
        },
        accent: {
          teal: "#124548",
          "teal-medium": "#2F7579",
          "teal-light": "#CAEBFF",
          navy: "#15295A",
          "navy-medium": "#180BB1",
          slate: "#425B76",
        },
        destructive: {
          DEFAULT: "#D9002B",
          foreground: "#FFFFFF",
        },
        neutral: {
          primary: "#1F1F1F",
          secondary: "#9B9897",
          muted: "#B9CDBE",
          border: "#CFCCCB",
          light: "#FCFCFA",
          cream: "#F8F5EE",
        },
        background: {
          DEFAULT: "#F8F5EE",
          surface: "#FFFFFF",
          subtle: "#FCFCFA",
          cream: "#F8F5EE",
        },
        foreground: {
          DEFAULT: "#1F1F1F",
          secondary: "#9B9897",
        },
        border: {
          DEFAULT: "#CFCCCB",
          thin: "rgba(0, 0, 0, 0.47)",
          medium: "rgba(0, 0, 0, 0.11)",
        },
      },
      fontFamily: {
        serif: ["Playfair", "Georgia", "serif"],
        sans: [
          "'Plus Jakarta Sans'",
          "Lato",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "sans-serif",
        ],
      },
      borderRadius: {
        none: "0px",
        sm: "4px",
        md: "8px",
        lg: "16px",
        xl: "24px",
      },
      boxShadow: {
        raised: "rgba(33, 51, 67, 0.12) 0px 2px 4px 0px",
        elevated:
          "rgba(33, 51, 67, 0.12) 0px 2px 4px 0px, 0px 4px 12px rgba(33, 51, 67, 0.08)",
        floating: "0 20px 40px rgba(0, 0, 0, 0.16)",
        "focus-orange": "0 0 0 3px rgba(255, 72, 0, 0.1)",
      },
      spacing: {
        4.5: "18px",
        13: "52px",
        45: "180px",
      },
      maxWidth: {
        container: "1440px",
      },
    },
  },
  plugins: [],
};
