const { Router } = require("express");
const authController = require("../controllers/auth.controller");
const { authLimiter } = require("../middlewares/rateLimit");
const { requireAuth } = require("../middlewares/auth");

const router = Router();

router.post("/login", authLimiter, authController.login);
router.post("/logout", requireAuth, authController.logout);
router.get("/me", authController.me);

module.exports = router;
