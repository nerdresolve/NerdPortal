import Link from "next/link";
import { useRouter } from "next/router";
import { isAdminUser } from "../../services/auth";
import styles from "./Header.module.css";

export default function Header({ user }) {
  const router = useRouter();
  const isAdmin = isAdminUser(user);

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
            alt="NerdResolve"
            className={styles.logo}
          />
        </Link>
        <div className={styles.divider} />
        <Link href="/" className={styles.portalName}>Portal do TI</Link>
      </div>

      {user && (
        <div className={styles.right}>
          {isAdmin && <div className={styles.adminBadge}>Admin</div>}
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
        </div>
      )}
    </header>
  );
}
