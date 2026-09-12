import brand from "../../brand.config";
import styles from "./Footer.module.css";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <span className={styles.copyright}>
        {brand.organization} - {brand.footerNote} {year}
      </span>
      <span className={styles.version}>{brand.name} v1.0.0</span>
    </footer>
  );
}
