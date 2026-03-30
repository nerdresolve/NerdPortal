import Link from "next/link";
import { useRouter } from "next/router";
import styles from "./Header.module.css";

export default function Header({ user }) {
  const router = useRouter();

  async function handleLogout() {
    const api = require("../../services/api");
    await api.logout();
    router.push("/");
  }

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <Link href="/">
          <img
            src="/logo.webp"
            alt="Grupo Bravante"
            className={styles.logo}
          />
        </Link>
        <div className={styles.divider} />
        <Link href="/" className={styles.portalName}>ITPortal</Link>
      </div>

      <div className={styles.right}>
        {user ? (
          <>
            <div className={styles.adminBadge}>Admin</div>
            <div className={styles.userInfo}>
              <span className={styles.userName}>{user.fullName}</span>
              <span className={styles.userRole}>{user.role}</span>
            </div>
            <button
              className={styles.logoutBtn}
              onClick={handleLogout}
              type="button"
            >
              Sair
            </button>
          </>
        ) : (
          <Link href="/login" className={styles.loginLink}>
            Acesso Admin
          </Link>
        )}
      </div>
    </header>
  );
}
