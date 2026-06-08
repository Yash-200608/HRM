const router = require("express").Router();
const { addProduct, getProducts, getProductById, updateProduct, deleteProduct } = require("../../controllers/lead-portal/productController");

router.post("/add", addProduct);
router.get("/get", getProducts);
router.get("/getbyid/:id", getProductById);
router.put("/update/:id", updateProduct);
router.delete("/delete/:id", deleteProduct);

module.exports = router;