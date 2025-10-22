const express = require("express");
const router = express.Router();
const clientsController = require("../controllers/clients.controller");
const auth = require("../middlewares/users/auth");
const authRole = require("../middlewares/users/authRole");

//Todas las rutas usan autenticación
router.use(auth);
router.use(authRole(["owner", "employee"]));

//Clientes
router.post("/", clientsController.createClient);
router.get("/", clientsController.getAllClients);
router.get("/:id", clientsController.getClientById);
router.put("/:id", clientsController.updateClient);
router.delete("/:id", clientsController.deleteClient);

module.exports = router;
