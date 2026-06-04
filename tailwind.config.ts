import type { Config } from "tailwindcss";
import { tokens } from "./src/lib/design-tokens";

export default {
  darkMode: ["class"],
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
        sans: ['Montserrat', 'sans-serif'],
        display: ['Playfair Display', 'serif'],
        // Design System (Tijolo em Capital) — usados pelos componentes ui-system.
        'ds-display': tokens.font.display,
        'ds-body': tokens.font.body,
        'ds-mono': tokens.font.mono,
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
        gold: {
          DEFAULT: "hsl(var(--gold))",
          light: "hsl(var(--gold-light))",
          dark: "hsl(var(--gold-dark))",
        },
        // Design System (Tijolo em Capital) — paleta editorial-imobiliária.
        brand: {
          gold: tokens.color.brand.gold,
          goldSoft: tokens.color.brand.goldSoft,
          goldDeep: tokens.color.brand.goldDeep,
        },
        ink: {
          900: tokens.color.ink[900],
          700: tokens.color.ink[700],
          500: tokens.color.ink[500],
          300: tokens.color.ink[300],
        },
        cream: {
          50: tokens.color.neutral[50],
          100: tokens.color.neutral[100],
          200: tokens.color.neutral[200],
          300: tokens.color.neutral[300],
        },
        semantic: {
          success: tokens.color.semantic.success,
          warning: tokens.color.semantic.warning,
          danger: tokens.color.semantic.danger,
          info: tokens.color.semantic.info,
        },
        charcoal: {
          DEFAULT: "hsl(var(--charcoal))",
          light: "hsl(var(--charcoal-light))",
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
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        // Design System — extras sem colidir com os existentes.
        'ds-sm': tokens.radius.sm,
        'ds-md': tokens.radius.md,
        'ds-lg': tokens.radius.lg,
        'ds-xl': tokens.radius.xl,
        'ds-pill': tokens.radius.pill,
      },
      boxShadow: {
        'card': 'var(--shadow-card)',
        'card-hover': 'var(--shadow-card-hover)',
        'gold': 'var(--shadow-gold)',
        // Design System — elevação editorial.
        'ds-sm': tokens.shadow.sm,
        'ds-md': tokens.shadow.md,
        'ds-lg': tokens.shadow.lg,
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
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.5s ease-out",
        "slide-up": "slide-up 0.5s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
