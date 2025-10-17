const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Clients = sequelize.define(
  "Clients",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false },
    company: { type: DataTypes.STRING },
    cuil: { type: DataTypes.BIGINT },
    email: { type: DataTypes.STRING },
    phone: { type: DataTypes.STRING },
    address: { type: DataTypes.STRING },
    type: {
      type: DataTypes.ENUM("client", "supplier"), // cliente o proveedor
      defaultValue: "client",
    },
    balance: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 }, // saldo de cuenta corriente
  },
  {
    tableName: "clients",
    timestamps: true,
  }
);

module.exports = Clients;
