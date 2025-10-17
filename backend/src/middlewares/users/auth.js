const jwt = require("jsonwebtoken");
require("dotenv").config();

const auth = (req, res, next) => {
  let token =
    (req.signedCookies && req.signedCookies.token) ||
    (req.cookies && req.cookies.token);

  // ✅ También aceptar token en encabezado Authorization
  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(" ");
    if (parts[0] === "Bearer" && parts[1]) {
      token = parts[1];
    }
  }

  if (!token)
    return next({ error: 401, message: "Access denied. No token provided." });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return next({ error: 401, message: "Invalid or expired token." });
  }
};

module.exports = auth;
