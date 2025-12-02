const jwt = require("jsonwebtoken");
require("dotenv").config();

const auth = (req, res, next) => {
  console.log("🔐 [AUTH-MIDDLEWARE] Verificando autenticación...");

  let token =
    (req.cookies && req.cookies.token) ||
    (req.signedCookies && req.signedCookies.token);

  console.log("🍪 [AUTH-MIDDLEWARE] req.signedCookies:", req.signedCookies);
  console.log("🍪 [AUTH-MIDDLEWARE] req.cookies:", req.cookies);
  console.log("🔑 [AUTH-MIDDLEWARE] Token encontrado:", token ? "SÍ" : "NO");

  // ✅ También aceptar token en encabezado Authorization
  if (!token && req.headers.authorization) {
    console.log("📨 [AUTH-MIDDLEWARE] Revisando Authorization header...");
    const parts = req.headers.authorization.split(" ");
    if (parts[0] === "Bearer" && parts[1]) {
      token = parts[1];
      console.log("✅ [AUTH-MIDDLEWARE] Token encontrado en header");
    }
  }

  if (!token) {
    console.log("❌ [AUTH-MIDDLEWARE] No token provided - 401 Unauthorized");
    return next({ error: 401, message: "Access denied. No token provided." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    console.log("✅ [AUTH-MIDDLEWARE] Usuario autenticado:", decoded.username);
    next();
  } catch (error) {
    console.log("❌ [AUTH-MIDDLEWARE] Token inválido:", error.message);
    return next({ error: 401, message: "Invalid or expired token." });
  }
};

module.exports = auth;
