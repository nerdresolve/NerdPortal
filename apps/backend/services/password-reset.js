const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { sendEmail } = require("./email");

const DEFAULT_CODE_TTL_MINUTES = parseInt(process.env.PASSWORD_RESET_CODE_TTL_MINUTES || "15", 10);
const DEFAULT_TOKEN_TTL_MINUTES = parseInt(process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES || "15", 10);
const CODE_LENGTH = 6;
const PASSWORD_RESET_CODE_ATTEMPTS = parseInt(process.env.PASSWORD_RESET_MAX_ATTEMPTS || "5", 10);

const MAIL_DIR = path.join(__dirname, "../mail");
const BANNER_PATH = path.join(MAIL_DIR, "images/563d8f3e0c2b804f552fc4aa5c3b4391.png");

// Read and base64-encode the banner image once at startup
let bannerDataUri = "";
try {
  const imgBuffer = fs.readFileSync(BANNER_PATH);
  bannerDataUri = `data:image/png;base64,${imgBuffer.toString("base64")}`;
} catch {
  // Banner unavailable — email will render without it
}

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

function buildResetEmailHtml(code) {
  const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/$/, "");
  const resetLink = `${frontendUrl}/reset-password`;
  const expiresLabel = `${DEFAULT_CODE_TTL_MINUTES} minute${DEFAULT_CODE_TTL_MINUTES > 1 ? "s" : ""}`;

  const bannerImg = bannerDataUri
    ? `<img src="${bannerDataUri}" width="600" height="203" style="display:block;width:100%;height:auto;max-width:100%">`
    : "";

  // Read the template and replace the placeholder block with code + link
  let html;
  try {
    html = fs.readFileSync(path.join(MAIL_DIR, "email.html"), "utf8");
  } catch {
    return null;
  }

  // Replace the relative image src with the inline data URI
  html = html.replace(/src="images\/[^"]+"/g, `src="${bannerDataUri}"`);

  // Inject code + link in place of the blank lines reserved in the template
  const codeBlock = `
    <br>
    <table cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 16px 0">
      <tbody><tr><td style="background:#7C3AED;border-radius:8px;padding:14px 24px;text-align:center">
        <span style="font-family:Arial,sans-serif;font-size:28px;font-weight:700;letter-spacing:8px;color:#ffffff">${code}</span>
      </td></tr></tbody>
    </table>
    <span style="font-family:Arial,sans-serif;font-size:14px;color:#6b7280">
      Expires in <strong>${expiresLabel}</strong>.
    </span>
    <br><br>
    <span style="font-family:Arial,sans-serif;font-size:14px">
      Or click the link below to open the reset page:<br>
      <a href="${resetLink}" style="color:#7C3AED">${resetLink}</a>
    </span>
    <br>`;

  html = html.replace(/<br><br><br><br><br><br>/, codeBlock);

  return html;
}

async function sendPasswordResetCodeEmail({ to, code, fullName }) {
  const expiresLabel = `${DEFAULT_CODE_TTL_MINUTES} minute${DEFAULT_CODE_TTL_MINUTES > 1 ? "s" : ""}`;
  const subject = "Your NerdPortal password reset code";

  const text = [
    fullName ? `Hello ${fullName},` : "Hello,",
    "",
    "You requested a password reset for your NerdPortal account.",
    "",
    `Your verification code is: ${code}`,
    `It expires in ${expiresLabel}.`,
    "",
    "If you did not request this, you can safely ignore this email.",
    "",
    "Thanks,",
    "The IT Team",
  ].join("\n");

  const html = buildResetEmailHtml(code);

  await sendEmail({ to, subject, text, html: html || `<pre>${text}</pre>` });
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
