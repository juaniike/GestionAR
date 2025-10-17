const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Users = require("./Users");

const CashRegister = sequelize.define(
  "CashRegister",
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
    starttime: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    endtime: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    startingcash: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    endingcash: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("open", "closed"),
      defaultValue: "open",
    },
  },
  {
    tableName: "CashRegister",
    timestamps: true,
  }
);

Users.hasMany(CashRegister, { foreignKey: "userid" });
CashRegister.belongsTo(Users, { foreignKey: "userid" });

module.exports = CashRegister;
