const crypto = require("crypto");
const { sendEmail } = require("./email");

const DEFAULT_CODE_TTL_MINUTES = parseInt(process.env.PASSWORD_RESET_CODE_TTL_MINUTES || "15", 10);
const DEFAULT_TOKEN_TTL_MINUTES = parseInt(process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES || "15", 10);
const CODE_LENGTH = 6;
const PASSWORD_RESET_CODE_ATTEMPTS = parseInt(process.env.PASSWORD_RESET_MAX_ATTEMPTS || "5", 10);

function generatePasswordResetCode() {
  const maxValue = 10 ** CODE_LENGTH;
  const code = crypto.randomInt(0, maxValue);
  return String(code).padStart(CODE_LENGTH, "0");
}

function generatePasswordResetToken() {
  return crypto.randomBytes(32).toString("hex");
}

function hashOpaqueToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function getCodeExpiryDate() {
  return new Date(Date.now() + DEFAULT_CODE_TTL_MINUTES * 60 * 1000);
}

function isExpired(dateLike) {
  return !dateLike || new Date(dateLike).getTime() <= Date.now();
}

function isVerifiedTokenExpired(verifiedAt) {
  if (!verifiedAt) return true;
  const verifiedAtMs = new Date(verifiedAt).getTime();
  return verifiedAtMs + DEFAULT_TOKEN_TTL_MINUTES * 60 * 1000 <= Date.now();
}

async function sendPasswordResetCodeEmail({ to, code, fullName }) {
  const expiresLabel = `${DEFAULT_CODE_TTL_MINUTES} minuto${DEFAULT_CODE_TTL_MINUTES > 1 ? "s" : ""}`;
  const subject = "Código de recuperação de senha - Portal do TI";
  const greeting = fullName ? `Olá, ${fullName}.` : "Olá.";
  const text = [
    greeting,
    "",
    "Recebemos uma solicitação de recuperação de senha para o acesso administrativo do Portal do TI.",
    "",
    `Seu código de autenticação é: ${code}`,
    "",
    `Ele expira em ${expiresLabel}.`,
    "Se você não solicitou a recuperação, ignore esta mensagem.",
  ].join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;">
      <p>${greeting}</p>
      <p>Recebemos uma solicitação de recuperação de senha para o acesso administrativo do <strong>Portal do TI</strong>.</p>
      <p style="margin: 24px 0;">
        <span style="display: inline-block; padding: 12px 18px; background: #007B4E; color: #ffffff; font-size: 24px; letter-spacing: 6px; border-radius: 8px; font-weight: 700;">
          ${code}
        </span>
      </p>
      <p>O código expira em <strong>${expiresLabel}</strong>.</p>
      <p>Se você não solicitou a recuperação, ignore esta mensagem.</p>
    </div>
  `;

  await sendEmail({
    to,
    subject,
    text,
    html,
  });
}

module.exports = {
  CODE_LENGTH,
  PASSWORD_RESET_CODE_ATTEMPTS,
  DEFAULT_CODE_TTL_MINUTES,
  DEFAULT_TOKEN_TTL_MINUTES,
  generatePasswordResetCode,
  generatePasswordResetToken,
  hashOpaqueToken,
  getCodeExpiryDate,
  isExpired,
  isVerifiedTokenExpired,
  sendPasswordResetCodeEmail,
};
