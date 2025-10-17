const express = require("express");
const router = express.Router();
const userController = require("../controllers/users.controller");
const auth = require("../middlewares/users/auth");
const authRole = require("../middlewares/users/authRole");
const loginLimiter = require("../middlewares/users/loginLimiterDB");

/*Rutas publicas de registro y login*/
router.post("/register", userController.register);
router.post("/login", loginLimiter, userController.login);

/*Rutas protegidas*/
router.get("/profile", auth, async (req, res, next) => {
  try {
    console.log("Cookie: ", req.cookies);
    console.log("Cookie firmada: ", req.signedCookies);
    res.json({ message: "Profile data", user: req.user });
  } catch (err) {
    next({ error: 500, message: err.message });
  }
});

/*Ruta solo para owner*/
router.get("/owner-page", auth, authRole(["owner"]), (req, res) => {
  res.json({ message: "Welcome Owner!" });
});

/*Ruta solo para employee*/
router.get("/employee-page", auth, authRole(["employee"]), (req, res) => {
  res.json({ message: "Welcome Employee!" });
});

/*Ruta de logout*/
router.post("/logout", auth, userController.logout);

module.exports = router;
