import styles from "./Footer.module.css";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <span className={styles.copyright}>
        NerdResolve - Tecnologia da Informacao {year}
      </span>
      <span className={styles.version}>ITPortal v0.1.0</span>
    </footer>
  );
}
