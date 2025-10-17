const express = require("express");
const cookieParser = require("cookie-parser");
const session = require("express-session");
require("dotenv").config();
const { initDB } = require("./models/index");
const cors = require("cors");

//Routers
const usersRouter = require("./routes/users.routes");
const cashRegisterRouter = require("./routes/cashRegister.routes");
const productsRouter = require("./routes/products.routes");
const salesRouter = require("./routes/sales.routes");
const salesConsolidatedRouter = require("./routes/salesConsolidated.routes");
const clientsRouter = require("./routes/clients.routes");

//Middlewares para manejo de errores
const errorHandler = require("./middlewares/users/errorHandler");

const app = express();
const PORT = process.env.PORT || 3000;

//Middlewares globales
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
app.use(
  cors({
    origin: "http://127.0.0.1:5500" || "http://localhost:5500",
    credentials: true,
  })
);

//Routers
app.use("/user", usersRouter);
app.use("/cash-register", cashRegisterRouter);
app.use("/products", productsRouter);
app.use("/sales", salesRouter);
app.use("/view", salesConsolidatedRouter);
app.use("/clients", clientsRouter);

//Middleware para manejo de errores
app.use(errorHandler);

//Inicializar base de datos y luego arrancar el servidor
initDB()
  .then(() => {
    console.log("✅ Database initialized successfully");
    app.listen(PORT, () =>
      console.log(`🚀 Server running on http://localhost:${PORT}`)
    );
  })
  .catch((err) => {
    console.error("❌ Failed to initialize database:", err);
    process.exit(1); // Salir si la DB no arranca
  });
