const express = require("express");
const cookieParser = require("cookie-parser");
const session = require("express-session");
require("dotenv").config();
const { initDB } = require("./models/index");
const cors = require("cors");

// Routers
const usersRouter = require("./routes/users.routes");
const cashRegisterRouter = require("./routes/cashRegister.routes");
const productsRouter = require("./routes/products.routes");
const salesRouter = require("./routes/sales.routes");
const salesConsolidatedRouter = require("./routes/salesConsolidated.routes");
const clientsRouter = require("./routes/clients.routes");
const movementsRouter = require("./routes/movement.routes");

// Middlewares
const errorHandler = require("./middlewares/users/errorHandler");

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares globales
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(
  session({
    secret: process.env.COOKIE_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 },
  })
);

// CORS
app.use(
  cors({
    origin: ["http://127.0.0.1:5500", "http://localhost:5500"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
  })
);

app.get("/api/debug/cookies", (req, res) => {
  console.log("🍪 [DEBUG-COOKIES] === INICIO ===");
  console.log("🍪 [DEBUG-COOKIES] req.cookies:", req.cookies);
  console.log("🍪 [DEBUG-COOKIES] req.signedCookies:", req.signedCookies);
  console.log("🌐 [DEBUG-COOKIES] req.headers.cookie:", req.headers.cookie);
  console.log("🌐 [DEBUG-COOKIES] req.headers:", req.headers);
  console.log("🍪 [DEBUG-COOKIES] === FIN ===");

  res.json({
    success: true,
    cookies: req.cookies,
    signedCookies: req.signedCookies,
    headers: {
      cookie: req.headers.cookie,
      origin: req.headers.origin,
    },
  });
});

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// Routers
app.use("/user", usersRouter);
app.use("/cash-register", cashRegisterRouter);
app.use("/products", productsRouter);
app.use("/sales", salesRouter);
app.use("/view", salesConsolidatedRouter);
app.use("/clients", clientsRouter);
app.use("/movements", movementsRouter);

// Middleware de errores
app.use(errorHandler);

// ✅ Ruta 404
app.use((req, res) => {
  res.status(404).json({
    error: 404,
    message: "Route not found",
  });
});

// Inicializar base de datos y servidor
initDB()
  .then(() => {
    console.log("✅ Database initialized successfully");
    app.listen(PORT, () =>
      console.log(`🚀 Server running on http://localhost:${PORT}`)
    );
  })
  .catch((err) => {
    console.error("❌ Failed to initialize database:", err);
    process.exit(1);
  });

module.exports = app;
