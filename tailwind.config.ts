import type { Config } from "tailwindcss";

export default {
  darkMode: ["selector", "[data-theme='dark']"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
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
        // Neurodivergent tokens
        "nd-app": "hsl(var(--bg-app))",
        "nd-sidebar": "hsl(var(--sidebar-background))",
        "nd-surface": "hsl(var(--bg-surface))",
        "nd-surface-alt": "hsl(var(--bg-surface-alt))",
        "nd-elevated": "hsl(var(--bg-elevated))",
        "nd-bg-subtask": "hsl(var(--bg-subtask))",
        "nd-hover": "hsl(var(--bg-hover))",
        "nd-active": "hsl(var(--bg-active))",
        "nd-input": "hsl(var(--bg-input))",
        "nd-text": "hsl(var(--text-primary))",
        "nd-text-secondary": "hsl(var(--text-secondary))",
        "nd-text-muted": "hsl(var(--text-muted))",
        "nd-text-completed": "hsl(var(--text-completed))",
        "nd-border": "hsl(var(--border-subtle))",
        "nd-border-input": "hsl(var(--border-input))",
        "nd-done": "hsl(var(--status-done))",
        "nd-progress": "hsl(var(--status-progress))",
        "nd-pending": "hsl(var(--status-pending))",
        "nd-overdue": "hsl(var(--status-overdue))",
        "nd-priority-high": "hsl(var(--priority-high))",
        "nd-priority-medium": "hsl(var(--priority-medium))",
        // Client colors
        "client-1": "hsl(var(--client-1))",
        "client-2": "hsl(var(--client-2))",
        "client-3": "hsl(var(--client-3))",
        "client-4": "hsl(var(--client-4))",
        "client-5": "hsl(var(--client-5))",
        "client-6": "hsl(var(--client-6))",
        "client-7": "hsl(var(--client-7))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "slide-in-right": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
        "slide-out-right": {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(100%)" },
        },
        "slide-in-left": {
          from: { transform: "translateX(-100%)" },
          to: { transform: "translateX(0)" },
        },
        "toast-progress": {
          from: { transform: "scaleX(1)" },
          to: { transform: "scaleX(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "slide-in-right": "slide-in-right 200ms ease-out",
        "slide-out-right": "slide-out-right 200ms ease-in",
        "slide-in-left": "slide-in-left 200ms ease-out",
        "toast-progress": "toast-progress var(--toast-duration, 5000ms) linear forwards",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
