const { Router } = require("express");
const controller = require("../controllers/announcements.controller");
const { requireRole } = require("../middlewares/auth");

const router = Router();

router.get("/", controller.list);
router.get("/:id", controller.getById);

router.post("/", requireRole("admin"), controller.create);
router.put("/:id", requireRole("admin"), controller.update);
router.delete("/:id", requireRole("admin"), controller.remove);

module.exports = router;
