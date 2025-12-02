const sequelize = require("../config/database");

// Importar modelos
const Users = require("./Users");
const CashRegister = require("./CashRegister");
const Sales = require("./Sales");
const SalesItem = require("./SalesItem");
const Products = require("./Products");
const movement = require("./Movement");
const Movement = require("./Movement");
// Relaciones ya definidas dentro de los modelos

// Sincronizar tablas
const initDB = async () => {
  try {
    await sequelize.sync({ alter: true });
    console.log("✅ Database synchronized");
  } catch (error) {
    console.error("❌ Error syncing database:", error);
  }
};

module.exports = {
  sequelize,
  Users,
  CashRegister,
  Sales,
  SalesItem,
  Products,
  Movement,
  initDB,
};
