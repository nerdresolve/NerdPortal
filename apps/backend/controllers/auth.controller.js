const bcrypt = require("bcryptjs");
const usersDal = require("../dal/users.dal");
const auditDal = require("../dal/audit.dal");
const passwordResetDal = require("../dal/password-reset.dal");
const db = require("../dal/db");
const { isEmailConfigured } = require("../services/email");
const {
  PASSWORD_RESET_CODE_ATTEMPTS,
  DEFAULT_TOKEN_TTL_MINUTES,
  generatePasswordResetCode,
  generatePasswordResetToken,
  hashOpaqueToken,
  getCodeExpiryDate,
  isExpired,
  isVerifiedTokenExpired,
  sendPasswordResetCodeEmail,
} = require("../services/password-reset");

const DUMMY_RESET_CODE_HASH = bcrypt.hashSync("000000", 12);

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeResetCode(value) {
  return String(value || "").trim().replace(/\s+/g, "");
}

function validatePasswordStrength(password) {
  if (typeof password !== "string" || password.length < 12) {
    return "A nova senha deve ter pelo menos 12 caracteres.";
  }
  if (!/[a-z]/.test(password)) {
    return "A nova senha deve conter ao menos uma letra minúscula.";
  }
  if (!/[A-Z]/.test(password)) {
    return "A nova senha deve conter ao menos uma letra maiúscula.";
  }
  if (!/[0-9]/.test(password)) {
    return "A nova senha deve conter ao menos um número.";
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return "A nova senha deve conter ao menos um caractere especial.";
  }
  return "";
}

function genericPasswordResetRequestResponse(res) {
  return res.status(200).json({
    success: true,
    data: {
      message: "Se o e-mail estiver autorizado para administração, um código será enviado.",
    },
  });
}

async function login(req, res) {
  const email = normalizeEmail(req.body.email);
  const password = req.body.password;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: "Email and password are required",
    });
  }

  try {
    const user = await usersDal.findByEmail(email);

    if (!user) {
      await bcrypt.hash("dummy_password_timing_safe", 12);
      return res.status(401).json({
        success: false,
        error: "Invalid email or password",
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        error: "Account is deactivated",
      });
    }

    const passwordValid = await bcrypt.compare(password, user.password_hash);

    if (!passwordValid) {
      await auditDal.logAction({
        userId: user.id,
        action: "AUTH_LOGIN_FAILED",
        entity: "auth",
        entityId: user.id,
        details: { reason: "invalid_password" },
        ipAddress: req.ip || "0.0.0.0",
        userAgent: req.headers["user-agent"],
      });

      return res.status(401).json({
        success: false,
        error: "Invalid email or password",
      });
    }

    if (user.role !== "admin") {
      await auditDal.logAction({
        userId: user.id,
        action: "AUTH_LOGIN_DENIED",
        entity: "auth",
        entityId: user.id,
        details: { reason: "non_admin_role", role: user.role },
        ipAddress: req.ip || "0.0.0.0",
        userAgent: req.headers["user-agent"],
      }).catch((err) => {
        console.error("Audit log for denied login failed:", err.message);
      });

      return res.status(403).json({
        success: false,
        error: "Administrative access only",
      });
    }

    await db.query("DELETE FROM sessions WHERE json_extract(sess, '$.userRole') = 'admin'").catch((err) => {
      console.error("Admin session cleanup failed:", err.message);
    });

    req.session.regenerate((err) => {
      if (err) {
        console.error("Session regeneration failed:", err.message);
        return res.status(500).json({
          success: false,
          error: "Internal server error",
        });
      }

      req.session.userId = user.id;
      req.session.userEmail = user.email;
      req.session.userRole = user.role;
      req.session.userName = user.full_name;

      req.session.save(async (saveErr) => {
        if (saveErr) {
          console.error("Session save failed:", saveErr.message);
          return res.status(500).json({
            success: false,
            error: "Internal server error",
          });
        }

        await usersDal.updateLastLogin(user.id);

        await auditDal.logAction({
          userId: user.id,
          action: "AUTH_LOGIN_SUCCESS",
          entity: "auth",
          entityId: user.id,
          details: null,
          ipAddress: req.ip || "0.0.0.0",
          userAgent: req.headers["user-agent"],
        });

        res.status(200).json({
          success: true,
          data: {
            id: user.id,
            email: user.email,
            fullName: user.full_name,
            role: user.role,
          },
        });
      });
    });
  } catch (err) {
    console.error("Login error:", err.stack || err.message);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
}

async function requestPasswordReset(req, res) {
  const email = normalizeEmail(req.body.email);

  if (!email) {
    return res.status(400).json({
      success: false,
      error: "E-mail é obrigatório.",
    });
  }

  if (!isEmailConfigured()) {
    return res.status(503).json({
      success: false,
      error: "O serviço de envio de e-mails ainda não está configurado.",
    });
  }

  try {
    const user = await usersDal.findByEmail(email);
    const eligibleUser = user && user.is_active && user.role === "admin" ? user : null;

    if (!eligibleUser) {
      await bcrypt.hash("dummy_password_reset_timing_safe", 12);
      return genericPasswordResetRequestResponse(res);
    }

    const code = generatePasswordResetCode();
    const codeHash = await bcrypt.hash(code, 12);
    const expiresAt = getCodeExpiryDate();
    const client = await db.getClient();

    try {
      await client.query("BEGIN");
      await passwordResetDal.invalidateActiveByUserId(eligibleUser.id, client);
      await passwordResetDal.create({
        userId: eligibleUser.id,
        requestEmail: email,
        codeHash,
        expiresAt,
        requestIp: req.ip || "0.0.0.0",
        requestUserAgent: req.headers["user-agent"],
      }, client);
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    await auditDal.logAction({
      userId: eligibleUser.id,
      action: "AUTH_PASSWORD_RESET_REQUESTED",
      entity: "auth",
      entityId: eligibleUser.id,
      details: { delivery: "email" },
      ipAddress: req.ip || "0.0.0.0",
      userAgent: req.headers["user-agent"],
    }).catch((err) => {
      console.error("Audit log for password reset request failed:", err.message);
    });

    genericPasswordResetRequestResponse(res);

    setImmediate(async () => {
      try {
        await sendPasswordResetCodeEmail({
          to: eligibleUser.email,
          code,
          fullName: eligibleUser.full_name,
        });

        await auditDal.logAction({
          userId: eligibleUser.id,
          action: "AUTH_PASSWORD_RESET_CODE_SENT",
          entity: "auth",
          entityId: eligibleUser.id,
          details: null,
          ipAddress: req.ip || "0.0.0.0",
          userAgent: req.headers["user-agent"],
        }).catch((err) => {
          console.error("Audit log for password reset email failed:", err.message);
        });
      } catch (err) {
        console.error("Password reset email send failed:", err.message);
        await passwordResetDal.invalidateActiveByUserId(eligibleUser.id).catch((invalidateErr) => {
          console.error("Password reset invalidation after email failure failed:", invalidateErr.message);
        });
      }
    });
  } catch (err) {
    console.error("Password reset request error:", err.stack || err.message);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
}

async function verifyPasswordResetCode(req, res) {
  const email = normalizeEmail(req.body.email);
  const code = normalizeResetCode(req.body.code);

  if (!email || !code) {
    return res.status(400).json({
      success: false,
      error: "E-mail e código são obrigatórios.",
    });
  }

  if (!/^\d{6}$/.test(code)) {
    return res.status(400).json({
      success: false,
      error: "O código deve conter 6 dígitos.",
    });
  }

  try {
    const requestRecord = await passwordResetDal.findLatestActiveByEmail(email);

    if (
      !requestRecord ||
      requestRecord.role !== "admin" ||
      !requestRecord.is_active ||
      requestRecord.verified_at ||
      isExpired(requestRecord.expires_at) ||
      requestRecord.attempt_count >= PASSWORD_RESET_CODE_ATTEMPTS
    ) {
      await bcrypt.compare(code, DUMMY_RESET_CODE_HASH);
      return res.status(400).json({
        success: false,
        error: "Código inválido ou expirado.",
      });
    }

    const codeMatches = await bcrypt.compare(code, requestRecord.code_hash);
    if (!codeMatches) {
      const attempt = await passwordResetDal.incrementAttempts(requestRecord.id);
      if (attempt && attempt.attempt_count >= PASSWORD_RESET_CODE_ATTEMPTS) {
        await passwordResetDal.invalidateById(requestRecord.id);
      }

      return res.status(400).json({
        success: false,
        error: "Código inválido ou expirado.",
      });
    }

    const resetToken = generatePasswordResetToken();
    await passwordResetDal.markVerified(requestRecord.id, hashOpaqueToken(resetToken));

    await auditDal.logAction({
      userId: requestRecord.user_id,
      action: "AUTH_PASSWORD_RESET_CODE_VERIFIED",
      entity: "auth",
      entityId: requestRecord.user_id,
      details: null,
      ipAddress: req.ip || "0.0.0.0",
      userAgent: req.headers["user-agent"],
    }).catch((err) => {
      console.error("Audit log for password reset verification failed:", err.message);
    });

    res.status(200).json({
      success: true,
      data: {
        resetToken,
        expiresInMinutes: DEFAULT_TOKEN_TTL_MINUTES,
      },
    });
  } catch (err) {
    console.error("Password reset verify error:", err.stack || err.message);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
}

async function confirmPasswordReset(req, res) {
  const email = normalizeEmail(req.body.email);
  const resetToken = String(req.body.resetToken || "").trim();
  const newPassword = String(req.body.newPassword || "");

  if (!email || !resetToken || !newPassword) {
    return res.status(400).json({
      success: false,
      error: "E-mail, token e nova senha são obrigatórios.",
    });
  }

  const passwordError = validatePasswordStrength(newPassword);
  if (passwordError) {
    return res.status(400).json({
      success: false,
      error: passwordError,
    });
  }

  try {
    const requestRecord = await passwordResetDal.findVerifiedByEmailAndToken(email, hashOpaqueToken(resetToken));

    if (
      !requestRecord ||
      requestRecord.role !== "admin" ||
      !requestRecord.is_active ||
      !requestRecord.verified_at ||
      isVerifiedTokenExpired(requestRecord.verified_at)
    ) {
      return res.status(400).json({
        success: false,
        error: "Token de redefinição inválido ou expirado.",
      });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    const client = await db.getClient();

    try {
      await client.query("BEGIN");
      await usersDal.updatePassword(requestRecord.user_id, passwordHash, client);
      await passwordResetDal.markUsed(requestRecord.id, client);
      await passwordResetDal.invalidateActiveByUserId(requestRecord.user_id, client);
      await client.query(
        "DELETE FROM sessions WHERE json_extract(sess, '$.userId') = $1",
        [String(requestRecord.user_id)]
      );
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    await auditDal.logAction({
      userId: requestRecord.user_id,
      action: "AUTH_PASSWORD_RESET_COMPLETED",
      entity: "auth",
      entityId: requestRecord.user_id,
      details: null,
      ipAddress: req.ip || "0.0.0.0",
      userAgent: req.headers["user-agent"],
    }).catch((err) => {
      console.error("Audit log for password reset completion failed:", err.message);
    });

    res.status(200).json({
      success: true,
      data: {
        message: "Senha redefinida com sucesso.",
      },
    });
  } catch (err) {
    console.error("Password reset confirm error:", err.stack || err.message);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
}

async function logout(req, res) {
  const userId = req.session ? req.session.userId : null;

  if (userId) {
    await auditDal.logAction({
      userId,
      action: "AUTH_LOGOUT",
      entity: "auth",
      entityId: userId,
      details: null,
      ipAddress: req.ip || "0.0.0.0",
      userAgent: req.headers["user-agent"],
    }).catch((err) => {
      console.error("Audit log on logout failed:", err.message);
    });
  }

  req.session.destroy((err) => {
    if (err) {
      console.error("Session destroy failed:", err.message);
      return res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }

    res.clearCookie("itportal.sid", { path: "/" });
    res.clearCookie("csrf_token", { path: "/" });

    res.status(200).json({
      success: true,
      data: { message: "Logged out" },
    });
  });
}

async function me(req, res) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      success: false,
      error: "Not authenticated",
    });
  }

  try {
    const user = await usersDal.findById(req.session.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        lastLoginAt: user.last_login_at,
      },
    });
  } catch (err) {
    console.error("Session check error:", err.stack || err.message);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
}

module.exports = {
  login,
  requestPasswordReset,
  verifyPasswordResetCode,
  confirmPasswordReset,
  logout,
  me,
};
