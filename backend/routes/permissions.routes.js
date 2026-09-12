const express = require("express");
const { authRequired, attachPermissions } = require("../middleware/middleware");
const permissionController = require("../controllers/permissionController");

const router = express.Router();
router.use(authRequired, attachPermissions);

router.get("/", permissionController.getAll);
router.put("/", permissionController.putAll);
router.post("/roles", permissionController.createRole);
router.delete("/roles/:role", permissionController.deleteRole);

module.exports = router;