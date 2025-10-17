const express = require("express");
const router = express.Router();
const cashRegisterController = require("../controllers/cashRegister.controller");
const auth = require("../middlewares/users/auth");
const {
  preventOpen,
  onlyOwner,
  ownerOrCloser,
} = require("../middlewares/cashRegister/cashRegister");

router.use(auth);

/*Abrir caja, obligatorio user logueado, sin otra caja abierta*/
router.post("/open", preventOpen, cashRegisterController.open);

/*Cerrar caja, solo usuario logueado o dueño*/
router.post("/:id/close", ownerOrCloser, cashRegisterController.close);

// Nuevo endpoint: obtener caja abierta del usuario logueado
router.get("/status", cashRegisterController.getStatus);

/*Obtener todas las cajas, solo admin*/
router.get("/", onlyOwner, cashRegisterController.getAll);

/*Obtener caja por ID, solo dueño o quien la cerró*/
router.get("/:id", ownerOrCloser, cashRegisterController.getById);

/*Actualizar o eliminar caja solo dueño*/
router.put("/:id", onlyOwner, cashRegisterController.update);
router.delete("/:id", onlyOwner, cashRegisterController.destroy);

module.exports = router;
