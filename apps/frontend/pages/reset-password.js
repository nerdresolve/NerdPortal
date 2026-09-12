import { useMemo, useState } from "react";
import Link from "next/link";
import Head from "next/head";
import { getMe, requestPasswordReset, verifyPasswordResetCode, confirmPasswordReset } from "../services/api";
import brand from "../brand.config";
import styles from "../styles/ResetPassword.module.css";

export async function getServerSideProps(context) {
  const cookie = context.req.headers.cookie || "";

  try {
    const result = await getMe(cookie);
    if (result.success && result.data) {
      return { redirect: { destination: "/", permanent: false } };
    }
  } catch (e) {}

  return { props: {} };
}

function validatePasswordStrength(password) {
  if (password.length < 12) return "The new password must be at least 12 characters long.";
  if (!/[a-z]/.test(password)) return "The new password must contain at least one lowercase letter.";
  if (!/[A-Z]/.test(password)) return "The new password must contain at least one uppercase letter.";
  if (!/[0-9]/.test(password)) return "The new password must contain at least one number.";
  if (!/[^A-Za-z0-9]/.test(password)) return "The new password must contain at least one special character.";
  return "";
}

export default function ResetPasswordPage() {
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
        setError(result?.error || "Could not start the password reset process.");
        return;
      }

      setStep("verify");
      setNotice(result.data?.message || "If the email is authorized, a code will be sent.");
    } catch (err) {
      setError("Connection error with the server.");
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
        setError(result?.error || "Could not validate the code provided.");
        return;
      }

      setResetToken(result.data?.resetToken || "");
      setStep("reset");
      setNotice(`Code validated. Set your new password within the next ${result.data?.expiresInMinutes || 15} minutes.`);
    } catch (err) {
      setError("Connection error with the server.");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmPassword(event) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (newPassword !== confirmPassword) {
      setError("The password confirmation does not match.");
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
        setError(result?.error || "Could not reset the password.");
        return;
      }

      setStep("success");
      setCode("");
      setResetToken("");
      setNewPassword("");
      setConfirmPassword("");
      setNotice(result.data?.message || "Password reset successfully.");
    } catch (err) {
      setError("Connection error with the server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>NerdPortal | Reset Password</title>
      </Head>

      <div className={styles.container}>
        <div className={styles.brandPanel}>
          <div className={styles.brandContent}>
            <img src="/logo-dark.svg" alt={brand.logoAlt} className={styles.brandLogo} />
            <h1 className={styles.brandTitle}>Password Recovery</h1>
            <p className={styles.brandSubtitle}>
              Secure flow for NerdPortal administrative access.
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
              {["Request", "Verify", "Reset"].map((label, index) => (
                <div
                  key={label}
                  className={`${styles.stepItem} ${currentStepIndex >= index ? styles.stepItemActive : ""}`}
                >
                  <span className={styles.stepNumber}>{index + 1}</span>
                  <span className={styles.stepLabel}>{label}</span>
                </div>
              ))}
            </div>

            <h2 className={styles.formTitle}>Reset administrator password</h2>
            <p className={styles.formDescription}>
              Enter the administrator email, verify the code you receive, and then set a new password.
            </p>

            {notice && <div className={styles.notice}>{notice}</div>}
            {error && <div className={styles.error}>{error}</div>}

            {step === "request" && (
              <form onSubmit={handleRequestCode} className={styles.form}>
                <div className="form-group">
                  <label htmlFor="email" className="form-label">Administrator email</label>
                  <input
                    id="email"
                    type="email"
                    className="form-input"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="admin@example.com"
                    autoComplete="email"
                    required
                  />
                </div>

                <button type="submit" className={`btn btn-primary ${styles.submitBtn}`} disabled={loading}>
                  {loading ? "Sending code..." : "Send code"}
                </button>
              </form>
            )}

            {step === "verify" && (
              <form onSubmit={handleVerifyCode} className={styles.form}>
                <div className={styles.summaryBox}>
                  <span className={styles.summaryLabel}>Selected email</span>
                  <strong className={styles.summaryValue}>{email}</strong>
                </div>

                <div className="form-group">
                  <label htmlFor="code" className="form-label">Authentication code</label>
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
                  {loading ? "Verifying..." : "Verify code"}
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
                  Change email
                </button>
              </form>
            )}

            {step === "reset" && (
              <form onSubmit={handleConfirmPassword} className={styles.form}>
                <div className={styles.summaryBox}>
                  <span className={styles.summaryLabel}>Verified account</span>
                  <strong className={styles.summaryValue}>{email}</strong>
                </div>

                <div className="form-group">
                  <label htmlFor="newPassword" className="form-label">New password</label>
                  <input
                    id="newPassword"
                    type="password"
                    className="form-input"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="Enter the new password"
                    autoComplete="new-password"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="confirmPassword" className="form-label">Confirm new password</label>
                  <input
                    id="confirmPassword"
                    type="password"
                    className="form-input"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Repeat the new password"
                    autoComplete="new-password"
                    required
                  />
                </div>

                <ul className={styles.passwordRules}>
                  <li>At least 12 characters</li>
                  <li>One uppercase and one lowercase letter</li>
                  <li>At least one number and one special character</li>
                </ul>

                <button type="submit" className={`btn btn-primary ${styles.submitBtn}`} disabled={loading}>
                  {loading ? "Resetting..." : "Save new password"}
                </button>
              </form>
            )}

            {step === "success" && (
              <div className={styles.successBox}>
                <h3 className={styles.successTitle}>Password updated</h3>
                <p className={styles.successText}>
                  You can now sign in with the new password.
                </p>
                <Link href="/login" className={`btn btn-primary ${styles.submitBtn}`}>
                  Back to login
                </Link>
              </div>
            )}

            <Link href="/login" className={styles.backLink}>
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

