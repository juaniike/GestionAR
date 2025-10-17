const Users = require("../../models/Users");

const MAX_ATTEMPTS = 3;
const BLOCK_TIME = 24 * 60 * 60 * 1000; // 24 horas en ms

async function loginLimiterDB(req, res, next) {
  const { username } = req.body;

  if (!username) {
    return next({ error: 400, message: "Username is required" });
  }

  try {
    const user = await Users.findOne({ where: { username } });

    // Si el usuario no existe, dejamos que el controlador maneje el error
    if (!user) return next();

    // Si está bloqueado, calculamos el tiempo restante
    if (user.lockedUntil && user.lockedUntil > Date.now()) {
      const diff = user.lockedUntil - Date.now();
      let remaining;

      if (diff > 60000) {
        remaining = Math.ceil(diff / 1000 / 60) + " minutes";
      } else {
        remaining = Math.ceil(diff / 1000) + " seconds";
      }

      return next({
        error: 429,
        message: `User blocked. Try again in ${remaining}.`,
      });
    }

    // Guardamos el usuario en la request por si se necesita después
    req.limiterUser = user;
    next();
  } catch (err) {
    console.error("Error in loginLimiterDB:", err);
    next({ error: 500, message: "Internal Server Error" });
  }
}

module.exports = loginLimiterDB;
