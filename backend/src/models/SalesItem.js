const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Sales = require("./Sales");
const Products = require("./Products");

const SalesItem = sequelize.define(
  "SalesItem",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    saleid: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Sales",
        key: "id",
      },
    },
    productid: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Products",
        key: "id",
      },
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    unitprice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    totalprice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
  },
  {
    tableName: "SalesItem",
    timestamps: false,
  }
);

Sales.hasMany(SalesItem, { foreignKey: "saleid", onDelete: "CASCADE" });
SalesItem.belongsTo(Sales, { foreignKey: "saleid" });

Products.hasMany(SalesItem, { foreignKey: "productid" });
SalesItem.belongsTo(Products, { foreignKey: "productid" });

module.exports = SalesItem;
