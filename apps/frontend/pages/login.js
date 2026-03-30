import { useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { login, getMe } from "../services/api";
import styles from "../styles/Login.module.css";

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
        setError(result.error || "Falha na autenticacao");
      }
    } catch (err) {
      setError("Erro de conexao com o servidor");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>Login - ITPortal</title>
      </Head>

      <div className={styles.container}>
        {/* Left panel with brand visual */}
        <div className={styles.brandPanel}>
          <div className={styles.brandContent}>
            <img src="/logo.png" alt="Grupo Bravante" className={styles.brandLogo} />
            <h1 className={styles.brandTitle}>ITPortal</h1>
            <p className={styles.brandSubtitle}>
              Portal de Tecnologia da Informacao
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
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
