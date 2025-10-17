const express = require("express");
const router = express.Router();
const salesConsolidatedController = require("../controllers/salesConsolidated.controller");
const auth = require("../middlewares/users/auth");
const authRole = require("../middlewares/users/authRole");

// Endpoint único para todo
router.get(
  "/",
  auth,
  authRole(["owner"]),
  salesConsolidatedController.getConsolidated
);

module.exports = router;
