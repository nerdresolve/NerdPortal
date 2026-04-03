const { Router } = require("express");
const authController = require("../controllers/auth.controller");
const {
  authLimiter,
  passwordResetRequestLimiter,
  passwordResetVerifyLimiter,
} = require("../middlewares/rateLimit");
const { requireAuth } = require("../middlewares/auth");

const router = Router();

router.post("/login", authLimiter, authController.login);
router.post("/password-reset/request", passwordResetRequestLimiter, authController.requestPasswordReset);
router.post("/password-reset/verify", passwordResetVerifyLimiter, authController.verifyPasswordResetCode);
router.post("/password-reset/confirm", passwordResetVerifyLimiter, authController.confirmPasswordReset);
router.post("/logout", requireAuth, authController.logout);
router.get("/me", authController.me);

module.exports = router;
