import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import Head from "next/head";
import { login, getMe } from "../services/api";
import styles from "../styles/Login.module.css";

const INTERNAL_API = process.env.INTERNAL_API_URL || "http://backend:4000/api/v1";

export async function getServerSideProps(context) {
  const cookie = context.req.headers.cookie || "";

  try {
    const result = await getMe(cookie);
    if (result.success && result.data) {
      return { redirect: { destination: "/", permanent: false } };
    }
  } catch (e) {
    // Not authenticated, show login
  }

  // Prime CSRF cookie via internal network so the browser has it before submitting
  try {
    const res = await fetch(`${INTERNAL_API}/auth/me`);
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) {
      context.res.setHeader("Set-Cookie", setCookie);
    }
  } catch (e) {
    // Non-fatal: login will handle missing CSRF gracefully
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
        setError(result.error || "Falha na autenticação.");
      }
    } catch (err) {
      setError("Erro de conexão com o servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>Portal do TI | Login</title>
      </Head>

      <div className={styles.container}>
        {/* Left panel with brand visual */}
        <div className={styles.brandPanel}>
          <div className={styles.brandContent}>
            <img src="/logo.webp" alt="Grupo Bravante" className={styles.brandLogo} />
            <h1 className={styles.brandTitle}>Portal do TI</h1>
            <p className={styles.brandSubtitle}>
              Portal de Tecnologia da Informação
            </p>
          </div>

          {/* Brand mesh graphic elements */}
          <div className={styles.meshContainer}>
            <div className={styles.meshTriangle1} />
            <div className={styles.meshTriangle2} />
            <div className={styles.meshTriangle3} />
            <div className={styles.meshTriangle4} />
          </div>
        </div>

        {/* Right panel with login form */}
        <div className={styles.formPanel}>
          <div className={styles.formWrapper}>
            <h2 className={styles.formTitle}>Acesso ao Sistema</h2>
            <p className={styles.formDescription}>
              Informe suas credenciais para acessar o portal.
            </p>

            <form onSubmit={handleSubmit} className={styles.form}>
              <div className="form-group">
                <label htmlFor="email" className="form-label">
                  E-mail
                </label>
                <input
                  id="email"
                  type="email"
                  className="form-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@bravante.com.br"
                  required
                  autoComplete="email"
                />
              </div>

              <div className="form-group">
                <label htmlFor="password" className="form-label">
                  Senha
                </label>
                <input
                  id="password"
                  type="password"
                  className="form-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
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
                {loading ? "Autenticando..." : "Entrar"}
              </button>

              <Link href="/recuperar-senha" className={styles.secondaryLink}>
                Esqueci minha senha
              </Link>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
