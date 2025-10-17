const express = require("express");
const router = express.Router();
const clientsController = require("../controllers/clients.controller");
const auth = require("../middlewares/users/auth");

//Todas las rutas usan autenticación
router.use(auth);

//Clientes
router.post("/", clientsController.createClient);
router.get("/", clientsController.getAllClients);
router.get("/:id", clientsController.getClientById);
router.put("/:id", clientsController.updateClient);
router.delete("/:id", clientsController.deleteClient);

module.exports = router;
