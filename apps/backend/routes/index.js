const { Router } = require("express");
const authRoutes = require("./auth.routes");
const announcementsRoutes = require("./announcements.routes");
const documentsRoutes = require("./documents.routes");
const systemsRoutes = require("./systems.routes");
const teamRoutes = require("./team.routes");
const metricsRoutes = require("./metrics.routes");

const router = Router();

router.use("/auth", authRoutes);
router.use("/announcements", announcementsRoutes);
router.use("/documents", documentsRoutes);
router.use("/systems", systemsRoutes);
router.use("/team", teamRoutes);
router.use("/metrics", metricsRoutes);

router.get("/health", async (req, res) => {
  const db = require("../dal/db");
  try {
    const result = await db.healthCheck();
    res.status(200).json({
      success: true,
      data: {
        status: "ok",
        timestamp: result.now,
      },
    });
  } catch (err) {
    res.status(503).json({
      success: false,
      error: "Database connection failed",
    });
  }
});

module.exports = router;
