const router = require("express").Router();
const { createPortalGuards } = require("../../middleware/portalGuards.js");
const {
  addProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} = require("../../controllers/lead-portal/productController");

const { access, mutation } = createPortalGuards("leadportal");

router.post("/add", mutation, access, addProduct);
router.get("/get", access, getProducts);
router.get("/getbyid/:id", access, getProductById);
router.put("/update/:id", mutation, access, updateProduct);
router.delete("/delete/:id", mutation, access, deleteProduct);

module.exports = router;