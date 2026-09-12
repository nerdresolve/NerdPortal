import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import Head from "next/head";
import { login, getMe } from "../services/api";
import brand from "../brand.config";
import styles from "../styles/Login.module.css";

export async function getServerSideProps(context) {
  const cookie = context.req.headers.cookie || "";

  try {
    const result = await getMe(cookie);
    if (result.success && result.data) {
      return { redirect: { destination: "/", permanent: false } };
    }
  } catch (e) {
  }

  return { props: {} };
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await login(email, password);

      if (result.success) {
        router.push("/");
      } else {
        setError(result.error || "Authentication failed.");
      }
    } catch (err) {
      setError("Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>{`${brand.name} | Sign in`}</title>
      </Head>

      <div className={styles.container}>
        <div className={styles.brandPanel}>
          <div className={styles.brandContent}>
            <img src="/logo-dark.svg" alt={brand.logoAlt} className={styles.brandLogo} />
            <h1 className={styles.brandTitle}>{brand.name}</h1>
            <p className={styles.brandSubtitle}>
              {brand.tagline}
            </p>
          </div>
          <div className={styles.meshContainer}>
            <div className={styles.meshTriangle1} />
            <div className={styles.meshTriangle2} />
            <div className={styles.meshTriangle3} />
            <div className={styles.meshTriangle4} />
          </div>
        </div>
        <div className={styles.formPanel}>
          <div className={styles.formWrapper}>
            <h2 className={styles.formTitle}>Sign in</h2>
            <p className={styles.formDescription}>
              Enter your credentials to access the portal.
            </p>

            <form onSubmit={handleSubmit} className={styles.form}>
              <div className="form-group">
                <label htmlFor="email" className="form-label">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  className="form-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />
              </div>

              <div className="form-group">
                <label htmlFor="password" className="form-label">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  className="form-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                />
              </div>

              {error && (
                <div className={styles.error}>{error}</div>
              )}

              <button
                type="submit"
                className={`btn btn-primary ${styles.submitBtn}`}
                disabled={loading}
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>

              <Link href="/reset-password" className={styles.secondaryLink}>
                Forgot my password
              </Link>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}

