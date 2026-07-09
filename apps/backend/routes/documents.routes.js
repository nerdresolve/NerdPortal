const { Router } = require("express");
const controller = require("../controllers/documents.controller");
const { requireRole } = require("../middlewares/auth");
const upload = require("../middlewares/upload");

const router = Router();

router.get("/", controller.list);
router.get("/:id", controller.getById);
router.get("/:id/download", controller.download);

router.post("/", requireRole("admin"), upload, controller.upload);
router.delete("/:id", requireRole("admin"), controller.remove);

module.exports = router;
