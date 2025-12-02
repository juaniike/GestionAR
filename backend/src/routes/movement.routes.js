// routes/movements.routes.js
const express = require("express");
const router = express.Router();
const movementsController = require("../controllers/movement.controller");
const auth = require("../middlewares/users/auth");

// Todas las rutas requieren autenticación
router.use(auth);

// CRUD básico
router.get("/", movementsController.getAll);
router.post("/", movementsController.create);
router.get("/:id", movementsController.getById);
router.put("/:id", movementsController.update);
router.delete("/:id", movementsController.destroy);

// Endpoints específicos
router.get(
  "/cash-register/:cash_register_id",
  movementsController.getByCashRegister
);
router.get("/today/movements", movementsController.getToday);
router.get("/totals/by-type", movementsController.getTotals);

module.exports = router;
