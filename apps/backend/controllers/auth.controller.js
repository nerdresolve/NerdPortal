const bcrypt = require("bcryptjs");
const usersDal = require("../dal/users.dal");
const auditDal = require("../dal/audit.dal");

async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: "Email and password are required",
    });
  }

  try {
    const user = await usersDal.findByEmail(email);

    if (!user) {
      // Constant-time response to prevent user enumeration
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

    // Regenerate session to prevent session fixation
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
    console.error("Login error:", err.message);
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
    console.error("Session check error:", err.message);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
}

module.exports = { login, logout, me };
