const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Users = require("./Users");
const CashRegister = require("./CashRegister");

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

    cashid: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "CashRegister",
        key: "id",
      },
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
    paymentmethod: {
      type: DataTypes.ENUM("cash", "card", "virtualpay"),
      defaultValue: "cash",
    },
    status: {
      type: DataTypes.ENUM("pending", "paid", "canceled"),
      defaultValue: "paid",
    },
  },
  {
    tableName: "Sales",
    timestamps: false,
  }
);

Users.hasMany(Sales, { foreignKey: "userid" });
Sales.belongsTo(Users, { foreignKey: "userid" });

CashRegister.hasMany(Sales, { foreignKey: "cashid" });
Sales.belongsTo(CashRegister, { foreignKey: "cashid" });

module.exports = Sales;
