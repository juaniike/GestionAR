const express = require("express");
const router = express.Router();
const productsController = require("../controllers/products.controller");
const auth = require("../middlewares/users/auth");
const authRole = require("../middlewares/users/authRole");
const {
  validateProduct,
  validateId,
  checkMinStock,
} = require("../middlewares/products/products");

/* Todas las rutas de productos requieren autenticación*/
router.use(auth);

/*Rutas principales de productos (CRUD) */
router.get("/", productsController.getAll);
router.get("/:id", validateId, productsController.getById);
router.get("/barcode/:barcode", productsController.getByBarcode);
router.post(
  "/",
  authRole(["owner", "employee"]),
  validateProduct,
  productsController.create
);
router.put(
  "/:id",
  authRole(["owner", "employee"]),
  validateId,
  validateProduct,
  checkMinStock,
  productsController.update
);
router.delete(
  "/:id",
  authRole(["owner", "employee"]),
  validateId,
  productsController.destroy
);

module.exports = router;
