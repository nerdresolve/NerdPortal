const { Router } = require("express");
const controller = require("../controllers/team.controller");
const { requireRole } = require("../middlewares/auth");
const teamPhotoUpload = require("../middlewares/teamPhotoUpload");

const router = Router();

// Public read
router.get("/", controller.list);
router.get("/photos/:filename", controller.servePhoto);
router.get("/:id", controller.getById);

// Admin write
router.post("/", requireRole("admin"), teamPhotoUpload, controller.create);
router.put("/:id", requireRole("admin"), teamPhotoUpload, controller.update);
router.delete("/:id", requireRole("admin"), controller.remove);

module.exports = router;
