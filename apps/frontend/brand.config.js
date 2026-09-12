/**
 * NerdPortal — single source of truth for visual identity and naming.
 *
 * This is the ONE file you edit to make the portal yours. Everything else
 * (CSS variables, page titles, emails, the login screen) reads from here.
 *
 * Nothing in this file is secret — it ships to the browser. Credentials and
 * anything environment-specific belong in .env instead.
 */

const brand = {
  // ---------------------------------------------------------------------
  // Identity
  // ---------------------------------------------------------------------
  name: "NerdPortal",
  // Shown next to the logo in the header. Set to your company name.
  organization: "NerdResolve",
  // One line, used on the home page and in the <meta description>.
  tagline: "The IT department's front door: systems, documents, announcements and metrics in one place.",
  // Appears in the footer, next to the year.
  footerNote: "IT Department",

  // ---------------------------------------------------------------------
  // Logo — files live in apps/frontend/public/
  // Replace the files, or point these at your own.
  // ---------------------------------------------------------------------
  logo: "/logo.svg",
  favicon: "/favicon.svg",
  // Alt text for the logo image (accessibility).
  logoAlt: "NerdResolve",

  // ---------------------------------------------------------------------
  // Colors — every value is a plain CSS color.
  // These become CSS custom properties at runtime; see styles/globals.css.
  // ---------------------------------------------------------------------
  colors: {
    // The main brand color: buttons, links, headings, active nav.
    primary: "#7C3AED",
    // Lighter primary, used for hover states.
    primaryLight: "#A855F7",
    // Darker primary, used for gradients and pressed states.
    primaryDark: "#6D28D9",
    // Secondary highlight: badges, chart accents, the "warning" tone.
    accent: "#A855F7",
    accentLight: "#C084FC",

    // Semantic states.
    success: "#0F7A42",
    error: "#DC2626",
    warning: "#D97706",

    // Neutrals. Override only if your brand needs a warmer/cooler gray.
    text: "#2E2F35",
    textMuted: "#6B6B76",
    background: "#FFFFFF",
    backgroundAlt: "#F7F7FA",
    border: "#E4E2E9",
  },

  // ---------------------------------------------------------------------
  // Typography — any CSS font stack. Add a <link> in pages/_document.js
  // if you use a webfont that isn't installed locally.
  // ---------------------------------------------------------------------
  fonts: {
    primary:
      '"Manrope", "Segoe UI", "Inter", "Helvetica Neue", Arial, sans-serif',
    mono: '"SF Mono", "Cascadia Code", "Consolas", monospace',
  },

  // ---------------------------------------------------------------------
  // Contact — shown on the Support page.
  // ---------------------------------------------------------------------
  support: {
    email: "it@example.com",
    phone: "+1 (555) 010-0000",
    hours: "Monday to Friday, 9am – 6pm",
    // Optional: link to your existing ticketing tool. Empty string hides it.
    ticketUrl: "",
  },
};

module.exports = brand;
