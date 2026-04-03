import styles from "./Footer.module.css";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <span className={styles.copyright}>
        Grupo Bravante - Tecnologia da Informação {year}
      </span>
      <span className={styles.version}>Portal do TI v0.1.0</span>
    </footer>
  );
}
