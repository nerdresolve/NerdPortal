import { useMemo, useState } from "react";
import Link from "next/link";
import Head from "next/head";
import { getMe, requestPasswordReset, verifyPasswordResetCode, confirmPasswordReset } from "../services/api";
import styles from "../styles/RecuperarSenha.module.css";

const INTERNAL_API = process.env.INTERNAL_API_URL || "http://backend:4000/api/v1";

export async function getServerSideProps(context) {
  const cookie = context.req.headers.cookie || "";

  try {
    const result = await getMe(cookie);
    if (result.success && result.data) {
      return { redirect: { destination: "/", permanent: false } };
    }
  } catch (e) {
    // Not authenticated, show recovery flow
  }

  try {
    const res = await fetch(`${INTERNAL_API}/auth/me`);
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) {
      context.res.setHeader("Set-Cookie", setCookie);
    }
  } catch (e) {
    // Non-fatal: the form request will surface any CSRF issue
  }

  return { props: {} };
}

function validatePasswordStrength(password) {
  if (password.length < 12) return "A nova senha deve ter pelo menos 12 caracteres.";
  if (!/[a-z]/.test(password)) return "A nova senha deve conter ao menos uma letra minúscula.";
  if (!/[A-Z]/.test(password)) return "A nova senha deve conter ao menos uma letra maiúscula.";
  if (!/[0-9]/.test(password)) return "A nova senha deve conter ao menos um número.";
  if (!/[^A-Za-z0-9]/.test(password)) return "A nova senha deve conter ao menos um caractere especial.";
  return "";
}

export default function RecuperarSenhaPage() {
  const [step, setStep] = useState("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  const currentStepIndex = useMemo(() => {
    if (step === "request") return 0;
    if (step === "verify") return 1;
    if (step === "reset") return 2;
    return 2;
  }, [step]);

  async function handleRequestCode(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);

    try {
      const result = await requestPasswordReset(email.trim());
      if (!result || !result.success) {
        setError(result?.error || "Não foi possível iniciar a recuperação de senha.");
        return;
      }

      setStep("verify");
      setNotice(result.data?.message || "Se o e-mail estiver autorizado, um código será enviado.");
    } catch (err) {
      setError("Erro de conexão com o servidor.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);

    try {
      const result = await verifyPasswordResetCode(email.trim(), code.trim());
      if (!result || !result.success) {
        setError(result?.error || "Não foi possível validar o código informado.");
        return;
      }

      setResetToken(result.data?.resetToken || "");
      setStep("reset");
      setNotice(`Código validado. Defina a nova senha nos próximos ${result.data?.expiresInMinutes || 15} minutos.`);
    } catch (err) {
      setError("Erro de conexão com o servidor.");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmPassword(event) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (newPassword !== confirmPassword) {
      setError("A confirmação da senha não confere.");
      return;
    }

    const passwordError = validatePasswordStrength(newPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setLoading(true);

    try {
      const result = await confirmPasswordReset(email.trim(), resetToken, newPassword);
      if (!result || !result.success) {
        setError(result?.error || "Não foi possível redefinir a senha.");
        return;
      }

      setStep("success");
      setCode("");
      setResetToken("");
      setNewPassword("");
      setConfirmPassword("");
      setNotice(result.data?.message || "Senha redefinida com sucesso.");
    } catch (err) {
      setError("Erro de conexão com o servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>Portal do TI | Recuperar Senha</title>
      </Head>

      <div className={styles.container}>
        <div className={styles.brandPanel}>
          <div className={styles.brandContent}>
            <img src="/logo.webp" alt="NerdResolve" className={styles.brandLogo} />
            <h1 className={styles.brandTitle}>Recuperação de Senha</h1>
            <p className={styles.brandSubtitle}>
              Fluxo seguro para acesso administrativo do Portal do TI.
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
            <div className={styles.stepList}>
              {["Solicitar", "Validar", "Redefinir"].map((label, index) => (
                <div
                  key={label}
                  className={`${styles.stepItem} ${currentStepIndex >= index ? styles.stepItemActive : ""}`}
                >
                  <span className={styles.stepNumber}>{index + 1}</span>
                  <span className={styles.stepLabel}>{label}</span>
                </div>
              ))}
            </div>

            <h2 className={styles.formTitle}>Redefinir senha do administrador</h2>
            <p className={styles.formDescription}>
              Informe o e-mail administrativo, valide o código recebido e então defina uma nova senha.
            </p>

            {notice && <div className={styles.notice}>{notice}</div>}
            {error && <div className={styles.error}>{error}</div>}

            {step === "request" && (
              <form onSubmit={handleRequestCode} className={styles.form}>
                <div className="form-group">
                  <label htmlFor="email" className="form-label">E-mail administrativo</label>
                  <input
                    id="email"
                    type="email"
                    className="form-input"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="admin@empresa.com.br"
                    autoComplete="email"
                    required
                  />
                </div>

                <button type="submit" className={`btn btn-primary ${styles.submitBtn}`} disabled={loading}>
                  {loading ? "Enviando código..." : "Enviar código"}
                </button>
              </form>
            )}

            {step === "verify" && (
              <form onSubmit={handleVerifyCode} className={styles.form}>
                <div className={styles.summaryBox}>
                  <span className={styles.summaryLabel}>E-mail selecionado</span>
                  <strong className={styles.summaryValue}>{email}</strong>
                </div>

                <div className="form-group">
                  <label htmlFor="code" className="form-label">Código de autenticação</label>
                  <input
                    id="code"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    className={`form-input ${styles.codeInput}`}
                    value={code}
                    onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
                    placeholder="000000"
                    autoComplete="one-time-code"
                    required
                  />
                </div>

                <button type="submit" className={`btn btn-primary ${styles.submitBtn}`} disabled={loading}>
                  {loading ? "Validando..." : "Validar código"}
                </button>

                <button
                  type="button"
                  className={`btn btn-outline ${styles.secondaryBtn}`}
                  onClick={() => {
                    setStep("request");
                    setCode("");
                    setError("");
                    setNotice("");
                  }}
                  disabled={loading}
                >
                  Alterar e-mail
                </button>
              </form>
            )}

            {step === "reset" && (
              <form onSubmit={handleConfirmPassword} className={styles.form}>
                <div className={styles.summaryBox}>
                  <span className={styles.summaryLabel}>Conta validada</span>
                  <strong className={styles.summaryValue}>{email}</strong>
                </div>

                <div className="form-group">
                  <label htmlFor="newPassword" className="form-label">Nova senha</label>
                  <input
                    id="newPassword"
                    type="password"
                    className="form-input"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="Digite a nova senha"
                    autoComplete="new-password"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="confirmPassword" className="form-label">Confirmar nova senha</label>
                  <input
                    id="confirmPassword"
                    type="password"
                    className="form-input"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Repita a nova senha"
                    autoComplete="new-password"
                    required
                  />
                </div>

                <ul className={styles.passwordRules}>
                  <li>Pelo menos 12 caracteres</li>
                  <li>Uma letra maiúscula e uma minúscula</li>
                  <li>Ao menos um número e um caractere especial</li>
                </ul>

                <button type="submit" className={`btn btn-primary ${styles.submitBtn}`} disabled={loading}>
                  {loading ? "Redefinindo..." : "Salvar nova senha"}
                </button>
              </form>
            )}

            {step === "success" && (
              <div className={styles.successBox}>
                <h3 className={styles.successTitle}>Senha atualizada</h3>
                <p className={styles.successText}>
                  O acesso administrativo já pode ser feito com a nova senha.
                </p>
                <Link href="/login" className={`btn btn-primary ${styles.submitBtn}`}>
                  Voltar para o login
                </Link>
              </div>
            )}

            <Link href="/login" className={styles.backLink}>
              Voltar para o login
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
