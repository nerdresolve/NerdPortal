import Link from "next/link";
import { useRouter } from "next/router";
import { isAdminUser } from "../../services/auth";
import { logout } from "../../services/api";
import brand from "../../brand.config";
import styles from "./Header.module.css";

export default function Header({ user }) {
  const router = useRouter();
  const isAdmin = isAdminUser(user);

  async function handleLogout() {
    await logout();
    router.push("/");
  }

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <Link href="/" className={styles.brandLink}>
          <img
            src={brand.logo}
            alt={brand.logoAlt}
            className={styles.logo}
          />
        </Link>
        {brand.organization && (
          <>
            <div className={styles.divider} />
            <span className={styles.portalName}>{brand.organization}</span>
          </>
        )}
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
            Sign out
          </button>
        </div>
      )}
    </header>
  );
}
