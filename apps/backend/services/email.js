const net = require("net");
const tls = require("tls");
const os = require("os");
const crypto = require("crypto");
const { escapeHtml } = require("../utils/sanitize");

function parseBoolean(value, defaultValue) {
  if (value === undefined || value === null || value === "") return defaultValue;
  return String(value).toLowerCase() === "true";
}

function getEmailConfig() {
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  return {
    host: process.env.SMTP_HOST || "",
    port,
    secure: parseBoolean(process.env.SMTP_SECURE, port === 465),
    requireTls: parseBoolean(process.env.SMTP_REQUIRE_TLS, true),
    user: process.env.SMTP_USER || "",
    password: process.env.SMTP_PASSWORD || "",
    fromEmail: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || "",
    fromName: process.env.SMTP_FROM_NAME || "Portal do TI",
    authMethod: (process.env.SMTP_AUTH_METHOD || "LOGIN").toUpperCase(),
    heloName: process.env.SMTP_HELO_NAME || os.hostname() || "localhost",
    timeoutMs: parseInt(process.env.SMTP_TIMEOUT_MS || "10000", 10),
  };
}

function isEmailConfigured() {
  const config = getEmailConfig();
  return !!(config.host && config.port && config.user && config.password && config.fromEmail);
}

class SmtpConnection {
  constructor(socket) {
    this.buffer = "";
    this.currentResponse = [];
    this.pending = [];
    this.closed = false;
    this.boundOnData = (chunk) => this.handleData(chunk);
    this.boundOnError = (err) => this.handleError(err);
    this.boundOnClose = () => this.handleClose();
    this.attachSocket(socket);
  }

  attachSocket(socket) {
    if (this.socket) {
      this.socket.off("data", this.boundOnData);
      this.socket.off("error", this.boundOnError);
      this.socket.off("close", this.boundOnClose);
    }
    this.socket = socket;
    this.socket.setEncoding("utf8");
    this.socket.on("data", this.boundOnData);
    this.socket.on("error", this.boundOnError);
    this.socket.on("close", this.boundOnClose);
  }

  handleData(chunk) {
    this.buffer += chunk;

    let newlineIndex = this.buffer.indexOf("\n");
    while (newlineIndex !== -1) {
      const rawLine = this.buffer.slice(0, newlineIndex);
      this.buffer = this.buffer.slice(newlineIndex + 1);
      const line = rawLine.replace(/\r$/, "");

      if (line) {
        this.currentResponse.push(line);
        if (/^\d{3} /.test(line)) {
          const response = {
            code: parseInt(line.slice(0, 3), 10),
            lines: [...this.currentResponse],
          };
          this.currentResponse = [];
          const next = this.pending.shift();
          if (next) {
            next.resolve(response);
          }
        }
      }

      newlineIndex = this.buffer.indexOf("\n");
    }
  }

  handleError(err) {
    while (this.pending.length > 0) {
      const next = this.pending.shift();
      next.reject(err);
    }
  }

  handleClose() {
    this.closed = true;
    const err = new Error("SMTP connection closed unexpectedly");
    while (this.pending.length > 0) {
      const next = this.pending.shift();
      next.reject(err);
    }
  }

  waitForResponse() {
    if (this.closed) {
      return Promise.reject(new Error("SMTP connection already closed"));
    }
    return new Promise((resolve, reject) => {
      this.pending.push({ resolve, reject });
    });
  }

  async sendCommand(command, expectedCodes) {
    this.socket.write(`${command}\r\n`);
    const response = await this.waitForResponse();
    const acceptedCodes = Array.isArray(expectedCodes) ? expectedCodes : [expectedCodes];
    if (!acceptedCodes.includes(response.code)) {
      throw new Error(`SMTP command failed (${command}): ${response.lines.join(" | ")}`);
    }
    return response;
  }

  async sendData(message) {
    this.socket.write(`${message}\r\n.\r\n`);
    const response = await this.waitForResponse();
    if (response.code !== 250) {
      throw new Error(`SMTP DATA failed: ${response.lines.join(" | ")}`);
    }
    return response;
  }

  async upgradeToTls(host, timeoutMs) {
    const secureSocket = await new Promise((resolve, reject) => {
      const tlsSocket = tls.connect({
        socket: this.socket,
        servername: host,
        timeout: timeoutMs,
      }, () => resolve(tlsSocket));

      tlsSocket.once("error", reject);
      tlsSocket.once("timeout", () => reject(new Error("SMTP TLS handshake timed out")));
    });

    this.buffer = "";
    this.currentResponse = [];
    this.attachSocket(secureSocket);
  }
}

function connectSocket(config) {
  return new Promise((resolve, reject) => {
    const onError = (err) => reject(err);
    const onTimeout = () => reject(new Error("SMTP connection timed out"));
    const cleanup = (socket) => {
      socket.off("error", onError);
      socket.off("timeout", onTimeout);
    };

    const socket = config.secure
      ? tls.connect({
          host: config.host,
          port: config.port,
          servername: config.host,
          timeout: config.timeoutMs,
        }, () => {
          cleanup(socket);
          resolve(socket);
        })
      : net.connect({
          host: config.host,
          port: config.port,
          timeout: config.timeoutMs,
        }, () => {
          cleanup(socket);
          resolve(socket);
        });

    socket.once("error", onError);
    socket.once("timeout", onTimeout);
  });
}

function encodeHeaderValue(value) {
  if (!/[^\x20-\x7E]/.test(value)) return value;
  return `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

function formatAddress(name, email) {
  if (!name) return `<${email}>`;
  return `${encodeHeaderValue(name)} <${email}>`;
}

function buildMessage({ fromName, fromEmail, to, subject, text, html }) {
  const boundary = `itportal-${crypto.randomBytes(12).toString("hex")}`;
  const messageId = `<${crypto.randomBytes(16).toString("hex")}@${fromEmail.split("@")[1] || "localhost"}>`;
  const plainBody = Buffer.from(text, "utf8").toString("base64");
  const htmlBody = Buffer.from(html, "utf8").toString("base64");

  return [
    `From: ${formatAddress(fromName, fromEmail)}`,
    `To: <${to}>`,
    `Subject: ${encodeHeaderValue(subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: ${messageId}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    plainBody,
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    htmlBody,
    `--${boundary}--`,
  ]
    .join("\r\n")
    .replace(/\n\./g, "\n..");
}

function buildAuthLoginSequence(user, password) {
  return [
    `AUTH LOGIN`,
    Buffer.from(user, "utf8").toString("base64"),
    Buffer.from(password, "utf8").toString("base64"),
  ];
}

function buildAuthPlainCommand(user, password) {
  const payload = Buffer.from(`\u0000${user}\u0000${password}`, "utf8").toString("base64");
  return `AUTH PLAIN ${payload}`;
}

async function sendEmail({ to, subject, text, html }) {
  const config = getEmailConfig();
  if (!isEmailConfigured()) {
    throw new Error("Email service is not configured");
  }

  const socket = await connectSocket(config);
  const connection = new SmtpConnection(socket);

  try {
    await connection.waitForResponse();
    let ehloResponse = await connection.sendCommand(`EHLO ${config.heloName}`, 250);

    const supportsStartTls = ehloResponse.lines.some((line) => /STARTTLS/i.test(line));
    if (!config.secure && supportsStartTls) {
      await connection.sendCommand("STARTTLS", 220);
      await connection.upgradeToTls(config.host, config.timeoutMs);
      ehloResponse = await connection.sendCommand(`EHLO ${config.heloName}`, 250);
    } else if (!config.secure && config.requireTls) {
      throw new Error("SMTP server does not support STARTTLS");
    }

    if (config.authMethod === "PLAIN") {
      await connection.sendCommand(buildAuthPlainCommand(config.user, config.password), 235);
    } else {
      const [loginCommand, userValue, passwordValue] = buildAuthLoginSequence(config.user, config.password);
      await connection.sendCommand(loginCommand, 334);
      await connection.sendCommand(userValue, 334);
      await connection.sendCommand(passwordValue, 235);
    }

    await connection.sendCommand(`MAIL FROM:<${config.fromEmail}>`, 250);
    await connection.sendCommand(`RCPT TO:<${to}>`, [250, 251]);
    await connection.sendCommand("DATA", 354);
    await connection.sendData(buildMessage({
      fromName: config.fromName,
      fromEmail: config.fromEmail,
      to,
      subject,
      text,
      html: html || `<pre>${escapeHtml(text)}</pre>`,
    }));
    await connection.sendCommand("QUIT", 221);
  } finally {
    if (connection.socket && !connection.socket.destroyed) {
      connection.socket.end();
      connection.socket.destroy();
    }
  }
}

module.exports = {
  getEmailConfig,
  isEmailConfigured,
  sendEmail,
};
