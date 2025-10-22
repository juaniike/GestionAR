const express = require("express");
const router = express.Router();
const salesController = require("../controllers/sales.controller");
const auth = require("../middlewares/users/auth");
const authRole = require("../middlewares/users/authRole");

/*Todas las rutas requieren autenticación*/
router.use(auth);

/*Ventas principales*/
router.post("/", salesController.createSale);
router.get("/", salesController.getAllSales);
router.get("/:id", salesController.getSaleById);

/*Ventas por usuario*/
router.get("/user/:userid", salesController.getByUser);

/*Reportes y descuentos */
router.get(
  "/report/daily",
  authRole(["owner"]),
  salesController.getDailyReport
);
router.post(
  "/discount",
  authRole(["owner", "employee"]),
  salesController.applyDiscount
);

/*Ticket y cancelación */
router.get("/:id/ticket", salesController.generateTicket);
router.patch("/:id/cancel", authRole(["owner"]), salesController.cancelSale);

/*Items y productos vendidos */
router.get("/:id/items", salesController.getSaleItems);
router.patch(
  "/:saleid/items/:itemid",
  authRole(["owner"]),
  salesController.updateSaleItem
);
router.get(
  "/report/sold",
  authRole(["owner", "employee"]),
  salesController.getSoldProducts
);

module.exports = router;
