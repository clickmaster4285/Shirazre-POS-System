const express = require("express");
const multer = require("multer");
const path = require("path");
const { authRequired } = require("../middleware/middleware");
const menuController = require("../controllers/menuController");

const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(__dirname, "..", "uploads", "menu"),
    filename: (req, file, cb) => {
      const safeName = `${Date.now()}-${file.originalname.replace(/\s+/g, "-")}`;
      cb(null, safeName);
    },
  }),
});

const router = express.Router();
router.get("/categories", authRequired, menuController.categories);
router.post("/categories", authRequired, upload.single("image"), menuController.addCategory);
router.put("/categories/:id", authRequired, upload.single("image"), menuController.updateCategory);
router.delete("/categories/:id", authRequired, menuController.removeCategory);
router.get("/", authRequired, menuController.list);
router.post("/", authRequired, upload.single("image"), menuController.create);
router.put("/:id", authRequired, upload.single("image"), menuController.update);
router.delete("/:id", authRequired, menuController.remove);

module.exports = router;
