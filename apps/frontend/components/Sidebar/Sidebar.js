import Link from "next/link";
import { useRouter } from "next/router";
import styles from "./Sidebar.module.css";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/dashboard", label: "Dashboard", icon: "chart" },
  { href: "/comunicados", label: "Comunicados", icon: "megaphone" },
  { href: "/documentos", label: "Documentos", icon: "folder" },
  { href: "/equipe", label: "Equipe TI", icon: "people" },
  { href: "/sistemas", label: "Sistemas", icon: "server" },
  { href: "/chamados", label: "Chamados", icon: "ticket" },
];

// SVG icon map (inline, no external dependencies)
const ICONS = {
  home: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10L10 3l7 7" />
      <path d="M5 8.5V16a1 1 0 001 1h3v-4h2v4h3a1 1 0 001-1V8.5" />
    </svg>
  ),
  chart: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="10" width="3" height="7" rx="0.5" />
      <rect x="8.5" y="6" width="3" height="11" rx="0.5" />
      <rect x="15" y="3" width="3" height="14" rx="0.5" />
    </svg>
  ),
  megaphone: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 4L6 7H3.5A1.5 1.5 0 002 8.5v3A1.5 1.5 0 003.5 13H6l9 3V4z" />
      <path d="M6 7v6" />
      <path d="M17 7.5a4 4 0 010 5" />
    </svg>
  ),
  folder: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 5a2 2 0 012-2h3.172a2 2 0 011.414.586l.828.828A2 2 0 0010.828 5H16a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V5z" />
    </svg>
  ),
  people: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7" cy="6" r="2.5" />
      <path d="M2 16v-1a4 4 0 014-4h2a4 4 0 014 4v1" />
      <circle cx="14" cy="7" r="2" />
      <path d="M14 11a3.5 3.5 0 013.5 3.5V16" />
    </svg>
  ),
  server: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="14" height="5" rx="1" />
      <rect x="3" y="12" width="14" height="5" rx="1" />
      <circle cx="6" cy="5.5" r="0.75" fill="currentColor" />
      <circle cx="6" cy="14.5" r="0.75" fill="currentColor" />
    </svg>
  ),
  ticket: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 7a2 2 0 012-2h12a2 2 0 012 2v1.5a1.5 1.5 0 100 3V13a2 2 0 01-2 2H4a2 2 0 01-2-2v-1.5a1.5 1.5 0 100-3V7z" />
      <path d="M8 5v10" strokeDasharray="2 2" />
    </svg>
  ),
};

export default function Sidebar() {
  const router = useRouter();

  function isActive(href) {
    if (href === "/") return router.pathname === "/";
    return router.pathname.startsWith(href);
  }

  return (
    <aside className={styles.sidebar}>
      <nav className={styles.nav}>
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.navItem} ${isActive(item.href) ? styles.active : ""}`}
          >
            <span className={styles.icon}>{ICONS[item.icon]}</span>
            <span className={styles.label}>{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className={styles.sidebarFooter}>
        <div className={styles.meshDecor} />
      </div>
    </aside>
  );
}
