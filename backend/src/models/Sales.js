const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Users = require("./Users");
const CashRegister = require("./CashRegister");
const Clients = require("./Clients"); // ✅ AGREGAR IMPORT

const Sales = sequelize.define(
  "Sales",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userid: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Users",
        key: "id",
      },
    },
    client_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "Clients",
        key: "id",
      },
    },
    cash_register_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "CashRegister",
        key: "id",
      },
      comment: "Para ventas en efectivo, registrar caja utilizada",
    },
    date: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    profit: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.0,
    },
    total: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.0,
    },
    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.0,
    },
    tax: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.0,
    },
    discount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.0,
    },
    paymentmethod: {
      type: DataTypes.ENUM("cash", "card", "virtualpay"),
      defaultValue: "cash",
    },
    status: {
      type: DataTypes.ENUM("pending", "paid", "canceled"),
      defaultValue: "paid",
    },
    observations: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    ticket_number: {
      type: DataTypes.STRING(50),
      allowNull: true,
      unique: true,
    },
  },
  {
    tableName: "Sales",
    timestamps: false,
    indexes: [
      {
        fields: ["date"],
      },
      {
        fields: ["userid"],
      },
      {
        fields: ["client_id"],
      },
      {
        fields: ["cash_register_id"],
      },
      {
        fields: ["paymentmethod"],
      },
      {
        fields: ["status"],
      },
    ],
  }
);

// Relaciones
Users.hasMany(Sales, { foreignKey: "userid" });
Sales.belongsTo(Users, { foreignKey: "userid" });

CashRegister.hasMany(Sales, { foreignKey: "cash_register_id" });
Sales.belongsTo(CashRegister, { foreignKey: "cash_register_id" });

Clients.hasMany(Sales, { foreignKey: "client_id" });
Sales.belongsTo(Clients, { foreignKey: "client_id" });

module.exports = Sales;
